# 照片时光机 - 前端实施任务清单

## 项目概述

基于React 18 + TailwindCSS + Shadcn/UI构建的照片管理系统，使用MSW + IndexedDB实现完全前端Mock方案。本文档将设计文档拆解为具体可执行的开发任务。

---

## 第一阶段：基础搭建（3-4天）

### 任务1.1：项目初始化与依赖安装

**目标：** 创建项目骨架，配置开发环境

- [ ] **1.1.1 创建Vite项目**
  ```bash
  npm create vite@latest photo-wall -- --template react-ts
  cd photo-wall
  ```

- [ ] **1.1.2 安装核心依赖**
  ```bash
  # UI框架
  npm install tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  
  # Shadcn/UI
  npx shadcn-ui@latest init
  
  # 状态管理与路由
  npm install zustand react-router-dom axios
  
  # Mock与数据
  npm install msw @faker-js/faker idb
  npm install -D @types/node
  
  # 工具库
  npm install react-window jszip date-fns
  npm install -D @types/react-window
  ```

- [ ] **1.1.3 配置TailwindCSS**
  - 修改`tailwind.config.js`添加内容路径
  - 在`src/index.css`引入Tailwind指令
  - 配置Shadcn/UI主题变量

- [ ] **1.1.4 配置TypeScript路径别名**
  - 修改`tsconfig.json`添加paths配置
  - 修改`vite.config.ts`添加resolve.alias

**验收标准：**
- ✅ 项目能够正常启动（`npm run dev`）
- ✅ TailwindCSS样式生效
- ✅ 路径别名`@/components`可用

---

### 任务1.2：目录结构创建与基础配置

**目标：** 建立标准化目录结构

- [ ] **1.2.1 创建核心目录**
  ```bash
  mkdir -p src/{components/{ui,business,layout},pages,stores,services/{api,db},mocks/{handlers,data},utils,hooks,types,config,assets/{images,styles}}
  ```

- [ ] **1.2.2 创建类型定义文件**
  - `src/types/photo.ts` - 照片、人脸类型
  - `src/types/person.ts` - 人员类型
  - `src/types/album.ts` - 相册类型
  - `src/types/api.ts` - API响应通用类型

- [ ] **1.2.3 创建配置文件**
  - `src/config/constants.ts` - 常量定义（API_BASE_URL、图片尺寸限制等）
  - `.env.development` - 开发环境变量
  - `.env.production` - 生产环境变量

**验收标准：**
- ✅ 目录结构完整（二级目录）
- ✅ 类型文件包含核心接口定义
- ✅ 常量文件可被正常导入

---

### 任务1.3：Mock系统搭建

**目标：** 实现MSW + IndexedDB完整Mock方案

- [ ] **1.3.1 配置MSW浏览器拦截**
  - 初始化MSW：`npx msw init public/ --save`
  - 创建`src/mocks/browser.ts`配置文件
  - 在`src/main.tsx`中启动MSW Worker（仅开发环境）

- [ ] **1.3.2 实现IndexedDB工具类**
  - `src/services/db/photoDB.ts`
    - 定义Schema：photos表（id, base64, thumbnail, uploadedAt, tags, faces, metadata）
    - 实现方法：init(), addPhotos(), getPhotos(), deletePhoto(), updatePhoto()
  - `src/services/db/personDB.ts`
    - 定义Schema：persons表（id, name, avatar, department, joinedAt, photoCount）
    - 实现方法：init(), getPersons(), getPerson(), updatePerson()
  - `src/services/db/albumDB.ts`
    - 定义Schema：albums表（id, title, description, type, coverPhoto, photoIds, createdAt）
    - 实现方法：init(), getAlbums(), createAlbum(), updateAlbum(), deleteAlbum()

- [ ] **1.3.3 生成Mock基础数据**
  - `src/mocks/data/mockPersons.ts`
    - 使用Faker生成15个中文人员数据（包含姓名、头像、部门、入职日期）
    - 导出MOCK_PERSONS常量数组
  - `src/mocks/data/mockPhotos.ts`
    - 生成80张照片Mock数据（2023-2025年随机分布）
    - 使用faker.image.dataUri()生成Base64图片
    - 随机分配1-5个人脸数据（关联MOCK_PERSONS）
  - `src/mocks/data/mockConfig.ts`
    - 定义Mock配置（延迟时间、数据量限制等）

