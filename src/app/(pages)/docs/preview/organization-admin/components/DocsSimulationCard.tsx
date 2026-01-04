"use client";

import React from "react";
import "./DocsSimulationCard.css";

/**
 * DocsSimulationCard Component
 * Displays a simulation card for interactive documentation flows.
 * Used to showcase organization admin role functionality in a demo environment.
 * 
 * Features:
 * - Title, description, and visual preview
 * - Supports clickable buttons for action simulation
 * - EN/UA localization support
 * - Dark theme compatible
 * - Uses semantic im-* CSS classes
 */
interface DocsSimulationCardProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  badge?: string;
  note?: string;
  preview?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export default function DocsSimulationCard({
  title,
  description,
  children,
  badge,
  note,
  preview,
  actions,
  className = "",
}: DocsSimulationCardProps) {
  return (
    <div className={`im-docs-sim-card ${className}`.trim()}>
      {badge && <div className="im-docs-sim-card-badge">{badge}</div>}
      
      {title && <h3 className="im-docs-sim-card-title">{title}</h3>}
      
      {description && (
        <p className="im-docs-sim-card-description">{description}</p>
      )}
      
      {preview && (
        <div className="im-docs-sim-card-preview">{preview}</div>
      )}
      
      {children}
      
      {actions && (
        <div className="im-docs-sim-card-actions">{actions}</div>
      )}
      
      {note && <div className="im-docs-sim-card-note">{note}</div>}
    </div>
  );
}
