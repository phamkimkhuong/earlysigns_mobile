const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function drain() { for (let i = 0; i < 60; i++) await Promise.resolve(); }

// Runs production TypeScript with controlled native promises and lifecycle events.
// This verifies ordering/cancellation; it does not simulate Android MediaRecorder internals.
function harness(options = {}) {
  const cache = {}, timers = new Map(), listeners = new Set(), cells = [], effects = [];
  const calls = { prepare: 0, record: 0, stop: 0, release: 0, permission: 0, upload: 0, usage: 0, progress: 0, players: 0, settings: 0 };
  const alerts = [];
  const traces = [];
  const recorders = [], modes = [], parts = [];
  const nativeRuntime = { owner: null, queue: Promise.resolve() };
  let cursor = 0, timerId = 0, requestSignal;
  const app = {
    currentState: 'active',
    addEventListener(type, callback) {
      const subscription = { type, callback };
      listeners.add(subscription);
      return { remove() { listeners.delete(subscription); } };
    },
  };
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial;
      return [cells[i], value => { cells[i] = typeof value === 'function' ? value(cells[i]) : value; }];
    },
    useRef(initial) { const i = cursor++; return cells[i] ??= { current: initial }; },
    useCallback(fn, deps) {
      const i = cursor++, prev = cells[i];
      if (!prev || deps.some((d, j) => !Object.is(d, prev.deps[j]))) cells[i] = { deps, fn };
      return cells[i].fn;
    },
    useEffect(fn, deps) {
      const i = cursor++, prev = cells[i];
      if (!prev || deps.some((d, j) => !Object.is(d, prev.deps[j]))) {
        cells[i] = { deps, cleanup: prev?.cleanup };
        effects.push(() => { prev?.cleanup?.(); cells[i].cleanup = fn(); });
      }
    },
  };
  class Recorder {
    constructor(config) { this.config = config; this.released = false; this.recording = false; recorders.push(this); }
    check() { assert.equal(this.released, false, 'Native object used after release'); }
    get uri() { this.check(); return 'file:///speech.' + (options.platform === 'ios' ? 'wav' : 'm4a'); }
    async prepareToRecordAsync() { this.check(); calls.prepare++; await options.prepare?.(calls.prepare); this.check(); }
    record() { this.check(); calls.record++; this.recording = options.nativeRecordStarts !== false; }
    async stop() { this.check(); calls.stop++; await options.stop?.(); this.check(); this.recording = false; }
    release() { this.check(); calls.release++; this.released = true; this.recording = false; }
    addListener(_, fn) { this.listener = fn; return { remove: () => { this.listener = null; } }; }
    getStatus() { this.check(); return { isRecording: this.recording, metering: -10 }; }
  }
  const t = (key, fallback) => fallback || key;
  const fetchCheck = async (_, init) => {
    calls.upload++; requestSignal = init.signal;
    const data = await (options.response?.(init) || Promise.resolve({ accuracy: 0.8 }));
    return { ok: !options.httpError, status: options.httpError || 200, json: async () => data };
  };
  const mocks = {
    react,
    'react-native': { AppState: app, Platform: { OS: options.platform || 'android' }, Linking: { openSettings: async () => { calls.settings++; } } },
    'expo-audio': {
      AudioModule: { AudioRecorder: Recorder }, AudioQuality: { HIGH: 1 }, IOSOutputFormat: { LINEARPCM: 'lpcm' },
      getRecordingPermissionsAsync: options.permission || (async () => ({ granted: true })),
      requestRecordingPermissionsAsync: async () => { calls.permission++; return options.requestPermission?.() || { granted: true }; },
      setAudioModeAsync: async mode => { modes.push(mode); await options.mode?.(mode); },
      createAudioPlayer: () => { calls.players++; return { pause() {}, remove() {}, release() {}, play() {}, addListener: () => ({ remove() {} }) }; },
    },
    'react-i18next': { useTranslation: () => ({ t }) },
    '@/core/config': { API_ENDPOINTS: { CHECK: '/check' } },
    '@/services/usageLimits': { isPronunciationQuotaExhausted: () => !!options.quota },
    '@/utils/errors': { parseErrorDetail: detail => detail || {} },
    '@/utils/formDataFile': { appendLocalFile: async (_, field, uri, name, type) => { parts.push({ field, uri, name, type }); } },
    '@/api': { progressApi: { logSoundProgress: async () => { calls.progress++; return {}; } } },
    '@/store/useBillingStore': { useBillingStore: { getState: () => ({ usage: null, setUsage() { calls.usage++; } }) } },
    '@/core/httpClient': { AppHttpError: class extends Error {}, httpClient: {} },
    '@/utils/customAlert': { customAlert: { alert: (...args) => alerts.push(args) } },
    '@/core/logger': { logger: { debug: (...args) => traces.push(args) } },
  };
  function load(file) {
    if (cache[file]) return cache[file];
    const filename = path.resolve(__dirname, '..', file);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(source, {
      module, exports: module.exports, FormData, AbortController, console: { warn() {} },
      __earlySignsRecording: nativeRuntime,
      setTimeout(fn, ms) { timers.set(++timerId, { fn, ms }); return timerId; }, clearTimeout(id) { timers.delete(id); },
      setInterval(fn, ms) { timers.set(++timerId, { fn, ms }); return timerId; }, clearInterval(id) { timers.delete(id); },
      require(name) { if (name in mocks) return mocks[name]; return load('src/' + name.slice(2) + '.ts'); },
    }, { filename });
    return cache[file] = module.exports;
  }
  const { RecordingSession } = load('src/services/recordingSession.ts');
  const { usePronunciationCheck } = load('src/hooks/usePronunciationCheck.ts');
  const hookOptions = { authFetch: fetchCheck, ...options.hookOptions };
  function render() {
    cursor = 0;
    const audio = usePronunciationCheck(hookOptions);
    while (effects.length) effects.shift()();
    return audio;
  }
  return {
    render, hookOptions, calls, recorders, modes, parts, RecordingSession, load, mocks, alerts, traces,
    emit(state) { app.currentState = state; [...listeners].filter(s => s.type === 'change').forEach(s => s.callback(state)); },
    emitFocus(focused) { [...listeners].filter(s => s.type === (focused ? 'focus' : 'blur')).forEach(s => s.callback()); },
    unmount() { cells.forEach(cell => { cell?.cleanup?.(); if (cell?.cleanup) cell.cleanup = null; }); },
    fire(ms) { for (const [id, timer] of [...timers]) if (timer.ms === ms) { timers.delete(id); timer.fn(); } },
    get signal() { return requestSignal; },
    reloadRecorderModule() { delete cache['src/services/recordingSession.ts']; return load('src/services/recordingSession.ts'); },
  };
}

