# Story 36.2: 下载趋势图表

Status: ready-for-dev

## Story

作为 Skill 作者，
我想在看板中看到下载量随时间变化的趋势图，
以便了解 Skill 的受欢迎程度变化。

## Acceptance Criteria

1. 按日/周/月聚合下载数据
2. 折线图展示下载趋势
3. 支持按单个 Skill 筛选

## Tasks / Subtasks

- [ ] 实现从 `skill_installs` 表聚合下载数据
  - [ ] 按 `created_at` 日期分组 + count
  - [ ] 支持日/周/月时间粒度
- [ ] 集成图表库（recharts 或检查项目已有）
- [ ] 支持 Skill 筛选下拉选择

## Dev Notes

### 数据聚合查询

```typescript
// 按日聚合（最近 30 天）
const { data } = await supabase
  .from('skill_installs')
  .select('created_at')
  .eq('skill_id', selectedSkillId)
  .gte('created_at', startDate.toISOString());

// 在前端按日期分组计数
const grouped = data?.reduce((acc, row) => {
  const date = row.created_at.split('T')[0];
  acc[date] = (acc[date] ?? 0) + 1;
  return acc;
}, {} as Record<string, number>);
```

### 图表库

```tsx
// 检查项目是否已安装 recharts
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={chartData}>
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="downloads" stroke="hsl(var(--primary))" />
  </LineChart>
</ResponsiveContainer>
```

### Project Structure Notes

- 如项目未安装 recharts，`npm install recharts --workspace=app`
- 在 DashboardPage 中集成此图表

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 36.2]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/pages/skills/DashboardPage.tsx`（修改，添加图表）
- `app/src/components/skills/DownloadTrendChart.tsx`（新建）
