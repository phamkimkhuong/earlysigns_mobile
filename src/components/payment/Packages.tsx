import React from "react";
import { Platform, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import AppModal from "@/components/ui/AppModal";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { formatVnd } from "@/utils/errors";
import { STORE_PRODUCTS } from "@/services/iap";
import { usePackagesQuery } from "@/hooks/queries/useBillingQueries";

export interface PackagesProps {
  open: boolean;
  onClose: () => void;
  authToken?: string | null;
  authFetch?: (path: string, options?: any) => Promise<Response>;
  onBuyPackage?: (pkgId: string) => void;
}

export default function Packages({
  open,
  onClose,
  authToken,
  authFetch,
  onBuyPackage,
}: PackagesProps) {
  const { t } = useTranslation();
  const { data: packageList = [], error } = usePackagesQuery({ enabled: open });
  const purchaseError = error ? String((error as any)?.message || error) : "";

  if (!open) return null;

  const storeActionText =
    Platform.OS === "ios" ? "Đăng ký qua App Store" : "Đăng ký qua Google Play";

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Gói EarlySigns Pro"
      footer={<PrimaryButton title={t("package.close") || "Đóng"} variant="ghost" onPress={onClose} />}
    >
      <Text className="text-appTextSecondary mb-3">
        Mở khóa toàn bộ tính năng và bài học không giới hạn:
      </Text>
      {STORE_PRODUCTS.map((prod) => {
        const apiPkg = packageList.find((p) => p.id === prod.id);
        const price = apiPkg?.price_vnd ?? prod.priceVnd;
        const original = apiPkg?.original_price_vnd ?? prod.originalPriceVnd;
        return (
          <View key={prod.id} className="border border-appBorder rounded-2xl p-3 mb-2.5 gap-1 bg-appElevated">
            <View className="flex-row justify-between items-center">
              <Text className="font-extrabold text-appText">{prod.name}</Text>
              {prod.savingsBadge ? (
                <View className="bg-amber-500 px-2 py-0.5 rounded-full">
                  <Text className="text-2xs font-bold text-white">{prod.savingsBadge}</Text>
                </View>
              ) : null}
            </View>
            <View className="flex-row items-baseline gap-2">
              <Text className="text-accent font-black text-base">{formatVnd(price)}</Text>
              <Text className="text-appTextMuted line-through text-xs">{formatVnd(original)}</Text>
            </View>
            <Text className="text-2xs text-appTextMuted mb-1">{prod.monthlyEquivalent}</Text>
            <PrimaryButton
              title={storeActionText}
              variant={prod.popular ? "primary" : "ghost"}
              onPress={() => {
                onClose?.();
                onBuyPackage?.(prod.id);
              }}
            />
          </View>
        );
      })}
      {purchaseError ? <Text className="text-danger">{purchaseError}</Text> : null}
    </AppModal>
  );
}