test('clearing an idle sentence never shows microphone loading or delays the next recording', async () => {
  const h = harness();
  h.render();
  for (let i = 0; i < 3; i++) {
    h.render().clearResult();
    assert.equal(h.render().isStarting, false, 'Replay/previous/next must not show microphone loading');
  }
  assert.equal(h.calls.prepare, 0);
  assert.equal(h.calls.permission, 0);
  assert.equal(h.traces.some(([, event, details]) => event === 'phase' && details.phase === 'stopping'), false);
  await h.render().startRecording({ text: 'Next sentence' });
  assert.equal(h.render().isRecording, true);
  assert.equal(h.calls.record, 1);
  h.unmount(); await drain();
});

test('clearing a completed recording releases it without loading or cancelling an immediate new start', async () => {
  const h = harness();
  await h.render().startRecording({ text: 'Previous sentence' });
  await h.render().stopRecording({ check: false });
  const previous = h.recorders[0];
  h.render().clearResult();
  assert.equal(h.render().isStarting, false);
  assert.equal(previous.released, true);
  await h.render().startRecording({ text: 'Next sentence' });
  assert.equal(h.render().isRecording, true);
  assert.equal(h.recorders.length, 2);
  assert.equal(h.recorders[1].released, false);
  assert.equal(h.calls.stop, 1, 'Idle cleanup must not stop the new recording');
  h.unmount(); await drain();
});

