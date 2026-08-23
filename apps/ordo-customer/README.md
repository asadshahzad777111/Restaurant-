# ORDO Customer — native guest-ordering app (Expo)

Guest ordering client (menu → cart → checkout), reuses the ORDO guest API.

## Run

```
cd apps/ordo-customer
npm install
npx expo install
npx expo start        # 'a' Android / scan QR with Expo Go / 'w' web
```

Default API `https://ordo.asfins.com/api`. To test against a local backend:

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api npx expo start
```

## Flow
- Enter a restaurant code (or it remembers the last one) → open menu
- Browse by category, add to cart, checkout
- Choose service (table / pickup / delivery) → table picker → place order

## Per-kitchen baked app
`scripts/build-tenant-apks.cjs` builds a **Customer** APK per kitchen
(`com.ordo.customer.<code>`) that opens straight to that kitchen's menu.
