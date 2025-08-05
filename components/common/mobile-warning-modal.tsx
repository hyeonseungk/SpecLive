"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGlobalT } from "@/lib/i18n";

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
            📱 PC 최적화 서비스
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            PC에 최적화된 서비스입니다.
            <br />
            PC로 접속해주세요.
          </p>
          <div className="flex justify-center">
            <Button onClick={onClose} variant="outline">
              확인
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
