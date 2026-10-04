import React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { AppText } from "../ui/AppText";
import { Volume2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import ScoreWords from "./ScoreWords";
import type { WordAlignmentItem } from "@/types";

export interface PracticePromptCardProps {
  text?: string | null;
  words?: any[];
  alignment?: WordAlignmentItem[];
  showResultDetails?: boolean;
  loadingIpa?: boolean;
  onPlaySample?: () => void;
  samplePlaying?: boolean;
  translationVi?: string | null;
  showTranslation?: boolean;
}

export default function PracticePromptCard({
  text,
  words = [],
  alignment,
  showResultDetails = false,
  loadingIpa = false,
  onPlaySample,
  samplePlaying = false,
  translationVi,
  showTranslation = false,
}: PracticePromptCardProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 22,
        paddingVertical: 22,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.08)",
        gap: 12,
        alignItems: "center",
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {/* 1. Practice Sentence: Words with IPA directly underneath each word */}
      {words && words.length > 0 ? (
        <ScoreWords
          words={words}
          alignment={alignment}
          showWord={true}
          showIpa={true}
          showResultDetails={showResultDetails}
          loadingIpa={loadingIpa}
          size="xl"
          justifyCenter={true}
        />
      ) : text ? (
        /* Fallback if words list is not yet ready */
        <AppText
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: "#0f172a",
            lineHeight: 32,
            textAlign: "center",
            letterSpacing: -0.3,
          }}
        >
          {text}
        </AppText>
      ) : null}

      {/* 2. Sample Audio Playback Action */}
      {onPlaySample ? (
        <View style={{ alignItems: "center", marginTop: 4 }}>
          <Pressable
            onPress={samplePlaying ? undefined : onPlaySample}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t("sentence.listenToSample", "Nghe phát âm mẫu")}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: pressed ? "#e0f2fe" : "#f0f9ff",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: "#bae6fd",
              opacity: samplePlaying ? 0.6 : 1,
            })}
          >
            {samplePlaying ? (
              <ActivityIndicator size="small" color="#0284c7" />
            ) : (
              <Volume2 size={17} color="#0284c7" />
            )}
          </Pressable>
        </View>
      ) : null}

      {/* 3. Optional Vietnamese translation */}
      {showTranslation && translationVi ? (
        <View
          style={{
            backgroundColor: "#F7F6F2",
            borderRadius: 12,
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            marginTop: 4,
          }}
        >
          <AppText style={{ fontSize: 13, color: "#475569", textAlign: "center" }}>
            {translationVi}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