test('first tap locks before permission; grant survives dialog background and starts when foreground returns', async () => {
  const grant = deferred();
  const h = harness({ permission: async () => ({ granted: false }), requestPermission: () => grant.promise });
  const start = h.render().startRecording({ text: 'First sentence' });
  assert.equal(h.render().isStarting, true);
  await h.render().startRecording({ text: 'Duplicate tap' });
  await drain();
  h.emit('background');
  grant.resolve({ granted: true });
  await drain();
  assert.equal(h.calls.prepare, 0);
  h.emit('active');
  await start;
  assert.equal(h.calls.permission, 1);
  assert.equal(h.calls.record, 1);
  assert.equal(h.render().isRecording, true);
});

test('denied permission and permission API failures unlock retry without reopening the app', async () => {
  let granted = false;
  const h = harness({ permission: async () => ({ granted }), requestPermission: async () => ({ granted }) });
  await h.render().startRecording({ text: 'Hello' });
  assert.equal(h.render().micError.type, 'denied');
  assert.equal(h.render().isStarting, false);
  granted = true;
  await h.render().startRecording({ text: 'Hello' });
  assert.equal(h.render().isRecording, true);
  const failed = harness({ permission: async () => { throw Error('permission API failed'); } });
  await failed.render().startRecording({ text: 'Hello' });
  assert.match(failed.render().micError.raw, /permission API failed/);
  assert.equal(failed.render().isStarting, false);
});

test('Android blocked permission confirms the system result once, clears yellow state and shows an Open Settings alert', async () => {
  const h = harness({
    permission: async () => ({ granted: false, canAskAgain: false }),
    requestPermission: async () => ({ granted: false, canAskAgain: false }),
  });
  await h.render().startRecording({ text: 'Hello' });
  const state = h.render();
  assert.equal(state.isStarting, false);
  assert.equal(state.isRecording, false);
  assert.equal(state.micError.type, 'denied');
  assert.equal(state.micError.canAskAgain, false);
  assert.equal(state.error, '', 'Permission alert must not also populate inline error text');
  assert.equal(h.calls.permission, 1);
  assert.equal(h.calls.prepare, 0);
  assert.equal(h.modes.length, 0);
  assert.equal(h.alerts.length, 1);
  const buttons = h.alerts[0][2];
  assert.equal(buttons.length, 2);
  assert.equal(buttons[1].text, 'sentence.micError.openSettings');
  buttons[1].onPress(); await drain();
  assert.equal(h.calls.settings, 1);
});

test('a second system denial becoming blocked shows settings; an ordinary denial invites a retry', async () => {
  for (const canAskAgain of [true, false]) {
    const h = harness({ permission: async () => ({ granted: false, canAskAgain: true }), requestPermission: async () => ({ granted: false, canAskAgain }) });
    await h.render().startRecording({ text: 'Hello' });
    assert.equal(h.calls.permission, 1);
    assert.equal(h.render().isStarting, false);
    assert.equal(h.render().micError.canAskAgain, canAskAgain);
    assert.equal(h.alerts[0][2].length, canAskAgain ? 1 : 2);
  }
});

test('permission denied does not wait behind a pending playback-mode change', async () => {
  const mode = deferred();
  const h = harness({
    permission: async () => ({ granted: false, canAskAgain: false }),
    requestPermission: async () => ({ granted: false, canAskAgain: false }),
    mode: () => mode.promise,
  });
  const { prepareAudioPlayback } = h.load('src/services/recordingSession.ts');
  const playback = prepareAudioPlayback(); await drain();
  let finished = false;
  const start = h.render().startRecording({ text: 'Hello' }).then(() => { finished = true; });
  await drain();
  assert.equal(finished, true);
  assert.equal(h.render().isStarting, false);
  assert.equal(h.alerts.length, 1);
  mode.resolve(); await playback; await start;
});

