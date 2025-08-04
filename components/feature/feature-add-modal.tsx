"use client";

import { Button } from "@/components/ui/button";
import { useGlobalT } from "@/lib/i18n";
import { useEffect } from "react";

interface FeatureAddModalProps {
  isOpen: boolean;
  featureName: string;
  setFeatureName: (val: string) => void;
  onClose: () => void;
  onAdd: () => void;
  featureLinks: string[];
  addLinkField: () => void;
  removeLinkField: (index: number) => void;
  updateLinkField: (index: number, value: string) => void;
  saving: boolean;
  selectedUsecaseName?: string;
}

export default function FeatureAddModal({
  isOpen,
  featureName,
  setFeatureName,
  onClose,
  onAdd,
  featureLinks,
  addLinkField,
  removeLinkField,
  updateLinkField,
  saving,
  selectedUsecaseName,
}: FeatureAddModalProps) {
  const t = useGlobalT();
  useEffect(() => {
    if (isOpen && featureLinks.length === 0) {
      addLinkField();
    }
  }, [isOpen, addLinkField, featureLinks]);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {t("feature.add_modal_title")}
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
              {t("feature.name_label")}{" "}
              {selectedUsecaseName && (
                <span className="text-xs text-gray-500 font-normal">
                  ({selectedUsecaseName}
                  {t("feature.usecase_suffix")}
                </span>
              )}
            </label>
            <input
              type="text"
              value={featureName}
              onChange={(e) => setFeatureName(e.target.value)}
              placeholder={t("feature.name_placeholder")}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={saving}
            />
          </div>
          {/* 관련 링크 입력 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                {t("feature.related_links_label")}
              </label>
              <button
                type="button"
                onClick={addLinkField}
                disabled={saving}
                className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
              >
                {t("feature.add_link")}
              </button>
            </div>
            <div className="mb-3 p-3 bg-gray-50 rounded-md text-xs text-gray-600 whitespace-pre-line">
              {t("feature.related_url_desc")}
            </div>
            <div className="space-y-2">
              {featureLinks.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => updateLinkField(index, e.target.value)}
                    placeholder={t("feature.url_placeholder")}
                    className="flex-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={saving}
                  />
                  {featureLinks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLinkField(index)}
                      disabled={saving}
                      className="px-2 py-1 text-red-600 hover:text-red-800 disabled:text-gray-400"
                      title={t("feature.remove_link")}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("feature.cancel")}
          </Button>
          <Button onClick={onAdd} disabled={saving || !featureName.trim()}>
            {saving ? t("feature.adding") : t("feature.add")}
          </Button>
        </div>
      </div>
    </div>
  );
}
