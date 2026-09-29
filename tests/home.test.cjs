const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const icons = new Proxy({}, { get: (_, key) => String(key) });
const svgMock = {
  __esModule: true,
  default: "Svg",
  Defs: "Defs",
  LinearGradient: "LinearGradient",
  Rect: "Rect",
  Stop: "Stop",
  Path: "Path",
  Text: "Text",
  Circle: "Circle",
  G: "G",
};

// Exercise the actual screen/controller without a native device or live account.
function loadSource(relativePath, mocks = {}) {
  const file = path.resolve(__dirname, "..", relativePath);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: file })(
    (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === "lucide-react-native") return icons;
      if (name === "react-native-svg") return svgMock;
      if (name.startsWith("@assets/") || name.endsWith(".jpg") || name.endsWith(".png")) return 1;
      if (name.startsWith("@/")) {
        const candidate = path.resolve(__dirname, "..", "src", name.slice(2));
        for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
          if (fs.existsSync(candidate + ext)) {
            return loadSource(path.relative(path.resolve(__dirname, ".."), candidate + ext), mocks);
          }
        }
      }
      return require(name);
    },
    module,
    module.exports,
  );
  return module.exports;
}

const { getHomeClarityPercent } = loadSource("src/utils/homeProgress.ts");
const { navigateAfterLogin } = loadSource("src/navigation/nav.ts", {
  "@react-navigation/native": { createNavigationContainerRef: () => ({}) },
});
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
    "@/hooks/queries/useVideoQueries": { useViewedVideosQuery: () => ({ data: [] }), videoKeys: { all: ["videos"] } },
    "@/utils/homeProgress": { getHomeClarityPercent },
  });
  return { model: useHomeViewModel({ navigate: (...args) => calls.push(args) }), calls };
}

