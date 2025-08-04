"use client";

import { Button } from "@/components/ui/button";
import { useGlobalT } from "@/lib/i18n";
import { ChevronRight } from "lucide-react";

interface UsecaseAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  usecaseName: string;
  setUsecaseName: (name: string) => void;
  onAdd: () => void;
  saving: boolean;
  selectedActorName?: string;
}

export default function UsecaseAddModal({
  isOpen,
  onClose,
  usecaseName,
  setUsecaseName,
  onAdd,
  saving,
  selectedActorName,
}: UsecaseAddModalProps) {
  const t = useGlobalT();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 relative">
        <button
          onClick={onClose}
          disabled={saving}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:text-gray-300 text-xl font-bold leading-none"
        >
          ×
        </button>

        {selectedActorName && (
          <div className="flex items-center text-sm text-gray-600 mb-4">
            <span className="font-medium">{selectedActorName}</span>
            <ChevronRight className="w-4 h-4 mx-1" />
          </div>
        )}

        <div className="mb-4">
          <h3 className="text-lg font-semibold">
            {t("usecase.add_modal_title")}
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("usecase.name_label")}
            </label>
            <input
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
          <Button onClick={onAdd} disabled={saving || !usecaseName.trim()}>
            {saving ? t("buttons.adding") : t("buttons.add")}
          </Button>
        </div>
      </div>
    </div>
  );
}
