/**
 * CreateOrgDialog - 创建组织/团队对话框
 * @description 提供表单创建新组织或子团队，支持设置名称和显示名称
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Organization, CreateOrganizationInput } from '@/lib/supabase/organizationTypes'

interface CreateOrgDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentOrg: Organization | null
  onSubmit: (input: CreateOrganizationInput) => Promise<void>
}

export function CreateOrgDialog({ open, onOpenChange, parentOrg, onSubmit }: CreateOrgDialogProps) {
  const { t } = useTranslation('components')
  const { t: tCommon } = useTranslation('common')
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !displayName.trim()) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        display_name: displayName.trim(),
        parent_id: parentOrg?.id || null,
        description: description.trim() || null,
      })
      setName('')
      setDisplayName('')
      setDescription('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create organization:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('organization.createOrg.title')}</DialogTitle>
            <DialogDescription>
              {parentOrg
                ? t('organization.createOrg.descChild', { name: parentOrg.display_name })
                : t('organization.createOrg.descRoot')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('organization.createOrg.nameLabel')}</Label>
              <Input
                id="name"
                placeholder={t('organization.createOrg.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                pattern="[a-z0-9-]+"
              />
              <p className="text-xs text-muted-foreground">
                {t('organization.createOrg.nameHint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">{t('organization.createOrg.displayNameLabel')}</Label>
              <Input
                id="displayName"
                placeholder={t('organization.createOrg.displayNamePlaceholder')}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('organization.createOrg.descriptionLabel')}</Label>
              <Textarea
                id="description"
                placeholder={t('organization.createOrg.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim() || !displayName.trim()}>
              {isSubmitting
                ? t('organization.createOrg.creating')
                : t('organization.createOrg.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
