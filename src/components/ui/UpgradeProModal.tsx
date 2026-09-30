import React from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { Crown, Zap } from "lucide-react-native";
import { useTranslation } from "react-i18next";

export interface UpgradeProModalProps {
  open: boolean;
  onClose: () => void;
  featureKey?: "dailyLimit" | "generic" | "sampleAudio" | "ocr" | string;
  onUpgrade?: () => void;
}

export default function UpgradeProModal({
  open,
  onClose,
  featureKey = "dailyLimit",
  onUpgrade,
}: UpgradeProModalProps) {
  const { t } = useTranslation();
  if (!open) return null;

  const isDailyLimit = featureKey === "dailyLimit" || featureKey === "generic";
  const isSampleAudio = featureKey === "sampleAudio";
  const isOcr = featureKey === "ocr";

  const title = isDailyLimit
    ? t("upgradePro.dailyLimitTitle", "Hết lượt luyện tập hôm nay")
    : isSampleAudio
    ? t("upgradePro.sampleAudioTitle", "Nghe phát âm mẫu với Pro")
    : isOcr
    ? t("upgradePro.ocrTitle", "Quét ảnh OCR với Pro")
    : t("upgradePro.genericTitle", "Nâng cấp EarlySigns Pro");

  const message = isDailyLimit
    ? t(
        "upgradePro.dailyLimitMessage",
        "Bạn đã sử dụng hết 20 lượt phát âm miễn phí trong ngày hôm nay. Hãy nâng cấp EarlySigns Pro để tiếp tục luyện phát âm không giới hạn và nhận phân tích AI chuyên sâu!"
      )
    : isSampleAudio
    ? t(
        "upgradePro.sampleAudioMessage",
        "Tính năng nghe audio mẫu bản xứ chuẩn AI dành riêng cho gói Pro. Nâng cấp để mở khóa audio cho mọi bài luyện tập của bạn."
      )
    : isOcr
    ? t(
        "upgradePro.ocrMessage",
        "Tính năng nhận diện văn bản từ hình ảnh (OCR) bằng AI chỉ dành cho thành viên Pro. Nâng cấp ngay để trích xuất bài học từ sách, báo tiếng Anh không giới hạn."
      )
    : t(
        "upgradePro.genericMessage",
        "Bạn đã đạt giới hạn lượt dùng hôm nay. Nâng cấp EarlySigns Pro để tiếp tục luyện phát âm không giới hạn!"
      );

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{ backgroundColor: "rgba(15, 23, 42, 0.6)" }}
        className="flex-1 items-center justify-center px-5"
      >
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onClose}
        />

        <View
          style={{
            backgroundColor: "#ffffff",
            borderColor: "#e2e8f0",
            maxWidth: 360,
            width: "100%",
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 10,
          }}
          className="rounded-3xl p-6 border items-center"
        >
          {/* Top Icon Badge: Zap for daily quota, Crown for Pro features */}
          <View
            style={{ backgroundColor: "#fef3c7" }}
            className="w-12 h-12 rounded-full items-center justify-center"
          >
            {isDailyLimit ? (
              <Zap size={24} color="#d97706" />
            ) : (
              <Crown size={24} color="#d97706" />
            )}
          </View>

          {/* Title */}
          <Text className="text-base font-extrabold text-[#0f172a] text-center mt-3.5">
            {title}
          </Text>

          {/* Message */}
          <Text className="text-xs text-slate-600 text-center leading-5 mt-2 px-1">
            {message}
          </Text>

          {/* Actions: [ Huỷ ] [ Nâng cấp Pro ] */}
          <View className="w-full mt-6">
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={onClose}
                style={{ backgroundColor: "#f1f5f9" }}
                className="flex-1 h-11 rounded-xl items-center justify-center active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel={t("upgradePro.close", "Huỷ")}
              >
                <Text className="text-sm font-bold text-[#475569]">
                  {t("upgradePro.close", "Huỷ")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  onClose?.();
                  onUpgrade?.();
                }}
                style={{ backgroundColor: "#0f172a" }}
                className="flex-1 h-11 rounded-xl items-center justify-center active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel={t("upgradePro.cta", "Nâng cấp Pro")}
              >
                <Text className="text-sm font-bold text-white">
                  {t("upgradePro.cta", "Nâng cấp Pro")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
