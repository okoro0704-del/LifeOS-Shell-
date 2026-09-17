# LifeOS Mobile (Capacitor v6)

Packages `lifeos-web` into a native Android shell (`com.lifeos.mobile`).

## Install once + OTA updates

Production APKs set `CAPACITOR_SERVER_URL=https://lifeosapp.getlifeos.app` so the
native shell loads the live Netlify site.

- **Install the APK once**
- **Web/UI updates** ship automatically when Netlify deploys — checked on every
  app launch / resume via `/ota.json`
- **Native shell APK bumps** (versionCode) are offered when
  `GET /v1/releases/latest?appId=lifeos-web&platform=android` reports a newer build

## Scripts

```bash
# from apps/lifeos-web
npm run mobile:sync              # production sync (live Netlify URL + cap sync)
npm run mobile:apk               # sync + assemble signed release APK
npm run mobile:open:android      # sync + open Android Studio
```

APK output:

`android/app/build/outputs/apk/release/app-release.apk`

## First-time platform add

```bash
npm run build
npx cap add android
npx cap sync
```

## Native helpers

- `src/lib/mobileBridge.ts` — `isMobileApp`, haptics, status bar
- `src/lib/otaUpdate.ts` — launch/resume OTA discovery
- Workspace toggle fires `Haptics.impact(Light)` on native devices

## Prerequisites

- Android Studio (SDK 34+) / JDK 17 for `.apk`
- Xcode 15+ on macOS for `.ipa`
