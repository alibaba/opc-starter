#!/usr/bin/env bash
# health-check.sh — 一键验证 + 指标采集 + 三态判定 + 技术债检测（v11 Verify Phase）
#
# v11 升级：增加存量技术债检测、文档新鲜度校验、测试覆盖缺口检测。
#
# 用法：bash .cursor/skills/swarm-ai-loop/scripts/health-check.sh [project-root]
# 可选环境变量：
#   SKIP_SMOKE=1    跳过冒烟测试（修复中间态快速验证）
#   SKIP_UNIT=1     跳过单元测试（只验证 build+typecheck）
#   SKIP_METRICS=1  跳过 IHS 指标采集
#   SKIP_DEBT=1     跳过技术债检测

set -euo pipefail

PROJECT="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$PROJECT"

SWARM_DIR="$PROJECT/.swarm"
SCRIPTS_DIR="$(dirname "$0")"

echo "=== HEALTH CHECK (v11) ==="
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ── Build + Typecheck ─────────────────────────────────────────────────────────
BUILD_OK=true; TC_OK=true
BUILD_OUT=$(npm run build 2>&1) || BUILD_OK=false
TC_OUT=$(npm run typecheck 2>&1) || TC_OK=false

if $BUILD_OK; then echo "Build:      ✅ PASS"
else
  BUILD_ERRS=$(echo "$BUILD_OUT" | grep -c "error" 2>/dev/null || echo "?")
  echo "Build:      ❌ FAIL ($BUILD_ERRS errors)"
fi

if $TC_OK; then echo "Typecheck:  ✅ PASS"
else
  TC_ERRS=$(echo "$TC_OUT" | grep -c "error TS" 2>/dev/null || echo "?")
  echo "Typecheck:  ❌ FAIL ($TC_ERRS errors)"
fi

# ── Unit Tests ────────────────────────────────────────────────────────────────
UNIT_PASSED=0; UNIT_TOTAL=0; UNIT_FAILED=0; UNIT_SUITES=0; UNIT_SUITES_TOTAL=0
TEST_EXIT=0

