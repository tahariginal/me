#!/usr/bin/env bash
# ios-setup.sh — iOS / macOS (WhiteSur) look for the 1337 GNOME session. No sudo needed.
#
#   ./ios-setup.sh            full install + dark mode (default)
#   ./ios-setup.sh --light    full install + light mode
#   ./ios-setup.sh dark       only switch to dark  (theme already installed)
#   ./ios-setup.sh light      only switch to light (theme already installed)
#   ./ios-setup.sh restore    undo everything using the dconf backup
#
# Safe to run again: it skips what is already installed.

set -uo pipefail

MODE="dark"
ACTION="install"
case "${1:-}" in
  --light) MODE="light" ;;
  --dark|"") MODE="dark" ;;
  dark|light) ACTION="switch"; MODE="$1" ;;
  restore) ACTION="restore" ;;
  -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
  *) echo "Unknown option: $1 (use --help)"; exit 1 ;;
esac

THEMES="$HOME/.themes"
ICONS="$HOME/.local/share/icons"
CURSORS="$HOME/.icons"
FONTS="$HOME/.local/share/fonts/Inter"
WALL="$HOME/Pictures/Wallpapers"
EXT="$HOME/.local/share/gnome-shell/extensions"
BACKUP="$HOME/.config/ios-theme-backup/dconf-before-ios.ini"
SHELL_VER="$(gnome-shell --version 2>/dev/null | grep -oE '[0-9]+' | head -1)"
SHELL_VER="${SHELL_VER:-42}"

say()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*"; }

# ---------------------------------------------------------------- helpers
add_extension_to_enabled() {   # $1 = uuid
  local cur
  cur="$(gsettings get org.gnome.shell enabled-extensions)"
  python3 -I - "$cur" "$1" <<'PY' | xargs -0 -I{} gsettings set org.gnome.shell enabled-extensions "{}"
import ast, sys
lst = ast.literal_eval(sys.argv[1].replace('@as ', ''))
if sys.argv[2] not in lst:
    lst.append(sys.argv[2])
print(lst, end='')
PY
}

remove_extension_from_enabled() {   # $1 = uuid
  local cur
  cur="$(gsettings get org.gnome.shell enabled-extensions)"
  python3 -I - "$cur" "$1" <<'PY' | xargs -0 -I{} gsettings set org.gnome.shell enabled-extensions "{}"
import ast, sys
lst = [x for x in ast.literal_eval(sys.argv[1].replace('@as ', '')) if x != sys.argv[2]]
print(lst, end='')
PY
}

install_extension() {   # $1 = uuid
  local uuid="$1" url zip
  if [ -d "$EXT/$uuid" ]; then
    say "Extension $uuid already installed"
  else
    say "Installing extension $uuid (GNOME $SHELL_VER)"
    url="$(curl -fsSL "https://extensions.gnome.org/extension-info/?uuid=$uuid&shell_version=$SHELL_VER" \
          | python3 -I -c 'import sys,json; print(json.load(sys.stdin)["download_url"])' 2>/dev/null)"
    if [ -z "$url" ]; then warn "No version of $uuid for GNOME $SHELL_VER, skipping"; return; fi
    zip="$TMP/$uuid.zip"
    curl -fsSL -o "$zip" "https://extensions.gnome.org$url" && gnome-extensions install --force "$zip"
  fi
  add_extension_to_enabled "$uuid"
}

ext_set() {   # $1 = uuid  $2 = schema  $3 = key  $4 = value
  local dir="$EXT/$1/schemas"
  [ -d "$dir" ] && gsettings --schemadir "$dir" set "$2" "$3" "$4" 2>/dev/null \
    || warn "could not set $2 $3"
}

