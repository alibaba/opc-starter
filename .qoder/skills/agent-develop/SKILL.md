---
name: agent-develop
description: Photo Wall 项目 Agent Tool 开发规范。当开发新的 Agent 工具、修改现有工具、添加 A2UI 组件或调试 Agent 功能时，此 Skill 提供完整的 Colocation 架构规范、工具开发模板和最佳实践。基于 Epic-24 AI 亲和架构设计。
---

# Agent Tool 开发规范

> **核心理念**: Colocation + Single Source of Truth。一个工具一个目录，完全自包含。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Zod | 3.x | 参数 Schema 定义（单一来源）|
| zod-to-json-schema | 3.x | 生成 OpenAI 工具 Schema |
| Zustand | 5.0 | 状态管理 |
| Vitest | 4.0 | 单元测试 |

---

## 🏗️ 架构概览

### 目录结构

```
src/lib/agent/tools/
├── index.ts              # 统一导出 + executeToolByName
├── registry.ts           # defineTool 注册器
├── types.ts              # ToolExecutionResult 等共享类型
├── helpers.ts            # tryAutoLoadSelectedPhoto 等辅助函数
├── _template/            # 新工具模板 ⭐
│   ├── index.ts
│   └── index.test.ts
│
├── rotate/               # 旋转工具（参考实现）
│   ├── index.ts          # 定义 + 执行逻辑
│   └── index.test.ts     # 测试
│
├── flip/                 # 翻转工具
├── crop/                 # 裁剪工具
├── filter/               # 滤镜工具
├── adjust/               # 调整工具（亮度/对比度/饱和度）
├── fusion/               # AI 融合工具
│   ├── index.ts
│   ├── callbacks.ts      # 异步任务回调
│   └── index.test.ts
├── video/                # AI 视频生成工具
├── optimize/             # AI 优化工具
├── context/              # 上下文工具
│   ├── index.ts          # 统一导出
│   ├── getSelected.ts    # 获取选中照片
│   ├── getCurrent.ts     # 获取当前编辑照片
│   └── loadPhoto.ts      # 加载照片到编辑器
├── navigation/           # 导航工具
└── save/                 # 保存工具
```

### 数据流

```
用户消息
    ↓
useAgentChat.sendMessage()
    ↓
sseClient → agent-gateway (Edge Function)
    ↓
[SSE] tool_call 事件
    ↓
handleToolCall() → pendingToolCalls
    ↓
handleDone() → executeToolByName(name, args)
    ↓
getTool(name) → tool.validateAndExecute(args)
    ↓
Zod 验证 → tool.execute(parsedParams)
    ↓
返回 ToolExecutionResult + A2UI 组件
```

---

## 🚀 添加新工具（3 步完成）

### Step 1: 创建工具目录

```bash
mkdir -p src/lib/agent/tools/myNewTool
```

### Step 2: 创建工具文件