- [ ] **1.3.4 实现人脸识别Mock算法**
  - `src/utils/faceRecognition.ts`
    - mockFaceRecognition(imageBase64: string): Promise<Face[]>
    - 模拟1秒延迟
    - 随机生成1-5个人脸boundingBox
    - 随机匹配MOCK_PERSONS中的人员（置信度0.75-0.99）

- [ ] **1.3.5 创建MSW请求处理器**
  - `src/mocks/handlers/photoHandlers.ts`
    - POST `/api/photos/upload` - 上传照片，调用人脸识别，存入IndexedDB
    - GET `/api/photos` - 分页获取照片列表（从IndexedDB读取）
    - GET `/api/photos/:id` - 获取照片详情
    - DELETE `/api/photos/:id` - 删除照片
    - PUT `/api/photos/:id/tags` - 更新照片标签
  - `src/mocks/handlers/personHandlers.ts`
    - GET `/api/persons` - 获取人员列表
    - GET `/api/persons/:id` - 获取人员详情
    - GET `/api/persons/:id/photos` - 获取人员相关照片
  - `src/mocks/handlers/albumHandlers.ts`
    - GET `/api/albums` - 获取相册列表
    - POST `/api/albums` - 创建相册
    - GET `/api/albums/:id` - 获取相册详情
    - PUT `/api/albums/:id` - 更新相册
    - DELETE `/api/albums/:id` - 删除相册
    - POST `/api/albums/generate` - 自动生成相册

- [ ] **1.3.6 初始化Mock数据到IndexedDB**
  - 创建`src/mocks/data/initMockData.ts`
  - 在首次加载时检测IndexedDB是否为空
  - 若为空，则批量插入mockPersons和mockPhotos
  - 在`src/main.tsx`中调用初始化函数

**验收标准：**
- ✅ MSW能够拦截API请求并返回Mock数据
- ✅ IndexedDB正常存储和读取数据
- ✅ 刷新页面后数据保持
- ✅ 控制台能看到MSW拦截日志

---

### 任务1.4：状态管理初始化

**目标：** 创建Zustand Store架构

- [ ] **1.4.1 照片状态管理**
  - `src/stores/usePhotoStore.ts`
  - State: photos, selectedPhotos, uploadingPhotos
  - Actions: addPhotos, deletePhoto, updatePhoto, selectPhoto, clearSelection, setUploadProgress

- [ ] **1.4.2 人员状态管理**
  - `src/stores/usePersonStore.ts`
  - State: persons, currentPerson
  - Actions: setPersons, selectPerson, updatePersonTag

- [ ] **1.4.3 相册状态管理**
  - `src/stores/useAlbumStore.ts`
  - State: albums, currentAlbum
  - Actions: setAlbums, createAlbum, updateAlbum, deleteAlbum, selectAlbum

- [ ] **1.4.4 UI状态管理**
  - `src/stores/useUIStore.ts`
  - State: loading, uploadProgress, modal, toast
  - Actions: showLoading, hideLoading, openModal, closeModal, showToast, hideToast

**验收标准：**
- ✅ Store能够正常创建和订阅
- ✅ TypeScript类型推导正确
- ✅ 在组件中能够正常使用（编写简单测试组件验证）

---

### 任务1.5：基础组件库搭建

**目标：** 引入Shadcn/UI组件，创建布局组件

- [ ] **1.5.1 引入Shadcn/UI核心组件**
  ```bash
  npx shadcn-ui@latest add button input card dialog toast
  npx shadcn-ui@latest add dropdown-menu avatar badge progress
  ```

- [ ] **1.5.2 创建MainLayout布局组件**
  - `src/components/layout/MainLayout/index.tsx`
  - 左侧Sidebar（导航菜单）
  - 顶部Header（标题、搜索框、用户信息）
  - 主内容区（<Outlet />）
  - 响应式设计（移动端折叠Sidebar）

