import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AlertCircle,
  Bookmark,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Crown,
  Image as ImageIcon,
  Save,
  Trash2,
} from "lucide-react-native";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { PassageListSkeleton } from "@/components/ui/Skeleton";
import { useTextPracticeViewModel } from "@/hooks/useTextPracticeViewModel";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/types/navigation";

function previewText(text: string, max = 90): string {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}

export default function TextPracticeScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "Text">) {
  const {
    t,
    inputText,
    setInputText,
    saveTitle,
    setSaveTitle,
    error,
    setError,
    prepareLoading,
    saveLoading,
    ocrLoading,
    passages,
    passagesLoading,
    userTier = "free",
    startPractice,
    handleOcr,
    scrollViewRef,
    wordCount = 0,
    showSaveForm = false,
    setShowSaveForm = () => { },
    openSaveForm = () => { },
    onSaveTitleFocus = () => { },
    keyboardHeight = 0,
    saveSuccess = false,
    handleSavePassage = () => { },
    handlePaste = () => { },
    handleClearText = () => { },
    onSelectPassage = () => { },
  } = useTextPracticeViewModel(navigation);

  const isOcrEntry = route.params?.entry === "ocr";
  const isPro = userTier === "pro" || userTier === "trial";
  const ocrActions = (
    <View testID="text-ocr-actions" className="gap-2.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-slate-600">
          {isOcrEntry ? t("homeDesign.chooseImage") : t("textPractice.ocr.title", "Quét ảnh OCR")}
        </Text>
        {!isPro ? (
          <View
            className="flex-row items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-300 shrink-0"
            style={{ backgroundColor: "#fef3c7" }}
          >
            <Crown size={12} color="#b45309" />
            <Text className="text-xs font-bold text-amber-900" numberOfLines={1}>
              {t("textPractice.ocr.proBadge", "PRO")}
            </Text>
          </View>
        ) : null}
      </View>
      <View className="flex-row flex-wrap gap-2.5">
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.8}
          disabled={ocrLoading}
          onPress={() => handleOcr(true)}
          className="flex-1 min-w-[120px] flex-row items-center justify-center gap-2 bg-sky-50 border border-sky-200 py-3 px-2 rounded-2xl"
          style={{ opacity: ocrLoading ? 0.6 : 1 }}
        >
          <Camera size={16} color="#0284c7" />
          <Text className="text-sm font-bold text-sky-800 flex-shrink">
            {t("textPractice.ocr.camera")}
          </Text>
          {!isPro ? (
            <View
              className="px-1.5 py-0.5 rounded-md shrink-0"
              style={{ backgroundColor: "#0a2644" }}
            >
              <Text className="text-xs font-black text-amber-300" numberOfLines={1}>PRO</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.8}
          disabled={ocrLoading}
          onPress={() => handleOcr(false)}
          className="flex-1 min-w-[120px] flex-row items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 py-3 px-2 rounded-2xl"
          style={{ opacity: ocrLoading ? 0.6 : 1 }}
        >
          <ImageIcon size={16} color="#4f46e5" />
          <Text className="text-sm font-bold text-indigo-800 flex-shrink">
            {t("textPractice.ocr.gallery")}
          </Text>
          {!isPro ? (
            <View
              className="px-1.5 py-0.5 rounded-md shrink-0"
              style={{ backgroundColor: "#0a2644" }}
            >
              <Text className="text-xs font-black text-amber-300" numberOfLines={1}>PRO</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
  );



  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-appBg">
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 bg-appBg"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Top elastic overscroll filler */}
        <View
          style={{
            position: "absolute",
            top: -1000,
            left: 0,
            right: 0,
            height: 1000,
            backgroundColor: "#F7F6F2",
          }}
        />

        {/* 1. TOP NAV BAR */}
        <View className="bg-appBg px-4 py-3 border-b border-slate-200">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t("common.back", "Quay lại")}
              activeOpacity={0.7}
              onPress={() => {
                if (navigation?.canGoBack?.()) {
                  navigation.goBack();
                } else {
                  navigation?.navigate?.("Main");
                }
              }}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 items-center justify-center active:opacity-70"
            >
              <ChevronLeft size={22} color="#0c2340" strokeWidth={2.5} />
            </TouchableOpacity>

            <Text className="text-base font-bold text-[#0c2340]">
              {t("textPractice.title")}
            </Text>

            <View className="w-10 h-10" />
          </View>

          {/* Clean Subtitle Bar */}
        </View>

        {/* 2. MAIN CONTENT */}
        <View className="flex-1 bg-appBg px-4 pt-4 pb-20 gap-4">
          {/* CARD 1: INPUT & OCR WORKSPACE (Consolidated Seamless Design) */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 gap-4">
            {/* Toolbar Header */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Text className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {t("textPractice.practiceContent")}
                </Text>
                {wordCount > 0 ? (
                  <View className="bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    <Text className="text-xs font-bold text-slate-600">
                      {wordCount} {t("common.words", "từ")}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Quick editor utilities: Paste & Clear */}
              <View className="flex-row items-center gap-1.5">
                {inputText.trim() ? (
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={t("home.clear", "Xóa")}
                    activeOpacity={0.7}
                    onPress={handleClearText}
                    className="p-1.5 rounded-lg bg-slate-100 active:bg-slate-200"
                  >
                    <Trash2 size={14} color="#64748b" />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={t("textPractice.paste", "Dán")}
                  activeOpacity={0.7}
                  onPress={handlePaste}
                  className="flex-row items-center gap-1 py-1.5 px-2.5 rounded-xl bg-slate-100 active:bg-slate-200 border border-slate-200"
                >
                  <ClipboardPaste size={13} color="#475569" />
                  <Text className="text-sm font-bold text-slate-700">
                    {t("textPractice.paste", "Dán")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* OCR Prompts when routed with entry === "ocr" */}
            {isOcrEntry ? ocrActions : null}

            {/* OCR Live Recognition Status Banner (Single focused indicator) */}
            {ocrLoading ? (
              <View className="flex-row items-center gap-3 p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200">
                <ActivityIndicator size="small" color="#4f46e5" />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-indigo-900">
                    {t("textPractice.ocr.working", "Đang đọc và nhận diện văn bản...")}
                  </Text>
                  <Text className="text-[13px] text-indigo-700 mt-0.5">
                    {t("textPractice.ocr.readingTip", "Hệ thống AI đang trích xuất chữ tiếng Anh từ hình ảnh...")}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Text Input Canvas */}
            <TextInput
              testID="text-practice-input"
              accessibilityLabel={t("homeDesign.inputTitle")}
              autoFocus={route.params?.entry === "input"}
              className="min-h-[140px] border border-slate-200 rounded-2xl p-4 text-slate-900 bg-slate-50 text-[15px] leading-6"
              multiline
              style={{ textAlignVertical: "top" }}
              value={inputText}
              onChangeText={(v) => {
                setInputText(v);
                if (error) setError("");
              }}
              placeholder={t("textPractice.placeholder")}
              placeholderTextColor="#94a3b8"
            />

            {/* Error Notification with Icon */}
            {error ? (
              <View className="flex-row items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-2xl">
                <AlertCircle size={16} color="#e11d48" />
                <Text className="flex-1 text-[13px] text-rose-700 font-semibold leading-5">{error}</Text>
              </View>
            ) : null}

            {/* OCR Quick Capture Actions (when entry !== "ocr") */}
            {!isOcrEntry ? ocrActions : null}

            {/* Primary Action: Start Practice */}
            <PrimaryButton
              title={prepareLoading ? t("textPractice.preparing") : t("textPractice.start")}
              loading={prepareLoading}
              disabled={!inputText.trim()}
              variant="primary"
              onPress={startPractice}
              style={{
                backgroundColor: !inputText.trim() ? "#94a3b8" : "#0a2644",
                borderRadius: 16,
              }}
            />

            {/* Integrated Save to Collection (Seamless Inline Action) */}
            {inputText.trim() ? (
              showSaveForm ? (
                <View className="pt-3 border-t border-slate-100 gap-2.5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5">
                      <Save size={14} color="#0a2644" />
                      <Text className="text-sm font-bold text-[#0a2644]">
                        {t("textPractice.saveToCollection")}
                      </Text>
                    </View>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={t("common.cancel", "Huỷ")}
                      activeOpacity={0.7}
                      onPress={() => setShowSaveForm(false)}
                    >
                      <Text className="text-sm font-semibold text-slate-500">
                        {t("common.cancel", "Huỷ")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row gap-2">
                    <TextInput
                      accessibilityLabel={t("textPractice.saveTitlePlaceholder", "Tiêu đề lưu đoạn văn")}
                      className="flex-1 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 bg-slate-50 text-sm font-medium"
                      value={saveTitle}
                      onChangeText={setSaveTitle}
                      onFocus={onSaveTitleFocus}
                      placeholder={t("textPractice.saveTitlePlaceholder")}
                      placeholderTextColor="#94a3b8"
                    />
                    <TouchableOpacity
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={t("textPractice.save")}
                      activeOpacity={0.8}
                      disabled={saveLoading || !saveTitle.trim()}
                      onPress={handleSavePassage}
                      className="px-4 py-2.5 rounded-2xl items-center justify-center flex-row gap-1.5"
                      style={{ backgroundColor: "#0a2644", opacity: saveTitle.trim() ? 1 : 0.6 }}
                    >
                      {saveLoading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Check size={14} color="#ffffff" strokeWidth={3} />
                          <Text className="text-sm font-bold text-white">{t("textPractice.save")}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View className="flex-row items-center justify-between pt-1">
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={t("textPractice.saveToCollection")}
                    activeOpacity={0.7}
                    onPress={openSaveForm}
                    className="flex-row items-center gap-1.5 py-1 px-1 rounded-lg"
                  >
                    <Save size={14} color="#0a2644" />
                    <Text className="text-sm font-bold text-[#0a2644]">
                      {t("textPractice.saveToCollection", "Lưu bài này vào bộ sưu tập")}
                    </Text>
                  </TouchableOpacity>
                  {saveSuccess ? (
                    <View className="flex-row items-center gap-1">
                      <Check size={13} color="#16a34a" strokeWidth={3} />
                      <Text className="text-[13px] font-bold text-emerald-600">
                        {t("common.saved", "Đã lưu thành công")}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )
            ) : null}
          </View>

          {/* CARD 2: SAVED PASSAGES LIBRARY */}
          {passagesLoading ? (
            <PassageListSkeleton count={2} />
          ) : passages.length > 0 ? (
            <View className="gap-2.5">
              <View className="flex-row items-center gap-1.5 px-1">
                <Bookmark size={15} color="#475569" />
                <Text className="text-[15px] font-bold text-slate-800">
                  {t("textPractice.savedPassagesCount", { count: passages.length })}
                </Text>
              </View>
              <View className="gap-2.5">
                {passages.map((item) => (
                  <TouchableOpacity
                    key={item.id || item.title}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={item.title || t("textPractice.untitledPassage")}
                    activeOpacity={0.75}
                    onPress={() => onSelectPassage(item)}
                    className="bg-white rounded-2xl p-4 border border-slate-200 flex-row items-center justify-between"
                    style={{
                      elevation: 1,
                      shadowColor: "#0f172a",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.04,
                      shadowRadius: 3,
                    }}
                  >
                    <View className="flex-1 pr-3 gap-1">
                      <Text className="text-[15px] font-bold text-slate-900" numberOfLines={1}>
                        {item.title || t("textPractice.untitledPassage")}
                      </Text>
                      <Text className="text-[13px] text-slate-500 leading-relaxed" numberOfLines={2}>
                        {previewText(item.text)}
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#94a3b8" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {/* Dynamic Keyboard Avoidance Spacer */}
          {keyboardHeight > 0 ? (
            <View style={{ height: keyboardHeight + 40 }} />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
