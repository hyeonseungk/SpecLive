"use client";

import { Button } from "@/components/ui/button";
import { useProjectT } from "@/lib/i18n";

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
  const t = useProjectT();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {t("usecase.edit_modal_title")}
          </h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 disabled:text-gray-300 text-xl font-bold leading-none"
          >
            ×
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("usecase.name_label")}
            </label>
            <input
              id="edit-usecase-name-input"
              type="text"
              value={usecaseName}
              onChange={(e) => setUsecaseName(e.target.value)}
              placeholder={t("usecase.name_placeholder")}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={saving}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("buttons.cancel")}
          </Button>
          <Button onClick={onUpdate} disabled={saving || !usecaseName.trim()}>
            {saving ? t("buttons.updating") : t("buttons.update")}
          </Button>
        </div>
      </div>
    </div>
  );
}