- [ ] **1.5.3 创建Header组件**
  - `src/components/layout/Header/index.tsx`
  - Logo + 项目名称
  - 搜索框（预留，第三阶段实现）
  - 用户下拉菜单（Avatar + DropdownMenu）

- [ ] **1.5.4 创建Sidebar组件**
  - `src/components/layout/Sidebar/index.tsx`
  - 导航菜单项：首页、上传、时间轴、相册、人员
  - 使用React Router Link组件
  - 激活状态高亮

- [ ] **1.5.5 创建全局Loading和Toast组件**
  - `src/components/ui/GlobalLoading.tsx` - 全屏加载动画
  - 使用Shadcn/UI的Toast组件包装全局提示

- [ ] **1.5.6 配置路由**
  - `src/config/routes.tsx`
  - 定义路由结构（使用createBrowserRouter）
  - 临时创建占位页面组件（仅显示页面名称）

**验收标准：**
- ✅ MainLayout正确渲染，包含Header和Sidebar
- ✅ 路由切换正常（点击Sidebar菜单跳转）
- ✅ Shadcn/UI组件样式正确显示
- ✅ 移动端Sidebar能够折叠

---

## 第二阶段：核心功能实现（5-7天）

### 任务2.1：照片上传功能

**目标：** 实现完整的照片上传流程（拖拽、压缩、人脸识别、存储）

- [ ] **2.1.1 创建Upload页面基础结构**
  - `src/pages/Upload/index.tsx`
  - 使用Grid布局：左侧DropZone，右侧预览列表
  - 集成usePhotoStore和useUIStore

- [ ] **2.1.2 实现DropZone拖拽上传组件**
  - `src/components/business/DropZone/index.tsx`
  - 使用HTML5拖拽API（onDrop, onDragOver, onDragLeave）
  - 点击触发文件选择（input type="file" multiple accept="image/*"）
  - 文件验证（仅图片，单张<10MB）
  - 视觉反馈（拖拽悬停高亮）

- [ ] **2.1.3 实现图片压缩工具**
  - `src/utils/imageProcessor.ts`
  - compressImage(file: File): Promise<string>
    - 使用Canvas API压缩图片
    - 目标尺寸：800x600（保持比例）
    - 质量：0.8
    - 返回Base64字符串
  - generateThumbnail(base64: string): Promise<string>
    - 生成200x150缩略图

- [ ] **2.1.4 创建照片预览列表组件**
  - `src/components/business/PhotoPreviewList/index.tsx`
  - 网格展示待上传照片
  - 每张照片显示：缩略图、文件名、大小、删除按钮
  - 上传中状态（Progress条）

- [ ] **2.1.5 实现人脸检测面板**
  - `src/components/business/FaceDetectionPanel/index.tsx`
  - 显示当前正在识别的照片
  - 绘制人脸框（Canvas覆盖层）
  - 显示识别到的人员列表（头像 + 姓名 + 置信度）
  - 手动调整标签功能（DropdownMenu选择人员）

- [ ] **2.1.6 实现上传Hook**
  - `src/hooks/usePhotoUpload.ts`
  - 封装上传逻辑：
    1. 读取文件 → 压缩 → 生成缩略图
    2. 调用人脸识别API（/api/recognition/detect）
    3. 批量上传（/api/photos/upload）
    4. 更新uploadProgress
    5. 成功后添加到photoStore
  - 错误处理和Toast提示

- [ ] **2.1.7 集成API服务**
  - `src/services/api/photo.ts`
  - uploadPhotos(photos: FormData): Promise<Photo[]>
  - `src/services/api/recognition.ts`
  - detectFaces(photo: File): Promise<Face[]>
  - tagFace(photoId: string, faceId: string, personId: string): Promise<Photo>

**验收标准：**
- ✅ 能够拖拽或点击上传图片
- ✅ 图片自动压缩到合理大小
- ✅ Mock人脸识别正常返回数据
- ✅ 照片成功存入IndexedDB
- ✅ 上传进度正确显示
- ✅ 能够手动调整人脸标签

---

### 任务2.2：时间轴页面

**目标：** 实现团队/个人时间轴展示，支持虚拟滚动

