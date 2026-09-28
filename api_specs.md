# EarlySigns Web App API

HTTP API used by the web app (`webapp/`). The client reads the origin from `VITE_API_BASE` (default `http://localhost:8000`). Production origin is `https://api.earlysigns.net`.

This document covers routes the web app calls. Admin, PayOS webhook, and email-unsubscribe routes are omitted.

## Conventions

### Authentication

Login endpoints return a JWT. The web app stores it and sends it on later calls:

```
Authorization: Bearer <token>
```

Authenticated fetches also send a stable browser id:

```
X-Device-Id: <device id, at least 8 characters>
```

An account can stay signed in on up to five devices at once. Signing in on a sixth new device signs out the device that was used least recently, and that device's next call returns `401`. Signing in again on a device that already has a session refreshes only that device.

| Auth | Meaning |
| --- | --- |
| Public | No token required. |
| Optional | Token is accepted when present. Anonymous callers are limited. |
| Required | Missing or invalid token returns `401`. |

### Dialects and language

`dialect` is `uk` or `us`. `language` is a short locale tag; the app sends `en` or `vi`.

### Errors

FastAPI error bodies use `detail`. It is either a string or an object.

```json
{ "detail": "Authentication required." }
```

```json
{
  "detail": {
    "code": "DAILY_LIMIT_REACHED",
    "message": "You have reached the free usage limit for today.",
    "usage": {}
  }
}
```

Referral errors use a localized message:

```json
{
  "detail": {
    "code": "REFERRAL_CODE_NOT_FOUND",
    "message": { "en": "Referral code not found.", "vi": "Không tìm thấy mã giới thiệu." }
  }
}
```

Request validation failures return `422` with `detail` as a list of `{ "loc", "msg", "type" }`.

### Shared objects

**Usage**

```json
{
  "daily_limit": 10,
  "daily_used": 1,
  "daily_remaining": 9,
  "daily_period_key": "2026-09-27",
  "subscription_expires_at": null,
  "active_package_id": null,
  "has_active_subscription": false,
  "is_in_trial": false,
  "trial_expires_at": null,
  "packages": [
    {
      "id": "pkg_1m",
      "name": "1 month",
      "months": 1,
      "price_vnd": 248000,
      "original_price_vnd": 462000
    }
  ]
}
```

`daily_limit` comes from `FREE_DAILY_CHECK_LIMIT`. Package prices come from `PKG_*_PRICE_VND` environment variables. Pro and trial users are not blocked by the daily free quota.

**Word IPA**

```json
{ "word": "food", "ipa": "fuːd" }
```

**Sentence**

```json
{
  "index": 0,
  "text": "food is good",
  "words": [{ "word": "food", "ipa": "fuːd" }],
  "audio_url": null
}
```

**Character alignment** (from `/api/check`)

```json
{
  "char": "f",
  "status": "correct",
  "predicted_char": "f",
  "word_index": 0,
  "tip": ""
}
```

`status` is `correct`, `replaced`, `deleted`, `inserted`, or `space`. `tip` is English or Vietnamese depending on the `language` sent with the check.

**Score unlock**

```json
{
  "checked": 3,
  "required": 5,
  "total": 44,
  "threshold_percent": 0
}
```

**Billing profile**

| Field | Required on checkout |
| --- | --- |
| `first_name`, `last_name` | yes |
| `address_detail`, `street`, `ward`, `city` | yes |
| `phone` | yes. Digits, spaces, parentheses, optional leading `+`. |
| `email` | yes |
| `tax_code` | no |
| `want_vat_invoice` | no, default `false` |
| `vat_company_name`, `vat_tax_code`, `vat_company_address`, `vat_invoice_email`, `vat_invoice_phone` | required when `want_vat_invoice` is true (`vat_tax_code`, `vat_company_address`, `vat_invoice_phone`) |
| `notes` | no |

**Referral**

