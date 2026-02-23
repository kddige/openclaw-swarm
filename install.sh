#!/usr/bin/env sh
set -e

INSTALL_DIR="/Applications"
REPO="kddige/openclaw-swarm"
TMP_DIR=$(mktemp -d)

cleanup() {
    if [ -d "$TMP_DIR/mount" ]; then
        hdiutil detach "$TMP_DIR/mount" -quiet 2>/dev/null || true
    fi
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "Fetching latest release..."
DMG_URL=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" \
    | sed -n 's/.*"browser_download_url": *"\([^"]*Mac[^"]*\.dmg\)".*/\1/p' \
    | head -1)

if [ -z "$DMG_URL" ]; then
    echo "Error: Could not find macOS DMG in latest release." >&2
    exit 1
fi

DMG_NAME=$(basename "$DMG_URL")
echo "Downloading $DMG_NAME..."
curl -L --progress-bar -o "$TMP_DIR/installer.dmg" "$DMG_URL"

echo "Mounting DMG..."
mkdir -p "$TMP_DIR/mount"
hdiutil attach "$TMP_DIR/installer.dmg" -mountpoint "$TMP_DIR/mount" -nobrowse -quiet

APP_PATH=""
for app in "$TMP_DIR/mount"/*.app "$TMP_DIR/mount"/*/*.app; do
    if [ -d "$app" ]; then
        APP_PATH="$app"
        break
    fi
done

if [ -z "$APP_PATH" ]; then
    echo "Error: No .app found in DMG." >&2
    exit 1
fi

APP_NAME=$(basename "$APP_PATH")

echo "Installing $APP_NAME to $INSTALL_DIR..."
rm -rf "${INSTALL_DIR:?}/$APP_NAME"
cp -R "$APP_PATH" "$INSTALL_DIR/$APP_NAME"

echo "Removing quarantine attribute..."
xattr -cr "$INSTALL_DIR/$APP_NAME"

echo "Signing..."
codesign --force --deep --sign - "$INSTALL_DIR/$APP_NAME"

echo "Done! $APP_NAME has been installed to $INSTALL_DIR."