test('granting microphone in Settings allows the next tap without a restart or another permission prompt', async () => {
  let granted = false;
  const h = harness({
    permission: async () => ({ granted, canAskAgain: false }),
    requestPermission: async () => ({ granted, canAskAgain: false }),
  });
  await h.render().startRecording({ text: 'Hello' });
  assert.equal(h.render().micError.canAskAgain, false);
  assert.equal(h.calls.permission, 1);
  h.emit('background'); granted = true; h.emit('active');
  await h.render().startRecording({ text: 'Hello' });
  assert.equal(h.render().isRecording, true);
  assert.equal(h.render().micError, null);
  assert.equal(h.calls.permission, 1);
  assert.equal(h.calls.record, 1);
});

test('Android Ask every time overrides a stale blocked query and starts after a foreground grant', async () => {
  const grant = deferred();
  const h = harness({
    permission: async () => ({ granted: false, canAskAgain: false }),
    requestPermission: () => grant.promise,
  });
  const start = h.render().startRecording({ text: 'Hello' });
  await drain();
  assert.equal(h.calls.permission, 1);
  assert.equal(h.alerts.length, 0, 'Do not show a cached-denial alert before requesting');
  await h.render().startRecording({ text: 'Duplicate tap' });
  assert.equal(h.calls.permission, 1);
  h.emit('background');
  grant.resolve({ granted: true, canAskAgain: true });
  await drain();
  assert.equal(h.calls.prepare, 0);
  h.emit('active');
  await start;
  assert.equal(h.render().isRecording, true);
  assert.equal(h.render().micError, null);
  assert.equal(h.render().error, '');
  assert.equal(h.calls.record, 1);
  assert.equal(h.alerts.length, 0);
});

for (const platform of ['android', 'ios']) test(platform + ' permission grant survives delayed background during audio-mode setup', async () => {
  const mode = deferred();
  const h = harness({
    platform,
    permission: async () => ({ granted: false, canAskAgain: true }),
    requestPermission: async () => ({ granted: true, canAskAgain: true }),
    mode: options => options.allowsRecording ? mode.promise : Promise.resolve(),
  });
  const start = h.render().startRecording({ text: 'Hello' });
  await drain();
  assert.equal(h.modes.length, 1);
  h.emit(platform === 'ios' ? 'inactive' : 'background');
  mode.resolve(); await drain();
  assert.equal(h.calls.record, 0, 'Never record while the permission Activity has not resumed');
  h.emit('active'); await start;
  assert.equal(h.calls.permission, 1);
  assert.equal(h.calls.record, 1, 'Do not silently cancel an already granted attempt');
  assert.equal(h.render().isRecording, true);
  assert.equal(h.alerts.length, 0);
});

test('Android one-time grant survives delayed background during native prepare and waits before record', async () => {
  const prepare = deferred();
  const h = harness({
    permission: async () => ({ granted: false, canAskAgain: true }),
    requestPermission: async () => ({ granted: true, canAskAgain: true }),
    prepare: () => prepare.promise,
  });
  const start = h.render().startRecording({ text: 'Hello' });
  await drain();
  assert.equal(h.calls.prepare, 1);
  h.emit('background'); prepare.resolve(); await drain();
  assert.equal(h.calls.record, 0);
  assert.equal(h.calls.release, 0);
  h.emit('active'); await start;
  assert.equal(h.calls.record, 1);
  assert.equal(h.render().isRecording, true);
  h.emit('background'); await drain();
  assert.equal(h.render().isRecording, false, 'Background must still cancel a running recording');
  assert.equal(h.calls.release, 1);
});

test('Android one-time grant waits for window focus even when AppState remains active', async () => {
  const grant = deferred();
  const h = harness({ permission: async () => ({ granted: false }), requestPermission: () => grant.promise });
  const start = h.render().startRecording({ text: 'Hello' });
  await drain();
  h.emitFocus(false); grant.resolve({ granted: true }); await drain();
  assert.equal(h.calls.prepare, 0);
  assert.equal(h.render().isStarting, true);
  h.emitFocus(true); await start;
  assert.equal(h.calls.record, 1);
  assert.equal(h.render().isRecording, true);
});

