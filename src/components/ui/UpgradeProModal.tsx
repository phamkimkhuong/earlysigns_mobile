import React from "react";
import { useTranslation } from "react-i18next";
import { Text } from "react-native";
import AppModal from "./AppModal";
import PrimaryButton from "./PrimaryButton";

export interface UpgradeProModalProps {
  open: boolean;
  onClose: () => void;
  featureKey?: "generic" | "sampleAudio" | "ocr" | string;
  onUpgrade?: () => void;
}

export default function UpgradeProModal({
  open,
  onClose,
  featureKey = "generic",
  onUpgrade,
}: UpgradeProModalProps) {
  const { t } = useTranslation();
  if (!open) return null;
  const message =
    featureKey === "sampleAudio"
      ? t("upgradePro.sampleAudioMessage")
      : featureKey === "ocr"
        ? t("upgradePro.ocrMessage")
        : t("upgradePro.genericMessage");

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={t("upgradePro.title")}
      footer={
        <>
          <PrimaryButton
            title={t("upgradePro.cta")}
            onPress={() => {
              onClose?.();
              onUpgrade?.();
            }}
          />
          <PrimaryButton title={t("upgradePro.close")} variant="ghost" onPress={onClose} />
        </>
      }
    >
      <Text className="text-appText leading-[22px]">{message}</Text>
    </AppModal>
  );
}
