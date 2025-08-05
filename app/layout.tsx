"use client";

import { ErrorModal } from "@/components/common/error-modal";
import { MobileWarningModal } from "@/components/common/mobile-warning-modal";
import { SuccessModal } from "@/components/common/success-modal";
import { useLangStore } from "@/lib/i18n-store";
import { isMobileDevice, isMobileViewport } from "@/utils/mobile-detection";
import { useEffect, useState } from "react";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { lang } = useLangStore();
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  useEffect(() => {
    // 전체 언어 설정에 따라 HTML lang 속성 설정
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    // 모바일 디바이스 감지
    const checkMobile = () => {
      const isMobile = isMobileDevice() || isMobileViewport();

      // 이미 모바일 경고를 본 적이 있는지 확인
      const hasSeenMobileWarning = localStorage.getItem("hasSeenMobileWarning");

      if (isMobile && !hasSeenMobileWarning) {
        setShowMobileWarning(true);
      } else {
        setShowMobileWarning(false);
      }
    };

    checkMobile();

    // 윈도우 리사이즈 시에도 체크
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin=""
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
      </head>
      <body className="font-pretendard">
        <div className="min-h-screen bg-background">{children}</div>
        <ErrorModal />
        <SuccessModal />
        <MobileWarningModal
          isOpen={showMobileWarning}
          onClose={() => {
            setShowMobileWarning(false);
            // 모바일 경고를 봤다고 표시
            localStorage.setItem("hasSeenMobileWarning", "true");
          }}
        />
      </body>
    </html>
  );
}
