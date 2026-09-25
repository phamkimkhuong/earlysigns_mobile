export type Dialect = "uk" | "us";

export type UserTier = "anonymous" | "free" | "trial" | "pro";

export type PhonemeStatus = "correct" | "deleted" | "replaced" | "inserted" | "space";

export interface SoundAnalysisRow {
  id: string;
  expected: string;
  status: string;
  pronounced: string;
  tipText: string;
}

export interface WordAlignmentItem {
  char?: string;
  status?: string;
  predicted_char?: string;
  tip?: string;
  word_index?: number;
}

export interface WordScore {
  ipaTokens: string[];
  alignment: WordAlignmentItem[];
}

export interface SentenceCheckResult {
  overall_score?: number;
  accuracy_score?: number;
  fluency_score?: number;
  completeness_score?: number;
  accuracy?: number;
  char_alignment?: any[];
  usage?: BillingUsage;
  words?: {
    word: string;
    ipa?: string;
    accuracy?: number;
  }[];
  alignment?: WordAlignmentItem[];
  [key: string]: any;
}


export interface BillingUsage {
  daily_remaining?: number;
  has_active_subscription?: boolean;
  is_in_trial?: boolean;
  subscription_expires_at?: string;
  payos_configured?: boolean;
  [key: string]: any;
}

export interface HomeSummary {
  daily_streak?: number;
  total_sentences?: number;
  total_practiced?: number;
  average_accuracy?: number;
  topics?: any[];
  weak_phonemes?: string[];
  [key: string]: any;
}

export interface BillingProfile {
  first_name?: string;
  last_name?: string;
  address_detail?: string;
  street?: string;
  ward?: string;
  city?: string;
  phone?: string;
  email?: string;
  tax_code?: string;
  notes?: string;
  want_vat_invoice?: boolean;
  vat_company_name?: string;
  vat_tax_code?: string;
  vat_company_address?: string;
  vat_invoice_email?: string;
  vat_invoice_phone?: string;
  [key: string]: any;
}

export type BillingIssueKind =
  | "required"
  | "min"
  | "max"
  | "emailInvalid"
  | "phoneInvalid"
  | "genericField";

export interface BillingIssue {
  field: string;
  kind: BillingIssueKind | string;
  min?: number;
  max?: number;
  [key: string]: any;
}

export interface LessonSentence {
  text: string;
  translation?: string;
  ipa?: string;
  [key: string]: any;
}

export interface LessonSession {
  kind: string;
  phoneme: string | null;
  phonemes: string[];
  dialect: Dialect | string;
  sentences: LessonSentence[];
  title: string;
  instructionsHtml: string;
}

export interface MicError {
  type: "denied" | "notFound" | "generic";
  raw: string;
}

export interface VideoSegment {
  index: number;
  start_ms: number;
  end_ms: number;
  text: string;
  translation?: string;
  ipa?: string;
}

export interface VideoItem {
  youtube_id: string;
  title: string;
  level?: string;
  topic?: string;
  topics?: string[];
  duration_ms?: number;
  segment_count?: number;
  played_count?: number;
  played_pct?: number;
  thumbnail_url?: string;
}

