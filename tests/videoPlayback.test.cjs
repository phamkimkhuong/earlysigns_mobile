const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function harness({ frame = false, stored, initialIndex, segments, playedCount = 0 } = {}) {
  const cells = [], effects = [], timers = new Map(), intervals = new Map();
  let cursor = 0, nextTimer = 0;
  const calls = { seeks: [], clear: 0, record: 0, view: 0, reset: 0, ready: 0, play: 0 };
  const data = { title: 'Test', segments: segments || [{ start_ms: 10000, end_ms: 12000, text: 'First' }, { start_ms: 15000, end_ms: 18000, text: 'Next' }], played_count: playedCount, duration_ms: 30000 };
  const store = new Map(stored == null ? [] : [['earlysigns_video_last_index_test-video', stored]]);
  const noop = () => {};
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial; return [cells[i], value => { cells[i] = typeof value === 'function' ? value(cells[i]) : value; }]; },
    useRef(value) { const i = cursor++; return cells[i] ??= { current: value }; },
    useMemo(fn, deps) { const i = cursor++; if (!same(cells[i]?.deps, deps)) cells[i] = { deps, value: fn() }; return cells[i].value; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++, old = cells[i]; if (!same(old?.deps, deps)) { cells[i] = { deps, cleanup: old?.cleanup }; effects.push(() => { old?.cleanup?.(); cells[i].cleanup = fn(); }); } },
    forwardRef: fn => fn,
  };
  const jsx = (type, props, key) => ({ type, props: props || {}, key });
  const native = Object.fromEntries(['View', 'Text', 'ScrollView', 'TouchableOpacity', 'Image', 'ActivityIndicator'].map(name => [name, name]));
  const recording = { isRecording: false, isStarting: false, checking: false, result: null, clearResult: () => calls.clear++, startRecording: async () => { calls.record++; }, stopRecording: async () => {}, replayRecording: async () => {} };
  const auth = { userDialect: 'uk', updateUserDialect: noop };
  const translation = { t: key => key, i18n: { language: 'vi' } };
  const mocks = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': { ...native, StyleSheet: { absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'lucide-react-native': Object.fromEntries(['ChevronLeft', 'ChevronRight', 'Eye', 'EyeOff', 'Film', 'RotateCcw', 'Play'].map(name => [name, name])),
    '@react-navigation/native': { useIsFocused: () => true },
    'react-i18next': { useTranslation: () => translation },
    '@/services/Auth': { useAuth: () => auth },
    '@/hooks/usePronunciationCheck': { usePronunciationCheck: () => recording },
    '@/hooks/useSegmentIpa': { useSegmentIpa: () => ({ words: [] }) },
    '@/utils/pronunciationAnalysis': { buildSoundAnalysisRows: () => [] },
    '@/services/usageLimits': { resolveUserKey: () => '', resolveUserTier: () => 'free' },
    '@/store/useBillingStore': { useBillingStore: Object.assign(() => null, { getState: () => ({ usage: null }) }) },
    '@/utils/errors': { topicLabel: () => '' },
    '@/components/ui/Skeleton': { VideoPracticeSkeleton: 'Skeleton' },
    '@/api': { videoApi: { notifyViewStart: async () => { calls.view++; }, notifyViewSegment: async () => {} }, lessonApi: {}, billingApi: {} },
    '@/hooks/queries/useVideoQueries': { useVideoDetailQuery: () => ({ data }) },
    '@/services/notifications': { cancelIncompleteLessonReminder: async () => {}, scheduleIncompleteLessonReminder: async () => {} },
    '@/services/storage': { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) },
    './YoutubePlayer': { __esModule: true, default: 'YoutubePlayer' },
  };
  for (const name of ['VideoPlayerFrame', 'IPAChecking', 'ScoreWords', 'VideoRecordingHub']) mocks['@/components/practice/' + name] = { __esModule: true, default: name };
  for (const name of ['DialectToggle', 'UpgradeProModal']) mocks['@/components/ui/' + name] = { __esModule: true, default: name };
  const file = path.resolve(__dirname, '..', frame ? 'src/components/practice/VideoPlayerFrame.tsx' : 'src/screens/practice/VideoPracticeScreen.tsx');
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module, exports: module.exports, console, Date,
    setTimeout(fn, ms) { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; }, clearTimeout: id => timers.delete(id),
    setInterval(fn, ms) { const id = ++nextTimer; intervals.set(id, { fn, ms }); return id; }, clearInterval: id => intervals.delete(id),
    require(name) { if (!(name in mocks)) throw Error('Missing mock ' + name); return mocks[name]; },
  }, { filename: file });
  const props = frame ? { videoId: 'test-video', startSeconds: 9.75, play: false, onPlay: () => calls.play++, onReset: () => calls.reset++, onReady: () => calls.ready++, onChangeState: noop } : { route: { params: { youtubeId: 'test-video', initialIndex } }, navigation: {} };
  let tree;
  const find = (type, predicate = () => true, node = tree) => {
    if (!node) return undefined;
    if (Array.isArray(node)) { for (const child of node) { const result = find(type, predicate, child); if (result) return result; } return undefined; }
    if (node.type === type && predicate(node.props)) return node;
    return find(type, predicate, node.props?.children ?? null);
  };
  return {
    calls, data, props, timers, recording, find,
    render() { cursor = 0; tree = module.exports.default(props, { current: null }); while (effects.length) effects.shift()(); return tree; },
    attachPlayer() { find('VideoPlayerFrame').props.ref.current = { seekTo: seconds => calls.seeks.push(seconds), getCurrentTime: async () => 10 }; },
    fire(ms) { for (const [id, timer] of [...timers]) if (timer.ms === ms) { timers.delete(id); timer.fn(); } },
  };
}

