import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";

export interface UseAppleAuthOptions {
  onSuccess: (credential: AppleAuthentication.AppleAuthenticationCredential) => Promise<void> | void;
  onError?: (error: string) => void;
}

export function useAppleAuth({ onSuccess, onError }: UseAppleAuthOptions) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync()
        .then((available) => {
          if (mounted) setIsAvailable(Boolean(available));
        })
        .catch(() => {
          if (mounted) setIsAvailable(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async () => {
    if (!isAvailable) return;
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      await onSuccess(credential);
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED") {
        // User cancelled Apple sign-in modal, do not report an error
        return;
      }
      onError?.(e?.message || "Đăng nhập Apple không thành công");
    } finally {
      setLoading(false);
    }
  };

  return {
    signIn,
    isAvailable,
    loading,
  };
}
