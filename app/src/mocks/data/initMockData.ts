import { personDB } from '@/services/db/personDB'
import { MOCK_PERSONS } from './mockPersons'

/**
 * 初始化Mock数据到IndexedDB
 * 仅在数据库为空时执行
 */
export async function initMockData(): Promise<void> {
  console.log('[Mock] 开始检查IndexedDB数据...')

  try {
    // 初始化数据库
    await personDB.init()

    // 检查是否已有数据
    const existingPersons = await personDB.getPersons()

    if (existingPersons.length > 0) {
      console.log('[Mock] IndexedDB已有数据，跳过初始化')
      return
    }

    console.log('[Mock] IndexedDB为空，开始初始化Mock数据...')

    // 插入人员数据
    console.log(`[Mock] 正在插入${MOCK_PERSONS.length}个人员...`)
    await personDB.addPersons(MOCK_PERSONS)

    console.log('[Mock] ✅ Mock数据初始化完成！')
    console.log(`[Mock] - 人员数量: ${MOCK_PERSONS.length}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('[Mock] ❌ Mock数据初始化失败:', errorMessage)
    if (errorStack) {
      console.error('[Mock] 错误堆栈:', errorStack)
    }
    // 不抛出错误，让应用继续运行
    console.warn('[Mock] 应用将继续运行，但Mock数据可能未正确初始化')
  }
}

/**
 * 清空所有Mock数据
 */
export async function clearMockData(): Promise<void> {
  console.log('[Mock] 开始清空所有数据...')

  await personDB.clear()

  console.log('[Mock] ✅ 所有数据已清空')
}
