# Skills Hub - Epics & Stories

> 版本: v1.0.0 | 创建日期: 2026-03-19
> 输入文档: PRD, Architecture, UX Design Specification

---

## Epic 概览

### Phase 1 - MVP 核心

| Epic | 名称 | SP | Stories | 依赖 |
|------|------|-----|---------|------|
| **Epic-29** | 数据库基础设施 | 8 | 4 | - |
| **Epic-30** | Skill 发现与搜索 | 13 | 6 | Epic-29 |
| **Epic-31** | Skill 详情与下载 | 10 | 5 | Epic-29, Epic-30 |
| **Epic-32** | Skill 发布系统 | 13 | 6 | Epic-29 |
| **Epic-33** | 社交互动（点赞/收藏） | 8 | 4 | Epic-29, Epic-30 |
| **Epic-34** | 用户中心 | 8 | 4 | Epic-29, Epic-33 |
| **合计** | | **60** | **29** | |

### Phase 2 - 增长功能（Post-MVP）

| Epic | 名称 | SP | Stories | 依赖 |
|------|------|-----|---------|------|
| **Epic-35** | CLI 安装工具 | 10 | 5 | Epic-31 |
| **Epic-36** | 作者数据看板 | 5 | 3 | Epic-32, Epic-33 |
| **Epic-37** | 评论系统 | 8 | 4 | Epic-31, Epic-33 |

### 依赖关系图

```
Epic-29 (数据库基础)
  ├── Epic-30 (发现与搜索)
  │     └── Epic-31 (详情与下载)
  │           └── Epic-35 (CLI 工具) [Post-MVP]
  ├── Epic-32 (发布系统)
  │     └── Epic-36 (数据看板) [Post-MVP]
  └── Epic-33 (社交互动)
        ├── Epic-34 (用户中心)
        └── Epic-37 (评论系统) [Post-MVP]
```

---

## Epic-29: 数据库基础设施

**目标：** 创建 Skills Hub 所有数据库表、RLS 策略、触发器和 Storage Bucket，为后续功能开发奠定数据基础。

**验收标准：**
- 5 张核心表创建完成（skills, skill_versions, skill_likes, skill_favorites, skill_installs）
- RLS 策略全部就位并测试通过
- 触发器（计数更新、slug 生成）运行正常
- Storage Bucket 配置完成
- Migration 文件和 Rollback 文件均创建
- migration-manifest.yaml 已更新

### Stories

#### Story 29.1: 创建 Skills Hub 核心表

**SP:** 3

**描述：**
创建 skills、skill_versions、skill_likes、skill_favorites、skill_installs 5 张表，包含所有索引。

**任务：**
- [ ] 创建 migration 文件 `00002_add_skills_tables.sql`
- [ ] 创建 rollback 文件 `00002_add_skills_tables_rollback.sql`
- [ ] skills 表：含 search_vector（tsvector）、tags/platforms 数组、计数字段
- [ ] skill_versions 表：含 file_hash、metadata JSONB
- [ ] skill_likes / skill_favorites 表：含 UNIQUE 约束
- [ ] skill_installs 表：含 client_info JSONB
- [ ] 创建所有索引（GIN for search_vector/tags/platforms, B-tree for FK/排序）
- [ ] 更新 migration-manifest.yaml

**验收标准：**
- Migration 执行无报错
- Rollback 可完整回滚
- 所有约束和索引创建正确

---

#### Story 29.2: 配置 RLS 策略

**SP:** 2

**描述：**
为 5 张表配置完整的 Row Level Security 策略。

**任务：**
- [ ] 创建 migration 文件 `00003_add_skills_rls.sql`
- [ ] 创建 rollback 文件 `00003_add_skills_rls_rollback.sql`
- [ ] skills 表 RLS：游客查看公开 / 作者查看自己 / 作者 CRUD 自己的
- [ ] skill_versions 表 RLS：跟随 skills 可见性 / 作者可创建删除版本
- [ ] skill_likes 表 RLS：所有人可查看 / 登录用户可创建删除自己的
- [ ] skill_favorites 表 RLS：用户查看自己的 / 登录用户可创建删除
- [ ] skill_installs 表 RLS：用户查看自己的 / 所有人可创建
- [ ] 更新 migration-manifest.yaml

