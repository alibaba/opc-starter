#!/usr/bin/env bash
# git-delta-scan.sh — 扫描自上次 AI Loop Tag 以来的所有 Git 变动
#
# 内循环闭环工作流的核心：自动识别外循环引入的新复杂度，
# 将新增/修改的源码、文档、测试、Epic 分类汇总，供 LLM 做决策。
#
# 用法：bash .cursor/skills/swarm-ai-loop/scripts/git-delta-scan.sh [project-root]
#
# 输出：
#   - 上次 Tag 信息 + 距今 commit 数
#   - 分类变动清单：源码 / 测试 / 文档 / Epic / Bench / 配置
#   - 未跟踪文件（外循环新增但未提交）
#   - 存量技术债信号（过期文档、孤立文件、腐坏标记）

set -euo pipefail

PROJECT="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$PROJECT"

echo "=== GIT DELTA SCAN (v11) ==="
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ── 确定基准点（上次 AI Loop Tag）────────────────────────────────────────────
LAST_TAG=$(git tag --sort=-creatordate --list 'ai-loop-*' 2>/dev/null | head -1 || echo "")

if [ -z "$LAST_TAG" ]; then
  LAST_TAG=$(git tag --sort=-creatordate 2>/dev/null | head -1 || echo "")
fi

if [ -n "$LAST_TAG" ]; then
  TAG_DATE=$(git log -1 --format='%ci' "$LAST_TAG" 2>/dev/null || echo "unknown")
  COMMITS_SINCE=$(git rev-list "$LAST_TAG"..HEAD --count 2>/dev/null || echo "?")
  echo "Last Tag: $LAST_TAG ($TAG_DATE)"
  echo "Commits since: $COMMITS_SINCE"
  BASE_REF="$LAST_TAG"
else
  COMMITS_TOTAL=$(git rev-list HEAD --count 2>/dev/null || echo "?")
  echo "Last Tag: NONE (first AI Loop)"
  echo "Total commits: $COMMITS_TOTAL"
  BASE_REF=$(git rev-list --max-parents=0 HEAD 2>/dev/null | head -1 || echo "HEAD~30")
fi
echo ""

# ── 已提交的变动分类 ─────────────────────────────────────────────────────────
echo "--- COMMITTED CHANGES (since $BASE_REF) ---"

DIFF_FILES=$(git diff --name-only "$BASE_REF"..HEAD 2>/dev/null || echo "")

SRC_FILES=""
TEST_FILES=""
DOC_FILES=""
EPIC_FILES=""
BENCH_FILES=""
CONFIG_FILES=""
OTHER_FILES=""