```json
{
  "referral_code": "A1B2C3",
  "referral_code_created_at": 1710000000,
  "has_created_code": true,
  "has_redeemed": false,
  "referred_by_code": null,
  "referred_by_user_id": null,
  "referral_redeemed_at": null,
  "can_redeem": true,
  "redeem_deadline_at": 1710086400,
  "redeem_seconds_remaining": 86400,
  "show_home_banner": false
}
```

Redeem is allowed for 24 hours after account creation, and only once.

**Journey**

```json
{
  "completed_lesson_count": 6,
  "completed_module_count": 1,
  "current_module": 2,
  "current_lesson_in_module": 2,
  "lessons_per_module": 5,
  "modules_per_milestone": 5,
  "min_modules": 25,
  "milestones": [
    {
      "index": 1,
      "status": "completed",
      "modules": [
        {
          "index": 1,
          "status": "completed",
          "completed_lessons": 5,
          "total_lessons": 5,
          "percent_complete": 100
        }
      ]
    }
  ]
}
```

Module `status` is `completed`, `current`, or `locked`. The current module also includes `current_lesson`.

---

## Auth

### `POST /api/auth/request-otp`

Public. Sends a 6-digit email OTP.

**Body**

| Field | Type | Notes |
| --- | --- | --- |
| `email` | string | Normalized to lowercase. |
| `language` | string | Optional. Default `en`. The app sends `en` or `vi`. |

**Response `200`**

```json
{ "ok": true, "message": "If the email is reachable, OTP has been sent." }
```

### `POST /api/auth/verify-otp`

Public. Consumes the latest unused OTP and issues a session.

**Body**

| Field | Type | Notes |
| --- | --- | --- |
| `email` | string | |
| `otp` | string | Exactly 6 digits. |
| `device_id` | string | At least 8 characters. |

**Response `200`**

```json
{ "ok": true, "token": "<jwt>", "email": "user@example.com", "user_id": "<id>" }
```

**Errors:** `400` invalid email, OTP, or device id. `401` OTP invalid or expired.

### `POST /api/auth/google`

Public. Verifies a Google ID token and issues a session.

**Body**

| Field | Type | Notes |
| --- | --- | --- |
| `id_token` | string | Google Identity Services credential. Minimum length 20. |
| `device_id` | string | At least 8 characters. |

**Response `200`**

```json
{ "ok": true, "token": "<jwt>", "email": "user@example.com", "user_id": "<id>" }
```

**Errors:** `401` invalid or unverified Google token. `500` if `GOOGLE_CLIENT_ID` is missing.

### `GET /api/auth/me`

Required. Current user, screening state, and usage. The app calls this after login and on session restore.

**Response `200`**

```json
{
  "ok": true,
  "email": "user@example.com",
  "user_id": "<id>",
  "device_id": "<device id>",
  "dialect": "uk",
  "language": "vi",
  "screening_completed": false,
  "roles": [],
  "requires_screening": true,
  "score_unlocked": false,
  "show_screening_prompt": true,
  "score_unlock_progress": {
    "checked": 0,
    "required": 5,
    "total": 44,
    "threshold_percent": 0
  },
  "usage": {},
  "payos_configured": true
}
```

`requires_screening` matches `show_screening_prompt` and is kept for older clients. `language` may be `null` until the user saves a preference. `usage` is the Usage object. `payos_configured` is true when PayOS credentials and return URLs are set.

### `POST /api/auth/logout`

Required. Deactivates the current session. Empty body.

**Response `200`**

```json
{ "ok": true }
```

### `PATCH /api/auth/preferences`

Required. Updates accent, UI language, or both. The app sends one field at a time.

**Body**

| Field | Type | Notes |
| --- | --- | --- |
| `dialect` | `uk` \| `us` | Optional. |
| `language` | string | Optional. Max 16 characters. The app sends `en` or `vi`. |

**Response `200`**

```json
{ "ok": true, "dialect": "us" }
```

Only fields that were sent are returned.

