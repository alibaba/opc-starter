# 更新日志

## [1.0.0] - 2025-11-09

### 新增功能 ✨

#### Supabase 集成
- 🔐 **用户认证系统**
  - 用户注册功能（邮箱 + 密码）
  - 用户登录功能
  - 会话管理和持久化
  - 自动刷新 token
  - 跨标签页状态同步
  
- 🛡️ **路由保护**
  - 所有应用页面需要登录后访问
  - 未登录自动重定向到登录页
  - 登录后自动跳转到原页面
  
- 👤 **用户界面**
  - 精美的登录页面
  - 精美的注册页面
  - Header 显示用户信息
  - 安全登出功能
  
- 📦 **状态管理**
  - 新增 `useAuthStore` 认证状态管理
  - 用户状态持久化到 localStorage
  - 完整的错误处理和提示

### 技术架构 🏗️

#### 新增目录结构
```
src/
├── auth/                    # 认证模块
│   ├── components/          # LoginForm, RegisterForm, ProtectedRoute
│   └── pages/              # LoginPage, RegisterPage
├── lib/
│   └── supabase/           # Supabase 客户端和服务
│       ├── client.ts       # Supabase 客户端初始化
│       ├── auth.ts         # 认证服务封装
│       └── types.ts        # Supabase 类型定义
├── stores/
│   └── useAuthStore.ts     # 认证状态管理
└── types/
    ├── auth.ts             # 认证类型定义
    └── user.ts             # 用户类型定义
```

#### 新增依赖
- `@supabase/supabase-js` - Supabase JavaScript 客户端

### 配置文件 📝

#### 新增文件
- `.env.local` - 环境变量配置（需手动创建）
- `.env.example` - 环境变量示例
- `SUPABASE-SETUP.md` - Supabase 快速配置指南
- `SUPABASE-INTEGRATION-GUIDE.md` - 完整集成指南（已存在）

#### 更新文件
- `README.md` - 更新项目说明和配置指南
- `.gitignore` - 添加环境变量文件忽略规则
- `src/config/routes.tsx` - 添加认证路由和路由保护
- `src/components/layout/Header/index.tsx` - 添加用户信息和登出功能
- `src/main.tsx` - 添加认证系统初始化

### 环境变量 🔧

需要配置以下环境变量：

```bash
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ENABLE_MSW=true
```

### 使用指南 📖

1. **创建 Supabase 项目**
   - 访问 https://supabase.com
   - 创建新项目
   - 获取 Project URL 和 anon key

2. **配置环境变量**
   - 复制 `.env.example` 为 `.env.local`
   - 填入你的 Supabase 配置

3. **启动应用**
   ```bash
   npm run dev
   ```

4. **注册/登录**
   - 访问 http://localhost:5173
   - 首次访问会跳转到登录页
   - 点击"注册"创建新账户
   - 使用邮箱和密码登录

详细配置说明请查看 `SUPABASE-SETUP.md`

### 安全特性 🔒

- ✅ 密码加密存储（Supabase 自动处理）
- ✅ JWT Token 认证
- ✅ 自动刷新 token
- ✅ 会话持久化
- ✅ 路由级别保护
- ✅ 环境变量保护（不提交到 Git）

### 已知限制 ⚠️

- 当前仅支持邮箱密码登录
- 暂未实现邮箱验证
- 暂未实现密码重置
- 暂未实现社交登录

### 下一步计划 🚀

Phase 2 将实现：
- 照片云端存储
- 相册云端同步
- 人员数据同步
- 多设备同步
- 离线优先策略

### 破坏性变更 ⚠️

- 所有路由现在需要认证才能访问
- 首次启动需要配置 Supabase 环境变量
- 未配置 Supabase 时应用无法正常使用

### 迁移指南 📋

如果你是从旧版本升级：

1. 安装新依赖：
   ```bash
   npm install @supabase/supabase-js
   ```

2. 创建 `.env.local` 文件并配置 Supabase

3. 重启开发服务器

### 贡献者 👥

- 初始实现：AI Assistant
- 设计方案：参考 SUPABASE-INTEGRATION-GUIDE.md

---

**完整的集成指南请查看：**
- [快速配置指南](./SUPABASE-SETUP.md)
- [完整集成指南](./SUPABASE-INTEGRATION-GUIDE.md)

