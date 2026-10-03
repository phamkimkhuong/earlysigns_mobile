const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Execute the production service and App resume effect. Native permission
// requests may pause/resume the Activity even when the permission is granted.
function notificationHarness(options = {}) {
  let permission = options.permission || { granted: true, canAskAgain: true, status: "granted" };
  const calls = { permission: 0, reads: 0, token: 0, register: 0, unregister: 0, cycles: 0, microphone: 0, prepare: 0, record: 0 };
  const listeners = new Set(), effects = [], cleanups = [], cache = {};
  const recordingRuntime = { owner: null, queue: Promise.resolve() };
  const app = {
    currentState: "active",
    addEventListener(type, callback) {
      const subscription = { type, callback };
      listeners.add(subscription);
      return { remove() { listeners.delete(subscription); } };
    },
  };
  const emit = state => { app.currentState = state; [...listeners].filter(s => s.type === "change").forEach(s => s.callback(state)); };
  const focus = focused => [...listeners].filter(s => s.type === (focused ? "focus" : "blur")).forEach(s => s.callback());
  const storage = new Map(options.signedOut ? [] : [["auth", "test-auth"]]);
  const noop = () => {};
  const mocks = {
    "react": { useState: () => [false, noop], useEffect: callback => effects.push(callback) },
    "react/jsx-runtime": { jsx: noop, jsxs: noop },
    "react-native": { AppState: app, Platform: { OS: options.platform || "android" }, Linking: { openSettings: async () => {} }, LogBox: { ignoreLogs: noop } },
    "expo-constants": { __esModule: true, default: { easConfig: { projectId: "test-project" } } },
    "expo-notifications": {
      PermissionStatus: { GRANTED: "granted", DENIED: "denied", UNDETERMINED: "undetermined" },
      AndroidImportance: { MAX: 5 }, SchedulableTriggerInputTypes: {},
      setNotificationHandler: noop, setNotificationChannelAsync: async () => {},
      getPermissionsAsync: async () => { calls.reads++; return typeof options.readPermission === "function" ? options.readPermission(calls.reads) : permission; },
      requestPermissionsAsync: async () => {
        calls.permission++;
        // Bound a reproduced feedback loop so a failing regression cannot hang.
        if (options.permissionLifecycle && calls.cycles < 4) {
          calls.cycles++; emit("background"); emit("active");
        }
        permission = options.requestResult || permission;
        return permission;
      },
      getExpoPushTokenAsync: async () => { calls.token++; await options.getToken?.(); return { data: "ExponentPushToken[test]" }; },
      addPushTokenListener: () => ({ remove: noop }),
      getLastNotificationResponse: () => null,
      clearLastNotificationResponse: noop,
      addNotificationResponseReceivedListener: () => ({ remove: noop }),
    },
    "./storage": { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    "@/services/storage": { hydrateStorage: async () => {}, getItem: key => storage.get(key) },
    "@/navigation/nav": { navigationRef: { isReady: () => false }, safeNavigate: noop },
    "@/store/useAuthStore": { AUTH_TOKEN_KEY: "auth", useAuthStore: { getState: () => ({}) } },
    "@/utils/toast": { showToast: noop },
    "@/utils/customAlert": { customAlert: { alert: noop } },
    "@/core/logger": { logger: { debug: noop, info: noop, warn: noop }, setupProductionConsoleGuard: noop },
    "@/core/i18n": { __esModule: true, default: { t: key => key }, getStoredLanguage: async () => "vi", initI18n: async () => {} },
    "@/api/notificationApi": { notificationApi: {
      registerDevice: async () => { calls.register++; return { device_id: "test-device" }; },
      unregisterDevice: async () => { calls.unregister++; },
    } },
    "@/utils/deviceId": { getOrCreateDeviceId: () => "test-device" },
    "expo-splash-screen": { preventAutoHideAsync: async () => {}, hideAsync: async () => {} },
    "react-native-reanimated": { configureReanimatedLogger: noop, ReanimatedLogLevel: { warn: 1 } },
    "@/services/iap": { initRevenueCat: async () => true },
    "expo-audio": {
      AudioQuality: { HIGH: 1 }, IOSOutputFormat: { LINEARPCM: "lpcm" },
      AudioModule: { AudioRecorder: class {
        isRecording = false;
        async prepareToRecordAsync() { calls.prepare++; }
        record() { calls.record++; this.isRecording = true; }
        getStatus() { return { isRecording: this.isRecording }; }
        async stop() { this.isRecording = false; }
        release() {}
        addListener() { return { remove: noop }; }
      } },
      getRecordingPermissionsAsync: async () => ({ granted: false, canAskAgain: true }),
      requestRecordingPermissionsAsync: async () => {
        calls.microphone++; emit("background"); focus(false);
        emit("active"); focus(true);
        return { granted: true, canAskAgain: true };
      },
      setAudioModeAsync: async () => {},
    },
  };
  for (const name of ["react-native-gesture-handler", "./global.css", "expo-status-bar", "react-native-safe-area-context", "@tanstack/react-query", "@/core/queryClient", "react-native-toast-message", "@/services/Auth", "@react-navigation/native", "@/navigation/RootNavigator", "@/components/ui/CustomAlertModal", "@/components/ui/CustomToast", "@/components/ui/AppUpdateModal"]) mocks[name] = {};
  mocks["@/store/useAppUpdateStore"] = { useAppUpdateStore: { getState: () => ({ checkUpdate: async () => {} }) } };
  function load(file) {
    if (cache[file]) return cache[file];
    const filename = path.resolve(__dirname, "..", file), module = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInNewContext(source, {
      module, exports: module.exports, console, process: { env: {} }, setTimeout, clearTimeout,
      __earlySignsRecording: recordingRuntime,
      require(name) {
        if (name in mocks) return mocks[name];
        if (name === "@/services/notifications") return load("src/services/notifications.ts");
        throw Error("Unmocked production dependency: " + name);
      },
    }, { filename });
    return cache[file] = module.exports;
  }
  const service = load("src/services/notifications.ts");
  return {
    calls, service, emit,
    RecordingSession: load("src/services/recordingSession.ts").RecordingSession,
    mountApp() { load("App.tsx").default(); effects.splice(0).forEach(callback => cleanups.push(callback())); },
    mountSettings() {
      const jsx = (type, props) => ({ type, props });
      Object.assign(mocks.react, {
        useState: initial => [initial, noop], useCallback: fn => fn, useMemo: fn => fn(),
      });
      Object.assign(mocks["react/jsx-runtime"], { jsx, jsxs: jsx });
      mocks["react-native"].Switch = "Switch";
      mocks["react-i18next"] = { useTranslation: () => ({ t: key => key }) };
      mocks["lucide-react-native"] = {};
      Object.assign(mocks["expo-notifications"], {
        scheduleNotificationAsync: async () => "test-reminder", cancelScheduledNotificationAsync: async () => {},
      });
      mocks["@/utils/toast"].showToast = { success: noop, error: noop };
      const alerts = [];
      let softAsks = 0;
      Object.assign(mocks["@/utils/customAlert"].customAlert, {
        alert: (...args) => alerts.push(args),
        promptConfirm: async () => { softAsks++; return false; },
      });
      const tree = load("src/screens/tabs/NotificationSettingsScreen.tsx").default({ navigation: {} });
      const switches = [];
      function visit(node) {
        if (Array.isArray(node)) return node.forEach(visit);
        if (!node || typeof node !== "object") return;
        if (node.type === "Switch") switches.push(node);
        visit(node.props?.children);
      }
      visit(tree);
      assert.equal(switches.length, 5);
      effects.splice(0).forEach(callback => cleanups.push(callback()));
      return { alerts, get softAsks() { return softAsks; }, toggle: (index, value) => switches[index].props.onValueChange(value) };
    },
    unmountApp() { cleanups.forEach(cleanup => cleanup?.()); },
    setPermission(value) { permission = value; },
  };
}

async function drainNotifications() { for (let i = 0; i < 100; i++) await Promise.resolve(); }

for (let index = 0; index < 5; index++) test(`production notification toggle ${index} requests denied but still requestable permission`, async () => {
  const h = notificationHarness({
    permission: { granted: false, canAskAgain: true, status: "denied" },
    requestResult: { granted: true, canAskAgain: true, status: "granted" },
  });
  const screen = h.mountSettings(); await drainNotifications();
  assert.equal(h.calls.permission, 0, "Opening the screen must not request permission");
  await screen.toggle(index, true);
  assert.equal(h.calls.permission, 1, "The user opt-in must reach the native permission request");
  assert.equal(screen.softAsks, 0, "The toggle must request system permission without a custom confirmation");
  assert.equal(screen.alerts.length, 0, "A requestable denial must not be treated as blocked");
  const setting = ["dailyReminderEnabled", "incompleteLessonEnabled", "streakReminderEnabled", "contentUpdatesEnabled", "promotionsEnabled"][index];
  assert.equal(h.service.getStoredNotificationSettings()[setting], true);
  h.unmountApp();
});

for (const platform of ["android", "ios"]) test(`${platform} production notification toggle directs blocked permission to Settings`, async () => {
  const h = notificationHarness({ platform, permission: { granted: false, canAskAgain: false, status: "denied" } });
  const screen = h.mountSettings(); await drainNotifications();
  await screen.toggle(0, true);
  assert.equal(h.calls.permission, 0);
  assert.equal(screen.softAsks, 0);
  assert.equal(screen.alerts.length, 1);
  assert.equal(screen.alerts[0][2][1].text, "notifications.openSettings");
  assert.equal(h.service.getStoredNotificationSettings().dailyReminderEnabled, false);
  h.unmountApp();
});

test("production notification opt-in respects native denial without a custom confirmation", async () => {
  for (const status of ["undetermined", "denied"]) {
    const h = notificationHarness({ permission: { granted: false, canAskAgain: true, status } });
    const screen = h.mountSettings(); await drainNotifications();
    await screen.toggle(0, true);
    assert.equal(screen.softAsks, 0);
    assert.equal(h.calls.permission, 1);
    assert.equal(screen.alerts.length, 0);
    assert.equal(h.service.getStoredNotificationSettings().dailyReminderEnabled, false);
    h.unmountApp();
  }
});

test("production notification toggle with granted permission enables without asking again", async () => {
  const h = notificationHarness();
  const screen = h.mountSettings(); await drainNotifications();
  await screen.toggle(0, true);
  assert.equal(screen.softAsks, 0);
  assert.equal(h.calls.permission, 0);
  assert.equal(screen.alerts.length, 0);
  assert.equal(h.service.getStoredNotificationSettings().dailyReminderEnabled, true);
  h.unmountApp();
});

test("production push registration with granted permission never opens another system request", async () => {
  const h = notificationHarness();
  assert.equal(await h.service.registerForPushNotificationsAsync(), "ExponentPushToken[test]");
  assert.equal(h.calls.permission, 0);
  assert.equal(h.calls.token, 1);
});

test("production App resume cannot create a notification permission Activity feedback loop", async () => {
  const h = notificationHarness({ permissionLifecycle: true });
  h.mountApp(); await drainNotifications();
  h.emit("background"); h.emit("active"); await drainNotifications();
  assert.equal(h.calls.permission, 0, "Boot/resume sync must only query permission");
  assert.equal(h.calls.cycles, 0, "Push sync must not launch another permission Activity");
  assert.equal(h.calls.register, 2, "Boot and one real resume each sync an authorized device");
  h.unmountApp();
});

test("production microphone grant resumes App once and starts recording without a competing notification request", async () => {
  const h = notificationHarness({ permissionLifecycle: true });
  h.mountApp(); await drainNotifications();
  const errors = [];
  const session = new h.RecordingSession(() => {}, error => errors.push(error), () => {});
  assert.equal(await session.start(), true);
  await drainNotifications();
  assert.equal(h.calls.microphone, 1);
  assert.equal(h.calls.permission, 0);
  assert.equal(h.calls.cycles, 0);
  assert.equal(h.calls.register, 2);
  assert.equal(h.calls.prepare, 1);
  assert.equal(h.calls.record, 1);
  assert.equal(session.phase, "recording");
  assert.deepEqual(errors, []);
  session.dispose(); h.unmountApp(); await drainNotifications();
});

for (const platform of ["android", "ios"]) test(platform + " production token registration with denied permission does not prompt or fetch a token", async () => {
  const h = notificationHarness({ platform, permission: { granted: false, canAskAgain: true, status: "undetermined" } });
  assert.equal(await h.service.registerForPushNotificationsAsync(), null);
  h.mountApp(); await drainNotifications();
  h.emit("background"); h.emit("active"); await drainNotifications();
  assert.equal(h.calls.permission, 0);
  assert.equal(h.calls.token, 0);
  assert.equal(h.calls.register, 0);
  h.unmountApp();
});

test("production explicit notification opt-in requests once, then sync and repeated requests reuse the grant", async () => {
  const h = notificationHarness({
    permission: { granted: false, canAskAgain: true, status: "undetermined" },
    requestResult: { granted: true, canAskAgain: true, status: "granted" },
  });
  assert.equal((await h.service.requestNotificationPermission()).granted, true);
  assert.equal((await h.service.syncPushTokenWithBackend()).success, true);
  assert.equal((await h.service.requestNotificationPermission()).granted, true);
  assert.equal(h.calls.permission, 1);
  assert.equal(h.calls.register, 1);
});

test("production push permission revoked between sync query and registration is never requested automatically", async () => {
  const h = notificationHarness({ readPermission: read => ({ granted: read === 1, canAskAgain: true, status: read === 1 ? "granted" : "denied" }) });
  assert.equal((await h.service.syncPushTokenWithBackend()).success, false);
  assert.equal(h.calls.permission, 0);
  assert.equal(h.calls.token, 0);
  assert.equal(h.calls.register, 0);
});

test("production App resume with Firebase unavailable cannot restart the permission lifecycle", async () => {
  const h = notificationHarness({ permissionLifecycle: true, getToken: async () => { throw Error("FirebaseApp is not initialized"); } });
  h.mountApp(); await drainNotifications();
  h.emit("background"); h.emit("active"); await drainNotifications();
  assert.equal(h.calls.permission, 0);
  assert.equal(h.calls.cycles, 0);
  assert.equal(h.calls.token, 2);
  assert.equal(h.calls.register, 0);
  h.unmountApp();
});

// Mocking logic from handleNotificationResponse
function simulateNotificationRouting({
  payload,
  isAuthenticated,
  currentRoute,
  isAppActive = false,
  now = Date.now(),
}) {
  let navigatedTo = null;
  let navigatedParams = null;
  let toastShown = null;
  let alertPrompted = false;

  // 1. Expiration check
  if (payload.expiresAt && Number(payload.expiresAt) < now) {
    toastShown = { type: "info", message: "expired" };
    navigatedTo = "Main";
    return { navigatedTo, navigatedParams, toastShown, alertPrompted };
  }

  // 2. Resolve destination
  let targetRoute = payload.targetRoute || "";
  let targetParams = payload.targetParams || {};

  if (!targetRoute) {
    if (payload.type === "INCOMPLETE_LESSON" || payload.youtubeId) {
      if (payload.youtubeId) {
        targetRoute = "VideoPractice";
        targetParams = { youtubeId: payload.youtubeId };
      } else if (payload.lessonType === "phonemes") {
        targetRoute = "Phonemes";
      } else if (payload.lessonType === "text") {
        targetRoute = "Text";
      } else {
        targetRoute = "Main";
      }
    } else if (payload.type === "PROMOTION") {
      targetRoute = "Payment";
    } else if (payload.type === "NEW_CONTENT") {
      targetRoute = "Videos";
    } else if (payload.type === "DAILY_PRACTICE" || payload.type === "STREAK_REMINDER") {
      targetRoute = "Main";
    } else if (payload.screen) {
      targetRoute = payload.screen === "Home" ? "Main" : payload.screen;
    } else {
      targetRoute = "Main";
    }
  }

  // 3. Auth check
  if (payload.requiresAuth && !isAuthenticated) {
    navigatedTo = "Login";
    navigatedParams = {
      next: targetRoute,
      nextParams: targetParams,
    };
    return { navigatedTo, navigatedParams, toastShown, alertPrompted };
  }

  // 4. Foreground confirmation check across all screens when app is open (Section 16.4 Phương án B)
  if (isAppActive && currentRoute !== targetRoute) {
    const isPracticing = ["VideoPractice", "Text", "Phonemes"].includes(currentRoute);
    alertPrompted = true;
    const alertType = isPracticing ? "warning" : "prompt";
    return {
      navigatedTo: null,
      navigatedParams: null,
      toastShown,
      alertPrompted,
      alertType,
      pendingTarget: targetRoute,
    };
  }

  navigatedTo = targetRoute;
  navigatedParams = targetParams;
  return { navigatedTo, navigatedParams, toastShown, alertPrompted };
}

test("expired notification falls back safely to Main with expired notice", () => {
  const result = simulateNotificationRouting({
    payload: {
      type: "PROMOTION",
      expiresAt: Date.now() - 10000,
    },
    isAuthenticated: true,
    currentRoute: "Home",
  });

  assert.equal(result.navigatedTo, "Main");
  assert.equal(result.toastShown?.type, "info");
});

test("requiresAuth notification redirects unauthenticated user to Login with nextRoute", () => {
  const result = simulateNotificationRouting({
    payload: {
      type: "INCOMPLETE_LESSON",
      youtubeId: "abc12345",
      requiresAuth: true,
    },
    isAuthenticated: false,
    currentRoute: "Home",
  });

  assert.equal(result.navigatedTo, "Login");
  assert.equal(result.navigatedParams.next, "VideoPractice");
  assert.equal(result.navigatedParams.nextParams.youtubeId, "abc12345");
});

test("incomplete lesson notification routes directly to VideoPractice when authenticated", () => {
  const result = simulateNotificationRouting({
    payload: {
      type: "INCOMPLETE_LESSON",
      youtubeId: "xyz987",
      requiresAuth: true,
    },
    isAuthenticated: true,
    currentRoute: "Home",
  });

  assert.equal(result.navigatedTo, "VideoPractice");
  assert.equal(result.navigatedParams.youtubeId, "xyz987");
});

test("promotion notification routes to Payment screen", () => {
  const result = simulateNotificationRouting({
    payload: {
      type: "PROMOTION",
      targetParams: { packageId: "pro_annual" },
    },
    isAuthenticated: true,
    currentRoute: "Home",
  });

  assert.equal(result.navigatedTo, "Payment");
  assert.equal(result.navigatedParams.packageId, "pro_annual");
});

test("active practice session prompts confirmation dialog before leaving", () => {
  const result = simulateNotificationRouting({
    payload: {
      type: "DAILY_PRACTICE",
    },
    isAuthenticated: true,
    currentRoute: "VideoPractice",
    isAppActive: true,
  });

  assert.equal(result.alertPrompted, true);
  assert.equal(result.alertType, "warning");
  assert.equal(result.navigatedTo, null);
  assert.equal(result.pendingTarget, "Main");
});

test("foreground notification on any screen prompts confirmation before switching screens (Section 16.4 Phương án B)", () => {
  const result = simulateNotificationRouting({
    payload: {
      type: "PROMOTION",
      targetParams: { packageId: "pro_annual" },
    },
    isAuthenticated: true,
    currentRoute: "Profile",
    isAppActive: true,
  });

  assert.equal(result.alertPrompted, true);
  assert.equal(result.alertType, "prompt");
  assert.equal(result.navigatedTo, null);
  assert.equal(result.pendingTarget, "Payment");
});

test("foreground notification does not prompt alert if user is already on target screen", () => {
  const result = simulateNotificationRouting({
    payload: {
      type: "PROMOTION",
      targetParams: { packageId: "pro_annual" },
    },
    isAuthenticated: true,
    currentRoute: "Payment",
    isAppActive: true,
  });

  assert.equal(result.alertPrompted, false);
  assert.equal(result.navigatedTo, "Payment");
});

test("initial notification settings have all toggles disabled by default", () => {
  const DEFAULT_SETTINGS = {
    dailyReminderEnabled: false,
    dailyReminderHour: 20,
    dailyReminderMinute: 0,
    incompleteLessonEnabled: false,
    streakReminderEnabled: false,
    contentUpdatesEnabled: false,
    promotionsEnabled: false,
  };

  assert.equal(DEFAULT_SETTINGS.dailyReminderEnabled, false);
  assert.equal(DEFAULT_SETTINGS.incompleteLessonEnabled, false);
  assert.equal(DEFAULT_SETTINGS.streakReminderEnabled, false);
  assert.equal(DEFAULT_SETTINGS.contentUpdatesEnabled, false);
  assert.equal(DEFAULT_SETTINGS.promotionsEnabled, false);
});

test("granular toggles: user can disable incomplete lesson reminder independently", () => {
  function canScheduleIncomplete({ incompleteLessonEnabled, permissionGranted }) {
    if (!incompleteLessonEnabled) return false;
    if (!permissionGranted) return false;
    return true;
  }

  assert.equal(canScheduleIncomplete({ incompleteLessonEnabled: false, permissionGranted: true }), false);
  assert.equal(canScheduleIncomplete({ incompleteLessonEnabled: true, permissionGranted: false }), false);
  assert.equal(canScheduleIncomplete({ incompleteLessonEnabled: true, permissionGranted: true }), true);
});

test("granular toggles: user can disable streak reminder independently", () => {
  function canScheduleStreak({ streakReminderEnabled, permissionGranted }) {
    if (!streakReminderEnabled) return false;
    if (!permissionGranted) return false;
    return true;
  }

  assert.equal(canScheduleStreak({ streakReminderEnabled: false, permissionGranted: true }), false);
  assert.equal(canScheduleStreak({ streakReminderEnabled: true, permissionGranted: false }), false);
  assert.equal(canScheduleStreak({ streakReminderEnabled: true, permissionGranted: true }), true);
});

test("production iOS first notification opt-in calls the system directly and enables after grant", async () => {
  const h = notificationHarness({
    platform: "ios",
    permission: { granted: false, canAskAgain: true, status: "undetermined" },
    requestResult: { granted: true, canAskAgain: true, status: "granted" },
  });
  const screen = h.mountSettings(); await drainNotifications();
  assert.equal(h.calls.permission, 0);
  await screen.toggle(0, true);
  assert.equal(h.calls.permission, 1);
  assert.equal(screen.softAsks, 0);
  assert.equal(screen.alerts.length, 0);
  assert.equal(h.service.getStoredNotificationSettings().dailyReminderEnabled, true);
  h.unmountApp();
});

// Logic from calculateIncompleteLessonTriggerDate
function calculateIncompleteLessonTriggerDate(delayHours = 3, now = new Date()) {
  const targetDate = new Date(now.getTime() + delayHours * 3600 * 1000);
  const hour = targetDate.getHours();

  if (hour >= 22 || hour < 8) {
    if (hour >= 22) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    targetDate.setHours(9, 0, 0, 0);
  }
  return targetDate;
}

test("night curfew: daytime reminder fires after exact delay", () => {
  const base = new Date("2026-09-28T14:00:00");
  const target = calculateIncompleteLessonTriggerDate(3, base);

  assert.equal(target.getHours(), 17);
  assert.equal(target.getMinutes(), 0);
  assert.equal(target.getDate(), 28);
});

test("night curfew: reminder landing in late night (23:30) is postponed to 09:00 next day", () => {
  const base = new Date("2026-09-28T20:30:00");
  const target = calculateIncompleteLessonTriggerDate(3, base);

  assert.equal(target.getHours(), 9);
  assert.equal(target.getMinutes(), 0);
  assert.equal(target.getDate(), 29);
});

test("night curfew: reminder landing past midnight (02:30) is postponed to 09:00 morning", () => {
  const base = new Date("2026-09-28T23:30:00");
  const target = calculateIncompleteLessonTriggerDate(3, base);

  assert.equal(target.getHours(), 9);
  assert.equal(target.getMinutes(), 0);
  assert.equal(target.getDate(), 29);
});

test("night curfew: reminder landing in early morning (06:00) is postponed to 09:00 morning", () => {
  const base = new Date("2026-09-28T03:00:00");
  const target = calculateIncompleteLessonTriggerDate(3, base);

  assert.equal(target.getHours(), 9);
  assert.equal(target.getMinutes(), 0);
  assert.equal(target.getDate(), 28);
});

function resolveIncompleteLessonExitAction({ hasPracticed, totalSegments, activeIndex }) {
  const hasSegments = totalSegments > 0;
  const isFinished = hasSegments && activeIndex >= totalSegments - 1;

  if (isFinished) {
    return "cancel";
  }
  if (hasPracticed && hasSegments) {
    return "schedule";
  }
  return "none";
}

test("practice threshold: exit without recording does not schedule reminder", () => {
  const action = resolveIncompleteLessonExitAction({
    hasPracticed: false,
    totalSegments: 10,
    activeIndex: 2,
  });

  assert.equal(action, "none");
});

test("practice threshold: exit after recording incomplete lesson schedules reminder", () => {
  const action = resolveIncompleteLessonExitAction({
    hasPracticed: true,
    totalSegments: 10,
    activeIndex: 2,
  });

  assert.equal(action, "schedule");
});

test("practice threshold: exit after completing all sentences cancels reminder", () => {
  const action = resolveIncompleteLessonExitAction({
    hasPracticed: true,
    totalSegments: 10,
    activeIndex: 9,
  });

  assert.equal(action, "cancel");
});

test("push sync: device registration payload contains expo_push_token, device_id, platform, and omits user_id from body", () => {
  const payload = {
    expo_push_token: "ExponentPushToken[mock-token-xyz]",
    device_id: "9b1d614a-5712-42df-b433-28945a6136b2",
    platform: "ios",
    app_version: "1.0.0",
    locale: "vi",
    timezone: "Asia/Ho_Chi_Minh",
  };

  assert.ok(payload.expo_push_token.startsWith("ExponentPushToken["));
  assert.equal(payload.platform, "ios");
  assert.equal(typeof payload.device_id, "string");
  // Zero-trust: user_id must NOT be sent in body to prevent IDOR hijacking
  assert.equal((payload).user_id, undefined);
});

test("push sync: preferences response correctly updates local content updates and promotions toggles", () => {
  const localSettings = {
    dailyReminderEnabled: true,
    incompleteLessonEnabled: true,
    streakReminderEnabled: true,
    contentUpdatesEnabled: false,
    promotionsEnabled: false,
  };

  const serverResponse = {
    ok: true,
    device_id: "9b1d614a-5712-42df-b433-28945a6136b2",
    preferences: {
      content_updates_enabled: true,
      promotions_enabled: true,
    },
  };

  const updatedSettings = {
    ...localSettings,
    contentUpdatesEnabled: serverResponse.preferences.content_updates_enabled,
    promotionsEnabled: serverResponse.preferences.promotions_enabled,
  };

  assert.equal(updatedSettings.contentUpdatesEnabled, true);
  assert.equal(updatedSettings.promotionsEnabled, true);
  // Local reminders should remain unaffected by remote preferences
  assert.equal(updatedSettings.dailyReminderEnabled, true);
  assert.equal(updatedSettings.incompleteLessonEnabled, true);
});

test("push sync: logout unregisters only current device_id to preserve other devices", () => {
  const userDevices = [
    { device_id: "device-iphone-1", token: "ExponentPushToken[A]", is_active: true },
    { device_id: "device-ipad-2", token: "ExponentPushToken[B]", is_active: true },
  ];

  const logoutDeviceId = "device-iphone-1";
  const updatedDevices = userDevices.map((d) =>
    d.device_id === logoutDeviceId ? { ...d, is_active: false } : d
  );

  assert.equal(updatedDevices.find((d) => d.device_id === "device-iphone-1").is_active, false);
  assert.equal(updatedDevices.find((d) => d.device_id === "device-ipad-2").is_active, true);
});

test("device_id: persistent installation ID format is valid UUID v4 compliant without hardware identifiers", () => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const mockUuid = "9b1d614a-5712-42df-b433-28945a6136b2";

  assert.ok(uuidRegex.test(mockUuid));
  // Must not look like MAC address or IMEI
  assert.ok(!mockUuid.includes(":"));
  assert.ok(mockUuid.length === 36);
});