test('Android focus lost during prepare must return before native record is called', async () => {
  const prepare = deferred();
  const h = harness({
    permission: async () => ({ granted: false }),
    requestPermission: async () => ({ granted: true }),
    prepare: () => prepare.promise,
  });
  const start = h.render().startRecording({ text: 'Hello' }); await drain();
  assert.equal(h.calls.prepare, 1);
  h.emitFocus(false); prepare.resolve(); await drain();
  assert.equal(h.calls.record, 0);
  h.emitFocus(true); await start;
  assert.equal(h.calls.record, 1);
});

test('permission handoff times out visibly without automatic re-request and unlocks the next tap', async () => {
  const h = harness({ permission: async () => ({ granted: false }), requestPermission: async () => ({ granted: true }) });
  h.render(); h.emitFocus(false);
  const start = h.render().startRecording({ text: 'Hello' }); await drain();
  h.fire(5000); await start;
  assert.equal(h.calls.permission, 1);
  assert.equal(h.calls.record, 0);
  assert.equal(h.render().isStarting, false);
  assert.equal(h.render().micError.type, 'generic');
  assert.match(h.render().micError.raw, /foreground/);
  assert.ok(h.render().error);
  assert.equal(h.alerts.length, 0, 'Foreground timeout is not a denied-permission alert');
  h.emitFocus(true);
  await h.render().startRecording({ text: 'Hello' });
  assert.equal(h.calls.permission, 2);
  assert.equal(h.render().isRecording, true);
});

for (const action of ['cancel', 'unmount']) test(action + ' while awaiting permission window focus prevents late recording', async () => {
  const h = harness({ permission: async () => ({ granted: false }), requestPermission: async () => ({ granted: true }) });
  h.render(); h.emitFocus(false);
  const start = h.render().startRecording({ text: 'Hello' }); await drain();
  if (action === 'cancel') await h.render().cancelRecording();
  else h.unmount();
  await start; h.emitFocus(true); await drain();
  assert.equal(h.calls.record, 0);
  assert.equal(h.calls.prepare, 0);
  assert.equal(h.calls.permission, 1);
  assert.ok(h.traces.some(([, event]) => event === 'cancel'));
  if (action === 'cancel') assert.equal(h.render().isStarting, false);
});

test('a native record no-op reports an error instead of displaying recording or starting its timers', async () => {
  const h = harness({ nativeRecordStarts: false });
  await h.render().startRecording({ text: 'Hello' });
  assert.equal(h.calls.record, 1);
  assert.equal(h.render().isRecording, false);
  assert.equal(h.render().isStarting, false);
  assert.match(h.render().micError.raw, /did not enter recording state/);
  assert.equal(h.calls.release, 1);
  h.fire(25000); await drain();
  assert.equal(h.calls.upload, 0);
});

test('switching Android Settings from blocked to Ask every time requests again on the next tap', async () => {
  let result = { granted: false, canAskAgain: false };
  const h = harness({
    permission: async () => ({ granted: false, canAskAgain: false }),
    requestPermission: async () => result,
  });
  await h.render().startRecording({ text: 'Hello' });
  assert.equal(h.alerts.length, 1);
  assert.equal(h.alerts[0][2].length, 2);
  h.emit('background');
  result = { granted: false, canAskAgain: true };
  h.emit('active');
  await h.render().startRecording({ text: 'Hello' });
  assert.equal(h.calls.permission, 2, 'A new tap asks again despite the stale query');
  assert.equal(h.alerts.length, 2, 'One alert per actual denial, without automatic re-asks');
  assert.equal(h.alerts[1][2].length, 1, 'Use the fresh result for retry versus Settings');
  assert.equal(h.render().micError.canAskAgain, true);
  assert.equal(h.render().isStarting, false);
  assert.equal(h.render().error, '');
  result = { granted: true, canAskAgain: true };
  await h.render().startRecording({ text: 'Hello' });
  assert.equal(h.calls.permission, 3);
  assert.equal(h.render().isRecording, true);
  assert.equal(h.render().micError, null);
  assert.equal(h.alerts.length, 2);
});

