import i18n from "@/core/i18n";

/**
 * Standard bilingual error message structure
 */
export interface LocalizedMessage {
  vi: string;
  en: string;
}

/**
 * Parsed error representation for UI and telemetry
 */
export interface ParsedApiError {
  code: string;
  message: string;
  userMessage: string;
  status: number;
  usage?: any;
  retryable: boolean;
}

/**
 * 1. Error Codes Dictionary
 * Maps backend error codes to user-friendly bilingual messages
 */
export const ERROR_CODE_MAP: Record<string, LocalizedMessage> = {
  // Activation code errors
  INVALID_ACTIVATION_CODE_FORMAT: {
    vi: "Định dạng mã kích hoạt không hợp lệ. Mã gồm 6 ký tự (VD: ACT123).",
    en: "Invalid activation code format. Code must be 6 characters (e.g., ACT123).",
  },
  INVALID_FORMAT: {
    vi: "Định dạng mã không hợp lệ. Vui lòng kiểm tra lại.",
    en: "Invalid code format. Please check and try again.",
  },
  ACTIVATION_CODE_NOT_FOUND: {
    vi: "Không tìm thấy mã kích hoạt này trong hệ thống.",
    en: "Activation code not found.",
  },
  ACTIVATION_CODE_EXPIRED: {
    vi: "Mã kích hoạt này đã hết hạn sử dụng.",
    en: "This activation code has expired.",
  },
  ACTIVATION_CODE_MAX_USES: {
    vi: "Mã kích hoạt này đã đạt số lượt sử dụng tối đa.",
    en: "This activation code has reached its maximum number of uses.",
  },
  ACTIVATION_CODE_ALREADY_USED: {
    vi: "Bạn đã sử dụng mã kích hoạt này trước đó rồi.",
    en: "You have already used this activation code.",
  },
  USER_NOT_FOUND: {
    vi: "Không tìm thấy thông tin tài khoản người dùng.",
    en: "User account not found.",
  },

  // Referral program errors
  ALREADY_REDEEMED: {
    vi: "Bạn đã từng áp dụng mã giới thiệu trước đó rồi. Mỗi tài khoản chỉ áp dụng 1 lần.",
    en: "You have already redeemed a referral code. Each account can only redeem once.",
  },
  REDEEM_WINDOW_EXPIRED: {
    vi: "Thời hạn 24 giờ sau khi tạo tài khoản để nhập mã giới thiệu đã kết thúc.",
    en: "Referral codes can only be entered within 24 hours of account creation.",
  },
  REFERRAL_CODE_INVALID: {
    vi: "Mã giới thiệu không đúng định dạng. Mã gồm 6 ký tự.",
    en: "Invalid referral code format. Code must be 6 characters.",
  },
  SELF_REFERRAL_NOT_ALLOWED: {
    vi: "Bạn không thể tự nhập mã giới thiệu của chính mình.",
    en: "You cannot redeem your own referral code.",
  },
  REFERRAL_CODE_NOT_FOUND: {
    vi: "Không tìm thấy mã giới thiệu này trong hệ thống.",
    en: "Referral code not found.",
  },

  // Usage, Quota & Billing
  DAILY_LIMIT_REACHED: {
    vi: "Bạn đã đạt giới hạn lượt luyện tập hôm nay. Nâng cấp EarlySigns Pro để luyện không giới hạn.",
    en: "Daily practice limit reached. Upgrade to EarlySigns Pro for unlimited access.",
  },
  PRO_REQUIRED: {
    vi: "Tính năng này chỉ dành riêng cho tài khoản EarlySigns Pro.",
    en: "This feature is exclusively available for EarlySigns Pro members.",
  },
  TRIAL_EXPIRED: {
    vi: "Thời gian dùng thử miễn phí đã kết thúc. Vui lòng đăng ký gói để tiếp tục.",
    en: "Your free trial has expired. Please subscribe to continue practicing.",
  },
  SUBSCRIPTION_EXPIRED: {
    vi: "Gói Pro của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng đầy đủ tính năng.",
    en: "Your Pro subscription has expired. Please renew to continue.",
  },
  PACKAGE_NOT_FOUND: {
    vi: "Gói dịch vụ không tồn tại hoặc đã ngừng cung cấp.",
    en: "Subscription package not found.",
  },
  CHECKOUT_FAILED: {
    vi: "Không thể tạo phiên thanh toán lúc này. Vui lòng thử lại sau.",
    en: "Failed to create checkout session. Please try again later.",
  },

  // Authentication & Account
  INVALID_CREDENTIALS: {
    vi: "Thông tin đăng nhập không chính xác.",
    en: "Invalid login credentials.",
  },
  EMAIL_ALREADY_EXISTS: {
    vi: "Email này đã được sử dụng cho tài khoản khác.",
    en: "This email is already registered.",
  },
  OTP_INVALID: {
    vi: "Mã xác thực OTP không chính xác.",
    en: "Invalid verification code.",
  },
  OTP_EXPIRED: {
    vi: "Mã xác thực OTP đã hết hạn. Vui lòng gửi lại mã mới.",
    en: "Verification code has expired. Please request a new one.",
  },
  ACCOUNT_LOCKED: {
    vi: "Tài khoản của bạn tạm thời bị khóa. Vui lòng liên hệ hỗ trợ.",
    en: "Your account is temporarily locked. Please contact support.",
  },
  UNAUTHORIZED: {
    vi: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    en: "Session expired. Please sign in again.",
  },

  // Speech & Scoring
  AUDIO_TOO_SHORT: {
    vi: "Bản thu âm quá ngắn. Vui lòng nói to và rõ ràng hơn.",
    en: "Audio recording is too short. Please speak louder and clearer.",
  },
  AUDIO_EMPTY: {
    vi: "Không ghi nhận được âm thanh. Vui lòng kiểm tra quyền micro.",
    en: "No audio detected. Please check your microphone permissions.",
  },
  NO_SPEECH_DETECTED: {
    vi: "Không nhận diện được giọng nói trong bản thu. Vui lòng thử lại.",
    en: "No speech detected in recording. Please try again.",
  },
  ASR_UNAVAILABLE: {
    vi: "Hệ thống nhận diện giọng nói đang bận. Vui lòng thử lại sau ít giây.",
    en: "Speech recognition service is busy. Please try again in a few seconds.",
  },
  SCORING_FAILED: {
    vi: "Chưa thể chấm điểm bài nói lúc này. Vui lòng thử lại.",
    en: "Unable to evaluate pronunciation right now. Please try again.",
  },

  // General Network & Server
  NETWORK_ERROR: {
    vi: "Không có kết nối mạng hoặc đường truyền không ổn định.",
    en: "Network connection error. Please check your internet connection.",
  },
  TIMEOUT: {
    vi: "Yêu cầu đã quá thời gian phản hồi. Vui lòng thử lại.",
    en: "Request timed out. Please try again.",
  },
  SERVER_ERROR: {
    vi: "Hệ thống máy chủ đang bận. Vui lòng thử lại sau ít phút.",
    en: "Server is temporarily unavailable. Please try again later.",
  },
};