---

## Billing

### `GET /api/billing/usage`

Required.

**Response `200`**

```json
{ "ok": true, "usage": {}, "payos_configured": true }
```

### `GET /api/billing/packages`

Public.

**Response `200`**

```json
{
  "ok": true,
  "packages": [
    {
      "id": "pkg_1m",
      "months": 1,
      "price_vnd": 248000,
      "original_price_vnd": 462000,
      "name": "1 month"
    }
  ]
}
```

Catalog ids: `pkg_1m`, `pkg_3m`, `pkg_12m`.

### `GET /api/billing/profile`

Required. Saved checkout profile, or `{}` when none is stored. Also returns the account email.

**Response `200`**

```json
{ "ok": true, "profile": {}, "email": "user@example.com" }
```

### `POST /api/billing/checkout`

Required. Creates a PayOS payment link.

**Body**

| Field | Type | Notes |
| --- | --- | --- |
| `package_id` | string | `pkg_1m`, `pkg_3m`, or `pkg_12m`. |
| `billing_info` | object | Billing profile. Required fields must be present. |
| `save_profile` | boolean | When true, stores `billing_info` on the user. |
| `agree_terms` | boolean | Must be `true`. |

**Response `200`**

```json
{ "ok": true, "order_code": 1710000000000, "checkout_url": "https://pay.payos.vn/..." }
```

The app redirects the browser to `checkout_url`.

**Errors:** `400` invalid package, terms not accepted, or missing billing fields. `500` PayOS is not configured. `502` PayOS request failed.

### `GET /api/billing/checkout/verify`

Required. Confirms a return from PayOS and activates the subscription when the provider reports success.

**Query**

| Name | Notes |
| --- | --- |
| `order_code` | Required. |

**Response `200`**

Paid and already processed:

```json
{
  "ok": true,
  "order_code": "1710000000000",
  "confirmed": true,
  "already_processed": true,
  "amount_vnd": 248000
}
```

Newly activated: `confirmed` is true, plus `subscription_expires_at` (unix seconds). Not yet paid: `{ "ok": true, "order_code": "...", "confirmed": false }`.

**Errors:** `400` missing or invalid `order_code`. `403` order belongs to another user. `404` order not found.

### `GET /api/billing/history`

Required. Successful payments, newest first.

**Response `200`**

```json
{
  "ok": true,
  "items": [
    {
      "order_code": "1710000000000",
      "package_id": "pkg_1m",
      "package_name": "1 month",
      "months": 1,
      "amount_vnd": 248000,
      "status": "PAID",
      "created_at": 1710000000,
      "updated_at": 1710000100,
      "payos_payment_link_id": ""
    }
  ]
}
```

### `POST /api/billing/activate-code`

Required. Redeems a campaign code and grants 3 months of Pro.

**Body**

```json
{ "code": "CAMPAIGN" }
```

**Response `200`**

```json
{ "ok": true, "subscription_expires_at": 1710000000, "months_granted": 3 }
```

### `GET /api/billing/referral`

Required.

**Response `200`**

```json
{ "ok": true, "referral": {}, "usage": {} }
```

### `POST /api/billing/referral/generate`

Required. Creates the user's referral code, or returns the existing one. Empty body.

**Response `200`**

```json
{ "ok": true, "referral": {}, "created": true, "usage": {} }
```

`created` is `false` when a code already exists.

### `POST /api/billing/referral/redeem`

Required. Grants 7 days of Pro to the redeemer and the referrer.

**Body**

```json
{ "code": "A1B2C3" }
```

**Response `200`**

```json
{
  "ok": true,
  "referral": {},
  "subscription_expires_at": 1710000000,
  "reward_days": 7,
  "usage": {}
}
```

**Errors:** `400` `ALREADY_REDEEMED`, `REDEEM_WINDOW_EXPIRED`, `REFERRAL_CODE_INVALID`, `SELF_REFERRAL_NOT_ALLOWED`. `404` `REFERRAL_CODE_NOT_FOUND`.