**验收标准：**
- 游客只能查询 visibility='public' 的 Skill
- 登录用户可以操作自己的数据
- 非作者无法修改/删除他人 Skill

---

#### Story 29.3: 创建触发器与函数

**SP:** 2

**描述：**
创建计数更新触发器、slug 自动生成函数、updated_at 自动更新触发器。

**任务：**
- [ ] 创建 migration 文件 `00004_add_skills_functions.sql`
- [ ] 创建 rollback 文件 `00004_add_skills_functions_rollback.sql`
- [ ] update_skill_likes_count()：INSERT +1 / DELETE -1（GREATEST 防负数）
- [ ] update_skill_favorites_count()：同上
- [ ] update_skill_downloads_count()：INSERT +1
- [ ] generate_skill_slug()：小写 + 连字符 + 唯一性检查
- [ ] skills_updated_at 触发器
- [ ] 更新 migration-manifest.yaml

**验收标准：**
- 点赞/取消点赞后 skills.likes_count 正确更新
- 收藏/取消收藏后 skills.favorites_count 正确更新
- 下载记录创建后 skills.downloads_count 正确 +1
- Slug 生成唯一且 URL 友好

---

#### Story 29.4: 配置 Storage Bucket

**SP:** 1

**描述：**
创建 skills Storage Bucket 并配置 RLS 策略。

**任务：**
- [ ] 创建 migration 文件 `00005_add_skills_storage.sql`
- [ ] 创建 rollback 文件 `00005_add_skills_storage_rollback.sql`
- [ ] 创建 `skills` bucket（private）
- [ ] 配置上传 RLS：作者只能上传到自己的目录
- [ ] 配置删除 RLS：作者只能删除自己的文件
- [ ] 更新 migration-manifest.yaml

**验收标准：**
- Bucket 创建成功
- 用户只能上传到 `{author_id}/` 目录下
- 用户只能删除自己目录下的文件

---

## Epic-30: Skill 发现与搜索

**目标：** 实现 Skills Hub 首页、搜索功能和分类浏览，让用户可以快速发现和找到需要的 Skill。

**验收标准：**
- 首页展示热门和最新 Skill 列表
- 即时搜索功能可用（输入 300ms 后触发）
- 支持按标签、平台筛选
- 支持按下载量、最新、点赞数排序
- 搜索响应时间 P95 < 200ms
- 页面首次加载 P95 < 1.5s

### Stories

#### Story 30.1: TypeScript 类型定义与服务层

**SP:** 2

**描述：**
创建 Skills Hub 核心 TypeScript 类型和服务层基础。

**任务：**
- [ ] 创建 `types/skill.ts`：Skill, SkillVersion, SkillAuthor, SkillSearchParams, SkillSearchResult
- [ ] 创建 `services/skill/skillService.ts`：getBySlug, getPopular, getLatest, search
- [ ] 创建 `services/skill/skillSearchService.ts`：搜索逻辑封装
- [ ] 创建 `stores/useSkillStore.ts`：搜索状态、结果缓存

**验收标准：**
- 类型定义完整，覆盖所有实体
- 服务层可正确查询 Supabase
- Store 状态管理功能完整

---

#### Story 30.2: 首页布局与热门/最新列表

**SP:** 3

**描述：**
创建 Skills Hub 首页，包含搜索栏、热门标签、热门 Skills 和最新 Skills 列表。

**任务：**
- [ ] 创建 `pages/skills/HomePage.tsx`
- [ ] 顶部导航：Logo + 搜索栏 + 登录/注册按钮
- [ ] 热门标签区域：Badge 组件展示热门标签
- [ ] 热门 Skills 区域：3 列卡片网格（xl）/ 2 列（md）/ 1 列（sm）
- [ ] 最新发布区域：同上
- [ ] 使用 Skeleton 组件实现加载状态
- [ ] 配置路由 `/`

