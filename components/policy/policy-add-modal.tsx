"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useMemo } from "react";

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

interface PolicyAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
  policySaving: boolean;

  // 정책 내용
  policyContents: string;
  setPolicyContents: (val: string) => void;

  // 기능 관련
  allFeaturesLoading: boolean;
  allFeatures: Feature[];
  featureSearchTerm: string;
  setFeatureSearchTerm: (val: string) => void;
  selectedFeatureIds: string[];
  handleFeatureToggle: (id: string) => void;

  // 링크 관련
  contextLinks: string[];
  generalLinks: string[];
  addLinkField: (type: "context" | "general") => void;
  removeLinkField: (type: "context" | "general", index: number) => void;
  updateLinkField: (
    type: "context" | "general",
    index: number,
    value: string
  ) => void;

  // 용어 관련
  glossariesLoading: boolean;
  glossaries: Glossary[];
  glossarySearchTerm: string;
  setGlossarySearchTerm: (val: string) => void;
  selectedGlossaryIds: string[];
  handleGlossaryToggle: (id: string) => void;
}

export default function PolicyAddModal({
  isOpen,
  onClose,
  onAdd,
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
  // links
  contextLinks,
  generalLinks,
  addLinkField,
  removeLinkField,
  updateLinkField,
  // glossaries
  glossariesLoading,
  glossaries,
  glossarySearchTerm,
  setGlossarySearchTerm,
  selectedGlossaryIds,
  handleGlossaryToggle,
}: PolicyAddModalProps) {
  const t = useT();
  const filteredFeatures = useMemo(() => {
    if (!featureSearchTerm.trim()) return allFeatures;
    const term = featureSearchTerm.toLowerCase().trim();
    return allFeatures.filter(
      (f) =>
        f.name.toLowerCase().includes(term) ||
        f.usecase.name.toLowerCase().includes(term) ||
        f.usecase.actor.name.toLowerCase().includes(term)
    );
  }, [allFeatures, featureSearchTerm]);

  const filteredGlossaries = useMemo(() => {
    if (!glossarySearchTerm.trim()) return glossaries;
    const term = glossarySearchTerm.toLowerCase().trim();
    return glossaries.filter(
      (g) =>
        g.name.toLowerCase().includes(term) ||
        g.definition.toLowerCase().includes(term)
    );
  }, [glossaries, glossarySearchTerm]);

  const addDisabled =
    policySaving || !policyContents.trim() || selectedFeatureIds.length === 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {t("policyAddModal.header")}
        </h3>

        <div className="space-y-4">
          {/* 정책 내용 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("policyAddModal.contentsLabel")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              value={policyContents}
              onChange={(e) => setPolicyContents(e.target.value)}
              placeholder={t("policyAddModal.contentsPlaceholder")}
              rows={5}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical"
              disabled={policySaving}
            />
          </div>

          {/* 관련 기능 선택 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("policyAddModal.featuresLabel")}{" "}
              <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 font-normal ml-1">
                {t("policyAddModal.featuresHint")}
              </span>
            </label>
            {allFeaturesLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                <span className="ml-2 text-sm text-gray-500">
                  {t("policyAddModal.loadingFeatures")}
                </span>
              </div>
            ) : allFeatures.length === 0 ? (
              <>
                <p className="text-sm text-gray-500 py-2">
                  {t("policyAddModal.noFeatures")}
                </p>
                <span className="text-xs">
                  {t("policyAddModal.noFeaturesHint")}
                </span>
              </>
            ) : (
              <>
                {/* 기능 검색창 */}
                <div className="mb-3">
                  <input
                    type="text"
                    value={featureSearchTerm}
                    onChange={(e) => setFeatureSearchTerm(e.target.value)}
                    placeholder={t("policyAddModal.searchPlaceholder")}
                    className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={policySaving}
                  />
                  {featureSearchTerm && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t("policyAddModal.searchResults", {
                        term: featureSearchTerm,
                        count: filteredFeatures.length,
                      })}
                    </p>
                  )}
                </div>

                {/* 기능 목록 */}
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50">
                  {filteredFeatures.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">
                        {featureSearchTerm
                          ? t("policyAddModal.noSearchResults")
                          : t("policyAddModal.noFeatures")}
                      </p>
                      {featureSearchTerm && (
                        <button
                          onClick={() => setFeatureSearchTerm("")}
                          className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                          disabled={policySaving}
                        >
                          {t("policyAddModal.clearSearch")}
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredFeatures.map((feature) => (
                      <label
                        key={feature.id}
                        className="flex items-start gap-2 p-2 hover:bg-white rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFeatureIds.includes(feature.id)}
                          onChange={() => handleFeatureToggle(feature.id)}
                          disabled={policySaving}
                          className="mt-0.5 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium block">
                            {feature.usecase.actor.name} &gt;{" "}
                            {feature.usecase.name} &gt; {feature.name}
                          </span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </>
            )}
            {selectedFeatureIds.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-md border">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  선택된 기능 ({selectedFeatureIds.length}개):
                </p>
                <div className="space-y-1">
                  {selectedFeatureIds.map((id) => {
                    const f = allFeatures.find((x) => x.id === id);
                    if (!f) return null;
                    return (
                      <div
                        key={id}
                        className="text-sm text-blue-600 font-medium"
                      >
                        {f.usecase.actor.name} &gt; {f.usecase.name} &gt;{" "}
                        {f.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 컨텍스트 링크들 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                {t("policyAddModal.contextLinksLabel")}
                <span className="text-xs text-gray-500 font-normal ml-1">
                  ({t("policyAddModal.contextLinksHint")})
                </span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addLinkField("context")}
                disabled={policySaving}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                {t("policyAddModal.addLink")}
              </Button>
            </div>
            <div className="mb-3 p-3 bg-gray-50 rounded-md text-xs text-gray-600 whitespace-pre-line">
              {t("policyAddModal.contextLinksDesc")}
            </div>
            {contextLinks.map((link, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={link}
                  onChange={(e) =>
                    updateLinkField("context", i, e.target.value)
                  }
                  placeholder="https://..."
                  className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={policySaving}
                />
                <button
                  type="button"
                  onClick={() => removeLinkField("context", i)}
                  disabled={policySaving || contextLinks.length === 1}
                  className="p-2 text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                  title={t("policyAddModal.removeLink")}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* 일반 링크들 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                {t("policyAddModal.generalLinksLabel")}
                <span className="text-xs text-gray-500 font-normal ml-1">
                  (UI/UX 설계, 구현 코드 등)
                </span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addLinkField("general")}
                disabled={policySaving}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                {t("policyAddModal.addLink")}
              </Button>
            </div>
            {generalLinks.map((link, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={link}
                  onChange={(e) =>
                    updateLinkField("general", i, e.target.value)
                  }
                  placeholder="https://..."
                  className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={policySaving}
                />
                <button
                  type="button"
                  onClick={() => removeLinkField("general", i)}
                  disabled={policySaving || generalLinks.length === 1}
                  className="p-2 text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                  title={t("policyAddModal.removeLink")}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* 용어 선택 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              관련 용어들
              <span className="text-xs text-gray-500 font-normal ml-1">
                (이 정책과 연관된 용어를 선택하세요)
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
                프로젝트에 용어가 아직 없습니다. <br />
                <span className="text-xs">
                  용어 관리 페이지에서 먼저 용어를 추가해보세요.
                </span>
              </p>
            ) : (
              <>
                {/* 검색 */}
                <div className="mb-3">
                  <input
                    type="text"
                    value={glossarySearchTerm}
                    onChange={(e) => setGlossarySearchTerm(e.target.value)}
                    placeholder="용어 이름이나 정의로 검색..."
                    className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={policySaving}
                  />
                  {glossarySearchTerm && (
                    <p className="text-xs text-gray-500 mt-1">
                      "{glossarySearchTerm}" 검색 결과:{" "}
                      {filteredGlossaries.length}개
                    </p>
                  )}
                </div>

                {/* 용어 목록 */}
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50">
                  {filteredGlossaries.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">
                        {glossarySearchTerm
                          ? "검색 결과가 없습니다"
                          : "용어가 없습니다"}
                      </p>
                      {glossarySearchTerm && (
                        <button
                          onClick={() => setGlossarySearchTerm("")}
                          className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                          disabled={policySaving}
                        >
                          검색어 초기화
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredGlossaries.map((g) => (
                      <label
                        key={g.id}
                        className="flex items-start gap-2 p-2 hover:bg-white rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGlossaryIds.includes(g.id)}
                          onChange={() => handleGlossaryToggle(g.id)}
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
                    ))
                  )}
                </div>
              </>
            )}
            {selectedGlossaryIds.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-md border">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  선택된 용어 ({selectedGlossaryIds.length}개):
                </p>
                <div className="space-y-1">
                  {selectedGlossaryIds.map((id) => {
                    const g = glossaries.find((x) => x.id === id);
                    if (!g) return null;
                    return (
                      <div
                        key={id}
                        className="text-sm text-blue-600 font-medium"
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
          <Button onClick={onAdd} disabled={addDisabled}>
            {policySaving ? "추가 중..." : "정책 추가"}
          </Button>
        </div>
      </div>
    </div>
  );
}
