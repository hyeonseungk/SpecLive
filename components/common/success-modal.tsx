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
import { useSuccessStore } from '@/lib/success-store'

export function SuccessModal() {
  const { isOpen, title, message, onConfirm, hideSuccess } = useSuccessStore()

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    hideSuccess()
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && hideSuccess()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="text-green-500">✅</span>
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left whitespace-pre-wrap">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
            확인
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 