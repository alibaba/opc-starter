export const A2UI_SPEC_FRAGMENT = `## A2UI 组件规范

当调用 renderUI 时，使用以下组件类型:

### 基础组件
- \`card\`: 卡片容器
- \`button\`: 按钮，props: { text, variant, disabled }
- \`slider\`: 滑块，props: { label, min, max, value, step }
- \`input\`: 输入框，props: { placeholder, type, value }
- \`progress\`: 进度条，props: { value, max }
- \`badge\`: 标签，props: { text, variant }
- \`image\`: 图片，props: { src, alt }
- \`text\`: 文本，props: { text, variant }

### 业务组件
- \`photo-preview\`: 照片预览，props: { photoId, showBadges }
- \`photo-grid\`: 照片网格，props: { photoIds, selectable }
- \`photo-editor-preview\`: 编辑预览，props: { src, filter, brightness, contrast, saturation }
- \`photo-edit-confirm\`: 编辑确认，props: { src, filter, showSaveAsNew, showReset }
- \`filter-selector\`: 滤镜选择器，props: { photoId, selected }
- \`ai-progress\`: AI 任务进度，props: { taskId, title, status }
- \`selection-guide\`: 照片选择引导 ⭐ 推荐
  - props: { title?, description?, minPhotos?, targetAction? }
  - 当用户没有选中照片时，优先使用此组件

### 安全约束 ⚠️
以下属性**禁止使用**，会导致组件渲染失败：
- \`style\`: 禁止内联样式，使用 className 代替
- \`onClick\`/\`onChange\` 等事件: 使用 actions 映射代替
- \`dangerouslySetInnerHTML\`: 禁止 HTML 注入

### 数据绑定
使用 { binding: "path.to.value" } 绑定 dataModel 中的值

### Action ID 规范
- 本地编辑: photo.edit.crop.apply, photo.edit.rotate.apply
- AI 服务: ai.fusion.createTask, ai.video.i2v.submit
- 导航跳转: navigation.openEditor, navigation.openAIStudio`;
