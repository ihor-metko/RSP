"use client";

import { useState, useEffect } from "react";
import { DashboardFooter, AdminSidebar } from "@/components/layout";
import Header from "@/components/layout/Header";
import "./layout.css";

const SIDEBAR_COLLAPSED_KEY = "admin-sidebar-collapsed";

/**
 * Admin Pages Layout
 * Layout for admin-related pages with header, sidebar, and sticky footer structure.
 * The sidebar is role-based and renders dynamically based on user permissions.
 * Supports collapsible sidebar for better space utilization on small screens.
 */
export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Initialize collapsed state from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (savedState !== null) {
        setIsCollapsed(savedState === "true");
      }
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Sidebar - renders based on admin role */}
      <AdminSidebar hasHeader={true} onCollapsedChange={setIsCollapsed} />

      {/* Main content area with sidebar offset and max-width constraint */}
      <div 
        className={`flex-1 overflow-auto flex flex-col w-full transition-[padding-left] duration-300 ease-in-out ${
          isCollapsed ? "lg:pl-16" : "lg:pl-60"
        }`}
      >
        <div className="im-admin-content-wrapper">
          {children}

          <DashboardFooter />
        </div>
      </div>
    </div>
  );
}
