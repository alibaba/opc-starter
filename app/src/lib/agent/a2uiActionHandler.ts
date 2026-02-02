/**
 * A2UI Action Handler
 * @description 处理 A2UI 组件触发的本地 actions
 * @version 2.0.0 - 简化版本，移除 photo 编辑功能
 */

export interface ActionResult {
  success: boolean
  message?: string
  error?: string
  data?: Record<string, unknown>
}

/**
 * 导航到指定页面
 */
function navigateTo(path: string): ActionResult {
  window.location.href = path
  return { success: true, message: `正在跳转到 ${path}` }
}

/**
 * 处理 A2UI 组件触发的 action
 * @description 根据 actionId 路由到对应的处理函数
 */
export async function handleA2UIAction(
  actionId: string,
  _componentId: string,
  value?: unknown
): Promise<ActionResult> {
  console.log('[A2UI ActionHandler] 处理 action:', actionId, value)

  switch (actionId) {
    // === 导航跳转 ===
    case 'navigation.dashboard':
      return navigateTo('/')

    case 'navigation.persons':
      return navigateTo('/persons')

    case 'navigation.profile':
      return navigateTo('/profile')

    case 'navigation.settings':
      return navigateTo('/settings')

    case 'navigation.cloudStorage':
      return navigateTo('/settings/cloud-storage')

    // === 旧版导航（保持兼容） ===
    case 'navigation.timeline':
      return navigateTo('/')

    case 'navigation.albums':
      return navigateTo('/')

    case 'navigation.search':
      return { success: false, error: '搜索功能已移除' }

    // === Photo 功能已移除 ===
    case 'photo.edit.saveAsNew':
    case 'photo.edit.reset':
    case 'photo.edit.undo':
    case 'photo.edit.redo':
    case 'photo.edit.confirm':
    case 'navigation.openEditor':
    case 'navigation.openAIStudio':
      return { success: false, error: 'Photo 编辑功能已移除' }

    default:
      console.warn('[A2UI ActionHandler] 未知 action:', actionId)
      return { success: false, error: `未知操作: ${actionId}` }
  }
}

export default handleA2UIAction
