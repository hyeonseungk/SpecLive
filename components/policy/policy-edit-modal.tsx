"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

interface Feature {
  id: string;
  name: string;
  usecase: {
    name: string;
    actor: {
      name: string;
    };
  };
}

interface Glossary {
  id: string;
  name: string;
  definition: string;
}

interface Policy {
  id: string;
  // 추가 필드 필요 시 여기에 선언
}

interface PolicyEditModalProps {
  isOpen: boolean;
  editingPolicy: Policy | null;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: (policy: Policy) => void;
  policySaving: boolean;

  // 정책 내용
  policyContents: string;
  setPolicyContents: (val: string) => void;

  /* 기능 관련 */
  allFeaturesLoading: boolean;
  allFeatures: Feature[];
  featureSearchTerm: string;
  setFeatureSearchTerm: (val: string) => void;
  selectedFeatureIds: string[];
  handleFeatureToggle: (id: string) => void;

  /* 링크 관련 */
  _contextLinks?: string[];
  _generalLinks?: string[];
  addLinkField: (type: "context" | "general") => void;
  removeLinkField: (type: "context" | "general", index: number) => void;
  updateLinkField: (
    type: "context" | "general",
    index: number,
    value: string
  ) => void;

  /* 용어 관련 */
  glossariesLoading: boolean;
  glossaries: Glossary[];
  glossarySearchTerm: string;
  setGlossarySearchTerm: (val: string) => void;
  selectedGlossaryIds: string[];
  handleGlossaryToggle: (id: string) => void;

  /* 편집 모드 전용 */
  editContextLinks: string[];
  editGeneralLinks: string[];
  updateEditLinkField: (
    type: "context" | "general",
    index: number,
    value: string
  ) => void;
  removeEditLinkField: (type: "context" | "general", index: number) => void;
  addEditLinkField: (type: "context" | "general") => void;

  editFeatureSearchTerm: string;
  setEditFeatureSearchTerm: (val: string) => void;
  editSelectedFeatureIds: string[];
  handleEditFeatureToggle: (id: string) => void;

  editGlossarySearchTerm: string;
  setEditGlossarySearchTerm: (val: string) => void;
  editSelectedGlossaryIds: string[];
  handleEditGlossaryToggle: (id: string) => void;
}