- [ ] **2.2.1 创建Timeline页面基础结构**
  - `src/pages/Timeline/index.tsx`
  - 顶部：视角切换（团队/个人）+ 人员选择器（个人视角时显示）
  - 主体：时间轴列表（虚拟滚动）

- [ ] **2.2.2 实现视角切换组件**
  - `src/components/business/ViewSwitcher/index.tsx`
  - 使用Shadcn/UI的ToggleGroup或Tabs
  - 团队视角 / 个人视角切换
  - 切换时清空人员选择

- [ ] **2.2.3 实现人员选择器**
  - `src/components/business/PersonSelector/index.tsx`
  - 下拉列表显示所有人员（头像 + 姓名）
  - 选中后筛选该人员的照片
  - 使用Shadcn/UI的Select或Combobox

- [ ] **2.2.4 实现TimelineItem组件**
  - `src/components/business/TimelineItem/index.tsx`
  - 日期标题（如"2025年1月"）
  - 照片网格（最多显示9张，超出显示"+N"）
  - 点击照片展开大图
  - 显示参与人员头像列表

- [ ] **2.2.5 实现时间轴数据处理逻辑**
  - `src/utils/timelineProcessor.ts`
  - groupPhotosByDate(photos: Photo[]): TimelineItem[]
    - 按年-月分组
    - 倒序排列（最新在前）
  - filterPhotosByPerson(photos: Photo[], personId: string): Photo[]

- [ ] **2.2.6 集成React Window虚拟滚动**
  - `src/components/business/VirtualTimelineList/index.tsx`
  - 使用react-window的VariableSizeList
  - 动态计算每个TimelineItem高度
  - 实现无限滚动（hooks/useInfiniteScroll.ts）

- [ ] **2.2.7 实现照片大图预览Modal**
  - `src/components/business/ImagePreviewModal/index.tsx`
  - 使用Shadcn/UI的Dialog
  - 支持左右切换（上一张/下一张）
  - 显示照片信息（日期、标签、人员）
  - ESC键关闭

- [ ] **2.2.8 集成API服务**
  - `src/services/api/timeline.ts`
  - getTimeline(view: 'team' | 'personal', personId?: string): Promise<TimelineItem[]>
  - getTimelineStats(personId?: string): Promise<{ totalPhotos: number, dateRange: string }>

**验收标准：**
- ✅ 团队/个人视角切换正常
- ✅ 照片按时间分组正确显示
- ✅ 虚拟滚动流畅（80张照片无卡顿）
- ✅ 点击照片能够大图预览
- ✅ 个人视角能正确筛选人员照片

---

### 任务2.3：快闪墙首页

**目标：** 实现动态照片展示墙

- [ ] **2.3.1 创建Home页面基础结构**
  - `src/pages/Home/index.tsx`
  - 顶部：筛选栏（节日、时间范围）
  - 主体：FlashWall组件
  - 底部：统计信息（总照片数、参与人数）

- [ ] **2.3.2 实现FlashWall组件**
  - `src/components/business/FlashWall/index.tsx`
  - 瀑布流布局（Masonry）
  - 每3秒自动切换一批照片（淡入淡出动画）
  - 照片随机排列
  - 悬停暂停轮播
  - 点击照片进入大图预览

- [ ] **2.3.3 实现节日筛选组件**
  - `src/components/business/FilterBar/index.tsx`
  - 节日选择（全部、春节、中秋、团建、年会等）
  - 时间范围选择（DatePicker）
  - 筛选后重新获取照片数据

- [ ] **2.3.4 实现瀑布流布局逻辑**
  - `src/utils/masonryLayout.ts`
  - calculateMasonryLayout(photos: Photo[], columnCount: number): Layout[]
    - 计算每张照片的位置（x, y）
    - 按列高度平衡分布
  - 响应式列数（桌面4列，平板3列，手机2列）

- [ ] **2.3.5 实现自动轮播Hook**
  - `src/hooks/useAutoPlay.ts`
  - 封装setInterval逻辑
  - 支持暂停/恢复
  - 组件卸载时清除定时器

**验收标准：**
- ✅ 照片自动轮播（3秒切换）
- ✅ 瀑布流布局美观（列高度平衡）
- ✅ 节日筛选功能正常
- ✅ 悬停暂停、移开恢复
- ✅ 响应式布局正确

