#!/usr/bin/env bash
# quick-status.sh — 一键项目状态 + 行动清单（v11 Assess Phase）
#
# v11 升级：集成 Git Delta Scan，自动识别自上次 AI Loop Tag 以来的变动，
# 将外循环引入的新复杂度纳入行动清单。
#
# 用法：bash .cursor/skills/swarm-ai-loop/scripts/quick-status.sh [project-root]

set -euo pipefail

PROJECT="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$PROJECT"

REPORT="$PROJECT/report.md"
EXT_REPORT="$PROJECT/swarm-run-report.md"
SCRIPTS_DIR="$(dirname "$0")"

echo "=== QUICK STATUS (v11) ==="
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ── Build gate (fast fail) ────────────────────────────────────────────────────
BUILD_OK=true; TC_OK=true
npm run build 2>&1 >/dev/null || BUILD_OK=false
npm run typecheck 2>&1 >/dev/null || TC_OK=false

if ! $BUILD_OK; then echo "BUILD: ❌ FAIL — fix before proceeding"; fi
if ! $TC_OK; then echo "TYPECHECK: ❌ FAIL — fix before proceeding"; fi
if $BUILD_OK && $TC_OK; then echo "Build+Typecheck: ✅ PASS"; fi
echo ""

# ── Git context ──────────────────────────────────────────────────────────────
echo "Branch: $(git branch --show-current 2>/dev/null || echo 'detached')"
DIRTY=$(git status --short 2>/dev/null | wc -l | tr -d ' ')
echo "Uncommitted: $DIRTY file(s)"

LAST_TAG=$(git tag --sort=-creatordate --list 'ai-loop-*' 2>/dev/null | head -1 || echo "")
if [ -z "$LAST_TAG" ]; then
  LAST_TAG=$(git tag --sort=-creatordate 2>/dev/null | head -1 || echo "")
fi
if [ -n "$LAST_TAG" ]; then
  COMMITS_SINCE=$(git rev-list "$LAST_TAG"..HEAD --count 2>/dev/null || echo "?")
  echo "Last AI Loop Tag: $LAST_TAG (+$COMMITS_SINCE commits)"
else
  echo "Last AI Loop Tag: NONE (first loop — will scan all uncommitted)"
fi
echo ""

# ── Git Delta Summary (v11 新增) ─────────────────────────────────────────────
echo "--- DELTA SUMMARY ---"

if [ -n "$LAST_TAG" ]; then
  BASE_REF="$LAST_TAG"
else
  BASE_REF=$(git rev-list --max-parents=0 HEAD 2>/dev/null | head -1 || echo "HEAD~30")
fi

COMMITTED_FILES=$(git diff --name-only "$BASE_REF"..HEAD 2>/dev/null || echo "")
UNTRACKED_FILES=$(git ls-files --others --exclude-standard 2>/dev/null || echo "")
MODIFIED_FILES=$(git diff --name-only 2>/dev/null || echo "")

count_category() {
  local pattern="$1" files="$2"
  echo "$files" | grep -c "^$pattern" 2>/dev/null || echo "0"
}

C_SRC=$(count_category "src/" "$COMMITTED_FILES")
C_TEST=$(count_category "tests/" "$COMMITTED_FILES")
C_DOC=$(count_category "docs/" "$COMMITTED_FILES")
C_BENCH=$(count_category "benchmarks/" "$COMMITTED_FILES")

U_SRC=$(count_category "src/" "$UNTRACKED_FILES")
U_TEST=$(count_category "tests/" "$UNTRACKED_FILES")
U_DOC=$(count_category "docs/" "$UNTRACKED_FILES")
U_BENCH=$(count_category "benchmarks/" "$UNTRACKED_FILES")

M_SRC=$(count_category "src/" "$MODIFIED_FILES")
M_TEST=$(count_category "tests/" "$MODIFIED_FILES")

echo "Committed: src=$C_SRC test=$C_TEST doc=$C_DOC bench=$C_BENCH"
echo "Untracked: src=$U_SRC test=$U_TEST doc=$U_DOC bench=$U_BENCH"
echo "Modified:  src=$M_SRC test=$M_TEST"

# New files that need review
NEW_SRC_FILES=$(echo "$UNTRACKED_FILES" | grep "^src/" 2>/dev/null || true)
NEW_TEST_FILES=$(echo "$UNTRACKED_FILES" | grep "^tests/" 2>/dev/null || true)
NEW_EPIC_FILES=$(echo "$UNTRACKED_FILES" | grep "^docs/epics/" 2>/dev/null || true)

