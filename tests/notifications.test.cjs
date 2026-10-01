const test = require("node:test");
const assert = require("node:assert/strict");

// Mocking logic from handleNotificationResponse
function simulateNotificationRouting({
  payload,
  isAuthenticated,
  currentRoute,
  isAppActive = false,
  now = Date.now(),
}) {
  let navigatedTo = null;
  let navigatedParams = null;
  let toastShown = null;
  let alertPrompted = false;

  // 1. Expiration check
  if (payload.expiresAt && Number(payload.expiresAt) < now) {
    toastShown = { type: "info", message: "expired" };
    navigatedTo = "Main";
    return { navigatedTo, navigatedParams, toastShown, alertPrompted };
  }

  // 2. Resolve destination
  let targetRoute = payload.targetRoute || "";
  let targetParams = payload.targetParams || {};

  if (!targetRoute) {
    if (payload.type === "INCOMPLETE_LESSON" || payload.youtubeId) {
      if (payload.youtubeId) {
        targetRoute = "VideoPractice";
        targetParams = { youtubeId: payload.youtubeId };
      } else if (payload.lessonType === "phonemes") {
        targetRoute = "Phonemes";
      } else if (payload.lessonType === "text") {
        targetRoute = "Text";
      } else {
        targetRoute = "Main";
      }
    } else if (payload.type === "PROMOTION") {
      targetRoute = "Payment";
    } else if (payload.type === "NEW_CONTENT") {
      targetRoute = "Videos";
    } else if (payload.type === "DAILY_PRACTICE" || payload.type === "STREAK_REMINDER") {
      targetRoute = "Main";
    } else if (payload.screen) {
      targetRoute = payload.screen === "Home" ? "Main" : payload.screen;
    } else {
      targetRoute = "Main";
    }
  }

  // 3. Auth check
  if (payload.requiresAuth && !isAuthenticated) {
    navigatedTo = "Login";
    navigatedParams = {
      next: targetRoute,
      nextParams: targetParams,
    };
    return { navigatedTo, navigatedParams, toastShown, alertPrompted };
  }

  // 4. Foreground confirmation check across all screens when app is open (Section 16.4 Phương án B)
  if (isAppActive && currentRoute !== targetRoute) {
    const isPracticing = ["VideoPractice", "Text", "Phonemes"].includes(currentRoute);
    alertPrompted = true;
    const alertType = isPracticing ? "warning" : "prompt";
    return {
      navigatedTo: null,
      navigatedParams: null,
      toastShown,
      alertPrompted,
      alertType,
      pendingTarget: targetRoute,
    };
  }

  navigatedTo = targetRoute;
  navigatedParams = targetParams;
  return { navigatedTo, navigatedParams, toastShown, alertPrompted };
}

test("expired notification falls back safely to Main with expired notice", () => {
  const result = simulateNotificationRouting({
    payload: {
      type: "PROMOTION",
      expiresAt: Date.now() - 10000,
    },
    isAuthenticated: true,
    currentRoute: "Home",
  });

  assert.equal(result.navigatedTo, "Main");
  assert.equal(result.toastShown?.type, "info");
});

test("requiresAuth notification redirects unauthenticated user to Login with nextRoute", () => {
  const result = simulateNotificationRouting({
    payload: {
      type: "INCOMPLETE_LESSON",
      youtubeId: "abc12345",
      requiresAuth: true,
    },
    isAuthenticated: false,
    currentRoute: "Home",
  });

  assert.equal(result.navigatedTo, "Login");
  assert.equal(result.navigatedParams.next, "VideoPractice");
  assert.equal(result.navigatedParams.nextParams.youtubeId, "abc12345");
});

test("incomplete lesson notification routes directly to VideoPractice when authenticated", () => {
  const result = simulateNotificationRouting({
    payload: {
      type: "INCOMPLETE_LESSON",
      youtubeId: "xyz987",
      requiresAuth: true,
    },
    isAuthenticated: true,
    currentRoute: "Home",
  });

  assert.equal(result.navigatedTo, "VideoPractice");
  assert.equal(result.navigatedParams.youtubeId, "xyz987");
});

test("promotion notification routes to Payment screen", () => {
  const result = simulateNotificationRouting({
    payload: {
      type: "PROMOTION",
      targetParams: { packageId: "pro_annual" },
    },
    isAuthenticated: true,
    currentRoute: "Home",
  });

  assert.equal(result.navigatedTo, "Payment");
  assert.equal(result.navigatedParams.packageId, "pro_annual");
});