---

### 任务2.4：相册管理功能

**目标：** 实现相册创建、列表展示、自动生成

- [ ] **2.4.1 创建Albums页面基础结构**
  - `src/pages/Albums/index.tsx`
  - 顶部：类型切换Tab（个人时光集/团队影集）+ 创建相册按钮
  - 主体：相册网格列表

- [ ] **2.4.2 实现AlbumCover组件**
  - `src/components/business/AlbumCover/index.tsx`
  - 封面图（第一张照片，宽高比16:9）
  - 相册标题
  - 照片数量徽章
  - 创建日期
  - 悬停显示操作按钮（查看、编辑、删除）

- [ ] **2.4.3 实现创建相册Modal**
  - `src/components/business/CreateAlbumModal/index.tsx`
  - 使用Shadcn/UI的Dialog
  - 表单字段：标题、描述、类型（个人/团队）、选择照片
  - 照片选择器（多选CheckboxGrid）
  - 验证：标题必填，至少选择1张照片

- [ ] **2.4.4 实现相册自动生成逻辑**
  - `src/utils/albumGenerator.ts`
  - generateMonthlyAlbums(photos: Photo[]): Album[]
    - 按月份分组生成相册
    - 标题格式："2025年1月回忆"
  - generateEventAlbums(photos: Photo[]): Album[]
    - 根据标签分组（如"团建"、"年会"）
  - 触发时机：点击"自动生成"按钮

- [ ] **2.4.5 集成API服务**
  - `src/services/api/album.ts`
  - getAlbums(type?: 'personal' | 'team'): Promise<Album[]>
  - createAlbum(data: CreateAlbumDto): Promise<Album>
  - updateAlbum(id: string, data: UpdateAlbumDto): Promise<Album>
  - deleteAlbum(id: string): Promise<void>
  - generateAlbums(type: 'monthly' | 'event'): Promise<Album[]>

**验收标准：**
- ✅ 相册列表正确显示
- ✅ 能够手动创建相册
- ✅ 自动生成相册功能正常（按月份/标签）
- ✅ 类型切换（个人/团队）正常
- ✅ 删除相册需要确认弹窗

---

### 任务2.5：相册详情与下载

**目标：** 实现相册详情展示和ZIP下载

- [ ] **2.5.1 创建AlbumDetail页面**
  - `src/pages/AlbumDetail/index.tsx`
  - 顶部：AlbumHeader（标题、描述、创建日期、编辑按钮）
  - 主体：PhotoGallery（照片网格）
  - 底部：ActionBar（分享、下载、删除）

- [ ] **2.5.2 实现PhotoGallery组件**
  - `src/components/business/PhotoGallery/index.tsx`
  - 响应式网格布局（桌面4列，平板3列，手机2列）
  - 照片懒加载（Intersection Observer）
  - 点击照片打开预览Modal
  - 多选模式（长按或Checkbox）

- [ ] **2.5.3 实现相册编辑功能**
  - `src/components/business/EditAlbumModal/index.tsx`
  - 修改标题、描述
  - 添加/移除照片
  - 保存后更新IndexedDB

- [ ] **2.5.4 实现JSZip下载功能**
  - `src/utils/downloadHelper.ts`
  - downloadAlbumAsZip(album: Album): Promise<void>
    - 使用JSZip创建ZIP文件
    - 添加所有照片（Base64转Blob）
    - 文件命名：photo_001.jpg, photo_002.jpg
    - 生成Blob并触发下载（a标签download属性）
  - 显示下载进度（useUIStore.uploadProgress复用）

- [ ] **2.5.5 实现分享功能（Mock）**
  - `src/components/business/ShareModal/index.tsx`
  - 生成分享链接（Mock URL）
  - 复制链接到剪贴板
  - 显示二维码（可选，使用qrcode库）

- [ ] **2.5.6 实现相册下载Hook**
  - `src/hooks/useAlbumDownload.ts`
  - 封装下载逻辑
  - 错误处理（照片数量限制<50张）
  - 进度反馈

