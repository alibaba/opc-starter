/**
 * 注册表单组件
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { RegisterFormData } from '@/types/auth'

export function RegisterForm() {
  const { t } = useTranslation('pages')
  const navigate = useNavigate()
  const { signUp, error, isLoading } = useAuthStore()
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  })
  const [validationError, setValidationError] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError('')

    if (formData.password !== formData.confirmPassword) {
      setValidationError(t('register.passwordMismatch'))
      return
    }

    if (formData.password.length < 6) {
      setValidationError(t('register.passwordMinLength'))
      return
    }

    await signUp(formData.email, formData.password, formData.displayName)
    if (useAuthStore.getState().isAuthenticated) {
      navigate('/')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium mb-1">
          {t('register.displayName')}
        </label>
        <Input
          id="displayName"
          type="text"
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          required
          placeholder={t('register.displayNamePlaceholder')}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          {t('register.email')}
        </label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          {t('register.password')}
        </label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          placeholder={t('register.passwordPlaceholder')}
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
          {t('register.confirmPassword')}
        </label>
        <Input
          id="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
          placeholder={t('register.confirmPasswordPlaceholder')}
        />
      </div>

      {(error || validationError) && (
        <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
          {validationError || error?.message}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? t('register.submitting') : t('register.submit')}
      </Button>

      <div className="text-center text-sm">
        {t('register.hasAccount')}{' '}
        <a href="/login" className="text-primary hover:underline">
          {t('register.login')}
        </a>
      </div>
    </form>
  )
}