test("active practice session prompts confirmation dialog before leaving", () => {
  const result = simulateNotificationRouting({
    payload: {
      type: "DAILY_PRACTICE",
    },
    isAuthenticated: true,
    currentRoute: "VideoPractice",
    isAppActive: true,
  });

  assert.equal(result.alertPrompted, true);
  assert.equal(result.alertType, "warning");
  assert.equal(result.navigatedTo, null);
  assert.equal(result.pendingTarget, "Main");
});

test("foreground notification on any screen prompts confirmation before switching screens (Section 16.4 Phương án B)", () => {
  const result = simulateNotificationRouting({
    payload: {
      type: "PROMOTION",
      targetParams: { packageId: "pro_annual" },
    },
    isAuthenticated: true,
    currentRoute: "Profile",
    isAppActive: true,
  });

  assert.equal(result.alertPrompted, true);
  assert.equal(result.alertType, "prompt");
  assert.equal(result.navigatedTo, null);
  assert.equal(result.pendingTarget, "Payment");
});

test("foreground notification does not prompt alert if user is already on target screen", () => {
  const result = simulateNotificationRouting({
    payload: {
      type: "PROMOTION",
      targetParams: { packageId: "pro_annual" },
    },
    isAuthenticated: true,
    currentRoute: "Payment",
    isAppActive: true,
  });

  assert.equal(result.alertPrompted, false);
  assert.equal(result.navigatedTo, "Payment");
});

test("initial notification settings have all toggles disabled by default", () => {
  const DEFAULT_SETTINGS = {
    dailyReminderEnabled: false,
    dailyReminderHour: 20,
    dailyReminderMinute: 0,
    incompleteLessonEnabled: false,
    streakReminderEnabled: false,
    contentUpdatesEnabled: false,
    promotionsEnabled: false,
  };

  assert.equal(DEFAULT_SETTINGS.dailyReminderEnabled, false);
  assert.equal(DEFAULT_SETTINGS.incompleteLessonEnabled, false);
  assert.equal(DEFAULT_SETTINGS.streakReminderEnabled, false);
  assert.equal(DEFAULT_SETTINGS.contentUpdatesEnabled, false);
  assert.equal(DEFAULT_SETTINGS.promotionsEnabled, false);
});

test("granular toggles: user can disable incomplete lesson reminder independently", () => {
  function canScheduleIncomplete({ incompleteLessonEnabled, permissionGranted }) {
    if (!incompleteLessonEnabled) return false;
    if (!permissionGranted) return false;
    return true;
  }

  assert.equal(canScheduleIncomplete({ incompleteLessonEnabled: false, permissionGranted: true }), false);
  assert.equal(canScheduleIncomplete({ incompleteLessonEnabled: true, permissionGranted: false }), false);
  assert.equal(canScheduleIncomplete({ incompleteLessonEnabled: true, permissionGranted: true }), true);
});

test("granular toggles: user can disable streak reminder independently", () => {
  function canScheduleStreak({ streakReminderEnabled, permissionGranted }) {
    if (!streakReminderEnabled) return false;
    if (!permissionGranted) return false;
    return true;
  }

  assert.equal(canScheduleStreak({ streakReminderEnabled: false, permissionGranted: true }), false);
  assert.equal(canScheduleStreak({ streakReminderEnabled: true, permissionGranted: false }), false);
  assert.equal(canScheduleStreak({ streakReminderEnabled: true, permissionGranted: true }), true);
});

test("permission flow: undetermined status requires soft-ask before system prompt", async () => {
  let softAsked = false;
  let osRequested = false;

  async function ensurePermission(userChoice) {
    const status = { granted: false, canAskAgain: true, status: "undetermined" };
    if (status.granted) return true;

    // Soft ask
    softAsked = true;
    if (userChoice === "later") {
      return false;
    }

    osRequested = true;
    return true;
  }

  const resultLater = await ensurePermission("later");
  assert.equal(softAsked, true);
  assert.equal(osRequested, false);
  assert.equal(resultLater, false);

  const resultContinue = await ensurePermission("continue");
  assert.equal(osRequested, true);
  assert.equal(resultContinue, true);
});

