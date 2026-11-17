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
GTK4_DIR="$HOME/.local/share/ios-theme/gtk4"
GTK4_CSS="$HOME/.config/gtk-4.0/gtk.css"
GTK4_MARK="/* managed by ios-setup.sh */"
# 1337's 4K screens run at 1x with text scaled ~1.7x: pixel sizes must follow the text or look tiny
TEXT_SCALE="$(gsettings get org.gnome.desktop.interface text-scaling-factor 2>/dev/null)"

say()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*"; }
px()   { awk -v v="$1" -v s="${TEXT_SCALE:-1}" 'BEGIN { if (s < 1) s = 1; if (s > 2) s = 2; printf "%d", v * s + 0.5 }'; }

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

ios18_css() {   # $1 = Dark | Light  -> prints iOS 18 style overrides
  local glass border hover fg sub
  if [ "$1" = "Light" ]; then
    glass="rgba(246, 246, 248, 0.86)"; border="rgba(0, 0, 0, 0.08)"
    hover="rgba(0, 0, 0, 0.06)";       fg="#1d1d1f"; sub="rgba(60, 60, 67, 0.6)"
  else
    glass="rgba(28, 28, 30, 0.82)";    border="rgba(255, 255, 255, 0.10)"
    hover="rgba(255, 255, 255, 0.12)"; fg="#ffffff"; sub="rgba(235, 235, 245, 0.6)"
  fi
  cat <<EOF

/* ===== iOS 18 look ===== */
/* status bar: no bar, just floating text, bold clock */
#panel, #panel:overview { background-color: transparent; box-shadow: none; }
#panel .panel-corner { -panel-corner-background-color: transparent; }
#panel .panel-button { border-radius: 999px; font-weight: 600; }
#panel .panel-button:hover, #panel .panel-button:active, #panel .panel-button:checked { background-color: rgba(255, 255, 255, 0.16); }
#panel .panel-button.clock-display .clock { font-weight: 700; font-size: 1.08em; font-feature-settings: "tnum"; }
#panel .panel-status-indicators-box, #panel .panel-status-menu-box { spacing: $(px 6)px; }

/* Control Center style menus: big radius, frosted, hairline border */
.popup-menu-content, .datemenu-popover {
  background-color: $glass;
  border: 1px solid $border;
  border-radius: $(px 26)px !important;
  padding: $(px 10)px;
  box-shadow: 0 $(px 12)px $(px 40)px rgba(0, 0, 0, 0.35);
}
.popup-menu-item { border-radius: $(px 14)px !important; padding: $(px 8)px $(px 12)px; color: $fg; }
.popup-menu-item:hover, .popup-menu-item:focus { background-color: $hover; }
.popup-sub-menu { background-color: transparent; border-radius: $(px 16)px; }
.popup-separator-menu-item .popup-separator-menu-item-separator { background-color: $border; }

/* calendar: today in a red circle, like the iOS Calendar app */
.calendar .calendar-day { border-radius: 999px; }
.calendar .calendar-today, .calendar .calendar-today:selected, .calendar .calendar-today:focus {
  background-color: #ff3b30; color: #ffffff; font-weight: 700; border: none;
}
.calendar .calendar-day-heading, .calendar .calendar-month-label { font-weight: 700; }

/* notifications: rounded cards like the iOS lock screen */
.notification-banner {
  background-color: $glass;
  border: 1px solid $border;
  border-radius: $(px 22)px;
  box-shadow: 0 $(px 10)px $(px 30)px rgba(0, 0, 0, 0.30);
}
.message { border-radius: $(px 20)px; }
.message .message-title { font-weight: 600; color: $fg; }
.message .message-body { color: $sub; }

/* overview search: pill field */
.search-entry {
  border-radius: 999px;
  padding: $(px 8)px $(px 18)px;
  border: 1px solid $border;
  background-color: $hover;
}

/* volume/brightness HUD (top center, like the Dynamic Island), Alt+Tab, dialogs */
.osd-window {
  border-radius: $(px 30)px; padding: $(px 18)px $(px 26)px; margin-top: $(px 12)px;
  background-color: $glass; border: 1px solid $border;
  box-shadow: 0 $(px 10)px $(px 30)px rgba(0, 0, 0, 0.30);
}
.osd-window .level { height: $(px 8)px; border-radius: 999px; }
.switcher-list { border-radius: $(px 28)px; background-color: $glass; border: 1px solid $border; }
.switcher-list .item-box { border-radius: $(px 18)px; }
.modal-dialog { border-radius: $(px 26)px; background-color: $glass; border: 1px solid $border; }
.modal-dialog .modal-dialog-button { border-radius: $(px 14)px; font-weight: 600; }
.modal-dialog .modal-dialog-button:default { background-color: #0a84ff; color: #ffffff; }

/* overview: window titles as pills, squircle app grid like the iOS home screen */
.window-caption {
  border-radius: 999px; padding: $(px 4)px $(px 14)px;
  background-color: $glass; color: $fg; text-shadow: none;
}
.icon-grid .overview-tile, .app-folder-dialog .overview-tile { border-radius: $(px 22)px; }
.app-folder-icon { border-radius: $(px 22)px; }
.app-folder-dialog { border-radius: $(px 34)px; background-color: $glass; }
EOF
}

free_super_space() {   # take Super+Space away from the keyboard-layout switcher
  local k cur new
  for k in switch-input-source switch-input-source-backward; do
    cur="$(gsettings get org.gnome.desktop.wm.keybindings "$k")"
    new="$(python3 -I - "$cur" <<'PY'
import ast, sys
lst = ast.literal_eval(sys.argv[1].replace('@as ', ''))
print([x for x in lst if x.lower() not in ('<super>space', '<shift><super>space')])
PY
)"
    gsettings set org.gnome.desktop.wm.keybindings "$k" "$new"
  done
}

