const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the real private topic row; native scrolling and HTTP completion are controlled.
function catalogHarness(fetchCards) {
  const cells = [], effects = [], cache = new Map(), requests = [];
  let cursor = 0, tree;
  const same = (a, b) => a && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial; return [cells[i], value => { cells[i] = typeof value === 'function' ? value(cells[i]) : value; }]; },
    useRef(value) { const i = cursor++; return cells[i] ??= { current: value }; },
    useMemo(fn, deps) { const i = cursor++; if (!same(cells[i]?.deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++, old = cells[i]; if (!same(old?.deps, deps)) { cells[i] = { deps, cleanup: old?.cleanup }; effects.push(() => { old?.cleanup?.(); cells[i].cleanup = fn(); }); } },
  };
  const queryClient = {
    getQueryData: key => cache.get(JSON.stringify(key)),
    setQueryData: (key, value) => cache.set(JSON.stringify(key), value),
  };
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'FlatList', 'ActivityIndicator', 'ScrollView', 'RefreshControl'].map(name => [name, name])),
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, 'react-i18next': { useTranslation: () => ({ t: key => key }) }, 'lucide-react-native': {},
    '@/services/Auth': { useAuth: () => ({ authToken: 'session' }) }, '@/utils/errors': { topicLabel: topic => topic },
    '@tanstack/react-query': { useQueryClient: () => queryClient },
    '@/components/ui/Skeleton': {}, '@/hooks/usePullToRefresh': { usePullToRefresh: () => ({ refreshing: false, onRefresh() {} }) },
    '@/components': { AppText: 'Text' },
    '@/components/ui/AppText': { AppText: 'Text' },
    '@/hooks/queries/useVideoQueries': {
      useVideoFeedQuery: () => ({ data: [{ topic: 'conversation', videos: props.initialVideos, video_ids: props.videoIds }], isLoading: false }),
      useViewedVideosQuery: () => ({ data: [] }),
      videoKeys: { topicVideos: (topic, level) => ['videos', topic, level] },
      fetchVideoCards: async (_, ids) => { requests.push([...ids]); return fetchCards ? fetchCards([...ids], requests.length) : ids.map(youtube_id => ({ youtube_id })); },
    },
  };
  const filename = path.resolve(__dirname, '../src/screens/tabs/VideosScreen.tsx');
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8') + '\nexport { TopicSectionRow };', {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, require: name => {
    if (!(name in mocks)) throw Error('Missing mock: ' + name);
    return mocks[name];
  } }, { filename });
  const props = {
    topic: 'conversation', level: 'A1', topicFilter: '', loadMoreTrigger: 0,
    videoIds: Array.from({ length: 10 }, (_, i) => String(i + 1)),
    initialVideos: Array.from({ length: 4 }, (_, i) => ({ youtube_id: String(i + 1) })),
    t: key => key, onSelectTopic() {}, onOpenVideo() {},
  };
  function find(type, node = tree) {
    if (!node || typeof node !== 'object') return undefined;
    if (Array.isArray(node)) return node.map(child => find(type, child)).find(Boolean);
    if (node.type === type) return node;
    return node.props?.children == null ? undefined : find(type, node.props.children);
  }
  return {
    props, requests, cache, find,
    render() { cursor = 0; tree = module.exports.TopicSectionRow(props); while (effects.length) effects.shift()(); },
    renderScreen() { cursor = 0; tree = module.exports.default({ navigation: {} }); while (effects.length) effects.shift()(); },
    row() { return find(module.exports.TopicSectionRow); },
    unmount() { cells.forEach(cell => cell?.cleanup?.()); },
  };
}

test('horizontal catalog loads subsequent four-card batches, deduplicates triggers and stops at the end', async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const h = catalogHarness(async (ids, count) => count === 1 ? pending : ids.map(youtube_id => ({ youtube_id })));
  h.render(); h.render();
  const load = h.find('FlatList').props.onEndReached;
  assert.equal(typeof load, 'function');
  const first = load(); await load(); h.render();
  assert.deepEqual(h.requests, [['5', '6', '7', '8']]);
  assert.ok(h.find('FlatList').props.ListFooterComponent);
  resolve(['4', '5', '6', '7', '8'].map(youtube_id => ({ youtube_id })));
  await first; h.render();
  assert.equal(h.find('FlatList').props.data.length, 8);
  await h.find('FlatList').props.onEndReached(); h.render();
  await h.find('FlatList').props.onEndReached();
  assert.deepEqual(h.requests, [['5', '6', '7', '8'], ['9', '10']]);
  assert.equal(h.find('FlatList').props.data.length, 10);
});

