# ORDO Staff (Capacitor)

Loads live `https://ordo.asfins.com/login?app=staff`.

## Bluetooth thermal

Includes AsFix kit plugin `@asfixgear/asfix-thermal-print` under `plugins/asfix-thermal-print`.

```bash
npm install
npm run build:plugin
npx cap sync android
npx cap open android
```

See `docs/THERMAL-BLUETOOTH-ORDO.md`.
