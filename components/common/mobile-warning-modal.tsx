"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGlobalT } from "@/lib/i18n";
import Image from "next/image";

interface MobileWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileWarningModal({
  isOpen,
  onClose,
}: MobileWarningModalProps) {
  const t = useGlobalT();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-lg">
            {t("common.mobile_warning.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center mb-4">
            <Image
              src="/images/turn_on_desktop_mode_ko_KR.jpeg"
              alt="데스크톱 모드 활성화 안내"
              width={200}
              height={150}
              className="rounded-lg"
            />
          </div>
          <p className="text-center text-muted-foreground whitespace-pre-line">
            {t("common.mobile_warning.message")}
          </p>
          <div className="flex justify-center">
            <Button onClick={onClose} variant="outline">
              {t("common.mobile_warning.confirm")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
