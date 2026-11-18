#!/usr/bin/env bash
# ios-setup.sh — iOS / macOS (WhiteSur) look for the 1337 GNOME session. No sudo needed.
#
#   ./ios-setup.sh            full install + dark mode (default)
#   ./ios-setup.sh --light    full install + light mode
#   ./ios-setup.sh dark       only switch to dark  (theme already installed)
#   ./ios-setup.sh light      only switch to light (theme already installed)
#   ./ios-setup.sh wallpapers only (re)make the wallpaper slideshow (new 4K picture every 5 min)
#   ./ios-setup.sh restore    undo everything using the backups
#
# Safe to run again: it skips what is already installed.
# New GNOME extensions load live: GNOME opens a window for each one, click "Install".

set -uo pipefail

MODE="dark"
ACTION="install"
case "${1:-}" in
  --light) MODE="light" ;;
  --dark|"") MODE="dark" ;;
  dark|light) ACTION="switch"; MODE="$1" ;;
  restore) ACTION="restore" ;;
  wallpapers) ACTION="wallpapers" ;;
  -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
  *) echo "Unknown option: $1 (use --help)"; exit 1 ;;
esac

THEMES="$HOME/.themes"
ICONS="$HOME/.local/share/icons"
CURSORS="$HOME/.icons"
FONTS="$HOME/.local/share/fonts/Inter"
WALL="$HOME/Pictures/Wallpapers"
EXT="$HOME/.local/share/gnome-shell/extensions"
SYS_EXT="/usr/share/gnome-shell/extensions"
GTK4="$HOME/.config/gtk-4.0"
BACKUP="$HOME/.config/ios-theme-backup/dconf-before-ios.ini"
SHELL_VER="$(gnome-shell --version 2>/dev/null | grep -oE '[0-9]+' | head -1)"
SHELL_VER="${SHELL_VER:-42}"
# 1337's 4K screens run at 1x with text scaled ~1.7x: pixel sizes must follow the text or look tiny
TEXT_SCALE="$(gsettings get org.gnome.desktop.interface text-scaling-factor 2>/dev/null)"

UT='user-theme@gnome-shell-extensions.gcampax.github.com'
SL='search-light@icedman.github.com'
SLS=org.gnome.shell.extensions.search-light
if [ "$SHELL_VER" -ge 45 ]; then
  RC='rounded-window-corners@fxgn'        # "Reborn" fork, GNOME 45+
  RCS=org.gnome.shell.extensions.rounded-window-corners-reborn
  OLD_RC='rounded-window-corners@yilozt'  # original, GNOME 40-44 only
else
  RC='rounded-window-corners@yilozt'
  RCS=org.gnome.shell.extensions.rounded-window-corners
  OLD_RC=''
fi

# Wallpaper slideshow: Apple macOS wallpapers (5K-6K originals), resized to 4K on install.
# Dark mode uses the dark list, light mode the light list. A new picture every 5 minutes.
LDW="https://raw.githubusercontent.com/saint-13/Linux_Dynamic_Wallpapers/main/Dynamic_Wallpapers"
WSW="https://raw.githubusercontent.com/vinceliuice/WhiteSur-wallpapers/main/4k"
DARK_WALLS=(
  "$LDW/BigSurV2/BigSurV2_01.jpg"
  "$LDW/BigSur/Big%20macOS%20Sur-5.jpg"
  "$LDW/BigSur/Big%20macOS%20Sur-7.jpg"
  "$LDW/BigSur/Big%20macOS%20Sur-8.jpg"
  "$LDW/Catalina/Catalina-1.jpg"
  "$LDW/Catalina/Catalina-2.jpg"
  "$LDW/Catalina/Catalina-8.jpg"
  "$LDW/Minimal%20Mojave/Minimal%20Mojave-2.jpg"
  "$LDW/MojaveV2/MojaveV2-2.jpg"
  "$LDW/Mojave/mojave_dynamic_12.jpeg"
  "$LDW/Mojave/mojave_dynamic_14.jpeg"
  "$LDW/Mojave/mojave_dynamic_16.jpeg"
  "$LDW/Monterey/Monterey05.jpg"
  "$LDW/Monterey/Monterey06.jpg"
  "$LDW/Monterey/Monterey08.jpg"
  "$WSW/Ventura-dark.jpg"
)
LIGHT_WALLS=(
  "$LDW/BigSur/Big%20macOS%20Sur-1.jpg"
  "$LDW/BigSur/Big%20macOS%20Sur-3.jpg"
  "$LDW/BigSurV2/BigSurV2_02.jpg"
  "$LDW/Catalina/Catalina-5.jpg"
  "$LDW/Catalina/Catalina-7.jpg"
  "$LDW/Minimal%20Mojave/Minimal%20Mojave-1.jpg"
  "$LDW/Mojave/mojave_dynamic_5.jpeg"
  "$LDW/MojaveV2/MojaveV2-1.jpg"
  "$LDW/Monterey/Monterey01.jpg"
  "$LDW/Monterey/Monterey03.jpg"
  "$WSW/Sonoma-light.jpg"
  "$WSW/Ventura-light.jpg"
)

