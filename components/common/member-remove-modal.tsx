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
import { useGlobalT } from "@/lib/i18n";

interface MemberRemoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  memberEmail: string;
  isLoading: boolean;
}

export function MemberRemoveModal({
  isOpen,
  onClose,
  onConfirm,
  memberEmail,
  isLoading,
}: MemberRemoveModalProps) {
  const t = useGlobalT();

  return (
    <Dialog open={isOpen} onOpenChange={isLoading ? undefined : onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("memberRemove.title")}</DialogTitle>
          <DialogDescription>
            {t("memberRemove.description", { email: memberEmail })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? t("common.loading") : t("memberRemove.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