/**
 * 2. Raw Backend English Strings Dictionary
 * Maps raw backend string messages to user-friendly bilingual messages
 */
export const RAW_STRING_MAP: Record<string, LocalizedMessage> = {
  "invalid activation code format.": {
    vi: "Định dạng mã kích hoạt không hợp lệ. Mã gồm 6 ký tự (VD: ACT123).",
    en: "Invalid activation code format. Code must be 6 characters (e.g., ACT123).",
  },
  "activation code not found.": {
    vi: "Không tìm thấy mã kích hoạt này trong hệ thống.",
    en: "Activation code not found.",
  },
  "this activation code has expired.": {
    vi: "Mã kích hoạt này đã hết hạn sử dụng.",
    en: "This activation code has expired.",
  },
  "this activation code has reached its maximum number of uses.": {
    vi: "Mã kích hoạt này đã đạt số lượt sử dụng tối đa.",
    en: "This activation code has reached its maximum number of uses.",
  },
  "you have already used this activation code.": {
    vi: "Bạn đã sử dụng mã kích hoạt này trước đó rồi.",
    en: "You have already used this activation code.",
  },
  "user not found.": {
    vi: "Không tìm thấy thông tin tài khoản người dùng.",
    en: "User account not found.",
  },
  "referral code not found.": {
    vi: "Không tìm thấy mã giới thiệu này trong hệ thống.",
    en: "Referral code not found.",
  },
  "invalid referral code format.": {
    vi: "Mã giới thiệu không đúng định dạng. Mã gồm 6 ký tự.",
    en: "Invalid referral code format. Code must be 6 characters.",
  },
  "cannot refer yourself.": {
    vi: "Bạn không thể tự nhập mã giới thiệu của chính mình.",
    en: "You cannot redeem your own referral code.",
  },
  "referral window expired.": {
    vi: "Thời hạn 24 giờ sau khi đăng ký để nhập mã giới thiệu đã kết thúc.",
    en: "Referral code can only be entered within 24 hours of account creation.",
  },
  "already redeemed.": {
    vi: "Bạn đã từng áp dụng mã giới thiệu trước đó rồi.",
    en: "You have already redeemed a referral code.",
  },
  "invalid credentials.": {
    vi: "Thông tin đăng nhập không chính xác.",
    en: "Invalid login credentials.",
  },
  "email already registered.": {
    vi: "Email này đã được sử dụng cho tài khoản khác.",
    en: "This email is already registered.",
  },
  "invalid otp.": {
    vi: "Mã xác thực OTP không chính xác hoặc đã hết hạn.",
    en: "Invalid or expired OTP code.",
  },
  "rate limit exceeded.": {
    vi: "Bạn đã thao tác quá nhiều lần liên tiếp. Vui lòng chờ ít phút.",
    en: "Rate limit exceeded. Please wait a moment and try again.",
  },
};

