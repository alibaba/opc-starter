#!/usr/bin/env python3
"""
AI Friendly Audit - Repository Scanner

自动扫描代码仓库，收集 AI 亲和度评估所需的基础信息。
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from datetime import datetime


def run_command(cmd: str, cwd: str = None) -> tuple[int, str]:
    """执行 shell 命令并返回结果"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.returncode, result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return -1, "Command timed out"
    except Exception as e:
        return -1, str(e)


def check_file_exists(repo_path: str, patterns: list[str]) -> list[str]:
    """检查文件是否存在，支持 glob 模式"""
    found = []
    repo = Path(repo_path)
    for pattern in patterns:
        matches = list(repo.glob(pattern))
        found.extend([str(m.relative_to(repo)) for m in matches])
    return found


def find_package_json(repo_path: str) -> Path | None:
    """查找 package.json，支持 monorepo 结构"""
    repo = Path(repo_path)
    # 先检查根目录
    if (repo / "package.json").exists():
        return repo / "package.json"
    # 检查一级子目录
    for subdir in repo.iterdir():
        if subdir.is_dir() and not subdir.name.startswith('.'):
            if (subdir / "package.json").exists():
                return subdir / "package.json"
    return None


def detect_project_type(repo_path: str) -> dict:
    """检测项目类型和技术栈"""
    result = {
        "type": "unknown",
        "languages": [],
        "frameworks": [],
        "package_managers": [],
        "project_root": repo_path
    }
    
    # 检测包管理器
    pkg_files = {
        "package.json": ("npm/yarn/pnpm", "javascript"),
        "requirements.txt": ("pip", "python"),
        "pyproject.toml": ("poetry/pip", "python"),
        "Cargo.toml": ("cargo", "rust"),
        "go.mod": ("go mod", "go"),
        "pom.xml": ("maven", "java"),
        "build.gradle": ("gradle", "java"),
        "Gemfile": ("bundler", "ruby"),
    }
    
    # 先检查根目录
    for file, (pkg_mgr, lang) in pkg_files.items():
        if (Path(repo_path) / file).exists():
            result["package_managers"].append(pkg_mgr)
            if lang not in result["languages"]:
                result["languages"].append(lang)
    
    # 如果根目录没找到，检查一级子目录（monorepo 支持）
    if not result["languages"]:
        for subdir in Path(repo_path).iterdir():
            if subdir.is_dir() and not subdir.name.startswith('.'):
                for file, (pkg_mgr, lang) in pkg_files.items():
                    if (subdir / file).exists():
                        result["package_managers"].append(pkg_mgr)
                        if lang not in result["languages"]:
                            result["languages"].append(lang)
                        result["project_root"] = str(subdir)
                        break
    
    # 检测框架
    package_json = find_package_json(repo_path)
    if package_json and package_json.exists():
        result["project_root"] = str(package_json.parent)
        try:
            with open(package_json) as f:
                pkg = json.load(f)
                deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
                
                frameworks = {
                    "react": "React",
                    "vue": "Vue",
                    "angular": "Angular",
                    "next": "Next.js",
                    "express": "Express",
                    "fastify": "Fastify",
                    "nestjs": "NestJS",
                }
                
                for dep, name in frameworks.items():
                    if any(dep in d.lower() for d in deps):
                        result["frameworks"].append(name)
        except:
            pass
    
    # 判断项目类型
    if "React" in result["frameworks"] or "Vue" in result["frameworks"]:
        if "Express" in result["frameworks"] or "NestJS" in result["frameworks"]:
            result["type"] = "fullstack"
        else:
            result["type"] = "frontend"
    elif "Express" in result["frameworks"] or "NestJS" in result["frameworks"]:
        result["type"] = "backend"
    elif result["languages"]:
        result["type"] = "library" if (Path(repo_path) / "src").exists() else "application"
    
    return result


