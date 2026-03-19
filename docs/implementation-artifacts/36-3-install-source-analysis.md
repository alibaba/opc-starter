# Story 36.3: 安装来源分析

Status: ready-for-dev

## Story

作为 Skill 作者，
我想在看板中看到安装来源分布（Web vs CLI），
以便了解用户更倾向于哪种安装方式。

## Acceptance Criteria

1. 饼图展示 Web vs CLI 安装比例
2. 按平台分布（qoder/cursor 等，来自 client_info）

## Tasks / Subtasks

- [ ] 实现来源数据查询
  - [ ] 查询 `skill_installs.install_type` 分组计数
  - [ ] 查询 `skill_installs.client_info->>'platform'` 分布
- [ ] 实现饼图组件（recharts PieChart）
- [ ] 集成到 DashboardPage

## Dev Notes

### 数据查询

```typescript
// 按 install_type 分组
const { data } = await supabase
  .from('skill_installs')
  .select('install_type, client_info')
  .eq('skill_id', selectedSkillId);

const webCount = data?.filter(r => r.install_type === 'web').length ?? 0;
const cliCount = data?.filter(r => r.install_type === 'cli').length ?? 0;

const pieData = [
  { name: 'Web', value: webCount },
  { name: 'CLI', value: cliCount },
];
```

### 饼图

```tsx
import { PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))'];

<PieChart width={300} height={300}>
  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
    {pieData.map((_, index) => (
      <Cell key={index} fill={COLORS[index % COLORS.length]} />
    ))}
  </Pie>
  <Tooltip />
  <Legend />
</PieChart>
```

### Project Structure Notes

- 集成到 DashboardPage（36.1）中
- 复用 recharts（36.2 已安装）

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 36.3]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/components/skills/InstallSourceChart.tsx`（新建）
- `app/src/pages/skills/DashboardPage.tsx`（修改）
