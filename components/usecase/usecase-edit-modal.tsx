"use client";

import { Button } from "@/components/ui/button";

interface UsecaseEditModalProps {
  isOpen: boolean;
  usecaseName: string;
  setUsecaseName: (val: string) => void;
  onClose: () => void;
  onUpdate: () => void;
  saving: boolean;
}

export default function UsecaseEditModal({
  isOpen,
  usecaseName,
  setUsecaseName,
  onClose,
  onUpdate,
  saving,
}: UsecaseEditModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">유즈케이스 편집</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              유즈케이스 이름
            </label>
            <input
              id="edit-usecase-name-input"
              type="text"
              value={usecaseName}
              onChange={(e) => setUsecaseName(e.target.value)}
              placeholder="유즈케이스 이름을 입력하세요"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={saving}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button onClick={onUpdate} disabled={saving || !usecaseName.trim()}>
            {saving ? "수정 중..." : "유즈케이스 수정"}
          </Button>
        </div>
      </div>
    </div>
  );
}