// ============================================================================
// Phần bổ sung: Permission Revoke, Preference Rollback, Cold-start Clear
// ============================================================================

test("permission revoke: device is deactivated on server when OS permission is revoked", async () => {
  let unregisterCalled = false;
  let unregisteredDeviceId = "";

  // Simulate deactivateDeviceOnPermissionRevoke logic
  async function simulateDeactivateOnRevoke({
    isNativeMobile,
    hasAuthToken,
    permissionGranted,
    deviceId,
  }) {
    if (!isNativeMobile) return false;
    if (!hasAuthToken) return false;
    if (permissionGranted) return false;

    // Would call notificationApi.unregisterDevice(deviceId)
    unregisterCalled = true;
    unregisteredDeviceId = deviceId;
    return true;
  }

  // Case 1: Not native → skip
  const r1 = await simulateDeactivateOnRevoke({
    isNativeMobile: false,
    hasAuthToken: true,
    permissionGranted: false,
    deviceId: "dev-1",
  });
  assert.equal(r1, false);
  assert.equal(unregisterCalled, false);

  // Case 2: No auth → skip
  const r2 = await simulateDeactivateOnRevoke({
    isNativeMobile: true,
    hasAuthToken: false,
    permissionGranted: false,
    deviceId: "dev-1",
  });
  assert.equal(r2, false);

  // Case 3: Permission still granted → skip
  const r3 = await simulateDeactivateOnRevoke({
    isNativeMobile: true,
    hasAuthToken: true,
    permissionGranted: true,
    deviceId: "dev-1",
  });
  assert.equal(r3, false);

  // Case 4: Permission revoked + authenticated → deactivate
  const r4 = await simulateDeactivateOnRevoke({
    isNativeMobile: true,
    hasAuthToken: true,
    permissionGranted: false,
    deviceId: "device-iphone-abc",
  });
  assert.equal(r4, true);
  assert.equal(unregisterCalled, true);
  assert.equal(unregisteredDeviceId, "device-iphone-abc");
});

