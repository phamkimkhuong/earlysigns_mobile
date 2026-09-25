import React from "react";
import { Modal, Pressable, Text, View } from "react-native";

export interface AppModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export default function AppModal({
  open,
  onClose,
  title,
  children,
  footer,
}: AppModalProps) {
  if (!open) return null;
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-overlay justify-center p-5">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="bg-appElevated rounded-2xl p-[18px] max-h-[85%]">
          {title ? (
            <Text className="text-lg font-bold text-appText mb-2.5">{title}</Text>
          ) : null}
          {children}
          {footer ? <View className="mt-4 gap-2">{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}