def check_dimension(repo_path: str) -> dict:
    """执行各维度检查"""
    results = {}
    
    # 1. 最小可运行环境（聚焦本地启动 + Mock 屏蔽依赖）
    results["minimal_env"] = {
        "env_template": check_file_exists(repo_path, [".env.example", ".env.local.example", "env.local.example", ".env.sample"]),
        "lock_file": check_file_exists(repo_path, ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "Pipfile.lock", "poetry.lock"]),
        "mock_config": check_file_exists(repo_path, ["**/msw*", "**/mocks/**", "**/__mocks__/**", "**/mock*.ts", "**/mock*.js"]),
        "mock_mode_script": False,  # 检查是否有 mock 模式启动脚本
    }
    # 检查 package.json 中是否有 mock/test 模式启动脚本
    pkg_json = find_package_json(repo_path)
    if pkg_json and pkg_json.exists():
        try:
            with open(pkg_json) as f:
                pkg = json.load(f)
                scripts = pkg.get("scripts", {})
                mock_scripts = [k for k in scripts.keys() if any(kw in k.lower() for kw in ["mock", "test", "offline"])]
                results["minimal_env"]["mock_mode_script"] = len(mock_scripts) > 0
                results["minimal_env"]["dev_script"] = "dev" in scripts or "start" in scripts
        except:
            pass
    
    # 2. 前后端解耦
    results["decoupling"] = {
        "mocks": check_file_exists(repo_path, ["**/mock*", "**/msw*", "**/fixtures*", "**/__mocks__*"]),
        "api_contracts": check_file_exists(repo_path, ["**/openapi*", "**/swagger*", "**/*.api.ts"]),
    }
    
    # 3. 类型系统
    results["type_system"] = {
        "typescript": check_file_exists(repo_path, ["tsconfig.json", "tsconfig.*.json"]),
        "strict_mode": False,
    }
    # 检查 strict 模式
    tsconfig = Path(repo_path) / "tsconfig.json"
    if tsconfig.exists():
        try:
            with open(tsconfig) as f:
                content = f.read()
                results["type_system"]["strict_mode"] = '"strict": true' in content or '"strict":true' in content
        except:
            pass
    
    # 4. 单元测试
    results["unit_tests"] = {
        "config": check_file_exists(repo_path, ["jest.config.*", "vitest.config.*", "pytest.ini", "pyproject.toml"]),
        "test_files": check_file_exists(repo_path, ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "test_*.py"]),
    }
    
    # 5. E2E 测试
    results["e2e_tests"] = {
        "cypress": check_file_exists(repo_path, ["cypress.config.*", "cypress/"]),
        "playwright": check_file_exists(repo_path, ["playwright.config.*"]),
        "test_files": check_file_exists(repo_path, ["**/*.cy.ts", "**/*.cy.tsx", "**/e2e/**/*.spec.ts"]),
    }
    
    # 6. 文档
    results["documentation"] = {
        "readme": check_file_exists(repo_path, ["README.md", "readme.md"]),
        "architecture": check_file_exists(repo_path, ["docs/*", "ARCHITECTURE.md", "DESIGN.md"]),
        "ai_guide": check_file_exists(repo_path, ["AGENTS.md", ".cursor/rules/*", ".claude/*"]),
        "api_docs": check_file_exists(repo_path, ["docs/api*", "**/swagger*", "**/openapi*"]),
    }
    
    # 7. 代码规范
    results["code_standards"] = {
        "linting": check_file_exists(repo_path, [".eslintrc*", "eslint.config.*", ".pylintrc", "biome.json"]),
        "formatting": check_file_exists(repo_path, [".prettierrc*", "prettier.config.*", ".editorconfig"]),
        "git_hooks": check_file_exists(repo_path, [".husky/*", ".git/hooks/pre-commit"]),
        "commit_lint": check_file_exists(repo_path, [".commitlintrc*", "commitlint.config.*"]),
    }
    
    # 8. 模块化（简单检查目录结构）
    results["modularity"] = {
        "src_structure": check_file_exists(repo_path, ["src/*"]),
        "has_layers": any([
            (Path(repo_path) / "src" / d).exists() 
            for d in ["components", "services", "utils", "hooks", "stores", "api"]
        ]),
    }
    
    # 9. 错误处理（标记，需手动检查）
    results["error_handling"] = {
        "note": "Requires manual code review"
    }
    
    # 10. CI/CD
    results["cicd"] = {
        "github_actions": check_file_exists(repo_path, [".github/workflows/*"]),
        "gitlab_ci": check_file_exists(repo_path, [".gitlab-ci.yml"]),
        "other": check_file_exists(repo_path, [".circleci/*", "azure-pipelines.yml", "Jenkinsfile"]),
    }
    
    return results


def main():
    if len(sys.argv) < 2:
        print("Usage: python repo_scan.py <repo_path>")
        print("\nScans a repository for AI-friendliness indicators.")
        sys.exit(1)
    
    repo_path = os.path.abspath(sys.argv[1])
    
    if not os.path.isdir(repo_path):
        print(f"Error: {repo_path} is not a valid directory")
        sys.exit(1)
    
    print(f"🔍 Scanning repository: {repo_path}")
    print(f"📅 Scan date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 60)
    
    # 检测项目类型
    project = detect_project_type(repo_path)
    print(f"\n📦 Project Type: {project['type']}")
    print(f"🔧 Languages: {', '.join(project['languages']) or 'Unknown'}")
    print(f"🏗️  Frameworks: {', '.join(project['frameworks']) or 'None detected'}")
    print(f"📋 Package Managers: {', '.join(project['package_managers']) or 'None detected'}")
    
    # 执行维度检查
    print("\n" + "=" * 60)
    print("📊 Dimension Check Results")
    print("=" * 60)
    
    dimensions = check_dimension(repo_path)
    
    # 输出结果
    dimension_names = {
        "minimal_env": "1. 最小可运行环境",
        "decoupling": "2. 前后端解耦",
        "type_system": "3. 类型系统",
        "unit_tests": "4. 单元测试",
        "e2e_tests": "5. 端到端测试",
        "documentation": "6. 文档完备性",
        "code_standards": "7. 代码规范",
        "modularity": "8. 模块化架构",
        "error_handling": "9. 错误处理",
        "cicd": "10. CI/CD 集成",
    }
    
    for key, name in dimension_names.items():
        print(f"\n{name}:")
        data = dimensions[key]
        for subkey, value in data.items():
            if isinstance(value, list):
                status = "✅" if value else "❌"
                count = f"({len(value)} found)" if value else "(none)"
                print(f"  {status} {subkey}: {count}")
                if value and len(value) <= 5:
                    for item in value:
                        print(f"      - {item}")
            elif isinstance(value, bool):
                status = "✅" if value else "❌"
                print(f"  {status} {subkey}")
            else:
                print(f"  ℹ️  {subkey}: {value}")
    
    print("\n" + "=" * 60)
    print("📝 Note: This is an automated scan. Manual review is recommended")
    print("   for accurate scoring, especially for code quality dimensions.")
    print("=" * 60)
    
    # 导出 JSON（可选）
    if "--json" in sys.argv:
        output = {
            "repo_path": repo_path,
            "scan_date": datetime.now().isoformat(),
            "project": project,
            "dimensions": dimensions
        }
        json_path = Path(repo_path) / "ai-friendly-audit-scan.json"
        with open(json_path, "w") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        print(f"\n📄 JSON report saved to: {json_path}")


if __name__ == "__main__":
    main()
