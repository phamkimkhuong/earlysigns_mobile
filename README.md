# EarlySigns mobile app (Expo)

React Native / Expo port of the `webapp/` pronunciation practice product. All mobile code lives in this folder. The webapp is unchanged.

## What was ported

- Email OTP login (`/api/auth/request-otp`, `/api/auth/verify-otp`)
- Google sign-in via `expo-auth-session` (needs `EXPO_PUBLIC_GOOGLE_CLIENT_ID`)
- Videos catalog + YouTube practice with segment IPA, mic check, view tracking
- Text practice (`/api/prepare` + `/api/check`) with optional OCR (`expo-image-picker`)
- Phoneme home, screening, weakest-sound lessons, IPA checking
- Journey path and personalized lessons
- Profile: usage/plan, UK/US dialect, language, progress chart, referral, logout
- PayOS checkout in a WebView (native) or browser (web), success/cancel handling, activation codes
- Terms, privacy, referral, and a simple About screen
- en/vi i18n copied from `webapp/src/locales/`

## Deferred / web-only

- Marketing landing (`/intro`, `/vi`, `/en`) and SEO/GA4
- Silero ONNX VAD — mobile uses expo-av metering + silence auto-stop (or tap to stop)
- Native Google Sign-In SDK (`@react-native-google-signin/google-signin`) — Expo Auth Session is used instead. Dedicated iOS/Android OAuth client IDs may be required for store builds.
- Android Expo Go cannot record true WAV PCM (MediaRecorder). The app uploads AAC/M4A; the API transcodes it (ffmpeg). A development-client PCM recorder is still better for quality. iOS LINEARPCM WAV is unchanged.
- Expo web recording is typically WebM/Opus; `/api/check` accepts WebM as well as WAV.

## Setup

```bash
cd mobile_app
cp .env.example .env
# edit .env
npm install
npx expo start
```

Then press `i` (iOS simulator), `a` (Android emulator), or `w` (web). Scan the QR code with Expo Go on a device.

To syntax-check the JS bundle without a simulator:

```bash
npx expo export --platform web --output-dir dist
```

## Env vars

| Variable | Description |
| --- | --- |
| `EXPO_PUBLIC_API_BASE` | FastAPI origin. Default `http://localhost:8000` |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Web client ID (same as webapp `VITE_GOOGLE_CLIENT_ID`) |

`.env` is gitignored.

### Talking to the backend from a device

- **iOS simulator:** `http://localhost:8000` works if the API is on the same Mac.
- **Android emulator:** use `http://10.0.2.2:8000` instead of localhost.
- **Physical phone (Expo Go):** use your computer's LAN IP, e.g. `http://192.168.1.10:8000`. The phone and API host must be on the same network. `app.json` enables cleartext HTTP (`usesCleartextTraffic` / ATS exception) for local development.

## Native caveats

- **Microphone:** grant the OS permission when prompted. Recording is 16 kHz mono WAV on iOS and AAC/M4A on Android Expo Go. `/api/check` accepts WAV, WebM, M4A/AAC, and 3GP.
- **YouTube:** native uses `react-native-youtube-iframe`; Expo web uses the official YouTube IFrame API. Auto-pause at sentence end is polled (~200ms).
- **Google Sign-In:** OTP works without extra native config. Google needs a client ID and, for production native apps, iOS/Android OAuth clients plus the `earlysigns` URL scheme.
- **PayOS:** on iOS/Android the checkout URL opens in a WebView. Return URLs are the server-configured webapp `PAYOS_RETURN_URL` / `PAYOS_CANCEL_URL`. The WebView intercepts `/payment/success` and `/payment/cancel` and verifies `/api/billing/checkout/verify`. On web, checkout opens in the system browser.

## Folder structure

```
mobile_app/
  App.js
  src/
    screens/          Videos, Text, Phonemes, Journey, Profile, Login, Payment, legal
    components/       IPAChecking, HomeJourney, YoutubePlayer, packages/modals
    hooks/            usePronunciationCheck, useSegmentIpa
    services/         Auth + AsyncStorage
    locales/          en.json, vi.json
    navigation/       tabs + stack
```
