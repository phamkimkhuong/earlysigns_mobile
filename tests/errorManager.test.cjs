const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadSource(relativePath, mocks = {}) {
  const file = path.resolve(__dirname, "..", relativePath);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: file })(
    (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === "@/core/i18n") {
        return {
          default: { language: "vi" },
        };
      }
      if (name.startsWith("@/")) {
        const candidate = path.resolve(__dirname, "..", "src", name.slice(2));
        for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
          if (fs.existsSync(candidate + ext)) {
            return loadSource(path.relative(path.resolve(__dirname, ".."), candidate + ext), mocks);
          }
        }
      }
      return require(name);
    },
    module,
    module.exports,
  );
  return module.exports;
}

const {
  getFriendlyErrorMessage,
  parseApiError,
  ERROR_CODE_MAP,
  RAW_STRING_MAP,
  HTTP_STATUS_MAP,
} = loadSource("src/core/errorManager.ts");

test("resolves raw backend activation code format error into friendly Vietnamese message", () => {
  const err = new Error("Invalid activation code format.");
  const msg = getFriendlyErrorMessage(err);
  assert.equal(msg, "Định dạng mã kích hoạt không hợp lệ. Mã gồm 6 ký tự (VD: ACT123).");
});

test("resolves raw backend activation code error with detail string", () => {
  const err = {
    status: 400,
    message: "Request failed with status 400",
    detail: "Invalid activation code format.",
  };
  const msg = getFriendlyErrorMessage(err);
  assert.equal(msg, "Định dạng mã kích hoạt không hợp lệ. Mã gồm 6 ký tự (VD: ACT123).");
});

test("resolves activation code not found", () => {
  const err = { detail: "Activation code not found." };
  assert.equal(getFriendlyErrorMessage(err), "Không tìm thấy mã kích hoạt này trong hệ thống.");
});

test("resolves activation code expired and max uses", () => {
  assert.equal(
    getFriendlyErrorMessage({ detail: "This activation code has expired." }),
    "Mã kích hoạt này đã hết hạn sử dụng."
  );
  assert.equal(
    getFriendlyErrorMessage({ detail: "This activation code has reached its maximum number of uses." }),
    "Mã kích hoạt này đã đạt số lượt sử dụng tối đa."
  );
  assert.equal(
    getFriendlyErrorMessage({ detail: "You have already used this activation code." }),
    "Bạn đã sử dụng mã kích hoạt này trước đó rồi."
  );
});

test("resolves referral code error codes correctly", () => {
  const err1 = { detail: { code: "ALREADY_REDEEMED" } };
  assert.equal(
    getFriendlyErrorMessage(err1),
    "Bạn đã từng áp dụng mã giới thiệu trước đó rồi. Mỗi tài khoản chỉ áp dụng 1 lần."
  );

  const err2 = { detail: { code: "REDEEM_WINDOW_EXPIRED" } };
  assert.equal(
    getFriendlyErrorMessage(err2),
    "Thời hạn 24 giờ sau khi tạo tài khoản để nhập mã giới thiệu đã kết thúc."
  );

  const err3 = { detail: { code: "REFERRAL_CODE_INVALID" } };
  assert.equal(
    getFriendlyErrorMessage(err3),
    "Mã giới thiệu không đúng định dạng. Mã gồm 6 ký tự."
  );

  const err4 = { detail: { code: "SELF_REFERRAL_NOT_ALLOWED" } };
  assert.equal(
    getFriendlyErrorMessage(err4),
    "Bạn không thể tự nhập mã giới thiệu của chính mình."
  );
});

test("resolves quota and billing error codes", () => {
  assert.equal(
    getFriendlyErrorMessage({ detail: { code: "DAILY_LIMIT_REACHED" } }),
    "Bạn đã đạt giới hạn lượt luyện tập hôm nay. Nâng cấp EarlySigns Pro để luyện không giới hạn."
  );
  assert.equal(
    getFriendlyErrorMessage({ detail: { code: "PRO_REQUIRED" } }),
    "Tính năng này chỉ dành riêng cho tài khoản EarlySigns Pro."
  );
});