```typescript
// src/lib/agent/tools/myNewTool/index.ts

import { z } from 'zod';
import { defineTool } from '../registry';
import { usePhotoEditorStore } from '@/stores/usePhotoEditorStore';
import {
  tryLoadPhotoById,
  tryAutoLoadSelectedPhoto,
  createSelectionGuideResult,
} from '../helpers';

// 1️⃣ 定义参数 Schema（Zod 单一来源）
const myToolParamsSchema = z.object({
  photoId: z.string().describe('照片ID'),
  param1: z.string().describe('参数1说明'),
  param2: z.number().optional().describe('可选参数2'),
});

// 2️⃣ 导出工具定义
export const myTool = defineTool({
  name: 'myToolName',           // 工具名称（camelCase）
  description: '工具描述',       // 给 LLM 看的描述
  category: 'edit',             // 分类: 'edit' | 'ai' | 'context' | 'navigation'
  parameters: myToolParamsSchema,

  // 3️⃣ 执行逻辑
  async execute(params) {
    try {
      // 获取 Store 状态
      let { currentImage, filter, brightness, contrast, saturation } =
        usePhotoEditorStore.getState();

      // ⭐ 三层 fallback 加载照片（重要！）
      if (!currentImage) {
        // 1️⃣ 优先使用传入的 photoId
        const loadedById = await tryLoadPhotoById(params.photoId);
        if (loadedById) {
          const state = usePhotoEditorStore.getState();
          currentImage = state.currentImage;
          filter = state.filter;
          brightness = state.brightness;
          contrast = state.contrast;
          saturation = state.saturation;
        } else {
          // 2️⃣ 其次尝试加载选中照片
          const autoLoaded = await tryAutoLoadSelectedPhoto();
          if (autoLoaded) {
            const state = usePhotoEditorStore.getState();
            currentImage = state.currentImage;
            filter = state.filter;
            brightness = state.brightness;
            contrast = state.contrast;
            saturation = state.saturation;
          } else {
            // 3️⃣ 最后返回选择引导
            return createSelectionGuideResult('操作名称', 1);
          }
        }
      }

      // 执行业务逻辑
      // const processedImage = await someOperation(currentImage, params);

      // 更新 Store（如需要）
      // usePhotoEditorStore.getState().applyXxx(...);

      // ⭐ 返回 photo-edit-confirm 组件（带保存按钮）
      return {
        success: true,
        message: '操作成功',
        data: { /* 可选数据 */ },
        ui: {
          id: `my-confirm-${Date.now()}`,
          type: 'photo-edit-confirm',  // 注意：不是 photo-editor-preview
          props: {
            src: currentImage,  // 或 processedImage
            filter: filter || 'original',
            brightness,
            contrast,
            saturation,
            maxHeight: 300,
            operationType: '我的操作',
            showSaveAsNew: true,
            showReset: true,
            forceEnabled: true,  // 如果操作不改变 filter 参数，需要强制启用
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `操作失败: ${(error as Error).message}`,
      };
    }
  },
});
```

### Step 3: 在 tools/index.ts 中导出

```typescript
// src/lib/agent/tools/index.ts

export * from './registry';
export * from './types';
export * from './helpers';
export * from './rotate';
export * from './flip';
// ... 其他工具
export * from './myNewTool';  // ← 添加这行
```

**完成！工具会自动注册到前后端。**

---

## 🧪 测试模板

```typescript
// src/lib/agent/tools/myNewTool/index.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { myTool } from './index';
import { usePhotoEditorStore } from '@/stores/usePhotoEditorStore';

vi.mock('@/stores/usePhotoEditorStore');

describe('myTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute successfully with valid params', async () => {
    vi.mocked(usePhotoEditorStore.getState).mockReturnValue({
      currentImage: 'data:image/png;base64,xxx',
      filter: 'original',
      brightness: 0,
      contrast: 0,
      saturation: 0,
    } as ReturnType<typeof usePhotoEditorStore.getState>);

    const result = await myTool.execute({
      photoId: 'photo-1',
      param1: 'test',
    });

    expect(result.success).toBe(true);
    expect(result.ui?.type).toBe('photo-editor-preview');
  });

  it('should return selection-guide when no photo', async () => {
    vi.mocked(usePhotoEditorStore.getState).mockReturnValue({
      currentImage: null,
    } as ReturnType<typeof usePhotoEditorStore.getState>);

    // Mock tryAutoLoadSelectedPhoto to return null
    vi.doMock('../helpers', () => ({
      tryAutoLoadSelectedPhoto: vi.fn().mockResolvedValue(null),
      createSelectionGuideResult: vi.fn().mockReturnValue({
        success: false,
        ui: { type: 'selection-guide' },
      }),
    }));

    const result = await myTool.execute({
      photoId: 'photo-1',
      param1: 'test',
    });

    expect(result.success).toBe(false);
  });
});
```

---

## 📋 Zod Schema 速查

### 基础类型

```typescript
z.string()                          // 字符串
z.number()                          // 数字
z.boolean()                         // 布尔
z.literal('value')                  // 字面量
z.enum(['a', 'b', 'c'])             // 枚举
z.union([z.literal(90), z.literal(180)])  // 联合类型
```

### 照片相关

```typescript
// 照片 ID
z.string().describe('照片ID')

// 照片 ID 数组
z.array(z.string()).min(1).max(10).describe('照片ID列表')

// 滤镜类型（参考 FILTER_TYPES）
z.enum(['original', 'grayscale', 'sepia', 'warm', 'cool', 'vintage', 'film', 'dramatic'])

// 裁剪比例
z.enum(['1:1', '4:3', '16:9', '9:16', 'free'])

// 调整参数
z.number().min(-100).max(100).describe('亮度/对比度/饱和度')

// 翻转方向
z.enum(['horizontal', 'vertical']).describe('翻转方向')

// 旋转角度
z.union([z.literal(90), z.literal(180), z.literal(270)]).describe('旋转角度')
```

