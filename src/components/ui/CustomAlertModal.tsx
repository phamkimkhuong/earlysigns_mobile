import React from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
} from "lucide-react-native";
import { useAlertStore, type AlertButton, type AlertType } from "@/store/useAlertStore";
import i18n from "@/core/i18n";

function getButtonLabel(btn: AlertButton): string {
  if (btn.text && !btn.text.startsWith("common.")) {
    return btn.text;
  }
  if (btn.style === "cancel") {
    const cancelText = i18n.t("common.cancel");
    return cancelText && cancelText !== "common.cancel" ? cancelText : "Hủy";
  }
  if (btn.style === "destructive") {
    const deleteText = i18n.t("common.delete");
    return deleteText && deleteText !== "common.delete" ? deleteText : "Xóa";
  }
  const okText = i18n.t("common.ok");
  return okText && okText !== "common.ok" ? okText : "OK";
}

function renderIcon(type: AlertType = "info") {
  switch (type) {
    case "danger":
      return (
        <View
          style={{ backgroundColor: "#fee2e2" }}
          className="w-12 h-12 rounded-full items-center justify-center"
        >
          <AlertTriangle size={24} color="#dc2626" />
        </View>
      );
    case "warning":
      return (
        <View
          style={{ backgroundColor: "#fef3c7" }}
          className="w-12 h-12 rounded-full items-center justify-center"
        >
          <AlertCircle size={24} color="#d97706" />
        </View>
      );
    case "success":
      return (
        <View
          style={{ backgroundColor: "#dcfce7" }}
          className="w-12 h-12 rounded-full items-center justify-center"
        >
          <CheckCircle2 size={24} color="#16a34a" />
        </View>
      );
    case "confirm":
      return (
        <View
          style={{ backgroundColor: "#e0f2fe" }}
          className="w-12 h-12 rounded-full items-center justify-center"
        >
          <HelpCircle size={24} color="#0284c7" />
        </View>
      );
    case "info":
    default:
      return (
        <View
          style={{ backgroundColor: "#e0f2fe" }}
          className="w-12 h-12 rounded-full items-center justify-center"
        >
          <Info size={24} color="#0284c7" />
        </View>
      );
  }
}

export default function CustomAlertModal() {
  const { config, isOpen, hide } = useAlertStore();

  if (!isOpen || !config) return null;

  const { title, message, buttons = [{ text: "OK", style: "default" }], cancelable = true, type = "info" } = config;

  function handlePress(btn: AlertButton) {
    hide();
    btn.onPress?.();
  }

  function handleBackdropPress() {
    if (cancelable) {
      hide();
    }
  }

  const isDualAction = buttons.length === 2;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (cancelable) hide();
      }}
    >
      <View
        style={{ backgroundColor: "rgba(15, 23, 42, 0.6)" }}
        className="flex-1 items-center justify-center px-5"
      >
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={handleBackdropPress}
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
          {/* Top Icon Badge */}
          {renderIcon(type)}

          {/* Title */}
          <Text className="text-[17px] font-black text-[#0f172a] text-center mt-3.5">
            {title}
          </Text>

          {/* Message */}
          {message ? (
            <Text className="text-[15px] text-slate-600 text-center leading-6 mt-2.5 px-1">
              {message}
            </Text>
          ) : null}

          {/* Actions */}
          <View className="w-full mt-6">
            {isDualAction ? (
              <View className="flex-row items-center gap-3">
                {buttons.map((btn, idx) => {
                  const isCancel = btn.style === "cancel";
                  const isDestructive = btn.style === "destructive";

                  const btnBg = isCancel
                    ? "#f1f5f9"
                    : isDestructive
                    ? "#dc2626"
                    : "#0f172a";
                  const textColor = isCancel ? "#475569" : "#ffffff";

                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handlePress(btn)}
                      style={{ backgroundColor: btnBg }}
                      className="flex-1 min-h-[46px] py-2.5 rounded-2xl items-center justify-center active:opacity-80"
                      accessibilityRole="button"
                      accessibilityLabel={getButtonLabel(btn)}
                    >
                      <Text
                        style={{ color: textColor, includeFontPadding: false }}
                        className="text-[15px] font-bold"
                      >
                        {getButtonLabel(btn)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View className="gap-2.5 w-full">
                {buttons.map((btn, idx) => {
                  const isCancel = btn.style === "cancel";
                  const isDestructive = btn.style === "destructive";

                  const btnBg = isCancel
                    ? "#f1f5f9"
                    : isDestructive
                    ? "#dc2626"
                    : "#0f172a";
                  const textColor = isCancel ? "#475569" : "#ffffff";

                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handlePress(btn)}
                      style={{ backgroundColor: btnBg }}
                      className="w-full min-h-[46px] py-2.5 rounded-2xl items-center justify-center active:opacity-80"
                      accessibilityRole="button"
                      accessibilityLabel={getButtonLabel(btn)}
                    >
                      <Text
                        style={{ color: textColor, includeFontPadding: false }}
                        className="text-[15px] font-bold"
                      >
                        {getButtonLabel(btn)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
