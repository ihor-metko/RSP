import { cookies } from "next/headers";
import { locales, defaultLocale, type Locale } from "./config";

export async function getCurrentLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  return locales.includes(localeCookie as Locale)
    ? (localeCookie as Locale)
    : defaultLocale;
}
