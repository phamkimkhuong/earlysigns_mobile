import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  RefreshControl,
  type RefreshControlProps,
} from "react-native";
import * as Haptics from "expo-haptics";
import { showToast } from "@/utils/toast";

export type RefreshTask = () => Promise<unknown> | unknown;

export interface UsePullToRefreshOptions {
  /**
   * Minimum duration (in ms) the refresh spinner remains visible.
   * Prevents visual flashing/jitter on super-fast network or cached responses.
   * @default 450
   */
  minDurationMs?: number;

  /**
   * Triggers subtle tactile feedback on native devices when refresh initiates.
   * Uses `expo-haptics` (ImpactFeedbackStyle.Light).
   * @default true
   */
  enableHaptics?: boolean;

  /**
   * Callback fired immediately when refresh completes successfully.
   */
  onSuccess?: () => void;

  /**
   * Callback fired when refresh fails.
   */
  onError?: (error: unknown) => void;

  /**
   * Automatically display an error toast notification on failure.
   * @default false
   */
  showErrorToast?: boolean;

  /**
   * Custom message for the error toast, or a function resolving a message from the error.
   */
  errorToastMessage?: string | ((err: unknown) => string);

  /**
   * Primary spinner tint color for iOS.
   * @default "#f59e0b" (Warning/Amber matching app theme)
   */
  tintColor?: string;

  /**
   * Spinner color sequence for Android.
   * @default ["#f59e0b", "#4f46e5"]
   */
  colors?: string[];

  /**
   * Background color of the spinner circle on Android.
   */
  progressBackgroundColor?: string;

  /**
   * Vertical offset distance for the progress view on Android.
   */
  progressViewOffset?: number;
}

export interface UsePullToRefreshResult {
  /**
   * Whether a refresh operation is currently in flight.
   */
  refreshing: boolean;

  /**
   * The handler to attach to `<RefreshControl onRefresh={onRefresh} />`.
   * Concurrency-guarded: duplicate rapid pulls while in-flight are safely ignored.
   */
  onRefresh: () => Promise<void>;

  /**
   * Programmatic refresh trigger (e.g. for Retry buttons or external signals).
   */
  refresh: () => Promise<void>;

  /**
   * The error caught during the last refresh, or null if successful.
   */
  error: Error | null;

  /**
   * Manually clears the current error state.
   */
  clearError: () => void;

  /**
   * Ready-to-spread props directly into `<RefreshControl {...refreshControlProps} />`.
   */
  refreshControlProps: RefreshControlProps;

  /**
   * Pre-configured `<RefreshControl />` element generator for clean one-liners:
   * `<ScrollView refreshControl={renderRefreshControl()} />`
   * `<FlatList refreshControl={renderRefreshControl({ tintColor: '#4f46e5' })} />`
   */
  renderRefreshControl: (overrides?: Partial<RefreshControlProps>) => React.ReactElement;
}

const DEFAULT_MIN_DURATION_MS = 450;
const DEFAULT_TINT_COLOR = "#f59e0b";
const DEFAULT_ANDROID_COLORS = ["#f59e0b", "#4f46e5"];

/**
 * Senior-level reusable Pull-To-Refresh hook.
 *
 * Highlights:
 * 1. Anti-race & concurrency guard: Prevents redundant parallel requests if pulled while loading.
 * 2. Mount-safe: Guarantees zero `setState` calls after unmount, eliminating memory leak warnings.
 * 3. Anti-flicker: Ensures a configurable minimum spinner duration for butter-smooth visual UX.
 * 4. Native haptic feedback: Delivers tactile confirmation on pull trigger via `expo-haptics`.
 * 5. Multi-task support: Accepts a single async task or an array of tasks executed in parallel.
 * 6. Ergonomic DX: Provides `refreshing`, `onRefresh`, `refreshControlProps`, and `renderRefreshControl()`.
 */
