"use client";

import { Card } from "@/components/ui/card";
import { Tables } from "@/types/database";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

// 최소한의 필드만 타입화해서 재정의
export interface FeaturePolicy {
  id: string;
  contents: string;
  sequence?: number | null;
  updated_at?: string | null;
  policy_links?: { url: string; type: string }[];
  policy_terms?: { glossary_id: string; glossaries?: { name: string } }[];
  connected_features?: {
    id: string;
    name: string;
    usecase: {
      id: string;
      name: string;
      actor_id: string;
      actor: { id: string; name: string };
    };
  }[];
}

interface SortablePolicyCardProps<P = FeaturePolicy> {
  policy: P;
  onEdit: (policy: P) => any;
  membership: Tables<"memberships"> | null;
  onGlossaryClick: (glossaryId: string) => void;
}

export default function SortablePolicyCard<P = FeaturePolicy>({
  policy,
  onEdit,
  membership,
  onGlossaryClick,
}: SortablePolicyCardProps<P>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: policy.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-50" : ""}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card
        className={`p-4 flex-shrink-0 relative ${
          membership?.role === "admin" ? "cursor-pointer hover:bg-gray-50" : ""
        } transition-colors`}
        onClick={() => membership?.role === "admin" && onEdit(policy)}
      >
        {/* Drag handle (admin only) */}
        {membership?.role === "admin" && (
          <div
            {...attributes}
            {...listeners}
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded transition-opacity ${
              isHovered ? "opacity-100" : "opacity-30"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
            </div>
          </div>
        )}

        {/* Sequence badge */}
        {policy.sequence && (
          <div className="absolute top-3 right-3 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
            {policy.sequence}
          </div>
        )}

        {/* Contents */}
        <div
          className={`mb-3 pr-8 ${membership?.role === "admin" ? "ml-8" : ""}`}
        >
          <p className="text-2xl font-medium text-black whitespace-pre-line">
            {policy.contents}
          </p>
        </div>

        {/* Connected features */}
        {policy.connected_features && policy.connected_features.length > 0 && (
          <div className={`mb-3 ${membership?.role === "admin" ? "ml-8" : ""}`}>
            <h5 className="text-xs font-medium text-gray-700 mb-1">
              연결된 기능
            </h5>
            <div className="space-y-1">
              {policy.connected_features.map((feature) => (
                <a
                  key={feature.id}
                  href={`?actorId=${feature.usecase.actor_id}&usecaseId=${feature.usecase.id}&featureId=${feature.id}`}
                  className="block text-xs text-blue-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {feature.name} ({feature.usecase.actor.name} →{" "}
                  {feature.usecase.name})
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Connected glossaries */}
        {policy.policy_terms && policy.policy_terms.length > 0 && (
          <div className={`mb-3 ${membership?.role === "admin" ? "ml-8" : ""}`}>
            <h5 className="text-xs font-medium text-gray-700 mb-1">
              연결된 용어
            </h5>
            <div className="flex flex-wrap gap-1">
              {policy.policy_terms.map((term) => (
                <button
                  key={term.glossary_id}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGlossaryClick(term.glossary_id);
                  }}
                >
                  {term.glossaries?.name || "-"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Context Links */}
        {policy.policy_links &&
          policy.policy_links.filter((l) => l.type === "context").length >
            0 && (
            <div
              className={`mb-3 ${membership?.role === "admin" ? "ml-8" : ""}`}
            >
              <h5 className="text-xs font-medium text-gray-700 mb-1">
                컨텍스트 링크
              </h5>
              <div className="flex flex-wrap gap-1">
                {policy.policy_links
                  .filter((l) => l.type === "context")
                  .map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
                      title={link.url}
                      onClick={(e) => e.stopPropagation()}
                    >
                      🔗 {new URL(link.url).hostname}
                    </a>
                  ))}
              </div>
            </div>
          )}

        {/* General Links */}
        {policy.policy_links &&
          policy.policy_links.filter((l) => l.type === "general").length >
            0 && (
            <div
              className={`mb-3 ${membership?.role === "admin" ? "ml-8" : ""}`}
            >
              <h5 className="text-xs font-medium text-gray-700 mb-1">
                일반 링크
              </h5>
              <div className="flex flex-wrap gap-1">
                {policy.policy_links
                  .filter((l) => l.type === "general")
                  .map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                      title={link.url}
                      onClick={(e) => e.stopPropagation()}
                    >
                      📄 {new URL(link.url).hostname}
                    </a>
                  ))}
              </div>
            </div>
          )}

        {/* Meta info */}
        <div
          className={`pt-2 border-t border-gray-200 ${
            membership?.role === "admin" ? "ml-8" : ""
          }`}
        >
          <div className="flex justify-end text-xs text-gray-500">
            <span className="flex-1" />
            <span className="text-right">
              {policy.updated_at ? (
                <>
                  최종 수정:{" "}
                  {new Date(policy.updated_at).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              ) : (
                <>최종 수정 정보 없음</>
              )}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
