import { useAlertStore, type AlertButton, type AlertType } from "@/store/useAlertStore";

export interface ConfirmParams {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const customAlert = {
  /**
   * Drop-in replacement for React Native's Alert.alert(title, message, buttons, options)
   */
  alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: { cancelable?: boolean; onDismiss?: () => void }
  ): void {
    const hasDestructive = buttons?.some((b) => b.style === "destructive");
    const isConfirm = (buttons?.length || 0) > 1;
    const type: AlertType = hasDestructive ? "danger" : isConfirm ? "confirm" : "info";

    useAlertStore.getState().show({
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: "OK", style: "default" }],
      cancelable: options?.cancelable ?? true,
      onDismiss: options?.onDismiss,
      type,
    });
  },

  /**
   * Helper for quick confirmation dialogs
   */
  confirm({
    title,
    message,
    confirmText = "Xác nhận",
    cancelText = "Hủy",
    destructive = false,
    onConfirm,
    onCancel,
  }: ConfirmParams): void {
    useAlertStore.getState().show({
      title,
      message,
      type: destructive ? "danger" : "confirm",
      buttons: [
        {
          text: cancelText,
          style: "cancel",
          onPress: onCancel,
        },
        {
          text: confirmText,
          style: destructive ? "destructive" : "default",
          onPress: onConfirm,
        },
      ],
      cancelable: true,
      onDismiss: onCancel,
    });
  },

  /**
   * Promise-based confirm dialog: await customAlert.promptConfirm(...) -> boolean
   */
  promptConfirm({
    title,
    message,
    confirmText = "Xác nhận",
    cancelText = "Hủy",
    destructive = false,
  }: Omit<ConfirmParams, "onConfirm" | "onCancel">): Promise<boolean> {
    return new Promise((resolve) => {
      useAlertStore.getState().show({
        title,
        message,
        type: destructive ? "danger" : "confirm",
        buttons: [
          {
            text: cancelText,
            style: "cancel",
            onPress: () => resolve(false),
          },
          {
            text: confirmText,
            style: destructive ? "destructive" : "default",
            onPress: () => resolve(true),
          },
        ],
        cancelable: true,
        onDismiss: () => resolve(false),
      });
    });
  },

  /**
   * Info alert modal
   */
  info(title: string, message?: string, buttonText: string = "Đã hiểu", onConfirm?: () => void): void {
    useAlertStore.getState().show({
      title,
      message,
      type: "info",
      buttons: [{ text: buttonText, style: "default", onPress: onConfirm }],
      cancelable: true,
    });
  },

  /**
   * Warning alert modal
   */
  warning(title: string, message?: string, buttonText: string = "Đã hiểu", onConfirm?: () => void): void {
    useAlertStore.getState().show({
      title,
      message,
      type: "warning",
      buttons: [{ text: buttonText, style: "default", onPress: onConfirm }],
      cancelable: true,
    });
  },

  /**
   * Danger / destructive alert modal
   */
  danger(title: string, message?: string, buttonText: string = "Đã hiểu", onConfirm?: () => void): void {
    useAlertStore.getState().show({
      title,
      message,
      type: "danger",
      buttons: [{ text: buttonText, style: "destructive", onPress: onConfirm }],
      cancelable: true,
    });
  },

  /**
   * Force close alert
   */
  close(): void {
    useAlertStore.getState().hide();
  },
};
