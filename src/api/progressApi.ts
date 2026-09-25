import { httpClient } from "./client";
import { API_ENDPOINTS } from "@/core/config";
import { useAuthStore } from "@/store/useAuthStore";
import type { Dialect } from "@/types/domain";

export const progressApi = {
  /**
   * Fetch all 44 IPA phonemes progress for radar/progress chart
   */
  async getSounds(dialect?: Dialect | string): Promise<any[]> {
    const d = dialect || useAuthStore.getState().dialect || "uk";
    const data = await httpClient.get(API_ENDPOINTS.PROGRESS.SOUNDS(d));
    return Array.isArray(data?.items) ? data.items : [];
  },

  /**
   * Fetch daily historical practice accuracy
   */
  async getHistory(start: string, end: string): Promise<any[]> {
    const data = await httpClient.get(API_ENDPOINTS.PROGRESS.HISTORY(start, end));
    return Array.isArray(data?.items) ? data.items : [];
  },

  /**
   * Log fine-grained phoneme progress after pronunciation check
   */
  async logSoundProgress(charAlignment: any[]): Promise<any> {
    if (!Array.isArray(charAlignment) || charAlignment.length === 0) return null;
    return httpClient.post(API_ENDPOINTS.PROGRESS.LOG_SOUND, {
      char_alignment: charAlignment,
    });
  },
};

export default progressApi;
