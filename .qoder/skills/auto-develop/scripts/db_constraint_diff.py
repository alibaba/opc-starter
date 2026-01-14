#!/usr/bin/env python3
"""
Photo Wall 数据库一致性检查工具

用途：对比 TypeScript 类型定义与 SQL CHECK 约束，发现不一致问题
使用：python scripts/db_constraint_diff.py

检查项：
1. TypeScript 联合类型（如 'private' | 'organization' | 'public'）
2. SQL CHECK 约束（如 visibility IN ('private', 'organization')）
3. 输出差异报告
"""

import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple

# 颜色输出
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color


def find_project_root() -> Path:
    """找到项目根目录（包含 photo-wall 的目录）"""
    script_dir = Path(__file__).parent.resolve()
    # 从 .qoder/skills/auto-develop/scripts 向上找
    current = script_dir
    for _ in range(10):
        if (current / 'photo-wall').exists():
            return current
        current = current.parent
    raise RuntimeError("无法找到项目根目录")


def extract_ts_union_types(types_dir: Path) -> Dict[str, Tuple[str, Set[str]]]:
    """
    从 TypeScript 类型文件中提取联合类型
    返回: { 类型名: (文件路径, {值1, 值2, ...}) }
    """
    union_types = {}
    
    # 匹配 type X = 'a' | 'b' | 'c' 形式
    pattern = r"export\s+type\s+(\w+)\s*=\s*(['\"][^'\"]+['\"](?:\s*\|\s*['\"][^'\"]+['\"])+)"
    
    for ts_file in types_dir.glob("*.ts"):
        content = ts_file.read_text(encoding='utf-8')
        for match in re.finditer(pattern, content):
            type_name = match.group(1)
            values_str = match.group(2)
            # 提取所有字符串值
            values = set(re.findall(r"['\"]([^'\"]+)['\"]", values_str))
            union_types[type_name] = (str(ts_file), values)
    
    return union_types


def extract_sql_check_constraints(setup_sql: Path) -> Dict[str, Tuple[str, Set[str]]]:
    """
    从 SQL 文件中提取 CHECK 约束
    返回: { 列名: (约束名, {值1, 值2, ...}) }
    """
    constraints = {}
    content = setup_sql.read_text(encoding='utf-8')
    
    # 匹配 CHECK (column IN ('a', 'b', 'c')) 形式
    # 也匹配 CONSTRAINT xxx CHECK (...)
    pattern = r"(?:CONSTRAINT\s+(\w+)\s+)?CHECK\s*\(\s*(\w+)\s+IN\s*\(([^)]+)\)"
    
    for match in re.finditer(pattern, content, re.IGNORECASE):
        constraint_name = match.group(1) or f"inline_{match.group(2)}"
        column_name = match.group(2)
        values_str = match.group(3)
        # 提取所有字符串值
        values = set(re.findall(r"['\"]([^'\"]+)['\"]", values_str))
        constraints[column_name] = (constraint_name, values)
    
    return constraints


def find_related_pairs(
    ts_types: Dict[str, Tuple[str, Set[str]]], 
    sql_constraints: Dict[str, Tuple[str, Set[str]]]
) -> List[Tuple[str, str, str]]:
    """
    查找可能相关的 TypeScript 类型和 SQL 约束对
    返回: [(ts_type_name, sql_column_name, relation_type), ...]
    """
    pairs = []
    
    # 常见的命名映射
    name_mappings = {
        'AlbumVisibility': 'visibility',
        'PhotoVisibility': 'visibility',
        'PersonStatus': 'status',
        'AlbumStatus': 'status',
        'TaskStatus': 'status',
        'SyncStatus': 'sync_status',
    }
    
    for ts_name, (_, ts_values) in ts_types.items():
        # 直接映射
        if ts_name in name_mappings:
            sql_col = name_mappings[ts_name]
            if sql_col in sql_constraints:
                pairs.append((ts_name, sql_col, 'direct_mapping'))
                continue
        
        # 基于值的模糊匹配
        for sql_col, (_, sql_values) in sql_constraints.items():
            # 如果有超过一半的值相同，认为是相关的
            common = ts_values & sql_values
            if len(common) >= len(ts_values) * 0.5 or len(common) >= len(sql_values) * 0.5:
                pairs.append((ts_name, sql_col, 'value_overlap'))
    
    return pairs


