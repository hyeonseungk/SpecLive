import { create } from "zustand";

export type LangCode = "en" | "ko";
export type LocaleCode = "en-US" | "ko-KR";

const languageMap: Record<LangCode, LocaleCode> = {
  en: "en-US",
  ko: "ko-KR",
};

// 브라우저 언어를 기반으로 초기 언어 설정
function getInitialLanguage(): LangCode {
  if (typeof window === "undefined") return "ko";
  
  // localStorage에서 저장된 전체 언어 설정 확인
  const storedGlobalLang = localStorage.getItem("global_lang") as LangCode | null;
  if (storedGlobalLang === "en" || storedGlobalLang === "ko") {
    return storedGlobalLang;
  }
  
  // 브라우저 언어 기반 추론
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith("ko")) {
    return "ko";
  } else if (browserLang.startsWith("en")) {
    return "en";
  }
  
  // 기본값
  return "ko";
}

interface LangState {
  lang: LangCode;
  locale: LocaleCode;
  setLanguage: (code: LangCode) => void;
  // 전체 언어 설정 (프로젝트 진입 전 화면용)
  globalLang: LangCode;
  setGlobalLanguage: (code: LangCode) => void;
}

export const useLangStore = create<LangState>((set) => {
  const initialGlobalLang = getInitialLanguage();
  let initialLang: LangCode = "ko";
  
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("lang") as LangCode | null;
    if (stored === "en" || stored === "ko") {
      initialLang = stored;
    }
    document.documentElement.lang = initialLang;
  }

  return {
    lang: initialLang,
    locale: languageMap[initialLang],
    setLanguage: (code) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("lang", code);
        document.documentElement.lang = code;
      }
      set({ lang: code, locale: languageMap[code] });
    },
    globalLang: initialGlobalLang,
    setGlobalLanguage: (code) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("global_lang", code);
        document.documentElement.lang = code;
      }
      set({ globalLang: code });
    },
  };
});
