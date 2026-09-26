import "react-native-gesture-handler";
import "./global.css";
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/core/queryClient";
import Toast from "react-native-toast-message";

import { LogBox } from "react-native";
import { configureReanimatedLogger, ReanimatedLogLevel } from "react-native-reanimated";
import { setupProductionConsoleGuard } from "@/core/logger";
import { AuthProvider } from "@/services/Auth";
import { getStoredLanguage, initI18n } from "@/core/i18n";
import { hydrateStorage } from "@/services/storage";
import { initNotifications } from "@/services/notifications";
import { NavigationContainer } from "@react-navigation/native";
import RootNavigator, { navTheme } from "@/navigation/RootNavigator";
import DevNetworkInspector from "@/components/dev/DevNetworkInspector";

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
    (async () => {
      try {
        await hydrateStorage();
        const stored = await getStoredLanguage();
        await initI18n(stored === "en" ? "en" : "vi");
        initNotifications();
      } catch {
        // proceed even if error occurs
      } finally {
        if (!cancelled) {
          setBooted(true);
          await SplashScreen.hideAsync().catch(() => {});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!booted) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer theme={navTheme}>
            <StatusBar style="dark" />
            <RootNavigator />
            <DevNetworkInspector />
            <Toast />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
