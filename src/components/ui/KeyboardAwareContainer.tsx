import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleProp,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from "react-native";

export interface KeyboardAwareContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  extraScrollHeight?: number;
  scrollEnabled?: boolean;
  bounces?: boolean;
  autoScroll?: boolean;
}

/**
 * Universal Keyboard-Aware Container designed specifically for Expo Go & Production.
 *
 * Why this architecture works when KeyboardAvoidingView fails:
 * 1. Expo Go on Android does NOT respect `softwareKeyboardLayoutMode` from app.json
 *    because Expo Go is a precompiled binary using Edge-to-Edge mode.
 * 2. React Native's core KeyboardAvoidingView fails to calculate proper offsets on
 *    many Android devices and Expo Go containers.
 * 3. This component subscribes directly to native Keyboard lifecycle events
 *    (keyboardDidShow / keyboardWillShow) across both iOS and Android.
 * 4. It dynamically injects a keyboard spacer at the bottom of the ScrollView
 *    and smoothly auto-scrolls to ensure the focused input and submit action
 *    remain 100% visible and accessible.
 * 5. When dismissed (via tap outside or swipe on-drag), the spacer gracefully
 *    collapses to 0.
 */
export default function KeyboardAwareContainer({
  children,
  style,
  contentContainerStyle,
  extraScrollHeight = 30,
  scrollEnabled = true,
  bounces = true,
  autoScroll = true,
}: KeyboardAwareContainerProps) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates?.height || 0;
      setKeyboardHeight(h);

      if (autoScroll) {
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, Platform.OS === "android" ? 120 : 60);
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [autoScroll]);

  return (
    <View style={[{ flex: 1 }, style]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        {scrollEnabled ? (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            bounces={bounces}
          >
            {children}
            {keyboardHeight > 0 ? (
              <View style={{ height: keyboardHeight + extraScrollHeight }} />
            ) : null}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, contentContainerStyle]}>{children}</View>
        )}
      </TouchableWithoutFeedback>
    </View>
  );
}
