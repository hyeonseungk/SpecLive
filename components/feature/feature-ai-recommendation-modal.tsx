"use client";

import { Button } from "@/components/ui/button";
import { showError } from "@/lib/error-store";
import { useGlobalT } from "@/lib/i18n";
import { useLangStore } from "@/lib/i18n-store";
import { showSimpleSuccess } from "@/lib/success-store";
import { supabase } from "@/lib/supabase-browser";
import { Tables } from "@/types/database";
import { useState } from "react";

interface Recommendation {
  name: string;
  description: string;
  selected: boolean;
}

interface FeatureAiRecommendationModalProps {
  projectId: string;
  userId: string;
  selectedUsecaseId: string;
  onClose: () => void;
  onFeaturesAdded: (
    newFeatures: (Tables<"features"> & {
      feature_actors: any[];
    })[]
  ) => void;
}

export default function FeatureAiRecommendationModal({
  projectId,
  userId,
  selectedUsecaseId,
  onClose,
  onFeaturesAdded,
}: FeatureAiRecommendationModalProps) {
  const t = useGlobalT();
  const { lang } = useLangStore();
  const locale = lang;

  const [aiRecommendations, setAiRecommendations] = useState<Recommendation[]>(
    []
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAiRecommendation = async () => {
    setAiRecommendations([]);
    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-feature-recommendation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            projectId,
            count: 5,
            language: locale,
            selectedUsecaseId,
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
        throw new Error(result.error || t("feature.ai_error"));
      }
    } catch (err) {
      console.error("AI recommendation error:", err);
      setAiError(err instanceof Error ? err.message : t("feature.ai_error"));
    } finally {
      setAiLoading(false);
    }
  };

  const toggleRecommendationSelection = (index: number) => {
    setAiRecommendations((prev) =>
      prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
    );
  };

  const addSelectedRecommendations = async () => {
    const selected = aiRecommendations.filter((r) => r.selected);
    if (!selected.length) return;

    setAiLoading(true);
    try {
      const addedFeatures: (Tables<"features"> & {
        feature_actors: any[];
      })[] = [];
      for (const rec of selected) {
        const { data: feature, error: featureError } = await supabase
          .from("features")
          .insert({
            name: rec.name,
            author_id: userId,
            usecase_id: selectedUsecaseId,
          })
          .select()
          .single();
        if (featureError) throw featureError;
        addedFeatures.push({
          ...feature,
          feature_actors: [],
        });
      }
      onFeaturesAdded(addedFeatures);
      setAiRecommendations((prev) => prev.filter((r) => !r.selected));
      showSimpleSuccess(`${selected.length}${t("feature.ai_features_added")}`);
      if (aiRecommendations.filter((r) => !r.selected).length === 0) {
        onClose();
      }
    } catch (err) {
      console.error("Error adding recommended features:", err);
      showError(t("feature.add_error_title"), t("feature.add_error_desc"));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <h3 className="text-lg font-semibold mb-4 pr-8">
          {t("feature.ai_modal_title")}
        </h3>

        {/* initial / loading state */}
        {aiRecommendations.length === 0 && !aiError && (
          <>
            {!aiLoading && (
              <p className="text-muted-foreground mb-6">
                {t("feature.ai_modal_desc")}
              </p>
            )}

            {aiLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">
                  {t("feature.ai_loading")}
                </p>
              </div>
            )}

            {!aiLoading && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  {t("buttons.close")}
                </Button>
                <Button onClick={handleAiRecommendation} disabled={aiLoading}>
                  {t("feature.ai_get_recommendations_modal")}
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
                {t("buttons.close")}
              </Button>
              <Button onClick={handleAiRecommendation} disabled={aiLoading}>
                {t("feature.ai_retry")}
              </Button>
            </div>
          </>
        )}

        {/* recommendations list */}
        {aiRecommendations.length > 0 && !aiError && (
          <>
            <p className="text-muted-foreground mb-4">
              {t("feature.ai_select_features")}
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
                      <h4 className="font-medium text-sm mb-1">{rec.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {rec.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={onClose} disabled={aiLoading}>
                {t("buttons.close")}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleAiRecommendation}
                  disabled={aiLoading}
                >
                  {t("feature.ai_retry")}
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
                    : `${t("feature.ai_add_selected")} (${
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