**验收标准：**
- 首页正确展示热门和最新 Skill 列表
- 响应式布局正确（3/2/1 列）
- 加载状态使用骨架屏
- 无 Skill 时展示空状态

---

#### Story 30.3: SkillCard 组件

**SP:** 2

**描述：**
创建 Skill 卡片组件，展示名称、描述、标签、下载量、点赞数、作者信息。

**任务：**
- [ ] 创建 `components/skills/SkillCard.tsx`
- [ ] 卡片内容：名称（bold）、描述（2 行截断）、标签（Badge）、平台标签
- [ ] 统计信息：下载量 + 点赞数（StatsBadge 组件）
- [ ] 作者信息：头像 + 用户名
- [ ] 交互状态：hover 阴影 + 边框高亮
- [ ] 整卡可点击，跳转到详情页
- [ ] 键盘可聚焦，ARIA label
- [ ] 创建 `components/skills/StatsBadge.tsx`

**验收标准：**
- 卡片展示所有必要信息
- Hover 和 Focus 状态正确
- 点击跳转到 `/skill/:slug`
- 无障碍标准符合

---

#### Story 30.4: SearchBar 组件

**SP:** 2

**描述：**
创建即时搜索栏组件，支持输入即搜索、热门标签触发搜索。

**任务：**
- [ ] 创建 `components/skills/SearchBar.tsx`
- [ ] 搜索图标 + Input 组件
- [ ] 输入防抖：300ms 后触发搜索
- [ ] 热门标签：点击标签触发搜索
- [ ] 搜索状态：loading indicator
- [ ] 自动聚焦（首页）
- [ ] ARIA label: "搜索 Skills"
- [ ] 支持键盘操作（Enter 确认、Escape 清空）

**验收标准：**
- 输入后 300ms 自动触发搜索
- 点击标签触发对应搜索
- 加载状态可见
- 键盘操作正确

---

#### Story 30.5: 搜索结果页

**SP:** 2

**描述：**
创建搜索结果页面，支持筛选和排序。

**任务：**
- [ ] 创建 `pages/skills/SearchPage.tsx`
- [ ] URL 参数同步：`/search?q=keyword&tags=react&sort=downloads`
- [ ] 搜索结果列表：SkillCard 网格
- [ ] 筛选区域：平台筛选（Dropdown）、标签筛选
- [ ] 排序选择：最新 / 最热 / 下载量
- [ ] 分页或无限滚动
- [ ] 空状态：EmptyState 组件
- [ ] 配置路由 `/search`

**验收标准：**
- URL 参数正确同步搜索状态
- 筛选和排序功能正确
- 空状态展示友好
- 分页/加载更多正确

---

#### Story 30.6: EmptyState 组件

**SP:** 2

**描述：**
创建通用空状态组件，支持不同场景（无搜索结果、无发布、无收藏）。

**任务：**
- [ ] 创建 `components/skills/EmptyState.tsx`
- [ ] Props：icon, title, description, action（按钮）
- [ ] 预设场景：noSearchResults, noSkills, noFavorites
- [ ] 搜索无结果时建议关键词
- [ ] 视觉风格：柔和图标 + 引导文字

**验收标准：**
- 组件可复用于不同场景
- 视觉风格统一
- Action 按钮可触发对应操作

---

## Epic-31: Skill 详情与下载

**目标：** 实现 Skill 详情页，包含 README 渲染、版本列表、安装命令展示和下载功能。

**验收标准：**
- 详情页完整展示 Skill 信息
- README Markdown 正确渲染，XSS 安全
- 版本列表可切换
- CLI 命令一键复制
- Web 端下载功能可用
- 详情页加载时间 P95 < 800ms

### Stories

#### Story 31.1: Skill 详情页布局

**SP:** 3

