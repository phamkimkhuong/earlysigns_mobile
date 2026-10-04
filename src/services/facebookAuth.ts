import { Platform } from "react-native";
import { randomUUID } from "expo-crypto";
import { AccessToken, AuthenticationToken, LoginManager } from "react-native-fbsdk-next";
import i18n from "@/core/i18n";
import type { FacebookLoginResult } from "@/types/facebookAuth";
export type { FacebookLoginResult } from "@/types/facebookAuth";

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
    // Clear cached credentials so a previous account cannot satisfy this attempt.
    LoginManager.logOut();
    const nonce = Platform.OS === "ios" ? randomUUID() : undefined;
    const permissions = ["public_profile", "email"];
    const result = nonce
      ? await LoginManager.logInWithPermissions(permissions, "limited", nonce)
      : await LoginManager.logInWithPermissions(permissions);
    if (result.isCancelled) {
      return { success: false, cancelled: true };
    }
    if (nonce) {
      const credential = await AuthenticationToken.getAuthenticationTokenIOS();
      if (!credential?.authenticationToken || credential.nonce !== nonce) {
        return { success: false, error: i18n.t("login.facebookSignInFailed") };
      }
      // The backend must verify the JWT signature, claims, nonce and replay protection.
      return { success: true, tokenType: "id_token", idToken: credential.authenticationToken, nonce };
    }
    const currentToken = await AccessToken.getCurrentAccessToken();
    if (!currentToken?.accessToken) {
      return {
        success: false,
        error:
          i18n.t("login.facebookMissingToken") ||
          "Failed to get access token from Facebook.",
      };
    }
    return {
      success: true,
      tokenType: "access_token",
      accessToken: currentToken.accessToken,
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
