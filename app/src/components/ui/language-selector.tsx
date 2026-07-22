/**
 * LanguageSelector - 语言切换下拉选择器
 */
import { Globe, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/constants'

export function LanguageSelector() {
  const { t, i18n } = useTranslation('layout')
  const current =
    SUPPORTED_LANGUAGES.find((language) => language.code === i18n.language) ??
    SUPPORTED_LANGUAGES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          aria-label={t('header.languageSelector')}
        >
          <Globe className="w-4 h-4" />
          <span className="hidden md:inline text-sm">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => void i18n.changeLanguage(language.code)}
          >
            <span>{language.label}</span>
            {i18n.language === language.code && <Check className="w-4 h-4 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