NEED_RELOAD=0   # set to 1 when an extension was installed without live loading
FAILED=()

say()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*"; }
fail() { warn "$*"; FAILED+=("$*"); }
px()   { awk -v v="$1" -v s="${TEXT_SCALE:-1}" 'BEGIN { if (s < 1) s = 1; if (s > 2) s = 2; printf "%d", v * s + 0.5 }'; }

# ---------------------------------------------------------------- extensions
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

ext_state() {   # $1 = uuid -> ACTIVE, INACTIVE, ERROR, ... (empty when GNOME has not loaded it)
  gnome-extensions info "$1" 2>/dev/null | sed -n 's/^ *State: *//p'
}

ext_gsettings() {   # $1 = uuid, rest = gsettings arguments; uses the extension's own schemas
  local uuid="$1" dir="$EXT/$1/schemas"
  shift
  if [ -d "$dir" ]; then
    [ -f "$dir/gschemas.compiled" ] || glib-compile-schemas "$dir" 2>/dev/null
    gsettings --schemadir "$dir" "$@"
  else
    gsettings "$@"   # extension installed system-wide
  fi
}

ext_set() {   # $1 = uuid  $2 = schema  $3 = key  $4 = value
  [ -d "$EXT/$1" ] || [ -d "$SYS_EXT/$1" ] || return 0   # not installed (skipped earlier)
  ext_gsettings "$1" set "$2" "$3" "$4" 2>/dev/null || warn "could not set $2 $3"
}

install_extension() {   # $1 = uuid
  local uuid="$1" info url res zip
  case "$(ext_state "$uuid")" in
    ACTIVE|INACTIVE|INITIALIZED|ENABLED|DISABLED)
      say "Extension $uuid already installed"
      gnome-extensions enable "$uuid" 2>/dev/null || add_extension_to_enabled "$uuid"
      return ;;
  esac

  # extensions.gnome.org can answer with an old version that does not run on this GNOME,
  # so check the list of supported versions ourselves
  info="$(curl -fsSL "https://extensions.gnome.org/extension-info/?uuid=$uuid&shell_version=$SHELL_VER")" \
    || { fail "could not reach extensions.gnome.org for $uuid"; return; }
  url="$(printf '%s' "$info" | python3 -I -c 'import sys, json
d = json.load(sys.stdin)
print(d["download_url"] if sys.argv[1] in d.get("shell_version_map", {}) else "")' "$SHELL_VER" 2>/dev/null)"
  if [ -z "$url" ]; then fail "$uuid has no version for GNOME $SHELL_VER, skipped"; return; fi

  # best way: GNOME downloads it and loads it right away (no shell restart, works on Wayland too)
  if [ "$(gsettings get org.gnome.shell allow-extension-installation 2>/dev/null)" != "false" ]; then
    say "Installing $uuid: GNOME opens a window, click \"Install\""
    res="$(gdbus call --session --timeout 300 --dest org.gnome.Shell.Extensions \
          --object-path /org/gnome/Shell/Extensions \
          --method org.gnome.Shell.Extensions.InstallRemoteExtension "$uuid" 2>/dev/null)"
    case "$res" in
      *successful*) say "Extension $uuid installed and turned on"; return ;;
      *cancelled*)  warn "You said no to $uuid, skipped"; return ;;
    esac
  fi

  # fallback: install the zip ourselves; GNOME only loads it after a shell restart
  zip="$TMP/$uuid.zip"
  if curl -fsSL -o "$zip" "https://extensions.gnome.org$url" && gnome-extensions install --force "$zip"; then
    add_extension_to_enabled "$uuid"
    NEED_RELOAD=1
    say "Extension $uuid installed (loads after a shell restart)"
  else
    fail "could not install $uuid"
  fi
}

