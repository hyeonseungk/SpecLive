"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGlobalT } from "@/lib/i18n";
import { FileText, Target, Users, X, Zap } from "lucide-react";

interface TermExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermExplanationModal({
  isOpen,
  onClose,
}: TermExplanationModalProps) {
  const t = useGlobalT();

  if (!isOpen) return null;

  const terms = [
    {
      icon: Users,
      title: t("termExplanation.actor.title"),
      description: t("termExplanation.actor.description"),
      examples: [
        t("termExplanation.actor.examples.0"),
        t("termExplanation.actor.examples.1"),
        t("termExplanation.actor.examples.2"),
        t("termExplanation.actor.examples.3"),
      ],
    },
    {
      icon: Target,
      title: t("termExplanation.usecase.title"),
      description: t("termExplanation.usecase.description"),
      examples: [
        t("termExplanation.usecase.examples.0"),
        t("termExplanation.usecase.examples.1"),
        t("termExplanation.usecase.examples.2"),
        t("termExplanation.usecase.examples.3"),
      ],
    },
    {
      icon: Zap,
      title: t("termExplanation.feature.title"),
      description: t("termExplanation.feature.description"),
      examples: [
        t("termExplanation.feature.examples.0"),
        t("termExplanation.feature.examples.1"),
        t("termExplanation.feature.examples.2"),
        t("termExplanation.feature.examples.3"),
      ],
    },
    {
      icon: FileText,
      title: t("termExplanation.policy.title"),
      description: t("termExplanation.policy.description"),
      examples: [
        t("termExplanation.policy.examples.0"),
        t("termExplanation.policy.examples.1"),
        t("termExplanation.policy.examples.2"),
        t("termExplanation.policy.examples.3"),
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {t("termExplanation.title")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 스크롤 가능한 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {terms.map((term, index) => {
              const IconComponent = term.icon;
              return (
                <Card
                  key={index}
                  className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-blue-600" />
                      </div>
                      <CardTitle className="text-lg text-gray-900">
                        {term.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-gray-700 mb-4 leading-relaxed">
                      {term.description}
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {t("termExplanation.examples_label")}
                      </h4>
                      <ul className="space-y-1">
                        {term.examples.map((example, exampleIndex) => (
                          <li
                            key={exampleIndex}
                            className="text-sm text-gray-600"
                          >
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">
              {t("termExplanation.footer_description")}
            </p>
            <Button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {t("termExplanation.understand_button")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