search_light_colors() {   # $1 = dark | light
  local S=search-light@icedman.github.com SS=org.gnome.shell.extensions.search-light
  [ -d "$EXT/$S" ] || return
  if [ "$1" = "light" ]; then
    ext_set $S $SS background-color '(0.96, 0.96, 0.97, 0.70)'
    ext_set $S $SS text-color       '(0.11, 0.11, 0.12, 1.0)'
    ext_set $S $SS entry-text-color '(0.11, 0.11, 0.12, 1.0)'
    ext_set $S $SS border-color     '(0.0, 0.0, 0.0, 0.08)'
    ext_set $S $SS blur-brightness  0.95
  else
    ext_set $S $SS background-color '(0.11, 0.11, 0.12, 0.55)'
    ext_set $S $SS text-color       '(1.0, 1.0, 1.0, 1.0)'
    ext_set $S $SS entry-text-color '(1.0, 1.0, 1.0, 1.0)'
    ext_set $S $SS border-color     '(1.0, 1.0, 1.0, 0.12)'
    ext_set $S $SS blur-brightness  0.6
  fi
}

apply_shell_css_tweaks() {
  local t css
  for t in Dark Light; do
    css="$THEMES/WhiteSur-$t/gnome-shell/gnome-shell.css"
    [ -f "$css" ] || continue
    [ -f "$css.orig" ] || cp "$css" "$css.orig"
    cp "$css.orig" "$css"            # start clean every time, then append tweaks
    cat >> "$css" <<EOF

/* ===== iOS dock tweaks ===== */
#dashtodockContainer.bottom.shrink.shrink #dash .dash-background,
#dashtodockContainer.bottom.bottom #dash .dash-background {
  border-radius: $(px 34)px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 $(px 10)px $(px 30)px rgba(0, 0, 0, 0.30);
  margin-bottom: $(px 14)px;
  padding: $(px 6)px;
}
#dashtodockContainer.bottom.shrink.shrink #dash #dashtodockDashContainer { padding: $(px 8)px; }
#dashtodockContainer.bottom.shrink.shrink #dash .dash-item-container .app-well-app,
#dashtodockContainer.bottom.shrink.shrink #dash .dash-item-container .show-apps { padding: $(px 4)px $(px 6)px $(px 6)px $(px 6)px; }
#dashtodockContainer #dash .app-well-app .overview-icon,
#dashtodockContainer #dash .show-apps .overview-icon { border-radius: $(px 18)px; }
EOF
    ios18_css "$t" >> "$css"
    if [ "$t" = "Light" ]; then
      cat >> "$css" <<'EOF'

