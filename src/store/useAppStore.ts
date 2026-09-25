import { create } from "zustand";
import type { Dialect } from "@/types/domain";

interface AppStoreState {
  dialect: Dialect;
  isUpgradeModalOpen: boolean;
  setDialect: (dialect: Dialect) => void;
  openUpgradeModal: () => void;
  closeUpgradeModal: () => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  dialect: "uk",
  isUpgradeModalOpen: false,

  setDialect: (dialect) => set({ dialect }),
  openUpgradeModal: () => set({ isUpgradeModalOpen: true }),
  closeUpgradeModal: () => set({ isUpgradeModalOpen: false }),
}));
