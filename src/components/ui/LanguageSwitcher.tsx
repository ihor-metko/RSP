"use client";

import { useLocale } from "@/i18n/client";
import { locales, type Locale } from "@/i18n/config";
import { useTranslations } from "next-intl";
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

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocale(e.target.value as Locale);
  };

  return (
    <div className="rsp-language-switcher">
      <select
        value={currentLocale}
        onChange={handleChange}
        disabled={isPending}
        className="rsp-language-select"
        aria-label={t("language")}
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {languageFlags[locale]} {languageNames[locale]}
          </option>
        ))}
      </select>
    </div>
  );
}