### 可选与默认值

```typescript
z.string().optional()               // 可选字符串
z.string().default('默认值')        // 带默认值
z.string().nullable()               // 可为 null
```

### ⚠️ 重要：参数必须有 `.describe()`

```typescript
// ❌ 错误：LLM 不知道参数含义
z.string()

// ✅ 正确：添加描述
z.string().describe('照片ID')
```

---

## 🎨 A2UI 组件速查

### 常用业务组件

| 类型 | 用途 | 关键 props |
|-----|------|-----------|
| `photo-preview` | 照片预览 | `photoId`, `showBadges` |
| `photo-grid` | 照片网格 | `items`, `columns`, `selectable` |
| `photo-editor-preview` | 编辑预览（仅展示） | `src`, `filter`, `brightness`, `contrast`, `saturation`, `maxHeight` |
| `photo-edit-confirm` | **编辑确认（带按钮）** | `src`, `operationType`, `showSaveAsNew`, `showReset`, `forceEnabled` |
| `selection-guide` | 选择引导 | `targetAction`, `minPhotos`, `showNavigateButton` |
| `fusion-progress` | 融合进度 | `taskId`, `status` |
| `video-preview` | 视频预览 | `src`, `showDownload` |

### ⭐ photo-editor-preview vs photo-edit-confirm

```typescript
// 仅预览，无操作按钮 - 用于展示中间状态
type: 'photo-editor-preview'

// 带保存/取消按钮 - 用于编辑完成后确认
type: 'photo-edit-confirm'
props: {
  operationType: '旋转',     // 操作类型描述
  showSaveAsNew: true,       // 显示"另存为新照片"按钮
  showReset: true,           // 显示"重置"按钮
  forceEnabled: true,        // 强制启用保存（旋转/翻转等操作需要）
}
```

**何时使用 `forceEnabled: true`**:
- 旋转、翻转等操作修改了图片数据
- 但没有改变 `filter`/`brightness`/`contrast`/`saturation` 参数
- 组件内部通过这些参数判断 `hasChanges`，需要强制标记为"有变化"

### 返回 UI 示例

```typescript
// ✅ 正确：编辑完成返回确认组件
return {
  success: true,
  message: '已旋转 90°',
  ui: {
    id: `rotate-confirm-${Date.now()}`,
    type: 'photo-edit-confirm',
    props: {
      src: rotatedImage,
      filter: filter || 'original',
      brightness,
      contrast,
      saturation,
      maxHeight: 300,
      operationType: '旋转',
      showSaveAsNew: true,
      showReset: true,
      forceEnabled: true,
    },
  },
};

// 失败 - 引导选择照片
return {
  success: false,
  error: '没有正在编辑的图片',
  ui: {
    id: `selection-guide-${Date.now()}`,
    type: 'selection-guide',
    props: {
      title: '需要先选择照片',
      targetAction: '旋转',
      minPhotos: 1,
      showNavigateButton: true,
    },
  },
};
```

---

## 🔧 Store 扩展模式

当工具需要新的 Store 状态时：

### 1. 在 Store 接口添加状态和 action

```typescript
// src/stores/usePhotoEditorStore.ts

interface PhotoEditorState {
  // ...现有状态
  myNewState: boolean;  // 新增状态
  
  // 新增 action
  applyMyAction: (value: boolean, imageData: string) => void;
}
```

### 2. 在 Store 实现中添加初始值和 action

```typescript
export const usePhotoEditorStore = create<PhotoEditorState>((set, get) => ({
  // ...现有实现
  myNewState: false,
  
  applyMyAction: (value: boolean, imageData: string) => {
    const { history, historyIndex } = get();
    
    // 创建历史记录步骤
    const step: EditStep = {
      id: `myAction_${Date.now()}`,
      type: 'myAction',
      params: { value },
      imageData,
      timestamp: Date.now(),
    };
    
    // 更新历史记录
    const newHistory = [...history.slice(0, historyIndex + 1), step];
    if (newHistory.length > MAX_HISTORY) newHistory.shift();
    
    set({
      myNewState: value,
      currentImage: imageData,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      activeTool: null,
    });
  },
}));
```

