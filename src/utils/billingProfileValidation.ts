/** Mirrors backend `BillingProfile` + `contact_format.py` */

import type { BillingProfile, BillingIssue, BillingIssueKind } from "@/types/domain";

export const BILLING_FIELD_LABEL_KEYS: Record<string, string> = {
  first_name: "checkout.fields.firstName",
  last_name: "checkout.fields.lastName",
  address_detail: "checkout.fields.addressDetail",
  street: "checkout.fields.street",
  ward: "checkout.fields.ward",
  city: "checkout.fields.city",
  phone: "checkout.fields.phone",
  email: "checkout.fields.email",
  tax_code: "checkout.fields.taxCode",
  vat_company_name: "checkout.fields.vatCompanyName",
  vat_tax_code: "checkout.fields.vatTaxCode",
  vat_company_address: "checkout.fields.vatCompanyAddress",
  vat_invoice_email: "checkout.fields.vatInvoiceEmail",
  vat_invoice_phone: "checkout.fields.vatInvoicePhone",
  notes: "checkout.fields.notes",
};

/** Optional leading +; then digits, spaces, parentheses only. */
export const BILLING_PHONE_RE = /^\+?[0-9\s()]+$/;

const LOCAL_PART_RE = /^[a-zA-Z0-9._%+-]+$/;
const DOMAIN_LABEL_RE = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)$/;

/**
 * Same rules as `contact_format.email_well_formed` (Python).
 * Single @, local + domain with at least one dot; hostname-like labels; TLD length ≥ 2 (alphanumeric).
 */
export function emailWellFormed(s: unknown): boolean {
  const t = String(s ?? "").trim();
  if (t.length < 3 || !t.includes("@")) return false;
  const parts = t.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain || local.includes(" ") || domain.includes(" "))
    return false;
  if (!domain.includes(".")) return false;
  if (!LOCAL_PART_RE.test(local)) return false;
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  const tld = labels[labels.length - 1];
  if (tld.length < 2 || !/^[a-zA-Z0-9]+$/.test(tld)) return false;
  return labels.every((label) => DOMAIN_LABEL_RE.test(label));
}

export function isValidBillingPhone(raw: unknown): boolean {
  const t = String(raw ?? "").trim();
  if (!t) return false;
  return BILLING_PHONE_RE.test(t);
}

export function validateBillingProfile(profile: BillingProfile): BillingIssue[] {
  const issues: BillingIssue[] = [];

  function push(field: string, kind: BillingIssueKind, extra: Record<string, any> = {}): void {
    issues.push({ field, kind, ...extra });
  }

  function checkBounded(
    field: string,
    raw: unknown,
    minLen: number | null,
    maxLen: number | null
  ): void {
    const v = String(raw ?? "").trim();
    if (minLen != null && v.length < minLen) {
      push(field, v.length === 0 ? "required" : "min", {
        min: minLen,
      });
      return;
    }
    if (maxLen != null && v.length > maxLen) {
      push(field, "max", { max: maxLen });
    }
  }

  checkBounded("first_name", profile.first_name, 1, 120);
  checkBounded("last_name", profile.last_name, 1, 120);
  checkBounded("address_detail", profile.address_detail, 1, 300);
  checkBounded("street", profile.street, 1, 200);
  checkBounded("ward", profile.ward, 1, 120);
  checkBounded("city", profile.city, 1, 120);
  checkBounded("phone", profile.phone, 6, 32);
  checkBounded("email", profile.email, 3, 200);

  const phoneTrim = String(profile.phone ?? "").trim();
  if (
    phoneTrim.length >= 6 &&
    phoneTrim.length <= 32 &&
    !isValidBillingPhone(phoneTrim)
  ) {
    push("phone", "phoneInvalid");
  }

  const emailTrim = String(profile.email ?? "").trim();
  if (
    emailTrim.length >= 3 &&
    emailTrim.length <= 200 &&
    !emailWellFormed(emailTrim)
  ) {
    push("email", "emailInvalid");
  }

  const tax = String(profile.tax_code ?? "").trim();
  if (tax.length > 64) {
    push("tax_code", "max", { max: 64 });
  }

  const notes = String(profile.notes ?? "").trim();
  if (notes.length > 2000) {
    push("notes", "max", { max: 2000 });
  }

  if (profile.want_vat_invoice) {
    const name = String(profile.vat_company_name ?? "").trim();
    if (name.length > 200) {
      push("vat_company_name", "max", { max: 200 });
    }

    checkBounded("vat_tax_code", profile.vat_tax_code, 1, 64);
    checkBounded("vat_company_address", profile.vat_company_address, 1, 300);

    const vatEmail = String(profile.vat_invoice_email ?? "").trim();
    if (vatEmail.length > 200) {
      push("vat_invoice_email", "max", { max: 200 });
    } else if (vatEmail.length > 0 && !emailWellFormed(vatEmail)) {
      push("vat_invoice_email", "emailInvalid");
    }

    checkBounded("vat_invoice_phone", profile.vat_invoice_phone, 1, 32);
    const vatPhoneTrim = String(profile.vat_invoice_phone ?? "").trim();
    if (
      vatPhoneTrim.length >= 1 &&
      vatPhoneTrim.length <= 32 &&
      !isValidBillingPhone(vatPhoneTrim)
    ) {
      push("vat_invoice_phone", "phoneInvalid");
    }
  }

  return issues;
}

export function describeBillingIssues(
  issues: BillingIssue[],
  t: (key: string, options?: any) => string
): string {
  if (!issues.length) return "";

  function label(field: string): string {
    const key = BILLING_FIELD_LABEL_KEYS[field];
    return key ? t(key) : field;
  }

  return issues
    .map((issue) => {
      const fieldLabel = label(issue.field);
      switch (issue.kind) {
        case "required":
          return t("checkout.validation.required", { field: fieldLabel });
        case "min":
          return t("checkout.validation.minLength", {
            field: fieldLabel,
            min: issue.min,
          });
        case "max":
          return t("checkout.validation.maxLength", {
            field: fieldLabel,
            max: issue.max,
          });
        case "emailInvalid":
          return t("checkout.validation.invalidEmail", { field: fieldLabel });
        case "phoneInvalid":
          return t("checkout.validation.invalidPhone", { field: fieldLabel });
        default:
          return t("checkout.validation.genericField", {
            field: fieldLabel,
          });
      }
    })
    .join("\n");
}

function pydanticLocToFieldKey(loc: unknown): string | null {
  if (!Array.isArray(loc)) return null;
  const bi = loc.indexOf("billing_info");
  const tail = bi >= 0 ? loc.slice(bi + 1) : loc.filter((x) => x !== "body");
  const last = tail[tail.length - 1];
  return typeof last === "string" ? last : null;
}

export function formatCheckout422Body(
  data: any,
  t: (key: string, options?: any) => string
): string {
  const detail = data?.detail;

  if (typeof detail === "string") {
    return detail.trim() || t("checkout.validation.generic422");
  }

  if (!Array.isArray(detail) || detail.length === 0) {
    return t("checkout.validation.generic422");
  }

  const lines = detail.map((item: any) => {
    const msg = (item?.msg || item?.message || "").trim() || "Invalid";
    const fieldKey = pydanticLocToFieldKey(item?.loc);
    const labelKey = fieldKey && BILLING_FIELD_LABEL_KEYS[fieldKey];
    const fieldLabel = labelKey ? t(labelKey) : fieldKey || "Field";
    return `${fieldLabel}: ${msg}`;
  });

  return [t("checkout.validation.serverPrefix"), ...lines.map((l) => `• ${l}`)].join(
    "\n"
  );
}
