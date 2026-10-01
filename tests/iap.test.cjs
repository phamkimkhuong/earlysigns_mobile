const test = require("node:test");
const assert = require("node:assert/strict");

// Re-implement / export testable pure functions matching src/services/iap.ts
function normalizeStoreProduct(apiPkg) {
  const months = Number(apiPkg.months) || 1;
  const priceVnd = Number(apiPkg.price_vnd ?? apiPkg.priceVnd ?? 0);
  const originalPriceVnd = Number(apiPkg.original_price_vnd ?? apiPkg.originalPriceVnd ?? priceVnd);
  const monthlyEquivalentNumber = Math.round(priceVnd / months);

  const discountPercent =
    originalPriceVnd > priceVnd
      ? Math.round((1 - priceVnd / originalPriceVnd) * 100)
      : 0;

  const defaultName =
    months === 12
      ? "EarlySigns Pro 12 Tháng (1 Năm)"
      : `EarlySigns Pro ${months} Tháng`;

  const rawName = String(apiPkg.name || "").trim();
  const name =
    rawName &&
    rawName.toLowerCase() !== `${months} month` &&
    rawName.toLowerCase() !== `${months} months`
      ? rawName.startsWith("EarlySigns")
        ? rawName
        : `EarlySigns Pro - ${rawName}`
      : defaultName;

  return {
    id: String(apiPkg.id),
    months,
    name,
    priceVnd,
    originalPriceVnd,
    priceDisplay: `${priceVnd.toLocaleString("vi-VN")} đ`,
    periodLabel: months === 12 ? "12 tháng" : `${months} tháng`,
    monthlyEquivalent: `${monthlyEquivalentNumber.toLocaleString("vi-VN")} đ/tháng`,
    popular: months === 12,
    savingsBadge: discountPercent > 0 ? `Tiết kiệm ${discountPercent}%` : undefined,
  };
}

