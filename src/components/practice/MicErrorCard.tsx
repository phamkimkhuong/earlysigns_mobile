import React from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import { AlertCircle } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { MicError } from "@/types/domain";

export interface MicErrorCardProps {
  micError?: MicError | null;
  error?: string | null;
  testID?: string;
}

export default function MicErrorCard({ micError, error, testID }: MicErrorCardProps) {
  const { t } = useTranslation();

  if (micError) {
    const title =
      t(`sentence.micError.${micError.type}.title`) ||
      t("sentence.recordingIssue", "Lỗi quyền micro");
    const body =
      t(`sentence.micError.${micError.type}.body`) ||
      t("sentence.micError.generic.body", "Không thể bắt đầu ghi âm. Vui lòng thử lại.");
    const isDenied = micError.type === "denied";

    return (
      <View testID={testID} className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 w-full gap-2 my-1">
        <View className="flex-row items-center gap-2">
          <AlertCircle size={18} color="#e11d48" />
          <Text className="flex-1 text-xs font-bold text-rose-900">{title}</Text>
        </View>
        <Text className="text-xs text-rose-800 leading-relaxed pl-6">{body}</Text>
        {isDenied ? (
          <View className="flex-row justify-end pt-1">
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t("sentence.micError.openSettings", "Mở Cài đặt")}
              activeOpacity={0.8}
              onPress={() => Linking.openSettings()}
              className="px-4 py-2 rounded-xl bg-rose-600 active:bg-rose-700"
            >
              <Text className="text-xs font-bold text-white">
                {t("sentence.micError.openSettings", "Mở Cài đặt")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  }

  if (error) {
    return (
      <View testID={testID} className="flex-row items-center gap-2 bg-rose-50 border border-rose-200 rounded-2xl p-3.5 w-full my-1">
        <AlertCircle size={18} color="#e11d48" />
        <Text testID={testID ? `${testID}-text` : undefined} className="flex-1 text-xs font-semibold text-rose-800">{error}</Text>
      </View>
    );
  }

  return null;
}
