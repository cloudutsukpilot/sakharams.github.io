#!/bin/bash
# setup.sh — prepare the headless 3D rendering environment.
# Idempotent: safe to run multiple times; exits fast when already set up.
#
# Strategy: install npm deps with the BUNDLED prebuilt gl binary (instant).
# If the smoke test fails (different container/Node ABI), fall back to
# compiling headless-gl from source against local Node headers.
set -e

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKDIR="${1:-${CLOUDUTSUK_SCENE_DIR:-$HOME/.cache/cloudutsuk-scene-render}}"

mkdir -p "$WORKDIR"
cd "$WORKDIR"

# Always refresh the lib scripts (cheap, keeps them in module-resolution reach
# of the local node_modules)
cp "$SKILL_DIR/scripts/lib/pipeline.mjs" "$WORKDIR/pipeline.mjs"
cp "$SKILL_DIR/scripts/validate.mjs" "$WORKDIR/validate.mjs"

smoke_test() {
  xvfb-run -a node -e "
    const gl = require('gl')(8, 8);
    if (!gl) process.exit(1);
    const v = gl.getParameter(gl.VERSION);
    if (!v || !String(v).includes('WebGL')) process.exit(1);
  " 2>/dev/null
}

if [ -f "$WORKDIR/.setup_done" ] && smoke_test; then
  echo "SETUP OK (cached)"
  exit 0
fi

# --- xvfb (usually preinstalled) --------------------------------------------
if ! command -v xvfb-run >/dev/null 2>&1; then
  echo "Installing xvfb..."
  apt-get install -y -q xvfb >/dev/null 2>&1 || sudo apt-get install -y -q xvfb >/dev/null 2>&1
fi

# --- npm deps ----------------------------------------------------------------
if [ ! -f package.json ]; then
  npm init -y >/dev/null
fi
echo "Installing npm dependencies (three, pngjs, sharp)..."
npm install three@0.152.2 pngjs@7 sharp --no-audit --no-fund --loglevel=error

# --- gl: bundled binary path ---------------------------------------------------
echo "Installing gl (scripts skipped, using bundled binary)..."
npm install gl@8.1.6 --ignore-scripts --no-audit --no-fund --loglevel=error
mkdir -p node_modules/gl/build/Release
cp "$SKILL_DIR/assets/webgl-abi127-linux-x64.node" node_modules/gl/build/Release/webgl.node

if smoke_test; then
  touch "$WORKDIR/.setup_done"
  echo "SETUP OK (bundled binary)"
  exit 0
fi

# --- fallback: compile from source --------------------------------------------
echo "Bundled binary failed smoke test — compiling headless-gl from source (~2 min)..."
APT="apt-get"; command -v sudo >/dev/null 2>&1 && [ "$(id -u)" != "0" ] && APT="sudo apt-get"
$APT install -y -q libxi-dev libglu1-mesa-dev libgl-dev pkg-config libxext-dev libx11-dev >/dev/null 2>&1 || true

rm -rf node_modules/gl
# headless-gl's ANGLE build shells out to a bare `python`; many distros only ship python3
if ! command -v python >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1; then
  mkdir -p "$WORKDIR/.pyshim" && ln -sf "$(command -v python3)" "$WORKDIR/.pyshim/python"
  export PATH="$WORKDIR/.pyshim:$PATH"
fi
# Compile against headers that match the node binary that will LOAD the module.
# Prefer the running node's own prefix (nvm / custom installs ship include/node);
# fall back to /usr only if those system headers are the same version; otherwise
# let node-gyp download matching headers.
NODE_VER="$(node -p 'process.versions.node')"
NODE_PREFIX="$(dirname "$(dirname "$(node -p 'process.execPath')")")"
headers_ver() {
  awk '/define NODE_(MAJOR|MINOR|PATCH)_VERSION/{v=v (v?".":"") $3} END{print v}' "$1/include/node/node_version.h" 2>/dev/null
}
NODEDIR=""
if [ "$(headers_ver "$NODE_PREFIX")" = "$NODE_VER" ]; then
  NODEDIR="$NODE_PREFIX"
elif [ "$(headers_ver /usr)" = "$NODE_VER" ]; then
  NODEDIR="/usr"
fi
echo "Building gl for node $NODE_VER (headers: ${NODEDIR:-download})"
# a previous failed attempt may have left a wrong-ABI build in npm's cache
rm -rf node_modules/gl
if [ -n "$NODEDIR" ]; then
  npm install gl@8.1.6 --build-from-source --nodedir="$NODEDIR" --no-audit --no-fund --loglevel=error
else
  npm install gl@8.1.6 --build-from-source --no-audit --no-fund --loglevel=error
fi

if smoke_test; then
  touch "$WORKDIR/.setup_done"
  echo "SETUP OK (compiled from source)"
  exit 0
fi

echo "SETUP FAILED: could not create a working GL context." >&2
echo "Check: xvfb installed? Node headers at /usr/include/node? Network access to registry.npmjs.org?" >&2
exit 1
