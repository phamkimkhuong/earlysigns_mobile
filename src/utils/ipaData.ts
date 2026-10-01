export type IpaCategory = "monophthong" | "diphthong" | "consonant";

export interface IpaSoundMeta {
  sound: string;
  category: IpaCategory;
  example: string;
}

export const ALL_44_IPA_SOUNDS: IpaSoundMeta[] = [
  // 12 Nguyên âm đơn (Monophthongs)
  { sound: "iː", category: "monophthong", example: "see, eat" },
  { sound: "ɪ", category: "monophthong", example: "sit, hit" },
  { sound: "e", category: "monophthong", example: "bed, pen" },
  { sound: "æ", category: "monophthong", example: "cat, bad" },
  { sound: "ʌ", category: "monophthong", example: "cup, run" },
  { sound: "ɑː", category: "monophthong", example: "car, start" },
  { sound: "ɒ", category: "monophthong", example: "hot, not" },
  { sound: "ɔː", category: "monophthong", example: "door, call" },
  { sound: "ʊ", category: "monophthong", example: "put, book" },
  { sound: "uː", category: "monophthong", example: "too, blue" },
  { sound: "ɜː", category: "monophthong", example: "bird, learn" },
  { sound: "ə", category: "monophthong", example: "about, sofa" },

  // 8 Nguyên âm đôi (Diphthongs)
  { sound: "eɪ", category: "diphthong", example: "say, face" },
  { sound: "aɪ", category: "diphthong", example: "my, time" },
  { sound: "ɔɪ", category: "diphthong", example: "boy, voice" },
  { sound: "aʊ", category: "diphthong", example: "now, out" },
  { sound: "əʊ", category: "diphthong", example: "go, home" },
  { sound: "ɪə", category: "diphthong", example: "near, here" },
  { sound: "eə", category: "diphthong", example: "hair, care" },
  { sound: "ʊə", category: "diphthong", example: "tour, pure" },

  // 24 Phụ âm (Consonants)
  { sound: "p", category: "consonant", example: "pen, stop" },
  { sound: "b", category: "consonant", example: "big, boy" },
  { sound: "t", category: "consonant", example: "tea, time" },
  { sound: "d", category: "consonant", example: "do, day" },
  { sound: "k", category: "consonant", example: "cat, black" },
  { sound: "g", category: "consonant", example: "get, go" },
  { sound: "tʃ", category: "consonant", example: "chair, match" },
  { sound: "dʒ", category: "consonant", example: "jam, joy" },
  { sound: "f", category: "consonant", example: "fall, safe" },
  { sound: "v", category: "consonant", example: "voice, love" },
  { sound: "θ", category: "consonant", example: "think, three" },
  { sound: "ð", category: "consonant", example: "this, that" },
  { sound: "s", category: "consonant", example: "see, rice" },
  { sound: "z", category: "consonant", example: "zoo, size" },
  { sound: "ʃ", category: "consonant", example: "she, wash" },
  { sound: "ʒ", category: "consonant", example: "vision, measure" },
  { sound: "h", category: "consonant", example: "hat, home" },
  { sound: "m", category: "consonant", example: "man, come" },
  { sound: "n", category: "consonant", example: "no, ten" },
  { sound: "ŋ", category: "consonant", example: "sing, ring" },
  { sound: "l", category: "consonant", example: "leg, feel" },
  { sound: "r", category: "consonant", example: "run, red" },
  { sound: "w", category: "consonant", example: "wet, we" },
  { sound: "j", category: "consonant", example: "yes, you" },
];

const SOUNDS_MAP = new Map<string, IpaSoundMeta>(
  ALL_44_IPA_SOUNDS.map((s) => [s.sound.toLowerCase(), s])
);

export function getIpaSoundMeta(rawSound: string): IpaSoundMeta {
  const clean = String(rawSound || "").replace(/^\/+|\/+$/g, "").trim().toLowerCase();
  const found = SOUNDS_MAP.get(clean);
  if (found) return found;

  return {
    sound: clean || rawSound,
    category: "consonant",
    example: clean ? `${clean}` : "",
  };
}
