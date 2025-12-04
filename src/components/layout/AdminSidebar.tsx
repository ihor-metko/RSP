"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { AdminStatusResponse } from "@/app/api/me/admin-status/route";
import "./AdminSidebar.css";

/**
 * Icon components for sidebar navigation
 * Uses consistent 18px sizing with color: var(--im-icon-color)
 *
 * ARIA: Icons are decorative (aria-hidden="true")
 */

function DashboardIcon() {
  return (
    <svg
      className="im-sidebar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ClubsIcon() {
  return (
    <svg
      className="im-sidebar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="im-sidebar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg
      className="im-sidebar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function BookingsIcon() {
  return (
    <svg
      className="im-sidebar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function NotificationsIcon() {
  return (
    <svg
      className="im-sidebar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      className="im-sidebar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="im-sidebar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronDownIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`im-sidebar-chevron ${isOpen ? "im-sidebar-chevron--open" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/**
 * Navigation item interface
 */
interface NavItem {
  id: string;
  href?: string;
  labelKey: string;
  icon: React.ReactNode;
  rootOnly?: boolean; // If true, only visible to root admins
  children?: NavItem[];
}

/**
 * Get navigation items for root admins
 * All items are visible to root admins
 */
function getNavItems(): NavItem[] {
  return [
    // Dashboard
    {
      id: "dashboard",
      href: "/admin/dashboard",
      labelKey: "sidebar.dashboard",
      icon: <DashboardIcon />,
    },
    // Platform Statistics - Root Admin only
    {
      id: "statistics",
      href: "/admin/dashboard",
      labelKey: "sidebar.statistics",
      icon: <StatsIcon />,
      rootOnly: true,
    },
    // Clubs Management
    {
      id: "clubs",
      href: "/admin/clubs",
      labelKey: "sidebar.clubs",
      icon: <ClubsIcon />,
    },
    // Bookings
    {
      id: "bookings",
      href: "/admin/bookings",
      labelKey: "sidebar.bookings",
      icon: <BookingsIcon />,
    },
    // Notifications
    {
      id: "notifications",
      href: "/admin/notifications",
      labelKey: "sidebar.notifications",
      icon: <NotificationsIcon />,
    },
    // Global Settings - Root Admin only
    {
      id: "settings",
      href: "/admin/settings",
      labelKey: "sidebar.settings",
      icon: <SettingsIcon />,
      rootOnly: true,
    },
  ];
}

/**
 * Filter navigation items based on isRoot status
 */
function filterNavByRoot(items: NavItem[], isRoot: boolean): NavItem[] {
  return items
    .filter((item) => !item.rootOnly || isRoot)
    .map((item) => ({
      ...item,
      children: item.children ? filterNavByRoot(item.children, isRoot) : undefined,
    }))
    .filter((item) => !item.children || item.children.length > 0);
}

/**
 * Get role display info for admins
 */
function getRoleInfo(adminStatus: AdminStatusResponse | null, t: ReturnType<typeof useTranslations>) {
  if (!adminStatus?.isAdmin) {
    return null;
  }

  if (adminStatus.adminType === "root_admin") {
    return {
      label: t("sidebar.roleRootAdmin"),
      className: "im-sidebar-role im-sidebar-role--root",
    };
  }
  
  if (adminStatus.adminType === "organization_admin") {
    return {
      label: t("sidebar.roleSuperAdmin"),
      className: "im-sidebar-role im-sidebar-role--super",
    };
  }
  
  if (adminStatus.adminType === "club_admin") {
    return {
      label: t("sidebar.roleAdmin"),
      className: "im-sidebar-role im-sidebar-role--admin",
    };
  }
  
  return null;
}

export interface AdminSidebarProps {
  /** Whether sidebar has a header offset */
  hasHeader?: boolean;
}

/**
 * AdminSidebar Component
 *
 * Role-based sidebar navigation for admin dashboards.
 * Renders navigation items dynamically based on user role.
 *
 * Roles:
 * - Root Admin: Full platform access, manage super admins, global settings
 * - Super Admin (Organization Admin): Manage clubs they own, manage regular admins
 * - Admin (Club Admin): Manage assigned club, bookings, club statistics
 *
 * ACCESSIBILITY:
 * - Keyboard navigation with Tab, Enter, Escape
 * - aria-expanded for expandable sections
 * - role="navigation" for the sidebar
 * - Focus visible states
 */
export default function AdminSidebar({ hasHeader = true }: AdminSidebarProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const t = useTranslations();
  const sidebarRef = useRef<HTMLElement>(null);

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [adminStatus, setAdminStatus] = useState<AdminStatusResponse | null>(null);
  const [isLoadingAdminStatus, setIsLoadingAdminStatus] = useState(true);

  const isRoot = session?.user?.isRoot ?? false;

  // Fetch admin status when session is available
  useEffect(() => {
    const fetchAdminStatus = async () => {
      if (status === "loading") return;
      
      if (!session?.user) {
        setAdminStatus(null);
        setIsLoadingAdminStatus(false);
        return;
      }

      // If user is root, we already know they're an admin
      if (isRoot) {
        setAdminStatus({
          isAdmin: true,
          adminType: "root_admin",
          isRoot: true,
          managedIds: [],
        });
        setIsLoadingAdminStatus(false);
        return;
      }

      try {
        const response = await fetch("/api/me/admin-status");
        if (response.ok) {
          const data: AdminStatusResponse = await response.json();
          setAdminStatus(data);
        } else {
          setAdminStatus(null);
        }
      } catch {
        setAdminStatus(null);
      } finally {
        setIsLoadingAdminStatus(false);
      }
    };

    fetchAdminStatus();
  }, [session, status, isRoot]);

  // Get filtered navigation items based on isRoot status
  const navItems = useMemo(() => {
    const allItems = getNavItems();
    return filterNavByRoot(allItems, isRoot);
  }, [isRoot]);

  // Close sidebar when clicking outside on mobile
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        isMobileOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        const toggleButton = document.querySelector(".im-sidebar-toggle");
        if (toggleButton && !toggleButton.contains(event.target as Node)) {
          setIsMobileOpen(false);
        }
      }
    },
    [isMobileOpen]
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape" && isMobileOpen) {
        setIsMobileOpen(false);
      }
    },
    [isMobileOpen]
  );

  // Toggle expandable section
  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  // Check if a link is active
  const isActive = useCallback(
    (href: string | undefined) => {
      if (!href) return false;
      // Exact match or starts with (for nested routes)
      return pathname === href || pathname.startsWith(href + "/");
    },
    [pathname]
  );

  // Get translated label
  const getLabel = useCallback(
    (labelKey: string): string => {
      const label = t(labelKey);
      // If translation returns the key itself, extract last segment as fallback
      if (label === labelKey) {
        return labelKey.split(".").pop() || "";
      }
      return label;
    },
    [t]
  );

  const roleInfo = getRoleInfo(adminStatus, t);

  // Don't render while loading admin status
  if (isLoadingAdminStatus) {
    return null;
  }

  // Don't render for non-admin users
  if (!adminStatus?.isAdmin) {
    return null;
  }

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="im-sidebar-toggle"
        onClick={() => setIsMobileOpen((prev) => !prev)}
        aria-expanded={isMobileOpen}
        aria-controls="admin-sidebar"
        aria-label={isMobileOpen ? t("common.close") : t("sidebar.openMenu")}
      >
        {isMobileOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="im-sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        id="admin-sidebar"
        className={`im-sidebar ${hasHeader ? "im-sidebar--with-header" : ""} ${
          isMobileOpen ? "im-sidebar--open" : ""
        }`}
        role="navigation"
        aria-label={t("sidebar.navigation")}
        onKeyDown={handleKeyDown}
      >
        {/* Sidebar header */}
        <div className="im-sidebar-header">
          <div className="im-sidebar-logo" aria-hidden="true">
            A
          </div>
          <div>
            <div className="im-sidebar-title">{t("sidebar.title")}</div>
            {roleInfo && (
              <span className={roleInfo.className}>{roleInfo.label}</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="im-sidebar-nav" aria-label={t("sidebar.mainNavigation")}>
          <ul className="im-sidebar-nav-list" role="menubar">
            {navItems.map((item) => (
              <li key={item.id} className="im-sidebar-nav-item" role="none">
                {item.children && item.children.length > 0 ? (
                  // Expandable section
                  <>
                    <button
                      className="im-sidebar-expand-btn"
                      onClick={() => toggleSection(item.id)}
                      aria-expanded={expandedSections[item.id] || false}
                      aria-controls={`nav-section-${item.id}`}
                    >
                      {item.icon}
                      <span>{getLabel(item.labelKey)}</span>
                      <ChevronDownIcon isOpen={expandedSections[item.id] || false} />
                    </button>
                    {expandedSections[item.id] && (
                      <ul
                        id={`nav-section-${item.id}`}
                        className="im-sidebar-nav-list im-sidebar-nav-nested"
                        role="menu"
                      >
                        {item.children.map((child) => (
                          <li key={child.id} className="im-sidebar-nav-item" role="none">
                            <Link
                              href={child.href || "#"}
                              className={`im-sidebar-nav-link ${
                                isActive(child.href) ? "im-sidebar-nav-link--active" : ""
                              }`}
                              role="menuitem"
                              aria-current={isActive(child.href) ? "page" : undefined}
                              onClick={() => setIsMobileOpen(false)}
                            >
                              {child.icon}
                              <span>{getLabel(child.labelKey)}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  // Regular link
                  <Link
                    href={item.href || "#"}
                    className={`im-sidebar-nav-link ${
                      isActive(item.href) ? "im-sidebar-nav-link--active" : ""
                    }`}
                    role="menuitem"
                    aria-current={isActive(item.href) ? "page" : undefined}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    {item.icon}
                    <span>{getLabel(item.labelKey)}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="im-sidebar-footer">
          <p className="im-sidebar-version">v0.1.0</p>
        </div>
      </aside>
    </>
  );
}
