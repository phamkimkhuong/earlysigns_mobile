import { httpClient } from "./client";
import { API_ENDPOINTS } from "@/core/config";
import { useAuthStore } from "@/store/useAuthStore";
import { appendLocalFile } from "@/utils/formDataFile";
import type { Dialect } from "@/types/domain";

export const textPracticeApi = {
  /**
   * Prepare arbitrary text into sentences ready for practice
   */
  async prepareText(
    text: string,
    dialect?: Dialect | string
  ): Promise<{ sentences: any[]; dialect: string }> {
    const d = dialect || useAuthStore.getState().dialect || "uk";
    const data = await httpClient.post(API_ENDPOINTS.TEXT_PRACTICE.PREPARE, {
      text,
      dialect: d,
      include_audio: false,
      include_words: false,
    });
    return {
      sentences: Array.isArray(data?.sentences) ? data.sentences : [],
      dialect: data?.dialect || d,
    };
  },

  /**
   * Scan image using Camera/Gallery OCR
   */
  async scanOcr(imageUri: string, mimeType: string = "image/jpeg"): Promise<string> {
    const form = new FormData();
    await appendLocalFile(form, "image", imageUri, "photo.jpg", mimeType);
    const data = await httpClient.upload(API_ENDPOINTS.TEXT_PRACTICE.OCR, form);
    return String(data?.text || "").trim();
  },

  /**
   * Get IPA transcription and words for a given sentence
   */
  async getIpaWords(text: string, dialect?: Dialect | string): Promise<any[]> {
    const d = dialect || useAuthStore.getState().dialect || "uk";
    const data = await httpClient.post(API_ENDPOINTS.TEXT_PRACTICE.IPA, {
      text,
      dialect: d,
    });
    return Array.isArray(data?.words) ? data.words : [];
  },

  /**
   * Fetch pre-recorded audio sample or generate native AI audio sample
   * @param text Sentence or word text
   * @param dialect Dialect ('uk' | 'us')
   * @param generate Whether to dynamically generate TTS audio if not pre-recorded.
   *                 Set to false for lesson/phoneme practice with predetermined words to use free static S3 audio without requiring Pro.
   */
  async generateAudio(
    text: string,
    dialect?: Dialect | string,
    generate?: boolean
  ): Promise<string | null> {
    const d = dialect || useAuthStore.getState().dialect || "uk";
    const payload: { text: string; dialect: string; generate?: boolean } = {
      text,
      dialect: d,
    };
    if (typeof generate === "boolean") {
      payload.generate = generate;
    }
    const data = await httpClient.post(API_ENDPOINTS.TEXT_PRACTICE.AUDIO, payload);
    return String(data?.audio_url || "").trim() || null;
  },

  /**
   * Fetch saved reading passages
   */
  async getSavedPassages(limit: number = 30): Promise<any[]> {
    const data = await httpClient.get(API_ENDPOINTS.TEXT_PRACTICE.PASSAGES, { limit });
    return Array.isArray(data?.items) ? data.items : [];
  },

  /**
   * Save custom passage to user history
   */
  async savePassage(text: string, title: string, dialect?: Dialect | string): Promise<any> {
    const d = dialect || useAuthStore.getState().dialect || "uk";
    return httpClient.post(API_ENDPOINTS.TEXT_PRACTICE.PASSAGES, {
      text,
      title,
      dialect: d,
    });
  },
};

export default textPracticeApi;
