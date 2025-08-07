"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { showError } from "@/lib/error-store";
import { useGlobalT } from "@/lib/i18n";
import { showSimpleSuccess } from "@/lib/success-store";
import { supabase } from "@/lib/supabase-browser";
import { useState } from "react";

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InquiryModal({ isOpen, onClose }: InquiryModalProps) {
  const [contents, setContents] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useGlobalT();

  const handleSubmit = async () => {
    if (!contents.trim()) {
      showError(t("inquiry.modal_title"), t("inquiry.content_required"));
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("사용자 인증 정보가 없습니다.");
      }

      const { error } = await supabase.from("inquiries").insert({
        contents: contents.trim(),
        user_id: user.id,
      });

      if (error) {
        throw error;
      }

      showSimpleSuccess(t("inquiry.success"));
      setContents("");
      onClose();
    } catch (error) {
      console.error("문의 전송 오류:", error);
      showError(t("common.error_title"), t("inquiry.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setContents("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {t("inquiry.modal_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="inquiry-contents"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {t("inquiry.content_label")}
            </label>
            <Textarea
              id="inquiry-contents"
              value={contents}
              onChange={(e) => setContents(e.target.value)}
              placeholder={t("inquiry.content_placeholder")}
              className="min-h-[120px] resize-none"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t("inquiry.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !contents.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? t("inquiry.sending") : t("inquiry.send")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