test("resolves bilingual backend detail object dynamically", () => {
  const errVi = {
    detail: {
      code: "CUSTOM_PROMO_ERROR",
      message: { vi: "Ưu đãi này đã kết thúc.", en: "This promo has ended." },
    },
  };
  assert.equal(getFriendlyErrorMessage(errVi), "Ưu đãi này đã kết thúc.");
  assert.equal(getFriendlyErrorMessage(errVi, undefined, "en"), "This promo has ended.");
});

test("resolves HTTP status code fallbacks when no specific error code is found", () => {
  assert.equal(getFriendlyErrorMessage({ status: 401 }), "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  assert.equal(getFriendlyErrorMessage({ status: 403 }), "Bạn không có quyền thực hiện thao tác này.");
  assert.equal(getFriendlyErrorMessage({ status: 404 }), "Không tìm thấy dữ liệu yêu cầu trên hệ thống.");
  assert.equal(getFriendlyErrorMessage({ status: 429 }), "Bạn đã thao tác quá nhiều lần liên tiếp. Vui lòng chờ trong giây lát.");
  assert.equal(getFriendlyErrorMessage({ status: 500 }), "Hệ thống máy chủ đang gặp sự cố. Đội ngũ kỹ thuật đang khắc phục.");
});

test("resolves Pydantic 422 validation error array", () => {
  const err = {
    status: 422,
    detail: [
      { loc: ["body", "code"], msg: "ensure this value has at least 6 characters", type: "value_error.any_str.min_length" },
    ],
  };
  const msg = getFriendlyErrorMessage(err);
  assert.match(msg, /code/i);
});

test("parseApiError returns complete structured metadata", () => {
  const err = {
    status: 400,
    detail: {
      code: "REFERRAL_CODE_INVALID",
      message: "Referral code invalid",
      retryable: false,
    },
  };
  const parsed = parseApiError(err);
  assert.equal(parsed.code, "REFERRAL_CODE_INVALID");
  assert.equal(parsed.status, 400);
  assert.equal(parsed.retryable, false);
  assert.equal(parsed.userMessage, "Mã giới thiệu không đúng định dạng. Mã gồm 6 ký tự.");
});

const { formatExpiryDate } = loadSource("src/utils/errors.ts");

test("formatExpiryDate accurately formats Unix timestamp in seconds (numeric & string)", () => {
  // 1793638800 is 2026-11-02T17:00:00Z -> in UTC+7 it is 03/11/2026
  assert.match(formatExpiryDate(1793638800, "vi"), /^(02|03)\/11\/2026$/);
  assert.match(formatExpiryDate("1793638800", "vi"), /^(02|03)\/11\/2026$/);
});

test("formatExpiryDate accurately formats Unix timestamp in milliseconds", () => {
  assert.match(formatExpiryDate(1793638800000, "vi"), /^(02|03)\/11\/2026$/);
});

test("formatExpiryDate accurately formats ISO string dates", () => {
  assert.match(formatExpiryDate("2026-11-02T17:00:00.000Z", "vi"), /^(02|03)\/11\/2026$/);
  assert.equal(formatExpiryDate("2026-12-31", "vi"), "31/12/2026");
});

test("formatExpiryDate formats English locale as MM/DD/YYYY", () => {
  assert.match(formatExpiryDate(1793638800, "en"), /^11\/(02|03)\/2026$/);
});

test("formatExpiryDate handles empty, zero, null, undefined, and invalid inputs gracefully", () => {
  assert.equal(formatExpiryDate(null), "");
  assert.equal(formatExpiryDate(undefined), "");
  assert.equal(formatExpiryDate(""), "");
  assert.equal(formatExpiryDate(0), "");
  assert.equal(formatExpiryDate("invalid"), "");
});