**描述：**
创建 Skill 详情页，左侧 README，右侧安装/统计信息。

**任务：**
- [ ] 创建 `pages/skills/SkillDetailPage.tsx`
- [ ] 标题区：Skill 名称 + 作者卡片 + 点赞/收藏按钮
- [ ] 标签区：标签 Badge + 平台 Badge
- [ ] 左侧（2/3）：README 渲染区域 + 版本历史标签页
- [ ] 右侧（1/3）：安装命令 + 版本选择器 + 统计信息
- [ ] 响应式：md 以下改为垂直堆叠
- [ ] 面包屑导航
- [ ] 配置路由 `/skill/:slug`
- [ ] 使用 `skillService.getBySlug()` 加载数据

**验收标准：**
- 所有 Skill 信息正确展示
- 响应式布局正确
- 面包屑导航可用

---

#### Story 31.2: README 渲染组件

**SP:** 2

**描述：**
实现安全的 Markdown README 渲染。

**任务：**
- [ ] 安装 `marked` 和 `dompurify`
- [ ] 创建 README 渲染工具函数：marked 解析 + DOMPurify 清理
- [ ] 允许标签白名单：h1-h6, p, a, code, pre, table, img 等
- [ ] 允许属性白名单：href, src, alt, title, class
- [ ] 代码块语法高亮（可选：使用 shiki 或 prism）
- [ ] 样式美化：使用 Tailwind typography 插件

**验收标准：**
- Markdown 正确渲染
- XSS 攻击被阻止（DOMPurify 过滤恶意内容）
- 代码块有基本格式
- 链接正确可点击

---

#### Story 31.3: InstallCommand 组件

**SP:** 2

**描述：**
创建 CLI 安装命令展示和一键复制组件。

**任务：**
- [ ] 创建 `components/skills/InstallCommand.tsx`
- [ ] 展示命令文本：`skill-hub install {slug}@{version}`
- [ ] 复制按钮：点击复制到剪贴板
- [ ] 复制成功状态：图标变化 + "已复制" 文字（2 秒恢复）
- [ ] 版本变化时命令自动更新
- [ ] ARIA label: "复制安装命令"
- [ ] Toast 提示：复制成功

**验收标准：**
- 命令正确展示
- 一键复制到剪贴板
- 复制成功反馈可见

---

#### Story 31.4: VersionSelector 组件

**SP:** 1

**描述：**
创建版本选择下拉组件。

**任务：**
- [ ] 创建 `components/skills/VersionSelector.tsx`
- [ ] 下拉选择器展示所有版本
- [ ] 默认选中最新版本
- [ ] 版本变化时通知父组件（更新 InstallCommand）
- [ ] 展示版本发布时间
- [ ] ARIA label: "选择版本"

**验收标准：**
- 版本列表正确
- 切换版本后 CLI 命令更新
- 默认选中最新版本

---

#### Story 31.5: Web 下载功能与 Edge Function

**SP:** 2

**描述：**
实现 Web 端 Skill 包下载，通过 Edge Function 生成签名 URL。

**任务：**
- [ ] 创建 Edge Function `skills-download`
- [ ] 验证 Skill 可见性（public）
- [ ] 获取版本信息和 storage_path
- [ ] 生成签名下载 URL（有效期 5 分钟）
- [ ] 记录安装日志到 skill_installs
- [ ] 返回签名 URL + 文件信息
- [ ] 前端下载按钮触发下载
- [ ] 创建 `services/skill/skillStorageService.ts`

**验收标准：**
- 下载链接有效
- 安装日志正确记录
- 非公开 Skill 无法下载
- 下载计数正确更新

---

## Epic-32: Skill 发布系统

**目标：** 实现完整的 Skill 发布流程，包括元数据填写、文件上传、版本管理。

**验收标准：**
- 用户可创建新 Skill
- 用户可上传 Skill 包（ZIP，< 10MB）
- 上传后自动解析元数据
- 支持发布新版本
- 发布流程 < 5 分钟完成
- 可设置可见性（draft/public/private）

