# Project Structure

```
photo-wall/
├── docs/
│   ├── Architecture.md      # 系统架构
│   └── Epics.yaml           # 项目进度
├── photo-wall/src/
│   ├── components/          # React 组件
│   ├── services/
│   │   ├── data/DataService.ts  # 统一数据访问（核心）
│   │   ├── api/             # API 服务
│   │   ├── ai/              # AI 服务
│   │   └── cloud/           # OSS 存储服务
│   ├── stores/              # Zustand Store
│   ├── hooks/               # 自定义 Hooks
│   └── types/               # TypeScript 类型
├── photo-wall/supabase/
│   ├── setup.sql            # 数据库脚本（所有 SQL 变更集中于此）
│   ├── SUPABASE_COOKBOOK.md # Supabase 操作手册
│   └── functions/           # Edge Functions
└── AGENTS.md                # AI 编码快速指南
```

## Key Files

| File | Purpose |
|------|---------|
| `photo-wall/src/services/data/DataService.ts` | 统一数据访问层，所有数据操作必须通过此服务 |
| `photo-wall/supabase/setup.sql` | 所有数据库变更集中管理 |
| `docs/Epics.yaml` | 项目进度追踪 |
| `AGENTS.md` | AI 编码快速指南 |

## Document Update Policy

| Content Type | Target File |
|--------------|-------------|
| SQL 变更 | `photo-wall/supabase/setup.sql` |
| 数据库操作 | `photo-wall/supabase/SUPABASE_COOKBOOK.md` |
| 阿里云配置 | `photo-wall/supabase/ALICLOUD_COOKBOOK.md` |
| 项目进度 | `docs/Epics.yaml` |
