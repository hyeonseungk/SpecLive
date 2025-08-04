"use client";

import { ErrorModal } from "@/components/common/error-modal";
import { SuccessModal } from "@/components/common/success-modal";
import { useLangStore } from "@/lib/i18n-store";
import { useEffect } from "react";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { globalLang } = useLangStore();

  useEffect(() => {
    // 전체 언어 설정에 따라 HTML lang 속성 설정
    document.documentElement.lang = globalLang;
  }, [globalLang]);

  return (
    <html lang={globalLang}>
      <head>
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
      </body>
    </html>
  );
}
