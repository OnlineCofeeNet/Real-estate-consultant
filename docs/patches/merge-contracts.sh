#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cat "$ROOT/docs/patches/Contracts.part1.tsx" "$ROOT/docs/patches/Contracts.part2.tsx" > "$ROOT/src/pages/Contracts.tsx"
echo "Merged into src/pages/Contracts.tsx ($(wc -c < "$ROOT/src/pages/Contracts.tsx") bytes)"
