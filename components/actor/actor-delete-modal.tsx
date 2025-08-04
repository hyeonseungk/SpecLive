"use client";

import { Button } from "@/components/ui/button";
import { useGlobalT } from "@/lib/i18n";

interface ActorDeleteModalProps {
  isOpen: boolean;
  actorName: string;
  onClose: () => void;
  onDelete: () => void;
  deleting: boolean;
}

export default function ActorDeleteModal({
  isOpen,
  actorName,
  onClose,
  onDelete,
  deleting,
}: ActorDeleteModalProps) {
  const t = useGlobalT();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {t("actor.delete_modal_title")}
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
          {t("actor.delete_confirm", { actorName })}
          <br />
          <span className="text-sm text-red-600 font-medium">
            {t("actor.delete_warning")}
          </span>
          <br />
          <span className="text-sm text-red-600">
            {t("actor.delete_irreversible")}
          </span>
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            {t("actor.cancel")}
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={deleting}>
            {deleting ? t("actor.deleting") : t("actor.delete")}
          </Button>
        </div>
      </div>
    </div>
  );
}
