"use client";

import { showSimpleSuccess } from "@/lib/success-store";
import { Tables } from "@/types/database";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link as LinkIcon } from "lucide-react";
import { useState } from "react";

interface SortableFeatureCardProps {
  feature: Tables<"features">;
  onSelect: (feature: Tables<"features">) => void;
  onEdit: (feature: Tables<"features">) => void;
  onDelete: (feature: Tables<"features">) => void;
  isSelected: boolean;
  membership: Tables<"memberships"> | null;
}

export default function SortableFeatureCard({
  feature,
  onSelect,
  onEdit,
  onDelete,
  isSelected,
  membership,
}: SortableFeatureCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: feature.id });

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
      <div
        className={`relative group p-2 rounded cursor-pointer text-sm transition-colors ${
          isSelected
            ? "bg-primary text-primary-foreground"
            : "bg-white hover:bg-gray-100"
        }`}
        onClick={() => onSelect(feature)}
      >
        {/* Drag handle (always visible, more opaque on hover, admin only) */}
        {membership?.role === "admin" && (
          <div
            {...attributes}
            {...listeners}
            className={`absolute left-1 top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded transition-opacity ${
              isHovered ? "opacity-100" : "opacity-30"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-0.5 h-0.5 bg-gray-400 rounded-full" />
              <div className="w-0.5 h-0.5 bg-gray-400 rounded-full" />
              <div className="w-0.5 h-0.5 bg-gray-400 rounded-full" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div
            className={`flex items-center gap-2 flex-1 ${
              membership?.role === "admin" ? "ml-4" : ""
            }`}
          >
            {/* Sequence number */}
            {feature.sequence && (
              <div className="w-4 h-4 bg-gray-400 text-white rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                {feature.sequence}
              </div>
            )}
            <span className="flex-1 text-base">{feature.name}</span>
          </div>

          {/* Edit / Delete / Copy URL buttons (visible on hover, admin only) */}
          {membership?.role === "admin" && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(feature);
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="기능 편집"
              >
                <svg
                  className="w-3 h-3 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(feature);
                }}
                className="p-1 hover:bg-red-100 rounded transition-colors"
                title="기능 삭제"
              >
                <svg
                  className="w-3 h-3 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(window.location.href);
                  showSimpleSuccess("링크가 복사되었습니다.");
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="링크 복사"
              >
                <LinkIcon className="w-3 h-3 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
