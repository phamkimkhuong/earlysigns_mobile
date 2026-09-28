export type IpaCategory = "monophthong" | "diphthong" | "consonant";

export interface IpaSoundMeta {
  sound: string;
  category: IpaCategory;
  categoryLabelVi: string;
  categoryLabelEn: string;
  example: string;
  vietnameseTip: string;
}

export const ALL_44_IPA_SOUNDS: IpaSoundMeta[] = [
  // 12 Nguyên âm đơn (Monophthongs)
  { sound: "iː", category: "monophthong", categoryLabelVi: "Nguyên âm dài", categoryLabelEn: "Long vowel", example: "see /siː/, eat /iːt/", vietnameseTip: "Âm 'i' kéo dài, khóe môi kéo sang 2 bên như đang cười" },
  { sound: "ɪ", category: "monophthong", categoryLabelVi: "Nguyên âm ngắn", categoryLabelEn: "Short vowel", example: "sit /sɪt/, hit /hɪt/", vietnameseTip: "Âm ngắn, dứt khoát, khẩu hình giữa 'i' và 'ê'" },
  { sound: "e", category: "monophthong", categoryLabelVi: "Nguyên âm ngắn", categoryLabelEn: "Short vowel", example: "bed /bed/, pen /pen/", vietnameseTip: "Mở miệng tự nhiên, phát âm tương tự 'e' tiếng Việt nhưng dứt khoát" },
  { sound: "æ", category: "monophthong", categoryLabelVi: "Nguyên âm bẹt", categoryLabelEn: "Short vowel", example: "cat /kæt/, bad /bæd/", vietnameseTip: "Hạ quai hàm, mở rộng miệng, lai giữa 'a' và 'e'" },
  { sound: "ʌ", category: "monophthong", categoryLabelVi: "Nguyên âm ngắn", categoryLabelEn: "Short vowel", example: "cup /kʌp/, run /rʌn/", vietnameseTip: "Phát âm như chữ 'á', lưỡi hơi nâng nhẹ về phía sau" },
  { sound: "ɑː", category: "monophthong", categoryLabelVi: "Nguyên âm dài", categoryLabelEn: "Long vowel", example: "car /kɑː/, start /stɑːt/", vietnameseTip: "Mở rộng vòm miệng, kéo dài âm 'a' sâu trong cuống họng" },
  { sound: "ɒ", category: "monophthong", categoryLabelVi: "Nguyên âm ngắn", categoryLabelEn: "Short vowel", example: "hot /hɒt/, not /nɒt/", vietnameseTip: "Tròn môi nhẹ, phát âm âm 'o' dứt khoát ngắn gọn" },
  { sound: "ɔː", category: "monophthong", categoryLabelVi: "Nguyên âm dài", categoryLabelEn: "Long vowel", example: "door /dɔː/, call /kɔːl/", vietnameseTip: "Tròn môi, lưỡi hơi kéo về sau, âm 'o' kéo dài" },
  { sound: "ʊ", category: "monophthong", categoryLabelVi: "Nguyên âm ngắn", categoryLabelEn: "Short vowel", example: "put /pʊt/, book /bʊk/", vietnameseTip: "Môi hơi tròn, phát âm âm 'u' ngắn, âm thanh thoát ra nhanh" },
  { sound: "uː", category: "monophthong", categoryLabelVi: "Nguyên âm dài", categoryLabelEn: "Long vowel", example: "too /tuː/, blue /bluː/", vietnameseTip: "Chu môi tròn như huýt sáo, âm 'u' ngân dài" },
  { sound: "ɜː", category: "monophthong", categoryLabelVi: "Nguyên âm dài", categoryLabelEn: "Long vowel", example: "bird /bɜːd/, learn /lɜːn/", vietnameseTip: "Khẩu hình thư giãn, phát âm 'ơ' kéo dài trong vòm họng" },
  { sound: "ə", category: "monophthong", categoryLabelVi: "Nguyên âm Schwa", categoryLabelEn: "Schwa vowel", example: "about /əˈbaʊt/, sofa /ˈsəʊfə/", vietnameseTip: "Âm ơ siêu ngắn, thả lỏng môi và lưỡi tối đa" },

  // 8 Nguyên âm đôi (Diphthongs)
  { sound: "eɪ", category: "diphthong", categoryLabelVi: "Nguyên âm đôi", categoryLabelEn: "Diphthong", example: "say /seɪ/, face /feɪs/", vietnameseTip: "Trượt mượt mà từ âm 'e' sang âm 'ɪ'" },
  { sound: "aɪ", category: "diphthong", categoryLabelVi: "Nguyên âm đôi", categoryLabelEn: "Diphthong", example: "my /maɪ/, time /taɪm/", vietnameseTip: "Bắt đầu từ âm 'a' rồi trượt lên 'ɪ'" },
  { sound: "ɔɪ", category: "diphthong", categoryLabelVi: "Nguyên âm đôi", categoryLabelEn: "Diphthong", example: "boy /bɔɪ/, voice /vɔɪs/", vietnameseTip: "Bắt đầu từ âm 'ɔ' rồi trượt nhẹ lên 'ɪ'" },
  { sound: "aʊ", category: "diphthong", categoryLabelVi: "Nguyên âm đôi", categoryLabelEn: "Diphthong", example: "now /naʊ/, out /aʊt/", vietnameseTip: "Mở miệng với 'a' rồi thu tròn môi về 'ʊ'" },
  { sound: "əʊ", category: "diphthong", categoryLabelVi: "Nguyên âm đôi", categoryLabelEn: "Diphthong", example: "go /ɡəʊ/, home /həʊm/", vietnameseTip: "Khởi đầu từ 'ə' rồi tròn môi dần về 'ʊ'" },
  { sound: "ɪə", category: "diphthong", categoryLabelVi: "Nguyên âm đôi", categoryLabelEn: "Diphthong", example: "near /nɪə/, here /hɪə/", vietnameseTip: "Phát âm 'ɪ' rồi lướt nhẹ sang 'ə'" },
  { sound: "eə", category: "diphthong", categoryLabelVi: "Nguyên âm đôi", categoryLabelEn: "Diphthong", example: "hair /heə/, care /keə/", vietnameseTip: "Phát âm 'e' rồi mở nhẹ thả lỏng sang 'ə'" },
  { sound: "ʊə", category: "diphthong", categoryLabelVi: "Nguyên âm đôi", categoryLabelEn: "Diphthong", example: "tour /tʊə/, pure /pjʊə/", vietnameseTip: "Môi chu 'ʊ' rồi lướt thả lỏng sang 'ə'" },

  // 24 Phụ âm (Consonants)
  { sound: "p", category: "consonant", categoryLabelVi: "Phụ âm vô thanh", categoryLabelEn: "Voiceless plosive", example: "pen /pen/, stop /stɒp/", vietnameseTip: "Bặm chặt 2 môi rồi bật hơi mạnh, dây thanh quản không rung" },
  { sound: "b", category: "consonant", categoryLabelVi: "Phụ âm hữu thanh", categoryLabelEn: "Voiced plosive", example: "big /bɪɡ/, boy /bɔɪ/", vietnameseTip: "Bặm môi bật âm 'b', dây thanh quản rung rõ" },
  { sound: "t", category: "consonant", categoryLabelVi: "Phụ âm vô thanh", categoryLabelEn: "Voiceless plosive", example: "tea /tiː/, time /taɪm/", vietnameseTip: "Đầu lưỡi chạm nướu răng trên, bật hơi dứt khoát không rung cổ" },
  { sound: "d", category: "consonant", categoryLabelVi: "Phụ âm hữu thanh", categoryLabelEn: "Voiced plosive", example: "do /duː/, day /deɪ/", vietnameseTip: "Đầu lưỡi chạm nướu trên, bật âm 'đ' và rung dây thanh quản" },
  { sound: "k", category: "consonant", categoryLabelVi: "Phụ âm vô thanh", categoryLabelEn: "Voiceless plosive", example: "cat /kæt/, black /blæk/", vietnameseTip: "Cuống lưỡi nâng chặn vòm họng rồi bật luồng hơi mạnh" },
  { sound: "g", category: "consonant", categoryLabelVi: "Phụ âm hữu thanh", categoryLabelEn: "Voiced plosive", example: "get /ɡet/, go /ɡəʊ/", vietnameseTip: "Cuống lưỡi nâng, bật âm 'g' và cảm nhận rung ở cổ" },
  { sound: "tʃ", category: "consonant", categoryLabelVi: "Phụ âm tắc xát", categoryLabelEn: "Voiceless affricate", example: "chair /tʃeə/, match /mætʃ/", vietnameseTip: "Chu môi, đầu lưỡi chạm nướu bật hơi như tiếng 'ch' mạnh" },
  { sound: "dʒ", category: "consonant", categoryLabelVi: "Phụ âm tắc xát", categoryLabelEn: "Voiced affricate", example: "jam /dʒæm/, joy /dʒɔɪ/", vietnameseTip: "Chu môi, bật âm 'dʒ' tương tự 'gi' nhưng rung mạnh vòm họng" },
  { sound: "f", category: "consonant", categoryLabelVi: "Phụ âm vô thanh", categoryLabelEn: "Voiceless fricative", example: "fall /fɔːl/, safe /seɪf/", vietnameseTip: "Răng cửa trên chạm nhẹ môi dưới, thổi luồng hơi ra ngoài" },
  { sound: "v", category: "consonant", categoryLabelVi: "Phụ âm hữu thanh", categoryLabelEn: "Voiced fricative", example: "voice /vɔɪs/, love /lʌv/", vietnameseTip: "Răng trên chạm môi dưới, phát âm rung dây thanh" },
  { sound: "θ", category: "consonant", categoryLabelVi: "Âm thè thổi (Vô thanh)", categoryLabelEn: "Voiceless dental", example: "think /θɪŋk/, three /θriː/", vietnameseTip: "Đặt đầu lưỡi giữa 2 hàm răng, đẩy luồng hơi nhẹ ra khe răng" },
  { sound: "ð", category: "consonant", categoryLabelVi: "Âm thè thổi (Hữu thanh)", categoryLabelEn: "Voiced dental", example: "this /ðɪs/, that /ðæt/", vietnameseTip: "Đặt lưỡi giữa 2 hàm răng, phát âm rung cổ họng" },
  { sound: "s", category: "consonant", categoryLabelVi: "Phụ âm gió", categoryLabelEn: "Voiceless fricative", example: "see /siː/, rice /raɪs/", vietnameseTip: "Hai hàm răng khép nhẹ, đẩy luồng hơi xì qua kẽ răng" },
  { sound: "z", category: "consonant", categoryLabelVi: "Phụ âm gió (Rung)", categoryLabelEn: "Voiced fricative", example: "zoo /zuː/, size /saɪz/", vietnameseTip: "Tương tự âm 's' nhưng tạo độ rung rền ở cổ họng" },
  { sound: "ʃ", category: "consonant", categoryLabelVi: "Âm xát nặng", categoryLabelEn: "Voiceless fricative", example: "she /ʃiː/, wash /wɒʃ/", vietnameseTip: "Chu tròn môi về phía trước, thổi hơi mạnh như đang ra hiệu im lặng" },
  { sound: "ʒ", category: "consonant", categoryLabelVi: "Âm xát nặng (Rung)", categoryLabelEn: "Voiced fricative", example: "vision /ˈvɪʒ.ən/, measure /ˈmeʒ.ər/", vietnameseTip: "Khẩu hình chu môi như 'ʃ' nhưng làm rung dây thanh" },
  { sound: "h", category: "consonant", categoryLabelVi: "Âm họng", categoryLabelEn: "Voiceless fricative", example: "hat /hæt/, home /həʊm/", vietnameseTip: "Mở miệng tự nhiên, thở hơi nhẹ từ cuống họng" },
  { sound: "m", category: "consonant", categoryLabelVi: "Âm mũi", categoryLabelEn: "Nasal consonant", example: "man /mæn/, come /kʌm/", vietnameseTip: "Khép chặt 2 môi, luồng hơi đi lên mũi tạo tiếng rung 'm'" },
  { sound: "n", category: "consonant", categoryLabelVi: "Âm mũi", categoryLabelEn: "Nasal consonant", example: "no /nəʊ/, ten /ten/", vietnameseTip: "Đầu lưỡi dán lên nướu răng trên, hơi thoát qua mũi" },
  { sound: "ŋ", category: "consonant", categoryLabelVi: "Âm mũi", categoryLabelEn: "Nasal consonant", example: "sing /sɪŋ/, ring /rɪŋ/", vietnameseTip: "Cuống lưỡi nâng chạm vòm gà, âm 'ng' ngân qua mũi" },
  { sound: "l", category: "consonant", categoryLabelVi: "Âm cạnh lưỡi", categoryLabelEn: "Lateral consonant", example: "leg /leɡ/, feel /fiːl/", vietnameseTip: "Đầu lưỡi tựa vào nướu răng cửa trên, hơi thoát 2 bên mép" },
  { sound: "r", category: "consonant", categoryLabelVi: "Âm uốn lưỡi", categoryLabelEn: "Approximant", example: "run /rʌn/, red /red/", vietnameseTip: "Cong đầu lưỡi về phía vòm họng nhưng không chạm vào vòm miệng" },
  { sound: "w", category: "consonant", categoryLabelVi: "Âm bán nguyên âm", categoryLabelEn: "Approximant", example: "wet /wet/, we /wiː/", vietnameseTip: "Chu môi tròn như âm 'u' rồi nhanh chóng mở rộng sang âm kế" },
  { sound: "j", category: "consonant", categoryLabelVi: "Âm bán nguyên âm", categoryLabelEn: "Approximant", example: "yes /jes/, you /juː/", vietnameseTip: "Nâng thân lưỡi lên gần vòm miệng, phát âm lướt như 'd/gi'" },
];

const SOUNDS_MAP = new Map<string, IpaSoundMeta>(
  ALL_44_IPA_SOUNDS.map((s) => [s.sound.toLowerCase(), s])
);

export function getIpaSoundMeta(rawSound: string): IpaSoundMeta {
  const clean = String(rawSound || "").replace(/^\/+|\/+$/g, "").trim().toLowerCase();
  const found = SOUNDS_MAP.get(clean);
  if (found) return found;

  // Fallback for custom or combined sounds
  return {
    sound: clean || rawSound,
    category: "consonant",
    categoryLabelVi: "Ngữ âm IPA",
    categoryLabelEn: "IPA Sound",
    example: `/${clean}/ sound practice`,
    vietnameseTip: `Luyện khẩu hình chuẩn xác cho âm /${clean}/`,
  };
}
