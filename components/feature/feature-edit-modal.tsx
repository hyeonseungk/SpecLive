'use client'

import { Button } from '@/components/ui/button'

interface FeatureEditModalProps {
  isOpen: boolean
  featureName: string
  setFeatureName: (val: string) => void
  onClose: () => void
  onUpdate: () => void
  saving: boolean
  selectedUsecaseName?: string
}

export default function FeatureEditModal({
  isOpen,
  featureName,
  setFeatureName,
  onClose,
  onUpdate,
  saving,
  selectedUsecaseName,
}: FeatureEditModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">기능 편집</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              기능 이름{' '}
              {selectedUsecaseName && (
                <span className="text-xs text-gray-500 font-normal">({selectedUsecaseName} 유즈케이스)</span>
              )}
            </label>
            <input
              type="text"
              value={featureName}
              onChange={(e) => setFeatureName(e.target.value)}
              placeholder="기능 이름을 입력하세요"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={saving}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button onClick={onUpdate} disabled={saving || !featureName.trim()}>
            {saving ? '수정 중...' : '수정'}
          </Button>
        </div>
      </div>
    </div>
  )
}
