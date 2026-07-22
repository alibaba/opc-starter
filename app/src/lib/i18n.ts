import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import zhCommon from '@/locales/zh-CN/common.json'
import zhPages from '@/locales/zh-CN/pages.json'
import zhComponents from '@/locales/zh-CN/components.json'
import zhErrors from '@/locales/zh-CN/errors.json'
import zhLayout from '@/locales/zh-CN/layout.json'

import enCommon from '@/locales/en-US/common.json'
import enPages from '@/locales/en-US/pages.json'
import enComponents from '@/locales/en-US/components.json'
import enErrors from '@/locales/en-US/errors.json'
import enLayout from '@/locales/en-US/layout.json'

import { I18N_NAMESPACES, I18N_STORAGE_KEY, normalizeLanguageTag } from '@/lib/i18n/constants'

const resources = {
  'zh-CN': {
    common: zhCommon,
    pages: zhPages,
    components: zhComponents,
    errors: zhErrors,
    layout: zhLayout,
  },
  'en-US': {
    common: enCommon,
    pages: enPages,
    components: enComponents,
    errors: enErrors,
    layout: enLayout,
  },
} as const

// Vitest: process.env.NODE_ENV === 'test'；Cypress (vite --mode test): import.meta.env.MODE === 'test'
const isTest =
  import.meta.env.MODE === 'test' ||
  (typeof process !== 'undefined' && process.env.NODE_ENV === 'test')

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    ...(isTest ? { lng: 'zh-CN' } : {}),
    fallbackLng: 'zh-CN',
    defaultNS: 'common',
    ns: [...I18N_NAMESPACES],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: I18N_STORAGE_KEY,
      convertDetectedLanguage: normalizeLanguageTag,
    },
  })

export default i18n
