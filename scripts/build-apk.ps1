# Build a signed release APK locally: .\scripts\build-apk.ps1 -Version 0.1.1 -Code 2
# Toolchain (JDK 21 + Android SDK) and the signing key live in C:\Work\android-toolchain, outside the repo.
param(
  [string]$Version = "0.1.0",
  [int]$Code = 1,
  [string]$Toolchain = "C:\Work\android-toolchain"
)
$ErrorActionPreference = "Continue"   # native tools write progress to stderr; exit codes are checked instead
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$env:JAVA_HOME = (Get-ChildItem "$Toolchain" -Directory -Filter "jdk-21*" | Select-Object -First 1).FullName
$env:ANDROID_HOME = "$Toolchain\sdk"
$env:JAVA_TOOL_OPTIONS = "-Djava.net.preferIPv4Stack=true"   # Gradle downloads time out over IPv6 on this network
$env:VITE_PLATFORM = "android"
$env:VITE_BASE_PATH = "/"

npm run build
if ($LASTEXITCODE -ne 0) { throw "web build failed" }
if (Test-Path "dist\sw.js") { throw "service worker must not ship in the APK" }
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw "cap sync failed" }
Set-Content -Path "android\local.properties" -Value ("sdk.dir=" + ("$Toolchain\sdk" -replace '\\', '\\' -replace ':', '\:')) -Encoding ascii

$pass = (Get-Content "$Toolchain\keys\nocturne-release.pass" -Raw).Trim()
$env:ANDROID_KEYSTORE_FILE = "$Toolchain\keys\nocturne-release.p12"
$env:ANDROID_KEYSTORE_PASSWORD = $pass
$env:ANDROID_KEY_PASSWORD = $pass
$env:ANDROID_KEY_ALIAS = "release"

Push-Location android
.\gradlew.bat --no-daemon ":app:assembleRelease" "-PversionCode=$Code" "-PversionName=$Version"
$ok = $LASTEXITCODE
Pop-Location
if ($ok -ne 0) { throw "gradle build failed" }

New-Item -ItemType Directory -Force release | Out-Null
$apk = "release\nocturne-$Version.apk"
Copy-Item "android\app\build\outputs\apk\release\app-release.apk" $apk -Force
$hash = (Get-FileHash $apk -Algorithm SHA256).Hash.ToLower()
"$hash  nocturne-$Version.apk" | Set-Content "release\SHA256SUMS.txt" -Encoding ascii
Write-Output "Built $apk ($([math]::Round((Get-Item $apk).Length / 1MB, 2)) MB)"

