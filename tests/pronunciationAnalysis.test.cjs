const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(relative, mocks = {}) {
  const filename = path.resolve(__dirname, '..', relative);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext('(function(require,module,exports){' + source + '\n})', { filename })(name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('.')) {
      for (const ext of ['.ts', '.tsx']) {
        const local = path.resolve(path.dirname(filename), name + ext);
        if (fs.existsSync(local)) return load(local, mocks);
      }
    }
    if (name.startsWith('@/')) {
      for (const ext of ['.ts', '.tsx']) {
        const local = 'src/' + name.slice(2) + ext;
        if (fs.existsSync(path.resolve(__dirname, '..', local))) return load(local, mocks);
      }
    }
    return require(name);
  }, module, module.exports);
  return module.exports;
}

const {
  buildWordScores,
  buildSoundAnalysisRows,
  tokenizeIpa,
} = load('src/utils/pronunciationAnalysis.ts');

function practiceRouteHarness({ sentence = false, instructions = {} } = {}) {
  const cells = [], effects = [], calls = [];
  let cursor = 0, tree;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial; return [cells[i], value => { cells[i] = typeof value === 'function' ? value(cells[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return cells[i] ??= { current: initial }; },
    useMemo(fn, deps) { const i = cursor++; if (!same(cells[i]?.deps, deps)) cells[i] = { deps, value: fn() }; return cells[i].value; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++, old = cells[i]; if (!same(old?.deps, deps)) { cells[i] = { deps }; effects.push(fn); } },
  };
  const lesson = { phoneme: 'θ', dialect: 'us', sentences: [{ text: 'think', words: [{ word: 'think', ipa: 'θɪŋk' }] }], ...instructions };
  const translation = { t: key => key, i18n: { language: 'vi' } };
  const queryClient = { invalidateQueries: async () => {} };
  const mocks = {
    react,
    'react-native': Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'ScrollView'].map(name => [name, name])),
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ bottom: 0 }) },
    'react-i18next': { useTranslation: () => translation },
    '@react-navigation/native': { useIsFocused: () => true },
    '@tanstack/react-query': { useQueryClient: () => queryClient },
    'lucide-react-native': new Proxy({}, { get: (_, name) => name }),
    'expo-audio': { createAudioPlayer: () => ({}) },
    '@/utils/audioPlayer': { releaseAudioPlayer: () => {} },
    '@/utils/haptics': { hapticFeedback: {} },
    '@/utils/localizedError': { getFriendlyErrorMessage: error => String(error) },
    '@/navigation/nav': { safeNavigate: () => {} },
    '@/services/Auth': { useAuth: () => ({ authToken: 'token', userDialect: 'uk' }) },
    '@/store/useAuthStore': { useAuthStore: select => select({ token: 'token' }) },
    '@/services/usageLimits': { resolveUserKey: () => 'test', resolveUserTier: () => 'pro' },
    '@/store/useBillingStore': { useBillingStore: select => select({ usage: null }) },
    '@/hooks/usePronunciationCheck': { usePronunciationCheck: () => ({ checking: false, isRecording: false }) },
    '@/hooks/queries/useBillingQueries': { useBillingUsageQuery: () => ({ data: null }) },
    '@/hooks/queries/useLessonQueries': { lessonKeys: {} },
    '@/hooks/queries/useProgressQueries': { progressKeys: {} },
    '@/components/ui/Skeleton': { PracticeScreenSkeleton: 'Skeleton' },
    '@/api': { lessonApi: { getPhonemeLesson: async (...args) => { calls.push(['fetch', ...args]); return lesson; }, markPracticed: async () => {} }, textPracticeApi: {} },
    '@/api/textPracticeApi': { textPracticeApi: {} },
  };
  for (const name of ['IPAChecking', 'PhonemeIntroGuide', 'PracticePromptCard', 'PracticeFeedbackCard', 'SpeechRecordingDock', 'MicErrorCard']) {
    mocks['@/components/practice/' + name] = { __esModule: true, default: name };
  }
  mocks['@/components/ui/UpgradeProModal'] = { __esModule: true, default: 'UpgradeProModal' };
  const Screen = load(`src/screens/practice/${sentence ? 'Sentence' : 'Phoneme'}PracticeScreen.tsx`, mocks).default;
  const props = {
    route: { params: sentence ? { sentences: lesson.sentences, dialect: 'us' } : { phoneme: '/θ/', dialect: 'us' } },
    navigation: { navigate: (...args) => calls.push(args), push: (...args) => calls.push(args), goBack: () => calls.push(['back']) },
  };
  const find = (type, node = tree) => {
    if (!node) return undefined;
    if (Array.isArray(node)) return node.map(child => find(type, child)).find(Boolean);
    return node.type === type ? node : find(type, node.props?.children ?? null);
  };
  return { calls, lesson, props, find, render() { cursor = 0; tree = Screen(props); while (effects.length) effects.shift()(); } };
}

