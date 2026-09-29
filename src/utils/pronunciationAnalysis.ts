import { SoundAnalysisRow, WordAlignmentItem, WordScore } from "@/types";

const PHONEMES = new Set([
  "aː", "b", "d", "e", "f", "h", "i", "iː", "j", "k", "l", "m", "n",
  "p", "r", "s", "t", "t̬", "uː", "v", "w", "z", "æ", "ð", "ŋ",
  "ɑː", "ɒ", "ɔː", "ə", "ɚ", "ɜː", "ɝ", "ɝː", "ɡ", "ɪ", "ʃ", "ʊ",
  "ʌ", "ʒ", "dʒ", "θ", "eɪ", "aɪ", "aʊ", "oʊ", "ɔɪ", "əʊ", "eə",
  "ɪə", "ʊə",
]);

const ALLOWED_IPA_CHARS = new Set([
  ...Array.from(PHONEMES).flatMap((phoneme) => [...phoneme]),
  "ˈ",
  "ˌ",
  ".",
]);

const MAX_PHONEME_LENGTH = Math.max(
  ...Array.from(PHONEMES, (phoneme) => phoneme.length)
);

export function normalizeIpa(value: string | null | undefined): string {
  const s = String(value || "")
    .replace(/^[\s/]+|[\s/]+$/g, "")
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/ʤ/g, "dʒ");
  let out = "";
  for (const ch of s) {
    if (ALLOWED_IPA_CHARS.has(ch)) out += ch;
  }
  return out;
}

export function tokenizeIpa(text: string | null | undefined): string[] {
  const normalized = normalizeIpa(text);
  const tokens: string[] = [];
  let i = 0;
  while (i < normalized.length) {
    const maxLength = Math.min(MAX_PHONEME_LENGTH, normalized.length - i);
    for (let length = maxLength; length > 0; length -= 1) {
      const candidate = normalized.slice(i, i + length);
      if (PHONEMES.has(candidate)) {
        tokens.push(candidate);
        i += length;
        break;
      }
      if (length === 1) {
        tokens.push(normalized[i]);
        i += 1;
      }
    }
  }
  return tokens;
}

export function buildWordScores(
  words: { ipa?: string; [key: string]: any }[],
  alignment?: WordAlignmentItem[]
): WordScore[] {
  if (!Array.isArray(words) || words.length === 0) return [];
  const wordScores: WordScore[] = words.map((word) => ({
    ipaTokens: tokenizeIpa(word?.ipa || ""),
    alignment: [],
    inserted: [],
  }));
  if (!Array.isArray(alignment) || alignment.length === 0) return wordScores;

  alignment.forEach((item) => {
    if (item?.status === "space") return;
    const wordIndex = item?.word_index;
    if (wordIndex != null && wordIndex >= 0 && wordIndex < wordScores.length) {
      if (item?.status === "inserted") {
        wordScores[wordIndex].inserted!.push(item);
      } else {
        wordScores[wordIndex].alignment.push(item);
      }
    }
  });
  return wordScores;
}

export function buildSoundAnalysisRows(alignment?: WordAlignmentItem[]): SoundAnalysisRow[] {
  if (!Array.isArray(alignment)) return [];
  return alignment
    .filter((item) => ["correct", "deleted", "replaced", "inserted"].includes(item?.status || ""))
    .map((item, index) => {
      const status = String(item?.status || "");
      const rawExpected = String(item?.char || "").trim();
      const predicted = String(item?.predicted_char ?? "").trim();
      const expected = status === "inserted" ? (rawExpected || predicted || "+") : rawExpected;
      return {
        id: `${index}-${expected}-${status}`,
        expected,
        status,
        pronounced: status === "deleted" ? "" : predicted || expected,
        tipText: String(item?.tip || ""),
        wordIndex: typeof item?.word_index === "number" ? item.word_index : undefined,
      };
    })
    .filter((row) => Boolean(row.expected));
}