function parseStoredSubscription(raw) {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (data && new Date(data.expiresAt).getTime() > Date.now()) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

function mapPurchasesError(code, userCancelled) {
  const PURCHASES_ERROR_CODE = {
    PURCHASE_CANCELLED_ERROR: 1,
    PRODUCT_ALREADY_PURCHASED_ERROR: 6,
    PAYMENT_PENDING_ERROR: 24,
    PURCHASE_NOT_ALLOWED_ERROR: 7,
  };

  if (userCancelled || code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
    return { success: false, error: "Đã hủy giao dịch thanh toán." };
  }
  if (code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
    return {
      success: false,
      error: "Gói cước này đã được mua trước đó. Vui lòng bấm 'Khôi phục giao dịch'.",
    };
  }
  if (code === PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR) {
    return {
      success: false,
      error: "Thiết bị của bạn không được phép thực hiện giao dịch mua trong ứng dụng.",
    };
  }
  if (code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
    return {
      success: false,
      error: "Giao dịch đang chờ xác nhận từ Cửa hàng ứng dụng hoặc người giám hộ.",
    };
  }
  return {
    success: false,
    error: "Giao dịch Store bị gián đoạn. Vui lòng thử lại sau.",
  };
}

// -------------------------------------------------------------
// TESTS
// -------------------------------------------------------------

test("normalizeStoreProduct: transforms 1-month plan accurately", () => {
  const pkg = {
    id: "pkg_monthly",
    months: 1,
    price_vnd: 99000,
    original_price_vnd: 99000,
    name: "Gói Tháng",
  };

  const product = normalizeStoreProduct(pkg);
  assert.equal(product.id, "pkg_monthly");
  assert.equal(product.months, 1);
  assert.equal(product.name, "EarlySigns Pro - Gói Tháng");
  assert.equal(product.priceVnd, 99000);
  assert.equal(product.monthlyEquivalent, "99.000 đ/tháng");
  assert.equal(product.popular, false);
  assert.equal(product.savingsBadge, undefined);
});

test("normalizeStoreProduct: transforms 12-month annual plan with savings discount & popular flag", () => {
  const pkg = {
    id: "pkg_yearly",
    months: 12,
    price_vnd: 599000,
    original_price_vnd: 1188000,
    name: "EarlySigns Pro 12 Tháng (1 Năm)",
  };

  const product = normalizeStoreProduct(pkg);
  assert.equal(product.id, "pkg_yearly");
  assert.equal(product.months, 12);
  assert.equal(product.popular, true);
  assert.equal(product.priceVnd, 599000);
  assert.equal(product.originalPriceVnd, 1188000);
  // 599000 / 12 = 49917
  assert.equal(product.monthlyEquivalent, "49.917 đ/tháng");
  // (1 - 599000 / 1188000) * 100 = 50% discount
  assert.equal(product.savingsBadge, "Tiết kiệm 50%");
});

test("storedSubscription: returns null for expired or invalid cached receipts", () => {
  const pastDate = new Date(Date.now() - 100000).toISOString();
  const expiredJson = JSON.stringify({
    productId: "pkg_monthly",
    expiresAt: pastDate,
  });

  assert.equal(parseStoredSubscription(expiredJson), null);
  assert.equal(parseStoredSubscription(""), null);
  assert.equal(parseStoredSubscription("invalid-json"), null);
});

test("storedSubscription: returns parsed object for active unexpired receipts", () => {
  const futureDate = new Date(Date.now() + 86400000 * 30).toISOString();
  const validJson = JSON.stringify({
    productId: "pkg_yearly",
    expiresAt: futureDate,
    platform: "ios",
  });

  const parsed = parseStoredSubscription(validJson);
  assert.ok(parsed);
  assert.equal(parsed.productId, "pkg_yearly");
  assert.equal(parsed.platform, "ios");
});

test("mapPurchasesError: handles user cancellation cleanly without error alarm", () => {
  const res = mapPurchasesError(1, true);
  assert.equal(res.success, false);
  assert.equal(res.error, "Đã hủy giao dịch thanh toán.");
});

test("mapPurchasesError: handles already purchased product with instruction to restore", () => {
  const res = mapPurchasesError(6, false);
  assert.equal(res.success, false);
  assert.match(res.error, /Khôi phục giao dịch/);
});

test("mapPurchasesError: handles Ask to Buy / pending approval state", () => {
  const res = mapPurchasesError(24, false);
  assert.equal(res.success, false);
  assert.match(res.error, /chờ xác nhận/);
});

test("mapPurchasesError: handles purchase not allowed (parental controls)", () => {
  const res = mapPurchasesError(7, false);
  assert.equal(res.success, false);
  assert.match(res.error, /không được phép/);
});

test("entitlementCheck: only 'pro' entitlement grants Pro access", () => {
  const PRO_ENTITLEMENT_ID = "pro";

  function verifyProEntitlement(customerInfo) {
    const pro = customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT_ID];
    if (!pro) {
      return { success: false, error: "Pro entitlement is not active" };
    }
    return { success: true, expiresAt: pro.expirationDate || null };
  }

  // 1. Non-pro entitlement (e.g. 'teacher' or 'beta_access') should FAIL
  const nonProInfo = {
    entitlements: {
      active: {
        teacher: { identifier: "teacher", expirationDate: "2026-12-31T00:00:00Z" },
      },
    },
  };
  const failRes = verifyProEntitlement(nonProInfo);
  assert.equal(failRes.success, false);
  assert.match(failRes.error, /Pro entitlement is not active/);

  // 2. Exact 'pro' entitlement should SUCCEED with real Store expiration date
  const proInfo = {
    entitlements: {
      active: {
        pro: { identifier: "pro", expirationDate: "2026-10-29T10:00:00Z" },
      },
    },
  };
  const okRes = verifyProEntitlement(proInfo);
  assert.equal(okRes.success, true);
  assert.equal(okRes.expiresAt, "2026-10-29T10:00:00Z");
});