/* ===== iOS: white app labels in overview/app grid ===== */
#overviewGroup .overview-icon .overview-label,
.icon-grid .overview-icon .overview-label,
.app-folder-dialog .overview-icon .overview-label,
.workspace-thumbnails .overview-label {
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}
.search-section-content .overview-label { color: #1d1d1f; text-shadow: none; }
EOF
    fi
  done
}

install_gtk4_theme() {   # WhiteSur ships GTK4 as a resource bundle; unpack it so ~/.config/gtk-4.0 can load it
  local t res f
  command -v gresource >/dev/null || { warn "gresource not found: GTK4 apps keep their stock look"; return; }
  for t in Dark Light; do
    res="$THEMES/WhiteSur-$t/gtk-4.0/gtk.gresource"
    [ -f "$res" ] || continue
    rm -rf "${GTK4_DIR:?}/$t"
    gresource list "$res" | while read -r f; do
      f="${f#/org/gnome/theme/}"
      mkdir -p "$GTK4_DIR/$t/$(dirname "$f")"
      gresource extract "$res" "/org/gnome/theme/$f" > "$GTK4_DIR/$t/$f"
    done
  done
}

link_gtk4_theme() {   # $1 = Dark | Light  (Settings, Calculator, Text Editor... pick it up on restart)
  local css="$GTK4_DIR/$1/gtk.css"
  [ -f "$css" ] || return
  if [ -f "$GTK4_CSS" ] && ! grep -qF "$GTK4_MARK" "$GTK4_CSS"; then
    warn "$GTK4_CSS has your own styles, leaving it alone"; return
  fi
  mkdir -p "$(dirname "$GTK4_CSS")"
  printf '%s\n@import url("file://%s");\n' "$GTK4_MARK" "$css" > "$GTK4_CSS"
}

make_wallpaper() {   # $1 = light | dark -> original iOS 18-style gradient, rendered at screen size
  local out="$WALL/iOS18-$1.jpg" size
  [ -f "$out" ] && return 0
  size="$(xdpyinfo 2>/dev/null | awk '/dimensions:/ { print $2; exit }')"
  size="${size:-3840x2160}"
  say "Rendering iOS 18-style $1 wallpaper (${size})"
  python3 -I - "$1" "${size%x*}" "${size#*x}" "$out" <<'PY'
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops
mode, W, H, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
w, h = 480, 270                       # paint small, blur, upscale: smooth and fast
if mode == 'light':
    base = (236, 240, 252)
    blobs = [((0.18, 0.80), 0.55, (255, 149, 0)), ((0.80, 0.22), 0.60, (90, 200, 250)),
             ((0.55, 0.62), 0.45, (255, 45, 85)), ((0.10, 0.15), 0.40, (175, 82, 222)),
             ((0.92, 0.88), 0.45, (52, 199, 89))]
else:
    base = (6, 8, 22)
    blobs = [((0.20, 0.85), 0.55, (191, 64, 0)), ((0.82, 0.20), 0.60, (10, 60, 160)),
             ((0.55, 0.65), 0.42, (160, 20, 70)), ((0.08, 0.12), 0.40, (88, 30, 140)),
             ((0.93, 0.90), 0.40, (0, 110, 70))]
img = Image.new('RGB', (w, h), base)
for (cx, cy), r, col in blobs:
    layer, mask, R = Image.new('RGB', (w, h), col), Image.new('L', (w, h), 0), r * w / 2
    ImageDraw.Draw(mask).ellipse([cx * w - R, cy * h - R, cx * w + R, cy * h + R], fill=235)
    img = Image.composite(layer, img, mask.filter(ImageFilter.GaussianBlur(w * 0.09)))
img = img.filter(ImageFilter.GaussianBlur(w * 0.06)).resize((W, H), Image.BICUBIC)
noise = Image.effect_noise((W, H), 3).convert('RGB')      # fine grain: no colour banding on 4K
ImageChops.add(img, noise, scale=1.0, offset=-128).save(out, quality=95)
PY
}

