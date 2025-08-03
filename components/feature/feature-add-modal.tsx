"use client";

import { Button } from "@/components/ui/button";

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">기능 추가</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              기능 이름{" "}
              {selectedUsecaseName && (
                <span className="text-xs text-gray-500 font-normal">
                  ({selectedUsecaseName} 유즈케이스)
                </span>
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
          {/* 관련 링크 입력 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">관련 링크</label>
              <button
                type="button"
                onClick={addLinkField}
                disabled={saving}
                className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
              >
                링크 추가
              </button>
            </div>
            <div className="space-y-2">
              {featureLinks.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => updateLinkField(index, e.target.value)}
                    placeholder="URL을 입력하세요"
                    className="flex-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={saving}
                  />
                  {featureLinks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLinkField(index)}
                      disabled={saving}
                      className="px-2 py-1 text-red-600 hover:text-red-800 disabled:text-gray-400"
                      title="링크 제거"
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
            취소
          </Button>
          <Button onClick={onAdd} disabled={saving || !featureName.trim()}>
            {saving ? "추가 중..." : "추가"}
          </Button>
        </div>
      </div>
    </div>
  );
}