/**
 * 3. HTTP Status Fallbacks
 */
export const HTTP_STATUS_MAP: Record<number, LocalizedMessage> = {
  400: {
    vi: "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin.",
    en: "Invalid request. Please check your input and try again.",
  },
  401: {
    vi: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    en: "Session expired. Please sign in again.",
  },
  403: {
    vi: "Bạn không có quyền thực hiện thao tác này.",
    en: "You do not have permission to perform this action.",
  },
  404: {
    vi: "Không tìm thấy dữ liệu yêu cầu trên hệ thống.",
    en: "Requested resource not found.",
  },
  408: {
    vi: "Yêu cầu mạng quá thời gian phản hồi. Vui lòng thử lại.",
    en: "Request timed out. Please try again.",
  },
  422: {
    vi: "Dữ liệu gửi lên không đúng định dạng. Vui lòng kiểm tra lại.",
    en: "Invalid input format. Please check your data.",
  },
  429: {
    vi: "Bạn đã thao tác quá nhiều lần liên tiếp. Vui lòng chờ trong giây lát.",
    en: "Too many requests. Please wait a moment and try again.",
  },
  500: {
    vi: "Hệ thống máy chủ đang gặp sự cố. Đội ngũ kỹ thuật đang khắc phục.",
    en: "Internal server error. We are working to resolve it.",
  },
  502: {
    vi: "Máy chủ tạm thời không thể phản hồi. Vui lòng thử lại sau.",
    en: "Bad gateway. Please try again later.",
  },
  503: {
    vi: "Dịch vụ đang được bảo trì nâng cấp. Vui lòng quay lại sau ít phút.",
    en: "Service is temporarily down for maintenance. Please check back soon.",
  },
  504: {
    vi: "Hết thời gian phản hồi từ máy chủ. Vui lòng thử lại sau.",
    en: "Gateway timeout. Please try again later.",
  },
};

/**
 * Detect current app language safely
 */
export function getCurrentLanguage(): "vi" | "en" {
  try {
    const lang = String(i18n.language || "vi").toLowerCase();
    return lang.startsWith("en") ? "en" : "vi";
  } catch {
    return "vi";
  }
}

/**
 * Normalizes a string for dictionary lookup
 */