export function usePullToRefresh(
  task: RefreshTask | RefreshTask[],
  options: UsePullToRefreshOptions = {}
): UsePullToRefreshResult {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const minDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep references to latest task and options in effects (React 19 / Compiler compliant)
  const latestTaskRef = useRef<RefreshTask | RefreshTask[]>(task);
  const latestOptionsRef = useRef<UsePullToRefreshOptions>(options);

  useEffect(() => {
    latestTaskRef.current = task;
  }, [task]);

  useEffect(() => {
    latestOptionsRef.current = options;
  }, [options]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (minDurationTimerRef.current) {
        clearTimeout(minDurationTimerRef.current);
        minDurationTimerRef.current = null;
      }
    };
  }, []);

  const clearError = useCallback(() => {
    if (isMountedRef.current) {
      setError(null);
    }
  }, []);

  const onRefresh = useCallback(async (): Promise<void> => {
    // 1. Concurrency guard: Ignore if already running
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const opts = latestOptionsRef.current;
    const minDuration = opts.minDurationMs ?? DEFAULT_MIN_DURATION_MS;
    const enableHaptics = opts.enableHaptics ?? true;

    if (isMountedRef.current) {
      setRefreshing(true);
      setError(null);
    }

    // 2. Subtle haptic feedback on trigger
    if (enableHaptics && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    const startTime = Date.now();
    let caughtError: unknown = null;

    // 3. Execute task(s) safely
    try {
      const currentTask = latestTaskRef.current;
      if (Array.isArray(currentTask)) {
        await Promise.all(currentTask.map((t) => (typeof t === "function" ? t() : Promise.resolve())));
      } else if (typeof currentTask === "function") {
        await currentTask();
      }
    } catch (err) {
      caughtError = err;
    }

    // 4. Smooth anti-flicker: Ensure spinner satisfies minDurationMs
    const elapsed = Date.now() - startTime;
    const remainingMs = Math.max(0, minDuration - elapsed);

    if (remainingMs > 0) {
      await new Promise<void>((resolve) => {
        minDurationTimerRef.current = setTimeout(() => {
          minDurationTimerRef.current = null;
          resolve();
        }, remainingMs);
      });
    }

    inFlightRef.current = false;

    // 5. Mount-safe state dispatch
    if (!isMountedRef.current) return;

    setRefreshing(false);

    if (caughtError) {
      const errObj = caughtError instanceof Error ? caughtError : new Error(String(caughtError));
      setError(errObj);
      opts.onError?.(caughtError);

      if (opts.showErrorToast) {
        const msg =
          typeof opts.errorToastMessage === "function"
            ? opts.errorToastMessage(caughtError)
            : opts.errorToastMessage || errObj.message || "Không thể làm mới dữ liệu";
        showToast.error("Lỗi làm mới", msg);
      }
    } else {
      opts.onSuccess?.();
    }
  }, []);

  const tintColor = options.tintColor ?? DEFAULT_TINT_COLOR;
  const colors = options.colors ?? DEFAULT_ANDROID_COLORS;
  const progressBackgroundColor = options.progressBackgroundColor;
  const progressViewOffset = options.progressViewOffset;

  const refreshControlProps: RefreshControlProps = useMemo(
    () => ({
      refreshing,
      onRefresh,
      tintColor,
      colors,
      progressBackgroundColor,
      progressViewOffset,
    }),
    [refreshing, onRefresh, tintColor, colors, progressBackgroundColor, progressViewOffset]
  );

  const renderRefreshControl = useCallback(
    (overrides?: Partial<RefreshControlProps>): React.ReactElement =>
      React.createElement(RefreshControl, {
        ...refreshControlProps,
        ...overrides,
      }),
    [refreshControlProps]
  );

  return {
    refreshing,
    onRefresh,
    refresh: onRefresh,
    error,
    clearError,
    refreshControlProps,
    renderRefreshControl,
  };
}
