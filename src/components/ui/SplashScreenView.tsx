import React, { useEffect, useState } from "react";
import { Animated, Image, Text, View } from "react-native";

interface SplashScreenViewProps {
  statusText?: string;
}

export default function SplashScreenView({ statusText }: SplashScreenViewProps) {
  const [progressAnim] = useState(() => new Animated.Value(0.15));
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.92));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 0.9,
        duration: 1200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [fadeAnim, progressAnim, scaleAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View className="flex-1 bg-appBg items-center justify-between py-16 px-6">
      {/* Top spacer for status bar alignment */}
      <View className="h-6" />

      {/* Center Brand Identity (Wireframe A01 - Splash) */}
      <Animated.View
        className="items-center"
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <View className="w-24 h-24 rounded-3xl bg-appElevated items-center justify-center border border-appBorder shadow-lg shadow-black/20 mb-5">
          <Image
            source={require("@assets/logo.png")}
            className="w-16 h-16 rounded-2xl"
            resizeMode="contain"
          />
        </View>

        <Text className="text-3xl font-black text-appText tracking-tight">
          EarlySigns
        </Text>

        <Text className="text-sm font-medium text-appTextSecondary mt-2 tracking-wide">
          Speak. Improve. Go Further.
        </Text>
      </Animated.View>

      {/* Bottom Loading Progress Bar */}
      <View className="w-full max-w-[200px] items-center gap-2">
        <View className="w-full h-1.5 bg-appElevated rounded-full overflow-hidden border border-appBorder/50">
          <Animated.View
            className="h-full bg-accent rounded-full"
            style={{ width: progressWidth }}
          />
        </View>
        {statusText ? (
          <Text className="text-[11px] text-appTextMuted font-medium tracking-tight">
            {statusText}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
