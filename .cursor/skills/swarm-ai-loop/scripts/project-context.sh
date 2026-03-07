#!/usr/bin/env bash
# project-context.sh — 提取项目当前状态摘要（节省 Context Window）
# 输出：结构化文本，供 AI 快速了解项目状态，无需读取大量文件
#
# 用法：bash scripts/project-context.sh [project-root]
#   project-root  项目根目录（默认：当前目录）

set -euo pipefail

PROJECT="${1:-$(pwd)}"
cd "$PROJECT"

echo "=== SWARM PROJECT CONTEXT ==="
echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Path: $PROJECT"
echo ""

# ── Git 状态 ────────────────────────────────────────────────────────────────
echo "--- GIT STATUS ---"
echo "Branch: $(git branch --show-current 2>/dev/null || echo 'unknown')"
echo "Last commit: $(git log -1 --format='%h %s (%ar)' 2>/dev/null || echo 'none')"
echo ""
echo "Modified files (M = modified, ?? = untracked):"
git status --short 2>/dev/null | head -30
echo ""

# ── 活跃开发板块（通过 git diff 判断） ────────────────────────────────────
echo "--- ACTIVE DEVELOPMENT AREAS ---"
echo "Files changed since last commit:"
git diff --name-only HEAD 2>/dev/null | head -20 || echo "(none)"
echo ""
echo "Untracked source files:"
git status --short 2>/dev/null | grep "^??" | grep "src/" | awk '{print $2}' | head -10 || true
echo ""

# ── 构建状态 ────────────────────────────────────────────────────────────────
echo "--- BUILD STATUS ---"
if [ -d "dist" ]; then
  DIST_COUNT=$(find dist -name "*.js" | wc -l | tr -d ' ')
  DIST_LATEST=$(find dist -name "*.js" -newer package.json 2>/dev/null | wc -l | tr -d ' ')
  echo "dist/ exists: $DIST_COUNT .js files"
  echo "Files newer than package.json: $DIST_LATEST (0 = may need rebuild)"
else
  echo "dist/ NOT FOUND — run: npm run build"
fi
echo ""

# ── 测试状态 ────────────────────────────────────────────────────────────────
echo "--- TEST FILES ---"
TEST_COUNT=$(find tests -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "Test files: $TEST_COUNT"
find tests -name "*.test.ts" 2>/dev/null | sed 's|tests/||' | sort | head -20
echo ""

# ── .swarm 目录状态 ─────────────────────────────────────────────────────────
echo "--- .SWARM DIRECTORY ---"
if [ -d ".swarm" ]; then
  echo "Exists: yes"
  # 数据库大小
  for db in sessions mail trace metrics merge constraint-library bench; do
    if [ -f ".swarm/${db}.db" ]; then
      SIZE=$(du -sh ".swarm/${db}.db" 2>/dev/null | cut -f1)
      echo "  ${db}.db: $SIZE"
    fi
  done
  # 计划数量
  PLAN_COUNT=$(ls .swarm/plans/*.md 2>/dev/null | wc -l | tr -d ' ')
  echo "  plans: $PLAN_COUNT"
  # Scout 报告数量
  SCOUT_COUNT=$(ls .swarm/scouts/ 2>/dev/null | wc -l | tr -d ' ')
  echo "  scout reports: $SCOUT_COUNT"
else
  echo "Exists: no — run: swarm init"
fi
echo ""

# ── report.md 摘要 ──────────────────────────────────────────────────────────
echo "--- REPORT.MD SUMMARY ---"
if [ -f "report.md" ]; then
  # 提取最新轮次的结论
  echo "Last updated: $(head -5 report.md | grep '生成时间\|Generated' | head -1)"
  echo "Known open issues:"
  grep -E "^- ⚠️|^- ❌|^\| .*❌" report.md 2>/dev/null | head -10 || echo "  (none found)"
else
  echo "report.md: NOT FOUND"
fi
echo ""

# ── 文档结构状态 ──────────────────────────────────────────────────────────
echo "--- DOCS STRUCTURE STATUS ---"
echo "Core docs:"
for doc in ARCHITECTURE.md SOURCE_MAP.md CONVENTIONS.md; do
  if [ -f "docs/$doc" ]; then
    echo "  ✅ docs/$doc"
  else
    echo "  ❌ docs/$doc (MISSING)"
  fi
done
echo ""
echo "Design docs:"
ls docs/design-docs/ 2>/dev/null | grep "\.md$" | sed 's/^/  /' || echo "  (none)"
echo ""
echo "Exec plans (active):"
ls docs/exec-plans/active/ 2>/dev/null | grep "\.md$" | sed 's/^/  /' || echo "  (none)"
echo "Exec plans (completed):"
ls docs/exec-plans/completed/ 2>/dev/null | grep "\.md$" | wc -l | tr -d ' ' | xargs -I{} echo "  {} completed plans"
echo ""
echo "Active epics:"
ls docs/epics/next/ 2>/dev/null | grep "\.md$" | grep -v README | sed 's/^/  /' | head -10 || echo "  (none)"
echo ""
echo "Archive:"
if [ -d "docs/archive" ]; then
  ARCHIVED_EPICS=$(ls docs/archive/epics/ 2>/dev/null | grep "\.md$" | wc -l | tr -d ' ')
  echo "  $ARCHIVED_EPICS archived epic files"
else
  echo "  docs/archive/: NOT FOUND"
fi
echo ""

# ── 依赖状态 ────────────────────────────────────────────────────────────────
echo "--- DEPENDENCIES ---"
NODE_VER=$(node --version 2>/dev/null || echo "not found")
NPM_VER=$(npm --version 2>/dev/null || echo "not found")
echo "Node: $NODE_VER"
echo "npm: $NPM_VER"
OUTDATED_JSON=$(npm outdated --json 2>/dev/null || echo "{}")
OUTDATED=$(echo "$OUTDATED_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo "?")
echo "Outdated packages: $OUTDATED"
echo ""

echo "=== END CONTEXT ==="
