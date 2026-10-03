import React from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { ArrowUpCircle, ArrowRight, AlertTriangle, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useAppUpdateStore } from "@/store/useAppUpdateStore";

export default function AppUpdateModal() {
  const { t } = useTranslation();
  const { isOpen, updateInfo, closeModal, confirmUpdate } = useAppUpdateStore();

  if (!isOpen || !updateInfo) {
    return null;
  }

  const { isForce, currentVersion, latestVersion, config } = updateInfo;

  const defaultTitle = isForce
    ? t("appUpdate.forceTitle", "Yêu cầu cập nhật ứng dụng")
    : t("appUpdate.softTitle", "Đã có bản cập nhật mới");

  const defaultMessage = isForce
    ? t(
        "appUpdate.forceMessage",
        "Phiên bản hiện tại của bạn không còn được hỗ trợ. Vui lòng cập nhật lên phiên bản mới nhất để tiếp tục sử dụng EarlySigns."
      )
    : t(
        "appUpdate.softMessage",
        "Đã có phiên bản mới với nhiều tính năng nâng cấp và cải tiến. Bạn có muốn cập nhật ngay không?"
      );

  const title = config.title || defaultTitle;
  const message = config.message || defaultMessage;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isForce) {
          closeModal();
        }
      }}
    >
      <View
        style={{ backgroundColor: "rgba(15, 23, 42, 0.7)" }}
        className="flex-1 items-center justify-center px-5"
      >
        {/* Backdrop: only close if not a forced update */}
        {!isForce && (
          <Pressable
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={closeModal}
          />
        )}

        <View
          style={{
            backgroundColor: "#ffffff",
            borderColor: "#e2e8f0",
            maxWidth: 360,
            width: "100%",
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.2,
            shadowRadius: 24,
            elevation: 12,
          }}
          className="rounded-3xl p-6 border items-center relative"
        >
          {/* Close button (top right) - for soft updates */}
          {!isForce && (
            <TouchableOpacity
              onPress={closeModal}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                backgroundColor: "#f1f5f9",
                zIndex: 10,
              }}
              className="w-8 h-8 rounded-full items-center justify-center active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel={t("common.close", "Đóng")}
            >
              <X size={16} color="#64748b" />
            </TouchableOpacity>
          )}

          {/* Top Icon Badge */}
          <View
            style={{
              backgroundColor: isForce ? "#fef2f2" : "#eff6ff",
            }}
            className="w-14 h-14 rounded-full items-center justify-center"
          >
            {isForce ? (
              <AlertTriangle size={28} color="#dc2626" />
            ) : (
              <ArrowUpCircle size={28} color="#2563eb" />
            )}
          </View>

          {/* Type Badge */}
          <View
            style={{
              backgroundColor: isForce ? "#fee2e2" : "#e0e7ff",
            }}
            className="px-3 py-1 rounded-full mt-3 shrink-0"
          >
            <Text
              style={{
                color: isForce ? "#b91c1c" : "#3730a3",
              }}
              className="text-xs font-bold"
              numberOfLines={1}
            >
              {isForce
                ? t("appUpdate.forceBadge", "Bắt buộc cập nhật")
                : t("appUpdate.softBadge", "Bản nâng cấp đề xuất")}
            </Text>
          </View>

          {/* Title */}
          <Text className="text-base font-extrabold text-[#0f172a] text-center mt-3">
            {title}
          </Text>

          {/* Version Transition Pills: v1.0.0 -> v1.0.1 */}
          <View className="flex-row items-center justify-center gap-2 mt-2.5">
            <View
              style={{ backgroundColor: "#f1f5f9" }}
              className="px-2.5 py-1 rounded-lg"
            >
              <Text className="text-xs font-semibold text-[#64748b]">
                v{currentVersion}
              </Text>
            </View>

            <ArrowRight size={14} color="#94a3b8" />

            <View
              style={{ backgroundColor: "#dbeafe" }}
              className="px-2.5 py-1 rounded-lg"
            >
              <Text className="text-xs font-bold text-[#1d4ed8]">
                v{latestVersion}
              </Text>
            </View>
          </View>

          {/* Message */}
          <Text className="text-[13px] text-slate-600 text-center leading-5 mt-3 px-1">
            {message}
          </Text>

          {/* Action Buttons */}
          <View className="w-full mt-6">
            {isForce ? (
              // Force Update: Only 1 primary button, cannot be dismissed
              <TouchableOpacity
                onPress={confirmUpdate}
                style={{ backgroundColor: "#0f172a" }}
                className="w-full h-12 rounded-xl items-center justify-center active:opacity-85"
                accessibilityRole="button"
                accessibilityLabel={t("appUpdate.updateNow", "Cập nhật ngay")}
              >
                <Text className="text-base font-extrabold text-white">
                  {t("appUpdate.updateNow", "Cập nhật ngay")}
                </Text>
              </TouchableOpacity>
            ) : (
              // Soft Update: 2 buttons (Later / Update)
              <View className="flex-row items-center gap-3">
                <TouchableOpacity
                  onPress={closeModal}
                  style={{ backgroundColor: "#f1f5f9" }}
                  className="flex-1 h-11 rounded-xl items-center justify-center active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel={t("appUpdate.later", "Để sau")}
                >
                  <Text className="text-sm font-bold text-[#475569]">
                    {t("appUpdate.later", "Để sau")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    confirmUpdate();
                  }}
                  style={{ backgroundColor: "#0f172a" }}
                  className="flex-1 h-11 rounded-xl items-center justify-center active:opacity-85"
                  accessibilityRole="button"
                  accessibilityLabel={t("appUpdate.updateNow", "Cập nhật")}
                >
                  <Text className="text-sm font-bold text-white">
                    {t("appUpdate.updateNow", "Cập nhật")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
