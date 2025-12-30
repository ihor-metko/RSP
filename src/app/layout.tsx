import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ClubProvider } from "@/contexts/ClubContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { BookingSocketProvider } from "@/contexts/BookingSocketContext";
import { GlobalSocketListener } from "@/components/GlobalSocketListener";
import { NotificationStoreInitializer } from "@/components/NotificationStoreInitializer";
import { PagePreserveProvider } from "@/components/PagePreserveProvider";

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
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <PagePreserveProvider>
              <ClubProvider>
                <SocketProvider>
                  <BookingSocketProvider>
                    <GlobalSocketListener />
                    <NotificationStoreInitializer />
                    {children}
                  </BookingSocketProvider>
                </SocketProvider>
              </ClubProvider>
            </PagePreserveProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