### Stories

#### Story 32.1: 发布页面布局

**SP:** 2

**描述：**
创建 Skill 发布页面，包含元数据表单和文件上传区域。

**任务：**
- [ ] 创建 `pages/skills/PublishPage.tsx`
- [ ] 需要认证保护（未登录重定向到 /login）
- [ ] 表单区域：名称、描述、标签、平台选择、可见性
- [ ] 文件上传区域：拖拽上传 / 点击选择
- [ ] 版本号输入
- [ ] 发布/保存草稿按钮
- [ ] 配置路由 `/publish`

**验收标准：**
- 未登录用户重定向到登录
- 表单字段完整
- 表单验证正确

---

#### Story 32.2: SkillPublishForm 表单组件

**SP:** 3

**描述：**
创建 Skill 发布表单组件，包含实时验证。

**任务：**
- [ ] 创建 `components/skills/SkillPublishForm.tsx`
- [ ] 名称输入：必填，3-50 字符，实时 slug 预览
- [ ] 描述输入：必填，10-500 字符
- [ ] 标签输入：多选/输入，最多 10 个
- [ ] 平台选择：多选 Checkbox（qoder/cursor/claude/cline/windsurf）
- [ ] 可见性选择：Radio（draft/public/private）
- [ ] 版本号输入：语义化版本格式验证
- [ ] 表单验证：实时 + 提交前验证
- [ ] 必填标识：`*` 星号

**验收标准：**
- 所有字段验证正确
- 错误提示清晰
- Slug 预览实时更新
- 语义化版本格式校验通过

---

#### Story 32.3: FileUploader 文件上传组件

**SP:** 2

**描述：**
创建文件上传组件，支持拖拽上传、进度展示。

**任务：**
- [ ] 创建 `components/skills/FileUploader.tsx`
- [ ] 拖拽区域：虚线边框 + 图标 + 提示文字
- [ ] 点击选择文件
- [ ] 文件类型校验：仅允许 .zip
- [ ] 文件大小校验：最大 10MB
- [ ] 上传进度条：百分比展示
- [ ] 上传成功/失败状态
- [ ] 已上传文件预览：文件名 + 大小 + 删除按钮

**验收标准：**
- 拖拽和点击上传均可用
- 文件类型和大小校验正确
- 进度条展示正确
- 错误提示清晰

---

#### Story 32.4: skills-publish Edge Function

**SP:** 3

**描述：**
创建 Skill 发布 Edge Function，处理发布流程的服务端逻辑。

**任务：**
- [ ] 创建 Edge Function `skills-publish`
- [ ] 支持 3 种 action：create / update / publish_version
- [ ] create：验证用户、创建 Skill 记录、生成 slug
- [ ] update：验证作者身份、更新元数据
- [ ] publish_version：验证作者、创建版本记录、生成上传签名 URL
- [ ] 文件格式验证（ZIP）
- [ ] 上传完成后更新 skills.latest_version
- [ ] 首次公开发布时设置 published_at
- [ ] 错误处理和友好提示

**验收标准：**
- 3 种 action 均正确工作
- 非作者无法操作
- 签名 URL 有效
- Slug 唯一性保证

---

#### Story 32.5: 版本管理功能

**SP:** 2

**描述：**
支持为已有 Skill 发布新版本。

**任务：**
- [ ] Skill 详情页增加"发布新版本"按钮（仅作者可见）
- [ ] 版本发布弹窗：版本号 + Changelog + 文件上传
- [ ] 版本号校验：必须大于当前最新版本
- [ ] 发布后更新 skills.latest_version
- [ ] 版本历史列表展示

**验收标准：**
- 新版本发布成功
- 版本号递增校验正确
- 版本历史列表更新

---

#### Story 32.6: Skill 编辑与删除

**SP:** 1

**描述：**
支持作者编辑和删除自己的 Skill。