test('shared IPA route opens its guide on entry, stays dismissed during practice, and allows manual reopening', async () => {
  for (const instructions of [{ vi_instructions: '<p>Đặt lưỡi giữa hai hàm răng</p>' }, { en_instructions: '<p>Place your tongue between your teeth</p>' }]) {
    const h = practiceRouteHarness({ instructions });
    h.render(); await new Promise(resolve => setImmediate(resolve)); h.render();
    assert.deepEqual(h.calls[0], ['fetch', 'θ', 'us', true]);
    assert.equal(h.find('PhonemeIntroGuide').props.lessonData, h.lesson);
    assert.equal(h.find('PhonemeIntroGuide').props.visible, true);
    assert.equal(h.find('PhonemeIntroGuide').props.phoneme, 'θ');
    assert.equal(h.find('PhonemeIntroGuide').props.dialect, 'us');
    h.find('PhonemeIntroGuide').props.onClose(); h.render();
    assert.equal(h.find('PhonemeIntroGuide').props.visible, false);
    await h.find('IPAChecking').props.loadNextLesson(); h.render(); h.render();
    assert.equal(h.find('PhonemeIntroGuide').props.visible, false, 'Next exercises must not reopen a dismissed guide');
    h.find('IPAChecking').props.onShowGuide(); h.render();
    assert.equal(h.find('PhonemeIntroGuide').props.visible, true);
    h.find('IPAChecking').props.onClose();
    assert.deepEqual(h.calls.at(-1), ['back']);
  }
});

test('entering another sound on the same IPA route opens its guide again', async () => {
  const h = practiceRouteHarness({ instructions: { vi_instructions: '<p>Hướng dẫn</p>' } });
  h.render(); await new Promise(resolve => setImmediate(resolve)); h.render();
  h.find('PhonemeIntroGuide').props.onClose(); h.render();
  h.props.route.params.phoneme = 'ʒ';
  h.render(); await new Promise(resolve => setImmediate(resolve)); h.render();
  assert.equal(h.find('PhonemeIntroGuide').props.visible, true);
  assert.equal(h.find('PhonemeIntroGuide').props.phoneme, 'ʒ');
  assert.deepEqual(h.calls.at(-1), ['fetch', 'ʒ', 'us', true]);
});

test('IPA lessons without instructions remain usable without an empty guide', async () => {
  const h = practiceRouteHarness();
  h.render(); await new Promise(resolve => setImmediate(resolve)); h.render();
  assert.ok(h.find('IPAChecking'));
  assert.equal(h.find('PhonemeIntroGuide'), undefined);
});

test('sentence result sound action uses the shared IPA route with the sentence dialect', () => {
  const h = practiceRouteHarness({ sentence: true }); h.render();
  h.find('PracticeFeedbackCard').props.onPracticePhoneme('ʒ');
  assert.deepEqual(h.calls, [['PhonemePractice', { phoneme: 'ʒ', dialect: 'us' }]]);
});

test('tokenizeIpa breaks IPA into valid phonemes and marks', () => {
  const tokens = tokenizeIpa('fuːd');
  assert.deepEqual(tokens, ['f', 'uː', 'd']);
});

test('buildWordScores ignores inserted phonemes and keeps 1:1 target alignment clean', () => {
  const words = [
    { word: 'food', ipa: 'fuːd' },
    { word: 'is', ipa: 'ɪz' },
  ];
  const alignment = [
    { char: 'f', status: 'correct', predicted_char: 'f', word_index: 0 },
    { char: 'uː', status: 'correct', predicted_char: 'uː', word_index: 0 },
    { char: 'd', status: 'correct', predicted_char: 'd', word_index: 0 },
    // User mistakenly added /s/ at the end of word "food" (inserted - should be ignored)
    { char: '', status: 'inserted', predicted_char: 's', word_index: 0, tip: 'Avoid extra s' },
    // Space separator between words
    { char: ' ', status: 'space', word_index: 0 },
    // Word 1 "is"
    { char: 'ɪ', status: 'correct', predicted_char: 'ɪ', word_index: 1 },
    { char: 'z', status: 'replaced', predicted_char: 's', word_index: 1, tip: 'Pronounce voiced z' },
  ];

  const scores = buildWordScores(words, alignment);
  assert.equal(scores.length, 2);

  // Word 0 "food"
  assert.equal(scores[0].alignment.length, 3, '1:1 aligned phones count should match target phonemes without inserted');
  assert.deepEqual(scores[0].alignment.map(p => p.char), ['f', 'uː', 'd']);
  assert.equal(scores[0].inserted?.length, 0, 'Inserted phonemes must not be collected into results');

  // Word 1 "is"
  assert.equal(scores[1].alignment.length, 2);
  assert.equal(scores[1].inserted?.length, 0);
});

test('buildSoundAnalysisRows retains correct, deleted, replaced phonemes and excludes inserted phonemes', () => {
  const alignment = [
    { char: 'f', status: 'correct', predicted_char: 'f', word_index: 0, tip: '' },
    { char: 'uː', status: 'deleted', predicted_char: '', word_index: 0, tip: 'Lengthen the vowel' },
    { char: 'd', status: 'replaced', predicted_char: 't', word_index: 0, tip: 'Make d voiced' },
    // Inserted phoneme where reference char is empty string (must be excluded)
    { char: '', status: 'inserted', predicted_char: 's', word_index: 0, tip: 'Do not add s sound' },
    // Space or untracked status should be ignored
    { char: ' ', status: 'space', word_index: 0 },
  ];

  const rows = buildSoundAnalysisRows(alignment);
  assert.equal(rows.length, 3, 'Should include only correct, deleted, and replaced rows (inserted excluded)');

  // Check correct row
  assert.equal(rows[0].status, 'correct');
  assert.equal(rows[0].expected, 'f');
  assert.equal(rows[0].pronounced, 'f');

  // Check deleted row
  assert.equal(rows[1].status, 'deleted');
  assert.equal(rows[1].expected, 'uː');
  assert.equal(rows[1].pronounced, '');

  // Check replaced row
  assert.equal(rows[2].status, 'replaced');
  assert.equal(rows[2].expected, 'd');
  assert.equal(rows[2].pronounced, 't');

  // Verify no inserted phonemes in rows
  assert.equal(rows.some(r => r.status === 'inserted'), false, 'Inserted phonemes must be completely excluded from sound analysis rows');
});
