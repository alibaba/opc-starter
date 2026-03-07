#!/usr/bin/env bash
# analyze-report.sh — 解析 report.md，输出遗留项审判建议
#
# 自动提取遗留项的 age、优先级，根据老化规则生成审判建议。
# 替代 LLM 手动逐项分析，节省 Context Window。
#
# 用法：bash .cursor/skills/swarm-ai-loop/scripts/analyze-report.sh [project-root]
# 输出：结构化文本（~40 行），含遗留项审判建议 + 下轮关注点状态

set -euo pipefail

PROJECT="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
REPORT="$PROJECT/report.md"

if [ ! -f "$REPORT" ]; then
  echo "ERROR: report.md not found at $REPORT"
  exit 1
fi

echo "=== REPORT ANALYSIS ==="
echo "File: $REPORT"
echo "Lines: $(wc -l < "$REPORT" | tr -d ' ')"
echo ""

# ── 基本信息 ──────────────────────────────────────────────────────────────────
ROUND=$(grep -oE '第.+轮' "$REPORT" | head -1 || echo "unknown")
echo "Current round: $ROUND"

LINE_COUNT=$(wc -l < "$REPORT" | tr -d ' ')
if [ "$LINE_COUNT" -gt 200 ]; then
  echo "WARNING: report.md is $LINE_COUNT lines (>200), IMMEDIATE archival needed"
elif [ "$LINE_COUNT" -gt 150 ]; then
  echo "WARNING: report.md is $LINE_COUNT lines (>150), archival recommended next round"
else
  echo "Size: OK ($LINE_COUNT lines)"
fi
echo ""

# ── 遗留问题表解析 ────────────────────────────────────────────────────────────
echo "--- LEGACY ITEMS ---"
python3 -c "
import re, sys

with open('$REPORT', 'r') as f:
    content = f.read()

# Find the '遗留问题与改进建议' table
legacy_section = re.search(r'## 遗留问题与改进建议\s*\n(.*?)(?=\n##|\n---|\Z)', content, re.DOTALL)
if not legacy_section:
    print('No legacy items section found.')
    sys.exit(0)

lines = legacy_section.group(1).strip().split('\n')
table_rows = [l for l in lines if l.startswith('|') and not l.startswith('|---') and not l.startswith('| #')]

items = []
for row in table_rows:
    cols = [c.strip() for c in row.split('|')[1:-1]]
    if len(cols) >= 4:
        num, issue, priority, age_str = cols[0], cols[1], cols[2], cols[3]
        age = int(re.search(r'\d+', age_str).group()) if re.search(r'\d+', age_str) else 0
        items.append({'num': num, 'issue': issue, 'priority': priority, 'age': age})

if not items:
    print('No legacy items found in table.')
    sys.exit(0)

print(f'Found {len(items)} legacy item(s):')
print()

forced = 0
aging = 0
fresh = 0

for item in items:
    age = item['age']
    if age >= 6:
        verdict = 'MUST FIX (age >= 6, cannot defer)'
        forced += 1
    elif age >= 3:
        verdict = 'MUST INCLUDE in test plan (age >= 3)'
        aging += 1
    else:
        verdict = 'Can defer (with reason)'
        fresh += 1

    print(f'  #{item[\"num\"]} [{item[\"priority\"]}] age={age}: {item[\"issue\"]}')
    print(f'     -> {verdict}')

print()
print(f'Summary: {forced} forced, {aging} aging, {fresh} fresh')
if forced > 0:
    print('ACTION: Must fix all forced items this round!')
if aging > 0:
    print('ACTION: Must include aging items in test plan!')
" 2>/dev/null || echo "(python3 parse failed, check report.md format)"

echo ""

# ── 下轮建议关注点解析 ────────────────────────────────────────────────────────
echo "--- NEXT ROUND FOCUS ITEMS ---"
python3 -c "
import re, sys

with open('$REPORT', 'r') as f:
    content = f.read()

focus_section = re.search(r'### 下轮建议关注点.*?\n(.*?)(?=\n##|\Z)', content, re.DOTALL)
if not focus_section:
    print('No focus items section found.')
    sys.exit(0)

lines = focus_section.group(1).strip().split('\n')
table_rows = [l for l in lines if l.startswith('|') and not l.startswith('|---') and not l.startswith('| #')]

items = []
for row in table_rows:
    cols = [c.strip() for c in row.split('|')[1:-1]]
    if len(cols) >= 4:
        num, focus, ftype, age_str = cols[0], cols[1], cols[2], cols[3]
        age_match = re.search(r'\d+', age_str)
        age = int(age_match.group()) if age_match else 0
        is_epic = 'epic' in ftype.lower() or age_str.strip() == '—'
        items.append({'num': num, 'focus': focus, 'type': ftype, 'age': age, 'is_epic': is_epic})

if not items:
    print('No focus items found.')
    sys.exit(0)

print(f'Found {len(items)} focus item(s):')
print()

for item in items:
    if item['is_epic']:
        tag = '[Epic - track separately]'
    elif item['age'] >= 6:
        tag = '[MUST FIX this round]'
    elif item['age'] >= 3:
        tag = '[MUST INCLUDE in plan]'
    else:
        tag = '[Can defer]'

    print(f'  #{item[\"num\"]} [{item[\"type\"]}] age={item[\"age\"]}: {item[\"focus\"]}')
    print(f'     -> {tag}')
" 2>/dev/null || echo "(python3 parse failed, check report.md format)"

echo ""

# ── IHS 趋势 ─────────────────────────────────────────────────────────────────
echo "--- IHS TREND ---"
python3 -c "
import re

with open('$REPORT', 'r') as f:
    content = f.read()

ihs_section = re.search(r'## 迭代健康度趋势\s*\n(.*?)(?=\n##|\n---|\Z)', content, re.DOTALL)
if not ihs_section:
    print('No IHS trend section found.')
    exit(0)

lines = ihs_section.group(1).strip().split('\n')
table_rows = [l for l in lines if l.startswith('|') and 'R' in l and not l.startswith('|---')]

scores = []
for row in table_rows:
    cols = [c.strip() for c in row.split('|')[1:-1]]
    if len(cols) >= 2:
        try:
            ihs = int(cols[1])
            scores.append((cols[0], ihs, cols[-1] if len(cols) > 5 else ''))
        except ValueError:
            pass

if not scores:
    print('No IHS data found.')
    exit(0)

for rnd, ihs, verdict in scores:
    bar = '█' * (ihs // 5) + '░' * (20 - ihs // 5)
    print(f'  {rnd}: {ihs}/100 {bar} {verdict}')

if len(scores) >= 2:
    trend = scores[-1][1] - scores[-2][1]
    if trend > 2:
        print(f'  Trend: IMPROVING (+{trend})')
    elif trend < -2:
        print(f'  Trend: DECLINING ({trend})')
    else:
        print(f'  Trend: STABLE ({trend:+d})')

latest = scores[-1][1]
if latest >= 90:
    print('  Strategy: EXCELLENT — can push new features + consume age>=3 debt')
elif latest >= 75:
    print('  Strategy: GOOD — continue rhythm + consume age>=5 debt')
elif latest >= 60:
    print('  Strategy: WARNING — fix regressions first, pause new features')
else:
    print('  Strategy: DANGER — stop everything, focus on fixes')
" 2>/dev/null || echo "(python3 parse failed)"

echo ""
echo "=== END REPORT ANALYSIS ==="
