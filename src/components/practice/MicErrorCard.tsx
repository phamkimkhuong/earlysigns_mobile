import React from "react";
import { Text, View } from "react-native";
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

  // Permission denial is shown once by the shared hook's customAlert.
  if (micError?.type === "denied") return null;

  if (micError) {
    const title =
      t(`sentence.micError.${micError.type}.title`) ||
      t("sentence.recordingIssue", "Lỗi quyền micro");
    const body =
      t(`sentence.micError.${micError.type}.body`) ||
      t("sentence.micError.generic.body", "Không thể bắt đầu ghi âm. Vui lòng thử lại.");

    return (
      <View testID={testID} className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 w-full gap-2 my-1">
        <View className="flex-row items-center gap-2">
          <AlertCircle size={18} color="#e11d48" />
          <Text className="flex-1 text-[15px] font-bold text-rose-900">{title}</Text>
        </View>
        <Text className="text-[13px] text-rose-800 leading-relaxed pl-6">{body}</Text>
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
