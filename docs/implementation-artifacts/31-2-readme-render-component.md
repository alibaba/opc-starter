# Story 31.2: README 渲染组件

Status: done

## Story

作为用户，
我想在详情页看到安全渲染的 README Markdown，
以便了解 Skill 的详细使用说明，同时不受 XSS 攻击威胁。

## Acceptance Criteria

1. `components/skills/ReadmeRenderer.tsx` 存在并实现
2. 使用 `marked` 解析 Markdown
3. 使用 `dompurify` 清理 HTML，防止 XSS
4. 允许标签白名单：h1-h6, p, a, code, pre, table, img 等
5. 允许属性白名单：href, src, alt, title, class
6. 代码块有基本格式（monospace 字体 + 背景色）
7. 链接正确可点击
8. XSS 攻击被阻止（`<script>` 等被清理）

## Tasks / Subtasks

- [ ] 检查 `components/skills/ReadmeRenderer.tsx` (AC: 1-8)
  - [ ] 确认同时使用 marked + dompurify
  - [ ] 确认 DOMPurify 白名单配置完整
  - [ ] 确认代码块有 `pre code` 样式
- [ ] 确认 `marked` 和 `dompurify` 已安装
  - [ ] 检查 `app/package.json` 中的依赖
  - [ ] 如缺少，运行 `npm install marked dompurify @types/dompurify`
- [ ] 测试 XSS 输入被过滤

## Dev Notes

### 现有文件

- `app/src/components/skills/ReadmeRenderer.tsx` — 已存在，检查后补全

### 安全渲染实现

```tsx
import DOMPurify from 'dompurify';
import { marked } from 'marked';

export function ReadmeRenderer({ content }: { content: string | null }) {
  const html = useMemo(() => {
    if (!content) return '';
    const rawHtml = marked(content) as string;
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'h1','h2','h3','h4','h5','h6',
        'p','br','hr',
        'ul','ol','li',
        'a','strong','em','code','pre',
        'blockquote','table','thead','tbody','tr','td','th',
        'img',
      ],
      ALLOWED_ATTR: ['href','src','alt','title','class'],
      ALLOW_DATA_ATTR: false,
    });
  }, [content]);

  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

### 注意事项

- `dangerouslySetInnerHTML` 在使用 DOMPurify 后是安全的
- marked 返回类型为 `string | Promise<string>`，使用同步模式
- 代码块样式需要 `prose` 类（来自 @tailwindcss/typography）或手动 CSS

### Project Structure Notes

- 路径：`app/src/components/skills/ReadmeRenderer.tsx`
- 依赖：`marked`, `dompurify`, `@types/dompurify`

### References

- Story 需求：[Source: docs/planning-artifacts/epics-and-stories.md#Story 31.2]
- 安全渲染：[Source: docs/planning-artifacts/architecture.md#8.2.3 README 渲染安全]

## Dev Agent Record

### Agent Model Used

_待填写_

### Debug Log References

### Completion Notes List

### File List

- `app/src/components/skills/ReadmeRenderer.tsx`
- `app/package.json`（确认 marked, dompurify 依赖）