### 3. 更新 reset() 和 undo() 方法

```typescript
// reset() 方法
reset: () => {
  set({
    // ...现有重置
    myNewState: false,  // 新增状态重置
  });
},

// undo() 方法（回到原始图像时）
} else if (historyIndex === 0) {
  set({
    // ...现有重置
    myNewState: false,  // 新增状态重置
  });
}
```

---

## 🛠️ Helper 函数扩展

当需要新的 Canvas 处理函数时，在 `helpers.ts` 中添加：

```typescript
// src/lib/agent/tools/helpers.ts

export async function myCanvasOperation(
  imageDataUrl: string,
  param: SomeType
): Promise<string> {
  if (typeof document === 'undefined') {
    return imageDataUrl;
  }

  // 环境检测
  try {
    const testCanvas = document.createElement('canvas');
    const testCtx = testCanvas.getContext('2d');
    if (!testCtx || typeof testCtx.drawImage !== 'function') {
      return imageDataUrl;
    }
  } catch {
    return imageDataUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timeout = setTimeout(() => {
      reject(new Error('图片加载超时'));
    }, 10000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'));
          return;
        }

        // Canvas 操作逻辑
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        // ... 其他操作

        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('加载图片失败'));
    };

    img.src = imageDataUrl;
  });
}
```

---

## ✅ 开发检查清单

| 检查项 | 说明 |
|--------|------|
| ✅ 工具文件位于 `tools/{toolName}/index.ts` | 遵循 Colocation 架构 |
| ✅ 使用 `defineTool` + Zod Schema | 单一来源，类型安全 |
| ✅ 所有参数都有 `.describe()` | LLM 理解参数含义 |
| ✅ **使用三层 fallback 加载照片** | `tryLoadPhotoById` → `tryAutoLoadSelectedPhoto` → `selection-guide` |
| ✅ 处理无照片场景 → `selection-guide` | 用户引导 |
| ✅ **编辑完成返回 `photo-edit-confirm`** | 不是 `photo-editor-preview` |
| ✅ **旋转/翻转等操作设置 `forceEnabled: true`** | 强制显示"未保存"状态 |
| ✅ 返回 A2UI 组件 | 动态 UI 渲染 |
| ✅ 在 `tools/index.ts` 导出 | 自动注册 |
| ✅ **前后端工具定义同步** | Zod optional ↔ tools.ts required |
| ✅ 编写测试文件 | 质量保证 |
| ✅ TypeScript 编译通过 | `npm run type-check` |
| ✅ Store 扩展更新 reset/undo | 状态一致性 |

---

## ❌ 禁止事项

| 禁止事项 | 正确做法 |
|----------|----------|
| 工具定义分散多文件 | 单文件自包含 (`tools/{name}/index.ts`) |
| 直接在 `toolExecutor.ts` 添加工具逻辑 | 使用 `defineTool` 在独立目录 |
| Zod 参数无 `.describe()` | 所有参数添加描述 |
| 使用 `as unknown as` 类型逃逸 | 使用 Zod 推导类型 |
| 忽略无照片场景 | 返回 `selection-guide` UI |
| 不更新 Store 的 reset/undo | 保持状态一致性 |

---

## ⚠️ 常见陷阱与调试经验

> **重要**: 以下是实际开发中遇到的问题和解决方案，请在开发和调试时优先检查。

### 陷阱 1: 编辑工具不使用传入的 photoId 参数

**问题**: 工具定义了 `photoId` 参数，但执行逻辑完全不使用它，只依赖 `currentImage` 状态。

**症状**: LLM 正确传递了 `photoId`，但工具仍然失败（"没有正在编辑的图片"）。

**正确做法**: 编辑工具必须实现**三层 fallback** 模式：

```typescript
// ✅ 正确：三层 fallback 加载照片
async execute(params) {
  let { currentImage, ... } = usePhotoEditorStore.getState();

  if (!currentImage) {
    // 1️⃣ 优先使用传入的 photoId 加载
    const loadedById = await tryLoadPhotoById(params.photoId);
    if (loadedById) {
      currentImage = usePhotoEditorStore.getState().currentImage;
    } else {
      // 2️⃣ 其次尝试加载选中的照片
      const autoLoaded = await tryAutoLoadSelectedPhoto();
      if (autoLoaded) {
        currentImage = usePhotoEditorStore.getState().currentImage;
      } else {
        // 3️⃣ 最后返回选择引导
        return createSelectionGuideResult('操作名称', 1);
      }
    }
  }
  // ... 执行操作
}
```

