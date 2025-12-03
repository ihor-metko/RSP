"use client";

import { DashboardFooter, AdminSidebar } from "@/components/layout";
import Header from "@/components/layout/Header";

/**
 * Admin Pages Layout
 * Layout for admin-related pages with header, sidebar, and sticky footer structure.
 * The sidebar is role-based and renders dynamically based on user permissions.
 */
export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Sidebar - renders based on admin role */}
      <AdminSidebar hasHeader={true} />

      {/* Main content area with sidebar offset on large screens */}
      <div className="flex-1 overflow-auto flex flex-col lg:ml-60">
        {children}

        <DashboardFooter />
      </div>
    </div>
  );
}