---

## Pronunciation check

### `POST /api/check`

Optional auth. Scores a recording against a target sentence. Authenticated calls consume a daily credit unless `count_usage` is false or the call is an in-progress screening that is still allowed to bypass billing.

**Body:** `multipart/form-data`

| Field | Type | Notes |
| --- | --- | --- |
| `sentence` | string | Target text. |
| `dialect` | `uk` \| `us` | Default `uk`. The app sends the practice dialect. |
| `language` | string | Default `en`. Chooses alignment tips. |
| `is_screening` | boolean | Default `false`. The screening flow sends `true`. |
| `count_usage` | boolean | Default `true`. Intermediate voice-activity checks send `false` so they gate quota without consuming a credit. |
| `audio` | file | WAV, WebM, M4A, or AAC. The app uploads `speech.wav`. |

**Response `200`**

```json
{
  "sentence": "food is good",
  "dialect": "uk",
  "target_ipa": "fuːd ɪz gʊd",
  "predicted_ipa": "fuːd ɪz gʊd",
  "cer": 0.0,
  "accuracy": 1.0,
  "correct_percentage": 100.0,
  "error_count": 0,
  "correct_count": 10,
  "target_length": 10,
  "char_alignment": [],
  "usage": {}
}
```

`usage` is `null` for anonymous callers. `accuracy` is a rate from 0 to 1. A final counted check is also written to practice history.

**Errors**

| Status | When |
| --- | --- |
| `400` | Unsupported audio, decode failure, or no IPA for the sentence. |
| `402` | `DAILY_LIMIT_REACHED`. `detail.usage` is included. |
| `503` | `ASR_UNAVAILABLE` (`detail.retryable`, `detail.backend`) or the model failed to load. |

After a successful check the app posts `char_alignment` to `POST /api/progress/sounds/log` when the score is high enough to count.

---

## Prepare text

### `POST /api/prepare`

Optional auth. Splits text into sentences and attaches word IPA. Sample audio is generated only for Pro or trial users. Anonymous callers may prepare only the landing sentence `food is good`, and only a pre-existing audio URL is returned.

**Body**

| Field | Type | Notes |
| --- | --- | --- |
| `text` | string | Required. |
| `dialect` | `uk` \| `us` | Default `uk`. |
| `include_audio` | boolean | Default `true`. Text practice sends `false`. |
| `include_words` | boolean | Default `true`. Text practice sends `false` and loads IPA later. |

**Response `200`**

```json
{
  "dialect": "uk",
  "sentences": [
    { "index": 0, "text": "food is good", "words": [], "audio_url": null }
  ]
}
```

**Errors:** `401` when an anonymous caller sends any text other than `food is good`.

---

## Lessons

Lesson items:

```json
{
  "phoneme": "θ",
  "type": "words",
  "level": "easy",
  "text": "think",
  "audio_url": null
}
```

`type` is `words`, `phrases`, or `sentences`. `level` is `easy`, `medium`, or `hard`. `audio_url` is omitted when `lazy_assets=true`; the app then loads audio with `POST /api/text-practice/audio`.

Lesson sentences add `phoneme`, `type`, and `level` onto the Sentence object. With `lazy_assets=true`, `words` is an empty array and the app loads IPA with `POST /api/text-practice/ipa`.

### `GET /api/lessons/home-summary`

Required. One payload for the logged-in home page.

**Query:** `dialect` (`uk` or `us`, default `uk`).

**Response `200`**

```json
{
  "dialect": "uk",
  "total_accuracy": 0.72,
  "daily_mission_phonemes": ["θ", "ð"],
  "weakest_phonemes": [{ "sound": "θ", "accuracy": 0.4 }],
  "requires_screening": false,
  "score_unlocked": true,
  "show_screening_prompt": false,
  "score_unlock_progress": {},
  "streak_days": 3,
  "journey": {}
}
```

