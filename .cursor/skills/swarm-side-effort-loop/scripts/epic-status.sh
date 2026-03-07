#!/usr/bin/env bash
# epic-status.sh — Epic 生命周期状态追踪
#
# 解析 docs/Epics.yaml + 活跃 Epic 文件，输出当前项目的 Epic 全景。
# 用于外循环 Phase ① INTAKE 的需求接入决策。
#
# 用法：bash .cursor/skills/swarm-side-effort-loop/scripts/epic-status.sh [project-root]
#
# 输出：
#   - Backlog / Active / Archived 统计
#   - 活跃 Epic 详情
#   - Backlog 需求清单
#   - WIP 过载警告

set -euo pipefail

PROJECT="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$PROJECT"

echo "=== EPIC STATUS ==="
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ── 1. 解析 Epics.yaml ────────────────────────────────────────────────────────
EPICS_FILE=""
for candidate in "docs/Epics.yaml" "docs/Epics.yml" "Epics.yaml" "Epics.yml"; do
  if [ -f "$candidate" ]; then
    EPICS_FILE="$candidate"
    break
  fi
done

if [ -n "$EPICS_FILE" ]; then
  echo "Source: $EPICS_FILE"
  echo ""

  python3 - "$EPICS_FILE" << 'PYEOF'
import sys
import re

epics_file = sys.argv[1]

with open(epics_file, 'r') as f:
    content = f.read()

# Simple YAML-like parsing (avoids PyYAML dependency)
def extract_list_items(content, key):
    pattern = re.compile(rf'^{key}:\s*\n((?:\s+-\s+.*\n(?:\s+\w+:.*\n)*)*)', re.MULTILINE)
    match = pattern.search(content)
    if not match:
        # Check for empty list
        if re.search(rf'^{key}:\s*\[\]', content, re.MULTILINE):
            return []
        return None

    block = match.group(1)
    items = []
    current = {}
    for line in block.split('\n'):
        line = line.rstrip()
        if not line.strip():
            continue
        item_match = re.match(r'\s+-\s+(\w+):\s*"?([^"]*)"?', line)
        if item_match:
            if re.match(r'\s+-\s', line) and current:
                items.append(current)
                current = {}
            current[item_match.group(1)] = item_match.group(2).strip('"')
        elif re.match(r'\s+(\w+):\s*"?([^"]*)"?', line):
            kv = re.match(r'\s+(\w+):\s*"?([^"]*)"?', line)
            if kv:
                current[kv.group(1)] = kv.group(2).strip('"')
    if current:
        items.append(current)
    return items

active = extract_list_items(content, 'epics_active')
backlog = extract_list_items(content, 'epics_backlog')
archived = extract_list_items(content, 'epics_archived')

active_count = len(active) if active else 0
backlog_count = len(backlog) if backlog else 0
archived_count = len(archived) if archived else 0

print("--- OVERVIEW ---")
print(f"Active:   {active_count}")
print(f"Backlog:  {backlog_count}")
print(f"Archived: {archived_count}")
print()

if active_count > 5:
    print(f"⚠️  WIP OVERLOAD: {active_count} active Epics (max recommended: 5)")
    print("   Consider completing existing Epics before starting new ones.")
    print()

if active:
    print("--- ACTIVE EPICS ---")
    for e in active:
        eid = e.get('id', '?')
        name = e.get('name', '?')
        status = e.get('status', '?')
        print(f"  [{eid}] {name} — {status}")
    print()

if backlog:
    print("--- BACKLOG ---")
    for e in backlog:
        eid = e.get('id', '?')
        name = e.get('name', '?')
        desc = e.get('description', '')
        status = e.get('status', 'planned')
        print(f"  [{eid}] {name}")
        if desc:
            print(f"         {desc}")
    print()

