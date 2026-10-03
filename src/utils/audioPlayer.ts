import type { AudioPlayer } from "expo-audio";

/** createAudioPlayer objects are manually owned; remove() alone is not release(). */
export function releaseAudioPlayer(player: AudioPlayer | null) {
  if (!player) return;
  try { player.pause(); } catch { /* Already stopped/released. */ }
  try { player.removeAllListeners("playbackStatusUpdate"); } catch { /* Already released. */ }
  try { player.remove(); } catch { /* Already removed. */ }
  try { player.release(); } catch { /* Already released. */ }
}
