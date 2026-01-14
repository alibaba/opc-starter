#!/bin/bash
# Photo Wall 质量验证流程
# 用途：执行完整的质量检查流程（lint → test → e2e → build）
# 使用：./scripts/quality_check.sh [--skip-e2e]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 解析参数
SKIP_E2E=false
for arg in "$@"; do
  case $arg in
    --skip-e2e)
      SKIP_E2E=true
      shift
      ;;
  esac
done

# 进入 photo-wall 目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../../../photo-wall" && pwd)"
cd "$PROJECT_DIR"

echo -e "${YELLOW}=== Photo Wall 质量验证流程 ===${NC}"
echo "工作目录: $PROJECT_DIR"
echo ""

# Step 1: TypeScript + ESLint
echo -e "${YELLOW}[1/4] TypeScript 类型检查 + ESLint${NC}"
if npm run lint; then
  echo -e "${GREEN}✓ Lint 通过${NC}"
else
  echo -e "${RED}✗ Lint 失败${NC}"
  exit 1
fi
echo ""

# Step 2: 单元测试
echo -e "${YELLOW}[2/4] 单元测试 (Vitest)${NC}"
if npm run test; then
  echo -e "${GREEN}✓ 单元测试通过${NC}"
else
  echo -e "${RED}✗ 单元测试失败${NC}"
  exit 1
fi
echo ""

# Step 3: E2E 测试
if [ "$SKIP_E2E" = true ]; then
  echo -e "${YELLOW}[3/4] E2E 测试 (跳过)${NC}"
else
  echo -e "${YELLOW}[3/4] E2E 回归测试 (Cypress)${NC}"
  if npm run test:e2e:headless; then
    echo -e "${GREEN}✓ E2E 测试通过${NC}"
  else
    echo -e "${RED}✗ E2E 测试失败${NC}"
    exit 1
  fi
fi
echo ""

# Step 4: 构建验证
echo -e "${YELLOW}[4/4] 生产构建${NC}"
if npm run build; then
  echo -e "${GREEN}✓ 构建成功${NC}"
else
  echo -e "${RED}✗ 构建失败${NC}"
  exit 1
fi
echo ""

echo -e "${GREEN}=== ✅ 所有验证通过！ ===${NC}"
echo ""
echo "下一步："
echo "  npm run preview    # 本地预览构建结果"
echo "  git add . && git commit -m 'feat: ...'    # 提交代码"

