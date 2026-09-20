#!/usr/bin/env bash
# Builds a universal (Apple silicon + Intel) release binary and wraps it in GoatBar.app,
# then zips it to GoatBar-mac.zip. Run from anywhere: `bash mac/build-app.sh`.
set -euo pipefail
cd "$(dirname "$0")"

swift build -c release --arch arm64 --arch x86_64
BIN="$(swift build -c release --arch arm64 --arch x86_64 --show-bin-path)/GoatBar"
test -x "$BIN" || { echo "error: no binary at $BIN" >&2; exit 1; }

rm -rf build
APP=build/GoatBar.app
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN" "$APP/Contents/MacOS/GoatBar"
cp Info.plist "$APP/Contents/Info.plist"
plutil -lint "$APP/Contents/Info.plist"

# Ad-hoc signature (no certificate, no notarization): seals the bundle so macOS
# doesn't report it as damaged. Gatekeeper still asks on first open.
codesign --force --deep --sign - "$APP"

ditto -c -k --keepParent "$APP" build/GoatBar-mac.zip
echo "Built $APP and build/GoatBar-mac.zip"