**验收标准：**
- ✅ 相册详情正确显示
- ✅ 能够编辑相册信息和照片
- ✅ 下载功能正常（生成ZIP包）
- ✅ 下载进度正确显示
- ✅ 分享链接能够复制到剪贴板
- ✅ 照片懒加载生效

---

## 第三阶段：优化与完善（2-3天）

### 任务3.1：性能优化

**目标：** 提升大数据量场景下的性能

- [ ] **3.1.1 实现图片懒加载**
  - `src/hooks/useLazyLoad.ts`
  - 使用Intersection Observer API
  - 照片进入视口时才加载Base64
  - 加载前显示占位图（skeleton）

- [ ] **3.1.2 优化React Window配置**
  - 调整缓冲区大小（overscanCount）
  - 优化itemSize计算逻辑
  - 添加滚动节流（throttle）

- [ ] **3.1.3 实现照片缩略图缓存**
  - `src/utils/thumbnailCache.ts`
  - 使用Map缓存已加载的缩略图
  - LRU淘汰策略（最多缓存100张）

- [ ] **3.1.4 优化IndexedDB查询**
  - 为uploadedAt和tags字段添加索引
  - 使用cursor进行分页查询
  - 批量操作使用事务（transaction）

- [ ] **3.1.5 实现代码分割**
  - 使用React.lazy动态导入页面组件
  - 添加Suspense fallback（Loading组件）
  - 按路由拆分chunk

**验收标准：**
- ✅ 首屏加载时间<2秒
- ✅ 滚动时间轴流畅（60fps）
- ✅ 100张照片场景无明显卡顿
- ✅ 打包后chunk大小合理（单个<500KB）

---

### 任务3.2：用户体验优化

**目标：** 提升交互细节和视觉反馈

- [ ] **3.2.1 实现骨架屏Loading**
  - `src/components/ui/Skeleton.tsx`（使用Shadcn/UI）
  - 为PhotoCard、TimelineItem、AlbumCover添加骨架屏
  - 数据加载前显示骨架屏

- [ ] **3.2.2 优化上传进度反馈**
  - 单张照片上传进度条
  - 整体进度百分比
  - 上传成功/失败Toast提示
  - 失败照片重试按钮

- [ ] **3.2.3 实现操作确认弹窗**
  - `src/components/ui/ConfirmDialog.tsx`
  - 删除照片确认
  - 删除相册确认
  - 使用Shadcn/UI的AlertDialog

- [ ] **3.2.4 实现错误边界**
  - `src/components/ErrorBoundary.tsx`
  - 捕获组件渲染错误
  - 显示友好错误页面
  - 提供重试按钮

- [ ] **3.2.5 优化移动端响应式**
  - 调整各页面移动端布局
  - 优化触摸交互（增大点击区域）
  - 适配移动端键盘（输入框聚焦时页面不跳动）
  - 测试iPhone和Android设备

**验收标准：**
- ✅ 所有加载状态都有骨架屏
- ✅ 删除操作需要二次确认
- ✅ 错误不会导致白屏
- ✅ 移动端布局正常，交互流畅

---

### 任务3.3：细节功能完善

**目标：** 补充辅助功能

- [ ] **3.3.1 实现人物档案页面**
  - `src/pages/PersonProfile/index.tsx`
  - 人员基本信息卡片（头像、姓名、部门、入职日期）
  - 个人照片网格（所有包含该人的照片）
  - 统计数据（总照片数、时间跨度）

- [ ] **3.3.2 实现搜索功能**
  - `src/components/layout/SearchBar/index.tsx`（Header中）
  - 支持搜索：人员姓名、照片标签、日期
  - 实时搜索建议（Combobox）
  - 搜索结果页面（复用PhotoGallery）

- [ ] **3.3.3 实现照片标签管理**
  - `src/components/business/TagManager/index.tsx`
  - 在ImagePreviewModal中显示
  - 添加标签（输入框 + 建议列表）
  - 删除标签（点击Badge的X）

- [ ] **3.3.4 优化人脸标注编辑**
  - 在FaceDetectionPanel中添加"手动添加人脸"功能
  - 允许拖拽调整boundingBox大小和位置
  - 修改人员标签（DropdownMenu）

