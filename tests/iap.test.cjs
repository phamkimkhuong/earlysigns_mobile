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
