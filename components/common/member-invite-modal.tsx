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
import { showError, showSuccess } from "@/lib/error-store";
import { useGlobalT } from "@/lib/i18n";
import { useLangStore } from "@/lib/i18n-store";
import { useState } from "react";

interface MemberInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export function MemberInviteModal({
  isOpen,
  onClose,
  projectId,
  projectName,
}: MemberInviteModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [isLoading, setIsLoading] = useState(false);
  const t = useGlobalT();
  const { lang } = useLangStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      showError("이메일 주소를 입력해주세요", "이메일 주소는 필수입니다.");
      return;
    }

    if (!email.includes("@")) {
      showError(
        "올바른 이메일 주소를 입력해주세요",
        "이메일 형식이 올바르지 않습니다."
      );
      return;
    }

    setIsLoading(true);

    try {
      // Edge Function 호출하여 초대 이메일 발송
      const response = await fetch("/api/send-invite-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          projectId,
          projectName,
          role,
          language: lang,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "초대 이메일 발송에 실패했습니다.");
      }

      showSuccess(
        "초대 이메일이 발송되었습니다",
        `${email}로 초대 이메일을 발송했습니다.`
      );

      // 폼 초기화
      setEmail("");
      setRole("member");
      onClose();
    } catch (error) {
      console.error("Error sending invite email:", error);
      showError(
        "초대 이메일 발송 실패",
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다."
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
          <DialogTitle>멤버 초대</DialogTitle>
          <DialogDescription>
            새로운 멤버를 {projectName} 프로젝트에 초대합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              이메일 주소
            </label>
            <Input
              id="email"
              type="email"
              placeholder="example@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">
              역할
            </label>
            <Select
              value={role}
              onValueChange={(value: "admin" | "member") => setRole(value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="역할을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">멤버</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {role === "admin"
                ? "관리자는 프로젝트 설정을 변경하고 멤버를 초대할 수 있습니다."
                : "멤버는 프로젝트의 용어집과 정책을 확인하고 기여할 수 있습니다."}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "발송 중..." : "초대 이메일 발송"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