`weakest_phonemes[].accuracy` is `null` for sounds the user has not practiced. `total_accuracy` is 0 to 1.

### `GET /api/lessons/personalized`

Required. Practice set built from the user's weakest phonemes.

**Query**

| Name | Notes |
| --- | --- |
| `dialect` | `uk` or `us`. |
| `lazy_assets` | Default `false`. Home sends `true`. |

**Response `200`**

```json
{
  "phonemes": ["θ", "ð"],
  "dialect": "uk",
  "items": [],
  "sentences": []
}
```

### `GET /api/lessons/phoneme/{phoneme}`

Optional auth. Instructions and a practice set for one phoneme. Authenticated users get history-aware selection. Anonymous users get the first items from the lesson catalog.

**Query:** `dialect`, `lazy_assets` (same as personalized).

**Response `200`**

```json
{
  "phoneme": "θ",
  "dialect": "uk",
  "en_instructions": "",
  "vi_instructions": "",
  "items": [],
  "sentences": []
}
```

**Errors:** `404` unknown phoneme.

### `POST /api/lessons/practiced`

Required. Records phonemes practiced today.

**Body**

```json
{ "phonemes": ["θ", "ð"] }
```

**Response `200`**

```json
{ "ok": true, "practiced_phonemes": ["ð", "θ"] }
```

**Errors:** `400` when the list is empty or contains only unknown phonemes.

### `POST /api/lessons/journey-complete`

Required. Increments the journey lesson count by 1. Empty body. Called when a personalized lesson is fully checked, separately from `/api/lessons/practiced`.

**Response `200`**

```json
{ "ok": true, "completed_lesson_count": 7, "journey": {} }
```

---

## Screening

### `GET /api/screening/sentences`

Required. Fixed screening sentences with word IPA.

**Query:** `dialect` (`uk` or `us`).

**Response `200`**

```json
{
  "dialect": "uk",
  "sentences": [{ "index": 0, "text": "...", "words": [], "audio_url": null }]
}
```

### `POST /api/screening/complete`

Required. Marks screening complete. Safe to call more than once. The app sends `{}`.

**Response `200`**

```json
{ "ok": true, "screening_completed": true, "total_accuracy": 0.61 }
```

`total_accuracy` is the user's current overall accuracy, from 0 to 1.

---

## Videos

### `GET /api/videos`

Optional auth. Approved catalog, newest page first.

**Query**

| Name | Default | Notes |
| --- | --- | --- |
| `topic` | | Topic slug or label. |
| `level` | | Level filter. |
| `limit` | `50` | 1–200. |
| `cursor` | | Opaque cursor from `next_cursor`. |
| `exclude_viewed` | `true` | When the caller is logged in, hides videos they have already opened. |

**Response `200`**

```json
{
  "videos": [
    {
      "youtube_id": "dQw4w9WgXcQ",
      "title": "",
      "topic": "",
      "topics": [],
      "level": "",
      "duration_ms": 0,
      "segment_count": 0,
      "thumbnail_url": "",
      "dialect": "us",
      "channel": ""
    }
  ],
  "next_cursor": null
}
```

### `GET /api/videos/topics`

Optional auth.

**Response `200`**

```json
{ "topics": ["Daily life"], "topic_slugs": ["daily-life"] }
```

### `GET /api/videos/viewed`

Required. Videos the user has opened, newest `last_viewed_at` first, with play progress. Card fields come from the in-memory recommendation catalog. A viewed video that is not in that catalog is omitted. `cursor` is an opaque continuation of that recent-views index.

**Query:** `limit` (default 50, max 200), `cursor`.

**Response `200`**

Each video is a catalog item plus:

| Field | Type |
| --- | --- |
| `played_count` | integer |
| `played_pct` | integer, 0–100 |
| `first_viewed_at` | unix seconds |
| `last_viewed_at` | unix seconds |

```json
{ "videos": [], "next_cursor": null }
```

