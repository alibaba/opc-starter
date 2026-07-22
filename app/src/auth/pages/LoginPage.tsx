/**
 * 登录页面
 */
import { useTranslation } from 'react-i18next'
import { LoginForm } from '../components/LoginForm'
import { Camera } from 'lucide-react'

export function LoginPage() {
  const { t } = useTranslation('pages')

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background to-secondary px-4 py-8">
      <div className="max-w-md w-full space-y-6 md:space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-3 md:mb-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-primary rounded-xl md:rounded-2xl flex items-center justify-center">
              <Camera className="w-6 h-6 md:w-8 md:h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t('login.title')}</h1>
          <p className="mt-1 md:mt-2 text-sm md:text-base text-muted-foreground">
            {t('login.subtitle')}
          </p>
        </div>

        <div className="bg-card p-5 md:p-8 rounded-xl md:rounded-2xl shadow-xl border">
          <LoginForm />
        </div>

        <p className="text-center text-xs md:text-sm text-muted-foreground px-4">
          {t('login.tagline')}
        </p>
      </div>
    </div>
  )
}

export default LoginPage
