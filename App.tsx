import "react-native-gesture-handler";
import "./global.css";
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/core/queryClient";
import Toast from "react-native-toast-message";

import { AppState, LogBox } from "react-native";
import { configureReanimatedLogger, ReanimatedLogLevel } from "react-native-reanimated";
import { setupProductionConsoleGuard } from "@/core/logger";
import { AuthProvider } from "@/services/Auth";
import { getStoredLanguage, initI18n } from "@/core/i18n";
import { getItem, hydrateStorage } from "@/services/storage";
import {
  initNotifications,
  setupNotificationResponseListener,
  setupPushTokenRefreshListener,
  syncPushTokenWithBackend,
  deactivateDeviceOnPermissionRevoke,
} from "@/services/notifications";
import { initRevenueCat } from "@/services/iap";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "@/navigation/nav";
import RootNavigator, { navTheme } from "@/navigation/RootNavigator";
import CustomAlertModal from "@/components/ui/CustomAlertModal";
import { toastConfig } from "@/components/ui/CustomToast";

// Neutralize noisy console outputs in production while keeping error trackers intact
setupProductionConsoleGuard();

// Disable Reanimated strict mode to silence internal reading/writing to value warnings from third-party navigation components
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

// Ignore harmless third-party deprecation and animation warnings
LogBox.ignoreLogs([
  "props.pointerEvents is deprecated",
  "[Reanimated] Reading from `value` during component render",
  "[Reanimated] Writing to `value` during component render",
]);

// Keep native splash screen visible while app hydrates
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let cleanupNotifListener = () => {};
    let cleanupRefreshListener = () => {};

    (async () => {
      try {
        await hydrateStorage();
        const stored = await getStoredLanguage();
        await initI18n(stored === "en" ? "en" : "vi");
        initNotifications();
        cleanupNotifListener = setupNotificationResponseListener();
        cleanupRefreshListener = setupPushTokenRefreshListener();
        syncPushTokenWithBackend().catch(() => {});
        const savedUserId = getItem("earlysigns_auth_user_id") || undefined;
        initRevenueCat(savedUserId).catch(() => {});
      } catch {
        // proceed even if error occurs
      } finally {
        if (!cancelled) {
          setBooted(true);
          await SplashScreen.hideAsync().catch(() => {});
        }
      }
    })();
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        deactivateDeviceOnPermissionRevoke().catch(() => {});
        syncPushTokenWithBackend().catch(() => {});
      }
    });

    return () => {
      cancelled = true;
      cleanupNotifListener();
      cleanupRefreshListener();
      appStateSub.remove();
    };
  }, []);

  if (!booted) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer theme={navTheme} ref={navigationRef}>
            <StatusBar style="dark" />
            <RootNavigator />
            <CustomAlertModal />
            <Toast config={toastConfig} topOffset={54} />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
