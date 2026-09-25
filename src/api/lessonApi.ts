import { httpClient } from "./client";
import { API_ENDPOINTS } from "@/core/config";
import { useBillingStore } from "@/store/useBillingStore";
import { useAuthStore } from "@/store/useAuthStore";
import type { HomeSummary, Dialect } from "@/types/domain";

export const lessonApi = {
  /**
   * Get home summary (streak, journey, weak phonemes, accuracy)
   */
  async getHomeSummary(dialect?: Dialect | string): Promise<HomeSummary | null> {
    const d = dialect || useAuthStore.getState().dialect || "uk";
    const data = await httpClient.get<HomeSummary>(API_ENDPOINTS.LESSONS.HOME_SUMMARY(d));
    if (data) {
      useBillingStore.getState().setHomeSummary(data);
    }
    return data || null;
  },

  /**
   * Fetch personalized AI lesson based on user's weak points
   */
  async getPersonalizedLesson(dialect?: Dialect | string, lazyAssets: boolean = true): Promise<any> {
    const d = dialect || useAuthStore.getState().dialect || "uk";
    return httpClient.get(API_ENDPOINTS.LESSONS.PERSONALIZED(d, lazyAssets));
  },

  /**
   * Fetch lesson for a specific IPA phoneme
   */
  async getPhonemeLesson(phoneme: string, dialect?: Dialect | string, lazyAssets: boolean = true): Promise<any> {
    const d = dialect || useAuthStore.getState().dialect || "uk";
    return httpClient.get(API_ENDPOINTS.LESSONS.PHONEME(phoneme, d, lazyAssets));
  },

  /**
   * Mark phonemes as practiced to progress the learning curve
   */
  async markPracticed(phonemes: string[]): Promise<any> {
    return httpClient.post(API_ENDPOINTS.LESSONS.PRACTICED, { phonemes });
  },

  /**
   * Mark journey step completed
   */
  async completeJourney(): Promise<any> {
    const data = await httpClient.post(API_ENDPOINTS.LESSONS.JOURNEY_COMPLETE, {});
    return data;
  },

  /**
   * Fetch initial screening sentences
   */
  async getScreeningSentences(dialect?: Dialect | string): Promise<any> {
    const d = dialect || useAuthStore.getState().dialect || "uk";
    return httpClient.get(API_ENDPOINTS.SCREENING.SENTENCES(d));
  },

  /**
   * Complete screening assessment and unlock scores
   */
  async completeScreening(): Promise<any> {
    const data = await httpClient.post(API_ENDPOINTS.SCREENING.COMPLETE, {});
    if (data?.screening_status) {
      useAuthStore.getState().setScreeningStatus(data.screening_status);
    }
    return data;
  },
};

export default lessonApi;
