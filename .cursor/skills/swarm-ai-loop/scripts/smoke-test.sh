#!/usr/bin/env bash
# smoke-test.sh — Swarm CLI 无侵入冒烟测试
# 在独立临时工作区运行，不污染主项目 .swarm 数据
# 输出：JSON 格式结果到 stdout，可被 AI 直接读取
#
# 用法：bash scripts/smoke-test.sh [--verbose] [--json]
#   --verbose  显示每条命令的完整输出
#   --json     输出 JSON 格式摘要（默认：human-readable）
#              同时写入 .swarm/smoke-results.json 供迭代指标采集

set -euo pipefail

VERBOSE=false
JSON_OUTPUT=false
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "$0")/../../../.." && pwd)}"
START_TIME=$(date +%s)
for arg in "$@"; do
  case $arg in
    --verbose) VERBOSE=true ;;
    --json)    JSON_OUTPUT=true ;;
  esac
done

# ── 工作区准备 ──────────────────────────────────────────────────────────────
WORK_DIR=$(mktemp -d /tmp/swarm-smoke-XXXXXX)
trap 'rm -rf "$WORK_DIR"' EXIT

cd "$WORK_DIR"
git init -b main -q
git config user.email "smoke@swarm.test"
git config user.name "Smoke Test"
echo "# Smoke Test" > README.md
git add . && git commit -q -m "init" --no-verify 2>/dev/null || git commit -q -m "init"

# ── 测试框架 ────────────────────────────────────────────────────────────────
PASS=0
FAIL=0
SKIP=0
declare -a FAILURES=()
declare -a RESULTS=()

run_test() {
  local name="$1"
  local expected_exit="${2:-0}"
  shift 2
  local cmd=("$@")

  local output exit_code
  output=$("${cmd[@]}" 2>&1) && exit_code=0 || exit_code=$?

  if [ "$exit_code" -eq "$expected_exit" ]; then
    PASS=$((PASS + 1))
    RESULTS+=("{\"name\":\"$name\",\"status\":\"pass\",\"exit\":$exit_code}")
    $VERBOSE && echo "  ✓ $name" || true
  else
    FAIL=$((FAIL + 1))
    local escaped_output
    escaped_output=$(echo "$output" | head -3 | tr '"' "'" | tr '\n' '|')
    FAILURES+=("$name (exit $exit_code): $escaped_output")
    RESULTS+=("{\"name\":\"$name\",\"status\":\"fail\",\"exit\":$exit_code,\"output\":\"$escaped_output\"}")
    { $VERBOSE && echo "  ✗ $name (exit $exit_code)"; } || true
    { $VERBOSE && echo "    $output" | head -5; } || true
  fi
}

check_output() {
  local name="$1"
  local pattern="$2"
  shift 2
  local cmd=("$@")

  local output exit_code
  output=$("${cmd[@]}" 2>&1) && exit_code=0 || exit_code=$?

  if echo "$output" | grep -q "$pattern"; then
    PASS=$((PASS + 1))
    RESULTS+=("{\"name\":\"$name\",\"status\":\"pass\"}")
    $VERBOSE && echo "  ✓ $name" || true
  else
    FAIL=$((FAIL + 1))
    local escaped_output
    escaped_output=$(echo "$output" | head -3 | tr '"' "'" | tr '\n' '|')
    FAILURES+=("$name: pattern '$pattern' not found in output")
    RESULTS+=("{\"name\":\"$name\",\"status\":\"fail\",\"output\":\"$escaped_output\"}")
    { $VERBOSE && echo "  ✗ $name (pattern '$pattern' not found)"; } || true
  fi
}

# ── 测试用例 ────────────────────────────────────────────────────────────────
$VERBOSE && echo "=== Swarm CLI Smoke Test ===" || true
$VERBOSE && echo "Workspace: $WORK_DIR" || true
$VERBOSE && echo "" || true

# 1. 版本检查
check_output "version" "1\." swarm --version

# 2. init
run_test "init" 0 swarm init

# 3. doctor（基础，不含 --verbose 以避免 -v 别名问题）
check_output "doctor:executor" "Executor" swarm doctor
check_output "doctor:git" "git" swarm doctor
check_output "doctor:node" "node" swarm doctor

# 4. doctor --verbose（验证后端健康检查）
check_output "doctor:verbose" "Backend Details" swarm doctor --verbose

# 5. config
run_test "config:show" 0 swarm config show
run_test "config:set" 0 swarm config set agents.maxConcurrent 6
run_test "config:validate" 0 swarm config validate
run_test "config:reset" 0 swarm config reset --section logging

# 6. status
run_test "status" 0 swarm status

# 7. metrics
run_test "metrics:summary" 0 swarm metrics summary
run_test "metrics:projection" 0 swarm metrics projection
run_test "metrics:clean" 0 swarm metrics clean --days 60

