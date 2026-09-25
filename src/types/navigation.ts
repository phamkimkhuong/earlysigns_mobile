export type MainTabParamList = {
  Home: undefined;
  Profile: { tab?: "progress" | "account" } | undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Videos: undefined;
  Text: { entry?: "input" | "ocr" } | undefined;
  Phonemes: { startLesson?: boolean } | undefined;
  Journey: undefined;
  VideoPractice: { youtubeId: string };
  Terms: undefined;
  Privacy: undefined;
  Referral: undefined;
  About: undefined;
  Login: { next?: string; nextParams?: Record<string, any> } | undefined;
  Payment: { packageId?: string } | undefined;
  PaymentWebView: { url: string; orderCode?: string };
  PaymentResult: { orderCode?: string; status?: string; variant?: string } | undefined;
};
