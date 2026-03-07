#!/usr/bin/env bash
# codebase-investigate.sh — 自动化代码库调研（外循环 Phase ② INVESTIGATE）
#
# 给定关键词，扫描代码库找出相关源文件、类型、测试、依赖和约束，
# 输出结构化调研报告供 LLM 做任务拆解决策。
#
# 用法：bash .cursor/skills/swarm-side-effort-loop/scripts/codebase-investigate.sh <keyword> [project-root]
#
# 示例：
#   bash scripts/codebase-investigate.sh "provider"
#   bash scripts/codebase-investigate.sh "Agent Studio" /workspace/app
#
# 输出：
#   - 相关源文件清单（按匹配度排序）
#   - 相关类型/接口定义
#   - 相关测试文件
#   - 依赖信息
#   - AGENTS.md 约束
#   - 影响面摘要

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "用法: $0 <keyword> [project-root]"
  echo "示例: $0 provider /workspace/app"
  exit 1
fi

KEYWORD="$1"
PROJECT="${2:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$PROJECT"

# 自动检测 app/ 子目录结构
APP_DIR=""
SRC_DIR=""
if [ -d "app/src" ]; then
  APP_DIR="app"
  SRC_DIR="app/src"
elif [ -d "src" ]; then
  SRC_DIR="src"
fi

echo "=== CODEBASE INVESTIGATION ==="
echo "Keyword: $KEYWORD"
echo "Project: $PROJECT"
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ── 1. 源文件搜索 ─────────────────────────────────────────────────────────────
echo "--- RELATED SOURCE FILES ---"

if [ -n "$SRC_DIR" ]; then
  SRC_MATCHES=$(rg -l -i "$KEYWORD" "$SRC_DIR" --type ts --type tsx 2>/dev/null || \
                rg -l -i "$KEYWORD" "$SRC_DIR" -g '*.ts' -g '*.tsx' 2>/dev/null || echo "")
  if [ -n "$SRC_MATCHES" ]; then
    MATCH_COUNT=$(echo "$SRC_MATCHES" | wc -l | tr -d ' ')
    echo "Found $MATCH_COUNT source file(s) matching '$KEYWORD':"
    echo ""
    echo "$SRC_MATCHES" | while IFS= read -r f; do
      [ -z "$f" ] && continue
      LINES=$(wc -l < "$f" 2>/dev/null | tr -d ' ')
      HITS=$(rg -c -i "$KEYWORD" "$f" 2>/dev/null || echo "0")
      echo "  $f ($LINES lines, $HITS hits)"
    done
  else
    echo "  No source files match '$KEYWORD'"
  fi
else
  echo "  No src/ directory found"
fi

echo ""

# ── 2. 类型/接口定义 ───────────────────────────────────────────────────────────
echo "--- RELATED TYPES & INTERFACES ---"

if [ -n "$SRC_DIR" ]; then
  TYPE_DEFS=$(rg -n "^export (type|interface|enum) \w*${KEYWORD}\w*" "$SRC_DIR" -g '*.ts' -g '*.tsx' -i 2>/dev/null || true)
  if [ -n "$TYPE_DEFS" ]; then
    echo "$TYPE_DEFS" | head -20
  else
    echo "  No type/interface definitions match '$KEYWORD'"
  fi

  # 检查 types/ 目录
  TYPES_DIR=""
  if [ -d "$SRC_DIR/types" ]; then
    TYPES_DIR="$SRC_DIR/types"
  fi
  if [ -n "$TYPES_DIR" ]; then
    TYPE_FILES=$(rg -l -i "$KEYWORD" "$TYPES_DIR" -g '*.ts' 2>/dev/null || true)
    if [ -n "$TYPE_FILES" ]; then
      echo ""
      echo "Type files with matches:"
      echo "$TYPE_FILES" | while IFS= read -r f; do
        [ -z "$f" ] && continue
        echo "  $f"
      done
    fi
  fi
fi

echo ""

# ── 3. 相关测试 ─────────────────────────────────────────────────────────────
echo "--- RELATED TESTS ---"

TEST_MATCHES=""
# 在 src 内的 __tests__ 和独立 tests/ 目录中搜索
for test_dir in "$SRC_DIR" "tests"; do
  [ -d "$test_dir" ] || continue
  FOUND=$(rg -l -i "$KEYWORD" "$test_dir" -g '*.test.ts' -g '*.test.tsx' -g '*.spec.ts' -g '*.spec.tsx' 2>/dev/null || true)
  if [ -n "$FOUND" ]; then
    TEST_MATCHES="${TEST_MATCHES}${FOUND}\n"
  fi
done

if [ -n "$TEST_MATCHES" ]; then
  printf '%b' "$TEST_MATCHES" | sort -u | while IFS= read -r f; do
    [ -z "$f" ] && continue
    echo "  $f"
  done
else
  echo "  No test files match '$KEYWORD'"
fi

echo ""

# ── 4. 依赖分析 ─────────────────────────────────────────────────────────────
echo "--- DEPENDENCY INFO ---"

PKG_FILE=""
if [ -f "app/package.json" ]; then
  PKG_FILE="app/package.json"
elif [ -f "package.json" ]; then
  PKG_FILE="package.json"
fi

