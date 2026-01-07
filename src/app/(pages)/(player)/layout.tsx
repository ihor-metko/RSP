import PlayerMobileHeader from "@/components/layout/PlayerMobileHeader";
import { PlayerMobileFooter } from "@/components/layout/PlayerMobileFooter";

export default function PlayerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen overflow-auto">
      <PlayerMobileHeader />

      <div className="flex-1 w-7xl mx-auto w-full">
        {children}
      </div>

      <PlayerMobileFooter />
    </div>
  );
}
