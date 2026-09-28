import { create } from "zustand";

export type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

export type AlertType = "info" | "warning" | "danger" | "success" | "confirm";

export interface AlertConfig {
  id?: string;
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: AlertButton[];
  cancelable?: boolean;
  onDismiss?: () => void;
}

interface AlertState {
  config: AlertConfig | null;
  isOpen: boolean;
  show: (config: AlertConfig) => void;
  hide: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  config: null,
  isOpen: false,
  show: (config) => set({ config, isOpen: true }),
  hide: () => {
    const current = useAlertStore.getState().config;
    current?.onDismiss?.();
    set({ isOpen: false, config: null });
  },
}));
