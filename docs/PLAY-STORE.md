# Play Store / App Store–ready restaurant apps

Har kitchen ki **alag** Customer (aur Staff) app — unique `applicationId`, baked `tenant=CODE`.  
Kisi dusre restaurant se merge nahi.

| Channel | File | Who uses it |
|---|---|---|
| WhatsApp / USB install | `.apk` (release or debug) | Admin → customers |
| **Google Play Console** | `.aab` (signed release) | Super (or Admin download) → Play upload |

## One-time: upload keystore (Windows)

Android Studio JDK ke saath:

```cmd
set JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr
"%JAVA_HOME%\bin\keytool" -genkey -v -keystore %USERPROFILE%\ordo-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias ordo-upload
```

Phir `mobile/ordo-guest/android/keystore.properties` aur `mobile/ordo-pos/android/keystore.properties`:

```properties
storeFile=C:\\Users\\YOU\\ordo-upload.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=ordo-upload
keyPassword=YOUR_KEY_PASSWORD
```

Copy from `mobile/keystore.properties.example`. **Kabhi git pe mat push karo.**

## Build for Play (per restaurant)

```cmd
cd Desktop\Restaurant-
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr

node scripts\build-tenant-apks.cjs --code=DEMO --name="Demo Kitchen" --release --version-code=1 --version-name=1.0.0
```

Gradle lock / `android-34-2` SDK path issues: see **Troubleshooting** in `docs/APK-PATH.md`.

Output under `.data\apks\tenants\DEMO\`:

- `ORDO-DEMO-Customer.aab` ← **Play Console → Create app → Production → Upload**
- `ORDO-DEMO-Customer.apk` ← sideload / Admin download
- same for Staff

## Super → Apps
1. Select restaurant  
2. Upload **Customer .apk** (diners via Admin)  
3. Upload **Customer .aab** (Play Store)  
4. Admin Settings → download APK for customers; AAB optional for their Play listing  

## Play Console checklist
- Unique package: `com.ordo.customer.{code}` / `com.ordo.staff.{code}`  
- App name = restaurant branding  
- Privacy policy URL + store listing graphics  
- Same upload keystore forever (lose it = cannot update that listing)  
- Target SDK must meet Play requirements (project uses 34+)  

## Isolation
Deep link always includes `tenant=CODE`. Customer app never opens Super/Admin of another kitchen.
