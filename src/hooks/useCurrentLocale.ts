"use client";

import { useEffect, useState } from "react";
import { defaultLocale, type Locale, locales } from "@/i18n/config";
import { LOCALE_CHANGE_EVENT } from "@/i18n/client";

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

    const handleLocaleChange = (event: Event) => {
      const customEvent = event as CustomEvent<Locale>;
      if (customEvent.detail && locales.includes(customEvent.detail)) {
        setLocale(customEvent.detail);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
      return () => {
        window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
      };
    }
    return undefined;
  }, []);

  return locale;
}
