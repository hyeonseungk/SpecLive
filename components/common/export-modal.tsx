"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportModal({ isOpen, onClose }: ExportModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Export</h3>
          <p className="text-gray-600 text-sm">
            서비스의 기능 및 정책을 적절한 포맷으로 익스포트하고 팀의 효율 및
            AI 코딩 툴의 성능을 높여보세요
          </p>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              // TODO: Implement Markdown export
              console.log("Export as Markdown");
            }}
          >
            마크다운 (.md)
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              // TODO: Implement CSV export
              console.log("Export as CSV");
            }}
          >
            CSV (.csv)
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              // TODO: Implement JSON export
              console.log("Export as JSON");
            }}
          >
            JSON (.json)
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              // TODO: Implement Text export
              console.log("Export as Text");
            }}
          >
            텍스트 (.txt)
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              // TODO: Implement Excel export
              console.log("Export as Excel");
            }}
          >
            엑셀 (.xlsx)
          </Button>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
        </div>
      </div>
    </div>
  );
} 