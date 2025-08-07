"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showError } from "@/lib/error-store";
import { useGlobalT } from "@/lib/i18n";
import { useLangStore } from "@/lib/i18n-store";
import { showSuccess } from "@/lib/success-store";
import { supabase } from "@/lib/supabase-browser";
import { useState } from "react";

interface MemberInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  senderId: string; // 초대를 보내는 사용자의 ID
}

export function MemberInviteModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  senderId,
}: MemberInviteModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [isLoading, setIsLoading] = useState(false);
  const t = useGlobalT();
  const { lang } = useLangStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      showError(
        t("memberInviteModal.email_required_title"),
        t("memberInviteModal.email_required_desc")
      );
      return;
    }

    if (!email.includes("@")) {
      showError(
        t("memberInviteModal.email_invalid_title"),
        t("memberInviteModal.email_invalid_desc")
      );
      return;
    }

    setIsLoading(true);

    try {
      // Supabase Edge Function 직접 호출
      const { data, error } = await supabase.functions.invoke(
        "send-invite-email",
        {
          body: {
            email: email.trim(),
            projectId,
            projectName,
            senderId,
            role,
            language: lang,
          },
        }
      );

      if (error) {
        throw new Error(error.message || t("memberInviteModal.error_desc"));
      }

      showSuccess(
        t("memberInviteModal.success_title"),
        t("memberInviteModal.success_desc", { email: email.trim() })
      );

      // 폼 초기화
      setEmail("");
      setRole("member");
      onClose();
    } catch (error) {
      console.error("Error sending invite email:", error);
      showError(
        t("memberInviteModal.error_title"),
        error instanceof Error
          ? error.message
          : t("memberInviteModal.error_desc")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setEmail("");
      setRole("member");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("memberInviteModal.title")}</DialogTitle>
          <DialogDescription>
            {t("memberInviteModal.description", { projectName })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {t("memberInviteModal.email_label")}
            </label>
            <Input
              id="email"
              type="email"
              placeholder={t("memberInviteModal.email_placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">
              {t("memberInviteModal.role_label")}
            </label>
            <Select
              value={role}
              onValueChange={(value: "admin" | "member") => setRole(value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("memberInviteModal.role_placeholder")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">
                  {t("memberInviteModal.role_member")}
                </SelectItem>
                <SelectItem value="admin">
                  {t("memberInviteModal.role_admin")}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {role === "admin"
                ? t("memberInviteModal.role_admin_desc")
                : t("memberInviteModal.role_member_desc")}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              {t("memberInviteModal.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? t("memberInviteModal.sending")
                : t("memberInviteModal.send")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