test('failed catalog batch remains retryable without skipping videos', async () => {
  const h = catalogHarness(async (ids, count) => {
    if (count === 1) throw Error('offline');
    return ids.map(youtube_id => ({ youtube_id }));
  });
  h.render(); h.render(); await h.find('FlatList').props.onEndReached(); h.render();
  assert.equal(h.find('FlatList').props.data.length, 4);
  const findRetry = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.map(findRetry).find(Boolean);
    if (node.props?.accessibilityLabel === 'common.retry') return node;
    return findRetry(node.props?.children);
  };
  await findRetry(h.find('View')).props.onPress(); h.render();
  assert.deepEqual(h.requests, [['5', '6', '7', '8'], ['5', '6', '7', '8']]);
  assert.equal(h.find('FlatList').props.data.length, 8);
});

test('successful catalog batch with unavailable cards advances by requested IDs', async () => {
  const h = catalogHarness(async (ids, count) => (count === 1 ? ids.slice(0, 1) : ids).map(youtube_id => ({ youtube_id })));
  h.render(); h.render(); await h.find('FlatList').props.onEndReached(); h.render();
  await h.find('FlatList').props.onEndReached();
  assert.deepEqual(h.requests, [['5', '6', '7', '8'], ['9', '10']]);
});

test('catalog grid keeps parent scrolling as its load trigger', async () => {
  const h = catalogHarness(); h.props.topicFilter = 'conversation'; h.render(); h.render();
  assert.equal(h.find('FlatList').props.onEndReached, undefined);
  h.props.loadMoreTrigger++; h.render();
  for (let i = 0; i < 10; i++) await Promise.resolve();
  h.render();
  assert.deepEqual(h.requests, [['5', '6', '7', '8']]);
  assert.equal(h.find('FlatList').props.data.length, 8);
});

test('short topic grid requests more without scrolling, stops filling once tall, and resumes near the bottom', () => {
  const h = catalogHarness(); h.renderScreen();
  let scroll = h.find('ScrollView');
  scroll.props.onLayout({ nativeEvent: { layout: { height: 900 } } });
  scroll.props.onContentSizeChange(400, 750);
  h.renderScreen();
  assert.equal(h.row().props.loadMoreTrigger, 0); // All topics does not auto-fill cards.
  h.row().props.onSelectTopic('conversation'); h.renderScreen(); h.renderScreen();
  assert.ok(h.row().props.loadMoreTrigger > 0); // Same content height on tab change still checked.
  let trigger = h.row().props.loadMoreTrigger;
  h.find('ScrollView').props.onContentSizeChange(400, 980); h.renderScreen();
  assert.ok(h.row().props.loadMoreTrigger > trigger); // Only 80px overflow is insufficient.
  trigger = h.row().props.loadMoreTrigger;
  h.find('ScrollView').props.onContentSizeChange(400, 1400); h.renderScreen();
  assert.equal(h.row().props.loadMoreTrigger, trigger);
  h.find('ScrollView').props.onScroll({ nativeEvent: { layoutMeasurement: { height: 900 }, contentSize: { height: 980 }, contentOffset: { y: 30 } } });
  h.renderScreen();
  assert.ok(h.row().props.loadMoreTrigger > trigger); // No former 100px/1200ms gate.
  trigger = h.row().props.loadMoreTrigger;
  h.find('ScrollView').props.onLayout({ nativeEvent: { layout: { height: 1500 } } }); h.renderScreen();
  assert.ok(h.row().props.loadMoreTrigger > trigger); // Larger viewport/rotation fills again.
});

test('grid layout triggers cannot duplicate a pending batch or automatically retry a failed batch', async () => {
  let reject;
  const h = catalogHarness(() => new Promise((_, fail) => { reject = fail; }));
  h.props.topicFilter = 'conversation'; h.render(); h.render();
  h.props.loadMoreTrigger++; h.render();
  h.props.loadMoreTrigger++; h.render();
  assert.equal(h.requests.length, 1);
  reject(Error('offline'));
  for (let i = 0; i < 10; i++) await Promise.resolve();
  h.render(); h.props.loadMoreTrigger++; h.render();
  assert.equal(h.requests.length, 1); // Spinner/error layout changes must not make a retry loop.
});

test('grid exhausts remaining IDs even for empty batches and then ignores further triggers', async () => {
  const h = catalogHarness(async () => []);
  h.props.topicFilter = 'conversation'; h.props.initialVideos = [];
  h.props.videoIds = ['1', '2', '3', '4', '5'];
  h.render(); h.render();
  for (let n = 0; n < 3; n++) {
    h.props.loadMoreTrigger++; h.render();
    for (let i = 0; i < 10; i++) await Promise.resolve();
    h.render();
  }
  assert.deepEqual(h.requests, [['1', '2', '3', '4'], ['5']]);
  assert.equal(h.find('Text').props.children, 'videos.catalog.empty');
});