**任务：**
- [ ] Skill 详情页增加"编辑"按钮（仅作者可见）
- [ ] 编辑页面复用 SkillPublishForm（预填数据）
- [ ] 删除确认弹窗（Dialog）
- [ ] 删除时级联删除版本、点赞、收藏、安装记录（数据库 CASCADE）
- [ ] 删除时清理 Storage 文件

**验收标准：**
- 编辑保存成功
- 删除确认后正确删除所有关联数据
- Storage 文件清理干净

---

## Epic-33: 社交互动（点赞/收藏）

**目标：** 实现点赞和收藏功能，为 Skill 提供社交信号。

**验收标准：**
- 登录用户可点赞/取消点赞
- 登录用户可收藏/取消收藏
- 点赞/收藏即时反馈（乐观更新）
- 计数实时更新
- 未登录用户点击提示登录

### Stories

#### Story 33.1: 点赞功能

**SP:** 2

**描述：**
实现 Skill 点赞/取消点赞功能。

**任务：**
- [ ] 创建 `hooks/useSkillLike.ts`
- [ ] 详情页点赞按钮：Heart 图标，激活状态变红
- [ ] 卡片内点赞数展示
- [ ] 乐观更新：点击后立即更新 UI，失败回滚
- [ ] 未登录用户点击提示登录（Dialog）
- [ ] 触发器自动更新 skills.likes_count
- [ ] ARIA label: "点赞此 Skill" / "取消点赞"

**验收标准：**
- 点赞/取消点赞功能正确
- 乐观更新体验流畅
- 计数正确更新
- 未登录处理得当

---

#### Story 33.2: 收藏功能

**SP:** 2

**描述：**
实现 Skill 收藏/取消收藏功能。

**任务：**
- [ ] 创建 `hooks/useSkillFavorite.ts`
- [ ] 详情页收藏按钮：Bookmark 图标，激活状态高亮
- [ ] 乐观更新
- [ ] 未登录用户点击提示登录
- [ ] 触发器自动更新 skills.favorites_count
- [ ] ARIA label: "收藏此 Skill" / "取消收藏"

**验收标准：**
- 收藏/取消收藏功能正确
- 乐观更新体验流畅
- 计数正确更新

---

#### Story 33.3: 用户交互状态查询

**SP:** 2

**描述：**
在 Skill 列表和详情页正确展示当前用户的点赞/收藏状态。

**任务：**
- [ ] 查询当前用户是否已点赞/收藏某 Skill
- [ ] 详情页加载时获取交互状态
- [ ] 列表页批量查询交互状态（优化性能）
- [ ] 创建 RPC 函数或使用 PostgREST 嵌套查询

**验收标准：**
- 已点赞/收藏的 Skill 按钮状态正确
- 列表页性能无明显下降

---

#### Story 33.4: 登录提示弹窗

**SP:** 2

**描述：**
创建通用的登录提示弹窗，在未登录用户尝试操作时展示。

**任务：**
- [ ] 创建登录提示 Dialog 组件
- [ ] 提示文案："登录后即可点赞/收藏"
- [ ] 按钮：登录 / 注册 / 取消
- [ ] 登录成功后自动执行原操作
- [ ] 在点赞、收藏、发布等需要认证的操作前触发

**验收标准：**
- 未登录操作正确触发弹窗
- 登录后自动完成原操作
- 弹窗可取消

---

## Epic-34: 用户中心

**目标：** 实现用户中心页面，展示用户发布的 Skill 和收藏列表。

**验收标准：**
- 用户可查看自己发布的 Skill 列表
- 用户可查看自己收藏的 Skill 列表
- 用户可查看其他用户的公开主页
- AuthorCard 组件正确展示

### Stories

#### Story 34.1: 我的 Skills 页面

**SP:** 2

**描述：**
创建用户发布的 Skill 管理页面。