**helpers.ts 必须包含**:
```typescript
// tryLoadPhotoById - 通过 photoId 加载照片
export async function tryLoadPhotoById(photoId: string): Promise<{...} | null>

// tryAutoLoadSelectedPhoto - 加载第一张选中照片  
export async function tryAutoLoadSelectedPhoto(): Promise<{...} | null>
```

---

### 陷阱 2: LLM 可能不传递必需参数

**问题**: Zod Schema 定义 `photoId` 为必需，但 LLM 有时调用工具时不传递参数。

**症状**: 日志显示 `执行工具: loadPhotoForEdit {}`，参数为空对象。

**正确做法**: 对于可以有默认行为的参数，改为可选：

```typescript
// ❌ 错误：必需参数，LLM 不传就验证失败
const schema = z.object({
  photoId: z.string().describe('照片ID'),
});

// ✅ 正确：可选参数，有合理默认行为
const schema = z.object({
  photoId: z.string().optional().describe('照片ID。不提供时自动加载第一张选中的照片'),
});

// 执行时处理
async execute(params) {
  const effectivePhotoId = params.photoId || 'first-selected';
  // ...
}
```

**同步更新**: 前端 Zod Schema 和后端 `agent-gateway/tools.ts` 的 `required` 数组要保持一致！

---

### 陷阱 3: 编辑操作返回错误的 A2UI 组件

**问题**: 编辑完成后返回 `photo-editor-preview`（仅预览），用户看不到保存按钮。

**症状**: 编辑成功但没有"另存为新照片"按钮。

**正确做法**: 编辑操作应返回 `photo-edit-confirm` 组件：

```typescript
// ❌ 错误：仅预览，无操作按钮
return {
  success: true,
  ui: {
    type: 'photo-editor-preview',
    props: { src, filter, ... },
  },
};

// ✅ 正确：带保存/取消按钮的确认组件
return {
  success: true,
  ui: {
    type: 'photo-edit-confirm',
    props: {
      src: processedImage,
      filter: filter || 'original',
      brightness,
      contrast, 
      saturation,
      maxHeight: 300,
      operationType: '旋转',      // 操作类型描述
      showSaveAsNew: true,        // 显示另存按钮
      showReset: true,            // 显示重置按钮
      forceEnabled: true,         // 强制启用（旋转/翻转等不改变 filter 参数的操作）
    },
  },
};
```

**`forceEnabled` 使用场景**:
- 旋转、翻转等操作：修改了图片但不改变 filter/brightness/contrast/saturation
- 组件内部通过这些参数判断 `hasChanges`，需要 `forceEnabled: true` 强制显示"未保存"状态

---

### 陷阱 4: A2UI 组件按钮点击无响应

**问题**: 工具返回的 UI 只有 `props`，没有 `actions`，导致组件的回调未被绑定。

**症状**: 点击"另存为新照片"按钮没有任何响应。

**原因分析**:
```
A2UIRenderer 处理流程:
1. resolveBindings(component.props, dataModel) → 解析 props
2. wrapActions(component.actions, onAction, componentId) → 包装 actions
3. <Component {...props} {...eventHandlers} />

问题：工具返回的 ui 没有 actions 字段，eventHandlers 为空对象
```

**正确做法**: A2UI 业务组件应**自包含 action 处理**，不依赖外部回调：

```typescript
// src/components/agent/a2ui/components/PhotoEditConfirm.tsx

import { handleA2UIAction } from '@/lib/agent/a2uiActionHandler';

export const PhotoEditConfirm: React.FC<Props> = ({ onButtonClick, ... }) => {
  const handleClick = async (buttonId: string) => {
    if (onButtonClick) {
      // 外部回调存在时使用（向后兼容）
      onButtonClick(buttonId);
    } else {
      // ⭐ 关键：直接调用 action handler
      const result = await handleA2UIAction('photo.edit.confirm', 'component-id', buttonId);
      // 处理结果...
    }
  };
  
  return (
    <Button onClick={() => handleClick('saveAsNew')}>另存为新照片</Button>
  );
};
```

