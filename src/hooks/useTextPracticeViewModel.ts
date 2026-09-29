import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Linking, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { customAlert } from "@/utils/customAlert";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/services/Auth";
import {
  resolveUserKey,
  resolveUserTier,
  isOcrQuotaExhausted,
  isAudioQuotaExhausted,
  incrementQuotaUsage,
} from "@/services/usageLimits";
import { useBillingStore } from "@/store/useBillingStore";
import { textPracticeApi } from "@/api";
import {
  useSavedPassagesQuery,
  textPracticeKeys,
} from "@/hooks/queries/useTextPracticeQueries";
import { useBillingUsageQuery } from "@/hooks/queries/useBillingQueries";
import { hapticFeedback } from "@/utils/haptics";
import type { Dialect, LessonSession } from "@/types/domain";

export function useTextPracticeViewModel(navigation?: any) {
  const { t } = useTranslation();
  const { authToken, authEmail, userDialect } = useAuth();
  const queryClient = useQueryClient();

  const [selectedDialect, setSelectedDialect] = useState<Dialect | null>(null);
  const dialect: Dialect = selectedDialect || userDialect || "uk";
  const setDialect = useCallback((d: Dialect) => setSelectedDialect(d), []);

  // TanStack Query: Billing usage & Saved passages
  useBillingUsageQuery(Boolean(authToken));
  const { data: passages = [], isLoading: passagesLoading } = useSavedPassagesQuery(
    30,
    Boolean(authToken)
  );

  const usageStatus = useBillingStore((s) => s.usage);
  const [inputText, setInputText] = useState("");
  const [saveTitle, setSaveTitle] = useState("");
  const [error, setError] = useState("");
  const [prepareLoading, setPrepareLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [lessonSession, setLessonSession] = useState<LessonSession | null>(null);
  const [lessonSessionKey, setLessonSessionKey] = useState(0);

  const scrollViewRef = useRef<any>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates?.height || 0;
      setKeyboardHeight(h);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const openSaveForm = useCallback(() => {
    setShowSaveForm(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, []);

  const onSaveTitleFocus = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === "android" ? 200 : 120);
  }, []);

  // Dynamic Word Count
  const wordCount = useMemo(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [inputText]);

  const userTier = useMemo(
    () =>
      resolveUserTier({
        authToken,
        hasActiveSubscription: Boolean(usageStatus?.has_active_subscription),
        isInTrial: Boolean(usageStatus?.is_in_trial),
      }),
    [authToken, usageStatus]
  );
  const userKey = useMemo(
    () => resolveUserKey({ authToken, authEmail }),
    [authToken, authEmail]
  );

  const startPractice = useCallback(async () => {
    if (!authToken) {
      navigation?.navigate("Login", { next: "Text" });
      return;
    }
    const text = inputText.trim();
    if (!text) {
      setError(t("textPractice.errorEmpty"));
      return;
    }
    setError("");
    setPrepareLoading(true);
    try {
      const { sentences, dialect: d } = await textPracticeApi.prepareText(text, dialect);
      if (!sentences.length) throw new Error(t("textPractice.errorEmpty"));
      navigation?.navigate?.("SentencePractice", {
        sentences,
        dialect: d || dialect,
        lessonTitle: t("textPractice.practiceTitle"),
        mode: "free-input",
      });
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setPrepareLoading(false);
    }
  }, [authToken, dialect, inputText, navigation, t]);

  const savePassage = useCallback(async () => {
    if (!authToken) {
      navigation?.navigate("Login", { next: "Text" });
      return;
    }
    const text = inputText.trim();
    const title = saveTitle.trim();
    if (!text) {
      setError(t("textPractice.errorEmpty"));
      return;
    }
    if (!title) {
      setError(t("textPractice.errorTitle"));
      return;
    }
    setSaveLoading(true);
    try {
      await textPracticeApi.savePassage(text, title, dialect);
      setSaveTitle("");
      await queryClient.invalidateQueries({ queryKey: textPracticeKeys.passages(30) });
      return true;
    } catch (e: any) {
      setError(String(e?.message || e));
      return false;
    } finally {
      setSaveLoading(false);
    }
  }, [authToken, dialect, inputText, navigation, queryClient, saveTitle, t]);

  const handleOcr = useCallback(
    async (fromCamera: boolean) => {
      if (!authToken) {
        navigation?.navigate("Login", { next: "Text" });
        return;
      }
      const isProOrTrial = userTier === "pro" || userTier === "trial";
      if (!isProOrTrial) {
        customAlert.alert(
          t("textPractice.ocr.proRequiredTitle", "Mở khóa Quét ảnh OCR với Pro"),
          t(
            "textPractice.ocr.proRequiredDesc",
            "Tính năng nhận diện văn bản từ hình ảnh (OCR) bằng AI chỉ dành cho thành viên Pro. Nâng cấp ngay để trích xuất bài học từ sách, báo tiếng Anh không giới hạn."
          ),
          [
            { text: t("common.cancel", "Huỷ"), style: "cancel" },
            {
              text: t("profile.upgradePro", "Nâng cấp Pro"),
              onPress: () => navigation?.navigate?.("Payment"),
            },
          ]
        );
        return;
      }
      if (isOcrQuotaExhausted({ userTier, userKey, usageStatus })) {
        setError(t("textPractice.ocrExhausted"));
        return;
      }
      setError("");

      try {
        if (fromCamera) {
          let perm = await ImagePicker.getCameraPermissionsAsync();
          if (!perm.granted) {
            perm = await ImagePicker.requestCameraPermissionsAsync();
          }
          if (!perm.granted) {
            const deniedMsg = t(
              "textPractice.ocr.cameraPermissionDenied",
              "Ứng dụng cần quyền sử dụng máy ảnh để chụp và nhận diện văn bản. Vui lòng cấp quyền trong Cài đặt."
            );
            customAlert.alert(
              t("textPractice.ocr.permissionRequired", "Yêu cầu cấp quyền"),
              deniedMsg,
              [
                { text: t("common.cancel", "Huỷ"), style: "cancel" },
                {
                  text: t("common.openSettings", "Mở Cài đặt"),
                  onPress: () => Linking.openSettings?.(),
                },
              ]
            );
            return;
          }
        } else {
          let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          }
          if (!perm.granted) {
            const deniedMsg = t(
              "textPractice.ocr.galleryPermissionDenied",
              "Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh nhận diện. Vui lòng cấp quyền trong Cài đặt."
            );
            customAlert.alert(
              t("textPractice.ocr.permissionRequired", "Yêu cầu cấp quyền"),
              deniedMsg,
              [
                { text: t("common.cancel", "Huỷ"), style: "cancel" },
                {
                  text: t("common.openSettings", "Mở Cài đặt"),
                  onPress: () => Linking.openSettings?.(),
                },
              ]
            );
            return;
          }
        }

        const result = fromCamera
          ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.8,
            base64: false,
          })
          : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsMultipleSelection: false,
            quality: 0.8,
            base64: false,
          });

        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        setOcrLoading(true);
        if (error) setError("");
        try {
          const text = await textPracticeApi.scanOcr(asset.uri, asset.mimeType || "image/jpeg");
          if (!text) throw new Error(t("textPractice.ocr.empty"));
          setInputText(text);
          incrementQuotaUsage(userKey, "ocr");
          useBillingStore.getState().decrementDailyRemaining();
        } finally {
          setOcrLoading(false);
        }
      } catch (e: any) {
        setOcrLoading(false);
        const errMsg = String(e?.message || e);
        if (errMsg.toLowerCase().includes("permission")) {
          const deniedMsg = fromCamera
            ? t(
              "textPractice.ocr.cameraPermissionDenied",
              "Ứng dụng cần quyền sử dụng máy ảnh để chụp và nhận diện văn bản. Vui lòng cấp quyền trong Cài đặt."
            )
            : t(
              "textPractice.ocr.galleryPermissionDenied",
              "Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh nhận diện. Vui lòng cấp quyền trong Cài đặt."
            );
          customAlert.alert(
            t("textPractice.ocr.permissionRequired", "Yêu cầu cấp quyền"),
            deniedMsg,
            [
              { text: t("common.cancel", "Huỷ"), style: "cancel" },
              {
                text: t("common.openSettings", "Mở Cài đặt"),
                onPress: () => Linking.openSettings?.(),
              },
            ]
          );
        } else if (e?.status === 422 || errMsg.includes("422") || errMsg.includes("no English text")) {
          setError(t("textPractice.ocr.empty"));
        } else if (e?.status === 402 || errMsg.includes("402") || errMsg.includes("PRO_REQUIRED")) {
          customAlert.alert(
            t("textPractice.ocr.proRequiredTitle", "Mở khóa Quét ảnh OCR với Pro"),
            t(
              "textPractice.ocr.proRequiredDesc",
              "Tính năng nhận diện văn bản từ hình ảnh (OCR) bằng AI chỉ dành cho thành viên Pro. Nâng cấp ngay để trích xuất bài học từ sách, báo tiếng Anh không giới hạn."
            ),
            [
              { text: t("common.cancel", "Huỷ"), style: "cancel" },
              {
                text: t("profile.upgradePro", "Nâng cấp Pro"),
                onPress: () => navigation?.navigate?.("Payment"),
              },
            ]
          );
        } else {
          setError(errMsg || t("textPractice.ocr.error"));
        }
      }
    },
    [authToken, navigation, t, usageStatus, userKey, userTier]
  );

  const requestSentenceWords = useCallback(
    async (sentence: any) => {
      return textPracticeApi.getIpaWords(sentence.text, lessonSession?.dialect || dialect);
    },
    [dialect, lessonSession]
  );

  const requestSampleAudio = useCallback(
    async (sentence: any) => {
      const isProOrTrial = userTier === "pro" || userTier === "trial";
      if (!isProOrTrial || isAudioQuotaExhausted({ userTier, userKey, usageStatus })) {
        return null;
      }
      try {
        const audioUrl = await textPracticeApi.generateAudio(sentence.text, lessonSession?.dialect || dialect);
        if (audioUrl) {
          incrementQuotaUsage(userKey, "audio");
          useBillingStore.getState().decrementDailyRemaining();
        }
        return audioUrl;
      } catch {
        return null;
      }
    },
    [dialect, lessonSession, usageStatus, userKey, userTier]
  );

  const closeLessonSession = useCallback(() => {
    setLessonSession(null);
  }, []);

  // Fast Clipboard Paste
  const handlePaste = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        hapticFeedback.light();
        setInputText((prev) => (prev.trim() ? `${prev.trim()}\n${text.trim()}` : text.trim()));
        if (error) setError("");
      }
    } catch {
      /* ignore clipboard error */
    }
  }, [error, setError, setInputText]);

  // Clear Input Text
  const handleClearText = useCallback(() => {
    hapticFeedback.light();
    setInputText("");
    setSaveTitle("");
    setShowSaveForm(false);
    if (error) setError("");
  }, [error, setError, setInputText, setSaveTitle]);

  // Integrated Save Handler
  const handleSavePassage = useCallback(async () => {
    hapticFeedback.medium();
    const ok = await savePassage();
    if (ok) {
      setShowSaveForm(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  }, [savePassage]);

  // Select Saved Passage with Haptics and Auto-Scroll
  const onSelectPassage = useCallback(
    (item: any) => {
      hapticFeedback.selection();
      setInputText(String(item?.text || ""));
      setSaveTitle(String(item?.title || ""));
      scrollViewRef.current?.scrollTo?.({ y: 0, animated: true });
    },
    [setInputText, setSaveTitle]
  );

  return {
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
    scrollViewRef,
    wordCount,
    showSaveForm,
    setShowSaveForm,
    openSaveForm,
    onSaveTitleFocus,
    keyboardHeight,
    saveSuccess,
    handleSavePassage,
    handlePaste,
    handleClearText,
    onSelectPassage,
  };
}

export default useTextPracticeViewModel;
