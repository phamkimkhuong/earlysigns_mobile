import React, { forwardRef } from "react";
import {
  StyleSheet,
  Text as RNText,
  TextProps as RNTextProps,
  TextStyle,
} from "react-native";

export type AppFontWeight =
  | "normal"
  | "regular"
  | "medium"
  | "semibold"
  | "bold"
  | "extrabold"
  | "black";

export interface AppTextProps extends RNTextProps {
  weight?: AppFontWeight;
  className?: string;
}

const getFontFamilyForWeight = (
  fontWeight?: TextStyle["fontWeight"],
  explicitWeight?: AppFontWeight
): string => {
  const w = explicitWeight || fontWeight;
  switch (w) {
    case "900":
    case "black":
      return "Inter_900Black";
    case "800":
    case "extrabold":
      return "Inter_800ExtraBold";
    case "700":
    case "bold":
      return "Inter_700Bold";
    case "600":
    case "semibold":
      return "Inter_600SemiBold";
    case "500":
    case "medium":
      return "Inter_500Medium";
    case "400":
    case "normal":
    case "regular":
    default:
      return "Inter_400Regular";
  }
};

export const AppText = forwardRef<RNText, AppTextProps>(
  ({ style, weight, children, ...rest }, ref) => {
    const flattened = StyleSheet.flatten(style);
    const customFontFamily = flattened?.fontFamily;
    const targetFontFamily =
      customFontFamily || getFontFamilyForWeight(flattened?.fontWeight, weight);

    return (
      <RNText
        ref={ref}
        style={[{ fontFamily: targetFontFamily }, style]}
        {...rest}
      >
        {children}
      </RNText>
    );
  }
);

AppText.displayName = "AppText";

export default AppText;
