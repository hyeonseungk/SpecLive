"use client";

import { Button } from "@/components/ui/button";
import { useProjectT } from "@/lib/i18n";

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
  const t = useProjectT();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {t("usecase.delete_modal_title")}
          </h3>
          <button
            onClick={onClose}
            disabled={deleting}
            className="text-gray-400 hover:text-gray-600 disabled:text-gray-300 text-xl font-bold leading-none"
          >
            ×
          </button>
        </div>
        <p className="text-muted-foreground mb-6">
          {t("usecase.delete_confirm_message", { usecaseName })}
          <br />
          <span className="text-sm text-red-600 font-medium">
            {t("usecase.delete_warning_message")}
          </span>
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            {t("usecase.delete_cancel")}
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={deleting}>
            {deleting
              ? t("usecase.delete_progress")
              : t("usecase.delete_confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