if [ "${SKIP_UNIT:-0}" != "1" ]; then
  TEST_OUT=$(npm run test 2>&1) && TEST_EXIT=0 || TEST_EXIT=$?
  UNIT_SUITES=$(echo "$TEST_OUT" | grep "Test Files" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || echo "0")
  UNIT_SUITES_TOTAL=$(echo "$TEST_OUT" | grep "Test Files" | grep -oE '\([0-9]+\)' | grep -oE '[0-9]+' || echo "$UNIT_SUITES")
  UNIT_PASSED=$(echo "$TEST_OUT" | grep "^      Tests" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || echo "0")
  UNIT_TOTAL=$(echo "$TEST_OUT" | grep "^      Tests" | grep -oE '\([0-9]+\)' | grep -oE '[0-9]+' || echo "$UNIT_PASSED")
  UNIT_FAILED=$(echo "$TEST_OUT" | grep "^      Tests" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' || echo "0")

  if [ "$TEST_EXIT" -eq 0 ]; then
    echo "Unit Test:  ✅ ${UNIT_PASSED}/${UNIT_TOTAL} (${UNIT_SUITES}/${UNIT_SUITES_TOTAL} suites)"
  else
    echo "Unit Test:  ❌ ${UNIT_PASSED}/${UNIT_TOTAL} (${UNIT_FAILED} failed)"
  fi
else
  echo "Unit Test:  ⏭️  SKIPPED"
fi

# ── Smoke Tests ───────────────────────────────────────────────────────────────
SMOKE_TOTAL=0; SMOKE_PASSED=0; SMOKE_FAILED=0

if [ "${SKIP_SMOKE:-0}" != "1" ]; then
  SMOKE_OUT=$(bash "$SCRIPTS_DIR/smoke-test.sh" --json 2>&1) && SMOKE_EXIT=0 || SMOKE_EXIT=$?
  SMOKE_TOTAL=$(echo "$SMOKE_OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['total'])" 2>/dev/null || echo "0")
  SMOKE_PASSED=$(echo "$SMOKE_OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['passed'])" 2>/dev/null || echo "0")
  SMOKE_FAILED=$(echo "$SMOKE_OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['failed'])" 2>/dev/null || echo "0")

  if [ "${SMOKE_FAILED:-0}" -eq 0 ]; then
    echo "Smoke Test: ✅ ${SMOKE_PASSED}/${SMOKE_TOTAL}"
  else
    echo "Smoke Test: ❌ ${SMOKE_PASSED}/${SMOKE_TOTAL} (${SMOKE_FAILED} failed)"
  fi
else
  echo "Smoke Test: ⏭️  SKIPPED"
fi

# ── Delta comparison ──────────────────────────────────────────────────────────
echo ""
ITERATIONS_DIR="$SWARM_DIR/iterations"
PREV_FILE=$(ls "$ITERATIONS_DIR"/iteration-*.json 2>/dev/null | sort -V | tail -1 || echo "")
UD=0; SD=0

if [ -n "$PREV_FILE" ] && [ -f "$PREV_FILE" ]; then
  PREV_ROUND=$(python3 -c "import json; print(json.load(open('$PREV_FILE'))['iteration'])" 2>/dev/null || echo "?")
  PREV_UNIT=$(python3 -c "import json; print(json.load(open('$PREV_FILE'))['metrics']['unitTest']['passed'])" 2>/dev/null || echo "0")
  PREV_SMOKE=$(python3 -c "import json; print(json.load(open('$PREV_FILE'))['metrics']['smokeTest']['passed'])" 2>/dev/null || echo "0")
  DELTA_PARTS=""
  if [ "${SKIP_UNIT:-0}" != "1" ]; then
    UD=$((UNIT_PASSED - PREV_UNIT))
    DELTA_PARTS="Unit $(printf '%+d' $UD)"
  fi
  if [ "${SKIP_SMOKE:-0}" != "1" ]; then
    SD=$((SMOKE_PASSED - PREV_SMOKE))
    [ -n "$DELTA_PARTS" ] && DELTA_PARTS="$DELTA_PARTS, "
    DELTA_PARTS="${DELTA_PARTS}Smoke $(printf '%+d' $SD)"
  fi
  if [ -n "$DELTA_PARTS" ]; then
    echo "Delta (vs R${PREV_ROUND}): $DELTA_PARTS"
  else
    echo "Delta: skipped (tests not run)"
  fi
else
  echo "Delta: no previous iteration data"
fi

# ── Verdict ───────────────────────────────────────────────────────────────────
HAS_REGRESSION=false; HAS_FAILURE=false; ALL_PASS=true

if ! $BUILD_OK || ! $TC_OK; then ALL_PASS=false; HAS_FAILURE=true; fi
if [ "$TEST_EXIT" -ne 0 ] && [ "${SKIP_UNIT:-0}" != "1" ]; then ALL_PASS=false; HAS_FAILURE=true; fi
if [ "${SMOKE_FAILED:-0}" -gt 0 ] && [ "${SKIP_SMOKE:-0}" != "1" ]; then ALL_PASS=false; HAS_FAILURE=true; fi
if [ "${SKIP_UNIT:-0}" != "1" ] && [ "$UD" -lt 0 ]; then HAS_REGRESSION=true; fi
if [ "${SKIP_SMOKE:-0}" != "1" ] && [ "$SD" -lt 0 ]; then HAS_REGRESSION=true; fi

echo ""
if $HAS_FAILURE; then
  echo "Verdict:    ❌ WORSE (failures present)"
elif $HAS_REGRESSION; then
  echo "Verdict:    ⚠️  WORSE (regression detected)"
elif $ALL_PASS; then
  if [ "$UD" -gt 0 ] || [ "$SD" -gt 0 ]; then
    echo "Verdict:    ✅ BETTER (tests increased, all passing)"
  else
    echo "Verdict:    ✅ STABLE (all passing)"
  fi
else
  echo "Verdict:    ⚠️  UNKNOWN"
fi

# ── Core Flow Check ──────────────────────────────────────────────────────────
CORE_CMDS=("init" "doctor" "plan" "run" "merge" "status" "logs" "clean")
CORE_PASS=0
CORE_TOTAL=${#CORE_CMDS[@]}

if [ -f "$SWARM_DIR/smoke-results.json" ]; then
  for cmd in "${CORE_CMDS[@]}"; do
    HIT=$(python3 -c "
import json
d = json.load(open('$SWARM_DIR/smoke-results.json'))
hits = [r for r in d.get('results', []) if '$cmd' in r.get('name','') and r.get('status')=='pass']
print(len(hits))
" 2>/dev/null || echo "0")
    if [ "$HIT" -gt 0 ]; then CORE_PASS=$((CORE_PASS + 1)); fi
  done
  echo "Core Flow:  ${CORE_PASS}/${CORE_TOTAL} commands verified"
fi

# ── Tech Debt Detection (v11 新增) ───────────────────────────────────────────
if [ "${SKIP_DEBT:-0}" != "1" ]; then
  echo ""
  echo "--- TECH DEBT AUDIT ---"
  DEBT_COUNT=0

  # 1. Skipped/todo tests (precise vitest/jest API pattern matching)
  SKIP_MATCHES=$(grep -rE '\b(it|test|describe)\.skip\b|\b(it|test)\.todo\b|\bxit\(|\bxdescribe\(' tests/ --include="*.test.ts" 2>/dev/null || true)
  if [ -z "$SKIP_MATCHES" ]; then SKIP_TESTS=0; else SKIP_TESTS=$(echo "$SKIP_MATCHES" | wc -l | tr -d ' '); fi
  if [ "$SKIP_TESTS" -gt 0 ]; then
    echo "  Skipped tests:    $SKIP_TESTS"
    DEBT_COUNT=$((DEBT_COUNT + SKIP_TESTS))
  fi

  # 2. TODO/FIXME/HACK in source
  TODO_SRC=$(grep -r "TODO\|FIXME\|HACK" src/ --include="*.ts" -c 2>/dev/null | awk -F: '{s+=$2}END{print s+0}' || echo "0")
  echo "  TODO/FIXME in src: $TODO_SRC"

  # 3. SOURCE_MAP freshness
  if [ -f "docs/SOURCE_MAP.md" ]; then
    UNMAPPED=0
    for ts_file in $(git ls-files 'src/**/*.ts' 2>/dev/null | head -100); do
      base=$(basename "$ts_file")
      if ! grep -q "$base" "docs/SOURCE_MAP.md" 2>/dev/null; then
        UNMAPPED=$((UNMAPPED + 1))
      fi
    done
    if [ "$UNMAPPED" -gt 0 ]; then
      echo "  Unmapped in SOURCE_MAP: $UNMAPPED files"
      DEBT_COUNT=$((DEBT_COUNT + UNMAPPED))
    fi
  fi

  # 4. New src files without tests
  UNTESTED=0
  for ts_file in $(git ls-files --others --exclude-standard 'src/**/*.ts' 2>/dev/null); do
    base=$(basename "$ts_file" .ts)
    if ! find tests/ -name "${base}*.test.ts" -o -name "*${base}*.test.ts" 2>/dev/null | grep -q .; then
      UNTESTED=$((UNTESTED + 1))
    fi
  done
  if [ "$UNTESTED" -gt 0 ]; then
    echo "  New src without tests: $UNTESTED files"
    DEBT_COUNT=$((DEBT_COUNT + UNTESTED))
  fi

  # 5. Epic consistency check
  if [ -f "docs/epics/README.md" ]; then
    EPIC_ISSUES=0
    for epic in docs/epics/epic-*.md; do
      [ -f "$epic" ] || continue
      epic_name=$(basename "$epic")
      if grep -q "Status.*✅\|✅.*Done\|✅.*Complete" "$epic" 2>/dev/null; then
        if ! grep -q "$(basename "$epic" .md).*Archived\|$(basename "$epic" .md).*📦" "docs/epics/README.md" 2>/dev/null; then
          echo "  Epic not archived: $epic_name (marked Done but still in epics/)"
          EPIC_ISSUES=$((EPIC_ISSUES + 1))
        fi
      fi
    done
    DEBT_COUNT=$((DEBT_COUNT + EPIC_ISSUES))
  fi

  echo "  Total debt signals: $DEBT_COUNT"
fi

# ── Auto-collect IHS metrics ─────────────────────────────────────────────────
if [ "${SKIP_METRICS:-0}" != "1" ]; then
  echo ""
  echo "--- IHS ---"
  bash "$SCRIPTS_DIR/collect-iteration-metrics.sh" 2>/dev/null | grep -E "IHS:|Verdict:|Trend:" || echo "(metrics collection skipped)"
fi

# ── Git Tag info (v11 新增) ──────────────────────────────────────────────────
echo ""
echo "--- TAG INFO ---"
LAST_TAG=$(git tag --sort=-creatordate --list 'ai-loop-*' 2>/dev/null | head -1 || echo "")
if [ -n "$LAST_TAG" ]; then
  COMMITS_SINCE=$(git rev-list "$LAST_TAG"..HEAD --count 2>/dev/null || echo "?")
  echo "Last AI Loop Tag: $LAST_TAG (+$COMMITS_SINCE commits since)"
else
  echo "Last AI Loop Tag: NONE"
fi
echo "Suggested next tag: ai-loop-r$(date +%Y%m%d)"

echo ""
echo "=== END HEALTH CHECK ==="
