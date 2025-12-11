"use client";

import React from "react";
import "./DashboardShell.css";

/**
 * DashboardShell Props
 */
export interface DashboardShellProps {
  /** Header section (e.g., PageHeader or OrgHeader) */
  header?: React.ReactNode;
  /** Key metrics section */
  metrics?: React.ReactNode;
  /** Quick actions section */
  quickActions?: React.ReactNode;
  /** Main content sections (bookings, clubs, admins, etc.) */
  children: React.ReactNode;
}

/**
 * DashboardShell Component
 * 
 * Layout wrapper for admin dashboard pages.
 * Provides a consistent grid layout structure for:
 * - Header (optional)
 * - Key metrics cards
 * - Quick actions panel
 * - Content sections (bookings overview, clubs, admins, activity feed)
 * 
 * This component handles the responsive layout and spacing,
 * allowing child components to focus on their specific functionality.
 * 
 * Uses im-* semantic classes for styling and maintains dark theme.
 */
export default function DashboardShell({
  header,
  metrics,
  quickActions,
  children,
}: DashboardShellProps) {
  return (
    <div className="im-dashboard-shell">
      {header && (
        <div className="im-dashboard-shell-header">
          {header}
        </div>
      )}
      
      <div className="im-dashboard-shell-content">
        {metrics && (
          <section className="im-dashboard-shell-metrics" aria-label="Dashboard metrics">
            {metrics}
          </section>
        )}
        
        {quickActions && (
          <aside className="im-dashboard-shell-quick-actions" aria-label="Quick actions">
            {quickActions}
          </aside>
        )}
        
        <div className="im-dashboard-shell-main">
          {children}
        </div>
      </div>
    </div>
  );
}
