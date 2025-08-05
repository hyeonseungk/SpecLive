"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGlobalT } from "@/lib/i18n";

interface GlossaryImportanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlossaryImportanceModal({
  isOpen,
  onClose,
}: GlossaryImportanceModalProps) {
  const t = useGlobalT();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            {t("glossary.importance_modal_title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-4 list-disc list-inside">
            <li className="text-gray-700 leading-relaxed">
              {t("glossary.importance_modal_content_1")}
            </li>

            <li className="text-gray-700 leading-relaxed">
              {t("glossary.importance_modal_content_2")}
            </li>

            <li className="text-gray-700 leading-relaxed">
              {t("glossary.importance_modal_content_3")}
            </li>

            <li className="text-gray-700 leading-relaxed">
              {t("glossary.importance_modal_content_4")}
            </li>
          </ul>

          <div className="flex justify-end pt-4">
            <Button onClick={onClose} variant="outline">
              {t("glossary.close")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
