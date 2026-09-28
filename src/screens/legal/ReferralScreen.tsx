import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { customAlert } from "@/utils/customAlert";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import {
  ChevronLeft,
  Gift,
  Copy,
  Check,
  Share2,
  UserPlus,
  Ticket,
  Users,
  CheckCircle2,
  AlertCircle,
  LogIn,
  Info,
  Clock,
} from "lucide-react-native";
import { useAuth } from "@/services/Auth";
import { billingApi } from "@/api/billingApi";
import { getFriendlyErrorMessage } from "@/core/errorManager";
import type { RootStackParamList } from "@/types/navigation";

interface ReferralInfo {
  referral_code: string | null;
  referral_code_created_at: number | null;
  has_created_code: boolean;
  has_redeemed: boolean;
  referred_by_code: string | null;
  referred_by_user_id: string | null;
  referral_redeemed_at: number | null;
  can_redeem: boolean;
  redeem_deadline_at: number;
  redeem_seconds_remaining: number;
  show_home_banner?: boolean;
}

type Props = NativeStackScreenProps<RootStackParamList, "Referral">;

export default function ReferralScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { authToken } = useAuth();

  const [referralData, setReferralData] = useState<ReferralInfo | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // Targeted Scroll State (Senior UX Practice: Only scroll to the focused card)
  const scrollViewRef = useRef<ScrollView>(null);
  const redeemCardYRef = useRef<number>(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates?.height || 0;
      setKeyboardHeight(h);

      if (redeemCardYRef.current > 0) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, redeemCardYRef.current - 16),
            animated: true,
          });
        }, Platform.OS === "android" ? 80 : 30);
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleInputFocus = () => {
    if (redeemCardYRef.current > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, redeemCardYRef.current - 16),
          animated: true,
        });
      }, Platform.OS === "android" ? 100 : 50);
    }
  };

  // Safe i18n lookup with guaranteed fallbacks
  const tr = (key: string, fallback: string): string => {
    const val = t(key);
    return !val || val === key ? fallback : val;
  };

  // Load live referral status from Backend
  const refreshReferralStatus = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await billingApi.getReferralStatus();
      if (res?.referral) {
        setReferralData(res.referral);
      }
    } catch {
      // Offline fallback
    }
  }, [authToken]);

  useEffect(() => {
    let isMounted = true;
    if (authToken) {
      billingApi
        .getReferralStatus()
        .then((res) => {
          if (isMounted && res?.referral) {
            setReferralData(res.referral);
          }
        })
        .catch(() => { })
        .finally(() => {
          if (isMounted) setIsLoadingStatus(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [authToken]);

  // Generate real referral code on Backend (Cách 2)
  const handleGenerateCode = async () => {
    if (!authToken) {
      customAlert.alert(
        "Yêu cầu đăng nhập",
        "Vui lòng đăng nhập tài khoản để tạo mã giới thiệu.",
        [
          { text: "Để sau", style: "cancel" },
          { text: "Đăng nhập", onPress: () => navigation.navigate("Login") },
        ]
      );
      return;
    }

    setIsGeneratingCode(true);
    try {
      const res = await billingApi.generateReferralCode();
      if (res?.referral) {
        setReferralData(res.referral);
      } else {
        await refreshReferralStatus();
      }
    } catch (err: any) {
      customAlert.alert(
        tr("common.error", "Lỗi tạo mã"),
        getFriendlyErrorMessage(err, "Không thể tạo mã giới thiệu lúc này. Vui lòng thử lại sau.")
      );
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const realReferralCode = referralData?.referral_code || "";

  const handleCopyCode = async () => {
    if (!realReferralCode) return;
    try {
      await Clipboard.setStringAsync(realReferralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      customAlert.info(tr("referral.copyCode", "Sao chép"), realReferralCode);
    }
  };

  const handleShare = async () => {
    if (!realReferralCode) return;
    try {
      const shareMessage =
        `Luyện phát âm tiếng Anh chuẩn bản xứ với AI trên EarlySigns! Nhập mã giới thiệu ${realReferralCode} của mình để nhận ngay 7 ngày EarlySigns Pro miễn phí nhé! https://earlysigns.net`;
      await Share.share({
        message: shareMessage,
        title: "Nhận 7 ngày EarlySigns Pro miễn phí",
      });
    } catch {
      // User dismissed share dialog
    }
  };

  const handleRedeem = async () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed) {
      setRedeemError("Vui lòng nhập mã giới thiệu hợp lệ.");
      return;
    }
    if (!authToken) {
      customAlert.alert(
        "Yêu cầu đăng nhập",
        "Vui lòng đăng nhập tài khoản để áp dụng mã giới thiệu.",
        [
          { text: "Để sau", style: "cancel" },
          { text: "Đăng nhập", onPress: () => navigation.navigate("Login") },
        ]
      );
      return;
    }

    setIsRedeeming(true);
    setRedeemError(null);
    setRedeemSuccess(null);

    try {
      const res = await billingApi.redeemReferralCode(trimmed);
      setRedeemSuccess(
        res?.message ||
        tr(
          "referral.referralRedeemSuccess",
          "Thành công! Bạn và người giới thiệu đều nhận 7 ngày EarlySigns Pro."
        )
      );
      setInputCode("");
      await refreshReferralStatus();
    } catch (err: any) {
      setRedeemError(
        getFriendlyErrorMessage(err, "Mã không hợp lệ hoặc đã hết hạn.")
      );
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#f8fafc]">
      {/* 1. TOP APP BAR */}
      <View className="flex-row items-center justify-between px-4 py-2.5 bg-[#f8fafc]">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("Main");
            }
          }}
          style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
          className="w-10 h-10 rounded-2xl items-center justify-center border shadow-xs"
        >
          <ChevronLeft size={22} color="#0f172a" />
        </TouchableOpacity>

        <Text className="text-base font-extrabold text-[#0f172a]">
          {tr("referral.pageTitle", "Chương trình giới thiệu")}
        </Text>

        <View className="w-10 h-10" />
      </View>

      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: 6,
          paddingBottom: keyboardHeight > 0 ? keyboardHeight + 24 : 48,
          gap: 14,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={true}
      >
            {/* 2. HERO CARD (SELF-CONTAINED & NO OVERLAPPING CLIPPING) */}
            <View
              style={{
                backgroundColor: "#0a2644",
                borderColor: "#1e3a8a",
                shadowColor: "#0a2644",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 3,
              }}
              className="rounded-3xl p-5 border gap-3 overflow-hidden"
            >
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: -35,
                  right: -30,
                  width: 130,
                  height: 130,
                  borderRadius: 65,
                  backgroundColor: "#1e3a8a",
                  opacity: 0.35,
                }}
              />

              <View
                style={{
                  backgroundColor: "#1e3a8a",
                  borderColor: "#3b82f6",
                }}
                className="self-start px-2.5 py-0.5 rounded-full border"
              >
                <Text style={{ color: "#93c5fd" }} className="text-xs font-black tracking-wider uppercase">
                  {tr("referral.heroBadge", "Ưu đãi Pro")}
                </Text>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xl font-black text-white leading-tight">
                    {tr("referral.heroTitle", "Mời bạn bè, Nhận ngay 7 ngày Pro")}
                  </Text>
                  <Text className="text-sm text-sky-100 font-medium leading-relaxed mt-1.5">
                    {tr("referral.heroDesc", "Cả bạn và người được giới thiệu đều nhận 7 ngày EarlySigns Pro miễn phí khi kích hoạt mã.")}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: "#f59e0b",
                    shadowColor: "#f59e0b",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                    elevation: 3,
                  }}
                  className="w-13 h-13 rounded-2xl items-center justify-center"
                >
                  <Gift size={26} color="#ffffff" />
                </View>
              </View>
            </View>

            {/* 3. CARD A: MÃ GIỚI THIỆU CỦA BẠN */}
            <View
              style={{
                backgroundColor: "#ffffff",
                borderColor: "#e2e8f0",
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 1.5,
              }}
              className="rounded-3xl p-5 border gap-3.5"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View
                    style={{ backgroundColor: "#eef2ff" }}
                    className="w-8 h-8 rounded-xl items-center justify-center"
                  >
                    <Users size={16} color="#4f46e5" />
                  </View>
                  <Text className="text-[15px] font-extrabold text-[#0f172a]">
                    {tr("referral.yourCodeTitle", "Mã giới thiệu của bạn")}
                  </Text>
                </View>

                <View
                  style={{ backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }}
                  className="px-2.5 py-0.5 rounded-full border"
                >
                  <Text className="text-xs font-bold text-emerald-700">
                    +7 ngày Pro/lượt
                  </Text>
                </View>
              </View>

              {authToken ? (
                isLoadingStatus ? (
                  <View className="py-6 items-center justify-center gap-2">
                    <ActivityIndicator size="small" color="#4f46e5" />
                    <Text className="text-sm text-slate-400 font-medium">
                      Đang tải thông tin mã...
                    </Text>
                  </View>
                ) : !referralData?.has_created_code || !referralData?.referral_code ? (
                  /* CHƯA TẠO MÃ - HIỂN THỊ NÚT TẠO MÃ*/
                  <View
                    style={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}
                    className="rounded-2xl p-4 items-center justify-center gap-2 border"
                  >
                    <View
                      style={{ backgroundColor: "#eef2ff" }}
                      className="w-10 h-10 rounded-2xl items-center justify-center mb-0.5"
                    >
                      <UserPlus size={20} color="#4f46e5" />
                    </View>
                    <Text className="text-[15px] font-extrabold text-slate-900 text-center">
                      {tr("referral.notCreatedTitle", "Bạn chưa có mã giới thiệu")}
                    </Text>
                    <Text className="text-[13px] text-slate-500 text-center font-medium leading-relaxed px-2">
                      {tr(
                        "referral.notCreatedDesc",
                        "Tạo mã cá nhân ngay để chia sẻ cho bạn bè và nhận 7 ngày EarlySigns Pro miễn phí!"
                      )}
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={isGeneratingCode}
                      onPress={handleGenerateCode}
                      style={{ backgroundColor: "#4338ca" }}
                      className="flex-row items-center justify-center py-3 px-6 rounded-2xl shadow-xs mt-1 w-full"
                    >
                      {isGeneratingCode ? (
                        <>
                          <ActivityIndicator size="small" color="#ffffff" />
                          <Text className="text-sm font-bold text-white">
                            {tr("referral.generating", "Đang tạo mã...")}
                          </Text>
                        </>
                      ) : (
                        <Text className="text-sm font-bold text-white text-center">
                          {tr("referral.ctaCreate", "Tạo mã giới thiệu ngay")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* ĐÃ CÓ MÃ THẬT TỪ SERVER */
                  <>
                    <View
                      style={{
                        backgroundColor: "#f8fafc",
                        borderColor: "#cbd5e1",
                        borderStyle: "dashed",
                        borderWidth: 1.5,
                      }}
                      className="rounded-2xl py-3.5 px-3 items-center justify-center gap-1"
                    >
                      <Text className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                        {tr("referral.uniqueCode", "Mã cá nhân của bạn")}
                      </Text>
                      <Text
                        style={{ letterSpacing: 4 }}
                        className="text-2xl font-black text-[#4338ca] my-0.5"
                      >
                        {realReferralCode}
                      </Text>
                      <Text className="text-[13px] text-slate-500 font-medium">
                        {tr("referral.unlimitedShare", "Chia sẻ không giới hạn số lần cho bạn bè")}
                      </Text>
                    </View>

                    {/* Nút Sao chép & Chia sẻ */}
                    <View className="flex-row gap-2 mt-0.5">
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleCopyCode}
                        style={{ backgroundColor: copied ? "#059669" : "#4338ca" }}
                        className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl shadow-xs"
                      >
                        {copied ? (
                          <>
                            <Check size={16} color="#ffffff" strokeWidth={2.5} />
                            <Text className="text-sm font-bold text-white">
                              {tr("referral.copied", "Đã chép!")}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Copy size={16} color="#ffffff" />
                            <Text className="text-sm font-bold text-white">
                              {tr("referral.copyCode", "Sao chép")}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleShare}
                        style={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1" }}
                        className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl border shadow-xs"
                      >
                        <Share2 size={16} color="#334155" />
                        <Text className="text-sm font-bold text-slate-700">
                          {tr("referral.shareNow", "Chia sẻ")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )
              ) : (
                /* GUEST MODE */
                <View
                  style={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}
                  className="rounded-2xl p-4 items-center text-center gap-3 border"
                >
                  <Text className="text-[13px] text-slate-600 text-center leading-relaxed font-medium">
                    {tr(
                      "referral.guestNotice",
                      "Đăng nhập để nhận mã giới thiệu riêng và tích lũy ngày Pro miễn phí."
                    )}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate("Login")}
                    style={{ backgroundColor: "#0c2340" }}
                    className="flex-row items-center gap-2 py-2.5 px-6 rounded-full"
                  >
                    <LogIn size={14} color="#ffffff" />
                    <Text className="text-sm font-extrabold text-white">
                      {tr("referral.ctaLogin", "Đăng nhập ngay")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 4. CARD B: NHẬP MÃ CỦA BẠN BÈ (MỤC 17.2 ĐẶC TẢ) */}
            <View
              onLayout={(e) => {
                redeemCardYRef.current = e.nativeEvent.layout.y;
              }}
              style={{
                backgroundColor: "#ffffff",
                borderColor: "#e2e8f0",
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 1.5,
              }}
              className="rounded-3xl p-5 border gap-3"
            >
              <View className="flex-row items-center gap-2">
                <View
                  style={{ backgroundColor: "#ecfdf5" }}
                  className="w-8 h-8 rounded-xl items-center justify-center"
                >
                  <Ticket size={16} color="#059669" />
                </View>
                <Text className="text-[15px] font-extrabold text-[#0f172a]">
                  {tr("referral.redeemTitle", "Nhập mã của bạn bè")}
                </Text>
              </View>

              {authToken && referralData?.has_redeemed ? (
                <View
                  style={{ backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }}
                  className="flex-row items-center gap-2.5 p-3.5 rounded-2xl border"
                >
                  <CheckCircle2 size={18} color="#059669" />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-emerald-900">
                      {tr("referral.alreadyRedeemed", "Bạn đã áp dụng mã giới thiệu thành công")}
                    </Text>
                    <Text className="text-[13px] text-emerald-700 mt-0.5 leading-5">
                      {referralData.referred_by_code
                        ? `Mã đã nhập: ${referralData.referred_by_code}. Mỗi tài khoản chỉ áp dụng mã 1 lần.`
                        : "Mỗi tài khoản chỉ được áp dụng mã giới thiệu 1 lần."}
                    </Text>
                  </View>
                </View>
              ) : authToken && !referralData?.can_redeem && referralData?.redeem_seconds_remaining === 0 ? (
                <View
                  style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}
                  className="flex-row items-center gap-2.5 p-3.5 rounded-2xl border"
                >
                  <AlertCircle size={18} color="#e11d48" />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-rose-900">
                      {tr("referral.windowExpired", "Đã hết hạn nhập mã giới thiệu")}
                    </Text>
                    <Text className="text-[13px] text-rose-700 mt-0.5 leading-5">
                      {tr(
                        "referral.windowExpiredDesc",
                        "Mã giới thiệu chỉ có thể nhập trong vòng 24 giờ sau khi tạo tài khoản."
                      )}
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <Text className="text-[13px] text-slate-500 leading-5 font-medium">
                    {tr(
                      "referral.redeemHint",
                      "Mỗi tài khoản chỉ áp dụng mã giới thiệu 1 lần duy nhất."
                    )}
                  </Text>

                  <View className="flex-row gap-2 mt-0.5">
                    <TextInput
                      value={inputCode}
                      onFocus={handleInputFocus}
                      onChangeText={(text) => {
                        setInputCode(text);
                        if (redeemError) setRedeemError(null);
                        if (redeemSuccess) setRedeemSuccess(null);
                      }}
                      placeholder={tr("referral.placeholder", "Nhập mã (VD: ESVIP9)")}
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="characters"
                      maxLength={12}
                      editable={!isRedeeming}
                      style={{ backgroundColor: "#f8fafc", borderColor: "#cbd5e1" }}
                      className="flex-1 h-12 px-4 rounded-2xl border text-sm font-bold text-slate-900"
                    />
                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={isRedeeming || !inputCode.trim()}
                      onPress={handleRedeem}
                      style={{
                        backgroundColor: !inputCode.trim() ? "#e2e8f0" : "#059669",
                      }}
                      className="h-12 px-5 rounded-2xl items-center justify-center flex-row gap-1.5"
                    >
                      {isRedeeming ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Check
                            size={16}
                            color={!inputCode.trim() ? "#94a3b8" : "#ffffff"}
                            strokeWidth={2.5}
                          />
                          <Text
                            style={{ color: !inputCode.trim() ? "#94a3b8" : "#ffffff" }}
                            className="text-sm font-extrabold"
                          >
                            {tr("referral.applyBtn", "Áp dụng")}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Trạng thái mã & Lý do lỗi (Mục 17.3 Đặc tả) */}
              {redeemSuccess ? (
                <View
                  style={{ backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }}
                  className="flex-row items-center gap-2 p-3.5 rounded-2xl border"
                >
                  <CheckCircle2 size={16} color="#059669" />
                  <Text className="flex-1 text-[13px] text-emerald-800 font-semibold leading-relaxed">
                    {redeemSuccess}
                  </Text>
                </View>
              ) : null}

              {redeemError ? (
                <View
                  style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}
                  className="flex-row items-center gap-2 p-3.5 rounded-2xl border"
                >
                  <AlertCircle size={16} color="#e11d48" />
                  <Text className="flex-1 text-[13px] text-rose-800 font-semibold leading-relaxed">
                    {redeemError}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* 5. CARD C: THÔNG TIN CHƯƠNG TRÌNH (CHUẨN 5 TIÊU CHÍ ĐẶC TẢ MỤC 17) */}
            <View
              style={{
                backgroundColor: "#ffffff",
                borderColor: "#e2e8f0",
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 1.5,
              }}
              className="rounded-3xl p-5 border gap-3.5"
            >
              <View className="flex-row items-center gap-2">
                <View
                  style={{ backgroundColor: "#f0f9ff" }}
                  className="w-8 h-8 rounded-xl items-center justify-center"
                >
                  <Info size={16} color="#0284c7" />
                </View>
                <Text className="text-[15px] font-extrabold text-[#0f172a]">
                  {tr("referral.rulesTitle", "Thông tin chương trình")}
                </Text>
              </View>

              <View className="gap-3">
                <View className="flex-row items-center gap-3">
                  <View
                    style={{ backgroundColor: "#fffbeb" }}
                    className="w-8 h-8 rounded-xl items-center justify-center"
                  >
                    <Gift size={15} color="#d97706" />
                  </View>
                  <Text className="flex-1 text-[13px] text-slate-600 font-medium leading-relaxed">
                    {tr(
                      "referral.ruleReward",
                      "Phần thưởng: Nhận ngay 7 ngày EarlySigns Pro đầy đủ tính năng."
                    )}
                  </Text>
                </View>

                <View className="flex-row items-center gap-3">
                  <View
                    style={{ backgroundColor: "#f0f9ff" }}
                    className="w-8 h-8 rounded-xl items-center justify-center"
                  >
                    <Users size={15} color="#0284c7" />
                  </View>
                  <Text className="flex-1 text-[13px] text-slate-600 font-medium leading-relaxed">
                    {tr(
                      "referral.ruleLimit",
                      "Số lần sử dụng: Mỗi tài khoản chỉ được nhập mã 1 lần. Chia sẻ mã không giới hạn."
                    )}
                  </Text>
                </View>

                <View className="flex-row items-center gap-3">
                  <View
                    style={{ backgroundColor: "#ecfdf5" }}
                    className="w-8 h-8 rounded-xl items-center justify-center"
                  >
                    <Clock size={15} color="#059669" />
                  </View>
                  <Text className="flex-1 text-[13px] text-slate-600 font-medium leading-relaxed">
                    {tr(
                      "referral.ruleValidity",
                      "Thời hạn: Mã có hiệu lực trong suốt thời gian chương trình đang mở."
                    )}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
    </SafeAreaView>
  );
}
