#!/usr/bin/env bash
# collect-iteration-metrics.sh — AI Loop 迭代指标采集
#
# 从 .swarm/smoke-results.json 和 .swarm/test-results.json 采集结构化指标，
# 结合 report.md 中的 Bug 统计，生成 iteration-NNN.json 并计算 IHS。
#
# 用法：bash scripts/collect-iteration-metrics.sh [iteration_number] [project_root]
#   iteration_number  迭代轮次（默认：自动递增）
#   project_root      项目根目录（默认：当前目录的上三层）
#
# 输出：
#   .swarm/iterations/iteration-NNN.json  — 本轮迭代指标
#   .swarm/iterations/summary.json        — 跨迭代汇总
#   stdout: 本轮 IHS 摘要

set -euo pipefail

PROJECT_ROOT="${2:-$(cd "$(dirname "$0")/../../../.." && pwd)}"
SWARM_DIR="$PROJECT_ROOT/.swarm"
ITERATIONS_DIR="$SWARM_DIR/iterations"
mkdir -p "$ITERATIONS_DIR"

# ── 确定迭代轮次 ────────────────────────────────────────────────────────────
if [ -n "${1:-}" ]; then
  ITERATION="$1"
else
  LATEST=$(ls "$ITERATIONS_DIR"/iteration-*.json 2>/dev/null | sort -V | tail -1 || echo "")
  if [ -n "$LATEST" ]; then
    PREV_NUM=$(basename "$LATEST" | sed 's/iteration-0*//' | sed 's/\.json//')
    ITERATION=$((PREV_NUM + 1))
  else
    ITERATION=1
  fi
fi

PADDED=$(printf "%03d" "$ITERATION")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VERSION=$(cd "$PROJECT_ROOT" && node -p "require('./package.json').version" 2>/dev/null || echo "unknown")

# ── 采集构建状态 ────────────────────────────────────────────────────────────
BUILD_SUCCESS=true
BUILD_ERRORS=0
if ! (cd "$PROJECT_ROOT" && npm run build 2>&1 | tail -1 | grep -q "error" 2>/dev/null); then
  BUILD_SUCCESS=true
else
  BUILD_SUCCESS=false
  BUILD_ERRORS=$(cd "$PROJECT_ROOT" && npm run build 2>&1 | grep -c "error" || echo "1")
fi

TC_SUCCESS=true
TC_ERRORS=0
TC_OUTPUT=$(cd "$PROJECT_ROOT" && npm run typecheck 2>&1 || true)
if echo "$TC_OUTPUT" | grep -q "error TS"; then
  TC_SUCCESS=false
  TC_ERRORS=$(echo "$TC_OUTPUT" | grep -c "error TS" || echo "1")
fi

# ── 采集冒烟测试结果 ────────────────────────────────────────────────────────
SMOKE_TOTAL=0
SMOKE_PASSED=0
SMOKE_FAILED=0
if [ -f "$SWARM_DIR/smoke-results.json" ]; then
  SMOKE_TOTAL=$(python3 -c "import json; d=json.load(open('$SWARM_DIR/smoke-results.json')); print(d.get('total', 0))" 2>/dev/null || echo "0")
  SMOKE_PASSED=$(python3 -c "import json; d=json.load(open('$SWARM_DIR/smoke-results.json')); print(d.get('passed', 0))" 2>/dev/null || echo "0")
  SMOKE_FAILED=$(python3 -c "import json; d=json.load(open('$SWARM_DIR/smoke-results.json')); print(d.get('failed', 0))" 2>/dev/null || echo "0")
fi