apply_shell_css_tweaks() {
  local t css
  for t in Dark Light; do
    css="$THEMES/WhiteSur-$t/gnome-shell/gnome-shell.css"
    [ -f "$css" ] || continue
    [ -f "$css.orig" ] || cp "$css" "$css.orig"
    cp "$css.orig" "$css"            # start clean every time, then append tweaks
    cat >> "$css" <<'EOF'

/* ===== iOS dock tweaks ===== */
#dashtodockContainer.bottom.shrink.shrink #dash .dash-background,
#dashtodockContainer.bottom.bottom #dash .dash-background {
  border-radius: 30px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.30);
  margin-bottom: 14px;
  padding: 6px;
}
#dashtodockContainer.bottom.shrink.shrink #dash #dashtodockDashContainer { padding: 8px; }
#dashtodockContainer.bottom.shrink.shrink #dash .dash-item-container .app-well-app,
#dashtodockContainer.bottom.shrink.shrink #dash .dash-item-container .show-apps { padding: 4px 6px 6px 6px; }
#dashtodockContainer #dash .app-well-app .overview-icon,
#dashtodockContainer #dash .show-apps .overview-icon { border-radius: 16px; }
EOF
    if [ "$t" = "Light" ]; then
      cat >> "$css" <<'EOF'

/* ===== iOS: white app labels in overview/app grid ===== */
#overviewGroup .overview-icon .overview-label,
.icon-grid .overview-icon .overview-label,
.app-folder-dialog .overview-icon .overview-label,
.workspace-thumbnails .overview-label,
.window-caption {
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}
.search-section-content .overview-label { color: #1d1d1f; text-shadow: none; }
EOF
    fi
  done
}

switch_mode() {   # $1 = dark | light
  local T I S
  if [ "$1" = "light" ]; then T="WhiteSur-Light"; I="WhiteSur-light"; S="prefer-light"
  else                        T="WhiteSur-Dark";  I="WhiteSur-dark";  S="prefer-dark"; fi
  say "Switching to $1 mode"
  gsettings set org.gnome.desktop.interface gtk-theme "$T"
  gsettings set org.gnome.desktop.wm.preferences theme "$T"
  gsettings set org.gnome.desktop.interface color-scheme "$S"
  [ -d "$ICONS/$I" ] && gsettings set org.gnome.desktop.interface icon-theme "$I"
  # flip the shell theme twice so GNOME reloads the CSS
  gsettings set org.gnome.shell.extensions.user-theme name "Adwaita" 2>/dev/null
  sleep 1
  gsettings set org.gnome.shell.extensions.user-theme name "$T"
}

chrome_dark() {   # only possible while Chrome is closed (it overwrites its prefs)
  local prefs
  prefs="$(readlink -f "$HOME/.config/google-chrome" 2>/dev/null)/Default/Preferences"
  [ -f "$prefs" ] || return
  if pgrep -f '/opt/google/chrome/chrome' >/dev/null; then
    warn "Chrome is open: skipped Chrome settings. Close it (Ctrl+Shift+Q) and run: $0 $MODE"
    return
  fi
  say "Setting Chrome to GTK theme + $MODE mode"
  cp "$prefs" "$prefs.bak-ios"
  python3 -I - "$prefs" "$MODE" <<'PY'
import json, sys
p, mode = sys.argv[1], sys.argv[2]
d = json.load(open(p))
d.setdefault('extensions', {}).setdefault('theme', {}).update({'id': '', 'system_theme': 1})   # GTK
scheme = 2 if mode == 'dark' else 1
d.setdefault('browser', {}).setdefault('theme', {}).update({'color_scheme': scheme, 'color_scheme2': scheme})
d.setdefault('session', {})['restore_on_startup'] = 1                                    # keep tabs
json.dump(d, open(p, 'w'), separators=(',', ':'))
PY
}

reload_shell() {
  if [ "${XDG_SESSION_TYPE:-}" = "x11" ] && command -v xdotool >/dev/null; then
    say "Reloading GNOME Shell (your windows stay open)"
    xdotool key --clearmodifiers alt+F2; sleep 1
    xdotool type --delay 50 r; xdotool key Return
  else
    warn "Reload the shell yourself: Alt+F2, type r, Enter (or log out/in on Wayland)"
  fi
}

