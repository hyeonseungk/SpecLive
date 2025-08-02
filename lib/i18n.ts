import en from "@/locales/en.json";
import ko from "@/locales/ko.json";
import { useLangStore } from "./i18n-store";

type TranslationMap = typeof en;

const resources: Record<string, TranslationMap> = {
  en,
  ko,
};

function getNested(obj: any, path: string[]): string | undefined {
  return path.reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

export function useT() {
  const { lang } = useLangStore();
  return (
    key: keyof TranslationMap | string,
    vars?: Record<string, string | number>
  ): string => {
    const parts = key.split(".");
    const res =
      getNested(resources[lang], parts) || getNested(resources["en"], parts);
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
