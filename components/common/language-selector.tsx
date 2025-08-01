"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useLangStore, LangCode } from "@/lib/i18n-store";
import { ChevronDown, Check } from "lucide-react";
import { useT } from "@/lib/i18n";

const LANGUAGES: { labelKey: string; lang: LangCode; locale: string }[] = [
  { labelKey: "lang.english", lang: "en", locale: "en-US" },
  { labelKey: "lang.korean", lang: "ko", locale: "ko-KR" },
];

export function LanguageSelector() {
  const { lang, setLanguage } = useLangStore();
  const t = useT();
  const current = LANGUAGES.find((l) => l.lang === lang) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-32 flex items-center justify-between"
        >
          <span>{t(current.labelKey)}</span>
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
              <span>{t(l.labelKey)}</span>
              {lang === l.lang && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
