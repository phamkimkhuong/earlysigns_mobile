import { useCallback, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
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
      setLessonSession({
        kind: "free-input",
        phoneme: null,
        phonemes: [],
        dialect: d || dialect,
        sentences,
        title: t("textPractice.practiceTitle"),
        instructionsHtml: "",
      });
      setLessonSessionKey((k) => k + 1);
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
    } catch (e: any) {
      setError(String(e?.message || e));
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
      if (isOcrQuotaExhausted({ userTier, userKey })) {
        setError(t("textPractice.ocrExhausted"));
        return;
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.8, base64: false })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, base64: false });
      if (result.canceled || !result.assets?.[0]) return;
      setOcrLoading(true);
      try {
        const asset = result.assets[0];
        const text = await textPracticeApi.scanOcr(asset.uri, asset.mimeType || "image/jpeg");
        if (!text) throw new Error(t("textPractice.ocr.empty"));
        setInputText(text);
        incrementQuotaUsage(userKey, "ocr");
      } catch (e: any) {
        setError(String(e?.message || e));
      } finally {
        setOcrLoading(false);
      }
    },
    [authToken, navigation, t, userKey, userTier]
  );

  const requestSentenceWords = useCallback(
    async (sentence: any) => {
      return textPracticeApi.getIpaWords(sentence.text, lessonSession?.dialect || dialect);
    },
    [dialect, lessonSession]
  );

  const requestSampleAudio = useCallback(
    async (sentence: any) => {
      if (isAudioQuotaExhausted({ userTier, userKey })) {
        return null;
      }
      try {
        const audioUrl = await textPracticeApi.generateAudio(sentence.text, lessonSession?.dialect || dialect);
        if (audioUrl) {
          incrementQuotaUsage(userKey, "audio");
        }
        return audioUrl;
      } catch {
        return null;
      }
    },
    [dialect, lessonSession, userKey, userTier]
  );

  const closeLessonSession = useCallback(() => {
    setLessonSession(null);
  }, []);

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
  };
}

export default useTextPracticeViewModel;