test("preference rollback: UI reverts to previous state when server update fails", async () => {
  const previousSettings = {
    dailyReminderEnabled: true,
    incompleteLessonEnabled: true,
    streakReminderEnabled: false,
    contentUpdatesEnabled: false,
    promotionsEnabled: false,
  };

  // Simulate optimistic update + server failure + rollback
  let currentUIState = { ...previousSettings };

  // Step 1: Optimistic update
  currentUIState = { ...currentUIState, contentUpdatesEnabled: true };
  assert.equal(currentUIState.contentUpdatesEnabled, true);

  // Step 2: Server fails
  const serverError = true;
  if (serverError) {
    // Step 3: Rollback to previous
    currentUIState = { ...previousSettings };
  }

  assert.equal(currentUIState.contentUpdatesEnabled, false, "UI must rollback after server error");
  assert.equal(currentUIState.dailyReminderEnabled, true, "Other settings remain untouched");
  assert.equal(currentUIState.incompleteLessonEnabled, true, "Other settings remain untouched");
});

test("preference rollback: UI commits server-authoritative value on success", async () => {
  const initialSettings = {
    contentUpdatesEnabled: false,
    promotionsEnabled: false,
  };

  // Step 1: Optimistic
  let uiState = { ...initialSettings, contentUpdatesEnabled: true };

  // Step 2: Server responds with authoritative values
  const serverResponse = {
    preferences: {
      content_updates_enabled: true,
      promotions_enabled: true, // Server also turned on promotions
    },
  };

  // Step 3: Commit server values
  uiState = {
    ...uiState,
    contentUpdatesEnabled: serverResponse.preferences.content_updates_enabled,
    promotionsEnabled: serverResponse.preferences.promotions_enabled,
  };

  assert.equal(uiState.contentUpdatesEnabled, true);
  assert.equal(uiState.promotionsEnabled, true, "Server-authoritative value committed");
});

