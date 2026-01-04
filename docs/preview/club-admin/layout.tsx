"use client";

import Header from "@/components/layout/Header";
import { PublicFooter } from "@/components/layout";

/**
 * Club Admin Preview Documentation Layout
 * Layout for club admin-focused interactive product showcase.
 * Provides a dark theme container with sidebar placeholder for navigation.
 */
export default function ClubAdminPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen im-bg-dark">
      <Header />
      
      <div className="flex flex-1">
        {/* Sidebar placeholder */}
        <aside className="w-64 im-bg-darker border-r im-border-subtle">
          {/* Sidebar content will be added later */}
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6">
            {children}
          </div>
        </main>
      </div>

      <PublicFooter />
    </div>
  );
}