def compare_and_report(
    ts_types: Dict[str, Tuple[str, Set[str]]], 
    sql_constraints: Dict[str, Tuple[str, Set[str]]],
    pairs: List[Tuple[str, str, str]]
) -> bool:
    """比较并输出报告，返回是否有差异"""
    has_diff = False
    
    print(f"\n{Colors.BLUE}=== Photo Wall 数据库一致性检查 ==={Colors.NC}\n")
    
    if not pairs:
        print(f"{Colors.YELLOW}未找到可对比的类型-约束对{Colors.NC}")
        print("提示：检查 TypeScript 类型命名是否符合规范（如 AlbumVisibility）")
        return False
    
    for ts_name, sql_col, relation in pairs:
        ts_file, ts_values = ts_types[ts_name]
        constraint_name, sql_values = sql_constraints[sql_col]
        
        print(f"{Colors.BLUE}[{ts_name}] ↔ [{sql_col}]{Colors.NC}")
        print(f"  TypeScript: {ts_file}")
        print(f"  SQL 约束:   {constraint_name}")
        
        # 找出差异
        only_in_ts = ts_values - sql_values
        only_in_sql = sql_values - ts_values
        
        if only_in_ts or only_in_sql:
            has_diff = True
            print(f"  {Colors.RED}❌ 发现差异{Colors.NC}")
            if only_in_ts:
                print(f"     仅在 TypeScript: {Colors.YELLOW}{only_in_ts}{Colors.NC}")
                print(f"     → 需要在 setup.sql 中添加这些值到 CHECK 约束")
            if only_in_sql:
                print(f"     仅在 SQL:        {Colors.YELLOW}{only_in_sql}{Colors.NC}")
                print(f"     → 需要在 TypeScript 类型中添加这些值")
        else:
            print(f"  {Colors.GREEN}✓ 一致{Colors.NC}")
            print(f"     共同值: {ts_values}")
        
        print()
    
    return has_diff


def main():
    try:
        project_root = find_project_root()
    except RuntimeError as e:
        print(f"{Colors.RED}错误: {e}{Colors.NC}")
        sys.exit(1)
    
    photo_wall = project_root / 'photo-wall'
    types_dir = photo_wall / 'src' / 'types'
    setup_sql = photo_wall / 'supabase' / 'setup.sql'
    
    # 检查文件存在
    if not types_dir.exists():
        print(f"{Colors.RED}错误: 找不到 types 目录: {types_dir}{Colors.NC}")
        sys.exit(1)
    
    if not setup_sql.exists():
        print(f"{Colors.RED}错误: 找不到 setup.sql: {setup_sql}{Colors.NC}")
        sys.exit(1)
    
    print(f"项目根目录: {project_root}")
    print(f"TypeScript 类型: {types_dir}")
    print(f"SQL 文件: {setup_sql}")
    
    # 提取数据
    ts_types = extract_ts_union_types(types_dir)
    sql_constraints = extract_sql_check_constraints(setup_sql)
    
    print(f"\n找到 {len(ts_types)} 个 TypeScript 联合类型")
    print(f"找到 {len(sql_constraints)} 个 SQL CHECK 约束")
    
    # 查找相关对
    pairs = find_related_pairs(ts_types, sql_constraints)
    
    # 比较并报告
    has_diff = compare_and_report(ts_types, sql_constraints, pairs)
    
    if has_diff:
        print(f"{Colors.RED}=== ❌ 发现不一致，请修复后再继续 ==={Colors.NC}")
        print("\n修复步骤：")
        print("1. 更新 supabase/setup.sql 中的 CHECK 约束")
        print("2. 生成迁移 SQL（参考 references/db-sync-checklist.md）")
        print("3. 在 Supabase SQL Editor 执行迁移")
        print("4. 重新运行此脚本验证")
        sys.exit(1)
    else:
        print(f"{Colors.GREEN}=== ✅ 所有检查通过 ==={Colors.NC}")
        sys.exit(0)


if __name__ == "__main__":
    main()

