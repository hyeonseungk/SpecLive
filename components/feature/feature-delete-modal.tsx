'use client'

import { Button } from '@/components/ui/button'

interface FeatureDeleteModalProps {
  isOpen: boolean
  featureName: string
  onClose: () => void
  onDelete: () => void
  deleting: boolean
}

export default function FeatureDeleteModal({
  isOpen,
  featureName,
  onClose,
  onDelete,
  deleting,
}: FeatureDeleteModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold mb-4">기능 삭제</h3>
        <p className="text-muted-foreground mb-6">
          정말로 "{featureName}" 기능을 삭제하시겠어요?
          <br />
          <span className="text-sm text-red-600">삭제된 기능은 복구할 수 없습니다.<br/>기능 내의 정책들도 모두 삭제됩니다.</span>
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            취소
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={deleting}>
            {deleting ? '삭제 중...' : '삭제'}
          </Button>
        </div>
      </div>
    </div>
  )
}