# Search Light bug: press the shortcut twice fast and it crashes; after that the box opens
# invisible until GNOME restarts. Add a one-line guard to its code (again after each update).
patch_search_light() {
  local f="$EXT/$SL/extension.js"
  [ -f "$f" ] || return 0
  python3 -I - "$f" <<'PY' || warn "could not patch Search Light: a fast double press can still break it"
import sys
p = sys.argv[1]
s = open(p).read()
MARK = '// ios-setup fix'
if MARK in s:
    sys.exit(0)
old = "      this._animSeq = null;\n      this._layout();\n"
new = ("      this._animSeq = null;\n"
       "      if (!this._entry) return; " + MARK + ": closed before it finished opening\n"
       "      this._layout();\n")
if s.count(old) != 1:
    sys.exit(1)
with open(p, 'w') as fh:
    fh.write(s.replace(old, new))
PY
}

# Weather O'Clock shows the weather from the GNOME Weather app (the city you pick there)
weather_app_installed() {
  local d
  for d in ${XDG_DATA_DIRS:-/usr/local/share:/usr/share} "$HOME/.local/share" \
           "$HOME/.local/share/flatpak/exports/share"; do
    [ -f "$d/applications/org.gnome.Weather.desktop" ] && return 0
  done
  return 1
}

install_weather_app() {
  if weather_app_installed; then say "GNOME Weather already installed"; return; fi
  if ! command -v flatpak >/dev/null; then
    fail "GNOME Weather is missing and flatpak is not installed: Weather O'Clock stays empty"; return
  fi
  flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo \
    || { fail "could not add Flathub: Weather O'Clock stays empty"; return; }
  say "Installing GNOME Weather from Flathub (about 430 MB the first time)"
  flatpak install --user -y --noninteractive flathub org.gnome.Weather \
    || fail "GNOME Weather install failed: Weather O'Clock stays empty"
}

