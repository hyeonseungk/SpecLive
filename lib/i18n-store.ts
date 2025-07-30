import { create } from 'zustand'

export type LangCode = 'en' | 'ko'
export type LocaleCode = 'en-US' | 'ko-KR'

const languageMap: Record<LangCode, LocaleCode> = {
  en: 'en-US',
  ko: 'ko-KR',
}

interface LangState {
  lang: LangCode
  locale: LocaleCode
  setLanguage: (code: LangCode) => void
}

export const useLangStore = create<LangState>((set) => {
  let initialLang: LangCode = 'ko'
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('lang') as LangCode | null
    if (stored === 'en' || stored === 'ko') {
      initialLang = stored
    }
    document.documentElement.lang = initialLang
  }

  return {
    lang: initialLang,
    locale: languageMap[initialLang],
    setLanguage: (code) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('lang', code)
        document.documentElement.lang = code
      }
      set({ lang: code, locale: languageMap[code] })
    },
  }
}) 