add_app_folders() {   # iOS App Library: group the app grid by category
  local base=/org/gnome/desktop/app-folders/folders id name cats cur
  while IFS='|' read -r id name cats; do
    gsettings set "org.gnome.desktop.app-folders.folder:$base/$id/" name "$name"
    gsettings set "org.gnome.desktop.app-folders.folder:$base/$id/" categories "$cats"
    gsettings set "org.gnome.desktop.app-folders.folder:$base/$id/" translate false
  done <<'EOF'
ios-dev|Developer|['Development', 'IDE']
ios-office|Productivity|['Office']
ios-create|Creativity|['Graphics']
ios-media|Entertainment|['AudioVideo', 'Audio', 'Video', 'Game']
EOF
  cur="$(gsettings get org.gnome.desktop.app-folders folder-children)"
  gsettings set org.gnome.desktop.app-folders folder-children "$(python3 -I - "$cur" <<'PY'
import ast, sys
lst = ast.literal_eval(sys.argv[1].replace('@as ', ''))
print(lst + [x for x in ('ios-dev', 'ios-office', 'ios-create', 'ios-media') if x not in lst])
PY
)"
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
  search_light_colors "$1"
  link_gtk4_theme "${T#WhiteSur-}"
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
    # the backup only holds keys that were non-default, so reset what we touched first
    for p in /org/gnome/desktop/interface/ /org/gnome/desktop/wm/preferences/ \
             /org/gnome/desktop/wm/keybindings/ /org/gnome/desktop/background/ \
             /org/gnome/mutter/ /org/gnome/shell/keybindings/ \
             /org/gnome/shell/extensions/dash-to-dock/ /org/gnome/shell/extensions/user-theme/ \
             /org/gnome/shell/extensions/search-light/ /org/gnome/shell/extensions/blur-my-shell/ \
             /org/gnome/shell/extensions/just-perfection/ /org/gnome/shell/extensions/rounded-window-corners/ \
             /org/gnome/desktop/app-folders/ /org/gnome/desktop/peripherals/touchpad/; do
      dconf reset -f "$p"
    done
    dconf load / < "$BACKUP"
    grep -qsF "$GTK4_MARK" "$GTK4_CSS" && rm -f "$GTK4_CSS"
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
install_gtk4_theme

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

# 5. wallpapers: generated iOS 18-style gradient (light/dark), Sonoma kept as an alternative/fallback
mkdir -p "$WALL"
for v in light dark; do
  [ -f "$WALL/Sonoma-$v.jpg" ] || curl -fsSL -o "$WALL/Sonoma-$v.jpg" \
    "https://raw.githubusercontent.com/vinceliuice/WhiteSur-wallpapers/main/4k/Sonoma-$v.jpg"
  make_wallpaper "$v" || warn "Could not render the $v wallpaper (needs python3-pil), using Sonoma"
done
P=Sonoma; [ -f "$WALL/iOS18-light.jpg" ] && [ -f "$WALL/iOS18-dark.jpg" ] && P=iOS18
gsettings set org.gnome.desktop.background picture-uri      "file://$WALL/$P-light.jpg"
gsettings set org.gnome.desktop.background picture-uri-dark "file://$WALL/$P-dark.jpg"
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
gsettings set org.gnome.mutter center-new-windows true                 # apps open centered, like iPad
gsettings set org.gnome.desktop.peripherals.touchpad tap-to-click true
gsettings set org.gnome.desktop.peripherals.touchpad natural-scroll true
add_app_folders

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
DOCK_ICON="$(px 42)"; [ "$DOCK_ICON" -gt 128 ] && DOCK_ICON=128   # ~72px on 4K; dock allows up to 128
gsettings set $D dash-max-icon-size "$DOCK_ICON"
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
ext_set $B org.gnome.shell.extensions.blur-my-shell.panel        blur false   # iOS status bar: text floats on the wallpaper
ext_set $B org.gnome.shell.extensions.blur-my-shell.overview     blur true
ext_set $B org.gnome.shell.extensions.blur-my-shell.appfolder    blur true
ext_set $B org.gnome.shell.extensions.blur-my-shell.dash-to-dock blur false   # draws a square box behind the round dock

