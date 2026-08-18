# APK shell prep (localhost → later store)

ORDO stays a Next.js web app. APK is a thin shell later — do not block localhost work.

## Ready now
- PWA: `public/manifest.webmanifest` + `/ordo-icon.svg`
- `/pos` staff counter route works on mobile browsers
- Version placeholder: see `public/app-version.json`

## Capacitor stub (when Android SDK available)

```bash
npm i -D @capacitor/core @capacitor/cli @capacitor/android
npx cap init ORDO com.ordo.restaurant
```

Recommended SaaS pattern: WebView loads your hosted URL (or localhost via tunnel for demos). One APK → many tenants via restaurant code login.

```bash
npx cap add android
npx cap open android
```

## Deferred
- Play Store listing / signing
- Native ESC/POS USB/Bluetooth (browser print templates exist first)
- Background print-job queue (structure left open via HTML receipt helpers in `src/lib/print.ts`)