function normalizeString(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Formats FastAPI / Pydantic 422 error details into a clean Vietnamese/English sentence
 */
function formatPydanticErrors(errors: any[], lang: "vi" | "en"): string {
  if (!Array.isArray(errors) || errors.length === 0) {
    return lang === "en" ? "Invalid input format." : "Dữ liệu nhập không hợp lệ.";
  }
  const first = errors[0];
  const field = Array.isArray(first?.loc) ? first.loc[first.loc.length - 1] : "";
  const msg = first?.msg || "";

  if (lang === "en") {
    return field ? `Invalid input for field '${field}': ${msg}` : `Invalid input: ${msg}`;
  }
  return field
    ? `Thông tin '${field}' không hợp lệ: ${msg}`
    : "Dữ liệu nhập vào chưa đúng định dạng. Vui lòng kiểm tra lại.";
}

/**
 * Universal Error Message Resolver for UI
 * Resolves any backend error, AppHttpError, or JavaScript Error into a friendly, localized message.
 *
 * @param err The error thrown by httpClient or JavaScript
 * @param fallback Custom fallback message if no match is found
 * @param forcedLang Optional language override ("vi" | "en")
 * @returns Human-friendly message ready for UI alert / toast / error banner
 */
export function getFriendlyErrorMessage(
  err: unknown,
  fallback?: string,
  forcedLang?: "vi" | "en"
): string {
  const lang = forcedLang || getCurrentLanguage();

  if (!err) {
    return fallback || (lang === "en" ? "An unexpected error occurred." : "Có lỗi xảy ra. Vui lòng thử lại.");
  }

  // 1. If err is a plain string
  if (typeof err === "string") {
    const norm = normalizeString(err);
    if (RAW_STRING_MAP[norm]) return RAW_STRING_MAP[norm][lang];
    if (ERROR_CODE_MAP[err.toUpperCase()]) return ERROR_CODE_MAP[err.toUpperCase()][lang];

    // Filter out technical error strings (e.g. "ApiException", "DEVELOPER_ERROR", "Error:", stack traces)
    const isTechnical =
      err.includes("ApiException") ||
      err.includes("DEVELOPER_ERROR") ||
      err.includes("statusCodes") ||
      err.includes("Error:") ||
      err.includes("Exception") ||
      err.includes("native") ||
      err.includes("NetworkError") ||
      err.includes("at ");

    if (isTechnical) {
      return fallback || (lang === "en" ? "An error occurred. Please try again." : "Có lỗi xảy ra. Vui lòng thử lại.");
    }

    return err;
  }

  const errObj = err as any;
  const detail = errObj?.detail;
  const status = Number(errObj?.status || 0);
  const rawMessage = String(errObj?.message || "").trim();

  // 2. Bilingual detail object: { code, message: { vi, en } }
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    if (detail.message && typeof detail.message === "object") {
      const msg = detail.message[lang] || detail.message.vi || detail.message.en;
      if (msg && typeof msg === "string") return msg;
    }

    // Check code in detail
    const code = String(detail.code || "").toUpperCase();
    if (code && ERROR_CODE_MAP[code]) {
      return ERROR_CODE_MAP[code][lang];
    }

    // Detail has string message
    if (typeof detail.message === "string" && detail.message.trim()) {
      const normMsg = normalizeString(detail.message);
      if (RAW_STRING_MAP[normMsg]) return RAW_STRING_MAP[normMsg][lang];
    }
  }

  // 3. Detail is string directly (e.g., FastAPI HTTPException(detail="Invalid activation code format."))
  if (typeof detail === "string" && detail.trim()) {
    const normDetail = normalizeString(detail);
    if (RAW_STRING_MAP[normDetail]) return RAW_STRING_MAP[normDetail][lang];

    const upperDetail = detail.toUpperCase();
    if (ERROR_CODE_MAP[upperDetail]) return ERROR_CODE_MAP[upperDetail][lang];

    // If detail is a clean, non-technical sentence, use it
    if (!detail.includes("Traceback") && !detail.includes("Error:") && detail.length < 150) {
      return detail;
    }
  }

  // 4. Detail is array (FastAPI 422 validation errors)
  if (Array.isArray(detail)) {
    return formatPydanticErrors(detail, lang);
  }

  // 5. Check err.code or err.name
  const errCode = String(errObj?.code || "").toUpperCase();
  if (errCode && ERROR_CODE_MAP[errCode]) {
    return ERROR_CODE_MAP[errCode][lang];
  }

  // 6. Check err.message against raw string map
  if (rawMessage) {
    const normRaw = normalizeString(rawMessage);
    if (RAW_STRING_MAP[normRaw]) return RAW_STRING_MAP[normRaw][lang];

    // Network / Timeout check
    if (normRaw.includes("timeout") || normRaw.includes("aborted")) {
      return ERROR_CODE_MAP.TIMEOUT[lang];
    }
    if (normRaw.includes("network request failed") || normRaw.includes("connection")) {
      return ERROR_CODE_MAP.NETWORK_ERROR[lang];
    }
  }

  // 7. Check HTTP status code
  if (status && HTTP_STATUS_MAP[status]) {
    // If fallback is provided and status is generic 400, fallback might be more specific
    if (status === 400 && fallback) return fallback;
    return HTTP_STATUS_MAP[status][lang];
  }

  // 8. Custom fallback or default
  if (fallback) return fallback;

  return lang === "en" ? "An error occurred. Please try again." : "Có lỗi xảy ra. Vui lòng thử lại.";
}

/**
 * Detailed API Error Parser
 * Returns full metadata: status, code, technical message, and friendly userMessage.
 */
export function parseApiError(err: unknown, fallback?: string): ParsedApiError {
  const errObj = (err || {}) as any;
  const detail = errObj?.detail;
  const status = Number(errObj?.status || 0);

  let code = "";
  let message = "";
  let usage: any = null;
  let retryable = status !== 400 && status !== 401 && status !== 403 && status !== 404 && status !== 422;

  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    code = String(detail.code || "");
    usage = detail.usage || null;
    if (typeof detail.message === "string") {
      message = detail.message;
    } else if (typeof detail.message === "object") {
      message = detail.message.vi || detail.message.en || "";
    }
    if (typeof detail.retryable === "boolean") {
      retryable = detail.retryable;
    }
  } else if (typeof detail === "string") {
    message = detail;
  } else {
    message = String(errObj?.message || "");
  }

  const userMessage = getFriendlyErrorMessage(err, fallback);

  return {
    code,
    message,
    userMessage,
    status,
    usage,
    retryable,
  };
}
