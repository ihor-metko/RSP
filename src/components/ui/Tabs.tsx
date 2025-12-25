"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import "./Tabs.css";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  onTabChange?: (id: string) => boolean | Promise<boolean>;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tab components must be used within a Tabs component");
  }
  return context;
}

export interface TabsProps {
  defaultTab: string;
  onTabChange?: (id: string) => boolean | Promise<boolean>;
  children: ReactNode;
  className?: string;
}

export function Tabs({ defaultTab, onTabChange, children, className = "" }: TabsProps) {
  const [activeTab, setActiveTabInternal] = useState(defaultTab);

  const setActiveTab = useCallback(async (id: string) => {
    if (onTabChange) {
      const canChange = await onTabChange(id);
      if (!canChange) return;
    }
    setActiveTabInternal(id);
  }, [onTabChange]);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, onTabChange }}>
      <div className={`im-tabs ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabListProps {
  children: ReactNode;
  className?: string;
}

export function TabList({ children, className = "" }: TabListProps) {
  return (
    <div className={`im-tab-list ${className}`} role="tablist">
      {children}
    </div>
  );
}

export interface TabProps {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Tab({ id, label, icon, disabled = false, className = "" }: TabProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === id;

  const handleClick = () => {
    if (!disabled) {
      setActiveTab(id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${id}`}
      id={`tab-${id}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      className={`im-tab ${isActive ? "im-tab--active" : ""} ${disabled ? "im-tab--disabled" : ""} ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {icon && <span className="im-tab-icon">{icon}</span>}
      <span className="im-tab-label">{label}</span>
    </button>
  );
}

export interface TabPanelProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ id, children, className = "" }: TabPanelProps) {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === id;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={`im-tab-panel ${className}`}
    >
      {children}
    </div>
  );
}