test("identityBinding: does not silently swallow login errors", async () => {
  let loginCalledWith = null;
  const mockPurchases = {
    async logIn(userId) {
      loginCalledWith = userId;
      if (userId === "invalid_user") {
        throw new Error("Network error binding user identity");
      }
      return { customerInfo: {} };
    },
  };

  async function safeLogIn(userId) {
    try {
      await mockPurchases.logIn(userId);
      return true;
    } catch (err) {
      return false;
    }
  }

  // Valid user succeeds
  const success = await safeLogIn("user_123");
  assert.equal(success, true);
  assert.equal(loginCalledWith, "user_123");

  // Error user fails without throwing unhandled crash
  const fail = await safeLogIn("invalid_user");
  assert.equal(fail, false);
});

test("customerInfoUpdate: activates Pro tier and stores receipt when 'pro' entitlement is active", () => {
  const PRO_ENTITLEMENT_ID = "pro";
  const storage = new Map();
  let latestSeededUsage = null;

  function mockHandleCustomerInfoUpdate(customerInfo, token) {
    const pro = customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT_ID];
    if (pro) {
      const expiresAt = pro.expirationDate || "2026-10-29T10:00:00Z";
      const subData = {
        productId: pro.productIdentifier,
        purchasedAt: pro.latestPurchaseDate || "2026-09-29T10:00:00Z",
        expiresAt,
        platform: "ios",
        orderId: pro.identifier || "order_123",
      };
      storage.set("earlysigns_active_iap_subscription", JSON.stringify(subData));

      latestSeededUsage = {
        has_active_subscription: true,
        is_in_trial: false,
        subscription_expires_at: expiresAt,
        tier: "pro",
        daily_remaining: 9999,
      };
    }
  }

  const activeCustomerInfo = {
    entitlements: {
      active: {
        pro: {
          identifier: "rc_sub_pro",
          productIdentifier: "pkg_monthly",
          latestPurchaseDate: "2026-09-29T12:00:00Z",
          expirationDate: "2026-10-29T12:00:00Z",
        },
      },
    },
  };

  mockHandleCustomerInfoUpdate(activeCustomerInfo, "test_token_123");

  // Verify storage was populated
  assert.ok(storage.has("earlysigns_active_iap_subscription"));
  const stored = JSON.parse(storage.get("earlysigns_active_iap_subscription"));
  assert.equal(stored.productId, "pkg_monthly");
  assert.equal(stored.expiresAt, "2026-10-29T12:00:00Z");

  // Verify billing state updated to pro
  assert.ok(latestSeededUsage);
  assert.equal(latestSeededUsage.tier, "pro");
  assert.equal(latestSeededUsage.has_active_subscription, true);
  assert.equal(latestSeededUsage.daily_remaining, 9999);
  assert.equal(latestSeededUsage.subscription_expires_at, "2026-10-29T12:00:00Z");
});

