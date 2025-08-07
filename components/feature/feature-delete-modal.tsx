"use client";

import { Button } from "@/components/ui/button";
import { useGlobalT } from "@/lib/i18n";

interface FeatureDeleteModalProps {
  isOpen: boolean;
  featureName: string;
  onClose: () => void;
  onDelete: () => void;
  deleting: boolean;
}

export default function FeatureDeleteModal({
  isOpen,
  featureName,
  onClose,
  onDelete,
  deleting,
}: FeatureDeleteModalProps) {
  const t = useGlobalT();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {t("feature.delete_modal_title")}
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
          {t("feature.delete_confirm_message", { featureName })}
          <br />
          <span className="text-sm text-red-600 font-medium">
            {t("feature.delete_warning")}
          </span>
          <br />
          <span className="text-sm text-red-600 font-medium">
            {t("feature.delete_irreversible")}
          </span>
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            {t("feature.cancel")}
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={deleting}>
            {deleting ? t("feature.deleting") : t("feature.delete")}
          </Button>
        </div>
      </div>
    </div>
  );
}
