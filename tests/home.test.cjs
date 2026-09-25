const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the actual screen/controller without a native device or live account.
function loadSource(relativePath, mocks = {}) {
  const file = path.resolve(__dirname, "..", relativePath);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: file })(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name), module, module.exports,
  );
  return module.exports;
}

const { getHomeClarityPercent } = loadSource("src/utils/homeProgress.ts");
const { navigateAfterLogin } = loadSource("src/navigation/nav.ts");
const sounds = (count, checks = 5) => Array.from({ length: count }, (_, index) => ({ sound: `sound-${index}`, checks_count: checks }));

test("score requires 36 distinct qualified sounds, including at the 35/36 boundary", () => {
  assert.equal(getHomeClarityPercent(sounds(35), 0.82), null);
  assert.equal(getHomeClarityPercent(sounds(36), 0.82), 82);
  assert.equal(getHomeClarityPercent(sounds(44, 4), 0.82), null);
  assert.equal(getHomeClarityPercent([...sounds(35), ...sounds(35)], 0.82), null);
});

test("accuracy never substitutes for check counts; missing and invalid scores stay hidden", () => {
  assert.equal(getHomeClarityPercent(sounds(44).map(({ sound }) => ({ sound, accuracy: 0.9 })), 0.9), null);
  for (const accuracy of [undefined, null, "", NaN, -0.1, 1.1]) {
    assert.equal(getHomeClarityPercent(sounds(44), accuracy), null);
  }
  assert.equal(getHomeClarityPercent(sounds(36), 0), 0);
  assert.equal(getHomeClarityPercent(sounds(36).map(({ sound }) => ({ sound, count: 5 })), 1), 100);
});

function createHome({ signedIn = false, summary = null, soundData = [], unlocked = false } = {}) {
  const calls = [];
  const queryClient = { invalidateQueries: async () => {} };
  const { useHomeViewModel } = loadSource("src/hooks/useHomeViewModel.ts", {
    react: { useCallback: (fn) => fn, useMemo: (fn) => fn() },
    "react-i18next": { useTranslation: () => ({ t: (key) => key }) },
    "@tanstack/react-query": { useQueryClient: () => queryClient },
    "@/services/Auth": { useAuth: () => ({ authToken: signedIn ? "test-token" : "", authEmail: "learner@example.test", userDialect: "uk", scoreUnlocked: unlocked }) },
    "@/services/usageLimits": {
      resolveUserKey: () => "test-user", resolveUserTier: () => signedIn ? "free" : "anonymous",
      getMonthlyQuotaSnapshot: () => ({ isUnlimited: true }),
    },
    "@/store/useBillingStore": { useBillingStore: (select) => select({ homeSummary: summary, usage: null }) },
    "@/hooks/usePullToRefresh": { usePullToRefresh: (onRefresh) => ({ refreshing: false, onRefresh }) },
    "@/hooks/queries/useLessonQueries": { useHomeSummaryQuery: () => ({ data: summary, isLoading: false, isError: false }), lessonKeys: { all: ["lessons"] } },
    "@/hooks/queries/useBillingQueries": { useBillingUsageQuery: () => ({ data: null }), billingKeys: { all: ["billing"] } },
    "@/hooks/queries/useProgressQueries": { useProgressSoundsQuery: () => ({ data: soundData }), progressKeys: { all: ["progress"] } },
    "@/utils/homeProgress": { getHomeClarityPercent },
  });
  return { model: useHomeViewModel({ navigate: (...args) => calls.push(args) }), calls };
}

const destinations = [["Videos", undefined], ["Text", { entry: "input" }], ["Text", { entry: "ocr" }], ["Phonemes", undefined], ["Journey", undefined], ["Phonemes", { startLesson: true }]];

test("guests resume every selected feature after login, with Home below it for Back", () => {
  for (const [route, params] of destinations) {
    const { model, calls } = createHome();
    model.navigateWithGate(route, params);
    assert.deepEqual(calls, [["Login", { next: route, nextParams: params }]]);
    let reset;
    navigateAfterLogin({ reset: (state) => { reset = state; } }, calls[0][1].next, calls[0][1].nextParams);
    assert.deepEqual(reset, { index: 1, routes: [{ name: "Main" }, { name: route, params }] });
  }
});

test("signed-in users open each feature directly", () => {
  const { model, calls } = createHome({ signedIn: true });
  for (const [route, params] of destinations) model.navigateWithGate(route, params);
  assert.deepEqual(calls, destinations);
});

test("guest Home never exposes old cached progress, journey or weak sounds", () => {
  const { model } = createHome({ summary: { streak_days: 9, total_accuracy: 0.9, journey: { current_module: 2 }, weakest_phonemes: [{ sound: "θ" }] }, soundData: sounds(44), unlocked: true });
  assert.equal(model.streakDays, null);
  assert.equal(model.clarityPct, null);
  assert.equal(model.journey, null);
  assert.equal(model.quota, null);
  assert.deepEqual(model.weakestPhonemes, []);
});

