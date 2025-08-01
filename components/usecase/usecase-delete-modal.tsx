"use client";

import { Button } from "@/components/ui/button";

interface UsecaseDeleteModalProps {
  isOpen: boolean;
  usecaseName: string;
  onClose: () => void;
  onDelete: () => void;
  deleting: boolean;
}

export default function UsecaseDeleteModal({
  isOpen,
  usecaseName,
  onClose,
  onDelete,
  deleting,
}: UsecaseDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold mb-4">유즈케이스 삭제</h3>
        <p className="text-muted-foreground mb-6">
          정말로 "{usecaseName}" 유즈케이스를 삭제하시겠어요?
          <br />
          <span className="text-sm text-red-600 font-medium">
            이 유즈케이스의 모든 기능과 정책이 함께 삭제됩니다.
          </span>
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            취소
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={deleting}>
            {deleting ? "삭제 중..." : "삭제"}
          </Button>
        </div>
      </div>
    </div>
  );
}
