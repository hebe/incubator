#!/usr/bin/env bash
# Builds Botbar.app — a self-contained menubar app bundle.
# Requires only the Swift toolchain (Command Line Tools); full Xcode not needed.
set -euo pipefail

cd "$(dirname "$0")"
APP="build/Botbar.app"
CONFIG="${1:-release}"

echo "▸ Compiling ($CONFIG)…"
swift build -c "$CONFIG"
BIN="$(swift build -c "$CONFIG" --show-bin-path)/Botbar"

echo "▸ Assembling bundle…"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN" "$APP/Contents/MacOS/Botbar"
cp Resources/Info.plist "$APP/Contents/Info.plist"
[ -f Resources/AppIcon.icns ] && cp Resources/AppIcon.icns "$APP/Contents/Resources/"

echo "▸ Ad-hoc code-signing (stable identity for keychain access)…"
# A stable ad-hoc signature keeps the keychain from re-prompting on every rebuild.
codesign --force --deep --sign - \
  --identifier com.botbar.app \
  "$APP" 2>/dev/null || echo "  (codesign skipped — app still runs)"

echo "✓ Built $APP"
echo "  Run:      open $APP"
echo "  Install:  cp -r $APP /Applications/"
