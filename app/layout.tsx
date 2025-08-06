"use client";

import { ErrorModal } from "@/components/common/error-modal";
import { MobileWarningModal } from "@/components/common/mobile-warning-modal";
import { SuccessModal } from "@/components/common/success-modal";
import { Toast } from "@/components/common/toast";
import { useLanguageHydration } from "@/lib/i18n";
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
  const isHydrated = useLanguageHydration();
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  useEffect(() => {
    // 전체 언어 설정에 따라 HTML lang 속성 설정
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    // 모바일 디바이스 감지
    const checkMobile = () => {
      const isMobile = isMobileDevice() || isMobileViewport();

      // 세션 기반으로 모바일 경고 표시 여부 확인
      const hasSeenMobileWarning = sessionStorage.getItem(
        "hasSeenMobileWarning"
      );

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

        {/* Open Graph Meta Tags */}
        <meta
          property="og:title"
          content="SpecLive - 전사 용어·정책 관리 SaaS"
        />
        <meta
          property="og:description"
          content="조직 내에서 사용하는 용어(Glossary)와 정책(Policy)을 구조화하여 한곳에서 관리하는 SaaS입니다."
        />
        <meta
          property="og:image"
          content="/images/onboarding/onboarding_1_ko_KR.png"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://speclive.vercel.app" />

        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="SpecLive - 전사 용어·정책 관리 SaaS"
        />
        <meta
          name="twitter:description"
          content="조직 내에서 사용하는 용어(Glossary)와 정책(Policy)을 구조화하여 한곳에서 관리하는 SaaS입니다."
        />
        <meta
          name="twitter:image"
          content="/images/onboarding/onboarding_1_ko_KR.png"
        />

        {/* Additional Meta Tags */}
        <meta
          name="description"
          content="조직 내에서 사용하는 용어(Glossary)와 정책(Policy)을 구조화하여 한곳에서 관리하는 SaaS입니다."
        />
        <meta
          name="keywords"
          content="용어관리, 정책관리, SaaS, 협업도구, 조직관리"
        />
        <meta name="author" content="SpecLive" />
      </head>
      <body className="font-pretendard">
        <div className="min-h-screen bg-background">{children}</div>
        <ErrorModal />
        <SuccessModal />
        <Toast />
        <MobileWarningModal
          isOpen={showMobileWarning}
          onClose={() => {
            setShowMobileWarning(false);
            // 세션 기반으로 모바일 경고를 봤다고 표시
            sessionStorage.setItem("hasSeenMobileWarning", "true");
          }}
        />
      </body>
    </html>
  );
}