# ---------------------------------------------------------------- restore
if [ "$ACTION" = "restore" ]; then
  if [ -f "$BACKUP" ]; then
    say "Restoring settings from $BACKUP"
    dconf load / < "$BACKUP"
    reload_shell
    say "Done. Theme files are still in ~/.themes, ~/.local/share/icons (delete them by hand if you want the space back)."
  else
    warn "No backup found at $BACKUP"
  fi
  exit 0
fi

# ---------------------------------------------------------------- switch only
if [ "$ACTION" = "switch" ]; then
  switch_mode "$MODE"
  chrome_dark
  exit 0
fi

# ---------------------------------------------------------------- full install
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

free_mb=$(df -Pm "$HOME" | awk 'NR==2{print $4}')
say "Free space in home: ${free_mb} MB"
[ "$free_mb" -lt 200 ] && { warn "Need about 200 MB free in home. Free some space first."; exit 1; }

# 1. backup (only the first time, so restore always goes back to the original look)
if [ ! -f "$BACKUP" ]; then
  mkdir -p "$(dirname "$BACKUP")"
  dconf dump / > "$BACKUP"
  say "Saved current settings to $BACKUP"
fi

# 2. GTK + shell theme (prebuilt archives, no sassc needed)
mkdir -p "$THEMES"
if [ ! -d "$THEMES/WhiteSur-Dark" ] || [ ! -d "$THEMES/WhiteSur-Light" ]; then
  say "Downloading WhiteSur GTK theme"
  git clone -q --depth 1 https://github.com/vinceliuice/WhiteSur-gtk-theme.git "$TMP/gtk"
  tar -xJf "$TMP/gtk/release/WhiteSur-Light.tar.xz" -C "$THEMES"
  tar -xJf "$TMP/gtk/release/WhiteSur-Dark.tar.xz"  -C "$THEMES"
else
  say "WhiteSur GTK theme already installed"
fi
apply_shell_css_tweaks

# 3. icons
if [ ! -d "$ICONS/WhiteSur-dark" ]; then
  say "Installing WhiteSur icons (~100 MB)"
  git clone -q --depth 1 https://github.com/vinceliuice/WhiteSur-icon-theme.git "$TMP/icons"
  (cd "$TMP/icons" && ./install.sh -t default)
else
  say "WhiteSur icons already installed"
fi

# 4. cursors
if [ ! -d "$CURSORS/WhiteSur-cursors" ]; then
  say "Installing WhiteSur cursors"
  git clone -q --depth 1 https://github.com/vinceliuice/WhiteSur-cursors.git "$TMP/cursors"
  mkdir -p "$CURSORS" && cp -r "$TMP/cursors/dist" "$CURSORS/WhiteSur-cursors"
fi
gsettings set org.gnome.desktop.interface cursor-theme 'WhiteSur-cursors'

# 5. wallpapers (Sonoma: light for light mode, dark for dark mode)
mkdir -p "$WALL"
for v in light dark; do
  [ -f "$WALL/Sonoma-$v.jpg" ] || curl -fsSL -o "$WALL/Sonoma-$v.jpg" \
    "https://raw.githubusercontent.com/vinceliuice/WhiteSur-wallpapers/main/4k/Sonoma-$v.jpg"
done
gsettings set org.gnome.desktop.background picture-uri      "file://$WALL/Sonoma-light.jpg"
gsettings set org.gnome.desktop.background picture-uri-dark "file://$WALL/Sonoma-dark.jpg"
gsettings set org.gnome.desktop.background picture-options 'zoom'