# ── 采集单元测试结果 ────────────────────────────────────────────────────────
UNIT_TOTAL=0
UNIT_PASSED=0
UNIT_FAILED=0
UNIT_SUITES=0
if [ -f "$SWARM_DIR/test-results.json" ]; then
  UNIT_TOTAL=$(python3 -c "import json; d=json.load(open('$SWARM_DIR/test-results.json')); print(d.get('numTotalTests', 0))" 2>/dev/null || echo "0")
  UNIT_PASSED=$(python3 -c "import json; d=json.load(open('$SWARM_DIR/test-results.json')); print(d.get('numPassedTests', 0))" 2>/dev/null || echo "0")
  UNIT_FAILED=$(python3 -c "import json; d=json.load(open('$SWARM_DIR/test-results.json')); print(d.get('numFailedTests', 0))" 2>/dev/null || echo "0")
  UNIT_SUITES=$(python3 -c "import json; d=json.load(open('$SWARM_DIR/test-results.json')); print(d.get('numTotalTestSuites', 0))" 2>/dev/null || echo "0")
fi

# ── 从 report.md 提取 Bug 统计 ─────────────────────────────────────────────
BUGS_FOUND=0
BUGS_FIXED=0
BUGS_CARRIED=0
P0=0; P1=0; P2=0; P3=0
DEBT_KNOWN=0
DEBT_RESOLVED=0
DEBT_NEW=0

if [ -f "$PROJECT_ROOT/report.md" ]; then
  BUGS_FIXED=$(grep -c "✅" "$PROJECT_ROOT/report.md" 2>/dev/null) || BUGS_FIXED=0
  BUGS_CARRIED=$(grep -c "⚠️" "$PROJECT_ROOT/report.md" 2>/dev/null) || BUGS_CARRIED=0
  P0=$(grep -c "(P0)" "$PROJECT_ROOT/report.md" 2>/dev/null) || P0=0
  P1=$(grep -c "(P1)" "$PROJECT_ROOT/report.md" 2>/dev/null) || P1=0
  P2=$(grep -c "(P2)" "$PROJECT_ROOT/report.md" 2>/dev/null) || P2=0
  P3=$(grep -c "(P3)" "$PROJECT_ROOT/report.md" 2>/dev/null) || P3=0
  BUGS_FOUND=$((P0 + P1 + P2 + P3))
fi

# ── 读取上一轮指标（用于 delta 计算）──────────────────────────────────────
PREV_ITERATION=$((ITERATION - 1))
PREV_PADDED=$(printf "%03d" "$PREV_ITERATION")
PREV_FILE="$ITERATIONS_DIR/iteration-$PREV_PADDED.json"

PREV_SMOKE_PASSED=0
PREV_UNIT_PASSED=0
PREV_BUGS_FOUND=0
PREV_BUGS_FIXED=0
PREV_ACTIVE_BUGS=0
HAS_PREVIOUS=false

if [ -f "$PREV_FILE" ]; then
  HAS_PREVIOUS=true
  PREV_SMOKE_PASSED=$(python3 -c "import json; d=json.load(open('$PREV_FILE')); print(d['metrics']['smokeTest']['passed'])" 2>/dev/null || echo "0")
  PREV_UNIT_PASSED=$(python3 -c "import json; d=json.load(open('$PREV_FILE')); print(d['metrics']['unitTest']['passed'])" 2>/dev/null || echo "0")
  PREV_BUGS_FOUND=$(python3 -c "import json; d=json.load(open('$PREV_FILE')); print(d['metrics']['bugs']['found'])" 2>/dev/null || echo "0")
  PREV_BUGS_FIXED=$(python3 -c "import json; d=json.load(open('$PREV_FILE')); print(d['metrics']['bugs']['fixed'])" 2>/dev/null || echo "0")
  PREV_CARRIED=$(python3 -c "import json; d=json.load(open('$PREV_FILE')); print(d['metrics']['bugs']['carriedOver'])" 2>/dev/null || echo "0")
  PREV_ACTIVE_BUGS=$((PREV_CARRIED + PREV_BUGS_FOUND - PREV_BUGS_FIXED))
fi

# ── 计算 IHS ────────────────────────────────────────────────────────────────
SMOKE_RATE=100
if [ "$SMOKE_TOTAL" -gt 0 ]; then
  SMOKE_RATE=$(python3 -c "print(round($SMOKE_PASSED / $SMOKE_TOTAL * 100))" 2>/dev/null || echo "100")
