/**
 * InstallCommand - CLI 安装命令展示和复制组件
 */

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/useToast'

interface InstallCommandProps {
  slug: string
  version?: string
}

export function InstallCommand({ slug, version }: InstallCommandProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const command = version ? `skill-hub install ${slug}@${version}` : `skill-hub install ${slug}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      toast({
        title: '已复制',
        description: '安装命令已复制到剪贴板',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: '复制失败',
        description: '请手动复制命令',
        variant: 'error',
      })
    }
  }

  return (
    <div className="bg-muted rounded-lg p-4">
      <div className="flex items-center justify-between gap-4">
        <code className="text-sm font-mono break-all flex-1">{command}</code>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="shrink-0"
          aria-label={copied ? '已复制' : '复制命令'}
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}
