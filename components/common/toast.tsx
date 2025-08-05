"use client";

import { useToastStore } from "@/lib/toast-store";
import { cn } from "@/utils/cn";
import { useEffect } from "react";

export function Toast() {
  const { isVisible, message, type, hideToast } = useToastStore();

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        hideToast();
      }, 3000); // 3초 후 자동으로 사라짐

      return () => clearTimeout(timer);
    }
  }, [isVisible, hideToast]);

  if (!isVisible) return null;

  const getToastStyles = () => {
    switch (type) {
      case "success":
        return "bg-black/90 text-white border border-gray-700";
      case "error":
        return "bg-black/90 text-white border border-red-500/30";
      case "info":
        return "bg-black/90 text-white border border-blue-500/30";
      default:
        return "bg-black/90 text-white border border-gray-700";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "info":
        return "ℹ️";
      default:
        return "💬";
    }
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div
        className={cn(
          "flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl backdrop-blur-sm transition-all duration-300 ease-in-out",
          "min-w-[320px] max-w-[520px]",
          "border border-gray-700/50",
          getToastStyles()
        )}
      >
        <span className="text-lg flex-shrink-0">{getIcon()}</span>
        <span className="text-sm font-medium flex-1 leading-relaxed">
          {message}
        </span>
        <button
          onClick={hideToast}
          className="text-white/60 hover:text-white transition-colors flex-shrink-0 p-1 rounded-full hover:bg-white/10"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
