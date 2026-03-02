#!/usr/bin/env bash
set -uo pipefail

# ─────────────────────────────────────────────────────────────
# ASCIIfy — Full Test Script
# Runs all checks: dependencies, TypeScript, unit tests
# ─────────────────────────────────────────────────────────────

pass=0
fail=0

run_check() {
  local label="$1"
  shift
  printf "[CHECK] %-45s" "$label"
  if "$@" > /tmp/asciify-test-output.txt 2>&1; then
    echo "PASS"
    pass=$((pass + 1))
  else
    echo "FAIL"
    head -30 /tmp/asciify-test-output.txt
    echo ""
    fail=$((fail + 1))
  fi
}

echo ""
echo "================================================="
echo "  ASCIIfy Test Suite"
echo "================================================="
echo ""

# ── Prerequisites ──────────────────────────────────────────
echo "--- Prerequisites ---"
run_check "node is installed" node --version
run_check "npm is installed" npm --version
run_check "node_modules exist" test -d node_modules

echo ""

# ── Source File Inventory ──────────────────────────────────
echo "--- Source Files (20 files) ---"
run_check "src/types.ts" test -f src/types.ts
run_check "src/constants.ts" test -f src/constants.ts
run_check "src/core/char-ramp.ts" test -f src/core/char-ramp.ts
run_check "src/core/fit-modes.ts" test -f src/core/fit-modes.ts
run_check "src/core/color-engine.ts" test -f src/core/color-engine.ts
run_check "src/core/image-to-ascii.ts" test -f src/core/image-to-ascii.ts
run_check "src/core/video-to-ascii.ts" test -f src/core/video-to-ascii.ts
run_check "src/core/grid-renderer.ts" test -f src/core/grid-renderer.ts
run_check "src/palettes/index.ts" test -f src/palettes/index.ts
run_check "src/hooks/useASCIIConverter.ts" test -f src/hooks/useASCIIConverter.ts
run_check "src/hooks/useVideoPlayback.ts" test -f src/hooks/useVideoPlayback.ts
run_check "src/hooks/useViewportAware.ts" test -f src/hooks/useViewportAware.ts
run_check "src/hooks/useResizeDebounce.ts" test -f src/hooks/useResizeDebounce.ts
run_check "src/three/auto-framer.ts" test -f src/three/auto-framer.ts
run_check "src/three/crt-overlay.ts" test -f src/three/crt-overlay.ts
run_check "src/three/glb-to-ascii.ts" test -f src/three/glb-to-ascii.ts
run_check "src/components/ASCIICanvas.tsx" test -f src/components/ASCIICanvas.tsx
run_check "src/components/ASCIIfy.tsx" test -f src/components/ASCIIfy.tsx
run_check "src/components/ASCIIfy3D.tsx" test -f src/components/ASCIIfy3D.tsx
run_check "src/index.tsx" test -f src/index.tsx

echo ""

# ── TypeScript Compilation ─────────────────────────────────
echo "--- TypeScript ---"
run_check "tsc --noEmit (zero type errors)" npx tsc --noEmit

echo ""

# ── Unit Tests ─────────────────────────────────────────────
echo "--- Unit Tests ---"
run_check "vitest run (all test suites)" npx vitest run

echo ""

# ── Build ─────────────────────────────────────────────────
echo "--- Build ---"
run_check "npm run build" npm run build
run_check "dist/index.js exists" test -f dist/index.js
run_check "dist/index.mjs exists" test -f dist/index.mjs
run_check "dist/index.d.ts exists" test -f dist/index.d.ts

echo ""

# ── Config Files ───────────────────────────────────────────
echo "--- Config Files ---"
run_check "package.json" test -f package.json
run_check "tsconfig.json" test -f tsconfig.json
run_check "framer.json" test -f framer.json
run_check ".gitignore" test -f .gitignore
run_check "test.html (UI test page)" test -f test.html

echo ""

# ── Summary ────────────────────────────────────────────────
echo "================================================="
total=$((pass + fail))
if [ "$fail" -eq 0 ]; then
  echo "  ALL $total CHECKS PASSED"
else
  echo "  $pass passed, $fail FAILED out of $total"
fi
echo "================================================="
echo ""

exit "$fail"
