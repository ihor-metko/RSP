import Header from "@/components/layout/Header";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function PlayerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen overflow-auto">
      <Header />

      <div className="flex-1 w-7xl mx-auto">
        {children}
      </div>

      <PublicFooter />
    </div>
  );
}
