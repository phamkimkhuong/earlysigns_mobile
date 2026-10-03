const test = require("node:test");
const assert = require("node:assert/strict");

// Pure implementation mirroring src/services/appUpdate.ts
function compareVersions(v1, v2) {
  const clean1 = (v1 || "").replace(/^v/i, "").trim();
  const clean2 = (v2 || "").replace(/^v/i, "").trim();

  const parts1 = clean1.split(".").map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split(".").map((p) => parseInt(p, 10) || 0);

  const length = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < length; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

function evaluateUpdate(currentVersion, config, dismissedVersion, dismissedTime, now) {
  const minVersion = config.min_version || "1.0.0";
  const latestVersion = config.latest_version || currentVersion;

  const isBelowMin = compareVersions(currentVersion, minVersion) < 0;
  const isForce = isBelowMin || Boolean(config.force_update);

  if (isForce) {
    return { shouldUpdate: true, isForce: true, currentVersion, latestVersion, minVersion };
  }

  const isBelowLatest = compareVersions(currentVersion, latestVersion) < 0;
  if (!isBelowLatest) {
    return null;
  }

  if (dismissedVersion === latestVersion && now - dismissedTime < 24 * 60 * 60 * 1000) {
    return null;
  }

  return { shouldUpdate: true, isForce: false, currentVersion, latestVersion, minVersion };
}

test("appUpdate: compareVersions logic", () => {
  assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
  assert.equal(compareVersions("v1.0.0", "1.0.0"), 0);
  assert.equal(compareVersions("1.0.1", "1.0.0"), 1);
  assert.equal(compareVersions("1.0.0", "1.0.1"), -1);
  assert.equal(compareVersions("1.10.0", "1.9.0"), 1);
  assert.equal(compareVersions("2.0.0", "1.99.99"), 1);
  assert.equal(compareVersions("1.0", "1.0.0"), 0);
  assert.equal(compareVersions("0.9.9", "1.0.0"), -1);
});

test("appUpdate: force update triggered when current < min_version", () => {
  const config = {
    min_version: "2.0.0",
    latest_version: "2.1.0",
    force_update: false,
  };

  const result = evaluateUpdate("1.0.0", config, null, 0, Date.now());
  assert.ok(result);
  assert.equal(result.shouldUpdate, true);
  assert.equal(result.isForce, true);
  assert.equal(result.latestVersion, "2.1.0");
});

test("appUpdate: force update triggered when force_update flag is true", () => {
  const config = {
    min_version: "1.0.0",
    latest_version: "1.0.5",
    force_update: true,
  };

  const result = evaluateUpdate("1.0.4", config, null, 0, Date.now());
  assert.ok(result);
  assert.equal(result.shouldUpdate, true);
  assert.equal(result.isForce, true);
});

test("appUpdate: soft update triggered when current < latest_version and current >= min_version", () => {
  const config = {
    min_version: "1.0.0",
    latest_version: "1.1.0",
    force_update: false,
  };

  const result = evaluateUpdate("1.0.5", config, null, 0, Date.now());
  assert.ok(result);
  assert.equal(result.shouldUpdate, true);
  assert.equal(result.isForce, false);
  assert.equal(result.latestVersion, "1.1.0");
});

test("appUpdate: no update when current version is equal or newer than latest", () => {
  const config = {
    min_version: "1.0.0",
    latest_version: "1.0.0",
    force_update: false,
  };

  const result = evaluateUpdate("1.0.0", config, null, 0, Date.now());
  assert.equal(result, null);

  const newerResult = evaluateUpdate("1.0.2", config, null, 0, Date.now());
  assert.equal(newerResult, null);
});

test("appUpdate: soft update suppression when recently dismissed", () => {
  const config = {
    min_version: "1.0.0",
    latest_version: "1.1.0",
    force_update: false,
  };

  const now = Date.now();
  // Dismissed 2 hours ago
  const suppressed = evaluateUpdate("1.0.0", config, "1.1.0", now - 2 * 3600 * 1000, now);
  assert.equal(suppressed, null);

  // Dismissed 25 hours ago (> 24h)
  const expiredDismiss = evaluateUpdate("1.0.0", config, "1.1.0", now - 25 * 3600 * 1000, now);
  assert.ok(expiredDismiss);
  assert.equal(expiredDismiss.shouldUpdate, true);
});
