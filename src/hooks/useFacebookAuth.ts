import { useState } from "react";
import { useTranslation } from "react-i18next";
import { loginWithFacebook, FacebookLoginResult } from "@/services/facebookAuth";

export interface UseFacebookAuthOptions {
  onSuccess: (result: FacebookLoginResult) => Promise<void> | void;
  onError?: (error: string) => void;
}

export function useFacebookAuth({ onSuccess, onError }: UseFacebookAuthOptions) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    try {
      const res = await loginWithFacebook();
      if (res.cancelled) {
        return;
      }
      if (res.success) {
        await Promise.resolve(onSuccess(res));
      } else {
        onError?.(res.error || t("login.facebookSignInFailed"));
      }
    } catch (e: any) {
      onError?.(e?.message || t("login.facebookSignInFailed"));
    } finally {
      setLoading(false);
    }
  };

  return {
    signIn,
    loading,
  };
}