# 8. constraints
run_test "constraints:list" 0 swarm constraints list
run_test "constraints:search" 0 swarm constraints search "nonexistent-xyz"
run_test "constraints:top" 0 swarm constraints top

# 9. mail
run_test "mail:list" 0 swarm mail list
run_test "mail:send" 0 swarm mail send agent-001 "smoke test message"

# 10. trace
run_test "trace:list" 0 swarm trace list
run_test "trace:stats" 0 swarm trace stats
run_test "trace:clean" 0 swarm trace clean --days 14

# 11. replay
run_test "replay:last-failed" 0 swarm replay --last-failed

# 12. merge
run_test "merge:dry-run" 0 swarm merge --dry-run

# 13. clean
run_test "clean:dry-run" 0 swarm clean --dry-run
run_test "clean:ghosts:dry-run" 0 swarm clean --ghosts --dry-run

# 14. report
run_test "report:weekly" 0 swarm report
run_test "report:daily" 0 swarm report -p daily
run_test "report:json" 0 swarm report -f json
run_test "report:file" 0 swarm report -o "$WORK_DIR/test-report.md"

# 15. completion
check_output "completion:bash" "_swarm_completions" swarm completion bash
check_output "completion:zsh" "_swarm" swarm completion zsh

# 16. bench
run_test "bench:list" 0 swarm bench list
run_test "bench:baseline:list" 0 swarm bench baseline list

# 17. scout (dry-run)
run_test "scout:skip:terminal" 0 swarm scout "smoke test" --skip-scouts --format terminal
run_test "scout:skip:markdown" 0 swarm scout "smoke test" --skip-scouts --format markdown
run_test "scout:skip:json" 0 swarm scout "smoke test" --skip-scouts --format json

# 18. plan (dry-run)
run_test "plan:skip-scouts" 0 swarm plan "smoke test plan" --skip-scouts --yes

# 19. run --dry-run (包括空计划)
run_test "run:dry-run" 0 swarm run --dry-run

# 20. logs
run_test "logs" 0 swarm logs
run_test "logs:json" 0 swarm logs --json

# 21. task
run_test "task:list" 0 swarm task list
run_test "task:list:json" 0 swarm task list --json
run_test "task:mark:no-flag" 1 swarm task mark task-001
run_test "task:retry:no-agent" 1 swarm task retry task-999

# 22. merge --partial (dry-run equivalent)
run_test "merge:partial:dry-run" 0 swarm merge --partial --dry-run

# 23. serve --mcp (单次握手)
check_output "serve:mcp:handshake" "protocolVersion" bash -c \
  'echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test\",\"version\":\"1.0\"}}}" | swarm serve --mcp'

# ── 输出结果 ────────────────────────────────────────────────────────────────
TOTAL=$((PASS + FAIL + SKIP))
END_TIME=$(date +%s)
DURATION_SEC=$((END_TIME - START_TIME))
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VERSION=$(swarm --version 2>/dev/null | head -1 || echo "unknown")

build_json_output() {
  printf '{\n'
  printf '  "timestamp": "%s",\n' "$TIMESTAMP"
  printf '  "version": "%s",\n' "$VERSION"
  printf '  "total": %d,\n' "$TOTAL"
  printf '  "passed": %d,\n' "$PASS"
  printf '  "failed": %d,\n' "$FAIL"
  printf '  "skipped": %d,\n' "$SKIP"
  printf '  "duration_sec": %d,\n' "$DURATION_SEC"
  printf '  "failures": ['
  local local_sep=""
  for f in "${FAILURES[@]:-}"; do
    [ -z "$f" ] && continue
    printf '%s"%s"' "$local_sep" "$f"
    local_sep=","
  done
  printf '],\n'
  printf '  "results": [%s]\n' "$(IFS=,; echo "${RESULTS[*]}")"
  printf '}\n'
}

if $JSON_OUTPUT; then
  json_data=$(build_json_output)
  echo "$json_data"

  # Write to .swarm/smoke-results.json for iteration metrics collection
  mkdir -p "$PROJECT_ROOT/.swarm"
  echo "$json_data" > "$PROJECT_ROOT/.swarm/smoke-results.json"
else
  # Human-readable 输出
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Swarm CLI Smoke Test Results"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  printf "  PASS: %d / %d\n" "$PASS" "$TOTAL"
  printf "  FAIL: %d / %d\n" "$FAIL" "$TOTAL"
  printf "  Duration: %ds\n" "$DURATION_SEC"
  echo ""
  if [ ${#FAILURES[@]} -gt 0 ]; then
    echo "Failed tests:"
    for f in "${FAILURES[@]}"; do
      [ -z "$f" ] && continue
      echo "  ✗ $f"
    done
    echo ""
    exit 1
  else
    echo "  All tests passed ✓"
    exit 0
  fi
fi
