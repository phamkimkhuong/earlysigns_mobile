import { useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri, useAuthRequest, ResponseType } from "expo-auth-session";
import { GOOGLE_CLIENT_ID } from "@/core/config";
import { showToast } from "@/utils/toast";

WebBrowser.maybeCompleteAuthSession();

const googleDiscovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

export interface UseGoogleAuthOptions {
  onSuccess: (tokens: { idToken?: string; accessToken?: string }) => Promise<void> | void;
  onError?: (error: string) => void;
}

export function useGoogleAuth({ onSuccess, onError }: UseGoogleAuthOptions) {
  const [loading, setLoading] = useState(false);

  const redirectUri = makeRedirectUri({
    scheme: "earlysigns",
    preferLocalhost: false,
  });

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID || "not_configured",
      scopes: ["openid", "profile", "email"],
      responseType: ResponseType.IdToken,
      redirectUri,
    },
    googleDiscovery
  );

  useEffect(() => {
    if (!response) return;

    if (response.type === "success") {
      setLoading(true);
      const { id_token, access_token } = response.params;
      Promise.resolve(onSuccess({ idToken: id_token, accessToken: access_token }))
        .catch((err: any) => {
          onError?.(err?.message || "Google sign in error");
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (response.type === "error") {
      setLoading(false);
      onError?.(response.error?.message || "Google login cancelled");
    } else if (response.type === "cancel" || response.type === "dismiss") {
      setLoading(false);
    }
  }, [response, onSuccess, onError]);

  const signIn = async () => {
    if (!GOOGLE_CLIENT_ID) {
      showToast.error(
        "Thiếu cấu hình",
        "Chưa cài đặt EXPO_PUBLIC_GOOGLE_CLIENT_ID trong file .env"
      );
      return;
    }
    setLoading(true);
    try {
      await promptAsync();
    } catch (e: any) {
      setLoading(false);
      onError?.(e?.message || "Failed to start Google sign in");
    }
  };

  return {
    signIn,
    loading: loading || !request,
    isReady: Boolean(request && GOOGLE_CLIENT_ID),
  };
}
