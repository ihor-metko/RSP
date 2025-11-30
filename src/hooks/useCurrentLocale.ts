"use client";

import { useEffect, useState } from "react";
import { defaultLocale, type Locale, locales } from "@/i18n/config";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }
  return undefined;
}

export function useCurrentLocale(): Locale {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const cookieLocale = getCookie("locale");
    if (cookieLocale && locales.includes(cookieLocale as Locale)) {
      setLocale(cookieLocale as Locale);
    }
  }, []);

  return locale;
}
