#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
google-chrome --headless --no-sandbox --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$PWD/public/cv/taha-koulal-cv.pdf" \
  "file://$PWD/cv/taha-koulal-cv.html"
cp public/cv/taha-koulal-cv.pdf taha_titiz_cv.pdf
