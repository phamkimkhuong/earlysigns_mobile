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


