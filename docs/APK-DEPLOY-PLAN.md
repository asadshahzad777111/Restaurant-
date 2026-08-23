# ORDO App — APK Deploy Plan

> Goal: let website visitors download/try the ORDO Staff app (the product "inside")
> so they understand what ORDO is and what it does.

## 1. What the APK is

| | |
|---|---|
| File | `app-debug.apk` → published as `public/apk/ordo-staff.apk` |
| App | **ORDO Staff** (`com.ordo.pos`) |
| Loads | `https://ordo.asfins.com/login?app=staff` — restaurant staff login, never `/super` |
| Version | 1.0.0 (debug build) |
| Size | ~3.6 MB |
| Key feature | AsFix Bluetooth thermal print plugin (Staff prints 58mm; the Customer app does not) |

## 2. Why a debug build

- `app-debug.apk` is signed with the debug keystore — installable on any Android for testing.
- For a **production** Kitchen APK, build a release (`--release`) and upload per-kitchen via
  Super → Apps. This demo build is the quick "try the app" copy.

## 3. How it's published

- Served as a static file from `public/apk/ordo-staff.apk` → `https://ordo.asfins.com/apk/ordo-staff.apk`.
- Add a **"Get the ORDO app"** download card on the marketing page linking to it.
- `.gitignore` ignores `*.apk`, so this file is **force-added** (`git add -f`) — the only APK
  in the repo.

## 4. Install steps (shown to the visitor)

1. Download the APK.
2. On Android: Settings → Security → allow **"Unknown sources"**.
3. Open the APK → install → open → sign in with a restaurant code + staff login.

## 5. Future (proper)

- Build a **release** APK per kitchen with its own package id + baked tenant code, upload via
  Super → Apps → download by that kitchen's Admin (already supported in `src/lib/apks.ts`).