if [ -n "$PKG_FILE" ]; then
  KEYWORD_LOWER=$(echo "$KEYWORD" | tr '[:upper:]' '[:lower:]')
  DEP_MATCHES=$(python3 -c "
import json, sys
with open('$PKG_FILE') as f:
    pkg = json.load(f)
keyword = '$KEYWORD_LOWER'
for section in ['dependencies', 'devDependencies', 'peerDependencies']:
    deps = pkg.get(section, {})
    for name, ver in deps.items():
        if keyword in name.lower():
            print(f'  {section}: {name} @ {ver}')
" 2>/dev/null || echo "  (parse failed)")

  if [ -n "$DEP_MATCHES" ]; then
    echo "$DEP_MATCHES"
  else
    echo "  No matching dependencies for '$KEYWORD'"
  fi

  # import 链分析
  echo ""
  echo "Import chain (who imports related modules):"
  if [ -n "$SRC_MATCHES" ]; then
    echo "$SRC_MATCHES" | head -5 | while IFS= read -r src; do
      [ -z "$src" ] && continue
      BASE=$(basename "$src" | sed 's/\.[^.]*$//')
      IMPORTERS=$(rg -l "from.*['\"].*${BASE}['\"]" "$SRC_DIR" -g '*.ts' -g '*.tsx' 2>/dev/null | head -5 || true)
      if [ -n "$IMPORTERS" ]; then
        echo "  $src imported by:"
        echo "$IMPORTERS" | while IFS= read -r imp; do echo "    ← $imp"; done
      fi
    done
  fi
else
  echo "  No package.json found"
fi

echo ""

# ── 5. 数据模型 ─────────────────────────────────────────────────────────────
echo "--- DATA MODEL ---"

SQL_FILE=""
if [ -f "app/supabase/setup.sql" ]; then
  SQL_FILE="app/supabase/setup.sql"
elif [ -f "supabase/setup.sql" ]; then
  SQL_FILE="supabase/setup.sql"
fi

if [ -n "$SQL_FILE" ]; then
  SQL_MATCHES=$(rg -i "$KEYWORD" "$SQL_FILE" -n 2>/dev/null | head -10 || true)
  if [ -n "$SQL_MATCHES" ]; then
    echo "Matches in $SQL_FILE:"
    echo "$SQL_MATCHES"
  else
    echo "  No matches in SQL schema for '$KEYWORD'"
  fi
else
  echo "  No setup.sql found"
fi

echo ""

# ── 6. 文档引用 ─────────────────────────────────────────────────────────────
echo "--- DOCUMENTATION REFERENCES ---"

DOC_MATCHES=$(rg -l -i "$KEYWORD" docs/ -g '*.md' 2>/dev/null || true)
AGENTS_MATCH=$(rg -i "$KEYWORD" AGENTS.md -n 2>/dev/null | head -5 || true)

if [ -n "$DOC_MATCHES" ]; then
  echo "Documentation files:"
  echo "$DOC_MATCHES" | while IFS= read -r f; do
    [ -z "$f" ] && continue
    echo "  $f"
  done
fi

if [ -n "$AGENTS_MATCH" ]; then
  echo ""
  echo "AGENTS.md references:"
  echo "$AGENTS_MATCH"
fi

if [ -z "$DOC_MATCHES" ] && [ -z "$AGENTS_MATCH" ]; then
  echo "  No documentation matches for '$KEYWORD'"
fi

echo ""

# ── 7. 约束检查 ─────────────────────────────────────────────────────────────
echo "--- CONSTRAINTS & RISKS ---"

if [ -f "AGENTS.md" ]; then
  CONSTRAINTS=$(rg -A 1 "❌|禁止" AGENTS.md 2>/dev/null | head -20 || true)
  if [ -n "$CONSTRAINTS" ]; then
    echo "Project constraints (from AGENTS.md):"
    echo "$CONSTRAINTS"
  fi
fi

echo ""

# ── 8. 影响面摘要 ─────────────────────────────────────────────────────────────
echo "--- IMPACT SUMMARY ---"

SRC_COUNT=0
TEST_COUNT=0
DOC_COUNT=0
TYPE_COUNT=0

if [ -n "$SRC_MATCHES" ]; then SRC_COUNT=$(echo "$SRC_MATCHES" | wc -l | tr -d ' '); fi
if [ -n "$TEST_MATCHES" ]; then TEST_COUNT=$(printf '%b' "$TEST_MATCHES" | sort -u | grep -c . 2>/dev/null || echo "0"); fi
if [ -n "$DOC_MATCHES" ]; then DOC_COUNT=$(echo "$DOC_MATCHES" | wc -l | tr -d ' '); fi
if [ -n "$TYPE_DEFS" ]; then TYPE_COUNT=$(echo "$TYPE_DEFS" | wc -l | tr -d ' '); fi

echo "Related source files: $SRC_COUNT"
echo "Related test files: $TEST_COUNT"
echo "Related doc files: $DOC_COUNT"
echo "Type/interface definitions: $TYPE_COUNT"

if [ "$SRC_COUNT" -gt 15 ]; then
  echo ""
  echo "⚠️  High impact area ($SRC_COUNT files) — consider XL complexity or splitting into sub-investigations"
elif [ "$SRC_COUNT" -gt 8 ]; then
  echo ""
  echo "⚠️  Medium-high impact ($SRC_COUNT files) — likely L complexity"
elif [ "$SRC_COUNT" -gt 3 ]; then
  echo "Scope: moderate impact — likely M complexity"
else
  echo "Scope: contained — likely S complexity"
fi

if [ "$TEST_COUNT" -eq 0 ] && [ "$SRC_COUNT" -gt 0 ]; then
  echo "⚠️  No related tests found — test coverage gap"
fi

echo ""
echo "=== END INVESTIGATION ==="