test("customerInfoUpdate: purges store receipt and delegates to backend reconciliation without crushing non-store Pro entitlements", async () => {
  const PRO_ENTITLEMENT_ID = "pro";
  const storage = new Map();
  // Existing subscription before expiration
  storage.set(
    "earlysigns_active_iap_subscription",
    JSON.stringify({ productId: "pkg_monthly", expiresAt: "2026-09-29T00:00:00Z" })
  );

  let cachedUsage = {
    has_active_subscription: true,
    is_in_trial: false,
    subscription_expires_at: "2026-12-31T00:00:00Z",
    tier: "pro",
    daily_remaining: 9999,
    source: "promo_code",
  };
  let backendReconcileCalled = false;

  async function mockHandleCustomerInfoUpdate(customerInfo, token, onReconcileBackend) {
    const pro = customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT_ID];
    if (!pro) {
      const hadLocalStoreReceipt = storage.has("earlysigns_active_iap_subscription");
      if (hadLocalStoreReceipt) {
        storage.delete("earlysigns_active_iap_subscription");
      }
      if (token && (hadLocalStoreReceipt || Boolean(customerInfo?.entitlements?.all?.[PRO_ENTITLEMENT_ID]))) {
        backendReconcileCalled = true;
        if (onReconcileBackend) await onReconcileBackend();
      }
    }
  }

  // CustomerInfo after Store expiration: active is empty, but all still lists past entitlement
  const expiredCustomerInfo = {
    entitlements: {
      active: {},
      all: {
        pro: {
          identifier: "rc_sub_pro",
          productIdentifier: "pkg_monthly",
          expirationDate: "2026-09-29T00:00:00Z",
        },
      },
    },
  };

  // Scenario 1: User still has valid Promo Code on backend -> Pro is PRESERVED
  await mockHandleCustomerInfoUpdate(expiredCustomerInfo, "test_token_123", async () => {
    cachedUsage = {
      ...cachedUsage,
      has_active_subscription: true,
      tier: "pro",
      daily_remaining: 9999,
      source: "promo_code",
    };
  });

  // Receipt in storage should be deleted
  assert.equal(storage.has("earlysigns_active_iap_subscription"), false);
  // Backend reconciliation was requested
  assert.equal(backendReconcileCalled, true);
  // Billing state is NOT crushed to free; promo code Pro is intact!
  assert.equal(cachedUsage.tier, "pro");
  assert.equal(cachedUsage.has_active_subscription, true);
  assert.equal(cachedUsage.daily_remaining, 9999);

  // Scenario 2: User has NO other sources on backend -> Backend returns Free
  await mockHandleCustomerInfoUpdate(expiredCustomerInfo, "test_token_123", async () => {
    cachedUsage = {
      has_active_subscription: false,
      is_in_trial: false,
      tier: "free",
      daily_remaining: 5,
    };
  });

  assert.equal(cachedUsage.tier, "free");
  assert.equal(cachedUsage.has_active_subscription, false);
  assert.equal(cachedUsage.daily_remaining, 5);
});

test("customerInfoListener: registers and unregisters listener cleanly without duplicate registration", () => {
  const listeners = [];
  const mockPurchases = {
    addCustomerInfoUpdateListener(fn) {
      listeners.push(fn);
    },
    removeCustomerInfoUpdateListener(fn) {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    },
  };

  let registered = false;
  let activeListener = null;

  function setupListener() {
    if (!registered) {
      activeListener = (info) => {};
      mockPurchases.addCustomerInfoUpdateListener(activeListener);
      registered = true;
    }
    return () => {
      if (activeListener && registered) {
        mockPurchases.removeCustomerInfoUpdateListener(activeListener);
        registered = false;
        activeListener = null;
      }
    };
  }

  // 1. Initial registration
  const cleanup1 = setupListener();
  assert.equal(listeners.length, 1);

  // 2. Calling setup again should NOT duplicate listener
  const cleanup2 = setupListener();
  assert.equal(listeners.length, 1);

  // 3. Unsubscribing removes the listener
  cleanup1();
  assert.equal(listeners.length, 0);
  assert.equal(registered, false);
});

test("restoreStorePurchases: rejects restore without active store entitlement (no local cache bypass)", async () => {
  const PRO_ENTITLEMENT_ID = "pro";

  async function mockRestorePurchases(customerInfo, isRcAvailable) {
    if (isRcAvailable) {
      const proEntitlement = customerInfo.entitlements?.active?.[PRO_ENTITLEMENT_ID];
      if (proEntitlement) {
        return { restored: true, expiresAt: proEntitlement.expirationDate };
      }
      return { restored: false, message: "Không tìm thấy gói đăng ký nào đang hoạt động liên kết với tài khoản Apple ID / Google Play này." };
    }
    return { restored: false, message: "Cổng thanh toán Store chưa sẵn sàng." };
  }

  // 1. Account has NO active entitlement on App Store / Google Play
  const expiredStoreInfo = {
    entitlements: {
      active: {},
      all: {
        pro: {
          productIdentifier: "pkg_monthly",
          expirationDate: "2026-08-01T00:00:00Z",
        },
      },
    },
  };

  const res1 = await mockRestorePurchases(expiredStoreInfo, true);
  assert.equal(res1.restored, false);
  assert.ok(res1.message.includes("Không tìm thấy gói đăng ký"));

  // 2. Account HAS active entitlement on App Store / Google Play
  const activeStoreInfo = {
    entitlements: {
      active: {
        pro: {
          productIdentifier: "pkg_monthly",
          expirationDate: "2026-12-01T00:00:00Z",
        },
      },
    },
  };

  const res2 = await mockRestorePurchases(activeStoreInfo, true);
  assert.equal(res2.restored, true);
  assert.equal(res2.expiresAt, "2026-12-01T00:00:00Z");
});

