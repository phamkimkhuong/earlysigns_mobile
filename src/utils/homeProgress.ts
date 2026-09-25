const TRACKED_PHONEMES = 44;
const MIN_SUCCESSFUL_CHECKS = 5;
const REQUIRED_COVERAGE = 0.8;

/** Do not infer a completed check from the presence of an accuracy score. */
export function getHomeClarityPercent(
  sounds: readonly { sound?: unknown; checks_count?: unknown; count?: unknown }[],
  totalAccuracy: unknown,
): number | null {
  const qualified = new Set<string>();
  for (const item of sounds) {
    if (!item || typeof item.sound !== "string") continue;
    const sound = item.sound.trim().replace(/^\/+|\/+$/g, "");
    const checks = Number(item.checks_count ?? item.count);
    if (sound && Number.isFinite(checks) && checks >= MIN_SUCCESSFUL_CHECKS) {
      qualified.add(sound);
    }
  }
  if (qualified.size < Math.ceil(TRACKED_PHONEMES * REQUIRED_COVERAGE)) return null;
  if (totalAccuracy == null || totalAccuracy === "") return null;
  const accuracy = Number(totalAccuracy);
  return Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= 1
    ? Math.round(accuracy * 100)
    : null;
}
