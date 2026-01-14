import { CORE_FRAGMENT } from './fragments/core.ts'
import { EDITING_FRAGMENT } from './fragments/editing.ts'
import { AI_SERVICES_FRAGMENT } from './fragments/ai-services.ts'
import { A2UI_SPEC_FRAGMENT } from './fragments/a2ui-spec.ts'
import { CONTEXT_FRAGMENT } from './fragments/context.ts'

export type FragmentKey = 'editing' | 'ai-services' | 'a2ui-spec' | 'context'

export interface BuildOptions {
  currentPage?: string
  selectedPhotoCount?: number
  editingPhotoId?: string
  albumName?: string
  include?: FragmentKey[]
}

const FRAGMENTS: Record<FragmentKey, string> = {
  editing: EDITING_FRAGMENT,
  'ai-services': AI_SERVICES_FRAGMENT,
  'a2ui-spec': A2UI_SPEC_FRAGMENT,
  context: CONTEXT_FRAGMENT,
}

export function buildSystemPrompt(options: BuildOptions = {}): string {
  const fragments = [CORE_FRAGMENT]

  if (options.currentPage === 'editor' || options.editingPhotoId) {
    if (!fragments.includes(EDITING_FRAGMENT)) {
      fragments.push(EDITING_FRAGMENT)
    }
  }

  if (options.currentPage === 'ai-studio') {
    if (!fragments.includes(AI_SERVICES_FRAGMENT)) {
      fragments.push(AI_SERVICES_FRAGMENT)
    }
  }

  options.include?.forEach((key) => {
    const fragment = FRAGMENTS[key]
    if (fragment && !fragments.includes(fragment)) {
      fragments.push(fragment)
    }
  })

  const contextSection = buildContextSection(options)
  if (contextSection) {
    fragments.push(contextSection)
  }

  return fragments.join('\n\n---\n\n')
}

function buildContextSection(options: BuildOptions): string | null {
  if (
    options.selectedPhotoCount === undefined &&
    !options.currentPage &&
    !options.editingPhotoId &&
    !options.albumName
  ) {
    return null
  }

  const lines = ['## 当前上下文']

  if (options.currentPage) {
    const pageNames: Record<string, string> = {
      timeline: '时间线页面',
      album: '相册页面',
      editor: '照片编辑器',
      'ai-studio': 'AI 工作室',
      search: '搜索页面',
    }
    lines.push(`- 用户当前在: ${pageNames[options.currentPage] || options.currentPage}`)
  }

  if (options.selectedPhotoCount && options.selectedPhotoCount > 0) {
    lines.push(`- 用户已选中 ${options.selectedPhotoCount} 张照片`)
  } else {
    lines.push(`- ⚠️ 【重要】用户当前没有选中任何照片`)
    lines.push(``)
    lines.push(`### 🚨 强制规则（必须遵守）`)
    lines.push(`当用户请求需要照片的操作时：`)
    lines.push(`1. **必须首先调用 getSelectedPhotos 工具**确认选中状态`)
    lines.push(`2. 如果返回 count = 0，前端会自动显示引导界面`)
    lines.push(`3. 你只需简短回复即可`)
    lines.push(`4. ❌ 禁止在没有调用 getSelectedPhotos 的情况下直接回复`)
  }

  if (options.editingPhotoId) {
    lines.push(`- 用户正在编辑照片: ${options.editingPhotoId}`)
  } else if (options.currentPage === 'editor') {
    lines.push(`- ⚠️ 编辑器中没有加载照片`)
  }

  if (options.albumName) {
    lines.push(`- 当前相册: ${options.albumName}`)
  }

  return lines.join('\n')
}

export function getPromptStats(options: BuildOptions = {}): {
  totalLength: number
  fragmentCount: number
} {
  const prompt = buildSystemPrompt(options)
  return {
    totalLength: prompt.length,
    fragmentCount: prompt.split('---').length,
  }
}
