import React from "react";
import { Platform, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import AppModal from "@/components/ui/AppModal";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { formatVnd } from "@/utils/errors";
import { normalizeStoreProduct, type StoreProduct } from "@/services/iap";
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

  const products: StoreProduct[] =
    Array.isArray(packageList) && packageList.length > 0
      ? packageList.map(normalizeStoreProduct)
      : [];

  const storeActionText =
    Platform.OS === "ios"
      ? (t("payment.ctaApple") || "Đăng ký qua App Store")
      : (t("payment.ctaGoogle") || "Đăng ký qua Google Play");

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={t("payment.heroTitlePro") || "Gói EarlySigns Pro"}
      footer={<PrimaryButton title={t("package.close") || "Đóng"} variant="ghost" onPress={onClose} />}
    >
      <Text className="text-appTextSecondary mb-3">
        {t("package.subtitle") || "Mở khóa toàn bộ tính năng và bài học không giới hạn:"}
      </Text>
      {products.map((prod) => {
        return (
          <View key={prod.id} className="border border-appBorder rounded-2xl p-3 mb-2.5 gap-1 bg-appElevated">
            <View className="flex-row justify-between items-center">
              <Text className="font-extrabold text-appText">{prod.name}</Text>
              {prod.savingsBadge ? (
                <View className="bg-amber-500 px-2 py-0.5 rounded-full">
                  <Text className="text-xs font-bold text-white">{prod.savingsBadge}</Text>
                </View>
              ) : null}
            </View>
            <View className="flex-row items-baseline gap-2">
              <Text className="text-accent font-black text-base">{formatVnd(prod.priceVnd)}</Text>
              {prod.originalPriceVnd > prod.priceVnd ? (
                <Text className="text-appTextMuted line-through text-xs">{formatVnd(prod.originalPriceVnd)}</Text>
              ) : null}
            </View>
            <Text className="text-xs text-appTextMuted mb-1">{prod.monthlyEquivalent}</Text>
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
