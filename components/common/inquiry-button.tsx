"use client";

import { Button } from "@/components/ui/button";
import { useGlobalT } from "@/lib/i18n";
import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { InquiryModal } from "./inquiry-modal";

export function InquiryButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const t = useGlobalT();

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 left-6 z-50 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white"
        size="lg"
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