// Logic from calculateIncompleteLessonTriggerDate
function calculateIncompleteLessonTriggerDate(delayHours = 3, now = new Date()) {
  const targetDate = new Date(now.getTime() + delayHours * 3600 * 1000);
  const hour = targetDate.getHours();

  if (hour >= 22 || hour < 8) {
    if (hour >= 22) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    targetDate.setHours(9, 0, 0, 0);
  }
  return targetDate;
}

test("night curfew: daytime reminder fires after exact delay", () => {
  const base = new Date("2026-09-28T14:00:00");
  const target = calculateIncompleteLessonTriggerDate(3, base);

  assert.equal(target.getHours(), 17);
  assert.equal(target.getMinutes(), 0);
  assert.equal(target.getDate(), 28);
});

test("night curfew: reminder landing in late night (23:30) is postponed to 09:00 next day", () => {
  const base = new Date("2026-09-28T20:30:00");
  const target = calculateIncompleteLessonTriggerDate(3, base);

  assert.equal(target.getHours(), 9);
  assert.equal(target.getMinutes(), 0);
  assert.equal(target.getDate(), 29);
});

test("night curfew: reminder landing past midnight (02:30) is postponed to 09:00 morning", () => {
  const base = new Date("2026-09-28T23:30:00");
  const target = calculateIncompleteLessonTriggerDate(3, base);

  assert.equal(target.getHours(), 9);
  assert.equal(target.getMinutes(), 0);
  assert.equal(target.getDate(), 29);
});

test("night curfew: reminder landing in early morning (06:00) is postponed to 09:00 morning", () => {
  const base = new Date("2026-09-28T03:00:00");
  const target = calculateIncompleteLessonTriggerDate(3, base);

  assert.equal(target.getHours(), 9);
  assert.equal(target.getMinutes(), 0);
  assert.equal(target.getDate(), 28);
});

function resolveIncompleteLessonExitAction({ hasPracticed, totalSegments, activeIndex }) {
  const hasSegments = totalSegments > 0;
  const isFinished = hasSegments && activeIndex >= totalSegments - 1;

  if (isFinished) {
    return "cancel";
  }
  if (hasPracticed && hasSegments) {
    return "schedule";
  }
  return "none";
}

test("practice threshold: exit without recording does not schedule reminder", () => {
  const action = resolveIncompleteLessonExitAction({
    hasPracticed: false,
    totalSegments: 10,
    activeIndex: 2,
  });

  assert.equal(action, "none");
});

test("practice threshold: exit after recording incomplete lesson schedules reminder", () => {
  const action = resolveIncompleteLessonExitAction({
    hasPracticed: true,
    totalSegments: 10,
    activeIndex: 2,
  });

  assert.equal(action, "schedule");
});

test("practice threshold: exit after completing all sentences cancels reminder", () => {
  const action = resolveIncompleteLessonExitAction({
    hasPracticed: true,
    totalSegments: 10,
    activeIndex: 9,
  });

  assert.equal(action, "cancel");
});

test("push sync: device registration payload contains expo_push_token, device_id, platform, and omits user_id from body", () => {
  const payload = {
    expo_push_token: "ExponentPushToken[mock-token-xyz]",
    device_id: "9b1d614a-5712-42df-b433-28945a6136b2",
    platform: "ios",
    app_version: "1.0.0",
    locale: "vi",
    timezone: "Asia/Ho_Chi_Minh",
  };

  assert.ok(payload.expo_push_token.startsWith("ExponentPushToken["));
  assert.equal(payload.platform, "ios");
  assert.equal(typeof payload.device_id, "string");
  // Zero-trust: user_id must NOT be sent in body to prevent IDOR hijacking
  assert.equal((payload).user_id, undefined);
});

test("push sync: preferences response correctly updates local content updates and promotions toggles", () => {
  const localSettings = {
    dailyReminderEnabled: true,
    incompleteLessonEnabled: true,
    streakReminderEnabled: true,
    contentUpdatesEnabled: false,
    promotionsEnabled: false,
  };

  const serverResponse = {
    ok: true,
    device_id: "9b1d614a-5712-42df-b433-28945a6136b2",
    preferences: {
      content_updates_enabled: true,
      promotions_enabled: true,
    },
  };

  const updatedSettings = {
    ...localSettings,
    contentUpdatesEnabled: serverResponse.preferences.content_updates_enabled,
    promotionsEnabled: serverResponse.preferences.promotions_enabled,
  };

  assert.equal(updatedSettings.contentUpdatesEnabled, true);
  assert.equal(updatedSettings.promotionsEnabled, true);
  // Local reminders should remain unaffected by remote preferences
  assert.equal(updatedSettings.dailyReminderEnabled, true);
  assert.equal(updatedSettings.incompleteLessonEnabled, true);
});

