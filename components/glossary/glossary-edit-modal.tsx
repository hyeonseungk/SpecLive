"use client";

import { Button } from "@/components/ui/button";
import { showError } from "@/lib/error-store";
import { useProjectT } from "@/lib/i18n";
import { useLangStore } from "@/lib/i18n-store";
import { showSimpleSuccess } from "@/lib/success-store";
import { supabase } from "@/lib/supabase-browser";
import { Tables } from "@/types/database";
import { useState } from "react";

interface GlossaryEditModalProps {
  glossary: Tables<"glossaries">;
  projectId: string;
  onClose: () => void;
  onGlossaryUpdated: (
    glossaryWithLinks: Tables<"glossaries"> & { glossary_links?: any[] }
  ) => void;
  onGlossaryDeleted: (glossaryId: string, deletedSequence: number) => void;
}

export default function GlossaryEditModal({
  glossary,
  projectId,
  onClose,
  onGlossaryUpdated,
  onGlossaryDeleted,
}: GlossaryEditModalProps) {
  const t = useProjectT();
  const { locale } = useLangStore();

  // local states for edit form
  const [editName, setEditName] = useState(glossary.name);
  const [editDefinition, setEditDefinition] = useState(glossary.definition);
  const [editExamples, setEditExamples] = useState(glossary.examples || "");
  const [editGithubUrls, setEditGithubUrls] = useState<string[]>(
    ((glossary as any).glossary_links || []).map((l: any) => l.url) || [""]
  );
  const [editSaving, setEditSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const addEditGithubUrl = () => setEditGithubUrls((prev) => [...prev, ""]);
  const removeEditGithubUrl = (index: number) =>
    setEditGithubUrls((prev) => prev.filter((_, i) => i !== index));
  const updateEditGithubUrl = (index: number, value: string) =>
    setEditGithubUrls((prev) =>
      prev.map((url, i) => (i === index ? value : url))
    );

  /* ----------------------------- Update glossary ---------------------------- */
  const updateGlossary = async () => {
    if (!editName.trim() || !editDefinition.trim()) {
      showError(
        t("glossary.input_error_title"),
        t("glossary.input_error_desc")
      );
      return;
    }

    setEditSaving(true);
    try {
      // 1. update main glossary row
      const { data: updatedGlossary, error: updateError } = await supabase
        .from("glossaries")
        .update({
          name: editName.trim(),
          definition: editDefinition.trim(),
          examples: editExamples.trim() || null,
        })
        .eq("id", glossary.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // 2. delete existing links
      const { error: deleteLinksError } = await supabase
        .from("glossary_links")
        .delete()
        .eq("glossary_id", glossary.id);
      if (deleteLinksError) throw deleteLinksError;

      // 3. insert new links (non-empty)
      const validUrls = editGithubUrls.filter((u) => u.trim());
      if (validUrls.length) {
        const urlRows = validUrls.map((url) => ({
          glossary_id: glossary.id,
          url: url.trim(),
        }));
        const { error: insertErr } = await supabase
          .from("glossary_links")
          .insert(urlRows);
        if (insertErr) throw insertErr;
      }

      const glossaryWithLinks = {
        ...updatedGlossary,
        glossary_links: validUrls.map((url) => ({ url })),
      };

      onGlossaryUpdated(glossaryWithLinks);
      showSimpleSuccess(t("glossary.update_success"));
      onClose();
    } catch (err) {
      console.error("Error updating glossary:", err);
      showError(
        t("glossary.update_error_title"),
        t("glossary.update_error_desc")
      );
    } finally {
      setEditSaving(false);
    }
  };

  /* ----------------------------- Delete glossary ---------------------------- */
  const deleteGlossary = async () => {
    setEditSaving(true);
    try {
      const deletedSequence = glossary.sequence;

      // 1. delete links
      const { error: delLinksErr } = await supabase
        .from("glossary_links")
        .delete()
        .eq("glossary_id", glossary.id);
      if (delLinksErr) throw delLinksErr;

      // 2. delete glossary itself
      const { error: delGlossaryErr } = await supabase
        .from("glossaries")
        .delete()
        .eq("id", glossary.id);
      if (delGlossaryErr) throw delGlossaryErr;

      // 3. shift sequences for following glossaries
      const { data: higherSeq, error: fetchErr } = await supabase
        .from("glossaries")
        .select("id, sequence")
        .eq("project_id", projectId)
        .gt("sequence", deletedSequence)
        .order("sequence", { ascending: true });
      if (fetchErr) throw fetchErr;

      if (higherSeq && higherSeq.length) {
        const promises = higherSeq.map((g) =>
          supabase
            .from("glossaries")
            .update({ sequence: g.sequence - 1 })
            .eq("id", g.id)
        );
        await Promise.all(promises);
      }

      onGlossaryDeleted(glossary.id, deletedSequence);
      showSimpleSuccess(t("glossary.delete_success"));
      onClose();
    } catch (err) {
      console.error("Error deleting glossary:", err);
      showError(
        t("glossary.delete_error_title"),
        t("glossary.delete_error_desc")
      );
    } finally {
      setEditSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  /* ---------------------------------- JSX ---------------------------------- */
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {t("glossary.edit_modal_title")}
          </h3>
          <button
            onClick={onClose}
            disabled={editSaving}
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
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={t("glossary.name_placeholder")}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={editSaving}
            />
          </div>

          {/* Definition */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("glossary.definition_label")}
            </label>
            <textarea
              value={editDefinition}
              onChange={(e) => setEditDefinition(e.target.value)}
              placeholder={t("glossary.definition_placeholder")}
              className="w-full p-2 border rounded-md h-24 resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={editSaving}
            />
          </div>

          {/* Examples */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("glossary.examples_label")}
            </label>
            <input
              type="text"
              value={editExamples}
              onChange={(e) => setEditExamples(e.target.value)}
              placeholder={t("glossary.examples_placeholder")}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={editSaving}
            />
          </div>

          {/* GitHub URLs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                {t("glossary.related_url_label")}
              </label>
              <button
                type="button"
                onClick={addEditGithubUrl}
                disabled={editSaving}
                className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
              >
                {t("glossary.add_url")}
              </button>
            </div>
            <div className="mb-3 p-3 bg-gray-50 rounded-md text-xs text-gray-600 whitespace-pre-line">
              {t("glossary.related_url_desc")}
            </div>
            <div className="space-y-2">
              {editGithubUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateEditGithubUrl(index, e.target.value)}
                    placeholder={t("glossary.related_url_placeholder")}
                    className="flex-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={editSaving}
                  />
                  {editGithubUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEditGithubUrl(index)}
                      disabled={editSaving}
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

        {/* Action buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={editSaving}
          >
            {t("buttons.delete")}
          </Button>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={editSaving}>
              {t("buttons.cancel")}
            </Button>
            <Button
              onClick={updateGlossary}
              disabled={
                editSaving || !editName.trim() || !editDefinition.trim()
              }
            >
              {editSaving ? t("glossary.updating") : t("glossary.update")}
            </Button>
          </div>
        </div>
      </div>

      {/* delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {t("glossary.delete_confirm_title")}
              </h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-muted-foreground mb-6">
              {t("glossary.delete_confirm_desc")}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t("buttons.cancel")}
              </Button>
              <Button variant="destructive" onClick={deleteGlossary}>
                {t("buttons.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
