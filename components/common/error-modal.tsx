'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useErrorStore } from '@/lib/error-store'
import { useT } from '@/lib/i18n'

export function ErrorModal() {
  const { isOpen, title, message, onConfirm, hideError } = useErrorStore()
  const t = useT()

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    hideError()
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && hideError()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="text-red-500">⚠️</span>
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left whitespace-pre-wrap">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleConfirm}>
            {t('buttons.ok')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 