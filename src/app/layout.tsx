import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { SocketProvider } from "@/contexts/SocketContext";
import { GlobalSocketListener } from "@/components/GlobalSocketListener";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { MockModeWarning } from "@/components/MockModeWarning";

export const metadata: Metadata = {
  title: "ArenaOne",
  description: "ArenaOne booking platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark">
      <body className="antialiased min-h-screen flex flex-col">
        <MockModeWarning />
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <SocketProvider>
              <GlobalSocketListener />
              {children}
            </SocketProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