**设计原则**: 
- 业务组件（如 `PhotoEditConfirm`）应能独立工作
- 不依赖 A2UIRenderer 的 actions 绑定机制
- 直接 import 并调用 `handleA2UIAction`

---

### 陷阱 5: 前后端工具定义不同步

**问题**: 前端修改了 Zod Schema（如 `photoId` 改为可选），但后端 `tools.ts` 未同步更新。

**症状**: 后端告诉 LLM 参数是必需的，LLM 传了参数；但前端验证时参数丢失。

**检查清单**:
```
前端: src/lib/agent/tools/{name}/index.ts
     - Zod Schema 定义
     - .optional() / required

后端: supabase/functions/agent-gateway/tools.ts
     - OpenAI 工具定义
     - required: ['photoId'] 数组
```

**同步规则**:
| 前端 Zod | 后端 tools.ts required |
|----------|------------------------|
| `z.string()` | `required: ['photoId']` |
| `z.string().optional()` | `required: []` 或不包含该字段 |

---

### 陷阱 6: 后端 buildRichToolResult 假装工具执行成功

**问题**: 后端在 `processToolCall` 中立即返回"已应用 xxx 滤镜"的假成功消息给 LLM，但实际工具执行在前端，后端不知道真实结果。

**症状**: 
- LLM 调用 `applyFilter` 后收到"成功"，但前端实际执行失败
- LLM 因不满意结果（如返回 `original` 而非预期滤镜）而重复调用
- 达到 `maxIterations=5` 后触发"处理超时，请重试"错误

**正确做法**: 后端返回的消息应明确告知 LLM 工具调用已发送到前端，**不要重复调用**：

```typescript
// ❌ 错误：假装成功
case 'applyFilter':
  return {
    success: true,
    message: `已应用 ${args.filter} 滤镜`,  // LLM 可能因不满意而重复调用
    suggestedNextStep: '询问用户是否满意',
  }

// ✅ 正确：明确告知前端执行
case 'applyFilter':
  return {
    success: true,
    message: `滤镜工具调用已发送到前端执行。目标滤镜: ${args.filter}`,
    suggestedNextStep: '⚠️ 重要：滤镜由前端执行，无需再次调用此工具。请直接告诉用户滤镜已应用。',
    frontendPending: true,
  }
```

**影响的文件**: `supabase/functions/agent-gateway/index.ts` 中的 `buildRichToolResult` 函数

---

### 陷阱 7: LLM 流式调用时参数可能为空

**问题**: GLM-4.7 等模型在流式调用工具时，参数可能完全为空 `{}`，导致 Zod 验证失败。

**症状**: 
```
[ToolExecutor] 执行工具: applyFilter {}
参数验证失败: filter 是必需的
```

**原因分析**:
- LLM 流式返回工具调用时，参数是分 chunk 传输的
- 某些情况下参数 chunk 可能丢失或为空
- 后端 `argumentsBuffer` 累积结果为空字符串

**正确做法**: 所有参数都使用 `optional()` + `default()` 提供合理默认值：

```typescript
// ❌ 错误：必需参数，LLM 不传就失败
const schema = z.object({
  filter: z.enum(FILTER_TYPES).describe('滤镜类型'),
});

// ✅ 正确：可选参数 + 默认值
const schema = z.object({
  photoId: z.string().optional().describe('照片ID。不提供时自动使用当前编辑的照片'),
  filter: z.enum(FILTER_TYPES).optional().default('grayscale').describe('滤镜类型。默认为 grayscale'),
});
```

**调试技巧**: 在后端添加详细日志查看原始参数：
```typescript
console.log(`${tc.name} argumentsBuffer:`, JSON.stringify(tc.argumentsBuffer))
```

---

### 陷阱 8: System Prompt 缺少工具调用示例

**问题**: LLM 不知道如何正确调用工具，传递了错误的参数名或值。

**症状**: 
- LLM 传 `{ filter: "黑白" }` 而非 `{ filter: "grayscale" }`
- 或者完全不传参数

**正确做法**: 在 System Prompt 中添加具体的工具调用示例：