- [ ] **3.3.5 实现统计数据展示**
  - `src/pages/Dashboard/index.tsx`（可选）
  - 总照片数、总人数
  - 人员照片数排行榜（Top 10）
  - 月度上传趋势图（使用recharts库）
  - 标签云（常用标签）

**验收标准：**
- ✅ 人物档案页面正确显示
- ✅ 搜索功能返回正确结果
- ✅ 标签能够添加和删除
- ✅ 人脸框能够手动调整
- ✅ 统计数据准确（可选）

---

### 任务3.4：测试与文档

**目标：** 确保质量和可维护性

- [ ] **3.4.1 功能测试**
  - 测试照片上传流程（单张、批量、拖拽）
  - 测试时间轴切换和筛选
  - 测试相册创建、编辑、删除
  - 测试下载功能（各种网络环境）
  - 测试人脸标注编辑

- [ ] **3.4.2 浏览器兼容性测试**
  - Chrome最新版
  - Safari最新版（Mac和iOS）
  - Firefox最新版
  - Edge最新版
  - 记录兼容性问题并修复

- [ ] **3.4.3 性能测试**
  - 测试80张照片加载时间
  - 测试虚拟滚动流畅度
  - 测试大相册下载（30张照片）
  - 使用Chrome DevTools分析性能瓶颈

- [ ] **3.4.4 编写README.md**
  - 项目介绍和功能列表
  - 技术栈说明
  - 安装和运行步骤
  - 目录结构说明
  - Mock数据说明
  - 截图展示

- [ ] **3.4.5 编写核心功能使用文档**
  - `docs/USER_GUIDE.md`
  - 如何上传照片
  - 如何创建相册
  - 如何下载相册
  - 如何搜索照片
  - 常见问题FAQ

**验收标准：**
- ✅ 核心功能测试通过（无阻塞性Bug）
- ✅ 主流浏览器兼容
- ✅ README文档完整
- ✅ 用户指南清晰易懂

---

## 文件清单汇总

### 需要创建/修改的核心文件

#### 配置文件（6个）
- `tailwind.config.js` - TailwindCSS配置
- `tsconfig.json` - TypeScript配置
- `vite.config.ts` - Vite配置
- `.env.development` - 开发环境变量
- `.env.production` - 生产环境变量
- `src/config/constants.ts` - 常量定义

#### 类型定义（4个）
- `src/types/photo.ts` - 照片、人脸类型
- `src/types/person.ts` - 人员类型
- `src/types/album.ts` - 相册类型
- `src/types/api.ts` - API响应类型

#### Mock系统（11个）
- `src/mocks/browser.ts` - MSW配置
- `src/mocks/data/mockPersons.ts` - 人员Mock数据
- `src/mocks/data/mockPhotos.ts` - 照片Mock数据
- `src/mocks/data/mockConfig.ts` - Mock配置
- `src/mocks/data/initMockData.ts` - 初始化数据
- `src/mocks/handlers/photoHandlers.ts` - 照片API Handler
- `src/mocks/handlers/personHandlers.ts` - 人员API Handler
- `src/mocks/handlers/albumHandlers.ts` - 相册API Handler
- `src/services/db/photoDB.ts` - 照片数据库
- `src/services/db/personDB.ts` - 人员数据库
- `src/services/db/albumDB.ts` - 相册数据库

#### 状态管理（4个）
- `src/stores/usePhotoStore.ts` - 照片状态
- `src/stores/usePersonStore.ts` - 人员状态
- `src/stores/useAlbumStore.ts` - 相册状态
- `src/stores/useUIStore.ts` - UI状态

#### API服务（4个）
- `src/services/api/photo.ts` - 照片API
- `src/services/api/person.ts` - 人员API
- `src/services/api/album.ts` - 相册API
- `src/services/api/recognition.ts` - 人脸识别API

#### 工具函数（7个）
- `src/utils/imageProcessor.ts` - 图片处理
- `src/utils/faceRecognition.ts` - 人脸识别Mock
- `src/utils/timelineProcessor.ts` - 时间轴处理
- `src/utils/albumGenerator.ts` - 相册生成
- `src/utils/downloadHelper.ts` - 下载工具
- `src/utils/masonryLayout.ts` - 瀑布流布局
- `src/utils/thumbnailCache.ts` - 缩略图缓存