test("signed-in Home has no fabricated weak sounds or premature score", () => {
  const empty = createHome({ signedIn: true }).model;
  assert.deepEqual(empty.weakestPhonemes, []);
  assert.equal(empty.streakDays, null);
  assert.equal(createHome({ signedIn: true, summary: { total_accuracy: 0.9 }, soundData: sounds(35), unlocked: true }).model.clarityPct, null);
  assert.equal(createHome({ signedIn: true, summary: { total_accuracy: 0.9 }, soundData: sounds(36), unlocked: true }).model.clarityPct, 90);
});

const nativeMocks = {
  View: "View", Text: "Text", Pressable: "Pressable", ScrollView: "ScrollView", RefreshControl: "RefreshControl", ActivityIndicator: "ActivityIndicator", TouchableOpacity: "TouchableOpacity", TextInput: "TextInput",
  StyleSheet: { create: (styles) => styles, absoluteFill: {} },
  useWindowDimensions: () => ({ width: 390, fontScale: 1 }),
};
function flatten(element) {
  if (element == null || typeof element !== "object") return [];
  if (Array.isArray(element)) return element.flatMap(flatten);
  if (typeof element.type === "function") return flatten(element.type(element.props));
  return [element, ...flatten(element.props?.children)];
}
const icons = new Proxy({}, { get: (_, key) => String(key) });

test("Home renders video, text, phonemes in order and wires all feature actions", () => {
  const { model, calls } = createHome({ signedIn: true });
  const { default: HomeScreen } = loadSource("src/screens/tabs/HomeScreen.tsx", {
    "react-native": nativeMocks,
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "react-native-svg": { __esModule: true, default: "Svg", Defs: "Defs", LinearGradient: "LinearGradient", Rect: "Rect", Stop: "Stop" },
    "lucide-react-native": icons,
    "@/hooks/useHomeViewModel": { useHomeViewModel: () => model },
  });
  const nodes = flatten(HomeScreen({ navigation: {} }));
  const node = (id) => nodes.find((item) => item.props.testID === id);
  assert.ok(nodes.indexOf(node("home-video")) < nodes.indexOf(node("home-text-section")));
  assert.ok(nodes.indexOf(node("home-text-section")) < nodes.indexOf(node("home-phonemes-section")));
  for (const id of ["home-video", "home-text-input", "home-text-ocr", "home-phonemes", "home-journey", "home-start-lesson"]) node(id).props.onPress();
  assert.deepEqual(calls, destinations);
});

test("OCR entry presents image sources before the editor; text entry focuses the editor", () => {
  const { default: TextScreen } = loadSource("src/screens/tabs/TextPracticeScreen.tsx", {
    "react-native": nativeMocks,
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "lucide-react-native": icons,
    "@/components/ui/DialectToggle": { default: () => null },
    "@/components/practice/IPAChecking": { default: () => null },
    "@/components/ui/PrimaryButton": { default: () => null },
    "@/components/ui/Skeleton": { PassageListSkeleton: () => null },
    "@/hooks/useTextPracticeViewModel": { useTextPracticeViewModel: () => ({ t: (key) => key, inputText: "", passages: [], handleOcr: () => {} }) },
  });
  for (const entry of ["input", "ocr"]) {
    const nodes = flatten(TextScreen({ navigation: {}, route: { params: { entry } } }));
    const editor = nodes.find((node) => node.props.testID === "text-practice-input");
    const actions = nodes.find((node) => node.props.testID === "text-ocr-actions");
    assert.equal(editor.props.autoFocus, entry === "input");
    assert.equal(nodes.indexOf(actions) < nodes.indexOf(editor), entry === "ocr");
  }
});

test("personalized lesson intent is consumed once, including a replayed mount effect", () => {
  const ref = { current: false };
  const effects = [];
  let starts = 0;
  const params = [];
  const { default: PhonemesScreen } = loadSource("src/screens/tabs/PhonemesScreen.tsx", {
    react: { useRef: () => ref, useEffect: (effect) => effects.push(effect) },
    "react-native": nativeMocks,
    "@/components/practice/HomeJourney": { default: () => null },
    "@/components/practice/IPAChecking": { default: () => null },
    "@/components/practice/ScreeningResultModal": { default: () => null },
    "@/components/ui/PrimaryButton": { default: () => null },
    "@/components/ui/Skeleton": { PhonemesChipsSkeleton: () => null },
    "@/utils/checkResultScoreColor": { accuracyBandColor: () => "" },
    "@/hooks/usePhonemesViewModel": { usePhonemesViewModel: () => ({ t: (key) => key, weakestPhonemes: [], startPersonalizedLesson: async () => { starts++; } }) },
  });
  const render = (startLesson) => PhonemesScreen({
    navigation: { setParams: (value) => params.push(value) }, route: { params: { startLesson } },
  });
  render(true);
  const mount = effects.pop();
  mount();
  mount();
  assert.equal(starts, 1);
  assert.deepEqual(params, [{ startLesson: undefined }]);
  render(undefined);
  effects.pop()();
  render(true);
  effects.pop()();
  assert.equal(starts, 2);
});
