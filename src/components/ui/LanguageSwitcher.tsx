"use client";

import { useLocale } from "@/i18n/client";
import { locales, type Locale } from "@/i18n/config";
import { useTranslations } from "next-intl";
import { Select, type SelectOption } from "./Select";
import "./LanguageSwitcher.css";

const languageNames: Record<Locale, string> = {
  en: "English",
  uk: "Українська",
};

const languageFlags: Record<Locale, string> = {
  en: "🇬🇧",
  uk: "🇺🇦",
};

interface LanguageSwitcherProps {
  currentLocale: Locale;
}

export function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const { setLocale, isPending } = useLocale();
  const t = useTranslations("common");

  const handleChange = (value: string) => {
    setLocale(value as Locale);
  };

  const options: SelectOption[] = locales.map((locale) => ({
    value: locale,
    label: languageNames[locale],
    icon: <span className="im-language-flag">{languageFlags[locale]}</span>,
  }));

  return (
    <div className="im-language-switcher">
      <Select
        options={options}
        value={currentLocale}
        onChange={handleChange}
        disabled={isPending}
        aria-label={t("language")}
        placeholder={t("language")}
      />
    </div>
  );
}
