/**
 * ReadmeRenderer - Markdown README 安全渲染组件
 * 使用 marked 解析 + DOMPurify 清理 XSS
 */

import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { cn } from '@/lib/utils'

interface ReadmeRendererProps {
  content: string
  className?: string
}

export function ReadmeRenderer({ content, className }: ReadmeRendererProps) {
  const sanitizedHtml = useMemo(() => {
    if (!content) return ''

    // 配置 marked
    marked.setOptions({
      breaks: true,
      gfm: true,
    })

    // 解析 Markdown
    const rawHtml = marked.parse(content) as string

    // 清理 XSS
    const clean = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'p',
        'br',
        'hr',
        'ul',
        'ol',
        'li',
        'a',
        'strong',
        'em',
        'code',
        'pre',
        'blockquote',
        'table',
        'thead',
        'tbody',
        'tr',
        'td',
        'th',
        'img',
        'div',
        'span',
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id'],
      ALLOW_DATA_ATTR: false,
    })

    return clean
  }, [content])

  if (!content) {
    return <div className={cn('text-muted-foreground', className)}>暂无 README 内容</div>
  }

  return (
    <div
      className={cn(
        'prose prose-slate dark:prose-invert max-w-none',
        'prose-headings:scroll-mt-20',
        'prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:bg-muted prose-pre:border',
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}
