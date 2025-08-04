import en from "@/locales/en.json";
import ko from "@/locales/ko.json";
import { useLangStore } from "./i18n-store";

// 더 유연한 타입 정의
type TranslationMap = Record<string, any>;

const resources: Record<string, TranslationMap> = {
  en,
  ko,
};

function getNested(obj: any, path: string[]): string | undefined {
  return path.reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

export function useT() {
  const { lang, globalLang } = useLangStore();
  
  // 프로젝트별 언어 설정이 있으면 그것을 사용, 없으면 전체 언어 설정 사용
  const currentLang = lang || globalLang;
  
  return (
    key: string,
    vars?: Record<string, string | number>
  ): string => {
    const parts = key.split(".");
    const res =
      getNested(resources[currentLang], parts) || getNested(resources["en"], parts);
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

// 전체 언어 설정용 훅 (프로젝트 진입 전 화면에서 사용)
export function useGlobalT() {
  const { globalLang } = useLangStore();
  
  return (
    key: string,
    vars?: Record<string, string | number>
  ): string => {
    const parts = key.split(".");
    const res =
      getNested(resources[globalLang], parts) || getNested(resources["en"], parts);
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
