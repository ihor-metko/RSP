import { Metadata } from "next";
import Header from "@/components/layout/Header";
import { PublicFooter } from "@/components/layout";
import "./layout.css";

export const metadata: Metadata = {
  title: "ArenaOne for Clubs – Documentation",
  description: "Documentation for club owners and organizations",
};

export default function DocsForClubsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="im-docs-layout">
      <Header />
      <main className="im-docs-content">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
