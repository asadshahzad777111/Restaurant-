# Build debug APKs and copy them to .data/apks for Super → Apps.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not $PSScriptRoot) { $Root = (Get-Location).Path }

$sdk = $env:ANDROID_HOME
if (-not $sdk) { $sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk" }
$jbr = "C:\Program Files\Android\Android Studio\jbr"
if (-not (Test-Path (Join-Path $sdk "platforms"))) {
  Write-Host "Android SDK not found. Install Android Studio / SDK, then re-run."
  exit 2
}
if (-not (Test-Path (Join-Path $jbr "bin\java.exe"))) {
  Write-Host "JDK (Android Studio JBR) not found at $jbr"
  exit 2
}

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:JAVA_HOME = $jbr
$gradleHome = Join-Path $Root ".gradle-home"
$tmpBuild = Join-Path $Root ".tmp-build"
New-Item -ItemType Directory -Force -Path $gradleHome, $tmpBuild | Out-Null
$env:GRADLE_USER_HOME = $gradleHome
$env:TEMP = $tmpBuild
$env:TMP = $tmpBuild
$env:Path = "$jbr\bin;$sdk\platform-tools;$env:Path"

$outDir = Join-Path $Root ".data\apks"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Build-OrdoApk([string]$folder, [string]$destName) {
  $dir = Join-Path $Root $folder
  Push-Location $dir
  try {
    if (-not (Test-Path "node_modules")) { npm install }
    if (-not (Test-Path "android")) { npx cap add android }
    npx cap sync android
    Set-Content -Path (Join-Path $dir "android\local.properties") -Value ("sdk.dir=" + ($sdk -replace '\\','/'))
    Push-Location (Join-Path $dir "android")
    try {
      .\gradlew.bat assembleDebug --no-daemon
    } finally {
      Pop-Location
    }
    $apk = Join-Path $dir "android\app\build\outputs\apk\debug\app-debug.apk"
    if (-not (Test-Path $apk)) { throw "Missing $apk" }
    Copy-Item $apk (Join-Path $outDir $destName) -Force
    Write-Host "Wrote $destName"
  } finally {
    Pop-Location
  }
}

Build-OrdoApk "mobile\ordo-pos" "ORDO-Staff.apk"
Build-OrdoApk "mobile\ordo-guest" "ORDO-Customer.apk"
Write-Host "Super → Apps can now Download from .data\apks"
