"use client";

import type { Metadata } from "next";
import "./globals.css";
import { ErrorModal } from "@/components/common/error-modal";
import { SuccessModal } from "@/components/common/success-modal";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
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
