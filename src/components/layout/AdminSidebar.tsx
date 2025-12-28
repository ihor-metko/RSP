"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useUserStore } from "@/stores/useUserStore";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import type { AdminStatus } from "@/app/api/me/route";
import "./AdminSidebar.css";

const SIDEBAR_COLLAPSED_KEY = "admin-sidebar-collapsed";

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

function CollapseIcon({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <svg
      className={`im-sidebar-collapse-icon ${isCollapsed ? "im-sidebar-collapse-icon--collapsed" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
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
  /** Dynamic label that overrides labelKey translation */
  dynamicLabel?: string;
  icon: React.ReactNode;
  rootOnly?: boolean; // If true, only visible to root admins
  /** If true, hidden for club admins (they get a direct link to their club instead) */
  hideForClubAdmin?: boolean;
  children?: NavItem[];
  /** If true, the nav item is disabled (not clickable) */
  disabled?: boolean;
  /** Optional badge to display next to the nav item */
  badge?: string;
}

function OrganizationsIcon() {
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
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function UsersIcon() {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CourtsIcon() {
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
      {/* Padel/tennis court representation */}
      <rect x="2" y="4" width="20" height="16" rx="1" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function OperationsIcon() {
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
      {/* Calendar with activity/operations representation */}
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <circle cx="8" cy="14" r="1.5" />
      <circle cx="12" cy="14" r="1.5" />
      <circle cx="16" cy="14" r="1.5" />
      <circle cx="8" cy="18" r="1.5" />
      <circle cx="12" cy="18" r="1.5" />
    </svg>
  );
}

function PaymentAccountsIcon() {
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
      {/* Credit card/payment representation */}
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="6" y1="15" x2="6.01" y2="15" />
      <line x1="10" y1="15" x2="14" y2="15" />
    </svg>
  );
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
    // Operations - Visible for all admin types
    {
      id: "operations",
      href: "/admin/operations",
      labelKey: "sidebar.operations",
      icon: <OperationsIcon />,
    },
    // Bookings
    {
      id: "bookings",
      href: "/admin/bookings",
      labelKey: "sidebar.bookings",
      icon: <BookingsIcon />,
    },
    // Courts Management - Visible for all admin types
    {
      id: "courts",
      href: "/admin/courts",
      labelKey: "sidebar.courts",
      icon: <CourtsIcon />,
    },
    // Clubs Management - Hidden for ClubAdmin (they get direct link to their club)
    {
      id: "clubs",
      href: "/admin/clubs",
      labelKey: "sidebar.clubs",
      icon: <ClubsIcon />,
      hideForClubAdmin: true,
    },
    // Organizations - Root Admin only
    {
      id: "organizations",
      href: "/admin/organizations",
      labelKey: "sidebar.organizations",
      icon: <OrganizationsIcon />,
      rootOnly: true,
    },
    // Users Management - Root Admin only
    {
      id: "users",
      href: "/admin/users",
      labelKey: "sidebar.users",
      icon: <UsersIcon />,
    },
    // Notifications
    {
      id: "notifications",
      href: "/admin/notifications",
      labelKey: "sidebar.notifications",
      icon: <NotificationsIcon />,
    },
    // Analytics
    {
      id: "analytics",
      href: "/admin/analytics",
      labelKey: "sidebar.analytics",
      icon: <StatsIcon />,
      disabled: true,
      badge: "sidebar.comingSoon",
    },
    // Global Settings - Root Admin only
    {
      id: "settings",
      href: "/admin/settings",
      labelKey: "sidebar.settings",
      icon: <SettingsIcon />,
      rootOnly: true,
    },
    {
      id: "sport-config",
      href: "/admin/sport-config",
      labelKey: "sidebar.sportConfig",
      icon: <SettingsIcon />,
      rootOnly: true,
    },
  ];
}

/**
 * Filter navigation items based on isRoot status and admin type
 */
function filterNavByRoot(items: NavItem[], isRoot: boolean, isClubAdmin: boolean = false): NavItem[] {
  return items
    .filter((item) => {
      // Filter out root-only items for non-root users
      if (item.rootOnly && !isRoot) return false;
      // Filter out items hidden for club admins
      if (item.hideForClubAdmin && isClubAdmin) return false;
      return true;
    })
    .map((item) => ({
      ...item,
      children: item.children ? filterNavByRoot(item.children, isRoot, isClubAdmin) : undefined,
    }))
    .filter((item) => !item.children || item.children.length > 0);
}

/**
 * Role display info interface
 */
interface RoleInfo {
  label: string;
  className: string;
  tooltip?: string;
}

/**
 * Get role display info for admins
 */
function getRoleInfo(adminStatus: AdminStatus | null, t: ReturnType<typeof useTranslations>): RoleInfo | null {
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
    // Show "Owner" for primary owners, "Super Admin" for regular org admins
    if (adminStatus.isPrimaryOwner) {
      return {
        label: t("sidebar.roleOwner"),
        className: "im-sidebar-role im-sidebar-role--owner",
        tooltip: t("sidebar.roleOwnerTooltip"),
      };
    }
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
  /** Callback when collapsed state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
}

/**
 * AdminSidebar Component
 *
 * Role-based sidebar navigation for admin dashboards.
 * Renders navigation items dynamically based on user role.
 * Supports collapsible mode for better space utilization.
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
 * - aria-label on collapse toggle button
 */
export default function AdminSidebar({ hasHeader = true, onCollapsedChange }: AdminSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations();
  const sidebarRef = useRef<HTMLElement>(null);

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Get admin status from store
  const adminStatus = useUserStore(state => state.adminStatus);
  const user = useUserStore(state => state.user);
  const isLoading = useUserStore(state => state.isLoading);

  const isRoot = user?.isRoot ?? false;

  // Get organization data from store for organization admins
  const fetchOrganizationById = useOrganizationStore(state => state.fetchOrganizationById);
  const currentOrg = useOrganizationStore(state => state.currentOrg);
  const orgLoading = useOrganizationStore(state => state.loading);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (savedState !== null) {
        const collapsed = savedState === "true";
        setIsCollapsed(collapsed);
        onCollapsedChange?.(collapsed);
      }
    }
  }, [onCollapsedChange]);

  // Toggle collapsed state
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const newState = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState));
      }
      onCollapsedChange?.(newState);
      return newState;
    });
  }, [onCollapsedChange]);

  // Admin status is now loaded from the store via UserStoreInitializer
  // No need to fetch it separately here

  // Check if user is a club admin or organization admin
  const isClubAdmin = adminStatus?.adminType === "club_admin";
  const isOrgAdmin = adminStatus?.adminType === "organization_admin";

  // Fetch organization data for organization admins
  // Note: Currently assumes organization admins manage only one organization
  // by taking the first ID from managedIds. For multiple organizations,
  // this could be enhanced to show a dropdown or aggregate information.
  useEffect(() => {
    if (isOrgAdmin && adminStatus?.managedIds && adminStatus.managedIds.length > 0) {
      const orgId = adminStatus.managedIds[0];
      // Only fetch if we don't have the org data yet
      if (!currentOrg || currentOrg.id !== orgId) {
        fetchOrganizationById(orgId).catch((error) => {
          console.error(`Failed to fetch organization ${orgId}:`, error);
          // Note: On error, the contextName will fall back to "Admin Panel"
          // which provides a graceful degradation for the user
        });
      }
    }
  }, [isOrgAdmin, adminStatus, currentOrg, fetchOrganizationById]);

  // Get filtered navigation items based on isRoot status and admin type
  const navItems = useMemo(() => {
    const allItems = getNavItems();
    let filteredItems = filterNavByRoot(allItems, isRoot, isClubAdmin);

    // For OrganizationAdmin (SuperAdmin), insert a direct link to their organization after Dashboard
    // Only show if they have exactly one organization (single org scenario)
    // For multiple orgs, could link to /admin/organizations filtered to their orgs (future enhancement)
    if (isOrgAdmin && adminStatus?.managedIds && adminStatus.managedIds.length === 1) {
      const orgId = adminStatus.managedIds[0];
      const orgLink: NavItem = {
        id: "my-organization",
        href: `/admin/organizations/${orgId}`,
        labelKey: "sidebar.organization",
        // Display organization name when available; when undefined, getLabel falls back to labelKey translation
        dynamicLabel: currentOrg?.name,
        icon: <OrganizationsIcon />,
      };

      // Insert after dashboard
      const dashboardIndex = filteredItems.findIndex(item => item.id === "dashboard");
      if (dashboardIndex >= 0) {
        filteredItems = [
          ...filteredItems.slice(0, dashboardIndex + 1),
          orgLink,
          ...filteredItems.slice(dashboardIndex + 1),
        ];
      } else {
        filteredItems = [orgLink, ...filteredItems];
      }
    }

    // For ClubAdmin, insert a direct link to their assigned club after Dashboard
    if (isClubAdmin && adminStatus?.assignedClub) {
      const clubLink: NavItem = {
        id: "assigned-club",
        href: `/admin/clubs/${adminStatus.assignedClub.id}`,
        labelKey: "sidebar.clubs", // fallback
        dynamicLabel: adminStatus.assignedClub.name,
        icon: <ClubsIcon />,
      };

      // Insert after dashboard (index 0)
      const dashboardIndex = filteredItems.findIndex(item => item.id === "dashboard");
      if (dashboardIndex >= 0) {
        filteredItems = [
          ...filteredItems.slice(0, dashboardIndex + 1),
          clubLink,
          ...filteredItems.slice(dashboardIndex + 1),
        ];
      } else {
        filteredItems = [clubLink, ...filteredItems];
      }
    }

    // For Organization Owner (primary owner), add unified Payment Accounts link
    if (isOrgAdmin && adminStatus?.isPrimaryOwner && adminStatus?.managedIds && adminStatus.managedIds.length === 1) {
      const paymentAccountsLink: NavItem = {
        id: "payment-accounts",
        href: `/admin/payment-accounts`,
        labelKey: "sidebar.paymentAccounts",
        icon: <PaymentAccountsIcon />,
      };

      // Insert after organization link or after dashboard
      const orgIndex = filteredItems.findIndex(item => item.id === "users");
      if (orgIndex >= 0) {
        filteredItems = [
          ...filteredItems.slice(0, orgIndex),
          paymentAccountsLink,
          ...filteredItems.slice(orgIndex),
        ];
      } else {
        const dashboardIndex = filteredItems.findIndex(item => item.id === "dashboard");
        if (dashboardIndex >= 0) {
          filteredItems = [
            ...filteredItems.slice(0, dashboardIndex + 1),
            paymentAccountsLink,
            ...filteredItems.slice(dashboardIndex + 1),
          ];
        } else {
          filteredItems = [paymentAccountsLink, ...filteredItems];
        }
      }
    }

    // For Club Admins, add unified Payment Accounts link
    if (isClubAdmin && adminStatus?.assignedClub) {
      const paymentAccountsLink: NavItem = {
        id: "payment-accounts",
        href: `/admin/payment-accounts`,
        labelKey: "sidebar.paymentAccounts",
        icon: <PaymentAccountsIcon />,
      };

      // Insert after club link
      const clubIndex = filteredItems.findIndex(item => item.id === "users");
      if (clubIndex >= 0) {
        filteredItems = [
          ...filteredItems.slice(0, clubIndex + 1),
          paymentAccountsLink,
          ...filteredItems.slice(clubIndex + 1),
        ];
      }
    }

    return filteredItems;
  }, [isRoot, isClubAdmin, isOrgAdmin, adminStatus?.assignedClub, adminStatus?.managedIds, adminStatus?.isPrimaryOwner, currentOrg?.name]);

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

  // Get translated label or use dynamic label
  const getLabel = useCallback(
    (labelKey: string, dynamicLabel?: string): string => {
      // Use dynamic label if provided
      if (dynamicLabel) {
        return dynamicLabel;
      }
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

  // Compute the context name to display in the sidebar header
  const contextName = useMemo(() => {
    // For Root Admin, show generic "Admin Panel"
    if (isRoot) {
      return t("sidebar.title");
    }

    // For Organization Admin, show organization name or loading state
    if (isOrgAdmin) {
      if (orgLoading && !currentOrg) {
        return t("sidebar.title"); // Show generic title while loading
      }
      if (currentOrg?.name) {
        return currentOrg.name;
      }
      // If we have an org ID but no name yet, show generic title
      return t("sidebar.title");
    }

    // For Club Admin, show club name
    if (isClubAdmin && adminStatus?.assignedClub?.name) {
      return adminStatus.assignedClub.name;
    }

    // Fallback to generic title
    return t("sidebar.title");
  }, [isRoot, isOrgAdmin, isClubAdmin, currentOrg, orgLoading, adminStatus, t]);

  // Don't render while loading user data
  if (isLoading) {
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
        className={`im-sidebar ${hasHeader ? "im-sidebar--with-header" : ""} ${isMobileOpen ? "im-sidebar--open" : ""} ${isCollapsed ? "im-sidebar--collapsed" : ""}`}
        role="navigation"
        aria-label={t("sidebar.navigation")}
        onKeyDown={handleKeyDown}
      >
        {/* Sidebar header */}
        <div className="im-sidebar-header">
          <div className="im-sidebar-logo" aria-hidden="true">
            A
          </div>
          {!isCollapsed && (
            <div className="im-sidebar-header-text">
              <div className="im-sidebar-title">{contextName}</div>
              {roleInfo && (
                <span
                  className={roleInfo.className}
                  title={'tooltip' in roleInfo ? roleInfo.tooltip : undefined}
                  aria-label={'tooltip' in roleInfo ? roleInfo.tooltip : roleInfo.label}
                >
                  {roleInfo.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="im-sidebar-nav" aria-label={t("sidebar.mainNavigation")}>
          <ul className="im-sidebar-nav-list" role="menubar">
            {navItems.map((item) => (
              <li key={item.id} className="im-sidebar-nav-item" role="none">
                {item.children && item.children.length > 0 && !isCollapsed ? (
                  // Expandable section (only when not collapsed)
                  <>
                    <button
                      className="im-sidebar-expand-btn"
                      onClick={() => toggleSection(item.id)}
                      aria-expanded={expandedSections[item.id] || false}
                      aria-controls={`nav-section-${item.id}`}
                    >
                      {item.icon}
                      <span>{getLabel(item.labelKey, item.dynamicLabel)}</span>
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
                              className={`im-sidebar-nav-link ${isActive(child.href) ? "im-sidebar-nav-link--active" : ""
                                }`}
                              role="menuitem"
                              aria-current={isActive(child.href) ? "page" : undefined}
                              onClick={() => setIsMobileOpen(false)}
                            >
                              {child.icon}
                              <span>{getLabel(child.labelKey, child.dynamicLabel)}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : item.disabled ? (
                  // Disabled link (not clickable)
                  <div
                    className={`im-sidebar-nav-link im-sidebar-nav-link--disabled`}
                    role="menuitem"
                    aria-disabled="true"
                    title={isCollapsed ? getLabel(item.labelKey, item.dynamicLabel) : undefined}
                  >
                    {item.icon}
                    {!isCollapsed && (
                      <>
                        <span>{getLabel(item.labelKey, item.dynamicLabel)}</span>
                        {item.badge && (
                          <span className="im-sidebar-badge im-sidebar-badge--coming-soon">
                            {getLabel(item.badge)}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  // Regular link (or collapsed mode for expandable items)
                  <Link
                    href={item.href || "#"}
                    className={`im-sidebar-nav-link ${isActive(item.href) ? "im-sidebar-nav-link--active" : ""}`}
                    role="menuitem"
                    aria-current={isActive(item.href) ? "page" : undefined}
                    onClick={() => setIsMobileOpen(false)}
                    title={isCollapsed ? getLabel(item.labelKey, item.dynamicLabel) : undefined}
                  >
                    {item.icon}
                    {!isCollapsed && <span>{getLabel(item.labelKey, item.dynamicLabel)}</span>}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          {/* Message for ClubAdmin without assigned club */}
          {isClubAdmin && !adminStatus?.assignedClub && !isCollapsed && (
            <div className="im-sidebar-no-club-message" role="alert">
              <p>{t("sidebar.noClubAssigned")}</p>
            </div>
          )}
        </nav>

        {/* Footer with collapse toggle */}
        <div className="im-sidebar-footer">
          <button
            className="im-sidebar-collapse-btn"
            onClick={toggleCollapsed}
            aria-expanded={!isCollapsed}
            aria-controls="admin-sidebar"
            aria-label={isCollapsed ? t("sidebar.expandSidebar") : t("sidebar.collapseSidebar")}
            title={isCollapsed ? t("sidebar.expandSidebar") : t("sidebar.collapseSidebar")}
          >
            <CollapseIcon isCollapsed={isCollapsed} />
            {!isCollapsed && <span>{t("sidebar.collapse")}</span>}
          </button>
          {!isCollapsed && <p className="im-sidebar-version">v0.1.0</p>}
        </div>
      </aside>
    </>
  );
}