J='just-perfection-desktop@just-perfection'
JS=org.gnome.shell.extensions.just-perfection
ext_set $J $JS activities-button false
ext_set $J $JS app-menu false
ext_set $J $JS clock-menu-position 2          # clock on the left, like iPhone
ext_set $J $JS panel-size "$(px 34)"
ext_set $J $JS panel-icon-size "$(px 16)"
ext_set $J $JS panel-indicator-padding-size "$(px 6)"
ext_set $J $JS keyboard-layout false          # one layout: no "en" badge in the status bar
ext_set $J $JS accessibility-menu false       # still in Settings > Accessibility
ext_set $J $JS workspace-popup false
ext_set $J $JS ripple-box false
ext_set $J $JS startup-status 0
ext_set $J $JS notification-banner-position 1 # banners top-center
ext_set $J $JS osd-position 2                 # volume/brightness HUD top-center
ext_set $J $JS animation 4                    # a bit snappier (0.8x), still fluid
ext_set $J $JS workspace-background-corner-size "$(px 28)"
ext_set $J $JS theme false

# windows: iOS-style continuous (squircle) corners
R='rounded-window-corners@yilozt'
ext_set $R org.gnome.shell.extensions.rounded-window-corners global-rounded-corner-settings \
  "{'padding': <{'left': <uint32 1>, 'right': <uint32 1>, 'top': <uint32 1>, 'bottom': <uint32 1>}>, 'keep_rounded_corners': <{'maximized': <false>, 'fullscreen': <false>}>, 'border_radius': <uint32 $(px 12)>, 'smoothing': <0.3>}"

# 10b. Spotlight: Super+Space opens a centered, blurred search (like iOS/macOS)
free_super_space
install_extension 'search-light@icedman.github.com'
SL='search-light@icedman.github.com'
SLS=org.gnome.shell.extensions.search-light
if [ -d "$EXT/$SL" ]; then
  ext_set $SL $SLS shortcut-search  "['<Super>space']"
  ext_set $SL $SLS show-panel-icon  false
  ext_set $SL $SLS blur-background  true
  ext_set $SL $SLS blur-sigma       40
  ext_set $SL $SLS border-radius    6        # index -> 28px
  ext_set $SL $SLS border-thickness 1
  ext_set $SL $SLS scale-width      0.10
  ext_set $SL $SLS scale-height     0.20
  ext_set $SL $SLS entry-font-size  3        # 20pt search text
  ext_set $SL $SLS font-size        1        # 16pt results
else
  warn "Search Light unavailable: Super+Space will open the overview search instead"
  gsettings set org.gnome.shell.keybindings toggle-overview "['<Super>s', '<Super>space']"
fi

# 11. dark / light + Chrome
switch_mode "$MODE"
chrome_dark

# 12. reload
reload_shell

cat <<EOF

Done! Your session now looks like iOS 18 ($MODE mode).

  Super+Space         Spotlight search (apps, files, settings)
  GTK4 apps (Settings, Calculator...) pick up the theme next time you open them.
  Changed text size in Settings? Run this script again so sizes follow it.

  Switch mode later:  $0 dark   |   $0 light
  Undo everything:    $0 restore

  Tip: don't change Style/Accent in Settings > Appearance — Ubuntu
  puts Yaru back. Use "$0 dark" or "$0 light" instead.
EOF