#### 自定义Hooks（5个）
- `src/hooks/usePhotoUpload.ts` - 上传Hook
- `src/hooks/useInfiniteScroll.ts` - 无限滚动Hook
- `src/hooks/useAlbumDownload.ts` - 下载Hook
- `src/hooks/useAutoPlay.ts` - 自动播放Hook
- `src/hooks/useLazyLoad.ts` - 懒加载Hook

#### 布局组件（3个）
- `src/components/layout/MainLayout/index.tsx` - 主布局
- `src/components/layout/Header/index.tsx` - 头部
- `src/components/layout/Sidebar/index.tsx` - 侧边栏

#### 业务组件（15个）
- `src/components/business/DropZone/index.tsx` - 拖拽上传
- `src/components/business/PhotoPreviewList/index.tsx` - 照片预览列表
- `src/components/business/FaceDetectionPanel/index.tsx` - 人脸检测面板
- `src/components/business/ViewSwitcher/index.tsx` - 视角切换
- `src/components/business/PersonSelector/index.tsx` - 人员选择器
- `src/components/business/TimelineItem/index.tsx` - 时间轴条目
- `src/components/business/VirtualTimelineList/index.tsx` - 虚拟滚动列表
- `src/components/business/ImagePreviewModal/index.tsx` - 图片预览弹窗
- `src/components/business/FlashWall/index.tsx` - 快闪墙
- `src/components/business/FilterBar/index.tsx` - 筛选栏
- `src/components/business/AlbumCover/index.tsx` - 相册封面
- `src/components/business/CreateAlbumModal/index.tsx` - 创建相册弹窗
- `src/components/business/PhotoGallery/index.tsx` - 照片网格
- `src/components/business/EditAlbumModal/index.tsx` - 编辑相册弹窗
- `src/components/business/ShareModal/index.tsx` - 分享弹窗

#### 页面组件（6个）
- `src/pages/Home/index.tsx` - 首页（快闪墙）
- `src/pages/Upload/index.tsx` - 上传页面
- `src/pages/Timeline/index.tsx` - 时间轴
- `src/pages/Albums/index.tsx` - 相册列表
- `src/pages/AlbumDetail/index.tsx` - 相册详情
- `src/pages/PersonProfile/index.tsx` - 人物档案

#### UI组件（3个）
- `src/components/ui/GlobalLoading.tsx` - 全局加载
- `src/components/ui/ConfirmDialog.tsx` - 确认弹窗
- `src/components/ui/Skeleton.tsx` - 骨架屏（Shadcn/UI）

#### 其他（4个）
- `src/config/routes.tsx` - 路由配置
- `src/App.tsx` - 根组件
- `src/main.tsx` - 入口文件
- `src/components/ErrorBoundary.tsx` - 错误边界

**总计：约75个文件**

---

## 开发建议

### 优先级执行顺序
1. **P0（必须先完成）：** 任务1.1-1.3（项目初始化、Mock系统）
2. **P0：** 任务1.4-1.5（状态管理、基础组件）
3. **P0：** 任务2.1（照片上传）
4. **P0：** 任务2.2（时间轴）
5. **P1：** 任务2.4-2.5（相册管理和下载）
6. **P2：** 任务2.3（快闪墙）
7. **P2：** 任务3.1-3.2（性能和体验优化）
8. **P3：** 任务3.3（细节功能）
9. **P3：** 任务3.4（测试和文档）

### 每日检查清单
- [ ] 代码通过TypeScript类型检查
- [ ] 无Console错误
- [ ] 新增组件已添加适当的PropTypes
- [ ] 代码格式化（Prettier）
- [ ] 提交代码前测试核心流程
- [ ] 更新进度到任务清单

### 关键里程碑
- **里程碑1（第4天）：** Mock系统可用，能上传和查看照片
- **里程碑2（第8天）：** 时间轴和相册功能完整
- **里程碑3（第11天）：** 所有功能完成，优化和测试通过

---

**文档版本：** v1.0  
**创建日期：** 2025-01-08  
**预计工期：** 10-14天  
**状态：** 待审批
