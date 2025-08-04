"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useErrorStore } from "@/lib/error-store";
import { useGlobalT } from "@/lib/i18n";
import { useSuccessStore } from "@/lib/success-store";
import type { Tables } from "@/types/database";
import { useState } from "react";

type Project = Tables<"projects">;

interface MemberInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  project: Project;
}

export function MemberInviteModal({
  isOpen,
  onClose,
  onSuccess,
  project,
}: MemberInviteModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [isLoading, setIsLoading] = useState(false);
  const { showError } = useErrorStore();
  const { showSuccess } = useSuccessStore();
  const t = useGlobalT();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      showError(
        t("invite.input_error_title"),
        t("invite.input_email_required")
      );
      return;
    }

    if (!validateEmail(email.trim())) {
      showError(t("invite.input_error_title"), t("invite.input_email_invalid"));
      return;
    }

    setIsLoading(true);

    try {
      // 이메일로 사용자 찾기 (실제로는 Supabase Auth에서 사용자를 찾아야 하지만,
      // 현재는 간단하게 이메일을 입력받는 것으로 구현)

      // 실제 구현에서는 다음과 같은 단계가 필요합니다:
      // 1. Supabase Admin API를 사용해 이메일로 사용자 검색
      // 2. 사용자가 없으면 초대 이메일 발송
      // 3. 사용자가 있으면 멤버십 직접 생성

      // 현재는 시연용으로 간단하게 구현
      showSuccess(
        t("invite.success_title"),
        t("invite.success_message")
          .replace("{email}", email)
          .replace("{project}", project.name)
      );

      setEmail("");
      setRole("member");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Member invitation error:", error);
      showError(t("invite.failure_title"), t("invite.failure_message"));
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
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("invite.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("invite.description_prefix").replace("{project}", project.name)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-4">
          <div>
            <label
              htmlFor="member-email"
              className="text-sm font-medium mb-2 block"
            >
              {t("invite.email_label")}
            </label>
            <Input
              id="member-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("invite.email_placeholder")}
              disabled={isLoading}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div>
            <label
              htmlFor="member-role"
              className="text-sm font-medium mb-2 block"
            >
              {t("invite.role_label")}
            </label>
            <select
              id="member-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member")}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="member">{t("invite.role_member")}</option>
              <option value="admin">{t("invite.role_admin")}</option>
            </select>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isLoading}>
            {t("buttons.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={
              isLoading || !email.trim() || !validateEmail(email.trim())
            }
          >
            {isLoading ? t("invite.inviting") : t("invite.send")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
