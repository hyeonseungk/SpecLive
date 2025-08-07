"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/types/database";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { renderServiceIcon } from "../../utils/service-icon-utils";

interface SortableGlossaryCardProps {
  glossary: Tables<"glossaries"> & { glossary_links?: any[] };
  onEdit: (glossary: Tables<"glossaries">) => void;
  onCopyUrl: (glossary: Tables<"glossaries">) => void;
  showSequence: boolean;
  t: any;
  locale: string;
  membership: Tables<"memberships"> | null;
}

export default function SortableGlossaryCard({
  glossary,
  onEdit,
  onCopyUrl,
  showSequence,
  t,
  locale,
  membership,
}: SortableGlossaryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: glossary.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      id={`glossary-${glossary.id}`}
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-50" : ""}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card
        className={`relative group transition-shadow ${
          membership?.role === "admin" ? "cursor-pointer hover:shadow-md" : ""
        }`}
      >
        {/* 드래그 핸들 (시퀀스 정렬일 때만, 항상 표시, 호버 시 진하게, 관리자만) */}
        {showSequence && membership?.role === "admin" && (
          <div
            {...attributes}
            {...listeners}
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded transition-opacity ${
              isHovered ? "opacity-100" : "opacity-30"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        )}

        {/* 복사 버튼 (호버 시에만 표시) */}
        {isHovered && (
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopyUrl(glossary);
              }}
              className="w-8 h-8 bg-white shadow-md hover:shadow-lg rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-all"
              title={t("glossary.copy_url")}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </button>
            {/* 시퀀스 번호 표시 (시퀀스 정렬일 때만) */}
            {showSequence && glossary.sequence && (
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                {glossary.sequence}
              </div>
            )}
          </div>
        )}

        {/* 시퀀스 번호만 표시 (호버하지 않았을 때, 시퀀스 정렬일 때만) */}
        {!isHovered && showSequence && glossary.sequence && (
          <div className="absolute top-3 right-3 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
            {glossary.sequence}
          </div>
        )}

        <div
          onClick={() => membership?.role === "admin" && onEdit(glossary)}
          className={showSequence && membership?.role === "admin" ? "ml-8" : ""}
        >
          <CardHeader>
            <CardTitle className="text-3xl">{glossary.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className="text-base text-muted-foreground overflow-hidden mb-2"
              style={
                {
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  maxHeight: "3rem",
                } as React.CSSProperties
              }
            >
              {glossary.definition}
            </p>
            {glossary.examples && (
              <p className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded mb-2 w-fit">
                {t("glossary.example_prefix")}: {glossary.examples}
              </p>
            )}
            {(glossary as any).glossary_links &&
              (glossary as any).glossary_links.length > 0 && (
                <div className="mb-2">
                  <div className="flex flex-col gap-1">
                    {(glossary as any).glossary_links.map(
                      (link: any, index: number) => (
                        <a
                          key={index}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200 flex items-center gap-1 w-fit"
                          title={link.url}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>{renderServiceIcon(link.url, "w-4 h-4")}</span>
                          <span className="break-all">{link.url}</span>
                        </a>
                      )
                    )}
                  </div>
                </div>
              )}
            <div className="mt-auto text-xs text-muted-foreground text-right">
              최종 수정:{" "}
              {glossary.updated_at &&
                new Date(glossary.updated_at).toLocaleString(locale, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
