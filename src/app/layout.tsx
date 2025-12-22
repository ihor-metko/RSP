import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ClubProvider } from "@/contexts/ClubContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { GlobalSocketListener } from "@/components/GlobalSocketListener";
import { NotificationStoreInitializer } from "@/components/NotificationStoreInitializer";
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
            <ClubProvider>
              <SocketProvider>
                <GlobalSocketListener />
                <NotificationStoreInitializer />
                {children}
              </SocketProvider>
            </ClubProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
