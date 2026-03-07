#!/usr/bin/env bash
# triage-external-report.sh — 解析 swarm-run-report.md，输出分流建议
#
# 识别新增/已修复/Epic 条目，根据优先级和复杂度给出分流建议。
# 替代 LLM 手动分析外部报告，节省 Context Window。
#
# 用法：bash .cursor/skills/swarm-ai-loop/scripts/triage-external-report.sh [project-root]
# 输出：结构化文本（~30 行），含分流建议 + 归档建议

set -euo pipefail

PROJECT="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
REPORT="$PROJECT/swarm-run-report.md"

if [ ! -f "$REPORT" ]; then
  echo "=== EXTERNAL REPORT TRIAGE ==="
  echo "Status: swarm-run-report.md NOT FOUND — skip Phase 1.5"
  echo "=== END TRIAGE ==="
  exit 0
fi

echo "=== EXTERNAL REPORT TRIAGE ==="
echo "File: $REPORT"
echo "Lines: $(wc -l < "$REPORT" | tr -d ' ')"
echo ""

python3 -c "
import re, sys

with open('$REPORT', 'r') as f:
    content = f.read()

# Parse the '待改进项' table
improve_section = re.search(r'## 待改进项\s*\n(.*?)(?=\n##|\n---|\Z)', content, re.DOTALL)
if not improve_section:
    print('No improvement items section found.')
    sys.exit(0)

lines = improve_section.group(1).strip().split('\n')
table_rows = [l for l in lines if l.startswith('|') and not l.startswith('|---') and not l.startswith('| #')]

fixed_items = []
epic_items = []
new_items = []
actionable_items = []

for row in table_rows:
    cols = [c.strip() for c in row.split('|')[1:-1]]
    if len(cols) < 4:
        continue

    num = cols[0]
    desc = cols[1]
    priority = cols[2] if len(cols) > 2 else ''
    status = cols[3] if len(cols) > 3 else ''

    is_strikethrough = '~~' in desc
    is_fixed = '✅' in status or is_strikethrough
    is_epic = 'Epic' in status or '→ Epic' in status

    item = {'num': num, 'desc': desc.replace('~~',''), 'priority': priority, 'status': status}

    if is_fixed:
        fixed_items.append(item)
    elif is_epic:
        epic_items.append(item)
    else:
        new_items.append(item)

# Parse test results for pass/fail summary
test_sections = re.findall(r'### 测试 \d+.*?\n(.*?)(?=\n###|\n##|\n---|\Z)', content, re.DOTALL)
test_pass = 0
test_fail = 0
for section in test_sections:
    if '✅' in section or 'PASSED' in section:
        test_pass += 1
    if '❌' in section or 'FAILED' in section:
        test_fail += 1

print(f'--- ITEM SUMMARY ---')
print(f'Fixed (ready to archive): {len(fixed_items)}')
for item in fixed_items:
    print(f'  #{item[\"num\"]} {item[\"desc\"]} [{item[\"status\"]}]')

print(f'')
print(f'Epic (already tracked): {len(epic_items)}')
for item in epic_items:
    print(f'  #{item[\"num\"]} {item[\"desc\"]} [{item[\"status\"]}]')

print(f'')
print(f'New/Open (needs triage): {len(new_items)}')
for item in new_items:
    p = item['priority']
    # Triage logic
    if 'P0' in p or 'P1' in p:
        action = '→ FIX THIS ROUND (high priority)'
    elif 'P2' in p:
        action = '→ FIX THIS ROUND if <=3 files, else → EPIC'
    else:
        action = '→ RECORD in report.md, defer'
    print(f'  #{item[\"num\"]} [{p}] {item[\"desc\"]}')
    print(f'     {action}')

print()
print(f'--- TEST RESULTS ---')
print(f'Tests passed: {test_pass}, Tests failed: {test_fail}')

print()
print(f'--- ACTIONS ---')
actions = []
if fixed_items:
    actions.append(f'Archive {len(fixed_items)} fixed item(s) to docs/swarm-run-report-archived.md')
if new_items:
    p01 = [i for i in new_items if 'P0' in i['priority'] or 'P1' in i['priority']]
    p2 = [i for i in new_items if 'P2' in i['priority']]
    if p01:
        actions.append(f'Fix {len(p01)} P0/P1 item(s) this round')
    if p2:
        actions.append(f'Triage {len(p2)} P2 item(s): fix if simple, else create Epic')
if not actions:
    actions.append('No action needed — all items tracked or archived')

for i, a in enumerate(actions, 1):
    print(f'  {i}. {a}')
" 2>/dev/null || echo "(python3 parse failed, check swarm-run-report.md format)"

# ── Line count check ──────────────────────────────────────────────────────────
echo ""
LINE_COUNT=$(wc -l < "$REPORT" | tr -d ' ')
if [ "$LINE_COUNT" -gt 100 ]; then
  echo "WARNING: swarm-run-report.md is $LINE_COUNT lines (>100), archive completed test records"
else
  echo "Size: OK ($LINE_COUNT lines)"
fi

echo ""
echo "=== END TRIAGE ==="
