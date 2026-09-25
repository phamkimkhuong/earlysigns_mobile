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
   * Generate native British/American RP audio sample for sentence
   */
  async generateAudio(text: string, dialect?: Dialect | string): Promise<string | null> {
    const d = dialect || useAuthStore.getState().dialect || "uk";
    const data = await httpClient.post(API_ENDPOINTS.TEXT_PRACTICE.AUDIO, {
      text,
      dialect: d,
    });
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