### `GET /api/videos/{youtube_id}`

Optional auth. Video plus timed segments. Word IPA is empty here; the practice page loads it with `POST /api/videos/segment-ipa`.

**Query:** `dialect` (`uk` or `us`). Returned on the video, not used to rewrite stored captions.

**Response `200`**

```json
{
  "youtube_id": "dQw4w9WgXcQ",
  "title": "",
  "channel": "",
  "duration_ms": 0,
  "topic": "",
  "topics": [],
  "level": "",
  "level_reason": "",
  "dialect": "uk",
  "thumbnail_url": "",
  "segments": [
    {
      "index": 0,
      "start_ms": 0,
      "end_ms": 2400,
      "text": "",
      "translation_vi": "",
      "words": []
    }
  ]
}
```

**Errors:** `404` video not found.

### `POST /api/videos/segment-ipa`

Required. Word IPA for one caption line.

**Body**

```json
{ "text": "food is good", "dialect": "us" }
```

**Response `200`**

```json
{ "words": [{ "word": "food", "ipa": "fud" }] }
```

**Errors:** `400` empty text.

### `POST /api/videos/{youtube_id}/view/start`

Required. Records that the user opened the video. Safe to call again; the first view timestamp is kept.

**Body**

| Field | Type |
| --- | --- |
| `segment_count` | integer, ≥ 0 |
| `title` | string |
| `thumbnail_url` | string |
| `level` | string |
| `topic` | string |
| `channel` | string |
| `duration_ms` | integer |
| `dialect` | string, default `us` |

**Response `200`**

```json
{
  "youtube_id": "dQw4w9WgXcQ",
  "title": "",
  "topic": "",
  "level": "",
  "duration_ms": 0,
  "segment_count": 12,
  "thumbnail_url": "",
  "dialect": "us",
  "channel": "",
  "played_count": 0,
  "played_pct": 0,
  "first_viewed_at": 1710000000,
  "last_viewed_at": 1710000000
}
```

### `POST /api/videos/{youtube_id}/view/segment`

Required. Marks one caption index as played.

**Body**

```json
{ "index": 0 }
```

**Response `200`:** the same view summary as `view/start`, with updated `played_count` and `played_pct`.

---

## Text practice

`POST /api/text-practice/audio` with `generate: true` (the default) and `POST /api/text-practice/ocr` require an active Pro subscription or trial. Otherwise they return `402`:

```json
{
  "detail": {
    "code": "PRO_REQUIRED",
    "message": "Upgrade to EarlySigns Pro to generate practice sample audio.",
    "usage": {}
  }
}
```

### `POST /api/text-practice/audio`

Required.

**Body**

| Field | Type | Notes |
| --- | --- | --- |
| `text` | string | Required. |
| `dialect` | `uk` \| `us` | Default `uk`. |
| `generate` | boolean | Default `true`. `false` returns an existing URL and does not require Pro. Lesson playback sends `false`. |

**Response `200`**

```json
{ "audio_url": "https://..." }
```

`audio_url` may be `null` when `generate` is false and no file exists yet.

### `POST /api/text-practice/ipa`

Required. IPA lookup is free for signed-in users.

**Body**

```json
{ "text": "food is good", "dialect": "uk" }
```

**Response `200`**

```json
{
  "words": [{ "word": "food", "ipa": "fuːd" }],
  "dialect": "uk"
}
```

### `POST /api/text-practice/ocr`

Required. Pro or trial. Extracts English practice text from a photo.

**Body:** `multipart/form-data`, field `image`. JPEG, PNG, WebP, or GIF. Maximum 8 MB.

**Response `200`**

```json
{ "text": "The quick brown fox" }
```

**Errors:** `400` bad type, empty file, or over 8 MB. `402` `PRO_REQUIRED`. `422` no English text found. `502` OCR failed. `503` OCR service unavailable.

---

## Passage history

### `GET /api/history/passages`

