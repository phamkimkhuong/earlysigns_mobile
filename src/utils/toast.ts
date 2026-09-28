import Toast from "react-native-toast-message";
import i18n from "@/core/i18n";
import { getFriendlyErrorMessage } from "@/core/errorManager";

export type ToastMessageInput = string | { vi: string; en: string };

/**
 * Resolves a message or title:
 * 1. If it's an object { vi, en }, pick by active language.
 * 2. If it's a string matching an i18n translation key, translate via i18n.t(key, params).
 * 3. Otherwise, return the string as is.
 */
export function resolveToastText(
  input?: ToastMessageInput | null,
  params?: Record<string, any>
): string {
  if (!input) return "";
  if (typeof input === "object") {
    const lang = String(i18n.language || "vi").toLowerCase().startsWith("en") ? "en" : "vi";
    return input[lang] || input.vi || input.en || "";
  }
  if (typeof input === "string") {
    if (i18n.isInitialized && i18n.exists(input)) {
      const translated = i18n.t(input, params as any);
      return typeof translated === "string" ? translated : String(translated ?? "");
    }
    return input;
  }
  return String(input);
}

/**
 * Smart Toast Manager with multi-language i18n resolution,
 * automatic default localized titles, and direct API error handling.
 */
export const showToast = {
  /**
   * Show success toast.
   * - 1 argument: showToast.success("login.loginSuccess") -> Title: "Thành công" / "Success", Body: translated text
   * - 2 arguments: showToast.success("common.success", "login.loginSuccess")
   */
  success: (
    titleOrMessage: ToastMessageInput,
    message?: ToastMessageInput,
    params?: Record<string, any>
  ) => {
    const hasExplicitMessage = message !== undefined && message !== "";
    const title = hasExplicitMessage
      ? resolveToastText(titleOrMessage, params)
      : resolveToastText("common.success") || "Thành công";
    const body = hasExplicitMessage
      ? resolveToastText(message, params)
      : resolveToastText(titleOrMessage, params);

    Toast.show({
      type: "success",
      text1: title,
      text2: body,
      position: "top",
      visibilityTime: 3000,
    });
  },

  /**
   * Show error toast.
   * - 1 argument: showToast.error("login.otpSendFailed") -> Title: "Lỗi" / "Error", Body: translated text
   * - 2 arguments: showToast.error("common.error", "Chi tiết lỗi")
   */
  error: (
    titleOrMessage: ToastMessageInput,
    message?: ToastMessageInput,
    params?: Record<string, any>
  ) => {
    const hasExplicitMessage = message !== undefined && message !== "";
    const title = hasExplicitMessage
      ? resolveToastText(titleOrMessage, params)
      : resolveToastText("common.error") || "Lỗi";
    const body = hasExplicitMessage
      ? resolveToastText(message, params)
      : resolveToastText(titleOrMessage, params);

    Toast.show({
      type: "error",
      text1: title,
      text2: body,
      position: "top",
      visibilityTime: 3500,
    });
  },

  /**
   * Show info / notice toast.
   */
  info: (
    titleOrMessage: ToastMessageInput,
    message?: ToastMessageInput,
    params?: Record<string, any>
  ) => {
    const hasExplicitMessage = message !== undefined && message !== "";
    const title = hasExplicitMessage
      ? resolveToastText(titleOrMessage, params)
      : resolveToastText("common.notice") || "Thông báo";
    const body = hasExplicitMessage
      ? resolveToastText(message, params)
      : resolveToastText(titleOrMessage, params);

    Toast.show({
      type: "info",
      text1: title,
      text2: body,
      position: "top",
      visibilityTime: 3000,
    });
  },

  /**
   * Directly handle API / Network error with auto-translation and localized title.
   * Example: showToast.apiError(err, "login.otpVerifyFailed");
   */
  apiError: (err: unknown, fallbackKeyOrTitle?: ToastMessageInput) => {
    const friendlyMsg = getFriendlyErrorMessage(
      err,
      fallbackKeyOrTitle ? resolveToastText(fallbackKeyOrTitle) : undefined
    );
    const title = resolveToastText("common.error") || "Lỗi";

    Toast.show({
      type: "error",
      text1: title,
      text2: friendlyMsg,
      position: "top",
      visibilityTime: 3500,
    });
  },

  hide: () => {
    Toast.hide();
  },
};

export default Toast;
