# 照片时光机 - 前端设计文档

## 一、项目概览

### 1.1 核心定位
- **项目名称：** 照片时光机（Photo Time Machine）
- **核心目标：** 记录团队成长轨迹，增强集体记忆与情感链接
- **技术特点：** 纯前端实现，完全Mock后端服务，支持离线使用

### 1.2 核心功能
1. 照片上传（批量+拖拽）
2. 人脸识别+打标
3. 时间轴归档（个人/团队视角）
4. 相册生成与下载
5. 时光快闪墙

### 1.3 技术栈
- **框架：** React 18 + TypeScript + Vite
- **UI：** TailwindCSS + Shadcn/UI
- **状态：** Zustand
- **Mock：** MSW + Faker.js + IndexedDB
- **其他：** React Router v6, React Window, JSZip

---

## 二、核心架构

### 2.1 目录结构
```
src/
├── components/         # ui/基础 + business/业务 + layout/布局
├── pages/             # Home, Upload, Timeline, Albums, AlbumDetail, PersonProfile
├── stores/            # usePhotoStore, usePersonStore, useAlbumStore, useUIStore
├── services/          # api/接口 + db/IndexedDB
├── mocks/             # handlers/MSW + data/Faker
├── utils/             # 图片处理、人脸识别、相册生成、下载
├── hooks/             # 上传、检测、滚动、下载
├── types/             # TypeScript类型定义
└── config/            # 路由和常量
```

### 2.2 架构分层
```
Pages（页面） → Components（组件） → Stores（状态）
                                        ↓
                              Services（API + DB）
                                        ↓
                          MSW + Faker + IndexedDB
```

**核心原则：**
- 单向数据流：UI → Store → Service → Mock/DB
- Mock透明：业务代码调用真实API，MSW拦截返回Mock数据
- 数据持久化：IndexedDB存储照片Base64，支持离线

### 2.3 路由规划
| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | Home | 快闪墙首页 |
| `/upload` | Upload | 照片上传 |
| `/timeline` | Timeline | 时间轴（支持view、personId参数） |
| `/albums` | Albums | 相册列表 |
| `/albums/:albumId` | AlbumDetail | 相册详情 |
| `/persons/:personId` | PersonProfile | 人物档案 |

### 2.4 状态管理（Zustand）
**4个Store：**
- `usePhotoStore` - photos, selectedPhotos, uploadingPhotos + actions
- `usePersonStore` - persons, currentPerson + actions
- `useAlbumStore` - albums, currentAlbum + actions
- `useUIStore` - loading, uploadProgress, modal, toast + actions

### 2.5 组件分层
| 层级 | 目录 | 职责 | 示例 |
|-----|------|------|------|
| 基础UI | `components/ui/` | Shadcn/UI组件 | Button, Input, Card |
| 业务组件 | `components/business/` | 业务逻辑组件 | PhotoCard, TimelineItem |
| 页面组件 | `pages/` | 路由页面 | Home, Upload, Timeline |

---

## 三、关键设计

### 3.1 核心页面功能
| 页面 | 核心组件 | 关键功能 |
|------|---------|---------|
| **Home** | FlashWall, FilterBar | 瀑布流轮播、节日筛选、照片详情 |
| **Upload** | DropZone, FaceDetectionPanel | 拖拽上传、人脸检测标注、进度显示 |
| **Timeline** | ViewSwitcher, VirtualTimelineList | 团队/个人切换、虚拟滚动、时间分组 |
| **Albums** | AlbumTypeTab, AlbumGrid | 类型切换、自动生成、封面展示 |
| **AlbumDetail** | PhotoGallery, ActionBar | 网格展示、JSZip下载、编辑分享 |

### 3.2 Mock数据策略（MSW + Faker + IndexedDB）
**工作流程：**
1. React发起Axios请求 → MSW拦截 → Faker生成数据 → 存入IndexedDB
2. 刷新页面后从IndexedDB恢复数据

**IndexedDB存储：**
- `photos` - id, base64, thumbnail, uploadedAt, tags, faces, metadata
- `persons` - id, name, avatar, department, joinedAt
- `albums` - id, title, type, photoIds, createdAt

**Mock数据：**
- 预设15人（Faker生成中文姓名）
- 初始80张照片（2023-2025年）
- 人脸识别：随机1-5个人脸+边界框

---

### 3.3 API接口（基础路径：`/api/v1`）
| 分类 | 接口 | 方法 | 说明 |
|------|------|------|------|
| **照片** | `/photos/upload` | POST | 批量上传 |
| | `/photos` | GET | 列表（分页、筛选） |
| | `/photos/:id` | GET/DELETE | 详情/删除 |
| | `/photos/:id/tags` | PUT | 更新标签 |
| **人员** | `/persons` | GET | 人员列表 |
| | `/persons/:id/photos` | GET | 人员照片 |
| **识别** | `/recognition/detect` | POST | 人脸检测 |
| | `/recognition/tag` | POST | 标记人脸 |
| **相册** | `/albums` | GET/POST | 列表/创建 |
| | `/albums/:id` | GET/PUT/DELETE | 详情/更新/删除 |
| | `/albums/generate` | POST | 自动生成 |
| **时间轴** | `/timeline` | GET | 时间轴数据 |

**核心类型：**
- `Photo` - id, base64, thumbnail, uploadedAt, tags, faces, metadata
- `Person` - id, name, avatar, department, joinedAt, photoCount
- `Album` - id, title, type, photoIds, coverPhoto, createdAt
- `Face` - id, personId, confidence, boundingBox

---

## 四、实施计划

### 4.1 三阶段开发
| 阶段 | 核心任务 | 验收标准 |
|-----|---------|---------|
| **阶段1：基础** | 项目初始化、依赖安装、目录结构<br>Mock系统（MSW+IndexedDB）<br>4个Zustand Store<br>Shadcn/UI基础组件 | Mock数据可用，路由正常 |
| **阶段2：核心功能** | Upload页面（拖拽+人脸识别）<br>Timeline页面（虚拟滚动）<br>Albums相册管理<br>AlbumDetail下载<br>Home快闪墙 | 5个核心页面可用 |
| **阶段3：优化** | 性能优化（懒加载、缓存）<br>体验优化（骨架屏、错误处理）<br>细节完善（搜索、统计） | 流畅稳定、体验完善 |

### 4.2 优先级
- **P0（最高）：** Mock系统 → 照片上传 → 时间轴
- **P1（高）：** 相册管理 → 相册下载
- **P2（中）：** 快闪墙 → 性能优化
- **P3（低）：** 搜索、统计等辅助功能

---

## 五、关键注意事项

### 5.1 技术风险
- **IndexedDB兼容性：** Safari私密模式不支持，需降级到localStorage
- **Base64存储：** 单张限500KB，总量限100张
- **虚拟滚动：** 动态高度复杂，考虑react-virtuoso
- **JSZip性能：** 单次下载限50张，添加进度提示

### 5.2 开发要点
1. 图片压缩：800x600，质量0.8
2. Mock一致性：IndexedDB持久化，刷新后恢复
3. 类型安全：严格TypeScript，避免any
4. 照片>50张必须启用虚拟滚动

### 5.3 扩展预留
- 后端对接：API已标准化，直接替换MSW
- 真实人脸识别：预留face-api.js接口
- 云端存储：可替换Base64为OSS URL
- 实时协作：可集成WebSocket

---

**文档版本：** v2.0（精简版）
**更新日期：** 2025-11-09
**状态：** 使用中