Required.

**Query**

| Name | Default | Notes |
| --- | --- | --- |
| `limit` | `10` | Clamped to 1–50. The app requests 30. |
| `cursor` | | `next_cursor` from the previous page (unix `created_at`). |

**Response `200`**

```json
{
  "items": [
    {
      "id": "<passage id>",
      "title": "Morning routine",
      "text": "...",
      "dialect": "uk",
      "created_at": 1710000000
    }
  ],
  "next_cursor": null
}
```

### `POST /api/history/passages`

Required.

**Body**

| Field | Type | Notes |
| --- | --- | --- |
| `text` | string | Required. |
| `title` | string | Required. Max 200 characters. |
| `dialect` | `uk` \| `us` | Default `uk`. |
| `replace_id` | string | Optional. Replaces an existing passage. |

**Response `200`:** one passage item (`id`, `title`, `text`, `dialect`, `created_at`).

---

## Progress

### `POST /api/progress/sounds/log`

Required. Updates per-phoneme accuracy from a check alignment. The app sends the `char_alignment` array from `/api/check`.

**Body**

```json
{ "char_alignment": [{ "char": "θ", "status": "correct" }] }
```

Rows whose `status` is not `correct`, `replaced`, or `deleted`, and characters that are not tracked phonemes, are ignored.

**Response `200`**

```json
{
  "ok": true,
  "previous_total_accuracy": 0.7,
  "total_accuracy": 0.72
}
```

An empty or unrecognized alignment still returns `{ "ok": true }`.

### `GET /api/progress/sounds`

Required. All tracked phonemes for the dialect, most frequent first.

**Query:** `dialect` (`uk` or `us`).

**Response `200`**

```json
{ "items": [{ "sound": "ə", "accuracy": 0.8 }] }
```

`accuracy` is 0 to 1. Unpracticed sounds are `0`.

### `GET /api/progress/history`

Required. Daily accuracy snapshots.

**Query**

| Name | Notes |
| --- | --- |
| `start` | Required. Inclusive `YYYY-MM-DD`. |
| `end` | Required. Inclusive `YYYY-MM-DD`. |
| `phoneme` | Optional. Keeps `total` and that phoneme only. The profile page omits it. |

**Response `200`**

```json
{
  "items": [
    { "date": "2026-09-27", "accuracy": { "total": 0.72, "θ": 0.4 } }
  ]
}
```

---

## Feedback

### `POST /api/feedback`

Optional auth. Stores a message. Anonymous callers must send `X-Device-Id` of at least 8 characters. The app sends this while logged in.

**Body**

| Field | Type | Notes |
| --- | --- | --- |
| `message` | string | Required. Max 10,000 characters. |
| `context` | object | Optional app state. Default `{}`. |

**Response `200`**

```json
{ "ok": true, "feedback_id": "<id>", "created_at": 1710000000 }
```

---

## Marketing

### `POST /api/marketing/convert`

Required. Claims a campaign conversion after login, using the `mkt` token stored from the marketing link.

**Body**

```json
{ "token": "<mkt token>" }
```

Token length 8–200.

**Response `200`**

```json
{ "ok": true, "already_converted": false, "campaign_id": "welcome" }
```

**Errors:** `403` token belongs to another user. `404` unknown token. The app clears the stored token on `200`, `403`, and `404`.

---

## Error reporting

### `POST /api/error-report`

Public. The app sends this in the background when an API call fails. The server emails the admin and always returns success to the client.

**Body**

| Field | Type | Notes |
| --- | --- | --- |
| `error_message` | string | Required. Max 5,000 characters. |
| `path` | string | API path that failed. |
| `method` | string | Default `GET`. |
| `status` | integer | HTTP status, or `null`. |
| `page_url` | string | Browser URL. |
| `user_email` | string | Optional. |
| `user_id` | string | Optional. |
| `context` | object | Optional. |

**Response `200`**

```json
{ "ok": true }
```
