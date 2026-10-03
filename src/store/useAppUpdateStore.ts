import { create } from "zustand";
import {
  checkAppUpdate,
  dismissSoftUpdate,
  openStore,
  UpdateCheckResult,
} from "@/services/appUpdate";

interface AppUpdateState {
  isOpen: boolean;
  updateInfo: UpdateCheckResult | null;
  isChecking: boolean;
  checkUpdate: (options?: { ignoreDismissed?: boolean }) => Promise<UpdateCheckResult | null>;
  closeModal: () => void;
  confirmUpdate: () => Promise<void>;
}

export const useAppUpdateStore = create<AppUpdateState>((set, get) => ({
  isOpen: false,
  updateInfo: null,
  isChecking: false,

  checkUpdate: async (options) => {
    set({ isChecking: true });
    try {
      const result = await checkAppUpdate(options);
      if (result && result.shouldUpdate) {
        set({ isOpen: true, updateInfo: result });
        return result;
      }
      return null;
    } catch (err) {
      console.warn("[useAppUpdateStore] checkUpdate error:", err);
      return null;
    } finally {
      set({ isChecking: false });
    }
  },

  closeModal: () => {
    const { updateInfo } = get();
    // Only allow closing if it's NOT a forced update
    if (updateInfo && !updateInfo.isForce) {
      dismissSoftUpdate(updateInfo.latestVersion);
      set({ isOpen: false });
    }
  },

  confirmUpdate: async () => {
    const { updateInfo } = get();
    if (updateInfo?.storeUrl) {
      await openStore(updateInfo.storeUrl);
    }
  },
}));