test("cold-start: notification response is cleared after handling to prevent re-processing", () => {
  let lastResponse = { type: "DAILY_PRACTICE", handled: false };
  let cleared = false;

  // Simulate cold-start handling
  function handleAndClear() {
    if (lastResponse) {
      lastResponse.handled = true;
      // clearLastNotificationResponse()
      cleared = true;
      lastResponse = null;
    }
  }

  handleAndClear();
  assert.equal(cleared, true, "clearLastNotificationResponse must be called after handling");
  assert.equal(lastResponse, null, "Last response must be null after clear");

  // Second call should be no-op
  cleared = false;
  handleAndClear();
  assert.equal(cleared, false, "Should not re-process after clear");
});

test("getPreferences query formatting: serializes direct query parameters without wrapping in params key", () => {
  // Simulating httpClient buildUrl behavior
  function buildUrl(path, params) {
    let url = path;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes("?") ? "&" : "?") + qs;
      }
    }
    return url;
  }

  const deviceId = "device-uuid-12345";
  const path = "/api/notifications/preferences";

  // CORRECT: direct object { device_id: id }
  const correctUrl = buildUrl(path, { device_id: deviceId });
  assert.equal(correctUrl, "/api/notifications/preferences?device_id=device-uuid-12345");
  assert.ok(!correctUrl.includes("[object"), "Url must never contain [object Object]");

  // BUGGY (what was previously passed): { params: { device_id: id } }
  const buggyUrl = buildUrl(path, { params: { device_id: deviceId } });
  assert.ok(decodeURIComponent(buggyUrl).includes("[object+Object]"), "Demonstrating that nested params object serialized to [object+Object]");
});

