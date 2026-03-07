#!/usr/bin/env bash
# archive-docs.sh — 将已完成的 Epic 文档归档（v11 修正路径）
#
# 扫描 docs/epics/ 中标记为 Done/Complete 的 epic，移动到 docs/archive/epics/。
# 同时更新 docs/epics/README.md 中的状态。
#
# 用法：bash scripts/archive-docs.sh [--dry-run]
#   --dry-run  只显示会归档哪些文件，不实际移动

set -euo pipefail

DRY_RUN=false
for arg in "$@"; do
  [ "$arg" = "--dry-run" ] && DRY_RUN=true
done

PROJECT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
EPICS_DIR="$PROJECT/docs/epics"
ARCHIVE_DIR="$PROJECT/docs/archive/epics"

if [ ! -d "$EPICS_DIR" ]; then
  echo "No docs/epics/ directory found."
  exit 0
fi

mkdir -p "$ARCHIVE_DIR"

ARCHIVED=0
SKIPPED=0

README_FILE="$EPICS_DIR/README.md"

for file in "$EPICS_DIR"/epic-*.md; do
  [ -f "$file" ] || continue
  filename=$(basename "$file")

  is_complete=false

  # Check epic file itself for completion markers
  if grep -qE "Status.*Done|Status.*Complete|✅.*Done|✅.*Complete|\*\*Status\*\*.*✅" "$file" 2>/dev/null; then
    is_complete=true
  fi

  # Also check README.md for completion markers
  if ! $is_complete && [ -f "$README_FILE" ]; then
    epic_id=$(echo "$filename" | grep -oE 'epic-[a-z0-9]+' | head -1 || echo "")
    if [ -n "$epic_id" ]; then
      if grep -qE "$epic_id.*✅|$epic_id.*Done|$epic_id.*Archived|$epic_id.*📦" "$README_FILE" 2>/dev/null; then
        is_complete=true
      fi
    fi
  fi

  if $is_complete; then
    if [ -f "$ARCHIVE_DIR/$filename" ]; then
      echo "Already archived: $filename (skipping)"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi

    if $DRY_RUN; then
      echo "[DRY-RUN] Would archive: $filename"
    else
      mv "$file" "$ARCHIVE_DIR/$filename"
      echo "Archived: $filename → docs/archive/epics/$filename"
    fi
    ARCHIVED=$((ARCHIVED + 1))
  else
    echo "Skipped (not complete): $filename"
    SKIPPED=$((SKIPPED + 1))
  fi
done

echo ""
echo "Summary: $ARCHIVED archived, $SKIPPED skipped"

if ! $DRY_RUN && [ $ARCHIVED -gt 0 ]; then
  echo ""
  echo "Next steps:"
  echo "  1. Review archived files in docs/archive/epics/"
  echo "  2. Update docs/epics/README.md — move archived epics to '已完成 Epic' section"
  echo "  3. Update docs/archive/README.md if needed"
  echo "  4. git add docs/ && git commit -m 'docs: archive completed epics'"
fi
