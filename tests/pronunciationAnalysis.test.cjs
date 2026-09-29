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

test('tokenizeIpa breaks IPA into valid phonemes and marks', () => {
  const tokens = tokenizeIpa('fuːd');
  assert.deepEqual(tokens, ['f', 'uː', 'd']);
});

test('buildWordScores keeps 1:1 alignment clean and stores inserted phonemes separately', () => {
  const words = [
    { word: 'food', ipa: 'fuːd' },
    { word: 'is', ipa: 'ɪz' },
  ];
  const alignment = [
    { char: 'f', status: 'correct', predicted_char: 'f', word_index: 0 },
    { char: 'uː', status: 'correct', predicted_char: 'uː', word_index: 0 },
    { char: 'd', status: 'correct', predicted_char: 'd', word_index: 0 },
    // User mistakenly added /s/ at the end of word "food"
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
  assert.equal(scores[0].inserted?.length, 1, 'Inserted phonemes must be captured in inserted array');
  assert.equal(scores[0].inserted?.[0].predicted_char, 's');

  // Word 1 "is"
  assert.equal(scores[1].alignment.length, 2);
  assert.equal(scores[1].inserted?.length, 0);
});

test('buildSoundAnalysisRows retains correct, deleted, replaced, and inserted phonemes', () => {
  const alignment = [
    { char: 'f', status: 'correct', predicted_char: 'f', word_index: 0, tip: '' },
    { char: 'uː', status: 'deleted', predicted_char: '', word_index: 0, tip: 'Lengthen the vowel' },
    { char: 'd', status: 'replaced', predicted_char: 't', word_index: 0, tip: 'Make d voiced' },
    // Inserted phoneme where reference char is empty string
    { char: '', status: 'inserted', predicted_char: 's', word_index: 0, tip: 'Do not add s sound' },
    // Space or untracked status should be ignored
    { char: ' ', status: 'space', word_index: 0 },
  ];

  const rows = buildSoundAnalysisRows(alignment);
  assert.equal(rows.length, 4, 'Should include correct, deleted, replaced, and inserted rows');

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

  // Check inserted row
  assert.equal(rows[3].status, 'inserted');
  assert.equal(rows[3].expected, 's', 'Expected should fallback to predicted_char for inserted items');
  assert.equal(rows[3].pronounced, 's');
  assert.equal(rows[3].tipText, 'Do not add s sound');
});