test('late catalog responses cannot append cards from the previous level', async () => {
  let resolve;
  const h = catalogHarness(() => new Promise(done => { resolve = done; }));
  h.render(); h.render(); const pending = h.find('FlatList').props.onEndReached();
  h.props.level = 'B2';
  h.props.initialVideos = [{ youtube_id: 'b2' }]; h.props.videoIds = ['b2'];
  h.render(); h.render();
  resolve([{ youtube_id: '5' }]); await pending; h.render();
  assert.equal(h.find('FlatList').props.data.length, 1);
  assert.equal(h.find('FlatList').props.data[0].youtube_id, 'b2');
  assert.equal(h.cache.size, 0);
});

function harness({ frame = false, stored, initialIndex, segments, playedCount = 0 } = {}) {
  const cells = [], effects = [], timers = new Map(), intervals = new Map();
  let cursor = 0, nextTimer = 0;
  const calls = { seeks: [], navigation: [], recordingEnabled: [], clear: 0, record: 0, view: 0, reset: 0, ready: 0, play: 0 };
  const focus = { current: true };
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
    '@react-navigation/native': { useIsFocused: () => focus.current },
    'react-i18next': { useTranslation: () => translation },
    '@/services/Auth': { useAuth: () => auth },
    '@/hooks/usePronunciationCheck': { usePronunciationCheck: options => { calls.recordingEnabled.push(options.enabled); return recording; } },
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
    '@/core/theme': { colors: { practiceHeader: '#1a5f91' } },
    './YoutubePlayer': { __esModule: true, default: 'YoutubePlayer' },
    '@/components': { AppText: 'Text' },
  };
  for (const name of ['VideoPlayerFrame', 'IPAChecking', 'ScoreWords', 'VideoRecordingHub']) mocks['@/components/practice/' + name] = { __esModule: true, default: name };
  for (const name of ['DialectToggle', 'UpgradeProModal', 'AppText']) mocks['@/components/ui/' + name] = { __esModule: true, default: 'Text', AppText: 'Text' };
  const file = path.resolve(__dirname, '..', frame ? 'src/components/practice/VideoPlayerFrame.tsx' : 'src/screens/practice/VideoPracticeScreen.tsx');
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module, exports: module.exports, console, Date,
    setTimeout(fn, ms) { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; }, clearTimeout: id => timers.delete(id),
    setInterval(fn, ms) { const id = ++nextTimer; intervals.set(id, { fn, ms }); return id; }, clearInterval: id => intervals.delete(id),
    require(name) { if (!(name in mocks)) throw Error('Missing mock ' + name); return mocks[name]; },
  }, { filename: file });
  const props = frame ? { videoId: 'test-video', startSeconds: 9.75, play: false, onPlay: () => calls.play++, onReset: () => calls.reset++, onReady: () => calls.ready++, onChangeState: noop } : { route: { params: { youtubeId: 'test-video', initialIndex } }, navigation: { navigate: (...args) => calls.navigation.push(args) } };
  let tree;
  const find = (type, predicate = () => true, node = tree) => {
    if (!node) return undefined;
    if (Array.isArray(node)) { for (const child of node) { const result = find(type, predicate, child); if (result) return result; } return undefined; }
    if (node.type === type && predicate(node.props)) return node;
    return find(type, predicate, node.props?.children ?? null);
  };
  return {
    calls, data, props, timers, recording, focus, find,
    render() { cursor = 0; tree = module.exports.default(props, { current: null }); while (effects.length) effects.shift()(); return tree; },
    attachPlayer() { find('VideoPlayerFrame').props.ref.current = { seekTo: seconds => calls.seeks.push(seconds), getCurrentTime: async () => 10 }; },
    fire(ms) { for (const [id, timer] of [...timers]) if (timer.ms === ms) { timers.delete(id); timer.fn(); } },
  };
}

test('learning a failed video sound opens the shared IPA route and pauses video while it is away', () => {
  const h = harness(); h.data.dialect = 'us'; h.render(); h.render(); h.attachPlayer();
  h.find('VideoPlayerFrame').props.onPlay(); h.render();
  h.find('VideoRecordingHub').props.onPracticePhoneme('θ');
  assert.equal(h.calls.navigation[0][0], 'PhonemePractice');
  assert.equal(h.calls.navigation[0][1].phoneme, 'θ');
  assert.equal(h.calls.navigation[0][1].dialect, 'us');
  assert.equal(h.find('IPAChecking'), undefined, 'Use the full route with guidance, not a separate modal');
  h.focus.current = false; h.render(); h.render();
  assert.equal(h.calls.recordingEnabled.at(-1), false);
  assert.equal(h.find('VideoPlayerFrame').props.play, false);
  h.focus.current = true; h.render(); h.render();
  assert.equal(h.calls.recordingEnabled.at(-1), true);
  assert.equal(h.find('VideoPlayerFrame').props.play, false, 'Returning must not autoplay');
});

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
