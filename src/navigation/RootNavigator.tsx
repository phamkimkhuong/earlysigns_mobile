import { DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { Home, User } from "lucide-react-native";
import { useAuth } from "@/services/Auth";
import { colors } from "@/core/theme";
import SplashScreenView from "@/components/ui/SplashScreenView";
import type { MainTabParamList, RootStackParamList } from "@/types/navigation";
import {
  HomeScreen,
  VideosScreen,
  TextPracticeScreen,
  PhonemesScreen,
  JourneyScreen,
  ProfileScreen,
  VideoPracticeScreen,
  TermsScreen,
  PrivacyScreen,
  ReferralScreen,
  AboutScreen,
  OnboardingScreen,
  LoginScreen,
  PaymentScreen,
  PaymentWebViewScreen,
  PaymentResultScreen,
} from "@/screens";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

export const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bgElevated,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

function MainTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      id="main-tabs"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.bgElevated, borderTopColor: colors.border },
        tabBarIcon: ({ color, size, focused }) => {
          const strokeWidth = focused ? 2.4 : 1.8;
          const iconSize = size - 2;
          switch (route.name) {
            case "Home":
              return <Home size={iconSize} color={color} strokeWidth={strokeWidth} />;
            case "Profile":
              return <User size={iconSize} color={color} strokeWidth={strokeWidth} />;
            default:
              return null;
          }
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t("nav.home") || "Trang chủ" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t("nav.profile") || "Trang cá nhân" }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { t } = useTranslation();
  const { ready, authLoading, hasOnboarded } = useAuth();

  if (!ready || authLoading) {
    return <SplashScreenView statusText={t("auth.checkingSession") || "Đang kiểm tra phiên..."} />;
  }

  return (
    <Stack.Navigator
      id="root-stack"
      initialRouteName={hasOnboarded ? "Main" : "Onboarding"}
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Videos" component={VideosScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Text" component={TextPracticeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Phonemes" component={PhonemesScreen} options={{ title: t("nav.phonemes") }} />
      <Stack.Screen name="Journey" component={JourneyScreen} options={{ title: t("home.journey.viewAll") }} />
      <Stack.Screen
        name="VideoPractice"
        component={VideoPracticeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Terms" component={TermsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Referral" component={ReferralScreen} options={{ title: t("referral.pageTitle") }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: t("nav.intro") }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: t("login.title") }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PaymentWebView" component={PaymentWebViewScreen} options={{ title: t("package.planName") }} />
      <Stack.Screen name="PaymentResult" component={PaymentResultScreen} options={{ title: t("package.planName") }} />
    </Stack.Navigator>
  );
}
