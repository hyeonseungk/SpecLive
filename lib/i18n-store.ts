import { create } from "zustand";

export type LangCode = "en" | "ko";
export type LocaleCode = "en-US" | "ko-KR";

const languageMap: Record<LangCode, LocaleCode> = {
  en: "en-US",
  ko: "ko-KR",
};

// 브라우저 언어를 기반으로 초기 언어 설정
function getInitialLanguage(): LangCode {
  // localStorage에서 저장된 전체 언어 설정 확인
  const storedGlobalLang = localStorage.getItem(
    "global_lang"
  ) as LangCode | null;
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

// 프로젝트별 언어 설정을 위한 함수
function getProjectLanguage(): LangCode {
  const stored = localStorage.getItem("lang") as LangCode | null;
  if (stored === "en" || stored === "ko") {
    return stored;
  }

  // 프로젝트별 설정이 없으면 전체 언어 설정 사용
  return getInitialLanguage();
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
  const initialLang = getProjectLanguage();

  return {
    lang: initialLang,
    locale: languageMap[initialLang],
    setLanguage: (code) => {
      localStorage.setItem("lang", code);
      document.documentElement.lang = code;
      set({ lang: code, locale: languageMap[code] });
    },
    globalLang: initialGlobalLang,
    setGlobalLanguage: (code) => {
      localStorage.setItem("global_lang", code);
      document.documentElement.lang = code;
      set({ globalLang: code });
    },
  };
});
