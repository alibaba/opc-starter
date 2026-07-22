/** localStorage key for persisted UI language */
export const I18N_STORAGE_KEY = 'opc-starter-language'

export const SUPPORTED_LANGUAGES = [
  { code: 'zh-CN', label: '中文' },
  { code: 'en-US', label: 'English' },
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code']

export const I18N_NAMESPACES = ['common', 'pages', 'components', 'errors', 'layout'] as const

export type I18nNamespace = (typeof I18N_NAMESPACES)[number]

/** Normalize browser / detector language tags to supported locales */
export function normalizeLanguageTag(lng: string | undefined): SupportedLanguage {
  if (!lng) return 'zh-CN'
  if (lng.toLowerCase().startsWith('en')) return 'en-US'
  return 'zh-CN'
}
