/**
 * Centralized Backend API Endpoints Configuration
 *
 * To change the Backend Base URL:
 * - Update EXPO_PUBLIC_API_BASE in .env (or app.json extra.apiBase)
 * - Or edit API_BASE in src/core/config.ts
 *
 * To change or version any Endpoint Path (e.g. /api/v2/...):
 * - Edit the corresponding entry in API_ENDPOINTS below.
 */

export const API_ENDPOINTS = {
  // ===========================================================================
  // 1. Authentication & Account (Xác thực & Quản lý tài khoản)
  // ===========================================================================
  AUTH: {
    /** [GET] Lấy thông tin user hiện tại từ token (email, preferences, streak, ngày tạo...) */
    ME: "/api/auth/me",
    /** [POST] Gửi mã xác thực OTP 6 số về email của người dùng */
    REQUEST_OTP: "/api/auth/request-otp",
    /** [POST] Xác minh mã OTP người dùng nhập, trả về JWT auth token & refresh token */
    VERIFY_OTP: "/api/auth/verify-otp",
    /** [POST] Đăng nhập/Đăng ký nhanh bằng tài khoản Google (idToken, accessToken) */
    GOOGLE: "/api/auth/google",
    /** [POST] Đăng nhập/Đăng ký nhanh bằng Apple ID trên thiết bị iOS (identityToken) */
    APPLE: "/api/auth/apple",
    /** [POST] Đăng xuất tài khoản, thu hồi token trên hệ thống */
    LOGOUT: "/api/auth/logout",
    /** [POST] Lưu cài đặt cá nhân (giọng phát âm uk/us, ngôn ngữ hiển thị vi/en, nhắc nhở...) */
    PREFERENCES: "/api/auth/preferences",
    /** [POST] Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu người dùng (chuẩn Apple/Google) */
    DELETE_ACCOUNT: "/api/auth/delete-account",
  },

  // ===========================================================================
  // 2. Pronunciation AI Check Engine (Lõi AI chấm điểm phát âm)
  // ===========================================================================
  /**
   * [POST] Gửi file ghi âm giọng nói (.wav/.m4a) kèm văn bản mẫu & giọng chuẩn (uk/us).
   * AI phân tích chấm điểm tổng quan, độ chính xác (accuracy), độ trôi chảy (fluency)
   * và highlight chi tiết từng từ/âm IPA phát âm đúng hay sai.
   */
  CHECK: "/api/check/",

  // ===========================================================================
  // 3. Lessons & Learning Journey (Bài học & Lộ trình luyện phát âm)
  // ===========================================================================
  LESSONS: {
    /** [GET] Tóm tắt tiến độ cho trang chủ (streak, âm cần cải thiện, bài học tiếp theo) */
    HOME_SUMMARY: (dialect: string = "uk") =>
      `/api/lessons/home-summary?dialect=${encodeURIComponent(dialect)}`,
    /** [GET] Lộ trình bài học cá nhân hóa theo điểm yếu từ bài khảo sát đầu vào (screening) */
    PERSONALIZED: (dialect: string = "uk", lazyAssets: boolean = true) =>
      `/api/lessons/personalized?dialect=${encodeURIComponent(dialect)}${
        lazyAssets ? "&lazy_assets=true" : ""
      }`,
    /** [GET] Chi tiết 1 âm vị IPA cụ thể (video khẩu hình, vị trí đặt lưỡi/môi, từ & câu luyện mẫu) */
    PHONEME: (phoneme: string, dialect: string = "uk", lazyAssets: boolean = true) =>
      `/api/lessons/phoneme/${encodeURIComponent(phoneme)}?dialect=${encodeURIComponent(dialect)}${
        lazyAssets ? "&lazy_assets=true" : ""
      }`,
    /** [POST] Ghi nhận đã hoàn thành bài tập cho danh sách các âm vị (cập nhật chuỗi streak) */
    PRACTICED: "/api/lessons/practiced",
    /** [POST] Đánh dấu hoàn thành toàn bộ chặng lộ trình hiện tại để mở khóa chặng tiếp theo */
    JOURNEY_COMPLETE: "/api/lessons/journey-complete",
  },

  // ===========================================================================
  // 4. Initial Screening Assessment (Khảo sát chẩn đoán phát âm ban đầu)
  // ===========================================================================
  SCREENING: {
    /** [GET] Lấy danh sách câu mẫu bao quát 44 âm IPA để người dùng đọc kiểm tra đầu vào */
    SENTENCES: (dialect: string = "uk") =>
      `/api/screening/sentences?dialect=${encodeURIComponent(dialect)}`,
    /** [POST] Đánh dấu hoàn tất bài test đầu vào để AI tính toán ma trận năng lực ban đầu */
    COMPLETE: "/api/screening/complete",
  },

  // ===========================================================================
  // 5. YouTube Video Practice Catalog (Luyện phát âm qua video YouTube)
  // ===========================================================================
  VIDEOS: {
    /** [GET] Danh sách video YouTube phân trang theo chủ đề và trình độ CEFR (A1-C2) */
    LIST: "/api/videos/",
    /** [GET] Danh sách các chủ đề video (Daily Conversation, Business, Travel, Movies...) */
    TOPICS: "/api/videos/topics",
    /** [GET] Lịch sử các video người dùng đã từng xem hoặc luyện tập gần đây */
    VIEWED: (limit?: number) =>
      limit ? `/api/videos/viewed?limit=${encodeURIComponent(String(limit))}` : "/api/videos/viewed",
    /** [GET] Chi tiết video: metadata, thời lượng, danh sách phân đoạn (segments) phụ đề */
    DETAIL: (youtubeId: string) => `/api/videos/${encodeURIComponent(youtubeId)}`,
    /** [POST] Ghi nhận thời điểm bắt đầu xem/luyện một video (analytics & tracking học tập) */
    VIEW_START: (youtubeId: string) =>
      `/api/videos/${encodeURIComponent(youtubeId)}/view/start`,
    /** [POST] Ghi nhận đã hoàn thành luyện nói 1 câu phân đoạn (segment) phụ đề */
    VIEW_SEGMENT: (youtubeId: string) =>
      `/api/videos/${encodeURIComponent(youtubeId)}/view/segment`,
    /** [POST] Lấy phiên âm IPA chuẩn theo giọng (UK/US) cho phụ đề của đoạn video */
    SEGMENT_IPA: "/api/videos/segment-ipa",
  },

  // ===========================================================================
  // 6. Free Text & Camera OCR Practice (Luyện đọc văn bản tự do & Chụp ảnh OCR)
  // ===========================================================================
  TEXT_PRACTICE: {
    /** [POST] Phân tích đoạn văn bản người dùng nhập (chia câu, đánh giá độ khó, từ vựng) */
    PREPARE: "/api/prepare/",
    /** [POST/Upload] Quét trích xuất chữ tiếng Anh từ hình ảnh (chụp từ camera hoặc thư viện) */
    OCR: "/api/text-practice/ocr",
    /** [POST] Chuyển đổi toàn bộ văn bản tùy ý thành phiên âm IPA chi tiết kèm trọng âm */
    IPA: "/api/text-practice/ipa",
    /** [POST] Tạo file âm thanh giọng đọc người bản xứ (TTS) cho văn bản để luyện Shadowing */
    AUDIO: "/api/text-practice/audio",
    /** [GET/POST] Lấy danh sách hoặc lưu các bài đọc văn bản yêu thích của người dùng */
    PASSAGES: "/api/history/passages",
  },

  // ===========================================================================
  // 7. Progress & Historical Charts (Tiến độ & Biểu đồ thống kê học tập)
  // ===========================================================================
  PROGRESS: {
    /** [GET] Lấy điểm số thành thạo của toàn bộ 44 âm IPA (Xanh/Vàng/Đỏ) theo giọng UK/US */
    SOUNDS: (dialect: string = "uk") =>
      `/api/progress/sounds?dialect=${encodeURIComponent(dialect)}`,
    /** [GET] Lịch sử điểm số phát âm theo khoảng ngày (start -> end) để vẽ biểu đồ tiến độ */
    HISTORY: (start: string, end: string) =>
      `/api/progress/history?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    /** [POST] Ghi nhận điểm số của từng âm sau mỗi lượt phát âm để cập nhật liên tục biểu đồ */
    LOG_SOUND: "/api/progress/sounds/log",
  },

  // ===========================================================================
  // 8. Billing, Quotas & In-App Purchases (Gói cước, Quản lý Pro & Thanh toán)
  // ===========================================================================
  BILLING: {
    /** [GET] Xem hạn mức sử dụng (số lượt chấm AI còn lại trong ngày, trạng thái gói Pro) */
    USAGE: "/api/billing/usage",
    /** [GET] Danh sách các gói đăng ký Pro (Gói Tháng, Gói Năm, Trọn đời) kèm bảng giá */
    PACKAGES: "/api/billing/packages",
    /** [GET] Lấy hồ sơ thông tin thanh toán đã lưu và email tài khoản */
    PROFILE: "/api/billing/profile",
    /** [POST] Khởi tạo giao dịch thanh toán PayOS (trả về checkout_url & order_code) */
    CHECKOUT: "/api/billing/checkout",
    /** [GET] Lấy lịch sử các giao dịch thanh toán thành công của người dùng */
    HISTORY: "/api/billing/history",
    /** [POST] Nhập mã quà tặng / Campaign code chung (kích hoạt ưu đãi 3 tháng Pro) */
    ACTIVATE_CODE: "/api/billing/activate-code",
    /** [GET] Xem chi tiết trạng thái chương trình giới thiệu (mã cá nhân, hạn 24h, quyền nhập mã) */
    REFERRAL_STATUS: "/api/billing/referral",
    /** [POST] Tạo mã giới thiệu riêng cho tài khoản (nếu chưa từng tạo) */
    REFERRAL_GENERATE: "/api/billing/referral/generate",
    /** [POST] Áp dụng mã giới thiệu của bạn bè (nhận thưởng 2 chiều 7 ngày Pro) */
    REFERRAL_REDEEM: "/api/billing/referral/redeem",
    /** [POST] Xác thực biên lai thanh toán In-App Purchase từ Apple App Store hoặc Google Play (Mobile fallback) */
    IAP_VERIFY: "/api/billing/iap-verify",
    /** [POST] Khôi phục gói Pro đã mua khi người dùng đổi máy hoặc cài lại ứng dụng (Mobile fallback) */
    IAP_RESTORE: "/api/billing/iap-restore",
    /** [GET] Xác thực trạng thái giao dịch thanh toán trực tuyến theo mã đơn hàng orderCode */
    CHECKOUT_VERIFY: (orderCode: string) =>
      `/api/billing/checkout/verify?order_code=${encodeURIComponent(orderCode)}`,
  },

  // ===========================================================================
  // 9. Feedback & In-App Support (Phản hồi & Góp ý người dùng)
  // ===========================================================================
  /** [POST] Gửi tin nhắn phản hồi / ý kiến đóng góp của người dùng lên hệ thống */
  FEEDBACK: "/api/feedback/",

  // ===========================================================================
  // 10. Error Telemetry Reporting (Báo cáo lỗi & Giám sát hệ thống)
  // ===========================================================================
  /** [POST] Gửi báo cáo log crash hoặc sự cố mạng bất thường về server để kịp thời giám sát */
  ERROR_REPORT: "/api/error-report/",
} as const;

export default API_ENDPOINTS;