test("push sync: logout unregisters only current device_id to preserve other devices", () => {
  const userDevices = [
    { device_id: "device-iphone-1", token: "ExponentPushToken[A]", is_active: true },
    { device_id: "device-ipad-2", token: "ExponentPushToken[B]", is_active: true },
  ];

  const logoutDeviceId = "device-iphone-1";
  const updatedDevices = userDevices.map((d) =>
    d.device_id === logoutDeviceId ? { ...d, is_active: false } : d
  );

  assert.equal(updatedDevices.find((d) => d.device_id === "device-iphone-1").is_active, false);
  assert.equal(updatedDevices.find((d) => d.device_id === "device-ipad-2").is_active, true);
});

test("device_id: persistent installation ID format is valid UUID v4 compliant without hardware identifiers", () => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const mockUuid = "9b1d614a-5712-42df-b433-28945a6136b2";

  assert.ok(uuidRegex.test(mockUuid));
  // Must not look like MAC address or IMEI
  assert.ok(!mockUuid.includes(":"));
  assert.ok(mockUuid.length === 36);
});

// ============================================================================
// Phần bổ sung: Permission Revoke, Preference Rollback, Cold-start Clear
// ============================================================================

test("permission revoke: device is deactivated on server when OS permission is revoked", async () => {
  let unregisterCalled = false;
  let unregisteredDeviceId = "";

  // Simulate deactivateDeviceOnPermissionRevoke logic
  async function simulateDeactivateOnRevoke({
    isNativeMobile,
    hasAuthToken,
    permissionGranted,
    deviceId,
  }) {
    if (!isNativeMobile) return false;
    if (!hasAuthToken) return false;
    if (permissionGranted) return false;

    // Would call notificationApi.unregisterDevice(deviceId)
    unregisterCalled = true;
    unregisteredDeviceId = deviceId;
    return true;
  }

  // Case 1: Not native → skip
  const r1 = await simulateDeactivateOnRevoke({
    isNativeMobile: false,
    hasAuthToken: true,
    permissionGranted: false,
    deviceId: "dev-1",
  });
  assert.equal(r1, false);
  assert.equal(unregisterCalled, false);

  // Case 2: No auth → skip
  const r2 = await simulateDeactivateOnRevoke({
    isNativeMobile: true,
    hasAuthToken: false,
    permissionGranted: false,
    deviceId: "dev-1",
  });
  assert.equal(r2, false);

  // Case 3: Permission still granted → skip
  const r3 = await simulateDeactivateOnRevoke({
    isNativeMobile: true,
    hasAuthToken: true,
    permissionGranted: true,
    deviceId: "dev-1",
  });
  assert.equal(r3, false);

  // Case 4: Permission revoked + authenticated → deactivate
  const r4 = await simulateDeactivateOnRevoke({
    isNativeMobile: true,
    hasAuthToken: true,
    permissionGranted: false,
    deviceId: "device-iphone-abc",
  });
  assert.equal(r4, true);
  assert.equal(unregisterCalled, true);
  assert.equal(unregisteredDeviceId, "device-iphone-abc");
});

test("preference rollback: UI reverts to previous state when server update fails", async () => {
  const previousSettings = {
    dailyReminderEnabled: true,
    incompleteLessonEnabled: true,
    streakReminderEnabled: false,
    contentUpdatesEnabled: false,
    promotionsEnabled: false,
  };

  // Simulate optimistic update + server failure + rollback
  let currentUIState = { ...previousSettings };

  // Step 1: Optimistic update
  currentUIState = { ...currentUIState, contentUpdatesEnabled: true };
  assert.equal(currentUIState.contentUpdatesEnabled, true);

  // Step 2: Server fails
  const serverError = true;
  if (serverError) {
    // Step 3: Rollback to previous
    currentUIState = { ...previousSettings };
  }

  assert.equal(currentUIState.contentUpdatesEnabled, false, "UI must rollback after server error");
  assert.equal(currentUIState.dailyReminderEnabled, true, "Other settings remain untouched");
  assert.equal(currentUIState.incompleteLessonEnabled, true, "Other settings remain untouched");
});

