import PlayerMobileHeader from "@/components/layout/PlayerMobileHeader";
import { PlayerMobileFooter } from "@/components/layout/PlayerMobileFooter";
import { PlayerBottomNav } from "@/components/layout/PlayerBottomNav";

export default function PlayerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen overflow-auto">
      <PlayerMobileHeader />

      {/* Add bottom padding on mobile to prevent content from being hidden by bottom nav */}
      <div className="flex-1 w-7xl mx-auto w-full pb-14 md:pb-0">
        {children}
      </div>

      <PlayerMobileFooter />
      
      {/* Mobile-only sticky bottom navigation */}
      <PlayerBottomNav />
    </div>
  );
}
