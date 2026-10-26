#!/usr/bin/env bash
# CourseNest Linux Desktop Installer
# Installs CourseNest to ~/.local/share/coursenest, adds desktop launcher and CLI command

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="$HOME/.local/share/coursenest"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"

echo "=========================================================="
echo "  Installing CourseNest Educational Platform for Linux"
echo "=========================================================="

# 1. Ensure required directories exist
mkdir -p "$INSTALL_DIR"
mkdir -p "$BIN_DIR"
mkdir -p "$DESKTOP_DIR"
mkdir -p "$ICON_DIR"

# 2. Check if build artifacts exist; if not, build them
UNPACKED_SRC="$REPO_ROOT/apps/desktop/release/linux-unpacked"
APPIMAGE_SRC="$REPO_ROOT/apps/desktop/release/CourseNest-Setup-1.1.0.AppImage"

if [ ! -d "$UNPACKED_SRC" ]; then
  echo "[-] Building client and desktop bundle..."
  pnpm --filter @coursenest/client build
  pnpm --filter @coursenest/desktop build
  cd "$REPO_ROOT/apps/desktop" && pnpm electron-builder --dir
  cd "$REPO_ROOT"
fi

# 3. Synchronize application binary bundle to ~/.local/share/coursenest/app
echo "[+] Installing binary bundle to $INSTALL_DIR/app..."
rm -rf "$INSTALL_DIR/app"
mkdir -p "$INSTALL_DIR/app"
cp -r "$UNPACKED_SRC"/* "$INSTALL_DIR/app/"
chmod +x "$INSTALL_DIR/app/@coursenestdesktop"

# 4. Copy standalone AppImage if present
if [ -f "$APPIMAGE_SRC" ]; then
  echo "[+] Installing standalone AppImage to $INSTALL_DIR/CourseNest.AppImage..."
  cp "$APPIMAGE_SRC" "$INSTALL_DIR/CourseNest.AppImage"
  chmod +x "$INSTALL_DIR/CourseNest.AppImage"
fi

# 5. Install application icons
ICON_SRC="$REPO_ROOT/apps/desktop/build/icon.png"
if [ -f "$ICON_SRC" ]; then
  echo "[+] Installing application icon..."
  cp "$ICON_SRC" "$INSTALL_DIR/icon.png"
  cp "$ICON_SRC" "$ICON_DIR/coursenest.png"
fi

# 6. Create command-line wrapper in ~/.local/bin/coursenest
echo "[+] Creating command-line wrapper at $BIN_DIR/coursenest..."
cat << 'EOF' > "$BIN_DIR/coursenest"
#!/usr/bin/env bash
# CourseNest CLI Entry Point
APP_DIR="$HOME/.local/share/coursenest/app"
APP_EXEC="$APP_DIR/@coursenestdesktop"
APP_IMAGE="$HOME/.local/share/coursenest/CourseNest.AppImage"

if [ -x "$APP_EXEC" ]; then
  exec "$APP_EXEC" --js-flags="--max-old-space-size=2048" "$@"
elif [ -x "$APP_IMAGE" ]; then
  exec "$APP_IMAGE" --appimage-extract-and-run --js-flags="--max-old-space-size=2048" "$@"
else
  echo "Error: CourseNest desktop binary not found in $APP_DIR." >&2
  exit 1
fi
EOF
chmod +x "$BIN_DIR/coursenest"

# 7. Create XDG .desktop application launcher
echo "[+] Creating desktop launcher at $DESKTOP_DIR/coursenest.desktop..."
cat << EOF > "$DESKTOP_DIR/coursenest.desktop"
[Desktop Entry]
Name=CourseNest
Comment=Fast, Private, Offline-First Learning Platform & AI Study Studio
Exec=$BIN_DIR/coursenest %U
Icon=$ICON_DIR/coursenest.png
Terminal=false
Type=Application
Categories=Education;Development;Science;
StartupWMClass=@coursenestdesktop
MimeType=x-scheme-handler/coursenest;
Keywords=Course;Learn;Education;Video;PDF;PPTX;AI;Flashcards;
EOF

# 8. Update desktop application cache if utility exists
if command -v update-desktop-database > /dev/null 2>&1; then
  update-desktop-database "$DESKTOP_DIR" || true
fi

echo "=========================================================="
echo "  CourseNest Linux Installation Successful!"
echo "  - Command-line launcher: $BIN_DIR/coursenest"
echo "  - Desktop entry:         $DESKTOP_DIR/coursenest.desktop"
echo "  - Installation path:     $INSTALL_DIR"
echo "=========================================================="