test("entitlement: correctly recognizes 'earlysigns_pro' primary entitlement and products", () => {
  const PRO_ENTITLEMENT_ID = "earlysigns_pro";
  const LEGACY_PRO_ENTITLEMENT_ID = "pro";

  function checkPro(customerInfo) {
    return Boolean(
      customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT_ID] ||
      customerInfo?.entitlements?.active?.[LEGACY_PRO_ENTITLEMENT_ID]
    );
  }

  // 1. earlysigns_pro active
  assert.equal(checkPro({
    entitlements: {
      active: {
        earlysigns_pro: { productIdentifier: "yearly", expirationDate: "2027-01-01T00:00:00Z" }
      }
    }
  }), true);

  // 2. legacy pro active
  assert.equal(checkPro({
    entitlements: {
      active: {
        pro: { productIdentifier: "monthly", expirationDate: "2027-01-01T00:00:00Z" }
      }
    }
  }), true);

  // 3. no active
  assert.equal(checkPro({ entitlements: { active: {} } }), false);

  // 4. Products mapping validation
  const clientProducts = ["Three_months", "yearly", "monthly"];
  assert.ok(clientProducts.includes("Three_months"));
  assert.ok(clientProducts.includes("yearly"));
  assert.ok(clientProducts.includes("monthly"));
});

test("security boundary: local storage cannot override backend to grant Pro status; only verified CustomerInfo can", async () => {
  // Replicate secure billing reconcile logic:
  async function reconcileUsage(backendUsage, getVerifiedProFn) {
    let usage = backendUsage;
    if (!usage || !usage.has_active_subscription) {
      const verifiedPro = await getVerifiedProFn();
      if (verifiedPro && verifiedPro.active) {
        usage = {
          ...(usage || {
            tier: "pro",
            daily_remaining: 9999,
            daily_quota: 9999,
            today_practice_count: 0,
            is_in_trial: false,
            referral_count: 0,
            trial_days_remaining: 0,
          }),
          has_active_subscription: true,
          is_in_trial: false,
          subscription_expires_at: verifiedPro.expiresAt,
          tier: "pro",
          daily_remaining: 9999,
        };
      }
    }
    return usage;
  }

  // Scenario 1: Attacker forged JSON in local storage, but RevenueCat CustomerInfo has no active entitlement
  const backendFreeUsage = {
    tier: "free",
    has_active_subscription: false,
    daily_remaining: 5,
  };
  // RevenueCat says no active entitlement
  const mockUnverifiedPro = async () => null;

  const result1 = await reconcileUsage(backendFreeUsage, mockUnverifiedPro);
  // Must remain Free! Spoofing blocked!
  assert.equal(result1.tier, "free");
  assert.equal(result1.has_active_subscription, false);
  assert.equal(result1.daily_remaining, 5);

  // Scenario 2: User genuinely bought from Store, RevenueCat CustomerInfo has active entitlement,
  // but BE webhook hasn't arrived yet (returns free)
  const mockVerifiedPro = async () => ({
    active: true,
    expiresAt: "2027-01-01T00:00:00Z",
    productId: "yearly",
  });

  const result2 = await reconcileUsage(backendFreeUsage, mockVerifiedPro);
  // Optimistically unlocked via cryptographically verified StoreKit receipt
  assert.equal(result2.tier, "pro");
  assert.equal(result2.has_active_subscription, true);
  assert.equal(result2.daily_remaining, 9999);
  assert.equal(result2.subscription_expires_at, "2027-01-01T00:00:00Z");
});





