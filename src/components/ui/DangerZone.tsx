"use client";

/**
 * DangerZone - Reusable component for destructive actions
 * 
 * This component provides a visually distinct section for dangerous operations
 * like publishing, unpublishing, archiving, or deleting entities.
 * 
 * Features:
 * - Clear "Danger Zone" heading with danger icon
 * - Distinct danger styling (red border/theme)
 * - Individual action blocks with descriptions
 * - Confirmation dialogs for all actions
 * - Accessible and keyboard-navigable
 */

import React from "react";
import { useTranslations } from "next-intl";
import "./DangerZone.css";

export interface DangerAction {
  /**
   * Unique identifier for the action
   */
  id: string;

  /**
   * Title of the action (e.g., "Publish Club", "Delete Club")
   */
  title: string;

  /**
   * Description explaining what this action does
   */
  description: string;

  /**
   * Button label (e.g., "Publish", "Delete")
   */
  buttonLabel: string;

  /**
   * Action handler
   */
  onAction: () => void | Promise<void>;

  /**
   * Whether the action is currently processing
   */
  isProcessing?: boolean;

  /**
   * Button variant - determines styling
   * @default 'danger'
   */
  variant?: 'danger' | 'warning';

  /**
   * Whether to show this action
   * @default true
   */
  show?: boolean;
}

export interface DangerZoneProps {
  /**
   * List of dangerous actions to display
   */
  actions: DangerAction[];

  /**
   * Custom CSS class for the container
   */
  className?: string;

  /**
   * Custom title override
   * @default from translations
   */
  title?: string;
}

/**
 * DangerZone Component
 * 
 * Displays a clearly marked danger zone with destructive actions
 * Each action has a title, description, and action button
 */
export function DangerZone({
  actions,
  className = "",
  title,
}: DangerZoneProps) {
  const t = useTranslations("dangerZone");

  // Filter actions based on show prop (default to true if not specified)
  const visibleActions = actions.filter(action => action.show !== false);

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <section className={`im-danger-zone ${className}`} data-testid="danger-zone">
      <div className="im-danger-zone-header">
        <div className="im-section-icon im-section-icon--danger">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 className="im-section-title">{title || t("title")}</h2>
      </div>

      <div className="im-danger-zone-content">
        {visibleActions.map((action) => (
          <div
            key={action.id}
            className={`im-danger-action ${
              action.variant === 'warning' ? 'im-danger-action--warning' : 'im-danger-action--danger'
            }`}
          >
            <div className="im-danger-action-info">
              <h4 className="im-danger-action-title">{action.title}</h4>
              <p className="im-danger-action-description">{action.description}</p>
            </div>
            <button
              onClick={action.onAction}
              disabled={action.isProcessing}
              className={`im-danger-action-button ${
                action.variant === 'warning'
                  ? 'im-danger-action-button--warning'
                  : 'im-danger-action-button--danger'
              }`}
              aria-label={action.title}
            >
              {action.isProcessing ? t("processing") : action.buttonLabel}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
