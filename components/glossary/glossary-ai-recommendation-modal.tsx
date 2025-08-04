"use client";

import { Button } from "@/components/ui/button";
import { showError } from "@/lib/error-store";
import { useProjectT } from "@/lib/i18n";
import { useLangStore } from "@/lib/i18n-store";
import { showSimpleSuccess } from "@/lib/success-store";
import { supabase } from "@/lib/supabase-browser";
import { Tables } from "@/types/database";
import { useState } from "react";

interface Recommendation {
  name: string;
  definition: string;
  examples?: string;
  selected: boolean;
}

interface GlossaryAiRecommendationModalProps {
  projectId: string;
  userId: string;
  onClose: () => void;
  onTermsAdded: (
    newGlossaries: (Tables<"glossaries"> & { glossary_links: any[] })[]
  ) => void;
}

export default function GlossaryAiRecommendationModal({
  projectId,
  userId,
  onClose,
  onTermsAdded,
}: GlossaryAiRecommendationModalProps) {
  const t = useProjectT();
  const { locale } = useLangStore();

  const [aiRecommendations, setAiRecommendations] = useState<Recommendation[]>(
    []
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  /* -------------------------- fetch AI recommendations ------------------------- */
  const handleAiRecommendation = async () => {
    setAiRecommendations([]);
    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-glossary-recommendation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            projectId: projectId,
            count: 5,
            language: locale,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data?.recommendations) {
        setAiRecommendations(
          result.data.recommendations.map((rec: any) => ({
            ...rec,
            selected: false,
          }))
        );
      } else {
        throw new Error(result.error || t("glossary.ai_error"));
      }
    } catch (err) {
      console.error("AI recommendation error:", err);
      setAiError(err instanceof Error ? err.message : t("glossary.ai_error"));
    } finally {
      setAiLoading(false);
    }
  };

  /* ------------------------------ selection toggle ----------------------------- */
  const toggleRecommendationSelection = (index: number) => {
    setAiRecommendations((prev) =>
      prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
    );
  };

  /* ------------------------- add selected recommendations ---------------------- */
  const addSelectedRecommendations = async () => {
    const selectedTerms = aiRecommendations.filter((r) => r.selected);
    if (!selectedTerms.length) return;

    setAiLoading(true);
    try {
      // get current max sequence
      const { data: maxSeqData, error: maxSeqErr } = await supabase
        .from("glossaries")
        .select("sequence")
        .eq("project_id", projectId)
        .order("sequence", { ascending: false })
        .limit(1);
      if (maxSeqErr) throw maxSeqErr;

      let nextSequence = (maxSeqData?.[0]?.sequence || 0) + 1;
      const addedGlossaries: (Tables<"glossaries"> & {
        glossary_links: any[];
      })[] = [];

      for (const term of selectedTerms) {
        const { data: glossary, error: glossErr } = await supabase
          .from("glossaries")
          .insert({
            project_id: projectId,
            name: term.name,
            definition: term.definition,
            examples: term.examples || null,
            author_id: userId,
            sequence: nextSequence,
          })
          .select()
          .single();
        if (glossErr) throw glossErr;

        addedGlossaries.push({ ...glossary, glossary_links: [] });
        nextSequence += 1;
      }

      // update parent list
      onTermsAdded(addedGlossaries);

      // update internal recommendations list (remove added ones)
      setAiRecommendations((prev) => prev.filter((r) => !r.selected));

      showSimpleSuccess(
        `${selectedTerms.length}${t("glossary.ai_terms_added")}`
      );

      // close modal if none left
      if (aiRecommendations.filter((r) => !r.selected).length === 0) {
        onClose();
      }
    } catch (err) {
      console.error("Error adding recommended terms:", err);
      showError(t("glossary.add_error_title"), t("glossary.add_error_desc"));
    } finally {
      setAiLoading(false);
    }
  };

  /* ---------------------------------- JSX ---------------------------------- */
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {t("glossary.ai_modal_title")}
          </h3>
          <button
            onClick={onClose}
            disabled={aiLoading}
            className="text-gray-400 hover:text-gray-600 disabled:text-gray-300 text-xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        {/* initial / loading state */}
        {aiRecommendations.length === 0 && !aiError && (
          <>
            {!aiLoading && (
              <p className="text-muted-foreground mb-6">
                {t("glossary.ai_modal_desc")}
              </p>
            )}

            {aiLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">
                  {t("glossary.ai_loading")}
                </p>
              </div>
            )}

            {!aiLoading && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  {t("buttons.cancel")}
                </Button>
                <Button onClick={handleAiRecommendation} disabled={aiLoading}>
                  {t("glossary.ai_get_recommendations")}
                </Button>
              </div>
            )}
          </>
        )}

        {/* error state */}
        {aiError && (
          <>
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{aiError}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                {t("buttons.cancel")}
              </Button>
              <Button onClick={handleAiRecommendation} disabled={aiLoading}>
                {t("glossary.ai_retry")}
              </Button>
            </div>
          </>
        )}

        {/* recommendations list */}
        {aiRecommendations.length > 0 && !aiError && (
          <>
            <p className="text-muted-foreground mb-4">
              {t("glossary.ai_select_terms")}
              {aiRecommendations.some((r) => r.selected) &&
                ` (${
                  aiRecommendations.filter((r) => r.selected).length
                }개 선택됨)`}
            </p>

            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
              {aiRecommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    rec.selected
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => toggleRecommendationSelection(index)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                        rec.selected
                          ? "bg-primary border-primary text-white"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRecommendationSelection(index);
                      }}
                    >
                      {rec.selected && (
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <div
                      className="flex-1"
                      onClick={() => toggleRecommendationSelection(index)}
                    >
                      <h4 className="font-semibold text-base mb-1">
                        {rec.name}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {rec.definition}
                      </p>
                      {rec.examples && (
                        <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {t("glossary.example_prefix")}: {rec.examples}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={onClose} disabled={aiLoading}>
                {t("buttons.cancel")}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleAiRecommendation}
                  disabled={aiLoading}
                >
                  {t("glossary.ai_retry")}
                </Button>
                <Button
                  onClick={addSelectedRecommendations}
                  disabled={
                    aiLoading ||
                    aiRecommendations.filter((r) => r.selected).length === 0
                  }
                >
                  {aiLoading
                    ? t("common.processing")
                    : `${t("glossary.ai_add_selected")} (${
                        aiRecommendations.filter((r) => r.selected).length
                      })`}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
