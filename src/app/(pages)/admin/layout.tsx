"use client";

import Header from "@/components/layout/Header";

/**
 * Admin Pages Layout
 * Layout for admin-related pages with header and sticky footer structure.
 */
export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
