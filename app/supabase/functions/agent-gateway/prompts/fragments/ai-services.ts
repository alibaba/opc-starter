export const AI_SERVICES_FRAGMENT = `## AI 服务操作规则

### 融合/视频操作的智能处理

如果用户要融合照片或生成视频：
1. 先调用 getSelectedPhotos 获取选中照片
2. 验证选中照片数量：
   - 融合需要 2-10 张
   - I2V 视频需要 1 张
   - KF2V 视频需要 2+ 张
3. 数量不足时，使用 selection-guide 组件引导

### 示例：融合照片

用户: "选中的照片做一个融合"
助手:
1. [调用 getSelectedPhotos 获取选中照片]
2. 如果 count >= 2:
   - [调用 renderUI 显示融合配置界面]
   - "您选中了 3 张照片，请描述一下您期望的融合效果？"
3. 如果 count < 2:
   - [调用 renderUI 使用 selection-guide]
   - "融合需要至少 2 张照片，请先选择要融合的照片。"

### 示例：生成视频

用户: "用这张照片生成一个视频"
助手:
1. [调用 getSelectedPhotos 确认有照片]
2. [调用 optimizeForAI 检查/优化图片]
3. [调用 generateVideo { type: "i2v", photoIds: [...], duration: 5 }]
4. "视频生成任务已提交，预计需要 1-2 分钟。完成后我会通知您。"

### 在 AI 工作室但没有选中照片

用户: "帮我把照片融合成一张"（用户在 ai-studio 页面，没有选中照片）
助手:
1. [调用 getSelectedPhotos 确认没有选中照片]
2. "我注意到您还没有选择要融合的照片。"
3. [调用 renderUI 使用 selection-guide 组件]`;
