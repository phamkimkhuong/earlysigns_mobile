const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(relative, mocks = {}) {
  const filename = path.resolve(__dirname, '..', relative);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
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
const { screeningReducer, screeningAccuracy, isScreeningComplete } = load('src/utils/screeningSession.ts');

test('screening accepts low/zero scores, rejects missing scores and cannot skip unrecorded sentences', () => {
  let state = { current: 0, results: {} };
  assert.equal(screeningReducer(state, { type: 'next' }), state);
  for (const accuracy of [null, undefined, '', NaN, -1, 1.1, true]) assert.equal(screeningAccuracy({ accuracy }), null);
  assert.equal(screeningReducer(state, { type: 'recorded', index: 1, result: { accuracy: 0.5 } }), state);
  for (let index = 0; index < 5; index++) {
    state = screeningReducer(state, { type: 'recorded', index, result: { accuracy: index === 0 ? 0 : 0.2 } });
    assert.equal(isScreeningComplete(state.results), index === 4);
    state = screeningReducer(state, { type: 'next' });
  }
  assert.equal(state.current, 4);
  state = screeningReducer(state, { type: 'previous' });
  state = screeningReducer(state, { type: 'recorded', index: 3, result: { accuracy: 0.1 } });
  assert.equal(Object.keys(state.results).length, 5);
  assert.equal(isScreeningComplete({ ...state.results, 2: { accuracy: null } }), false);
});

function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (typeof node.type === 'function') return flatten(node.type(node.props));
  return [node, ...flatten(node.props?.children)];
}
const native = { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', ActivityIndicator: 'ActivityIndicator', Modal: 'Modal', AppState: { addEventListener: () => ({ remove() {} }) } };
const icons = new Proxy({}, { get: (_, key) => String(key) });
const baseMocks = { 'react-native': native, 'lucide-react-native': icons, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' } };
const { default: View } = load('src/components/practice/ScreeningPracticeView.tsx', baseMocks);

test('screening UI shows one sentence and changes its main action without score gating', () => {
  for (const [phase, label, disabled] of [['ready', 'record', false], ['recording', 'stop', false], ['checking', 'checking', true], ['recorded', 'next', false], ['saving', 'saving', true]]) {
    const tree = flatten(View({ t: key => key, sentence: { text: 'Read me once.' }, current: 0, completed: phase === 'recorded' ? [0] : [], phase, seconds: 7, error: '', score: 0, showScore: false }));
    const primary = tree.find(node => node.props.testID === 'screening-primary');
    assert.equal(primary.props.disabled, disabled);
    assert.ok(flatten(primary).some(node => node.props.children === 'screeningPractice.' + label));
    assert.equal(tree.filter(node => node.props.children === 'Read me once.').length, 1);
  }
});

test('recording flow keeps results on save failure and never submits automatically after the fifth sentence', async () => {
  const slots = [];
  let index = 0;
  let dirty = false;
  let effects = [];
  const state = initial => {
    const slot = index++;
    if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? initial() : initial;
    return [slots[slot], update => { const value = typeof update === 'function' ? update(slots[slot]) : update; if (!Object.is(value, slots[slot])) { slots[slot] = value; dirty = true; } }];
  };
  let saves = 0;
  let allowSave = false;
  let nextScore = 0;
  const audio = {
    isRecording: false, isStarting: false, checking: false, result: null, audioUri: null, error: '', micError: null,
    startRecording: async () => { audio.result = null; audio.isRecording = true; },
    stopRecording: async () => { audio.isRecording = false; audio.result = { accuracy: nextScore }; audio.audioUri = 'test.wav'; },
    clearResult: () => { audio.result = null; audio.audioUri = null; }, cancelRecording: async () => {},
  };
  const t = key => key;
  const { default: Session } = load('src/components/practice/ScreeningSession.tsx', {
    ...baseMocks,
    react: {
      useState: state,
      useReducer: (reducer, initial) => { const [value, set] = state(initial); return [value, action => set(prev => reducer(prev, action))]; },
      useRef: value => { const slot = index++; return slots[slot] ??= { current: value }; },
      useCallback: fn => fn,
      useEffect: (fn, deps) => {
        const slot = index++;
        const previous = slots[slot];
        if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
          const effect = { deps };
          slots[slot] = effect;
          effects.push(() => { previous?.cleanup?.(); effect.cleanup = fn(); });
        }
      },
    },
    'react-i18next': { useTranslation: () => ({ t, i18n: { language: 'vi' } }) },
    'expo-audio': { createAudioPlayer: () => assert.fail('Unexpected playback'), setAudioModeAsync: async () => {} },
    '@/hooks/usePronunciationCheck': { usePronunciationCheck: () => audio },
    '@/utils/localizedError': { getFriendlyErrorMessage: (_, fallback) => fallback },
    '@/components/ui/UpgradeProModal': { default: () => null },
  });
  const props = { sentences: Array.from({ length: 5 }, (_, i) => ({ text: 'Sentence ' + i })), dialect: 'uk', userTier: 'free', userKey: 'test', onClose() {}, onComplete: async () => { saves++; return allowSave; } };
  let tree;
  const render = () => {
    let iterations = 0;
    do {
      dirty = false; index = 0; effects = [];
      tree = flatten(Session(props));
      effects.forEach(fn => fn());
      if (++iterations > 12) throw Error('Unstable render');
    } while (dirty);
  };
  const press = async id => {
    const button = tree.find(node => node.props.testID === id);
    assert.ok(button && !button.props.disabled, id);
    button.props.onPress();
    for (let i = 0; i < 8; i++) await Promise.resolve();
    render();
  };
  render();
  assert.equal(audio.isRecording, false);
  nextScore = null;
  await press('screening-primary');
  await press('screening-primary');
  assert.ok(!tree.some(node => node.props.testID === 'screening-recorded'));
  nextScore = 0;
  for (let i = 0; i < 5; i++) {
    await press('screening-primary');
    assert.equal(audio.isRecording, true);
    await press('screening-primary');
    assert.ok(tree.some(node => node.props.testID === 'screening-recorded'));
    if (i < 4) await press('screening-primary');
  }
  assert.equal(saves, 0);
  await press('screening-primary');
  assert.equal(saves, 1);
  assert.ok(tree.some(node => node.props.testID === 'screening-error'));
  assert.ok(tree.some(node => node.props.testID === 'screening-recorded'));
  allowSave = true;
  await press('screening-primary');
  assert.equal(saves, 2);
});
