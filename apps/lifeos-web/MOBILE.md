# LifeOS Mobile (Capacitor v6)

Packages `lifeos-web` into native Android / iOS shells (`com.lifeos.mobile`).

## Scripts

```bash
# from apps/lifeos-web (or via workspace)
npm run mobile:sync              # build dist + cap sync
npm run mobile:open:android      # sync + open Android Studio
npm run mobile:open:ios          # sync + open Xcode (macOS)
```

## First-time platform add

```bash
npm run build
npx cap add android
npx cap add ios   # requires macOS + Xcode
npx cap sync
```

## Native helpers

- `src/lib/mobileBridge.ts` — `isMobileApp`, haptics, status bar
- Workspace toggle fires `Haptics.impact(Light)` on native devices
- Theme changes update StatusBar style / overlay

## Prerequisites

- Android Studio (SDK 34+) for `.apk` / `.aab`
- Xcode 15+ on macOS for `.ipa`