# 6. font (Inter, close to Apple's SF Pro)
if [ ! -f "$FONTS/InterVariable.ttf" ]; then
  say "Installing Inter font"
  mkdir -p "$FONTS"
  curl -fsSL -o "$TMP/inter.zip" https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip
  unzip -oj -q "$TMP/inter.zip" InterVariable.ttf InterVariable-Italic.ttf -d "$FONTS"
  fc-cache -f "$HOME/.local/share/fonts" >/dev/null
fi
gsettings set org.gnome.desktop.interface font-name 'Inter 11'
gsettings set org.gnome.desktop.interface document-font-name 'Inter 11'
gsettings set org.gnome.desktop.wm.preferences titlebar-font 'Inter Bold 11'

# 7. windows: traffic-light buttons on the left, 4 fixed workspaces
gsettings set org.gnome.desktop.wm.preferences button-layout 'close,minimize,maximize:'
gsettings set org.gnome.mutter dynamic-workspaces false
gsettings set org.gnome.desktop.wm.preferences num-workspaces 4
gsettings set org.gnome.desktop.interface enable-animations true
gsettings set org.gnome.desktop.interface enable-hot-corners false

# 8. clock like iPhone: time only
gsettings set org.gnome.desktop.interface clock-format '24h'
gsettings set org.gnome.desktop.interface clock-show-date false
gsettings set org.gnome.desktop.interface clock-show-weekday false

# 9. dock: bottom, centered, frosted white glass
D=org.gnome.shell.extensions.dash-to-dock
gsettings set $D dock-position 'BOTTOM'
gsettings set $D extend-height false
gsettings set $D dock-fixed false
gsettings set $D autohide true
gsettings set $D intellihide true
gsettings set $D dash-max-icon-size 56
gsettings set $D apply-custom-theme false
gsettings set $D custom-theme-shrink true
gsettings set $D transparency-mode 'FIXED'
gsettings set $D custom-background-color true
gsettings set $D background-color '#ffffff'
gsettings set $D background-opacity 0.18
gsettings set $D running-indicator-style 'DOTS'
gsettings set $D show-trash false
gsettings set $D show-mounts false
gsettings set $D show-apps-at-top false

# 10. extensions
gsettings set org.gnome.shell disable-user-extensions false
add_extension_to_enabled 'user-theme@gnome-shell-extensions.gcampax.github.com'
remove_extension_from_enabled 'places-menu@gnome-shell-extensions.gcampax.github.com'
install_extension 'blur-my-shell@aunetx'
install_extension 'just-perfection-desktop@just-perfection'
install_extension 'rounded-window-corners@yilozt'

B='blur-my-shell@aunetx'
ext_set $B org.gnome.shell.extensions.blur-my-shell.panel        blur true
ext_set $B org.gnome.shell.extensions.blur-my-shell.overview     blur true
ext_set $B org.gnome.shell.extensions.blur-my-shell.appfolder    blur true
ext_set $B org.gnome.shell.extensions.blur-my-shell.dash-to-dock blur false   # draws a square box behind the round dock

J='just-perfection-desktop@just-perfection'
JS=org.gnome.shell.extensions.just-perfection
ext_set $J $JS activities-button false
ext_set $J $JS app-menu false
ext_set $J $JS clock-menu-position 2          # clock on the left, like iPhone
ext_set $J $JS panel-size 36
ext_set $J $JS panel-icon-size 18
ext_set $J $JS panel-indicator-padding-size 8
ext_set $J $JS workspace-popup false
ext_set $J $JS ripple-box false
ext_set $J $JS startup-status 0
ext_set $J $JS notification-banner-position 1 # banners top-center
ext_set $J $JS theme false

# 11. dark / light + Chrome
switch_mode "$MODE"
chrome_dark

# 12. reload
reload_shell

cat <<EOF

Done! Your session now looks like iOS ($MODE mode).

  Switch mode later:  $0 dark   |   $0 light
  Undo everything:    $0 restore

  Tip: don't change Style/Accent in Settings > Appearance — Ubuntu
  puts Yaru back. Use "$0 dark" or "$0 light" instead.
EOF
