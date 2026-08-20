#!/usr/bin/env node
/**
 * Build per-restaurant Staff + Customer Capacitor configs (and APKs/AABs when Android SDK exists).
 *
 * Usage:
 *   node scripts/build-tenant-apks.cjs --code=LAHORE1 --name="Lahore Grill"
 *   node scripts/build-tenant-apks.cjs --code=DEMO --name="Demo Kitchen" --release --version-code=1 --version-name=1.0.0
 *   node scripts/build-tenant-apks.cjs --code=DEMO --name="Demo Kitchen" --skip-gradle
 *
 * Debug output:
 *   .data/apks/tenants/<CODE>/ORDO-<CODE>-Staff.apk
 *   .data/apks/tenants/<CODE>/ORDO-<CODE>-Customer.apk
 *
 * Release (+ keystore.properties):
 *   …-Staff.aab / …-Customer.aab  → Google Play
 *   …-Staff.apk / …-Customer.apk  → sideload / Admin download
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function arg(name, fallback = "") {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const codeRaw = arg("code");
const nameRaw = arg("name", codeRaw || "Restaurant");
const skipGradle = process.argv.includes("--skip-gradle");
const release = process.argv.includes("--release");
const versionCode = arg("version-code", "1");
const versionName = arg("version-name", "1.0.0");
const host = (arg("host", "https://ordo.asfins.com") || "https://ordo.asfins.com").replace(/\/$/, "");

if (!codeRaw) {
  console.error(
    'Required: --code=RESTAURANTCODE [--name="Display Name"] [--release] [--version-code=1] [--version-name=1.0.0]',
  );
  process.exit(1);
}

const code = codeRaw.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 24) || "KITCHEN";
const safeId = code.toLowerCase().replace(/[^a-z0-9]/g, "");
const displayName = nameRaw.trim() || code;
const root = path.join(__dirname, "..");

const shells = [
  {
    folder: "mobile/ordo-pos",
    slot: "staff",
    appId: `com.ordo.staff.${safeId || "kitchen"}`,
    appName: `${displayName} Staff`,
    url: `${host}/login?app=staff&tenant=${encodeURIComponent(code)}`,
    filename: `ORDO-${code}-Staff.apk`,
    aabFilename: `ORDO-${code}-Staff.aab`,
  },
  {
    folder: "mobile/ordo-guest",
    slot: "customer",
    appId: `com.ordo.customer.${safeId || "kitchen"}`,
    appName: `${displayName} Order`,
    url: `${host}/guest?app=customer&tenant=${encodeURIComponent(code)}`,
    filename: `ORDO-${code}-Customer.apk`,
    aabFilename: `ORDO-${code}-Customer.aab`,
  },
];

const outRoot = path.join(root, ".data", "apks", "tenants", code);
fs.mkdirSync(outRoot, { recursive: true });

function writeConfig(shell) {
  const dir = path.join(root, shell.folder);
  const cfgPath = path.join(dir, "capacitor.config.json");
  const backup = path.join(dir, "capacitor.config.base.json");
  if (!fs.existsSync(backup) && fs.existsSync(cfgPath)) {
    fs.copyFileSync(cfgPath, backup);
  }
  const cfg = {
    appId: shell.appId,
    appName: shell.appName,
    webDir: "www",
    server: {
      url: shell.url,
      cleartext: false,
      allowNavigation: ["ordo.asfins.com", "localhost", "127.0.0.1", "api.ordo.asfins.com"],
    },
    android: { allowMixedContent: false },
  };
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n");
  fs.writeFileSync(
    path.join(outRoot, `capacitor.${shell.slot}.json`),
    JSON.stringify(cfg, null, 2) + "\n",
  );
  console.log(`Configured ${shell.appName} → ${shell.url}`);
}

function hasSdk() {
  const home = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "";
  return home && fs.existsSync(path.join(home, "platforms"));
}

function hasKeystore(androidDir) {
  return fs.existsSync(path.join(androidDir, "keystore.properties"));
}

/** AGP 8.x needs JDK 17+. Prefer Android Studio's bundled JBR over old system Java 8. */
function ensureJava17() {
  const candidates = [];
  if (process.env.JAVA_HOME) candidates.push(process.env.JAVA_HOME);
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA || "";
    const pf = process.env["ProgramFiles"] || "C:\\Program Files";
    const pf86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    candidates.push(
      path.join(pf, "Android", "Android Studio", "jbr"),
      path.join(local, "Programs", "Android Studio", "jbr"),
      path.join(pf86, "Android", "Android Studio", "jbr"),
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Android Studio.app/Contents/jbr/Contents/Home",
      "/Applications/Android Studio.app/Contents/jre/Contents/Home",
    );
  } else {
    candidates.push("/opt/android-studio/jbr", "/usr/lib/jvm/java-17-openjdk");
  }
  for (const home of candidates) {
    if (!home) continue;
    const javaBin = path.join(home, "bin", process.platform === "win32" ? "java.exe" : "java");
    if (fs.existsSync(javaBin)) {
      process.env.JAVA_HOME = home;
      process.env.PATH = `${path.join(home, "bin")}${path.delimiter}${process.env.PATH || ""}`;
      console.log(`Using JAVA_HOME=${home}`);
      return;
    }
  }
  console.warn(
    "Warning: JDK 17+ not found. If Gradle fails with Java 8/11 errors, set JAVA_HOME to Android Studio\\jbr",
  );
}

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed`);
}

function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.copyFileSync(src, dest);
  console.log(`Wrote ${dest}`);
  return true;
}

ensureJava17();

for (const shell of shells) {
  writeConfig(shell);
  const dir = path.join(root, shell.folder);
  const androidDir = path.join(dir, "android");
  if (skipGradle || !hasSdk()) {
    console.log(`Skip gradle for ${shell.slot} (no ANDROID_HOME or --skip-gradle).`);
    continue;
  }
  try {
    if (!fs.existsSync(path.join(dir, "node_modules"))) {
      run("npm", ["install"], dir);
    }
    if (!fs.existsSync(androidDir)) {
      run("npx", ["cap", "add", "android"], dir);
    }
    run("npx", ["cap", "sync", "android"], dir);
    const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
    const versionArgs = [`-PordoVersionCode=${versionCode}`, `-PordoVersionName=${versionName}`];

    if (release) {
      if (!hasKeystore(androidDir)) {
        console.error(
          `Release build needs ${path.join(androidDir, "keystore.properties")} — see docs/PLAY-STORE.md`,
        );
        console.error("Falling back to debug APK for this slot.");
        run(gradlew, ["assembleDebug", "--no-daemon", ...versionArgs], androidDir);
        const apk = path.join(androidDir, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
        if (!fs.existsSync(apk)) throw new Error(`Missing ${apk}`);
        copyIfExists(apk, path.join(outRoot, shell.filename));
        copyIfExists(apk, path.join(outRoot, `${shell.slot}.apk`));
        continue;
      }
      run(gradlew, ["bundleRelease", "assembleRelease", "--no-daemon", ...versionArgs], androidDir);
      const aab = path.join(androidDir, "app", "build", "outputs", "bundle", "release", "app-release.aab");
      const apkRel = path.join(androidDir, "app", "build", "outputs", "apk", "release", "app-release.apk");
      if (!copyIfExists(aab, path.join(outRoot, shell.aabFilename))) {
        throw new Error(`Missing ${aab}`);
      }
      copyIfExists(aab, path.join(outRoot, `${shell.slot}.aab`));
      if (copyIfExists(apkRel, path.join(outRoot, shell.filename))) {
        copyIfExists(apkRel, path.join(outRoot, `${shell.slot}.apk`));
      }
    } else {
      run(gradlew, ["assembleDebug", "--no-daemon", ...versionArgs], androidDir);
      const apk = path.join(androidDir, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
      if (!fs.existsSync(apk)) throw new Error(`Missing ${apk}`);
      copyIfExists(apk, path.join(outRoot, shell.filename));
      copyIfExists(apk, path.join(outRoot, `${shell.slot}.apk`));
    }
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    console.error("Upload a manually built APK/AAB via Super → Apps for this restaurant.");
  }
}

const manifest = {
  code,
  name: displayName,
  host,
  release,
  versionCode: Number(versionCode) || 1,
  versionName,
  builtAt: new Date().toISOString(),
  apps: shells.map((s) => ({
    slot: s.slot,
    appName: s.appName,
    appId: s.appId,
    url: s.url,
    filename: s.filename,
    aabFilename: s.aabFilename,
  })),
  note: release
    ? "Upload .aab to Google Play Console. Upload .apk to Super → Apps for Admin sideload. See docs/PLAY-STORE.md."
    : "Debug APK only. For Play Store: add keystore.properties and rebuild with --release.",
};
fs.writeFileSync(path.join(outRoot, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`\nManifest: ${path.join(outRoot, "manifest.json")}`);
console.log("Per-restaurant apps never open Super HQ. Customer app only sees this kitchen’s menu & orders.");
if (release) {
  console.log("Play Store: upload the .aab files in Google Play Console (not the .apk).");
}
