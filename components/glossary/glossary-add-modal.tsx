"use client";

import { Button } from "@/components/ui/button";
import { showError } from "@/lib/error-store";
import { useProjectT } from "@/lib/i18n";
import { showSimpleSuccess } from "@/lib/success-store";
import { supabase } from "@/lib/supabase-browser";
import { Tables } from "@/types/database";
import { useState } from "react";

interface GlossaryAddModalProps {
  projectId: string;
  userId: string;
  onClose: () => void;
  onGlossaryAdded: (
    glossary: Tables<"glossaries"> & { glossary_links: { url: string }[] }
  ) => void;
}

export default function GlossaryAddModal({
  projectId,
  userId,
  onClose,
  onGlossaryAdded,
}: GlossaryAddModalProps) {
  const t = useProjectT();

  /* ----------------------------- local form state ---------------------------- */
  const [glossaryName, setGlossaryName] = useState("");
  const [glossaryDefinition, setGlossaryDefinition] = useState("");
  const [glossaryExamples, setGlossaryExamples] = useState("");
  const [glossaryGithubUrls, setGlossaryGithubUrls] = useState<string[]>([""]);
  const [glossarySaving, setGlossarySaving] = useState(false);

  /* ----------------------------- helper setters ----------------------------- */
  const addGithubUrl = () => setGlossaryGithubUrls((prev) => [...prev, ""]);
  const removeGithubUrl = (index: number) =>
    setGlossaryGithubUrls((prev) => prev.filter((_, i) => i !== index));
  const updateGithubUrl = (index: number, value: string) =>
    setGlossaryGithubUrls((prev) =>
      prev.map((url, i) => (i === index ? value : url))
    );

  /* ------------------------------- close modal ------------------------------ */
  const handleClose = () => {
    onClose();
    // reset internal form
    setGlossaryName("");
    setGlossaryDefinition("");
    setGlossaryExamples("");
    setGlossaryGithubUrls([""]);
  };

  /* -------------------------------- add term -------------------------------- */
  const addGlossary = async () => {
    if (!glossaryName.trim() || !glossaryDefinition.trim()) {
      showError(
        t("glossary.input_error_title"),
        t("glossary.input_error_desc")
      );
      return;
    }

    setGlossarySaving(true);
    try {
      // 1. find next sequence
      const { data: maxSeqData, error: maxSeqErr } = await supabase
        .from("glossaries")
        .select("sequence")
        .eq("project_id", projectId)
        .order("sequence", { ascending: false })
        .limit(1);
      if (maxSeqErr) throw maxSeqErr;
      const nextSequence = (maxSeqData?.[0]?.sequence || 0) + 1;

      // 2. insert glossary
      const { data: glossary, error: glossaryErr } = await supabase
        .from("glossaries")
        .insert({
          project_id: projectId,
          name: glossaryName.trim(),
          definition: glossaryDefinition.trim(),
          examples: glossaryExamples.trim() || null,
          author_id: userId,
          sequence: nextSequence,
        })
        .select()
        .single();
      if (glossaryErr) throw glossaryErr;

      // 3. insert links
      const validUrls = glossaryGithubUrls.filter((u) => u.trim());
      if (validUrls.length) {
        const rows = validUrls.map((url) => ({
          glossary_id: glossary.id,
          url: url.trim(),
        }));
        const { error: linksErr } = await supabase
          .from("glossary_links")
          .insert(rows);
        if (linksErr) throw linksErr;
      }

      const glossaryWithLinks = {
        ...glossary,
        glossary_links: validUrls.map((url) => ({ url })),
      };

      onGlossaryAdded(glossaryWithLinks);
      showSimpleSuccess(t("glossary.add_success"));
      handleClose();
    } catch (err) {
      console.error("Error adding glossary:", err);
      showError(t("glossary.add_error_title"), t("glossary.add_error_desc"));
    } finally {
      setGlossarySaving(false);
    }
  };

  /* ---------------------------------- JSX ---------------------------------- */
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {t("glossary.add_modal_title")}
          </h3>
          <button
            onClick={handleClose}
            disabled={glossarySaving}
            className="text-gray-400 hover:text-gray-600 disabled:text-gray-300 text-xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("glossary.name_label")}
            </label>
            <input
              type="text"
              value={glossaryName}
              onChange={(e) => setGlossaryName(e.target.value)}
              placeholder={t("glossary.name_placeholder")}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={glossarySaving}
            />
          </div>

          {/* Definition */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("glossary.definition_label")}
            </label>
            <textarea
              value={glossaryDefinition}
              onChange={(e) => setGlossaryDefinition(e.target.value)}
              placeholder={t("glossary.definition_placeholder")}
              className="w-full p-2 border rounded-md h-24 resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={glossarySaving}
            />
          </div>

          {/* Examples */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("glossary.examples_label")}
            </label>
            <input
              type="text"
              value={glossaryExamples}
              onChange={(e) => setGlossaryExamples(e.target.value)}
              placeholder={t("glossary.examples_placeholder")}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={glossarySaving}
            />
          </div>

          {/* Links */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                {t("glossary.related_url_label")}
              </label>
              <button
                type="button"
                onClick={addGithubUrl}
                disabled={glossarySaving}
                className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
              >
                {t("glossary.add_url")}
              </button>
            </div>
            <div className="mb-3 p-3 bg-gray-50 rounded-md text-xs text-gray-600 whitespace-pre-line">
              {t("glossary.related_url_desc")}
            </div>
            <div className="space-y-2">
              {glossaryGithubUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateGithubUrl(index, e.target.value)}
                    placeholder={t("glossary.related_url_placeholder")}
                    className="flex-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={glossarySaving}
                  />
                  {glossaryGithubUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGithubUrl(index)}
                      disabled={glossarySaving}
                      className="px-2 py-1 text-red-600 hover:text-red-800 disabled:text-gray-400"
                      title={t("glossary.remove_url")}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={glossarySaving}
          >
            {t("buttons.cancel")}
          </Button>
          <Button
            onClick={addGlossary}
            disabled={
              glossarySaving ||
              !glossaryName.trim() ||
              !glossaryDefinition.trim()
            }
          >
            {glossarySaving ? t("glossary.adding") : t("glossary.add")}
          </Button>
        </div>
      </div>
    </div>
  );
}