test('video startup cues sentence zero at its actual timestamp without seeking or autoplay', () => {
  const h = harness(); h.render(); h.render(); h.attachPlayer();
  const player = h.find('VideoPlayerFrame');
  assert.equal(player.props.startSeconds, 9.75);
  assert.equal(player.props.play, false);
  player.props.onReady(); h.render();
  assert.deepEqual(h.calls.seeks, []);
  assert.equal(h.calls.view, 0);
});

test('video startup restores the selected sentence before mounting the iframe and leaves cached segments untouched', () => {
  const segments = [{ start_ms: 15000, end_ms: 18000, text: 'Next' }, { start_ms: 10000, end_ms: 12000, text: 'First' }];
  const h = harness({ segments, stored: '1' }); h.render();
  assert.equal(h.find('VideoPlayerFrame').props.startSeconds, 14.75);
  assert.equal(segments[0].text, 'Next');
  const route = harness({ stored: '1', initialIndex: 0 }); route.render();
  assert.equal(route.find('VideoPlayerFrame').props.startSeconds, 9.75);
});

test('an early replay tap queues sentence zero and starts its fallback only after actual playback', () => {
  const h = harness(); h.render(); h.render(); h.attachPlayer();
  const replay = h.find('TouchableOpacity', props => props.accessibilityLabel === 'videos.practice.replaySentence');
  assert.equal(replay.props.disabled, false);
  replay.props.onPress(); h.render();
  assert.equal(h.find('VideoPlayerFrame').props.play, true);
  assert.deepEqual(h.calls.seeks, []);
  assert.equal(h.timers.size, 0, 'Loading must not consume sentence duration');
  h.find('VideoPlayerFrame').props.onReady(); h.render();
  assert.deepEqual(h.calls.seeks, [9.75]);
  h.find('VideoPlayerFrame').props.onChangeState('paused'); h.render();
  assert.equal(h.find('VideoPlayerFrame').props.play, true, 'Initial pause event must not discard the queued play');
  h.find('VideoPlayerFrame').props.onChangeState('playing'); h.render();
  assert.equal(h.timers.size, 1);
  h.find('TouchableOpacity', props => props.accessibilityLabel === 'videos.practice.replaySentence').props.onPress(); h.render();
  h.find('VideoPlayerFrame').props.onChangeState('paused'); h.render();
  assert.equal(h.find('VideoPlayerFrame').props.play, true, 'Seek pause must not discard replay');
  h.find('VideoPlayerFrame').props.onChangeState('playing'); h.render();
  h.find('VideoPlayerFrame').props.onChangeState('buffering'); h.render();
  assert.equal(h.timers.size, 0);
  h.find('VideoPlayerFrame').props.onChangeState('playing'); h.render();
  h.fire(2850); h.render();
  assert.equal(h.find('VideoPlayerFrame').props.play, false);
});

test('starting the microphone cancels a queued video play before late player readiness', async () => {
  const h = harness(); h.render(); h.render(); h.attachPlayer();
  h.find('VideoPlayerFrame').props.onPlay(); h.render();
  await h.find('VideoRecordingHub').props.onRecordToggle(); h.render();
  h.find('VideoPlayerFrame').props.onReady(); h.render();
  assert.equal(h.find('VideoPlayerFrame').props.play, false);
  assert.deepEqual(h.calls.seeks, []);
  assert.equal(h.calls.record, 1);
});

test('player poster remains through API ready until playback begins', () => {
  const h = harness({ frame: true }); h.render();
  assert.ok(h.find('Image'));
  assert.equal(h.find('YoutubePlayer').props.initialPlayerParams.start, 9);
  h.find('YoutubePlayer').props.onReady(); h.render();
  assert.ok(h.find('Image'));
  assert.equal(h.find('ActivityIndicator'), undefined);
  h.find('TouchableOpacity').props.onPress();
  assert.equal(h.calls.play, 1);
  h.props.play = true; h.render();
  assert.ok(h.find('ActivityIndicator'));
  h.find('YoutubePlayer').props.onChangeState('playing'); h.render();
  assert.equal(h.find('Image'), undefined);
});

test('player load timeout offers retry and remounts without autoplay', () => {
  const h = harness({ frame: true }); h.render(); h.fire(20000); h.render();
  assert.equal(h.calls.reset, 1);
  assert.equal(h.find('YoutubePlayer'), undefined);
  h.find('TouchableOpacity').props.onPress(); h.render();
  assert.equal(h.find('YoutubePlayer').key, 1);
  assert.equal(h.find('YoutubePlayer').props.play, false);
});
