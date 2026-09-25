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
  BookOpen,
  Camera,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Save,
} from "lucide-react-native";
import DialectToggle from "@/components/ui/DialectToggle";
import IPAChecking from "@/components/practice/IPAChecking";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { PassageListSkeleton } from "@/components/ui/Skeleton";
import { useTextPracticeViewModel } from "@/hooks/useTextPracticeViewModel";

function previewText(text: string, max = 90): string {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}

export default function TextPracticeScreen({ navigation }: { navigation?: any }) {
  const {
    t,
    dialect,
    setDialect,
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
    lessonSession,
    lessonSessionKey,
    userTier,
    userKey,
    usageStatus,
    startPractice,
    savePassage,
    handleOcr,
    requestSentenceWords,
    requestSampleAudio,
    closeLessonSession,
  } = useTextPracticeViewModel(navigation);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#1e2538]">
      <ScrollView
        className="flex-1 bg-appBg"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top elastic overscroll filler */}
        <View
          style={{
            position: "absolute",
            top: -1000,
            left: 0,
            right: 0,
            height: 1000,
            backgroundColor: "#1e2538",
          }}
        />

        {/* 1. LUXURY NAVY HERO HEADER */}
        <View className="bg-[#1e2538] pt-3 pb-8 px-5">
          {/* Top Nav Bar */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (navigation?.canGoBack?.()) {
                  navigation.goBack();
                } else {
                  navigation?.navigate?.("Main");
                }
              }}
              className="w-10 h-10 rounded-2xl bg-slate-800 items-center justify-center border border-slate-700"
            >
              <ChevronLeft size={22} color="#ffffff" />
            </TouchableOpacity>

            <Text className="text-base font-extrabold text-white">
              {t("textPractice.screenTitle")}
            </Text>

            <View className="bg-slate-800 border border-slate-700 rounded-full px-3 py-1 flex-row items-center gap-1">
              <Text className="text-xs font-black text-indigo-300">
                {dialect === "us" ? "🇺🇸 US" : "🇬🇧 UK RP"}
              </Text>
            </View>
          </View>

          {/* Hero Content */}
          <View className="flex-row items-center gap-3.5">
            <View className="w-12 h-12 rounded-2xl bg-sky-500 items-center justify-center">
              <BookOpen size={24} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-black text-white tracking-tight">
                {t("textPractice.title")}
              </Text>
              <Text className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                {t("textPractice.subtitle")}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. LAYERED OVERLAPPING CANVAS SHEET */}
        <View className="flex-1 bg-appBg -mt-5 rounded-t-[32px] px-4 pt-5 pb-20 gap-4">
          {/* CARD 1: INPUT & OCR WORKSPACE */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {t("textPractice.practiceContent")}
              </Text>
              <DialectToggle value={dialect} onChange={setDialect} />
            </View>

            {/* Text Input Canvas */}
            <TextInput
              className="min-h-[140px] border border-slate-200 rounded-2xl p-4 text-slate-900 bg-slate-50 text-sm leading-relaxed"
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

            {error ? (
              <View className="p-3 bg-rose-50 border border-rose-200 rounded-2xl">
                <Text className="text-xs text-rose-600 font-medium">{error}</Text>
              </View>
            ) : null}

            {/* OCR Quick Capture Actions */}
            <View className="flex-row gap-2.5">
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={ocrLoading}
                onPress={() => handleOcr(true)}
                className="flex-1 flex-row items-center justify-center gap-2 bg-sky-50 border border-sky-200 py-3 rounded-2xl"
              >
                {ocrLoading ? (
                  <ActivityIndicator size="small" color="#0284c7" />
                ) : (
                  <Camera size={16} color="#0284c7" />
                )}
                <Text className="text-xs font-bold text-sky-800">
                  {t("textPractice.ocr.camera")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={ocrLoading}
                onPress={() => handleOcr(false)}
                className="flex-1 flex-row items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 py-3 rounded-2xl"
              >
                {ocrLoading ? (
                  <ActivityIndicator size="small" color="#4f46e5" />
                ) : (
                  <ImageIcon size={16} color="#4f46e5" />
                )}
                <Text className="text-xs font-bold text-indigo-800">
                  {t("textPractice.ocr.gallery")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Start Practice CTA */}
            <PrimaryButton
              title={prepareLoading ? t("textPractice.preparing") : t("textPractice.start")}
              loading={prepareLoading}
              disabled={!inputText.trim()}
              variant="primary"
              onPress={startPractice}
            />
          </View>

          {/* CARD 2: SAVE TO LIBRARY */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 gap-3.5">
            <View className="flex-row items-center gap-2">
              <Save size={16} color="#4f46e5" />
              <Text className="text-sm font-bold text-slate-900">
                {t("textPractice.saveToCollection")}
              </Text>
            </View>

            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 bg-slate-50 text-xs font-medium"
                value={saveTitle}
                onChangeText={setSaveTitle}
                placeholder={t("textPractice.saveTitlePlaceholder")}
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={saveLoading || !inputText.trim()}
                onPress={savePassage}
                className="bg-indigo-600 active:bg-indigo-700 px-4 py-2.5 rounded-2xl items-center justify-center"
              >
                {saveLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-xs font-bold text-white">{t("textPractice.save")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* CARD 3: SAVED PASSAGES LIBRARY */}
          {passagesLoading ? (
            <PassageListSkeleton count={2} />
          ) : passages.length > 0 ? (
            <View className="gap-2.5">
              <Text className="text-sm font-bold text-slate-900 px-1">
                {t("textPractice.savedPassagesCount", { count: passages.length })}
              </Text>
              <View className="gap-2.5">
                {passages.map((item) => (
                  <TouchableOpacity
                    key={item.id || item.title}
                    activeOpacity={0.8}
                    onPress={() => {
                      setInputText(String(item?.text || ""));
                      setSaveTitle(String(item?.title || ""));
                    }}
                    className="bg-white rounded-2xl p-4 border border-slate-200 flex-row items-center justify-between"
                  >
                    <View className="flex-1 pr-3 gap-1">
                      <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                        {item.title || t("textPractice.untitledPassage")}
                      </Text>
                      <Text className="text-xs text-slate-500 leading-relaxed" numberOfLines={2}>
                        {previewText(item.text)}
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#94a3b8" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* IPA Checking Practice Sheet Modal */}
      <IPAChecking
        open={Boolean(lessonSession)}
        onClose={closeLessonSession}
        sentences={lessonSession?.sentences || []}
        dialect={lessonSession?.dialect || dialect}
        sessionKey={lessonSessionKey}
        autoRecordKey={lessonSessionKey}
        lessonTitle={lessonSession?.title}
        userTier={userTier}
        userKey={userKey}
        usageStatus={usageStatus}
        mode="free-input"
        onRequestSentenceWords={requestSentenceWords}
        onRequestSampleAudio={requestSampleAudio}
      />
    </SafeAreaView>
  );
}
