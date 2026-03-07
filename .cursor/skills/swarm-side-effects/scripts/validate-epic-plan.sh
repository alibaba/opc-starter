#!/usr/bin/env bash
# validate-epic-plan.sh — 验证 Epic 计划是否符合 Anti-Memory-Wall 原则
#
# 扫描 Epic 计划文件（Markdown），检查每个 Task 的合规性：
#   - 有复杂度标注 (S/M/L/XL)
#   - 有 "Files to Read First" 且 ≤ 8 个文件
#   - 有验收标准（含可执行命令）
#   - 自包含上下文（背景描述充分）
#   - 有执行步骤
#   - 涉及文件 ≤ 5 个
#   - 无跨 Task 内容依赖
#
# 用法：bash .cursor/skills/swarm-side-effects/scripts/validate-epic-plan.sh <epic-file>
#
# 输出：每个 Task 的评分 + 总体判定（PASS / ACCEPTABLE / NEEDS WORK）

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "用法: $0 <epic-file>"
  echo "示例: $0 docs/epics/epic-26-provider.md"
  exit 1
fi

EPIC_FILE="$1"

if [ ! -f "$EPIC_FILE" ]; then
  echo "ERROR: Epic file not found: $EPIC_FILE"
  exit 1
fi

echo "=== EPIC PLAN VALIDATION ==="
echo "File: $EPIC_FILE"
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

python3 - "$EPIC_FILE" << 'PYEOF'
import re
import sys

epic_file = sys.argv[1]

with open(epic_file, 'r') as f:
    content = f.read()

task_pattern = re.compile(
    r'(###\s+Task\s+[\w-]+\s*[：:]\s*.+?)(?=\n###\s+Task|\n##\s|\Z)',
    re.DOTALL
)

tasks = []
for match in task_pattern.finditer(content):
    task_text = match.group(0)
    header = task_text.split('\n')[0]
    title_match = re.match(r'###\s+Task\s+([\w-]+)\s*[：:]\s*(.+)', header)
    task_id = title_match.group(1) if title_match else "unknown"
    task_title = title_match.group(2).strip() if title_match else "unknown"
    tasks.append({'id': task_id, 'title': task_title, 'text': task_text})

if not tasks:
    alt_pattern = re.compile(
        r'(###\s+(?:T\d+|Task\s*\d+)[：:\s]+.+?)(?=\n###|\n##\s|\Z)',
        re.DOTALL
    )
    for match in alt_pattern.finditer(content):
        task_text = match.group(0)
        header = task_text.split('\n')[0]
        tid_match = re.search(r'(T\d+|Task\s*\d+)', header)
        task_id = tid_match.group(1) if tid_match else "unknown"
        task_title = re.sub(r'###\s+(?:T\d+|Task\s*\d+)[：:\s]+', '', header).strip()
        tasks.append({'id': task_id, 'title': task_title, 'text': task_text})

if not tasks:
    print("⚠️  No tasks found in the Epic file.")
    print("   Expected: ### Task [Epic]-[N]: [Title]")
    print("\n=== VALIDATION RESULT: NO TASKS FOUND ===")
    sys.exit(0)

print(f"Found {len(tasks)} task(s)\n")

total_score = 0
max_score = 0
issues = []
warnings = []