# ---------------------------------------------------------------- wallpapers
to_4k() {   # $1 = source image, $2 = output jpg; fill 3840x2160 and crop the middle
  python3 -I - "$1" "$2" <<'PY'
import sys, gi
gi.require_version('GdkPixbuf', '2.0')
from gi.repository import GdkPixbuf
W, H = 3840, 2160
src = GdkPixbuf.Pixbuf.new_from_file(sys.argv[1])
s = max(W / src.get_width(), H / src.get_height())
w, h = max(W, round(src.get_width() * s)), max(H, round(src.get_height() * s))
big = src.scale_simple(w, h, GdkPixbuf.InterpType.HYPER)
big.new_subpixbuf((w - W) // 2, (h - H) // 2, W, H).savev(sys.argv[2], 'jpeg', ['quality'], ['92'])
PY
}

make_wallpaper() {   # $1 = light | dark -> original iOS 18-style gradient at screen size, added to the slideshow
  local out="$WALL/ios-$1/iOS18-$1.jpg" size
  [ -s "$out" ] && return 0
  size="$(xdpyinfo 2>/dev/null | awk '/dimensions:/ { print $2; exit }')"
  size="${size:-3840x2160}"
  say "Rendering iOS 18-style $1 wallpaper (${size})"
  mkdir -p "$WALL/ios-$1"
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
ImageChops.add(img, noise, scale=1.0, offset=-128).save(out + '.part', 'JPEG', quality=95)
PY
  [ -s "$out.part" ] && mv "$out.part" "$out"
}

fetch_walls() {   # $1 = dark | light, rest = image URLs; skips pictures already there
  local dir="$WALL/ios-$1" url name
  shift
  mkdir -p "$dir"
  for url in "$@"; do
    name="${url##*/}"; name="${name//%20/-}"; name="${name%.*}.jpg"
    [ -s "$dir/$name" ] && continue
    say "Downloading wallpaper $name"
    if curl -fsSL -o "$TMP/wall-src" "$url"; then
      { to_4k "$TMP/wall-src" "$dir/$name.part" 2>/dev/null || cp "$TMP/wall-src" "$dir/$name.part"; } \
        && mv "$dir/$name.part" "$dir/$name"
    else
      fail "wallpaper $name download failed"
    fi
  done
}

make_slideshow() {   # $1 = dark | light -> writes $WALL/ios-$1.xml in a new random order, prints the count
  python3 -I - "$WALL/ios-$1" "$WALL/ios-$1.xml" <<'PY'
import sys, os, random
from xml.sax.saxutils import escape
d, out = sys.argv[1], sys.argv[2]
files = [os.path.join(d, f) for f in sorted(os.listdir(d)) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
if not files:
    sys.exit(1)
random.shuffle(files)
SHOW, FADE = 295, 5   # 4:55 still + 0:05 fade = a new picture every 5 minutes
x = ['<background>',
     '  <starttime><year>2024</year><month>1</month><day>1</day>'
     '<hour>0</hour><minute>0</minute><second>0</second></starttime>']
for i, f in enumerate(files):
    nxt = files[(i + 1) % len(files)]
    x.append(f'  <static><duration>{SHOW}.0</duration><file>{escape(f)}</file></static>')
    if len(files) > 1:
        x.append(f'  <transition type="overlay"><duration>{FADE}.0</duration>'
                 f'<from>{escape(f)}</from><to>{escape(nxt)}</to></transition>')
x.append('</background>')
with open(out, 'w') as fh:
    fh.write('\n'.join(x) + '\n')
print(len(files))
PY
}

setup_wallpapers() {
  local kind key n
  fetch_walls dark  "${DARK_WALLS[@]}"
  fetch_walls light "${LIGHT_WALLS[@]}"
  for kind in light dark; do
    make_wallpaper "$kind" || { rm -f "$WALL/ios-$kind/iOS18-$kind.jpg.part"; warn "could not render the iOS 18 $kind wallpaper (needs python3-pil)"; }
  done
  for kind in light dark; do
    if [ "$kind" = dark ]; then key=picture-uri-dark; else key=picture-uri; fi
    if n="$(make_slideshow "$kind")"; then
      gsettings set org.gnome.desktop.background "$key" "file://$WALL/ios-$kind.xml"
      say "Wallpaper slideshow ($kind mode): $n pictures, a new one every 5 minutes"
    else
      fail "no $kind wallpapers: slideshow not set"
    fi
  done
  gsettings set org.gnome.desktop.background picture-options 'zoom'
}

make_tmp() { TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT; }

# ---------------------------------------------------------------- theme files
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

# GTK4 / libadwaita apps (Files, Settings, Text Editor...) ignore the gtk-theme setting.
# They only read ~/.config/gtk-4.0/gtk.css, so unpack the theme's CSS and link it there.
LIBADW_FILES=(gtk.css gtk-dark.css assets windows-assets)
OLD_GTK4_MARK="/* managed by ios-setup.sh */"   # an older version wrote a one-line gtk.css with this mark

drop_old_gtk4_import() {
  [ -f "$GTK4/gtk.css" ] && [ ! -L "$GTK4/gtk.css" ] && grep -qF "$OLD_GTK4_MARK" "$GTK4/gtk.css" \
    && rm -f "$GTK4/gtk.css"
  return 0
}

libadwaita_extract() {
  local t src out f rel
  command -v gresource >/dev/null || { warn "gresource not found: GTK4 apps keep the default look"; return; }
  for t in Dark Light; do
    src="$THEMES/WhiteSur-$t/gtk-4.0/gtk.gresource"
    out="$THEMES/WhiteSur-$t/gtk-4.0/libadwaita"
    [ -f "$src" ] || continue
    [ -f "$out/gtk.css" ] && continue
    say "Unpacking GTK4 theme ($t)"
    gresource list "$src" | while IFS= read -r f; do
      rel="${f#/org/gnome/theme/}"
      mkdir -p "$out/$(dirname "$rel")"
      gresource extract "$src" "$f" > "$out/$rel"
    done
  done
}

libadwaita_link() {   # $1 = Dark | Light
  local src="$THEMES/WhiteSur-$1/gtk-4.0/libadwaita" n
  [ -f "$src/gtk.css" ] || return 0
  mkdir -p "$GTK4"
  drop_old_gtk4_import
  for n in "${LIBADW_FILES[@]}"; do
    [ -e "$src/$n" ] || continue
    if [ -e "$GTK4/$n" ] && [ ! -L "$GTK4/$n" ]; then   # your own file: keep a copy
      if [ -e "$GTK4/$n.bak-ios" ]; then warn "$GTK4/$n is in the way, skipped"; continue; fi
      mv "$GTK4/$n" "$GTK4/$n.bak-ios"
    fi
    ln -sfn "$src/$n" "$GTK4/$n"
  done
}

libadwaita_unlink() {
  local n
  drop_old_gtk4_import
  for n in "${LIBADW_FILES[@]}"; do
    if [ -L "$GTK4/$n" ] && [[ "$(readlink "$GTK4/$n")" == "$THEMES"/WhiteSur-* ]]; then
      rm "$GTK4/$n"
    fi
    if [ -e "$GTK4/$n.bak-ios" ] && [ ! -e "$GTK4/$n" ]; then mv "$GTK4/$n.bak-ios" "$GTK4/$n"; fi
  done
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

# ---------------------------------------------------------------- mode
switch_mode() {   # $1 = dark | light
  local V I S T
  if [ "$1" = "light" ]; then V="Light"; I="WhiteSur-light"; S="prefer-light"
  else                        V="Dark";  I="WhiteSur-dark";  S="prefer-dark"; fi
  T="WhiteSur-$V"
  if [ ! -d "$THEMES/$T" ]; then warn "$T is not installed. Run $0 first."; return 1; fi

  say "Switching to $1 mode"
  gsettings set org.gnome.desktop.interface gtk-theme "$T"
  gsettings set org.gnome.desktop.wm.preferences theme "$T"
  gsettings set org.gnome.desktop.interface color-scheme "$S"
  [ -d "$ICONS/$I" ] && gsettings set org.gnome.desktop.interface icon-theme "$I"
  libadwaita_link "$V"

  # Search Light box: a clean see-through color, like Spotlight
  if [ "$1" = "light" ]; then
    ext_set "$SL" "$SLS" background-color '(0.96, 0.96, 0.97, 0.90)'
    ext_set "$SL" "$SLS" border-color '(0.0, 0.0, 0.0, 0.12)'
    ext_set "$SL" "$SLS" text-color       '(0.11, 0.11, 0.12, 1.0)'
    ext_set "$SL" "$SLS" entry-text-color '(0.11, 0.11, 0.12, 1.0)'
  else
    ext_set "$SL" "$SLS" background-color '(0.11, 0.11, 0.12, 0.90)'
    ext_set "$SL" "$SLS" border-color '(1.0, 1.0, 1.0, 0.15)'
    ext_set "$SL" "$SLS" text-color       '(1.0, 1.0, 1.0, 1.0)'
    ext_set "$SL" "$SLS" entry-text-color '(1.0, 1.0, 1.0, 1.0)'
  fi

  # shell theme (top bar, dock, overview): set it empty, then back, so GNOME reloads the CSS
  if ext_gsettings "$UT" set org.gnome.shell.extensions.user-theme name "" 2>/dev/null; then
    sleep 1
    ext_gsettings "$UT" set org.gnome.shell.extensions.user-theme name "$T"
  else
    fail "User Themes extension is missing: top bar and dock keep the Ubuntu look (run $0 to install it)"
  fi
}

# ---------------------------------------------------------------- Chrome
chrome_prefs()   { printf '%s/Default/Preferences' "$(readlink -f "$HOME/.config/google-chrome" 2>/dev/null)"; }
chrome_running() { pgrep -f '/opt/google/chrome/chrome' >/dev/null; }

chrome_theme() {   # only possible while Chrome is closed (it overwrites its prefs)
  local prefs
  prefs="$(chrome_prefs)"
  [ -f "$prefs" ] || return 0
  if chrome_running; then
    warn "Chrome is open: skipped Chrome settings. Close it (Ctrl+Shift+Q) and run: $0 $MODE"
    return 0
  fi
  say "Setting Chrome to GTK theme + $MODE mode"
  [ -f "$prefs.bak-ios" ] || cp "$prefs" "$prefs.bak-ios"   # first time only, used by restore
  python3 -I - "$prefs" "$MODE" <<'PY'
import json, sys
p, mode = sys.argv[1], sys.argv[2]
with open(p) as f:
    d = json.load(f)
d.setdefault('extensions', {}).setdefault('theme', {}).update({'id': '', 'system_theme': 1})   # GTK
scheme = 2 if mode == 'dark' else 1
d.setdefault('browser', {}).setdefault('theme', {}).update({'color_scheme': scheme, 'color_scheme2': scheme})
d.setdefault('session', {})['restore_on_startup'] = 1                                    # keep tabs
with open(p, 'w') as f:
    json.dump(d, f, separators=(',', ':'))
PY
}

chrome_restore() {   # put back only the keys chrome_theme changed, keep everything else
  local prefs
  prefs="$(chrome_prefs)"
  [ -f "$prefs.bak-ios" ] || return 0
  if chrome_running; then
    warn "Chrome is open: Chrome settings not restored. Close it and run: $0 restore"
    return 0
  fi
  say "Restoring Chrome theme settings"
  python3 -I - "$prefs" "$prefs.bak-ios" <<'PY' && rm -f "$prefs.bak-ios"
import json, sys
with open(sys.argv[1]) as f:
    cur = json.load(f)
with open(sys.argv[2]) as f:
    old = json.load(f)
KEYS = [('extensions', 'theme', 'id'), ('extensions', 'theme', 'system_theme'),
        ('browser', 'theme', 'color_scheme'), ('browser', 'theme', 'color_scheme2'),
        ('session', 'restore_on_startup')]
for path in KEYS:
    src = old
    for k in path:
        src = src.get(k) if isinstance(src, dict) else None
        if src is None:
            break
    dst = cur
    for k in path[:-1]:
        dst = dst.setdefault(k, {})
    if src is None:
        dst.pop(path[-1], None)
    else:
        dst[path[-1]] = src
with open(sys.argv[1], 'w') as f:
    json.dump(cur, f, separators=(',', ':'))
PY
}

# ---------------------------------------------------------------- shell
reload_shell() {
  if [ "${XDG_SESSION_TYPE:-}" = "x11" ] && command -v xdotool >/dev/null; then
    say "Reloading GNOME Shell (your windows stay open)"
    xdotool key --clearmodifiers alt+F2; sleep 1
    xdotool type --delay 50 r; xdotool key Return
  elif [ "${XDG_SESSION_TYPE:-}" = "x11" ]; then
    warn "Restart GNOME Shell to load the new extensions: press Alt+F2, type r, press Enter (windows stay open)"
  else
    warn "Log out and log in again to load the new extensions"
  fi
}

# ---------------------------------------------------------------- restore
if [ "$ACTION" = "restore" ]; then
  if [ ! -f "$BACKUP" ]; then warn "No backup found at $BACKUP"; exit 1; fi
  say "Restoring settings from $BACKUP"
  # "dconf load" only writes the keys that are in the backup. Keys that were still at their
  # default value before the install are not in it, so reset those first (only in the
  # places this script changes).
  python3 -I - "$BACKUP" <(dconf dump /) <<'PY' | while IFS= read -r key; do dconf reset "$key"; done
import sys
def keys(path):
    out, sec = set(), None
    with open(path, encoding='utf-8', errors='replace') as f:
        for line in f:
            line = line.rstrip('\n')
            if line.startswith('[') and line.endswith(']'):
                sec = line[1:-1].strip('/')
            elif sec is not None and '=' in line:
                out.add('/' + (sec + '/' if sec else '') + line.split('=', 1)[0])
    return out
TOUCHED = ('/org/gnome/desktop/interface/', '/org/gnome/desktop/wm/preferences/',
           '/org/gnome/desktop/background/', '/org/gnome/mutter/dynamic-workspaces',
           '/org/gnome/mutter/center-new-windows', '/org/gnome/desktop/app-folders/',
           '/org/gnome/desktop/peripherals/touchpad/tap-to-click',
           '/org/gnome/desktop/peripherals/touchpad/natural-scroll',
           '/org/gnome/shell/keybindings/toggle-overview',
           '/org/gnome/shell/enabled-extensions', '/org/gnome/shell/disable-user-extensions',
           '/org/gnome/shell/extensions/', '/org/gnome/desktop/wm/keybindings/switch-input-source')
for k in sorted(keys(sys.argv[2]) - keys(sys.argv[1])):
    if k.startswith(TOUCHED):
        print(k)
PY
  dconf load / < "$BACKUP"
  libadwaita_unlink
  chrome_restore
  say "Done. Open apps get the old look after you close and open them again."
  say "Theme files are still in ~/.themes and ~/.local/share/icons (delete them by hand if you want the space back)."
  exit 0
fi

# ---------------------------------------------------------------- switch only
if [ "$ACTION" = "switch" ]; then
  switch_mode "$MODE" || exit 1
  chrome_theme
  exit 0
fi

# ---------------------------------------------------------------- wallpapers only
if [ "$ACTION" = "wallpapers" ]; then
  make_tmp
  setup_wallpapers
  exit 0
fi

# ---------------------------------------------------------------- full install
make_tmp

free_mb=$(df -Pm "$HOME" | awk 'NR==2{print $4}')
say "Free space in home: ${free_mb:-?} MB"
if [ -n "$free_mb" ] && [ "$free_mb" -lt 200 ]; then
  warn "Need about 200 MB free in home. Free some space first."; exit 1
fi

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
  git clone -q --depth 1 https://github.com/vinceliuice/WhiteSur-gtk-theme.git "$TMP/gtk" \
    && tar -xJf "$TMP/gtk/release/WhiteSur-Light.tar.xz" -C "$THEMES" \
    && tar -xJf "$TMP/gtk/release/WhiteSur-Dark.tar.xz"  -C "$THEMES" \
    || fail "WhiteSur GTK theme download failed"
else
  say "WhiteSur GTK theme already installed"
fi
apply_shell_css_tweaks
libadwaita_extract

# 3. icons
if [ ! -d "$ICONS/WhiteSur-dark" ]; then
  say "Installing WhiteSur icons (~100 MB)"
  git clone -q --depth 1 https://github.com/vinceliuice/WhiteSur-icon-theme.git "$TMP/icons" \
    && (cd "$TMP/icons" && ./install.sh -t default) \
    || fail "WhiteSur icons install failed"
else
  say "WhiteSur icons already installed"
fi

# 4. cursors
if [ ! -d "$CURSORS/WhiteSur-cursors" ]; then
  say "Installing WhiteSur cursors"
  git clone -q --depth 1 https://github.com/vinceliuice/WhiteSur-cursors.git "$TMP/cursors" \
    && mkdir -p "$CURSORS" && cp -r "$TMP/cursors/dist" "$CURSORS/WhiteSur-cursors" \
    || fail "WhiteSur cursors install failed"
fi
[ -d "$CURSORS/WhiteSur-cursors" ] && gsettings set org.gnome.desktop.interface cursor-theme 'WhiteSur-cursors'

# 5. wallpapers: 4K Apple slideshow, a new picture every 5 minutes (dark list in dark mode)
setup_wallpapers

# 6. font (Inter, close to Apple's SF Pro)
if [ ! -f "$FONTS/InterVariable.ttf" ]; then
  say "Installing Inter font"
  mkdir -p "$FONTS"
  curl -fsSL -o "$TMP/inter.zip" https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip \
    && unzip -oj -q "$TMP/inter.zip" InterVariable.ttf InterVariable-Italic.ttf -d "$FONTS" \
    && fc-cache -f "$HOME/.local/share/fonts" >/dev/null \
    || fail "Inter font install failed"
fi
if [ -f "$FONTS/InterVariable.ttf" ]; then
  gsettings set org.gnome.desktop.interface font-name 'Inter 11'
  gsettings set org.gnome.desktop.interface document-font-name 'Inter 11'
  gsettings set org.gnome.desktop.wm.preferences titlebar-font 'Inter Bold 11'
fi

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
remove_extension_from_enabled 'places-menu@gnome-shell-extensions.gcampax.github.com'
if [ -n "$OLD_RC" ] && [ -d "$EXT/$OLD_RC" ]; then
  say "Removing $OLD_RC (it does not work on GNOME $SHELL_VER)"
  remove_extension_from_enabled "$OLD_RC"
  rm -rf "${EXT:?}/$OLD_RC"
fi
install_extension "$UT"                       # needed for the shell theme (top bar, dock)
install_extension 'blur-my-shell@aunetx'
install_extension 'just-perfection-desktop@just-perfection'
install_extension "$RC"
install_extension 'compiz-alike-magic-lamp-effect@hermes83.github.com'   # "genie" minimize, like macOS
install_extension "$SL"                                                  # Spotlight-style search
patch_search_light
install_extension 'quick-settings-tweaks@qwreey'                         # Control Center: media + notifications
install_weather_app                                                      # Weather O'Clock needs it
install_extension 'weatheroclock@CleoMenezesJr.github.io'                # weather next to the clock

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

# windows: iOS-style continuous (squircle) corners. The Reborn fork (GNOME 45+) uses camelCase keys.
if [ "$RC" = 'rounded-window-corners@fxgn' ]; then
  ext_set $RC $RCS global-rounded-corner-settings \
    "{'padding': <{'left': <uint32 1>, 'right': <uint32 1>, 'top': <uint32 1>, 'bottom': <uint32 1>}>, 'keepRoundedCorners': <{'maximized': <false>, 'fullscreen': <false>}>, 'borderRadius': <uint32 $(px 12)>, 'smoothing': <0.3>, 'borderColor': <[0.5, 0.5, 0.5, 1.0]>, 'enabled': <true>}"
else
  ext_set $RC $RCS global-rounded-corner-settings \
    "{'padding': <{'left': <uint32 1>, 'right': <uint32 1>, 'top': <uint32 1>, 'bottom': <uint32 1>}>, 'keep_rounded_corners': <{'maximized': <false>, 'fullscreen': <false>}>, 'border_radius': <uint32 $(px 12)>, 'smoothing': <0.3>}"
fi

# Search Light: Super+Space like Cmd+Space on a Mac. GNOME uses Super+Space to switch keyboard
# layout, and then Search Light cannot grab it. With one layout that key does nothing, so take it.
# With 2+ layouts keep it for the layouts and use Ctrl+Super+Space for search.
SL_KEY='<Super>space'; SL_LABEL='Super+Space'
if gsettings get org.gnome.desktop.wm.keybindings switch-input-source | grep -q '<Super>space'; then
  if [ "$(gsettings get org.gnome.desktop.input-sources sources | grep -o "('" | wc -l)" -le 1 ]; then
    say "Only one keyboard layout: Super+Space now opens search"
    gsettings set org.gnome.desktop.wm.keybindings switch-input-source "['XF86Keyboard']"
  else
    SL_KEY='<Primary><Super>space'; SL_LABEL='Ctrl+Super+Space'
  fi
fi
ext_set $SL $SLS shortcut-search "['$SL_KEY']"
ext_set $SL $SLS border-radius 4.0            # 22px round corners
ext_set $SL $SLS border-thickness 1           # thin edge like Spotlight (color comes from switch_mode)
ext_set $SL $SLS blur-background false        # its "blur" is a blocky 10%-size copy of the wallpaper
ext_set $SL $SLS show-panel-icon false
ext_set $SL $SLS scale-width      0.10
ext_set $SL $SLS scale-height     0.20
ext_set $SL $SLS entry-font-size  3           # 20pt search text
ext_set $SL $SLS font-size        1           # 16pt results
if [ ! -d "$EXT/$SL" ] && [ ! -d "$SYS_EXT/$SL" ] && [ "$SL_KEY" = '<Super>space' ]; then
  warn "Search Light unavailable: Super+Space opens the overview search instead"
  gsettings set org.gnome.shell.keybindings toggle-overview "['<Super>s', '<Super>space']"
fi

Q='quick-settings-tweaks@qwreey'
ext_set $Q org.gnome.shell.extensions.quick-settings-tweaks menu-animation-enabled true   # blur behind the menu, like Control Center

# 11. dark / light + Chrome
switch_mode "$MODE"
chrome_theme

# 12. reload (only needed when an extension could not be loaded live)
[ "$NEED_RELOAD" = 1 ] && reload_shell

echo
if [ ${#FAILED[@]} -eq 0 ]; then
  say "Done! Your session now looks like iOS 18 ($MODE mode)."
else
  warn "Finished, but some steps failed:"
  printf '      - %s\n' "${FAILED[@]}"
  echo "    Fix the problem (internet? disk space?) and run $0 again."
fi
cat <<EOF

  Open apps (Files, Settings...) get the new look after you close and open them.
  Wallpaper:              new 4K picture every 5 min ($0 wallpapers = shuffle again)
  Search like Spotlight:  $SL_LABEL
  Weather by the clock:   open the Weather app once and add your city
  Changed text size in Settings? Run this script again so sizes follow it.
  Switch mode later:  $0 dark   |   $0 light
  Undo everything:    $0 restore

  Tip: don't change Style/Accent in Settings > Appearance — Ubuntu
  puts Yaru back. Use "$0 dark" or "$0 light" instead.
EOF
