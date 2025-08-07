"use client";

import { Button } from "@/components/ui/button";
import { useGlobalT } from "@/lib/i18n";
import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { InquiryModal } from "./inquiry-modal";

interface InquiryButtonProps {
  position?: "bottom-right" | "sidebar-bottom";
}

export function InquiryButton({
  position = "bottom-right",
}: InquiryButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const t = useGlobalT();

  const buttonClasses =
    position === "bottom-right"
      ? "fixed bottom-6 right-6 z-50 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white"
      : "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors hover:bg-accent bg-blue-600 hover:bg-blue-700 text-white";

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className={buttonClasses}
        size={position === "bottom-right" ? "lg" : "default"}
        variant={position === "bottom-right" ? "default" : "ghost"}
      >
        <MessageCircle className="w-5 h-5 mr-2" />
        {t("inquiry.button")}
      </Button>

      <InquiryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
