import { create } from "zustand";

export type LangCode = "en" | "ko";
export type LocaleCode = "en-US" | "ko-KR";

const languageMap: Record<LangCode, LocaleCode> = {
  en: "en-US",
  ko: "ko-KR",
};

// 브라우저 언어를 기반으로 초기 언어 설정
function getInitialLanguage(): LangCode {
  // 서버 사이드에서는 기본값 반환
  if (typeof window === "undefined") {
    return "ko";
  }

  // localStorage에서 저장된 언어 설정 확인
  const storedLang = localStorage.getItem("lang") as LangCode | null;
  if (storedLang === "en" || storedLang === "ko") {
    return storedLang;
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
}

export const useLangStore = create<LangState>((set) => {
  const initialLang = getInitialLanguage();

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
  };
});
