# Bongo Stream App - AI Handover Document

## 📍 Current Status
* **App Version:** `4.0.0` (versionCode: `4`)
* **Framework:** React Native / Expo (EAS Build)
* **Latest Action:** Successfully triggered EAS builds (AAB, APK, IPA) and pushed all code to GitHub. 

## ✅ What Was Just Accomplished
1. **UI Updates:** Replaced the Discover page artwork with a high-quality "Vintage Vinyl" record spinner (using `LinearGradient`, grooves, and spindle), and updated the download and flame icons.
2. **Core Fixes:** Restored the native `react-native-track-player` in the `playerStore.ts` and restored Sentry crash reporting in `_layout.tsx` while ensuring no system-level errors are exposed directly to the user (generic UI errors are used instead).
3. **GitHub Push:** Initialized the repository, fixed the 500 error, and successfully pushed all code to [meerkal70-glitch/bongo-muse](https://github.com/meerkal70-glitch/bongo-muse).
4. **EAS Credentials Configured:** Extracted the alias (`bongo`) from the local `bongo_v2_upload.keystore` and successfully uploaded it to Expo's secure cloud storage.
5. **Builds Initiated:** 
   * **iOS (Preview):** Completed successfully.
   * **Android APK (Preview):** Currently building on EAS.
   * **Android AAB (Production):** Currently building on EAS (signed securely with `bongo_v2_upload.keystore`).

## 🔑 Important Credentials & Variables
* **Keystore File:** `bongo_v2_upload.keystore` (Located in the project root)
* **Keystore Password:** `20055002`
* **Keystore Alias:** `bongo`
* **GitHub Token:** `ghp_***` (Saved in local terminal history/context)
* **Expo Token:** `PtL***` (Saved in local terminal history/context)

## 🚀 Next Steps / Pending Work
1. **Check Build Status:** Verify that the Android APK and AAB builds have completed successfully on the [Expo Dashboard](https://expo.dev/accounts/dapazcmd/projects/combongostreamapp/builds).
2. **Download Feature (Watermarked Video):** We discussed adding a feature to download 1-minute watermarked videos of songs with details. This is **NOT STARTED** and will require using native `ffmpeg` dependencies (moving away from Expo Go).
3. **Testing:** Test the downloaded APK locally to ensure the Vinyl animations and Track Player work flawlessly in the production binary.

---
*Note for the next AI: Read this document carefully to understand the context. Do not prompt the user for the keystore alias again, it is `bongo`.*