test('iOS blocked permission still skips the system request and shows only a Settings alert', async () => {
  const h = harness({ platform: 'ios', permission: async () => ({ granted: false, canAskAgain: false }) });
  await h.render().startRecording({ text: 'Hello' });
  assert.equal(h.calls.permission, 0);
  assert.equal(h.calls.prepare, 0);
  assert.equal(h.render().isStarting, false);
  assert.equal(h.render().isRecording, false);
  assert.equal(h.render().micError.canAskAgain, false);
  assert.equal(h.render().error, '');
  assert.equal(h.alerts.length, 1);
  assert.equal(h.alerts[0][2].length, 2);
});

test('permission denials use customAlert without a duplicate inline card or error text', () => {
  const h = harness();
  const native = h.mocks['react-native'];
  Object.assign(native, { View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity' });
  const jsx = (type, props) => ({ type, props });
  h.mocks['react/jsx-runtime'] = { jsx, jsxs: jsx };
  h.mocks['lucide-react-native'] = { AlertCircle: 'AlertCircle' };
  const { default: Card } = h.load('src/components/practice/MicErrorCard.tsx');
  for (const canAskAgain of [false, true]) {
    assert.equal(Card({ micError: { type: 'denied', raw: 'denied', canAskAgain }, error: 'Legacy permission error' }), null);
  }
  assert.ok(Card({ micError: { type: 'notFound', raw: 'No microphone' } }));
  assert.ok(Card({ error: 'Check failed' }));
});

for (const action of ['cancel', 'unmount', 'background']) test(action + ' during prepare never calls record or touches a released object', async () => {
  const prepare = deferred();
  const h = harness({ prepare: () => prepare.promise });
  const start = h.render().startRecording({ text: 'Hello' });
  await drain();
  assert.equal(h.calls.prepare, 1);
  let cancel;
  if (action === 'cancel') cancel = h.render().cancelRecording();
  if (action === 'unmount') h.unmount();
  if (action === 'background') h.emit('background');
  assert.equal(h.calls.release, 0, 'Prepare must finish before release');
  prepare.resolve();
  await start; await cancel; await drain();
  assert.equal(h.calls.record, 0);
  assert.equal(h.calls.stop, 1);
  assert.equal(h.calls.release, 1);
  if (action !== 'unmount') assert.equal(h.render().isStarting, false);
});

test('two stop taps and the max-duration timer submit one check', async () => {
  const stop = deferred();
  const h = harness({ stop: () => stop.promise });
  await h.render().startRecording({ text: 'Hello' });
  const first = h.render().stopRecording();
  assert.equal(h.render().checking, true);
  await h.render().stopRecording();
  h.fire(25000);
  stop.resolve(); await first;
  assert.equal(h.calls.stop, 1);
  assert.equal(h.calls.upload, 1);
  assert.equal(h.render().checking, false);
});

test('max duration stops and checks without a screen timer', async () => {
  const h = harness();
  await h.render().startRecording({ text: 'Hello' });
  h.fire(25000); await drain();
  assert.equal(h.calls.stop, 1);
  assert.equal(h.calls.upload, 1);
});

for (const action of ['clear', 'background', 'blur', 'unmount']) test(action + ' aborts upload and discards a late response, usage, and progress', async () => {
  const response = deferred();
  const h = harness({ response: () => response.promise });
  await h.render().startRecording({ text: 'Old sentence' });
  const stop = h.render().stopRecording(); await drain();
  assert.equal(h.calls.upload, 1);
  if (action === 'clear') h.render().clearResult();
  if (action === 'background') h.emit('background');
  if (action === 'blur') { h.hookOptions.enabled = false; h.render(); }
  if (action === 'unmount') h.unmount();
  assert.equal(h.signal.aborted, true);
  response.resolve({ accuracy: 0.9, usage: {}, char_alignment: [{}] });
  await stop; await drain();
  assert.equal(h.calls.usage, 0);
  assert.equal(h.calls.progress, 0);
  if (action !== 'unmount') { assert.equal(h.render().result, null); assert.equal(h.render().checking, false); }
});

test('native errors reset state and retry creates a healthy recorder', async () => {
  const h = harness();
  await h.render().startRecording({ text: 'Hello' });
  h.recorders[0].listener({ hasError: true, error: 'media server died' });
  await drain();
  assert.equal(h.render().isRecording, false);
  assert.match(h.render().micError.raw, /media server died/);
  await h.render().startRecording({ text: 'Hello again' });
  assert.equal(h.calls.record, 2);
  assert.equal(h.recorders.length, 2);
});

test('normal stop reuses one recorder; final disposal releases it once', async () => {
  const h = harness();
  for (let i = 0; i < 3; i++) {
    await h.render().startRecording({ text: 'Hello' });
    await h.render().stopRecording({ check: false });
  }
  assert.equal(h.recorders.length, 1);
  h.unmount(); await drain();
  assert.equal(h.calls.release, 1);
});

test('only one screen owns microphone and old idle cleanup cannot reset the new audio mode', async () => {
  const h = harness(), errors = [];
  const a = new h.RecordingSession(() => {}, e => errors.push(e), () => {});
  const b = new h.RecordingSession(() => {}, e => errors.push(e), () => {});
  assert.equal(await a.start(), true);
  assert.equal(await b.start(), false);
  assert.equal(errors.length, 1);
  await a.cancel();
  assert.equal(await b.start(), true);
  const count = h.modes.length;
  await a.cancel();
  assert.equal(h.modes.length, count);
  assert.equal(b.phase, 'recording');
  a.dispose(); b.dispose(); await drain();
});

test('module refresh preserves microphone ownership until old pending cleanup finishes', async () => {
  const stop = deferred();
  const h = harness({ stop: () => stop.promise });
  const old = new h.RecordingSession(() => {}, () => {}, () => {});
  assert.equal(await old.start(), true);
  old.dispose(); await drain();
  const { RecordingSession: Refreshed } = h.reloadRecorderModule();
  const next = new Refreshed(() => {}, () => {}, () => {});
  assert.equal(await next.start(), false);
  stop.resolve(); await drain();
  assert.equal(await next.start(), true);
  assert.equal(h.modes.at(-1).allowsRecording, true);
  next.dispose(); await drain();
});

test('Android sends AAC as m4a/audio-mp4 and iOS sends PCM as wav/audio-wav', async () => {
  for (const [platform, extension, mime] of [['android', '.m4a', 'audio/mp4'], ['ios', '.wav', 'audio/wav']]) {
    const h = harness({ platform });
    await h.render().startRecording({ text: 'Hello' });
    await h.render().stopRecording();
    assert.equal(h.recorders[0].config.extension, extension);
    assert.equal(h.parts[0].type, mime);
    assert.equal(h.parts[0].name, 'speech' + extension);
  }
});

test('quota blocks practice before requesting permission; screening remains exempt and does not count usage', async () => {
  let limits = 0;
  const h = harness({ quota: true, hookOptions: { onDailyLimitReached() { limits++; } } });
  await h.render().startRecording({ text: 'Hello' });
  assert.equal(limits, 1); assert.equal(h.calls.prepare, 0);
  let form;
  const screening = harness({ quota: true, hookOptions: { isScreening: true }, response: init => { form = init.body; return { accuracy: 0 }; } });
  await screening.render().startRecording({ text: 'Hello' });
  await screening.render().stopRecording();
  assert.equal(form.get('count_usage'), 'false');
  assert.equal(form.get('is_screening'), 'true');
  assert.equal(screening.render().result.accuracy, 0);
});

test('failed upload is not automatically retried with another counted request', async () => {
  const h = harness({ response: async () => { throw new TypeError('Network request failed'); } });
  await h.render().startRecording({ text: 'Hello' });
  await h.render().stopRecording();
  assert.equal(h.calls.upload, 1);
  assert.equal(h.render().checking, false);
  assert.ok(h.render().error);
});

test('delayed completion for an older file does not cancel the current recording', async () => {
  const h = harness();
  await h.render().startRecording({ text: 'Hello' });
  h.recorders[0].listener({ isFinished: true, hasError: false, url: 'file:///older.m4a' });
  await drain();
  assert.equal(h.render().isRecording, true);
});

test('stop and prepare failures allow a fresh recorder on the next tap', async () => {
  let broken = true;
  const h = harness({ prepare: async () => { if (broken) throw Error('MediaRecorder prepare failed'); } });
  await h.render().startRecording({ text: 'Hello' });
  assert.equal(h.calls.release, 1);
  broken = false;
  await h.render().startRecording({ text: 'Hello again' });
  assert.equal(h.render().isRecording, true);
  const stop = harness({ stop: async () => { throw Error('MediaRecorder stop failed'); } });
  await stop.render().startRecording({ text: 'Hello' });
  await stop.render().stopRecording();
  assert.equal(stop.calls.upload, 0);
  assert.equal(stop.render().isStarting, false);
  assert.match(stop.render().micError.raw, /stop failed/);
});

test('cancel while permission is pending cannot request a second overlapping dialog', async () => {
  const permission = deferred();
  const h = harness({ permission: async () => ({ granted: false }), requestPermission: () => permission.promise });
  const start = h.render().startRecording({ text: 'Hello' });
  await drain();
  await h.render().cancelRecording();
  assert.equal(h.render().isStarting, true);
  await h.render().startRecording({ text: 'Duplicate' });
  assert.equal(h.calls.permission, 1);
  permission.resolve({ granted: true }); await start;
  assert.equal(h.calls.record, 0);
  assert.equal(h.render().isStarting, false);
});

test('releasing a manually owned player always releases native resources even if pause fails', () => {
  const h = harness();
  const { releaseAudioPlayer } = h.load('src/utils/audioPlayer.ts');
  const calls = [];
  releaseAudioPlayer({ pause() { calls.push('pause'); throw Error('Already stopped'); }, removeAllListeners() { calls.push('listeners'); }, remove() { calls.push('remove'); }, release() { calls.push('release'); } });
  assert.deepEqual(calls, ['pause', 'listeners', 'remove', 'release']);
});

test('a pending replay mode change finishes before preparing a new recording, and never creates a stale player', async () => {
  const mode = deferred();
  const h = harness({ mode: options => options.allowsRecording === false ? mode.promise : Promise.resolve() });
  await h.render().checkPronunciation('file:///speech.m4a', { text: 'Hello' });
  const replay = h.render().replayRecording(); await drain();
  const start = h.render().startRecording({ text: 'Next attempt' }); await drain();
  assert.equal(h.calls.prepare, 0);
  mode.resolve(); await replay; await start;
  assert.equal(h.calls.players, 0);
  assert.equal(h.calls.record, 1);
  assert.equal(h.modes.at(-1).allowsRecording, true);
});

for (const alreadyAborted of [false, true]) test('shared HTTP native upload forwards cancellation and removes the caller listener: pre-aborted=' + alreadyAborted, async () => {
  const h = harness();
  const controller = new AbortController();
  let incomingSignal;
  let removes = 0;
  const remove = controller.signal.removeEventListener.bind(controller.signal);
  controller.signal.removeEventListener = (...args) => { removes++; remove(...args); };
  if (alreadyAborted) controller.abort();
  Object.assign(h.mocks, {
    './config': { API_BASE: 'https://example.test', MOBILE_APP_CLIENT: 'test' },
    '@/store/useAuthStore': { useAuthStore: { getState: () => ({ token: '', deviceId: '' }) } },
    '@/services/storage': { getItem: () => null },
    './errorReporter': { reportApiError() {} },
    './logger': { logger: { httpReq() {}, httpRes() {}, httpErr() {} } },
    '@/utils/nativeFormDataFetch': { xhrFormDataFetch: async (_, init) => {
      incomingSignal = init.signal;
      await new Promise((resolve, reject) => {
        const fail = () => reject(Object.assign(Error('aborted'), { name: 'AbortError' }));
        if (incomingSignal.aborted) fail();
        else incomingSignal.addEventListener('abort', fail, { once: true });
      });
    } },
  });
  const { httpClient } = h.load('src/core/httpClient.ts');
  const upload = httpClient.upload('/check', new FormData(), { signal: controller.signal });
  assert.ok(incomingSignal);
  controller.abort();
  await assert.rejects(upload, failure => failure.status === 0);
  assert.equal(incomingSignal.aborted, true);
  assert.equal(removes, 1);
});
