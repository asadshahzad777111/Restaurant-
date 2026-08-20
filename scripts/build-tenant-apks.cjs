#!/usr/bin/env node
/**
 * Build per-restaurant Staff + Customer Capacitor configs (and APKs when Android SDK exists).
 *
 * Usage:
 *   node scripts/build-tenant-apks.mjs --code=LAHORE1 --name="Lahore Grill"
 *   node scripts/build-tenant-apks.mjs --code=DEMO --name="Demo Kitchen" --skip-gradle
 *
 * Output (with SDK):
 *   .data/apks/tenants/<safeCode>/ORDO-<CODE>-Staff.apk
 *   .data/apks/tenants/<safeCode>/ORDO-<CODE>-Customer.apk
 *
 * Without SDK: writes capacitor.tenant.json + restores note for Super → Apps upload from a build machine.
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
const host = (arg("host", "https://ordo.asfins.com") || "https://ordo.asfins.com").replace(/\/$/, "");

if (!codeRaw) {
  console.error("Required: --code=RESTAURANTCODE [--name=\"Display Name\"]");
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
  },
  {
    folder: "mobile/ordo-guest",
    slot: "customer",
    appId: `com.ordo.customer.${safeId || "kitchen"}`,
    appName: `${displayName} Order`,
    url: `${host}/guest?app=customer&tenant=${encodeURIComponent(code)}`,
    filename: `ORDO-${code}-Customer.apk`,
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

ensureJava17();

for (const shell of shells) {
  writeConfig(shell);
  const dir = path.join(root, shell.folder);
  if (skipGradle || !hasSdk()) {
    console.log(`Skip gradle for ${shell.slot} (no ANDROID_HOME or --skip-gradle).`);
    continue;
  }
  try {
    if (!fs.existsSync(path.join(dir, "node_modules"))) {
      run("npm", ["install"], dir);
    }
    if (!fs.existsSync(path.join(dir, "android"))) {
      run("npx", ["cap", "add", "android"], dir);
    }
    run("npx", ["cap", "sync", "android"], dir);
    const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
    run(gradlew, ["assembleDebug", "--no-daemon"], path.join(dir, "android"));
    const apk = path.join(dir, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
    if (!fs.existsSync(apk)) throw new Error(`Missing ${apk}`);
    const dest = path.join(outRoot, shell.filename);
    fs.copyFileSync(apk, dest);
    // Also copy as slot.apk for Super tenant folder layout
    fs.copyFileSync(apk, path.join(outRoot, `${shell.slot}.apk`));
    console.log(`Wrote ${dest}`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    console.error("Upload a manually built APK via Super → Apps for this restaurant.");
  }
}

const manifest = {
  code,
  name: displayName,
  host,
  builtAt: new Date().toISOString(),
  apps: shells.map((s) => ({
    slot: s.slot,
    appName: s.appName,
    appId: s.appId,
    url: s.url,
    filename: s.filename,
  })),
  note: "Super → Apps → select restaurant → Upload Staff/Customer APK. Deep link locks guests/staff to this code only.",
};
fs.writeFileSync(path.join(outRoot, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`\nManifest: ${path.join(outRoot, "manifest.json")}`);
console.log("Per-restaurant APKs never open Super HQ. Customer APK only sees this kitchen’s menu & orders.");
