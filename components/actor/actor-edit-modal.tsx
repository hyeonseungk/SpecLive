"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

interface ActorEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editActorName: string;
  setEditActorName: (name: string) => void;
  onUpdate: () => void;
  saving: boolean;
}

export default function ActorEditModal({
  isOpen,
  onClose,
  editActorName,
  setEditActorName,
  onUpdate,
  saving,
}: ActorEditModalProps) {
  const t = useT();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {t("actor.edit_modal_title")}
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
              {t("actor.name_label")}
            </label>
            <input
              id="edit-actor-name-input"
              type="text"
              value={editActorName}
              onChange={(e) => setEditActorName(e.target.value)}
              placeholder={t("actor.name_placeholder")}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={saving}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("buttons.cancel")}
          </Button>
          <Button onClick={onUpdate} disabled={saving || !editActorName.trim()}>
            {saving ? t("actor.updating") : t("actor.update_button")}
          </Button>
        </div>
      </div>
    </div>
  );
}