fi
UNIT_RATE=100
if [ "$UNIT_TOTAL" -gt 0 ]; then
  UNIT_RATE=$(python3 -c "print(round($UNIT_PASSED / $UNIT_TOTAL * 100))" 2>/dev/null || echo "100")
fi

TEST_STABILITY=$(python3 -c "print(min($SMOKE_RATE, $UNIT_RATE))")
ACTIVE_BUGS=$((BUGS_CARRIED + BUGS_FOUND - BUGS_FIXED))
BUG_TRAJECTORY=$(python3 -c "print(max(0, 100 - max(0, $ACTIVE_BUGS) * 10))")

REGRESSIONS=0
if $HAS_PREVIOUS; then
  SMOKE_DELTA=$((SMOKE_PASSED - PREV_SMOKE_PASSED))
  UNIT_DELTA=$((UNIT_PASSED - PREV_UNIT_PASSED))
  if [ "$SMOKE_DELTA" -lt 0 ]; then REGRESSIONS=$((REGRESSIONS + ${SMOKE_DELTA#-})); fi
  if [ "$UNIT_DELTA" -lt 0 ]; then REGRESSIONS=$((REGRESSIONS + ${UNIT_DELTA#-})); fi
fi
REGRESSION_FREEDOM=$(python3 -c "print(max(0, 100 - $REGRESSIONS * 25))")

if [ "$DEBT_RESOLVED" -eq 0 ] && [ "$DEBT_NEW" -eq 0 ]; then
  DEBT_TRAJECTORY=80
else
  DEBT_TRAJECTORY=$(python3 -c "print(max(0, min(100, round(100 * (1 - $DEBT_NEW / max($DEBT_RESOLVED, 1))))))")
fi

IHS=$(python3 -c "print(round($TEST_STABILITY * 0.30 + $BUG_TRAJECTORY * 0.25 + $REGRESSION_FREEDOM * 0.25 + $DEBT_TRAJECTORY * 0.20))")

if [ "$IHS" -ge 90 ]; then VERDICT="excellent"
elif [ "$IHS" -ge 75 ]; then VERDICT="good"
elif [ "$IHS" -ge 60 ]; then VERDICT="warning"
else VERDICT="danger"
fi

# ── 生成 iteration-NNN.json ─────────────────────────────────────────────────
DELTA_JSON="null"
if $HAS_PREVIOUS; then
  SMOKE_D=$((SMOKE_PASSED - PREV_SMOKE_PASSED))
  UNIT_D=$((UNIT_PASSED - PREV_UNIT_PASSED))
  BUGS_FOUND_D=$((BUGS_FOUND - PREV_BUGS_FOUND))
  BUGS_FIXED_D=$((BUGS_FIXED - PREV_BUGS_FIXED))
  NET_BUG=$((ACTIVE_BUGS - PREV_ACTIVE_BUGS))
  DEBT_D=$((DEBT_NEW - DEBT_RESOLVED))
  DELTA_JSON=$(cat <<DEOF
{
    "smokeTestDelta": $SMOKE_D,
    "unitTestDelta": $UNIT_D,
    "bugsFoundDelta": $BUGS_FOUND_D,
    "bugsFixedDelta": $BUGS_FIXED_D,
    "netBugChange": $NET_BUG,
    "techDebtDelta": $DEBT_D
  }
DEOF
)
fi

cat > "$ITERATIONS_DIR/iteration-$PADDED.json" <<EOF
{
  "iteration": $ITERATION,
  "timestamp": "$TIMESTAMP",
  "version": "$VERSION",
  "metrics": {
    "iteration": $ITERATION,
    "timestamp": "$TIMESTAMP",
    "version": "$VERSION",
    "build": { "success": $BUILD_SUCCESS, "errors": $BUILD_ERRORS },
    "typecheck": { "success": $TC_SUCCESS, "errors": $TC_ERRORS },
    "smokeTest": { "total": $SMOKE_TOTAL, "passed": $SMOKE_PASSED, "failed": $SMOKE_FAILED },
    "unitTest": { "total": $UNIT_TOTAL, "passed": $UNIT_PASSED, "failed": $UNIT_FAILED, "suites": $UNIT_SUITES },
    "bugs": {
      "found": $BUGS_FOUND,
      "fixed": $BUGS_FIXED,
      "carriedOver": $BUGS_CARRIED,
      "byPriority": { "P0": $P0, "P1": $P1, "P2": $P2, "P3": $P3 }
    },
    "techDebt": {
      "knownItems": $DEBT_KNOWN,
      "resolvedThisRound": $DEBT_RESOLVED,
      "newThisRound": $DEBT_NEW
    }
  },
  "deltaFromPrevious": $DELTA_JSON,
  "healthScore": {
    "composite": $IHS,
    "testStability": $TEST_STABILITY,
    "bugTrajectory": $BUG_TRAJECTORY,
    "regressionFreedom": $REGRESSION_FREEDOM,
    "debtTrajectory": $DEBT_TRAJECTORY,
    "verdict": "$VERDICT"
  }
}
EOF

# ── 生成 summary.json ──────────────────────────────────────────────────────
HISTORY_ENTRIES=""
SEP=""
for f in $(ls "$ITERATIONS_DIR"/iteration-*.json 2>/dev/null | sort -V); do
  ITER_NUM=$(python3 -c "import json; print(json.load(open('$f'))['iteration'])" 2>/dev/null || continue)
  ITER_TS=$(python3 -c "import json; print(json.load(open('$f'))['timestamp'])" 2>/dev/null || continue)
  ITER_IHS=$(python3 -c "import json; print(json.load(open('$f'))['healthScore']['composite'])" 2>/dev/null || continue)
  ITER_V=$(python3 -c "import json; print(json.load(open('$f'))['healthScore']['verdict'])" 2>/dev/null || continue)
  HISTORY_ENTRIES="${HISTORY_ENTRIES}${SEP}{\"iteration\":$ITER_NUM,\"timestamp\":\"$ITER_TS\",\"ihs\":$ITER_IHS,\"verdict\":\"$ITER_V\"}"
  SEP=","
done

TOTAL_ITERATIONS=$(ls "$ITERATIONS_DIR"/iteration-*.json 2>/dev/null | wc -l | tr -d ' ')
TREND="stable"
if [ "$TOTAL_ITERATIONS" -ge 3 ]; then
  TREND=$(python3 -c "
import json, glob, os
files = sorted(glob.glob('$ITERATIONS_DIR/iteration-*.json'))
records = [json.load(open(f)) for f in files[-3:]]
scores = [r['healthScore']['composite'] for r in records]
diffs = [scores[1]-scores[0], scores[2]-scores[1]]
avg = sum(diffs)/2
if avg > 2: print('improving')
elif avg < -2: print('declining')
else: print('stable')
" 2>/dev/null || echo "stable")
fi

cat > "$ITERATIONS_DIR/summary.json" <<EOF
{
  "totalIterations": $TOTAL_ITERATIONS,
  "latestIteration": $ITERATION,
  "trend": "$TREND",
  "history": [$HISTORY_ENTRIES]
}
EOF

# ── 输出摘要 ────────────────────────────────────────────────────────────────
echo "=== Iteration $ITERATION Health Score ==="
echo "  IHS:                $IHS/100"
echo "  Test Stability:     $TEST_STABILITY"
echo "  Bug Trajectory:     $BUG_TRAJECTORY"
echo "  Regression Freedom: $REGRESSION_FREEDOM"
echo "  Debt Trajectory:    $DEBT_TRAJECTORY"
echo "  Verdict:            $VERDICT"
echo ""
echo "  Trend:              $TREND"
echo "  Saved:              $ITERATIONS_DIR/iteration-$PADDED.json"