**任务：**
- [ ] 创建 `pages/skills/UserSkillsPage.tsx`
- [ ] 展示当前用户发布的所有 Skill（包括 draft）
- [ ] Skill 状态标签：draft（灰色）/ public（绿色）/ private（黄色）
- [ ] 每个 Skill 的操作：编辑、删除、查看
- [ ] 统计概览：总 Skill 数、总下载量、总点赞数
- [ ] 空状态：引导发布第一个 Skill
- [ ] 配置路由 `/my-skills`

**验收标准：**
- 正确展示用户所有 Skill
- 状态标签正确
- 操作按钮可用

---

#### Story 34.2: 我的收藏页面

**SP:** 2

**描述：**
创建用户收藏列表页面。

**任务：**
- [ ] 创建 `pages/skills/UserFavoritesPage.tsx`
- [ ] 展示当前用户收藏的 Skill 列表
- [ ] 支持取消收藏
- [ ] 空状态：引导去发现 Skill
- [ ] 配置路由 `/favorites`

**验收标准：**
- 收藏列表正确展示
- 取消收藏后列表更新
- 空状态展示友好

---

#### Story 34.3: 用户公开主页

**SP:** 2

**描述：**
创建用户公开主页，展示用户信息和发布的公开 Skill。

**任务：**
- [ ] 创建 `pages/skills/UserProfilePage.tsx`
- [ ] AuthorCard 组件：头像 + 用户名 + Skill 数量 + 总下载量
- [ ] 创建 `components/skills/AuthorCard.tsx`
- [ ] 公开 Skill 列表（SkillCard 网格）
- [ ] 配置路由 `/user/:username`

**验收标准：**
- 用户主页正确展示
- 只展示公开 Skill
- AuthorCard 信息正确

---

#### Story 34.4: 顶部导航集成

**SP:** 2

**描述：**
将 Skills Hub 功能集成到顶部导航栏。

**任务：**
- [ ] 更新顶部导航栏
- [ ] 未登录：Logo + 搜索栏 + 登录/注册按钮
- [ ] 已登录：Logo + 搜索栏 + 发布按钮 + 用户菜单
- [ ] 用户菜单项：我的 Skills、我的收藏、个人设置、退出
- [ ] 固定顶部，滚动时 `bg-background/80 backdrop-blur`
- [ ] 移动端汉堡菜单

**验收标准：**
- 导航功能完整
- 登录/未登录状态切换正确
- 移动端菜单可用

---

## Epic-35: CLI 安装工具（Post-MVP）

**目标：** 创建 CLI 工具，让开发者可以通过命令行安装 Skill。

**验收标准：**
- `skill-hub install <slug>` 可安装最新版本
- `skill-hub install <slug>@<version>` 可安装指定版本
- 安装到 `.qoder/skills/<slug>/` 目录
- 安装成功率 > 98%
- 安装耗时 < 10 秒
- 支持 macOS 和 Linux

### Stories

#### Story 35.1: CLI 项目初始化

**SP:** 2

**描述：**
创建 CLI 工具项目，配置构建和发布。

**任务：**
- [ ] 创建 `cli/` 目录
- [ ] 选择 CLI 框架（Commander.js / oclif）
- [ ] 配置 TypeScript + 构建
- [ ] 配置 npm 发布
- [ ] 基础命令结构：`skill-hub <command>`

---

#### Story 35.2: install 命令实现

**SP:** 3

**描述：**
实现 `skill-hub install` 命令。

**任务：**
- [ ] 解析参数：`<slug>[@version]`
- [ ] 调用 skills-download Edge Function
- [ ] 下载 ZIP 文件
- [ ] 解压到 `.qoder/skills/<slug>/`
- [ ] 记录安装信息到本地 manifest
- [ ] 安装进度展示（spinner + 进度条）
- [ ] 成功/失败提示

---

#### Story 35.3: list 命令实现

**SP:** 1

**描述：**
实现 `skill-hub list` 查看已安装 Skill 列表。

**任务：**
- [ ] 读取本地 `.qoder/skills/` 目录
- [ ] 展示已安装 Skill 列表（名称、版本、安装时间）
- [ ] 支持离线使用