while IFS= read -r file; do
  [ -z "$file" ] && continue
  case "$file" in
    src/*)           SRC_FILES="$SRC_FILES$file\n" ;;
    tests/*)         TEST_FILES="$TEST_FILES$file\n" ;;
    docs/epics/*)    EPIC_FILES="$EPIC_FILES$file\n" ;;
    docs/*)          DOC_FILES="$DOC_FILES$file\n" ;;
    benchmarks/*)    BENCH_FILES="$BENCH_FILES$file\n" ;;
    package.json|package-lock.json|tsconfig.json|vitest.config.ts|biome.json)
                     CONFIG_FILES="$CONFIG_FILES$file\n" ;;
    *.toml|*.json|*.yaml|*.yml)
                     CONFIG_FILES="$CONFIG_FILES$file\n" ;;
    *)               OTHER_FILES="$OTHER_FILES$file\n" ;;
  esac
done <<< "$DIFF_FILES"

print_category() {
  local label="$1" files="$2"
  if [ -n "$files" ]; then
    local count
    count=$(printf '%b' "$files" | grep -c . || echo "0")
    echo ""
    echo "$label ($count files):"
    printf '%b' "$files" | while IFS= read -r f; do
      [ -z "$f" ] && continue
      local status
      status=$(git diff --name-status "$BASE_REF"..HEAD -- "$f" 2>/dev/null | cut -f1 || echo "M")
      case "$status" in
        A) echo "  + $f" ;;
        D) echo "  - $f" ;;
        M) echo "  ~ $f" ;;
        R*) echo "  > $f (renamed)" ;;
        *) echo "  ? $f" ;;
      esac
    done
  fi
}

print_category "Source Code (src/)" "$SRC_FILES"
print_category "Tests (tests/)" "$TEST_FILES"
print_category "Epics (docs/epics/)" "$EPIC_FILES"
print_category "Documentation (docs/)" "$DOC_FILES"
print_category "Benchmarks (benchmarks/)" "$BENCH_FILES"
print_category "Config" "$CONFIG_FILES"
print_category "Other" "$OTHER_FILES"

# ── 未提交的变动（外循环新增但未 commit）──────────────────────────────────────
echo ""
echo "--- UNCOMMITTED CHANGES ---"

STAGED=$(git diff --cached --name-only 2>/dev/null || echo "")
MODIFIED=$(git diff --name-only 2>/dev/null || echo "")
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null || echo "")

if [ -n "$STAGED" ]; then STAGED_COUNT=$(echo "$STAGED" | wc -l | tr -d ' '); else STAGED_COUNT=0; fi
if [ -n "$MODIFIED" ]; then MODIFIED_COUNT=$(echo "$MODIFIED" | wc -l | tr -d ' '); else MODIFIED_COUNT=0; fi
if [ -n "$UNTRACKED" ]; then UNTRACKED_COUNT=$(echo "$UNTRACKED" | wc -l | tr -d ' '); else UNTRACKED_COUNT=0; fi

echo "Staged: $STAGED_COUNT | Modified: $MODIFIED_COUNT | Untracked: $UNTRACKED_COUNT"

if [ "$UNTRACKED_COUNT" -gt 0 ]; then
  echo ""
  echo "New files (untracked):"

  NEW_SRC=0; NEW_TEST=0; NEW_EPIC=0; NEW_DOC=0; NEW_BENCH=0; NEW_OTHER=0
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    case "$f" in
      src/*)           NEW_SRC=$((NEW_SRC + 1)); echo "  + $f" ;;
      tests/*)         NEW_TEST=$((NEW_TEST + 1)); echo "  + $f" ;;
      docs/epics/*)    NEW_EPIC=$((NEW_EPIC + 1)); echo "  + $f" ;;
      docs/*)          NEW_DOC=$((NEW_DOC + 1)); echo "  + $f" ;;
      benchmarks/*)    NEW_BENCH=$((NEW_BENCH + 1)); echo "  + $f" ;;
      *)               NEW_OTHER=$((NEW_OTHER + 1)); echo "  + $f" ;;
    esac
  done <<< "$UNTRACKED"

  echo ""
  echo "Untracked summary: src=$NEW_SRC test=$NEW_TEST epic=$NEW_EPIC doc=$NEW_DOC bench=$NEW_BENCH other=$NEW_OTHER"
fi

if [ "$MODIFIED_COUNT" -gt 0 ]; then
  echo ""
  echo "Modified (unstaged):"
  echo "$MODIFIED" | while IFS= read -r f; do
    [ -z "$f" ] && continue
    echo "  ~ $f"
  done
fi

# ── 存量技术债信号 ───────────────────────────────────────────────────────────
echo ""
echo "--- TECH DEBT SIGNALS ---"

DEBT_SIGNALS=0

# 1. 过期文档：docs/ 中引用的文件路径不存在
if [ -d "docs" ]; then
  STALE_REFS=0
  for md in docs/*.md docs/**/*.md; do
    [ -f "$md" ] || continue
    while IFS= read -r ref; do
      [ -z "$ref" ] && continue
      ref_path=$(echo "$ref" | sed 's/^(//' | sed 's/)$//' | sed 's/#.*//')
      [ -z "$ref_path" ] && continue
      ref_dir=$(dirname "$md")
      resolved="$ref_dir/$ref_path"
      if [[ "$ref_path" != http* ]] && [[ "$ref_path" != "#"* ]] && [ ! -e "$resolved" ] && [ ! -e "$ref_path" ]; then
        STALE_REFS=$((STALE_REFS + 1))
      fi
    done < <(grep -oE '\]\([^)]+\.(md|ts|js|json)\)' "$md" 2>/dev/null | sed 's/^\]//' | head -20 || true)
  done
  if [ "$STALE_REFS" -gt 0 ]; then
    echo "  [DEBT] $STALE_REFS broken doc references found"
    DEBT_SIGNALS=$((DEBT_SIGNALS + 1))
  fi
