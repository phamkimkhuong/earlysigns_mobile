import * as Haptics from "expo-haptics";

/**
 * Native mobile haptic feedback triggers (iOS Taptic Engine & Android Haptic Motor).
 */
export const hapticFeedback = {
  light: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Safe fallback on simulators or devices without haptic motors
    }
  },
  medium: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Safe fallback
    }
  },
  heavy: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // Safe fallback
    }
  },
  selection: async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // Safe fallback
    }
  },
  success: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Safe fallback
    }
  },
  warning: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // Safe fallback
    }
  },
  error: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Safe fallback
    }
  },
};