export default function PolicyEditModal({
  isOpen,
  editingPolicy,
  onClose,
  onUpdate,
  onDelete,
  policySaving,
  policyContents,
  setPolicyContents,
  // feature
  allFeaturesLoading,
  allFeatures,
  featureSearchTerm,
  setFeatureSearchTerm,
  selectedFeatureIds,
  handleFeatureToggle,
  editFeatureSearchTerm,
  setEditFeatureSearchTerm,
  editSelectedFeatureIds,
  handleEditFeatureToggle,
  // links
  _contextLinks,
  _generalLinks,
  addLinkField,
  removeLinkField,
  updateLinkField,
  editContextLinks,
  editGeneralLinks,
  addEditLinkField,
  removeEditLinkField,
  updateEditLinkField,
  // glossaries
  glossariesLoading,
  glossaries,
  glossarySearchTerm,
  setGlossarySearchTerm,
  selectedGlossaryIds,
  handleGlossaryToggle,
  editGlossarySearchTerm,
  setEditGlossarySearchTerm,
  editSelectedGlossaryIds,
  handleEditGlossaryToggle,
}: PolicyEditModalProps) {
  const t = useT();
  /* 필터링 */
  const filteredFeatures = useMemo(() => {
    if (!editFeatureSearchTerm.trim()) return allFeatures;
    const term = editFeatureSearchTerm.toLowerCase().trim();
    return allFeatures.filter(
      (f) =>
        f.name.toLowerCase().includes(term) ||
        f.usecase.name.toLowerCase().includes(term) ||
        f.usecase.actor.name.toLowerCase().includes(term)
    );
  }, [allFeatures, editFeatureSearchTerm]);

  const filteredGlossaries = useMemo(() => {
    if (!editGlossarySearchTerm.trim()) return glossaries;
    const term = editGlossarySearchTerm.toLowerCase().trim();
    return glossaries.filter(
      (g) =>
        g.name.toLowerCase().includes(term) ||
        g.definition.toLowerCase().includes(term)
    );
  }, [glossaries, editGlossarySearchTerm]);

  const updateDisabled =
    policySaving ||
    !policyContents.trim() ||
    editSelectedFeatureIds.length === 0;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen || !editingPolicy) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {t("policyEditModal.header")}
          </h3>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={policySaving}
          >
            {t("policyEditModal.deleteButton")}
          </Button>
        </div>

        <div className="space-y-4">
          {/* 정책 내용 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("policyEditModal.contentsLabel")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              value={policyContents}
              onChange={(e) => setPolicyContents(e.target.value)}
              placeholder={t("policyEditModal.contentsPlaceholder")}
              rows={5}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical"
              disabled={policySaving}
            />
          </div>

          {/* 기능 선택 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("policyEditModal.featuresLabel")}{" "}
              <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 font-normal ml-1">
                {t("policyEditModal.featuresHint")}
              </span>
            </label>
            {allFeaturesLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                <span className="ml-2 text-sm text-gray-500">
                  기능 로딩 중...
                </span>
              </div>
            ) : allFeatures.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">
                프로젝트에 기능이 아직 없습니다.
              </p>
            ) : (
              <>
                <div className="mb-3">
                  <input
                    type="text"
                    value={editFeatureSearchTerm}
                    onChange={(e) => setEditFeatureSearchTerm(e.target.value)}
                    placeholder={t("policyEditModal.searchPlaceholder")}
                    className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={policySaving}
                  />
                  {editFeatureSearchTerm && (
                    <p className="text-xs text-gray-500">
                      {editFeatureSearchTerm
                        ? t("policyEditModal.noSearchResults")
                        : t("policyEditModal.noFeatures")}
                    </p>
                  )}
                </div>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50">
                  {filteredFeatures.map((feature) => (
                    <label
                      key={feature.id}
                      className="flex items-start gap-2 p-2 hover:bg-white rounded cursor-pointer items-center py-1"
                    >
                      <input
                        type="checkbox"
                        checked={editSelectedFeatureIds.includes(feature.id)}
                        onChange={() => handleEditFeatureToggle(feature.id)}
                        disabled={policySaving}
                        className="mt-0.5 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium inline-flex items-center">
                          {feature.usecase.actor.name}
                          <ChevronRight className="w-3 h-3 mx-1 text-gray-500" />
                          {feature.usecase.name}
                          <ChevronRight className="w-3 h-3 mx-1 text-gray-500" />
                          {feature.name}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}
            {editSelectedFeatureIds.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-md border">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {t("policyAddModal.selectedFeatures")} (
                  {editSelectedFeatureIds.length}개):
                </p>
                <div className="space-y-1">
                  {editSelectedFeatureIds.map((id) => {
                    const f = allFeatures.find((x) => x.id === id);
                    if (!f) return null;
                    return (
                      <div
                        key={id}
                        className="text-sm text-blue-600 font-medium flex items-center"
                      >
                        {f.usecase.actor.name}
                        <ChevronRight className="w-3 h-3 mx-1 text-gray-500" />
                        {f.usecase.name}
                        <ChevronRight className="w-3 h-3 mx-1 text-gray-500" />
                        {f.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 컨텍스트 / 일반 링크 - 편집용 */}
          {/* 컨텍스트 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                {t("policyEditModal.contextLinksLabel")}
              </label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => addEditLinkField("context")}
                disabled={policySaving}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                {t("policyAddModal.addLink")}
              </Button>
            </div>
            <div className="mb-3 p-3 bg-gray-50 rounded-md text-xs text-gray-600 whitespace-pre-line">
              {t("policyEditModal.contextLinksDesc")}
            </div>
            {editContextLinks.map((link, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={link}
                  onChange={(e) =>
                    updateEditLinkField("context", i, e.target.value)
                  }
                  placeholder="https://..."
                  className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={policySaving}
                />
                <button
                  type="button"
                  onClick={() => removeEditLinkField("context", i)}
                  disabled={policySaving || editContextLinks.length === 1}
                  className="p-2 text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                  title="링크 삭제"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* 일반 링크 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                {" "}
                {t("policyAddModal.generalLinksLabel")}
              </label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => addEditLinkField("general")}
                disabled={policySaving}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                {t("policyAddModal.addLink")}
              </Button>
            </div>
            <div className="mb-3 p-3 bg-gray-50 rounded-md text-xs text-gray-600 whitespace-pre-line">
              {t("policyAddModal.generalLinksDesc")}
            </div>
            {editGeneralLinks.map((link, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={link}
                  onChange={(e) =>
                    updateEditLinkField("general", i, e.target.value)
                  }
                  placeholder="https://..."
                  className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={policySaving}
                />
                <button
                  type="button"
                  onClick={() => removeEditLinkField("general", i)}
                  disabled={policySaving || editGeneralLinks.length === 1}
                  className="p-2 text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                  title="링크 삭제"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* 용어 선택 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("policyAddModal.glossariesLabel")}
              <span className="text-xs text-gray-500 ml-1">
                {t("policyAddModal.glossariesHint")}
              </span>
            </label>
            {glossariesLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                <span className="ml-2 text-sm text-gray-500">
                  용어 로딩 중...
                </span>
              </div>
            ) : glossaries.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">
                프로젝트에 용어가 아직 없습니다.
              </p>
            ) : (
              <>
                <div className="mb-3">
                  <input
                    type="text"
                    value={editGlossarySearchTerm}
                    onChange={(e) => setEditGlossarySearchTerm(e.target.value)}
                    placeholder="용어 이름이나 정의로 검색..."
                    className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={policySaving}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50">
                  {filteredGlossaries.map((g) => (
                    <label
                      key={g.id}
                      className="flex items-start gap-2 p-2 hover:bg-white rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={editSelectedGlossaryIds.includes(g.id)}
                        onChange={() => handleEditGlossaryToggle(g.id)}
                        disabled={policySaving}
                        className="mt-0.5 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium block">
                          {g.name}
                        </span>
                        <span className="text-xs text-gray-600 block truncate">
                          {g.definition}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}
            {editSelectedGlossaryIds.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-md border">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  선택된 용어 ({editSelectedGlossaryIds.length}개):
                </p>
                <div className="space-y-1">
                  {editSelectedGlossaryIds.map((id) => {
                    const g = glossaries.find((x) => x.id === id);
                    if (!g) return null;
                    return (
                      <div
                        key={id}
                        className="flex items-center text-sm text-blue-600 font-medium"
                      >
                        {g.name}
                        <span className="text-xs text-gray-500 ml-2">
                          -{" "}
                          {g.definition.length > 50
                            ? `${g.definition.substring(0, 50)}...`
                            : g.definition}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={policySaving}>
            취소
          </Button>
          <Button onClick={onUpdate} disabled={updateDisabled}>
            {policySaving ? "수정 중..." : "정책 수정"}
          </Button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-4">정책 삭제</h3>
            <p className="text-muted-foreground mb-6">
              정말로 이 정책을 삭제하시겠어요?
              <br />
              <span className="text-sm text-red-600">
                삭제된 정책은 복구할 수 없습니다.
              </span>
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={policySaving}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (editingPolicy) onDelete(editingPolicy);
                  setShowDeleteConfirm(false);
                }}
                disabled={policySaving}
              >
                {policySaving ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