---

#### Story 35.4: search 命令实现

**SP:** 2

**描述：**
实现 `skill-hub search` 命令行搜索。

**任务：**
- [ ] 解析搜索关键词
- [ ] 调用 PostgREST API 搜索
- [ ] 表格格式展示结果（名称、描述、下载量、版本）
- [ ] 支持 --platform, --tag 筛选

---

#### Story 35.5: 认证与配置

**SP:** 2

**描述：**
CLI 工具的认证和配置管理。

**任务：**
- [ ] `skill-hub login` 命令：浏览器 OAuth 流程
- [ ] Token 存储：`~/.skill-hub/config.json`
- [ ] `skill-hub logout` 命令
- [ ] 匿名使用：install 和 search 不强制登录

---

## Epic-36: 作者数据看板（Post-MVP）

**目标：** 为 Skill 作者提供数据看板，展示下载趋势和用户反馈。

### Stories

#### Story 36.1: 数据看板页面

**SP:** 2

**描述：**
创建作者数据看板页面。

**任务：**
- [ ] 创建 `pages/skills/DashboardPage.tsx`
- [ ] 统计概览卡片：总下载量、总点赞、总收藏、Skill 数量
- [ ] 配置路由 `/dashboard`

---

#### Story 36.2: 下载趋势图表

**SP:** 2

**描述：**
展示 Skill 下载量趋势。

**任务：**
- [ ] 按日/周/月聚合下载数据
- [ ] 折线图展示下载趋势
- [ ] 支持按单个 Skill 筛选

---

#### Story 36.3: 安装来源分析

**SP:** 1

**描述：**
展示安装来源分布（Web vs CLI）。

**任务：**
- [ ] 饼图展示 Web vs CLI 安装比例
- [ ] 按平台分布（qoder/cursor 等）

---

## Epic-37: 评论系统（Post-MVP）

**目标：** 为 Skill 添加评论功能，增强社区交互。

### Stories

#### Story 37.1: 评论数据模型

**SP:** 2

**描述：**
创建评论表和 RLS 策略。

**任务：**
- [ ] 创建 `skill_comments` 表
- [ ] RLS 策略
- [ ] 计数触发器

---

#### Story 37.2: 评论列表组件

**SP:** 2

**描述：**
在详情页展示评论列表。

**任务：**
- [ ] 评论列表组件
- [ ] 分页加载
- [ ] 时间格式化

---

#### Story 37.3: 发表评论

**SP:** 2

**描述：**
实现评论输入和提交。

**任务：**
- [ ] 评论输入框
- [ ] Markdown 支持
- [ ] 提交和验证

---

#### Story 37.4: 评论管理

**SP:** 2

**描述：**
作者可管理自己 Skill 下的评论。

**任务：**
- [ ] 删除自己的评论
- [ ] 作者可删除自己 Skill 下的评论
- [ ] 举报评论

---

## 实施建议

### MVP 开发顺序

```
Week 1-2:  Epic-29 (数据库基础) → Story 30.1 (类型和服务层)
Week 2-3:  Epic-30 (发现与搜索) → 首页、搜索、卡片组件
Week 3-4:  Epic-31 (详情与下载) → 详情页、README、下载
Week 4-5:  Epic-32 (发布系统) → 发布表单、上传、Edge Function
Week 5-6:  Epic-33 (社交互动) + Epic-34 (用户中心)
```

### 风险与缓解

| 风险 | 缓解 |
|------|------|
| 搜索性能不足 | PostgreSQL tsvector + GIN 索引，MVP 足够 |
| 文件上传失败 | 客户端预验证 + 服务端二次校验 + 重试机制 |
| RLS 策略遗漏 | 每个 Story 包含对应的 RLS 测试用例 |
| 冷启动内容不足 | 预发布种子 Skill 数据 |

---

**文档状态：** ✅ 完成

**创建者：** Product Manager Agent (BMAD Method)
**日期：** 2026-03-19
