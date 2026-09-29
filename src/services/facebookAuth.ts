import { Platform } from "react-native";
import { AccessToken, LoginManager } from "react-native-fbsdk-next";
import i18n from "@/core/i18n";

export interface FacebookLoginResult {
  success: boolean;
  cancelled?: boolean;
  accessToken?: string;
  userId?: string;
  error?: string;
}

const isNativeMobile = Platform.OS === "android" || Platform.OS === "ios";

export async function loginWithFacebook(): Promise<FacebookLoginResult> {
  if (!isNativeMobile) {
    return {
      success: false,
      error:
        i18n.t("login.facebookOnlyNative") ||
        "Facebook Login is only available on iOS/Android native client.",
    };
  }
  try {
    LoginManager.logOut();
    const result = await LoginManager.logInWithPermissions([
      "public_profile",
      "email",
    ]);
    if (result.isCancelled) {
      return { success: false, cancelled: true };
    }
    const currentToken = await AccessToken.getCurrentAccessToken();
    if (!currentToken) {
      return {
        success: false,
        error:
          i18n.t("login.facebookMissingToken") ||
          "Failed to get access token from Facebook.",
      };
    }
    return {
      success: true,
      accessToken: currentToken.accessToken,
      userId: currentToken.userID,
    };
  } catch (err: any) {
    return {
      success: false,
      error:
        err?.message ||
        i18n.t("login.facebookSignInFailed") ||
        "Facebook Login failed.",
    };
  }
}

export async function logoutFacebook(): Promise<void> {
  if (isNativeMobile) {
    try {
      LoginManager.logOut();
    } catch {
      /* ignore */
    }
  }
}
