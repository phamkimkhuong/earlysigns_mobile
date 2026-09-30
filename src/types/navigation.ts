export type MainTabParamList = {
  Home: undefined;
  Profile: { tab?: "progress" | "account" } | undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Videos: undefined;
  Text: { entry?: "input" | "ocr" } | undefined;
  Phonemes: { startLesson?: boolean; startScreening?: boolean; view?: "catalog" } | undefined;
  Screening: { dialect?: string } | undefined;
  Journey: undefined;
  JourneyLesson: { dialect?: string; lessonTitle?: string } | undefined;
  VideoPractice: { youtubeId: string; initialIndex?: number };
  SentencePractice: {
    sentences: {
      index?: number;
      text: string;
      audio_url?: string;
      words?: any[];
      [key: string]: any;
    }[];
    dialect?: string;
    lessonTitle?: string;
    mode?: string;
  };
  Terms: undefined;
  Privacy: undefined;
  Referral: undefined;
  About: undefined;
  Login: { next?: string; nextParams?: Record<string, any> } | undefined;
  Payment: { packageId?: string } | undefined;
  PaymentWebView: { url: string; orderCode?: string };
  PaymentResult: { orderCode?: string; status?: string; variant?: string } | undefined;
  PronunciationProfile: undefined;
  NotificationSettings: undefined;
};