const destinations = [["Videos", undefined], ["Text", { entry: "input" }], ["Text", { entry: "ocr" }], ["Phonemes", undefined]];

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
  View: "View", Text: "Text", Pressable: "Pressable", ScrollView: "ScrollView", RefreshControl: "RefreshControl", ActivityIndicator: "ActivityIndicator", TouchableOpacity: "TouchableOpacity", TextInput: "TextInput", Image: "Image",
  StyleSheet: { create: (styles) => styles, absoluteFill: {} },
  useWindowDimensions: () => ({ width: 390, fontScale: 1 }),
};
function flatten(element) {
  if (element == null || typeof element !== "object") return [];
  if (Array.isArray(element)) return element.flatMap(flatten);
  if (typeof element.type === "function") return flatten(element.type(element.props));
  return [element, ...flatten(element.props?.children)];
}
test("Home renders video, text, phonemes in order and wires all feature actions", () => {
  const { model, calls } = createHome({ signedIn: true });
  const { default: HomeScreen } = loadSource("src/screens/tabs/HomeScreen.tsx", {
    "react-native": nativeMocks,
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "react-native-svg": { __esModule: true, default: "Svg", Defs: "Defs", LinearGradient: "LinearGradient", Rect: "Rect", Stop: "Stop", Path: "Path", Text: "Text" },
    "lucide-react-native": icons,
    "@/hooks/useHomeViewModel": { useHomeViewModel: () => model },
    "@/components/ui/BrandWaveform": { BrandWaveform: () => null },
  });
  const nodes = flatten(HomeScreen({ navigation: {} }));
  const node = (id) => nodes.find((item) => item.props.testID === id);
  assert.ok(nodes.indexOf(node("home-video")) < nodes.indexOf(node("home-text-section")));
  assert.ok(nodes.indexOf(node("home-text-section")) < nodes.indexOf(node("home-phonemes-section")));
  const phonemesCard = node("home-phonemes");
  assert.equal(phonemesCard.type, "Pressable");
  assert.equal(flatten(phonemesCard).filter((item) => typeof item.props.onPress === "function").length, 1);
  assert.ok(flatten(phonemesCard).some((item) => item.type === "Image"));
  for (const id of ["home-video", "home-text-input", "home-text-ocr", "home-phonemes"]) node(id).props.onPress();
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
    react: {
      useRef: () => ref,
      useEffect: (effect) => effects.push(effect),
      useState: (initial) => [typeof initial === "function" ? initial() : initial, () => {}],
      useMemo: (fn) => fn(),
    },
    "react-native": nativeMocks,
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "@/components/practice/HomeJourney": { default: () => null },
    "@/components/practice/IPAChecking": { default: () => null },
    "@/components/practice/ScreeningResultModal": { default: () => null },
    "@/components/practice/ScreeningSession": { default: () => null },
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

test("pronunciation main prioritizes screening without gating practice, sounds or journey", () => {
  const { default: PhonemesHome } = loadSource("src/components/practice/PhonemesHome.tsx", { "react-native": nativeMocks });
  for (const completed of [false, true]) {
    const calls = [];
    const tree = flatten(PhonemesHome({
      t: key => key, dialect: "uk", screeningCompleted: completed, weakestPhonemes: [{ sound: "θ" }],
      onScreening: () => calls.push("screening"), onLesson: () => calls.push("lesson"),
      onPhoneme: sound => calls.push(sound), onJourney: () => calls.push("journey"),
      onCatalog: () => calls.push("catalog"), onProfile: () => calls.push("profile"), onRetry: () => {},
    }));
    const find = id => tree.find(node => node.props.testID === id);
    assert.equal(Boolean(find("phonemes-screening-card")), !completed);
    assert.equal(Boolean(find("phonemes-lesson-hero")), completed);
    assert.equal(Boolean(find("phonemes-profile")), completed);
    assert.ok(find("phonemes-weak-sounds"));
    assert.equal(find("phonemes-start-lesson").props.disabled, false);
    find("phonemes-start-lesson").props.onPress();
    flatten(find("phonemes-weak-sounds")).find(node => node.type === "Pressable").props.onPress();
    find("phonemes-journey").props.onPress();
    find("phonemes-catalog").props.onPress();
    assert.deepEqual(calls, ["lesson", "θ", "journey", "catalog"]);
    if (!completed) {
      assert.ok(tree.indexOf(find("phonemes-screening-card")) < tree.indexOf(find("phonemes-start-lesson")));
    }
  }
});

test("pronunciation main labels generic suggestions as exploration even after screening", () => {
  const { default: PhonemesHome } = loadSource("src/components/practice/PhonemesHome.tsx", { "react-native": nativeMocks });
  for (const completed of [false, true]) {
    const tree = flatten(PhonemesHome({ t: key => key, dialect: "uk", screeningCompleted: completed, weakestPhonemes: [] }));
    assert.ok(tree.some(node => node.props.testID === "phonemes-explore-sounds"));
    assert.ok(!tree.some(node => node.props.testID === "phonemes-weak-sounds"));
  }
});

test("pronunciation data keeps screening independent, filters unassessed sounds, and confirms completion from the server", async () => {
  const slots = [];
  let cursor = 0;
  let completionFails = false;
  const requests = [];
  const summary = { weakest_phonemes: [
    { sound: "n", accuracy: null }, { sound: "t", accuracy: "" },
    { sound: "r", accuracy: 0.6 }, { sound: "/θ/", accuracy: 0.2 }, { sound: "θ", accuracy: 0.3 },
  ] };
  const { usePhonemesViewModel } = loadSource("src/hooks/usePhonemesViewModel.ts", {
    react: {
      useCallback: fn => fn, useMemo: fn => fn(),
      useRef: initial => { const index = cursor++; return slots[index] ??= { current: initial }; },
      useState: initial => {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
      },
    },
    "react-i18next": { useTranslation: () => ({ t: key => key, i18n: { language: "vi" } }) },
    "@tanstack/react-query": { useQueryClient: () => ({ invalidateQueries: async () => {} }) },
    "@/services/Auth": { useAuth: () => ({ authToken: "test", screeningCompleted: false, scoreUnlocked: true, refreshScreeningStatus: async () => null }) },
    "@/services/usageLimits": { resolveUserKey: () => "test", resolveUserTier: () => "free" },
    "@/store/useBillingStore": { useBillingStore: select => select({ usage: null }) },
    "@/hooks/queries/useLessonQueries": { useHomeSummaryQuery: () => ({ data: summary, refetch: async () => ({ data: summary }) }), lessonKeys: { homeSummary: () => [] } },
    "@/hooks/queries/useBillingQueries": { useBillingUsageQuery: () => {} },
    "@/hooks/queries/useProgressQueries": { progressKeys: { sounds: () => [] } },
    "@/utils/localizedError": { getFriendlyErrorMessage: (_, fallback) => fallback },
    "@/api": { lessonApi: {
      getPersonalizedLesson: async () => { requests.push("lesson"); return { sentences: [{ text: "Hello" }] }; },
      getPhonemeLesson: async () => { requests.push("sound"); return { sentences: [{ text: "Think" }], vi_instructions: "Hướng dẫn" }; },
      completeScreening: async () => { if (completionFails) throw Error("offline"); return { screening_completed: true, total_accuracy: 0 }; },
    }, textPracticeApi: {} },
  });
  const render = () => { cursor = 0; return usePhonemesViewModel({ navigate: () => assert.fail("Unexpected login gate") }); };
  let model = render();
  assert.equal(model.screeningCompleted, false);
  assert.deepEqual(model.weakestPhonemes.map(item => item.sound), ["θ", "r"]);
  await model.startPersonalizedLesson();
  await model.startPhoneme("θ");
  assert.deepEqual(requests, ["lesson", "sound"]);
  assert.equal(render().lessonSession.instructionsHtml, "Hướng dẫn");
  completionFails = true;
  await model.handleScreeningFinished();
  model = render();
  assert.equal(model.screeningCompleted, false);
  assert.equal(model.screeningResult, null);
  assert.ok(model.screeningError);
  completionFails = false;
  await model.handleScreeningFinished();
  model = render();
  assert.equal(model.screeningCompleted, true);
  assert.equal(model.screeningResult.totalAccuracy, 0);
});