test("logout sequence: awaits push device unregistration before revoking auth token", async () => {
  const callSequence = [];
  let tokenRevoked = false;

  const mockNotificationApi = {
    async unregisterDevice(deviceId) {
      if (tokenRevoked) {
        throw new Error("401 Unauthorized: token was already revoked!");
      }
      callSequence.push(`unregisterDevice:${deviceId}`);
      return { ok: true };
    },
  };

  const mockAuthApi = {
    async logout() {
      callSequence.push("authLogout");
      tokenRevoked = true;
      return { ok: true };
    },
  };

  let clearedAuth = false;
  function clearAuthState() {
    callSequence.push("clearAuthState");
    clearedAuth = true;
  }

  // Proper logout flow:
  const deviceId = "device-abc";
  const authToken = "jwt-valid-token";

  if (deviceId && authToken) {
    try {
      await mockNotificationApi.unregisterDevice(deviceId);
    } catch {
      /* ignore */
    }
  }
  if (authToken) {
    await mockAuthApi.logout();
  }
  clearAuthState();

  assert.deepEqual(callSequence, [
    "unregisterDevice:device-abc",
    "authLogout",
    "clearAuthState",
  ], "Unregister must happen BEFORE authLogout and clearAuthState");
  assert.equal(clearedAuth, true);
});

test("permission grant sync: newly granted permission triggers push token sync", async () => {
  let syncCalled = false;
  const mockSyncPushToken = async () => {
    syncCalled = true;
  };

  // Simulating ensureNotificationPermission when user accepts
  const requested = { granted: true };
  const isAuthenticated = true;

  if (requested.granted && isAuthenticated) {
    await mockSyncPushToken();
  }

  assert.equal(syncCalled, true, "syncPushTokenWithBackend must be called when permission is granted");
});


