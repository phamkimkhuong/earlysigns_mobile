import React, { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ArrowRight, Lightbulb, X } from "lucide-react-native";
import FormattedHtmlText from "@/components/practice/FormattedHtmlText";
import { parseSequentialHtml } from "@/utils/phonemeInstructionParser";
import { hapticFeedback } from "@/utils/haptics";
import type { IpaSoundMeta } from "@/utils/ipaData";

interface PhonemeIntroGuideProps {
  visible: boolean;
  phoneme: string;
  dialect?: string;
  lessonData: any;
  soundMeta?: IpaSoundMeta;
  onClose: () => void;
}

export default function PhonemeIntroGuide({
  visible,
  phoneme,
  dialect = "uk",
  lessonData,
  soundMeta,
  onClose,
}: PhonemeIntroGuideProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  // 1. Language: Automatically determined by active app language (no manual UI toggle)
  const isVi = (i18n.language || "vi").toLowerCase().startsWith("vi");

  // 2. Clean target phoneme
  const cleanPhoneme = useMemo(
    () => String(phoneme || "").replace(/^\/+|\/+$/g, "").trim(),
    [phoneme]
  );

  // 3. Instructions selection
  const rawHtml = useMemo(() => {
    if (!lessonData) return "";
    if (isVi) {
      return lessonData.vi_instructions || lessonData.en_instructions || "";
    }
    return lessonData.en_instructions || lessonData.vi_instructions || "";
  }, [lessonData, isVi]);

  // 4. Sequential linear blocks (preserves exact natural ordering without rigid tabs)
  const blocks = useMemo(() => parseSequentialHtml(rawHtml), [rawHtml]);

  const totalExercises = useMemo(() => {
    const count = Array.isArray(lessonData?.items)
      ? lessonData.items.length
      : Array.isArray(lessonData?.sentences)
        ? lessonData.sentences.length
        : 10;
    return count || 10;
  }, [lessonData]);

  // Sound classification fallback
  const soundClassification = useMemo(() => {
    if (soundMeta?.category === "consonant") {
      return isVi ? "Phụ âm chuẩn IPA" : "IPA Consonant";
    }
    if (soundMeta?.category === "monophthong") {
      return isVi ? "Nguyên âm đơn" : "Monophthong Vowel";
    }
    if (soundMeta?.category === "diphthong") {
      return isVi ? "Nguyên âm đôi" : "Diphthong Vowel";
    }
    return isVi ? "Âm vị IPA" : "IPA Phoneme";
  }, [soundMeta?.category, isVi]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#0a2644" }}>
        {/* 1. TOP APP BAR */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.close", "Đóng")}
            onPress={() => {
              hapticFeedback.light();
              onClose();
            }}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.12)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.18)",
            })}
          >
            <X size={20} color="#ffffff" />
          </Pressable>

          {/* Center Title & Dialect Badge */}
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#ffffff" }}>
              {isVi ? `Hướng dẫn âm /${cleanPhoneme}/` : `Guide for /${cleanPhoneme}/`}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 1.5,
                  borderRadius: 12,
                  backgroundColor: "rgba(56, 189, 248, 0.16)",
                  borderWidth: 1,
                  borderColor: "rgba(56, 189, 248, 0.35)",
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#7dd3fc" }}>
                  {dialect.toUpperCase()} {dialect.toLowerCase() === "uk" ? "🇬🇧" : "🇺🇸"}
                </Text>
              </View>
            </View>
          </View>

          {/* Close Action Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.close", "Đóng")}
            onPress={() => {
              hapticFeedback.light();
              onClose();
            }}
            style={({ pressed }) => ({
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 12,
              backgroundColor: pressed ? "rgba(255, 255, 255, 0.2)" : "transparent",
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#ffffff" }}>
              {isVi ? "Đóng" : "Close"}
            </Text>
          </Pressable>
        </View>

        {/* 2. MAIN SCROLL CONTAINER */}
        <View
          style={{
            flex: 1,
            backgroundColor: "#f8fafc",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            overflow: "hidden",
          }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 18,
              paddingBottom: 24,
              gap: 14,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* A. HERO PHONETIC CARD */}
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 24,
                padding: 18,
                borderWidth: 1.5,
                borderColor: "#e2eaf2",
                shadowColor: "#0c2340",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 10 }}>
                  <View
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 18,
                      backgroundColor: "#eff6ff",
                      borderWidth: 1.5,
                      borderColor: "#bfdbfe",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 26,
                        fontWeight: "900",
                        color: "#0369a1",
                        includeFontPadding: false,
                      }}
                    >
                      /{cleanPhoneme}/
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        alignSelf: "flex-start",
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 10,
                        backgroundColor: "#f0fdf4",
                        borderWidth: 1,
                        borderColor: "#bbf7d0",
                        marginBottom: 4,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#15803d" }} numberOfLines={1}>
                        {soundClassification}
                      </Text>
                    </View>

                    {soundMeta?.example ? (
                      <Text style={{ fontSize: 13, color: "#64748b", fontWeight: "500" }}>
                        {isVi ? "Từ mẫu" : "Examples"}:{" "}
                        <Text style={{ fontWeight: "700", color: "#0f172a" }}>{soundMeta.example}</Text>
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Quick Action Button: Close Modal and Practice */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isVi ? "Vào luyện tập" : "Practice"}
                  onPress={() => {
                    hapticFeedback.medium();
                    onClose();
                  }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 16,
                    backgroundColor: pressed ? "#0369a1" : "#0284c7",
                    shadowColor: "#0284c7",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 5,
                    elevation: 3,
                  })}
                >
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#ffffff" }}>
                    {isVi ? "Vào luyện tập" : "Practice"}
                  </Text>
                  <ArrowRight size={16} color="#ffffff" strokeWidth={2.5} />
                </Pressable>
              </View>
            </View>

            {/* B. SEQUENTIAL INSTRUCTION CONTENT (No tabs, clean vertical flow) */}
            {blocks.map((block, idx) => {
              if (block.type === "heading") {
                return (
                  <Text
                    key={idx}
                    style={{
                      fontSize: 16,
                      fontWeight: "800",
                      color: "#0c2340",
                      marginTop: 6,
                    }}
                  >
                    {block.text}
                  </Text>
                );
              }

              if (block.type === "paragraph") {
                if (block.isTip) {
                  return (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: "#fffbeb",
                        borderRadius: 18,
                        padding: 15,
                        borderWidth: 1.5,
                        borderColor: "#fde68a",
                        flexDirection: "row",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <Lightbulb size={20} color="#d97706" style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <FormattedHtmlText
                          html={block.html}
                          style={{ fontSize: 14, color: "#78350f", lineHeight: 22 }}
                          boldStyle={{ fontWeight: "800", color: "#92400e" }}
                          italicStyle={{ fontStyle: "italic", fontWeight: "600" }}
                        />
                      </View>
                    </View>
                  );
                }

                return (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: 18,
                      padding: 16,
                      borderWidth: 1.5,
                      borderColor: "#e2eaf2",
                      shadowColor: "#0c2340",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      elevation: 1,
                    }}
                  >
                    <FormattedHtmlText
                      html={block.html}
                      style={{ fontSize: 14, color: "#334155", lineHeight: 22 }}
                      boldStyle={{ fontWeight: "700", color: "#0c2340" }}
                    />
                  </View>
                );
              }

              if (block.type === "ordered_list") {
                return (
                  <View key={idx} style={{ gap: 10 }}>
                    {block.items.map((itemHtml, itemIdx) => (
                      <View
                        key={itemIdx}
                        style={{
                          flexDirection: "row",
                          alignItems: "flex-start",
                          backgroundColor: "#ffffff",
                          borderRadius: 18,
                          padding: 15,
                          borderWidth: 1.5,
                          borderColor: "#e2eaf2",
                          shadowColor: "#0c2340",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.03,
                          shadowRadius: 5,
                          elevation: 1,
                          gap: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 13,
                            backgroundColor: "#0284c7",
                            alignItems: "center",
                            justifyContent: "center",
                            marginTop: 1,
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: "800", color: "#ffffff" }}>
                            {itemIdx + 1}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <FormattedHtmlText
                            html={itemHtml}
                            style={{ fontSize: 14, color: "#334155", lineHeight: 22 }}
                            boldStyle={{ fontWeight: "700", color: "#0284c7" }}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                );
              }

              if (block.type === "unordered_list") {
                return (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: 18,
                      padding: 16,
                      borderWidth: 1.5,
                      borderColor: "#e2eaf2",
                      shadowColor: "#0c2340",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      elevation: 1,
                      gap: 10,
                    }}
                  >
                    {block.items.map((itemHtml, itemIdx) => (
                      <View
                        key={itemIdx}
                        style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: "#0284c7",
                            marginTop: 8,
                          }}
                        />
                        <View style={{ flex: 1 }}>
                          <FormattedHtmlText
                            html={itemHtml}
                            style={{ fontSize: 14, color: "#334155", lineHeight: 22 }}
                            boldStyle={{ fontWeight: "700", color: "#0c2340" }}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                );
              }

              return null;
            })}

            {/* C. BOTTOM CALL-TO-ACTION INSIDE SCROLLVIEW */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isVi
                  ? `Đã hiểu, vào luyện tập (${totalExercises} bài)`
                  : `Got it, Start Practice (${totalExercises} exercises)`
              }
              onPress={() => {
                hapticFeedback.medium();
                onClose();
              }}
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#0369a1" : "#0284c7",
                minHeight: 52,
                borderRadius: 18,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 10,
                marginBottom: Math.max(insets.bottom, 24),
                shadowColor: "#0284c7",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 4,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#ffffff" }}>
                {isVi
                  ? `Đã hiểu, vào luyện tập (${totalExercises} bài)`
                  : `Got it, Start Practice (${totalExercises} exercises)`}
              </Text>
              <ArrowRight size={18} color="#ffffff" strokeWidth={2.5} />
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