for task in tasks:
    text = task['text']
    tid = task['id']
    title = task['title']
    score = 0
    task_max = 6
    max_score += task_max

    print(f"--- Task {tid}: {title} ---")

    # 1: Complexity label
    cm = re.search(r'\*\*复杂度\*\*\s*[：:]\s*(S|M|L|XL)', text) or \
         re.search(r'复杂度[：:]\s*(S|M|L|XL)', text, re.IGNORECASE)
    if cm:
        print(f"  ✅ Complexity: {cm.group(1)}")
        score += 1
    else:
        issues.append(f"Task {tid}: 缺少复杂度标注")
        print("  ❌ Missing complexity label")

    # 2: Files to Read First
    fs = re.search(r'(?:Files to Read First|需要读取|阅读文件|前置文件)\s*\n(.*?)(?=\n####|\n###|\n##|\Z)',
                   text, re.DOTALL | re.IGNORECASE)
    if fs:
        fl = [l for l in fs.group(1).strip().split('\n') if re.match(r'\s*\d+\.|\s*-\s', l)]
        fc = len(fl)
        if fc <= 8:
            print(f"  ✅ Files to Read First: {fc}")
            score += 1
        else:
            warnings.append(f"Task {tid}: Files to Read First {fc} > 8")
            print(f"  ⚠️  Files to Read First: {fc} (>8)")
            score += 0.5
    else:
        issues.append(f"Task {tid}: 缺少 Files to Read First")
        print("  ❌ Missing Files to Read First")

    # 3: Acceptance criteria
    ac = re.search(r'(?:验收标准|Acceptance|验证|检查项)\s*\n(.*?)(?=\n####|\n###|\n##|\Z)',
                   text, re.DOTALL | re.IGNORECASE)
    if ac:
        cl = [l for l in ac.group(1).strip().split('\n') if re.match(r'\s*[-\d]', l)]
        has_cmd = any(re.search(r'npm|npx|bash|tsc|vitest|eslint|biome|type.?check|lint|build|test', l)
                      for l in cl)
        if cl and has_cmd:
            print(f"  ✅ Acceptance: {len(cl)} criteria with commands")
            score += 1
        elif cl:
            warnings.append(f"Task {tid}: 验收标准缺少可执行命令")
            print(f"  ⚠️  Acceptance: {len(cl)} criteria but no commands")
            score += 0.5
        else:
            issues.append(f"Task {tid}: 验收标准为空")
            print("  ❌ Empty acceptance criteria")
    else:
        issues.append(f"Task {tid}: 缺少验收标准")
        print("  ❌ Missing acceptance criteria")

    # 4: Self-contained context
    bg = re.search(r'(?:背景上下文|Background|背景|上下文)\s*\n', text, re.IGNORECASE)
    wc = len(text.split())
    if bg or wc > 100:
        print(f"  ✅ Self-contained ({wc} words)")
        score += 1
    else:
        warnings.append(f"Task {tid}: 描述仅 {wc} 词")
        print(f"  ⚠️  Brief ({wc} words)")
        score += 0.5

    # 5: Execution steps
    st = re.search(r'(?:执行步骤|Steps|步骤|实现步骤)\s*\n(.*?)(?=\n####|\n###|\n##|\Z)',
                   text, re.DOTALL | re.IGNORECASE)
    if st:
        sl = [l for l in st.group(1).strip().split('\n') if re.match(r'\s*\d+\.', l)]
        if sl:
            print(f"  ✅ Steps: {len(sl)}")
            score += 1
        else:
            warnings.append(f"Task {tid}: 步骤格式不规范")
            print("  ⚠️  Steps section but no numbered steps")
            score += 0.5
    else:
        issues.append(f"Task {tid}: 缺少执行步骤")
        print("  ❌ Missing execution steps")

    # 6: File scope
    mf = list(set(re.findall(r'`([^`]+\.(?:ts|tsx|js|jsx|css|sql|md|json|yaml))`', text)))
    if len(mf) <= 5:
        print(f"  ✅ File scope: {len(mf)}")
        score += 1
    elif len(mf) <= 8:
        warnings.append(f"Task {tid}: {len(mf)} 文件接近上限")
        print(f"  ⚠️  File scope: {len(mf)} (near limit)")
        score += 0.5
    else:
        issues.append(f"Task {tid}: {len(mf)} 文件超出限制")
        print(f"  ❌ File scope: {len(mf)} (exceeds limit)")

    total_score += score
    pct = int(score / task_max * 100)
    print(f"  Score: {score}/{task_max} ({pct}%)\n")

# Cross-task check
print("--- CROSS-TASK DEPENDENCY CHECK ---")
dep_found = False
task_ids = {t['id'] for t in tasks}
for task in tasks:
    refs = set(re.findall(r'Task\s+([\w-]+)', task['text'])) - {task['id']}
    ext = refs & task_ids
    if ext:
        dep_found = True
        warnings.append(f"Task {task['id']}: references {', '.join(ext)}")
        print(f"  ⚠️  Task {task['id']} → {', '.join(ext)} (verify completion-only dep)")
if not dep_found:
    print("  ✅ No cross-task references")

# Summary
print(f"\n--- VALIDATION SUMMARY ---")
pct = int(total_score / max_score * 100) if max_score > 0 else 0
print(f"Score: {total_score}/{max_score} ({pct}%)")
print(f"Tasks: {len(tasks)}")
if issues:
    print(f"\nIssues ({len(issues)}):")
    for i in issues: print(f"  ❌ {i}")
if warnings:
    print(f"\nWarnings ({len(warnings)}):")
    for w in warnings: print(f"  ⚠️  {w}")

if pct >= 90:
    print("\n✅ PASS — ready for dispatch")
elif pct >= 70:
    print("\n⚠️  ACCEPTABLE — fix warnings before dispatch")
else:
    print("\n❌ NEEDS WORK — address issues before dispatch")

print("\n=== END VALIDATION ===")
PYEOF
