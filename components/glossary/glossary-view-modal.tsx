"use client";

import { Button } from "@/components/ui/button";
import { showError } from "@/lib/error-store";
import { useGlobalT } from "@/lib/i18n";
import { supabase } from "@/lib/supabase-browser";
import { Tables } from "@/types/database";
import { useEffect, useState } from "react";

interface GlossaryViewModalProps {
  glossaryId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

type GlossaryWithLinks = Tables<"glossaries"> & {
  glossary_links: { id: string; url: string }[];
};

export default function GlossaryViewModal({
  glossaryId,
  isOpen,
  onClose,
}: GlossaryViewModalProps) {
  const t = useGlobalT();
  const [loading, setLoading] = useState(false);
  const [glossary, setGlossary] = useState<GlossaryWithLinks | null>(null);

  const [loadedId, setLoadedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !glossaryId || glossaryId === loadedId) return;

    const loadGlossary = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("glossaries")
          .select(
            `*,
            glossary_links ( id, url )
          `
          )
          .eq("id", glossaryId)
          .single();

        if (error) throw error;
        setGlossary(data as GlossaryWithLinks);
        setLoadedId(glossaryId);
      } catch (err) {
        console.error("Error loading glossary:", err);
        showError(
          t("glossary.load_error_title"),
          t("glossary.load_error_desc")
        );
      } finally {
        setLoading(false);
      }
    };

    loadGlossary();
  }, [isOpen, glossaryId, loadedId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {loading || !glossary ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <h3 className="text-2xl font-bold mb-4">{glossary.name}</h3>

            <section className="mb-4">
              <h4 className="text-sm font-semibold mb-1">
                {t("glossary.definition_label")}
              </h4>
              <p className="whitespace-pre-line text-sm text-gray-800">
                {glossary.definition}
              </p>
            </section>

            {glossary.examples && (
              <section className="mb-4">
                <h4 className="text-sm font-semibold mb-1">
                  {t("glossary.examples_label")}
                </h4>
                <p className="whitespace-pre-line text-sm text-gray-800">
                  {glossary.examples}
                </p>
              </section>
            )}

            {glossary.glossary_links?.length > 0 && (
              <section className="mb-4">
                <h4 className="text-sm font-semibold mb-1">GitHub</h4>
                <ul className="list-disc list-inside space-y-1">
                  {glossary.glossary_links.map((l) => (
                    <li key={l.id}>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all text-sm"
                      >
                        {l.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="text-right mt-6">
              <Button variant="outline" onClick={onClose}>
                {t("buttons.close")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
