import { describe, it, expect } from 'vitest'
import i18n from '@/lib/i18n'

describe('i18n scaffold', () => {
  it('uses zh-CN in test environment', () => {
    expect(i18n.language).toBe('zh-CN')
  })

  it('resolves common namespace keys', () => {
    expect(i18n.t('common:confirm')).toBe('确定')
  })

  it('switches to en-US', async () => {
    await i18n.changeLanguage('en-US')
    expect(i18n.t('common:confirm')).toBe('Confirm')
    await i18n.changeLanguage('zh-CN')
  })
})
