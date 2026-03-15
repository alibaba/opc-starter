#!/usr/bin/env bash

set -euo pipefail

SKIP_E2E=false

for arg in "$@"; do
  case "$arg" in
    --skip-e2e)
      SKIP_E2E=true
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: ./scripts/quality_check.sh [--skip-e2e]" >&2
      exit 1
      ;;
  esac
done

echo "==> Running core AI-friendly checks"
npm run ai:check

if [ "$SKIP_E2E" = true ]; then
  echo "==> Skipping E2E checks"
  exit 0
fi

echo "==> Running E2E headless checks"
npm run test:e2e:headless
