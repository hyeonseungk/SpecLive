'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useLangStore, LangCode } from '@/lib/i18n-store'
import { ChevronDown, Check } from 'lucide-react'

const LANGUAGES: { label: string; lang: LangCode; locale: string }[] = [
  { label: 'English', lang: 'en', locale: 'en-US' },
  { label: '한국어', lang: 'ko', locale: 'ko-KR' },
]

export function LanguageSelector() {
  const { lang, setLanguage } = useLangStore()
  const current = LANGUAGES.find((l) => l.lang === lang) ?? LANGUAGES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-32 flex items-center justify-between">
          <span>{current.label}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={lang}
          onValueChange={(val) => setLanguage(val as LangCode)}
        >
          {LANGUAGES.map((l) => (
            <DropdownMenuItem
              key={l.lang}
              onSelect={() => setLanguage(l.lang)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span>{l.label}</span>
              {lang === l.lang && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 