if [ -n "$NEW_SRC_FILES" ]; then
  echo ""
  echo "New source files (need test coverage check):"
  echo "$NEW_SRC_FILES" | while IFS= read -r f; do [ -n "$f" ] && echo "  + $f"; done
fi

if [ -n "$NEW_EPIC_FILES" ]; then
  echo ""
  echo "New Epics (from outer loop):"
  echo "$NEW_EPIC_FILES" | while IFS= read -r f; do [ -n "$f" ] && echo "  + $f"; done
fi

echo ""

# ── Report analysis → action list ────────────────────────────────────────────
if [ -f "$REPORT" ]; then
  LINES=$(wc -l < "$REPORT" | tr -d ' ')
  if [ "$LINES" -gt 200 ]; then
    echo "⚠️  report.md is $LINES lines — ARCHIVE FIRST"
  fi

  python3 -c "
import re, sys

with open('$REPORT', 'r') as f:
    content = f.read()

round_match = re.search(r'第(.+?)轮', content)
round_str = round_match.group(0) if round_match else 'unknown'
print(f'Report: {round_str} ({$LINES} lines)')
print()

# Legacy items → action list
legacy = re.search(r'## 遗留问题与改进建议\s*\n(.*?)(?=\n##|\n---|\Z)', content, re.DOTALL)
actions_fix = []
actions_verify = []
actions_defer = []

if legacy:
    rows = [l for l in legacy.group(1).strip().split('\n')
            if l.startswith('|') and not l.startswith('|---') and not l.startswith('| #')]
    for row in rows:
        cols = [c.strip() for c in row.split('|')[1:-1]]
        if len(cols) < 5: continue
        num, issue, pri, age_str, status = cols[0], cols[1], cols[2], cols[3], cols[4] if len(cols)>4 else ''
        age = int(re.search(r'\d+', age_str).group()) if re.search(r'\d+', age_str) else 0
        if '✅' in status: continue
        if age >= 6 or 'P0' in pri or 'P1' in pri:
            actions_fix.append(f'  FIX #{num} [{pri}] age={age}: {issue}')
        elif age >= 3:
            actions_verify.append(f'  VERIFY #{num} [{pri}] age={age}: {issue}')
        else:
            actions_defer.append(f'  DEFER #{num} [{pri}] age={age}: {issue}')

# Next-round focus items (deduplicate against legacy items)
seen_issues = set()
for a in actions_fix + actions_verify + actions_defer:
    for word in re.findall(r'[\u4e00-\u9fff]+', a):
        if len(word) >= 4: seen_issues.add(word)

focus = re.search(r'### 下轮建议关注点.*?\n(.*?)(?=\n##|\Z)', content, re.DOTALL)
if focus:
    rows = [l for l in focus.group(1).strip().split('\n')
            if l.startswith('|') and not l.startswith('|---') and not l.startswith('| #')]
    for row in rows:
        cols = [c.strip() for c in row.split('|')[1:-1]]
        if len(cols) < 4: continue
        num, item, ftype, age_str = cols[0], cols[1], cols[2], cols[3]
        age = int(re.search(r'\d+', age_str).group()) if re.search(r'\d+', age_str) else 0
        is_dup = any(w in item for w in seen_issues if len(w) >= 4)
        if is_dup: continue
        if 'epic' in ftype.lower():
            actions_defer.append(f'  EPIC: {item}')
        elif age >= 3 or '修复' in ftype:
            entry = f'  FIX: {item} (age={age})'
            if entry not in actions_fix: actions_fix.append(entry)

# IHS
ihs_section = re.search(r'## 迭代健康度趋势\s*\n(.*?)(?=\n##|\n---|\Z)', content, re.DOTALL)
if ihs_section:
    rows = [l for l in ihs_section.group(1).strip().split('\n')
            if l.startswith('|') and 'R' in l and not l.startswith('|---')]
    if rows:
        last = rows[-1]
        cols = [c.strip() for c in last.split('|')[1:-1]]
        if len(cols) >= 2:
            print(f'IHS: {cols[1]}/100 ({cols[0]})')

