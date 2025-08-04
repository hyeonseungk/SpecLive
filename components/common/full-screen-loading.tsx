"use client";

import { useGlobalT } from "@/lib/i18n";

interface FullScreenLoadingProps {
  message?: string;
}

export function FullScreenLoading({ message }: FullScreenLoadingProps) {
  const t = useGlobalT();
  const displayMessage = message ?? t("common.loading");
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        {/* 스피너 애니메이션 */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>

        {/* 로딩 메시지 */}
        <div className="text-lg font-medium text-foreground">
          {displayMessage}
        </div>
      </div>
    </div>
  );
}