```typescript
// supabase/functions/agent-gateway/prompts/fragments/editing.ts

export const EDITING_FRAGMENT = `
### 工具调用参数规范

**applyFilter 滤镜工具**：
- filter 参数必须是: original, grayscale, sepia, warm, cool, vintage, film...
- 黑白/灰度 → filter: "grayscale"
- 复古/怀旧 → filter: "sepia" 或 "vintage"

### 示例：应用黑白滤镜

用户: "把这张照片变成黑白的"
助手:
1. [调用 getSelectedPhotos 确认选中照片]
2. [调用 loadPhotoForEdit]
3. [调用 applyFilter { "filter": "grayscale" }]
4. "已为您应用黑白滤镜，预览如下。"
`;
```

---

### 陷阱 9: selection-guide 返回 success: false 导致 UI 显示"失败"

**问题**: 当没有选中照片时返回 `selection-guide` 组件是正常的引导流程，不应该被视为"失败"。

**症状**: 
- `loadPhotoForEdit` 返回 `success: false` + `selection-guide` UI
- 聊天界面显示红色"失败"标签，用户体验不好

**正确做法**: 引导用户选择照片是正常流程，应返回 `success: true`：

```typescript
// ❌ 错误：正常引导被标记为失败
if (selectedPhotoIds.length === 0) {
  return {
    success: false,  // 显示红色"失败"
    error: '没有选中照片',
    ui: { type: 'selection-guide', ... },
  };
}

// ✅ 正确：引导流程标记为成功
if (selectedPhotoIds.length === 0) {
  return {
    success: true,   // 显示绿色"成功"
    message: '请先选择要编辑的照片',
    data: { needsSelection: true },  // 标记需要用户操作
    ui: { type: 'selection-guide', ... },
  };
}
```

---

## 🔍 调试检查清单

遇到工具执行问题时，按顺序检查：

| # | 检查项 | 日志/位置 |
|---|--------|----------|
| 1 | LLM 是否传递了参数？ | `[ToolExecutor] 执行工具: xxx {参数}` |
| 2 | 后端 argumentsBuffer 是否为空？ | 后端日志 `argumentsBuffer: ""` |
| 3 | Zod 验证是否通过？ | `参数验证失败: ...` |
| 4 | 工具是否使用了传入的参数？ | 检查 `execute()` 函数逻辑 |
| 5 | Store 状态是否正确？ | `usePhotoEditorStore.getState()` |
| 6 | 返回的 A2UI 组件类型是否正确？ | `photo-editor-preview` vs `photo-edit-confirm` |
| 7 | A2UI 组件按钮是否能响应？ | 组件是否直接调用 `handleA2UIAction` |
| 8 | 前后端定义是否同步？ | 对比 Zod Schema 和 `tools.ts` required 数组 |
| 9 | 后端是否假装成功？ | 检查 `buildRichToolResult` 返回值 |
| 10 | System Prompt 是否有工具示例？ | 检查 `prompts/fragments/` |

### 快速定位问题的日志关键词

```bash
# 前端日志
[ToolExecutor] 执行工具: xxx {}     # 参数为空 → 检查后端/LLM
参数验证失败:                        # Zod 验证失败 → 检查 Schema
[FilterTool] 开始执行               # 工具执行日志

# 后端日志 (Supabase Edge Function)
argumentsBuffer: ""                  # LLM 没生成参数
parsed args: {}                      # JSON 解析后为空
⚠️ 工具参数解析失败                  # JSON 解析错误
```

---

## 🔗 参考文档

| 文档 | 内容 |
|------|------|
| `docs/epic-24-ai-affinity/TOOL_COOKBOOK.md` | 完整工具开发指南 |
| `docs/epic-24-ai-affinity/architecture.md` | AI 亲和架构设计 |
| `docs/epic-23-a2ui/protocol.md` | A2UI 协议规范 |
| `src/lib/agent/tools/_template/` | 工具模板文件 |
| `src/lib/agent/tools/rotate/` | 参考实现 |
| `src/lib/agent/tools/flip/` | 翻转工具（STORY-24-010 验证产物）|

---

## 快速命令

```bash
# 创建新工具目录
mkdir -p src/lib/agent/tools/myNewTool

# 运行工具测试
npm run test -- --filter=tools/myNewTool

# TypeScript 类型检查
npm run type-check

# Lint 检查
npm run lint
```