if archived:
    print("--- RECENTLY ARCHIVED ---")
    shown = 0
    for e in reversed(archived):
        if shown >= 5:
            remaining = len(archived) - 5
            if remaining > 0:
                print(f"  ... and {remaining} more")
            break
        eid = e.get('id', '?')
        name = e.get('name', '?')
        completed = e.get('completed', '?')
        print(f"  [{eid}] {name} (completed: {completed})")
        shown += 1
    print()

# Statistics
stats_match = re.search(r'statistics:\s*\n((?:\s+\w+:.*\n)*)', content)
if stats_match:
    print("--- STATISTICS ---")
    for line in stats_match.group(1).strip().split('\n'):
        line = line.strip()
        if line and not line.startswith('#'):
            print(f"  {line}")
    print()
PYEOF

else
  echo "⚠️  No Epics.yaml found"
  echo "   Expected at: docs/Epics.yaml"
  echo ""
fi

# ── 2. 扫描活跃 Epic 文件 ────────────────────────────────────────────────────
echo "--- EPIC FILES ---"

EPIC_DIR=""
for candidate in "docs/epics" "epics"; do
  if [ -d "$candidate" ]; then
    EPIC_DIR="$candidate"
    break
  fi
done

if [ -n "$EPIC_DIR" ]; then
  EPIC_FILES=$(find "$EPIC_DIR" -name "epic-*.md" -o -name "Epic-*.md" 2>/dev/null | sort)
  if [ -n "$EPIC_FILES" ]; then
    FILE_COUNT=$(echo "$EPIC_FILES" | wc -l | tr -d ' ')
    echo "Found $FILE_COUNT Epic file(s) in $EPIC_DIR/:"
    echo "$EPIC_FILES" | while IFS= read -r f; do
      [ -z "$f" ] && continue
      LINES=$(wc -l < "$f" 2>/dev/null | tr -d ' ')
      STATUS="?"
      if head -20 "$f" | grep -qi "status.*done\|status.*complete\|✅.*done" 2>/dev/null; then
        STATUS="✅ Done"
      elif head -20 "$f" | grep -qi "status.*active\|status.*progress" 2>/dev/null; then
        STATUS="🔄 Active"
      elif head -20 "$f" | grep -qi "status.*plan\|status.*draft" 2>/dev/null; then
        STATUS="📋 Planned"
      fi
      echo "  $f ($LINES lines) — $STATUS"
    done
  else
    echo "  No Epic files in $EPIC_DIR/"
  fi
else
  echo "  No epics directory found"
fi

echo ""

# ── 3. 执行计划文件 ──────────────────────────────────────────────────────────
PLAN_DIR=""
for candidate in "docs/exec-plans/active" "docs/exec-plans" "exec-plans"; do
  if [ -d "$candidate" ]; then
    PLAN_DIR="$candidate"
    break
  fi
done

if [ -n "$PLAN_DIR" ]; then
  PLAN_FILES=$(find "$PLAN_DIR" -name "*.md" 2>/dev/null | sort)
  if [ -n "$PLAN_FILES" ]; then
    echo "--- EXECUTION PLANS ---"
    echo "$PLAN_FILES" | while IFS= read -r f; do
      [ -z "$f" ] && continue
      echo "  $f"
    done
    echo ""
  fi
fi

# ── 4. 建议 ──────────────────────────────────────────────────────────────────
echo "--- RECOMMENDATIONS ---"

ACTIVE_COUNT=0
if [ -n "$EPIC_DIR" ]; then
  ACTIVE_COUNT=$(find "$EPIC_DIR" -name "epic-*.md" -exec head -20 {} \; 2>/dev/null | grep -ci "status.*active\|status.*progress" || echo "0")
fi

if [ "$ACTIVE_COUNT" -gt 3 ]; then
  echo "  ⚠️  $ACTIVE_COUNT active Epics — finish before adding new ones"
elif [ "$ACTIVE_COUNT" -eq 0 ]; then
  echo "  ✅ No active Epics — ready to pick up new work from backlog"
else
  echo "  ✅ $ACTIVE_COUNT active Epic(s) — manageable WIP"
fi

echo ""
echo "=== END EPIC STATUS ==="
