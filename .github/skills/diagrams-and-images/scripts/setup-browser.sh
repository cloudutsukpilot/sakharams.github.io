#!/usr/bin/env bash
# Idempotent setup for scripts/diagram/preview.cjs and scripts/flow-anim/preview.cjs (diagrams-and-images skill): installs playwright-core into $WORK and finds a Chromium.
# Prints the Chromium path on success, or SETUP FAILED with the reason.
set -euo pipefail
WORK="${VISUALS_BROWSER_DIR:-$HOME/.cache/visuals-browser}"
mkdir -p "$WORK"
if [ ! -f "$WORK/node_modules/playwright-core/index.js" ]; then
  command -v npm >/dev/null || { echo "SETUP FAILED: npm not found"; exit 1; }
  (cd "$WORK" && [ -f package.json ] || npm init -y >/dev/null) 
  (cd "$WORK" && npm i --no-audit --no-fund playwright-core@latest >/dev/null 2>&1) || { echo "SETUP FAILED: npm i playwright-core"; exit 1; }
fi
CHROME="${CHROME:-}"
if [ -z "$CHROME" ]; then
  CHROME=$(ls -d "$HOME"/.cache/ms-playwright/chromium-*/chrome-linux*/chrome 2>/dev/null | sort -V | tail -1 || true)
fi
for c in "$CHROME" /usr/bin/chromium-browser /usr/bin/chromium /usr/bin/google-chrome; do
  if [ -n "$c" ] && [ -x "$c" ]; then echo "CHROME=$c"; echo "WORK=$WORK"; exit 0; fi
done
echo "SETUP FAILED: no Chromium found (set CHROME=/path/to/chrome, or run: cd $WORK && npx playwright-core install chromium)"
exit 1
