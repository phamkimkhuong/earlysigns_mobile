import React, { useMemo } from "react";
import { Text, type TextStyle, type StyleProp } from "react-native";
import { parseInlineHtml } from "@/utils/phonemeInstructionParser";

interface FormattedHtmlTextProps {
  html: string;
  style?: StyleProp<TextStyle>;
  boldStyle?: StyleProp<TextStyle>;
  italicStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export default function FormattedHtmlText({
  html,
  style,
  boldStyle,
  italicStyle,
  numberOfLines,
}: FormattedHtmlTextProps) {
  const tokens = useMemo(() => parseInlineHtml(html), [html]);

  if (!tokens || tokens.length === 0) {
    return null;
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {tokens.map((token, index) => {
        const itemStyles: StyleProp<TextStyle>[] = [];
        if (token.isBold) {
          itemStyles.push({ fontWeight: "700", color: "#37352f" }, boldStyle);
        }
        if (token.isItalic) {
          itemStyles.push({ fontStyle: "italic" }, italicStyle);
        }

        return (
          <Text key={index} style={itemStyles.length > 0 ? itemStyles : undefined}>
            {token.text}
          </Text>
        );
      })}
    </Text>
  );
}
