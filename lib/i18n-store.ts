import { create } from "zustand";

export type LangCode = "en-US" | "ko-KR";
export type LocaleCode = "en-US" | "ko-KR";

const languageMap: Record<LangCode, LocaleCode> = {
  "en-US": "en-US",
  "ko-KR": "ko-KR",
};

// 서버와 클라이언트에서 일관된 초기값 사용
function getInitialLanguage(): LangCode {
  // 서버 사이드에서는 기본값 반환
  if (typeof window === "undefined") {
    return "ko-KR";
  }

  // 클라이언트에서도 기본값으로 시작 (hydration 후에 실제 값으로 업데이트)
  return "ko-KR";
}

// 클라이언트에서 실제 언어 설정을 가져오는 함수
function getClientLanguage(): LangCode {
  if (typeof window === "undefined") {
    return "ko-KR";
  }

  // localStorage에서 저장된 언어 설정 확인
  const storedLang = localStorage.getItem("lang") as LangCode | null;
  if (storedLang === "en-US" || storedLang === "ko-KR") {
    return storedLang;
  }

  // 브라우저 언어 기반 추론
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith("ko")) {
    return "ko-KR";
  } else if (browserLang.startsWith("en")) {
    return "en-US";
  }

  // 기본값
  return "ko-KR";
}

interface LangState {
  lang: LangCode;
  locale: LocaleCode;
  isHydrated: boolean;
  setLanguage: (code: LangCode) => void;
  hydrateLanguage: () => void;
}

export const useLangStore = create<LangState>((set) => {
  const initialLang = getInitialLanguage();

  return {
    lang: initialLang,
    locale: languageMap[initialLang],
    isHydrated: false,
    setLanguage: (code) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("lang", code);
        document.documentElement.lang = code;
      }
      set({ lang: code, locale: languageMap[code] });
    },
    hydrateLanguage: () => {
      const clientLang = getClientLanguage();
      if (typeof window !== "undefined") {
        localStorage.setItem("lang", clientLang);
        document.documentElement.lang = clientLang;
      }
      set({
        lang: clientLang,
        locale: languageMap[clientLang],
        isHydrated: true,
      });
    },
  };
});
