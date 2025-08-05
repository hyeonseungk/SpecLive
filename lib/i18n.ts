import en from "@/locales/en.json";
import ko from "@/locales/ko.json";
import { useLangStore } from "./i18n-store";
import { useEffect, useState } from "react";

// 더 유연한 타입 정의
type TranslationMap = Record<string, any>;

const resources: Record<string, TranslationMap> = {
  "en-US": en,
  "ko-KR": ko,
};

function getNested(obj: any, path: string[]): string | undefined {
  return path.reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

// 전역 언어 설정용 훅
export function useGlobalT() {
  const { lang } = useLangStore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (key: string, vars?: Record<string, string | number>): string => {
    const parts = key.split(".");
    
    // 서버 사이드에서는 항상 한국어 사용
    const currentLang = isClient ? lang : "ko-KR";
    
    const res =
      getNested(resources[currentLang], parts) || getNested(resources["ko-KR"], parts);
    let str = typeof res === "string" ? res : key;
    if (vars && typeof str === "string") {
      for (const [varKey, value] of Object.entries(vars)) {
        str = str.replace(
          new RegExp(`\\{\\{${varKey}\\}}`, "g"),
          String(value)
        );
      }
    }
    return str;
  };
}

// 언어 hydration을 처리하는 훅
export function useLanguageHydration() {
  const { isHydrated, hydrateLanguage } = useLangStore();

  useEffect(() => {
    if (!isHydrated) {
      hydrateLanguage();
    }
  }, [isHydrated, hydrateLanguage]);

  return isHydrated;
}