fi

# 2. Epic 状态不一致：README.md 标记 ✅ 但文件仍在 docs/epics/
if [ -f "docs/epics/README.md" ]; then
  STALE_EPICS=0
  for epic in docs/epics/epic-*.md; do
    [ -f "$epic" ] || continue
    epic_name=$(basename "$epic")
    epic_id=$(echo "$epic_name" | grep -oE 'epic-[a-z0-9]+' | head -1 || echo "")
    if [ -n "$epic_id" ] && grep -q "$epic_id.*Done\|$epic_id.*Archived\|$epic_id.*📦" "docs/epics/README.md" 2>/dev/null; then
      if ! grep -q "Status.*Done\|Status.*Complete\|✅.*Done" "$epic" 2>/dev/null; then
        STALE_EPICS=$((STALE_EPICS + 1))
        echo "  [DEBT] Epic $epic_name: README says Done but file status disagrees"
      fi
    fi
  done
fi

# 3. 源码中的 TODO/FIXME/HACK 统计
TODO_COUNT=$(grep -r "TODO\|FIXME\|HACK\|XXX" src/ --include="*.ts" -c 2>/dev/null | awk -F: '{s+=$2}END{print s+0}' || echo "0")
if [ "$TODO_COUNT" -gt 20 ]; then
  echo "  [DEBT] $TODO_COUNT TODO/FIXME/HACK markers in src/"
  DEBT_SIGNALS=$((DEBT_SIGNALS + 1))
fi

# 4. 测试文件中的 .skip / .todo 标记（精确匹配 vitest/jest API 调用）
SKIP_MATCHES=$(grep -rE '\b(it|test|describe)\.skip\b|\b(it|test)\.todo\b|\bxit\(|\bxdescribe\(' tests/ --include="*.test.ts" 2>/dev/null || true)
if [ -z "$SKIP_MATCHES" ]; then SKIP_TESTS=0; else SKIP_TESTS=$(echo "$SKIP_MATCHES" | wc -l | tr -d ' '); fi
if [ "$SKIP_TESTS" -gt 0 ]; then
  echo "  [DEBT] $SKIP_TESTS skipped/todo tests found"
  DEBT_SIGNALS=$((DEBT_SIGNALS + 1))
fi

# 5. SOURCE_MAP.md 新鲜度：检查是否有新增的 src/ 文件未在 SOURCE_MAP 中
if [ -f "docs/SOURCE_MAP.md" ]; then
  UNMAPPED=0
  for ts_file in $(git ls-files 'src/**/*.ts' 2>/dev/null | head -100); do
    base=$(basename "$ts_file")
    if ! grep -q "$base" "docs/SOURCE_MAP.md" 2>/dev/null; then
      UNMAPPED=$((UNMAPPED + 1))
    fi
  done
  if [ "$UNMAPPED" -gt 3 ]; then
    echo "  [DEBT] $UNMAPPED source files not in SOURCE_MAP.md"
    DEBT_SIGNALS=$((DEBT_SIGNALS + 1))
  fi
fi

if [ "$DEBT_SIGNALS" -eq 0 ]; then
  echo "  No tech debt signals detected"
fi

# ── 摘要 ─────────────────────────────────────────────────────────────────────
echo ""
echo "--- DELTA SUMMARY ---"

if [ -n "$DIFF_FILES" ]; then TOTAL_COMMITTED=$(echo "$DIFF_FILES" | wc -l | tr -d ' '); else TOTAL_COMMITTED=0; fi
TOTAL_UNCOMMITTED=$((STAGED_COUNT + MODIFIED_COUNT + UNTRACKED_COUNT))

echo "Committed changes: $TOTAL_COMMITTED files"
echo "Uncommitted changes: $TOTAL_UNCOMMITTED files"
echo "Tech debt signals: $DEBT_SIGNALS"

if [ "$TOTAL_UNCOMMITTED" -gt 0 ] || [ "$TOTAL_COMMITTED" -gt 0 ]; then
  echo ""
  echo "ACTION: Review changes above and incorporate into AI Loop fix list"
fi

echo ""
echo "=== END DELTA SCAN ==="