# Epic tracking check
epic_section = re.search(r'### 长期 Epic 追踪\s*\n(.*?)(?=\n##|\n---|\Z)', content, re.DOTALL)
active_epics = 0
if epic_section:
    rows = [l for l in epic_section.group(1).strip().split('\n')
            if l.startswith('|') and not l.startswith('|---') and not l.startswith('| Epic')]
    for row in rows:
        cols = [c.strip() for c in row.split('|')[1:-1]]
        if len(cols) >= 3 and '✅' not in cols[2] and '📦' not in cols[2]:
            active_epics += 1
    if active_epics > 0:
        print(f'Active Epics: {active_epics}')

print()
print('--- ACTION LIST ---')
if actions_fix:
    print('MUST FIX this round:')
    for a in actions_fix: print(a)
if actions_verify:
    print('MUST VERIFY this round:')
    for a in actions_verify: print(a)
if actions_defer:
    print('Can defer / track:')
    for a in actions_defer: print(a)
if not actions_fix and not actions_verify and not actions_defer:
    print('No pending actions from report.md')
" 2>/dev/null || echo "(report parse failed)"
else
  echo "report.md: NOT FOUND"
fi

echo ""

# ── Outer-loop intake (v11 新增) ─────────────────────────────────────────────
echo "--- OUTER LOOP INTAKE ---"

INTAKE_ITEMS=0

# Check for new source files without corresponding tests
if [ -n "$NEW_SRC_FILES" ]; then
  echo "New source files need test coverage:"
  while IFS= read -r src_file; do
    [ -z "$src_file" ] && continue
    base=$(basename "$src_file" .ts)
    if ! find tests/ -name "${base}*.test.ts" -o -name "*${base}*.test.ts" 2>/dev/null | grep -q .; then
      echo "  [INTAKE] $src_file — no matching test file"
      INTAKE_ITEMS=$((INTAKE_ITEMS + 1))
    fi
  done <<< "$NEW_SRC_FILES"
fi

# Check for new Epic files that need integration
if [ -n "$NEW_EPIC_FILES" ]; then
  echo "New Epics need review and integration:"
  while IFS= read -r epic_file; do
    [ -z "$epic_file" ] && continue
    echo "  [INTAKE] $epic_file"
    INTAKE_ITEMS=$((INTAKE_ITEMS + 1))
  done <<< "$NEW_EPIC_FILES"
fi

# Check for modified files without test updates
if [ -n "$MODIFIED_FILES" ]; then
  MOD_SRC_NO_TEST=0
  while IFS= read -r mod_file; do
    [ -z "$mod_file" ] && continue
    case "$mod_file" in
      src/*.ts)
        base=$(basename "$mod_file" .ts)
        if ! echo "$MODIFIED_FILES" | grep -q "tests/.*${base}"; then
          MOD_SRC_NO_TEST=$((MOD_SRC_NO_TEST + 1))
        fi
        ;;
    esac
  done <<< "$MODIFIED_FILES"
  if [ "$MOD_SRC_NO_TEST" -gt 0 ]; then
    echo "  [INTAKE] $MOD_SRC_NO_TEST modified src files without corresponding test updates"
    INTAKE_ITEMS=$((INTAKE_ITEMS + 1))
  fi
fi

if [ "$INTAKE_ITEMS" -eq 0 ]; then
  echo "  No outer-loop intake items"
fi

echo ""

# ── External report quick scan ────────────────────────────────────────────────
if [ -f "$EXT_REPORT" ]; then
  EXT_LINES=$(wc -l < "$EXT_REPORT" | tr -d ' ')
  NEW_P01=$(python3 -c "
import re
with open('$EXT_REPORT') as f: content = f.read()
section = re.search(r'## 待改进项\s*\n(.*?)(?=\n##|\n---|\Z)', content, re.DOTALL)
if not section: print(0); exit()
rows = [l for l in section.group(1).strip().split('\n')
        if l.startswith('|') and not l.startswith('|---') and not l.startswith('| #')]
count = 0
for row in rows:
    cols = [c.strip() for c in row.split('|')[1:-1]]
    if len(cols) >= 4 and ('P0' in cols[2] or 'P1' in cols[2]) and '✅' not in cols[3] and '→' not in cols[3]:
        count += 1
print(count)
" 2>/dev/null || echo "0")
  if [ "$NEW_P01" -gt 0 ]; then
    echo "External report: $NEW_P01 P0/P1 item(s) need attention ($EXT_LINES lines)"
  else
    echo "External report: no urgent items ($EXT_LINES lines)"
  fi
else
  echo "External report: not found (skip)"
fi

echo ""
echo "=== END STATUS ==="
