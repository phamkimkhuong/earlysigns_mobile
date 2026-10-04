const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadSource(relativePath, mocks) {
  const filename = path.resolve(__dirname, "..", relativePath);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports,__DEV__){${source}\n})`, { filename })(
    (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      throw new Error(`Unexpected dependency: ${name}`);
    }, module, module.exports, false,
  );
  return module.exports;
}

function service(os, { cancelled = false, idToken = "signed-jwt", nonce = "nonce-1", accessToken = "fb-access", fail = false } = {}) {
  const calls = [];
  let attempt = 0;
  const source = loadSource("src/services/facebookAuth.ts", {
    "react-native": { Platform: { OS: os } },
    "expo-crypto": { randomUUID: () => `nonce-${++attempt}` },
    "@/core/i18n": { __esModule: true, default: { t: (key) => key } },
    "react-native-fbsdk-next": {
      LoginManager: {
        logOut: () => calls.push("clear"),
        logInWithPermissions: async (...args) => {
          calls.push(args);
          if (fail) throw new Error("native failure");
          return { isCancelled: cancelled };
        },
      },
      AccessToken: { getCurrentAccessToken: async () => { calls.push("access"); return { accessToken }; } },
      AuthenticationToken: { getAuthenticationTokenIOS: async () => { calls.push("id"); return { authenticationToken: idToken, nonce }; } },
    },
  });
  return { ...source, calls };
}

test("Facebook Android preserves SDK login and returns only an Access Token", async () => {
  const s = service("android");
  assert.deepEqual(await s.loginWithFacebook(), { success: true, tokenType: "access_token", accessToken: "fb-access" });
  assert.deepEqual(s.calls, ["clear", [["public_profile", "email"]], "access"]);
});

test("Facebook iOS returns Limited Login JWT bound to a fresh nonce, never cached access token", async () => {
  const s = service("ios");
  assert.deepEqual(await s.loginWithFacebook(), { success: true, tokenType: "id_token", idToken: "signed-jwt", nonce: "nonce-1" });
  assert.deepEqual(s.calls, ["clear", [["public_profile", "email"], "limited", "nonce-1"], "id"]);
  // SDK returning the old token on a second attempt must not authenticate that attempt.
  assert.equal((await s.loginWithFacebook()).success, false);
  assert.deepEqual(s.calls[4], [["public_profile", "email"], "limited", "nonce-2"]);
});

test("Facebook rejects missing credentials and mismatched nonce without falling back to stale tokens", async () => {
  for (const [os, options] of [["ios", { idToken: "" }], ["ios", { nonce: "wrong" }], ["android", { accessToken: "" }]]) {
    const s = service(os, options);
    const result = await s.loginWithFacebook();
    assert.equal(result.success, false);
    assert.equal(result.error, os === "ios" ? "login.facebookSignInFailed" : "login.facebookMissingToken");
    if (os === "ios") assert.equal(s.calls.includes("access"), false);
  }
});

test("Facebook cancellation reads no credentials; native failures and unsupported web are handled", async () => {
  for (const os of ["ios", "android"]) {
    const s = service(os, { cancelled: true });
    assert.deepEqual(await s.loginWithFacebook(), { success: false, cancelled: true });
    assert.equal(s.calls.length, 2);
    assert.equal((await service(os, { fail: true }).loginWithFacebook()).error, "native failure");
  }
  const s = service("web");
  assert.equal((await s.loginWithFacebook()).success, false);
  assert.deepEqual(s.calls, []);
});

function api(response = { token: "app-session" }) {
  const calls = [];
  const { authApi } = loadSource("src/api/authApi.ts", {
    "./client": { httpClient: { post: async (...args) => { calls.push(args); return response; } } },
    "@/core/config": { API_ENDPOINTS: { AUTH: { FACEBOOK: "/api/auth/facebook" } } },
    "@/store/useAuthStore": { useAuthStore: { getState: () => ({ deviceId: "stored-device", setAuth: () => assert.fail("API must not complete session twice") }) } },
    "@/store/useBillingStore": {},
  });
  return { authApi, calls };
}

test("Facebook API separates ID Token/nonce from Access Token and delegates session completion", async () => {
  const a = api();
  await a.authApi.loginFacebook({ tokenType: "id_token", idToken: "jwt", nonce: "unique", deviceId: "device" });
  await a.authApi.loginFacebook({ tokenType: "access_token", accessToken: "fb-access" });
  assert.deepEqual(a.calls, [
    ["/api/auth/facebook", { token_type: "id_token", id_token: "jwt", nonce: "unique", device_id: "device" }, { skipAuth: true }],
    ["/api/auth/facebook", { token_type: "access_token", access_token: "fb-access", device_id: "stored-device" }, { skipAuth: true }],
  ]);
});

test("Facebook API refuses missing nonce before HTTP and missing app session after HTTP", async () => {
  const a = api();
  await assert.rejects(a.authApi.loginFacebook({ tokenType: "id_token", idToken: "jwt" }), /Invalid Facebook/);
  assert.equal(a.calls.length, 0);
  for (const response of [{ ok: true }, { token: " " }, { token: 123 }]) {
    await assert.rejects(api(response).authApi.loginFacebook({ tokenType: "access_token", accessToken: "fb" }), /app session/);
  }
});

const react = {
  useState: (value) => [value, () => {}],
  useRef: (value) => ({ current: value }),
  useCallback: (fn) => fn,
  useMemo: (fn) => fn(),
  useEffect: () => {},
};

test("Facebook hook blocks double taps through backend completion and unlocks after cancellation", async () => {
  let release;
  let attempts = 0;
  let successes = 0;
  const pending = new Promise((resolve) => { release = resolve; });
  const { useFacebookAuth } = loadSource("src/hooks/useFacebookAuth.ts", {
    react,
    "react-i18next": { useTranslation: () => ({ t: (key) => key }) },
    "@/services/facebookAuth": { loginWithFacebook: async () => {
      attempts++;
      return attempts === 1 ? { success: true, tokenType: "access_token", accessToken: "fb" } : { success: false, cancelled: true };
    } },
  });
  const hook = useFacebookAuth({ onSuccess: async () => { successes++; await pending; }, onError: () => assert.fail("cancel is not an error") });
  const first = hook.signIn();
  await Promise.resolve();
  await hook.signIn();
  assert.equal(attempts, 1);
  release();
  await first;
  await hook.signIn();
  await hook.signIn();
  assert.equal(attempts, 3);
  assert.equal(successes, 1);
});

test("Facebook controller finishes AuthProvider session before guest reset/navigation and never navigates on backend failure", async () => {
  for (const fail of [false, true]) {
    let callback;
    const calls = [];
    const credential = { tokenType: "id_token", idToken: "jwt", nonce: "unique" };
    const { useLoginViewModel } = loadSource("src/hooks/useLoginViewModel.ts", {
      react,
      "react-i18next": { useTranslation: () => ({ t: (key) => key, i18n: {} }) },
      "@/api": { authApi: { loginFacebook: async (payload) => { calls.push(["api", payload]); if (fail) throw new Error("backend rejected"); return { token: "session", user_id: "user" }; } } },
      "@/services/Auth": { useAuth: () => ({ deviceId: "device", handleLoginSuccess: async (payload) => calls.push(["session", payload]) }) },
      "@/store/useAuthStore": { useAuthStore: { getState: () => ({ setIsGuest: (value) => calls.push(["guest", value]) }) } },
      "@/utils/loginEmail": { normalizeLoginEmail: (value) => value },
      "./useGoogleAuth": { useGoogleAuth: () => ({}) },
      "./useAppleAuth": { useAppleAuth: () => ({}) },
      "./useFacebookAuth": { useFacebookAuth: (options) => { callback = options.onSuccess; return {}; } },
      "@/utils/toast": { showToast: { success: () => calls.push(["success"]), error: () => calls.push(["error"]) } },
      "@/utils/haptics": {},
      "@/navigation/nav": { navigateAfterLogin: (...args) => calls.push(["navigate", ...args]) },
      "@/core/errorManager": { getFriendlyErrorMessage: (_, fallback) => fallback },
    });
    useLoginViewModel({ navigation: "navigation", nextRoute: "Phonemes" });
    await callback(credential);
    assert.deepEqual(calls[0], ["api", { ...credential, deviceId: "device" }]);
    assert.deepEqual(calls.map(([name]) => name), fail ? ["api", "error"] : ["api", "session", "guest", "navigate", "success"]);
    if (!fail) assert.deepEqual(calls[3], ["navigate", "navigation", "Phonemes", undefined]);
  }
});

test("Facebook JWT and nonce are redacted in network logs", () => {
  const { sanitize } = loadSource("src/core/logger.ts", {});
  assert.deepEqual(sanitize({ id_token: "jwt", nonce: "unique", token_type: "id_token" }), {
    id_token: "[REDACTED]", nonce: "[REDACTED]", token_type: "id_token",
  });
});