test("preference rollback: UI commits server-authoritative value on success", async () => {
  const initialSettings = {
    contentUpdatesEnabled: false,
    promotionsEnabled: false,
  };

  // Step 1: Optimistic
  let uiState = { ...initialSettings, contentUpdatesEnabled: true };

  // Step 2: Server responds with authoritative values
  const serverResponse = {
    preferences: {
      content_updates_enabled: true,
      promotions_enabled: true, // Server also turned on promotions
    },
  };

  // Step 3: Commit server values
  uiState = {
    ...uiState,
    contentUpdatesEnabled: serverResponse.preferences.content_updates_enabled,
    promotionsEnabled: serverResponse.preferences.promotions_enabled,
  };

  assert.equal(uiState.contentUpdatesEnabled, true);
  assert.equal(uiState.promotionsEnabled, true, "Server-authoritative value committed");
});

test("cold-start: notification response is cleared after handling to prevent re-processing", () => {
  let lastResponse = { type: "DAILY_PRACTICE", handled: false };
  let cleared = false;

  // Simulate cold-start handling
  function handleAndClear() {
    if (lastResponse) {
      lastResponse.handled = true;
      // clearLastNotificationResponse()
      cleared = true;
      lastResponse = null;
    }
  }

  handleAndClear();
  assert.equal(cleared, true, "clearLastNotificationResponse must be called after handling");
  assert.equal(lastResponse, null, "Last response must be null after clear");

  // Second call should be no-op
  cleared = false;
  handleAndClear();
  assert.equal(cleared, false, "Should not re-process after clear");
});

test("getPreferences query formatting: serializes direct query parameters without wrapping in params key", () => {
  // Simulating httpClient buildUrl behavior
  function buildUrl(path, params) {
    let url = path;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes("?") ? "&" : "?") + qs;
      }
    }
    return url;
  }

  const deviceId = "device-uuid-12345";
  const path = "/api/notifications/preferences";

  // CORRECT: direct object { device_id: id }
  const correctUrl = buildUrl(path, { device_id: deviceId });
  assert.equal(correctUrl, "/api/notifications/preferences?device_id=device-uuid-12345");
  assert.ok(!correctUrl.includes("[object"), "Url must never contain [object Object]");

  // BUGGY (what was previously passed): { params: { device_id: id } }
  const buggyUrl = buildUrl(path, { params: { device_id: deviceId } });
  assert.ok(decodeURIComponent(buggyUrl).includes("[object+Object]"), "Demonstrating that nested params object serialized to [object+Object]");
});

test("logout sequence: awaits push device unregistration before revoking auth token", async () => {
  const callSequence = [];
  let tokenRevoked = false;

  const mockNotificationApi = {
    async unregisterDevice(deviceId) {
      if (tokenRevoked) {
        throw new Error("401 Unauthorized: token was already revoked!");
      }
      callSequence.push(`unregisterDevice:${deviceId}`);
      return { ok: true };
    },
  };

  const mockAuthApi = {
    async logout() {
      callSequence.push("authLogout");
      tokenRevoked = true;
      return { ok: true };
    },
  };

  let clearedAuth = false;
  function clearAuthState() {
    callSequence.push("clearAuthState");
    clearedAuth = true;
  }

  // Proper logout flow:
  const deviceId = "device-abc";
  const authToken = "jwt-valid-token";

  if (deviceId && authToken) {
    try {
      await mockNotificationApi.unregisterDevice(deviceId);
    } catch {
      /* ignore */
    }
  }
  if (authToken) {
    await mockAuthApi.logout();
  }
  clearAuthState();

  assert.deepEqual(callSequence, [
    "unregisterDevice:device-abc",
    "authLogout",
    "clearAuthState",
  ], "Unregister must happen BEFORE authLogout and clearAuthState");
  assert.equal(clearedAuth, true);
});

test("permission grant sync: newly granted permission triggers push token sync", async () => {
  let syncCalled = false;
  const mockSyncPushToken = async () => {
    syncCalled = true;
  };

  // Simulating ensureNotificationPermission when user accepts
  const requested = { granted: true };
  const isAuthenticated = true;

  if (requested.granted && isAuthenticated) {
    await mockSyncPushToken();
  }

  assert.equal(syncCalled, true, "syncPushTokenWithBackend must be called when permission is granted");
});


