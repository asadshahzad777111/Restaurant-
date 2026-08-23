# ORDO Staff — native app (Expo / React Native)

A native, app-feel ORDO Staff client. Reuses the same ORDO backend API
(`/api/auth`, `/api/state`, `/api/orders`, `/api/orders/:id`) — no new backend.

## Run it

```
cd apps/ordo-staff
npm install
npx expo install          # fixes dependency versions to match your Expo SDK
npx expo start            # then press 'a' for Android / scan QR with Expo Go
```

## Point it at your API

Default `BASE_URL` is `https://ordo.asfins.com/api`. To override:

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api npx expo start
```

## Build a real APK / AAB

```
npx expo prebuild --platform android   # generates android/
cd android && ./gradlew assembleRelease # needs keystore.properties for release
```

## Screens included (skeleton)

- **Login** — restaurant code + username + password → `/api/auth`
- **Orders** — live list, advance status (`/api/orders/:id`)
- **Kitchen** — place / accepted / preparing / ready lanes, tap to advance
  (4s polling, same model as the web KDS)

## Next (planned)

- Native 58mm Bluetooth ESC/POS printing
- Push notifications for new orders
- Menu / Tables / Settings screens
- QR scan to pick a kitchen & table
- Per-kitchen branding (name + brand color) baked at build time
