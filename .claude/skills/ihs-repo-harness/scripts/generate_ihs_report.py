#!/usr/bin/env python3
"""
IHS (IDE Harness Score) report generator.

This script evaluates repository health for AI-assisted development and writes a
Markdown report to IHS.md.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[4]
APP_ROOT = REPO_ROOT / "app"

TRACKED_DOC_FILES = [
    "AGENTS.md",
    "README.md",
    "docs/Architecture.md",
    "docs/Epics.yaml",
    "app/README.md",
    "app/supabase/SUPABASE_COOKBOOK.md",
]

CODE_PREFIXES = ("app/src/", "app/supabase/functions/")
DOC_PREFIXES = ("docs/",)
TEST_PREFIXES = ("app/cypress/", "app/src/test/")

SOURCE_EXTS = {".ts", ".tsx", ".js", ".jsx"}
TEST_FILE_RE = re.compile(r"\.(test|spec)\.[jt]sx?$")
DEBT_RE = re.compile(r"\b(?:TODO|FIXME|HACK|XXX)\b")
ANY_RE = re.compile(r"\bany\b")
TS_IGNORE_RE = re.compile(r"@ts-ignore|@ts-nocheck")
ESLINT_DISABLE_RE = re.compile(r"eslint-disable")


@dataclass
class CommandResult:
    name: str
    command: str
    cwd: str
    returncode: int
    duration_seconds: float
    stdout: str
    stderr: str

    @property
    def status(self) -> str:
        return "pass" if self.returncode == 0 else "fail"


@dataclass
class SnapshotMetrics:
    source_files: int = 0
    test_files: int = 0
    source_loc: int = 0
    debt_markers: int = 0
    any_usage: int = 0
    ts_ignore: int = 0
    eslint_disable: int = 0
    large_files: int = 0
    doc_files_present: int = 0


def run_command(
    cmd: list[str], cwd: Path, timeout_seconds: int = 1800
) -> CommandResult:
    started = time.time()
    proc = subprocess.run(
        cmd,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        timeout=timeout_seconds,
        check=False,
    )
    ended = time.time()
    return CommandResult(
        name=cmd[0],
        command=" ".join(cmd),
        cwd=str(cwd),
        returncode=proc.returncode,
        duration_seconds=ended - started,
        stdout=proc.stdout.strip(),
        stderr=proc.stderr.strip(),
    )


def clamp_score(value: float) -> float:
    if value < 0:
        return 0.0
    if value > 100:
        return 100.0
    return round(value, 1)


def rel_posix(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def is_doc_path(path: str) -> bool:
    if path in TRACKED_DOC_FILES:
        return True
    return path.startswith(DOC_PREFIXES)


def is_test_path(path: str) -> bool:
    if path.startswith(TEST_PREFIXES):
        return True
    if "/__tests__/" in path:
        return True
    return bool(TEST_FILE_RE.search(path))


def is_source_path(path: str) -> bool:
    if not path.startswith(CODE_PREFIXES):
        return False
    if Path(path).suffix not in SOURCE_EXTS:
        return False
    return not is_test_path(path)


def count_non_empty_lines(content: str) -> int:
    return sum(1 for line in content.splitlines() if line.strip())


def update_metrics_from_text(metrics: SnapshotMetrics, path: str, text: str) -> None:
    if is_source_path(path):
        metrics.source_files += 1
        metrics.source_loc += count_non_empty_lines(text)
        metrics.debt_markers += len(DEBT_RE.findall(text))
        metrics.any_usage += len(ANY_RE.findall(text))
        metrics.ts_ignore += len(TS_IGNORE_RE.findall(text))
        metrics.eslint_disable += len(ESLINT_DISABLE_RE.findall(text))
        if len(text.splitlines()) > 400:
            metrics.large_files += 1
    elif is_test_path(path):
        if Path(path).suffix in SOURCE_EXTS:
            metrics.test_files += 1

    if path in TRACKED_DOC_FILES:
        metrics.doc_files_present += 1


def iter_current_text_files() -> Iterable[tuple[str, str]]:
    scan_roots = [
        REPO_ROOT / "app" / "src",
        REPO_ROOT / "app" / "supabase" / "functions",
        REPO_ROOT / "app" / "cypress",
    ]
    for root in scan_roots:
        if not root.exists():
            continue
        for file_path in root.rglob("*"):
            if not file_path.is_file():
                continue
            path = rel_posix(file_path)
            if file_path.suffix not in SOURCE_EXTS:
                continue
            try:
                text = file_path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            yield path, text

    for doc_path in TRACKED_DOC_FILES:
        abs_doc = REPO_ROOT / doc_path
        if not abs_doc.exists() or not abs_doc.is_file():
            continue
        try:
            text = abs_doc.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            text = ""
        yield doc_path, text


def collect_current_snapshot() -> SnapshotMetrics:
    metrics = SnapshotMetrics()
    for path, text in iter_current_text_files():
        update_metrics_from_text(metrics, path, text)
    return metrics


def collect_revision_snapshot(revision: str) -> SnapshotMetrics | None:
    list_res = run_command(
        [
            "git",
            "ls-tree",
            "-r",
            "--name-only",
            revision,
            "--",
            "app/src",
            "app/supabase/functions",
            "app/cypress",
            "docs",
            "AGENTS.md",
            "README.md",
            "app/README.md",
            "app/supabase/SUPABASE_COOKBOOK.md",
        ],
        cwd=REPO_ROOT,
        timeout_seconds=120,
    )
    if list_res.returncode != 0:
        return None

    files = [line.strip() for line in list_res.stdout.splitlines() if line.strip()]
    metrics = SnapshotMetrics()
    for path in files:
        suffix = Path(path).suffix
        if path not in TRACKED_DOC_FILES and suffix not in SOURCE_EXTS:
            continue
        show_res = run_command(
            ["git", "show", f"{revision}:{path}"],
            cwd=REPO_ROOT,
            timeout_seconds=120,
        )
        if show_res.returncode != 0:
            continue
        update_metrics_from_text(metrics, path, show_res.stdout)
    return metrics


def collect_doc_alignment(window_commits: int) -> dict[str, Any]:
    log_res = run_command(
        [
            "git",
            "log",
            f"-n{window_commits}",
            "--name-only",
            "--pretty=format:__COMMIT__",
        ],
        cwd=REPO_ROOT,
        timeout_seconds=120,
    )
    if log_res.returncode != 0:
        return {"code_commits": 0, "docs_commits": 0, "ratio": 0.0}

    code_commits = 0
    docs_commits = 0
    current_files: list[str] = []

    def flush_commit(files: list[str]) -> None:
        nonlocal code_commits, docs_commits
        if not files:
            return
        touched_code = any(path.startswith(CODE_PREFIXES) for path in files)
        touched_docs = any(is_doc_path(path) for path in files)
        if touched_code:
            code_commits += 1
        if touched_docs:
            docs_commits += 1

    for raw_line in log_res.stdout.splitlines():
        line = raw_line.strip()
        if line == "__COMMIT__":
            flush_commit(current_files)
            current_files = []
            continue
        if line:
            current_files.append(line)
    flush_commit(current_files)

    ratio = 1.0 if code_commits == 0 else docs_commits / code_commits
    return {
        "code_commits": code_commits,
        "docs_commits": docs_commits,
        "ratio": round(ratio, 3),
    }


def collect_doc_freshness() -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    detail: dict[str, float] = {}
    fresh_docs = 0
    present_docs = 0

    for doc in TRACKED_DOC_FILES:
        abs_doc = REPO_ROOT / doc
        if not abs_doc.exists():
            continue
        present_docs += 1
        last_commit_res = run_command(
            ["git", "log", "-1", "--format=%ct", "--", doc],
            cwd=REPO_ROOT,
            timeout_seconds=30,
        )
        if last_commit_res.returncode != 0 or not last_commit_res.stdout.strip():
            continue
        try:
            ts = int(last_commit_res.stdout.strip().splitlines()[-1])
        except ValueError:
            continue
        days_old = (now - datetime.fromtimestamp(ts, timezone.utc)).total_seconds() / 86400
        detail[doc] = round(days_old, 1)
        if days_old <= 120:
            fresh_docs += 1

    fresh_ratio = 1.0 if present_docs == 0 else fresh_docs / present_docs
    return {
        "present_docs": present_docs,
        "fresh_docs": fresh_docs,
        "fresh_ratio": round(fresh_ratio, 3),
        "days_old": detail,
    }


def parse_coverage_summary() -> dict[str, float] | None:
    coverage_file = APP_ROOT / "coverage" / "coverage-summary.json"
    if not coverage_file.exists():
        return None
    try:
        data = json.loads(coverage_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None

    total = data.get("total", {})
    lines = total.get("lines", {}).get("pct")
    statements = total.get("statements", {}).get("pct")
    branches = total.get("branches", {}).get("pct")
    functions = total.get("functions", {}).get("pct")

    def as_float(value: Any) -> float | None:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    parsed = {
        "lines": as_float(lines),
        "statements": as_float(statements),
        "branches": as_float(branches),
        "functions": as_float(functions),
    }
    if all(value is None for value in parsed.values()):
        return None
    return {k: round(v, 2) for k, v in parsed.items() if v is not None}


def run_runtime_checks(skip_runtime_checks: bool) -> dict[str, Any]:
    if skip_runtime_checks:
        return {
            "type_check": {"status": "skipped"},
            "unit_test": {"status": "skipped"},
            "coverage": {"status": "skipped"},
            "coverage_pct": None,
            "commands": [],
        }

    coverage_file = APP_ROOT / "coverage" / "coverage-summary.json"
    if coverage_file.exists():
        coverage_file.unlink()

    command_plan = [
        ("type_check", ["npm", "run", "type-check"]),
        ("unit_test", ["npm", "run", "test"]),
        ("coverage", ["npm", "run", "coverage", "--", "--coverage.reporter=json-summary"]),
    ]

    result: dict[str, Any] = {"commands": []}
    for key, cmd in command_plan:
        cmd_res = run_command(cmd, cwd=APP_ROOT, timeout_seconds=2400)
        result[key] = {
            "status": cmd_res.status,
            "returncode": cmd_res.returncode,
            "duration_seconds": round(cmd_res.duration_seconds, 2),
            "command": cmd_res.command,
            "cwd": cmd_res.cwd,
            "stdout_tail": "\n".join(cmd_res.stdout.splitlines()[-20:]),
            "stderr_tail": "\n".join(cmd_res.stderr.splitlines()[-20:]),
        }
        result["commands"].append(result[key])

    coverage = parse_coverage_summary()
    result["coverage_pct"] = coverage.get("lines") if coverage else None
    result["coverage_detail"] = coverage
    return result


def score_corrosion(snapshot: SnapshotMetrics) -> float:
    if snapshot.source_files == 0:
        return 0.0
    basis = snapshot.source_files
    debt_per_100 = (snapshot.debt_markers / basis) * 100
    any_per_100 = (snapshot.any_usage / basis) * 100
    ignore_per_100 = (snapshot.ts_ignore / basis) * 100
    eslint_per_100 = (snapshot.eslint_disable / basis) * 100
    large_per_100 = (snapshot.large_files / basis) * 100

    penalty = (
        min(28, debt_per_100 * 0.55)
        + min(22, any_per_100 * 0.35)
        + min(20, ignore_per_100 * 1.4)
        + min(12, eslint_per_100 * 0.35)
        + min(18, large_per_100 * 0.7)
    )
    return clamp_score(100 - penalty)


def score_test_ratio(snapshot: SnapshotMetrics) -> float:
    if snapshot.source_files == 0:
        return 0.0
    ratio = snapshot.test_files / snapshot.source_files
    return clamp_score(min(100, (ratio / 0.35) * 100))


def score_testing(snapshot: SnapshotMetrics, runtime: dict[str, Any]) -> float:
    ratio_score = score_test_ratio(snapshot)

    status_weights = []
    for key in ("type_check", "unit_test", "coverage"):
        status = runtime.get(key, {}).get("status")
        if status == "pass":
            status_weights.append(100)
        elif status == "skipped":
            status_weights.append(50)
        else:
            status_weights.append(0)
    runtime_status_score = sum(status_weights) / len(status_weights) if status_weights else 0

    coverage_status = runtime.get("coverage", {}).get("status")
    coverage_pct = runtime.get("coverage_pct")
    if coverage_status == "pass" and coverage_pct is not None:
        coverage_score = coverage_pct
    elif coverage_status == "pass":
        coverage_score = 75
    elif coverage_status == "skipped":
        coverage_score = 50
    else:
        coverage_score = 0

    total = 0.4 * ratio_score + 0.35 * runtime_status_score + 0.25 * coverage_score
    return clamp_score(total)


def score_documentation(
    snapshot: SnapshotMetrics,
    doc_alignment: dict[str, Any],
    doc_freshness: dict[str, Any],
) -> float:
    total_docs = len(TRACKED_DOC_FILES)
    presence_score = (snapshot.doc_files_present / total_docs) * 100 if total_docs else 0
    alignment_score = min(100, float(doc_alignment.get("ratio", 0)) * 100)
    freshness_score = float(doc_freshness.get("fresh_ratio", 0)) * 100
    total = 0.45 * presence_score + 0.35 * alignment_score + 0.2 * freshness_score
    return clamp_score(total)


def static_trend_score(snapshot: SnapshotMetrics) -> float:
    corrosion = score_corrosion(snapshot)
    ratio = score_test_ratio(snapshot)
    docs = (
        (snapshot.doc_files_present / len(TRACKED_DOC_FILES)) * 100
        if TRACKED_DOC_FILES
        else 0
    )
    return clamp_score(0.55 * corrosion + 0.3 * ratio + 0.15 * docs)


def classify_health(score: float) -> tuple[str, str]:
    if score >= 85:
        return "优秀", "好"
    if score >= 70:
        return "可控", "好"
    if score >= 55:
        return "预警", "坏"
    return "高风险", "坏"


def classify_trend(delta: float) -> str:
    if delta > 1:
        return "变好"
    if delta < -1:
        return "变坏"
    return "持平"


def build_markdown_report(
    output_path: Path,
    current: SnapshotMetrics,
    previous: SnapshotMetrics | None,
    runtime: dict[str, Any],
    doc_alignment: dict[str, Any],
    doc_freshness: dict[str, Any],
    overall_score: float,
    corrosion_score: float,
    testing_score: float,
    docs_score: float,
) -> str:
    branch_res = run_command(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=REPO_ROOT)
    commit_res = run_command(["git", "rev-parse", "--short", "HEAD"], cwd=REPO_ROOT)
    branch = branch_res.stdout.strip() if branch_res.returncode == 0 else "unknown"
    commit = commit_res.stdout.strip() if commit_res.returncode == 0 else "unknown"

    health_label, health_good_bad = classify_health(overall_score)

    current_static = static_trend_score(current)
    previous_static = static_trend_score(previous) if previous else None
    delta = current_static - previous_static if previous_static is not None else 0
    trend = classify_trend(delta) if previous is not None else "首次评估"

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    source_basis = max(current.source_files, 1)
    test_ratio = round(current.test_files / source_basis, 3)

    try:
        output_display = output_path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        output_display = str(output_path)

    lines: list[str] = []
    lines.append("# IHS 仓库驾驭评测报告")
    lines.append("")
    lines.append(f"- 生成时间: {generated_at}")
    lines.append(f"- 分析分支: `{branch}`")
    lines.append(f"- 当前提交: `{commit}`")
    lines.append("- 评测框架: IHS (IDE Harness Score)，参考 OpenAI Harness Engineering 的“约束 + 评测 + 回归”闭环。")
    lines.append(f"- 评测输出: `{output_display}`")
    lines.append("")
    lines.append("## 1) 总览结论")
    lines.append("")
    lines.append(f"- **IHS 总分**: **{overall_score}/100**")
    lines.append(f"- **仓库状态**: **{health_label}（{health_good_bad}）**")
    lines.append(f"- **趋势判断（对比 HEAD~1）**: **{trend}**")
    if previous_static is not None:
        lines.append(f"- 静态趋势分: 当前 `{current_static}` vs 上一提交 `{previous_static}` (Δ `{round(delta, 1)}`)")
    else:
        lines.append("- 静态趋势分: 无可用上一提交，当前结果记为基线。")
    lines.append("")
    lines.append("| 维度 | 分数 | 权重 |")
    lines.append("| --- | ---: | ---: |")
    lines.append(f"| 代码腐化度 | {corrosion_score} | 40% |")
    lines.append(f"| 测试信号 | {testing_score} | 35% |")
    lines.append(f"| 文档对齐 | {docs_score} | 25% |")
    lines.append("")
    lines.append("## 2) 代码腐化度（Code Entropy）")
    lines.append("")
    lines.append(f"- 源码文件数: `{current.source_files}`")
    lines.append(f"- 源码有效行: `{current.source_loc}`")
    lines.append(f"- 债务标记（TODO/FIXME/HACK/XXX）: `{current.debt_markers}`")
    lines.append(f"- `any` 使用计数: `{current.any_usage}`")
    lines.append(f"- `@ts-ignore/@ts-nocheck` 计数: `{current.ts_ignore}`")
    lines.append(f"- `eslint-disable` 计数: `{current.eslint_disable}`")
    lines.append(f"- 超大文件（>400 行）: `{current.large_files}`")
    lines.append("")
    lines.append("## 3) 测试信号（Harness Checks）")
    lines.append("")
    lines.append(f"- 测试文件数: `{current.test_files}`")
    lines.append(f"- 测试/源码比: `{test_ratio}`")
    coverage_detail = runtime.get("coverage_detail") or {}
    if coverage_detail:
        coverage_text = ", ".join(
            f"{k}={v}%" for k, v in coverage_detail.items() if v is not None
        )
    else:
        coverage_text = "不可用"
    lines.append(f"- 覆盖率摘要: {coverage_text}")
    lines.append("")
    lines.append("| 检查项 | 命令 | 结果 | 耗时(s) |")
    lines.append("| --- | --- | --- | ---: |")
    for key, name in (
        ("type_check", "Type Check"),
        ("unit_test", "Unit Test"),
        ("coverage", "Coverage"),
    ):
        info = runtime.get(key, {})
        cmd = info.get("command", "-")
        status = info.get("status", "unknown")
        duration = info.get("duration_seconds", "-")
        lines.append(f"| {name} | `{cmd}` | `{status}` | {duration} |")
    lines.append("")
    lines.append("## 4) 文档对齐（Docs Alignment）")
    lines.append("")
    lines.append(
        f"- 文档存在率: `{current.doc_files_present}/{len(TRACKED_DOC_FILES)}`"
    )
    lines.append(
        f"- 近历史窗口文档对齐率: `{doc_alignment.get('docs_commits', 0)}/{doc_alignment.get('code_commits', 0)}` = `{doc_alignment.get('ratio', 0)}`"
    )
    lines.append(
        f"- 文档新鲜度（<=120 天）: `{doc_freshness.get('fresh_docs', 0)}/{doc_freshness.get('present_docs', 0)}`"
    )
    lines.append("")
    lines.append("## 5) 技术债结论（变好/变坏）")
    lines.append("")
    lines.append(f"- 最终判断: **{health_good_bad}**")
    lines.append(f"- 趋势判断: **{trend}**")
    lines.append(
        "- 判定规则: 若总体分 >= 70 则状态为“好”，否则为“坏”；趋势按静态趋势分对比 HEAD~1。"
    )
    lines.append("")
    lines.append("## 6) 改进优先级（Next Actions）")
    lines.append("")
    lines.append("1. 降低 `any` 与 `eslint-disable`：把高风险类型豁免收敛到网关层。")
    lines.append("2. 提升测试/源码比到 >= 0.35，新增测试优先覆盖核心服务与 Agent Tool。")
    lines.append("3. 每次核心代码变更同步更新 `docs/` 与 `AGENTS.md`，把文档对齐率拉高到 >= 0.8。")
    lines.append("4. 维持 type-check + unit-test + coverage 的持续门禁，避免“先上车后补票”。")
    lines.append("")
    lines.append("## 7) 原始数据快照")
    lines.append("")
    payload = {
        "scores": {
            "overall": overall_score,
            "corrosion": corrosion_score,
            "testing": testing_score,
            "docs": docs_score,
            "static_current": current_static,
            "static_previous": previous_static,
            "trend_delta": round(delta, 1) if previous is not None else None,
            "trend": trend,
        },
        "metrics": {
            "source_files": current.source_files,
            "test_files": current.test_files,
            "source_loc": current.source_loc,
            "debt_markers": current.debt_markers,
            "any_usage": current.any_usage,
            "ts_ignore": current.ts_ignore,
            "eslint_disable": current.eslint_disable,
            "large_files": current.large_files,
            "doc_files_present": current.doc_files_present,
        },
        "doc_alignment": doc_alignment,
        "doc_freshness": doc_freshness,
        "runtime": runtime,
    }
    lines.append("```json")
    lines.append(json.dumps(payload, ensure_ascii=False, indent=2))
    lines.append("```")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate IHS health report.")
    parser.add_argument(
        "--output",
        default="IHS.md",
        help="Output markdown path (absolute or relative to repo root).",
    )
    parser.add_argument(
        "--skip-runtime-checks",
        action="store_true",
        help="Skip npm type-check/test/coverage checks.",
    )
    parser.add_argument(
        "--history-window",
        type=int,
        default=40,
        help="Git commit window for docs alignment.",
    )
    args = parser.parse_args()

    output = Path(args.output)
    output_path = output if output.is_absolute() else (REPO_ROOT / output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    current = collect_current_snapshot()

    prev_sha_res = run_command(["git", "rev-parse", "--verify", "HEAD~1"], cwd=REPO_ROOT)
    previous: SnapshotMetrics | None = None
    if prev_sha_res.returncode == 0:
        previous = collect_revision_snapshot("HEAD~1")

    runtime = run_runtime_checks(args.skip_runtime_checks)
    doc_alignment = collect_doc_alignment(max(args.history_window, 1))
    doc_freshness = collect_doc_freshness()

    corrosion_score = score_corrosion(current)
    testing_score = score_testing(current, runtime)
    docs_score = score_documentation(current, doc_alignment, doc_freshness)
    overall_score = clamp_score(
        0.4 * corrosion_score + 0.35 * testing_score + 0.25 * docs_score
    )

    report = build_markdown_report(
        output_path=output_path,
        current=current,
        previous=previous,
        runtime=runtime,
        doc_alignment=doc_alignment,
        doc_freshness=doc_freshness,
        overall_score=overall_score,
        corrosion_score=corrosion_score,
        testing_score=testing_score,
        docs_score=docs_score,
    )
    output_path.write_text(report, encoding="utf-8")

    print(f"IHS report generated: {output_path}")
    print(f"IHS total score: {overall_score}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())