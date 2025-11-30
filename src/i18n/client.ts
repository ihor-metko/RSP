"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "./config";

export function useLocale() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const setLocale = (locale: Locale) => {
    startTransition(() => {
      document.cookie = `locale=${locale};path=/;max-age=31536000`;
      router.refresh();
    });
  };

  return { setLocale, isPending };
}
