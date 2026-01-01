"use client";

import { useTranslations } from "next-intl";
import { DAY_TRANSLATION_KEYS } from "@/constants/workingHours";
import { IMLink } from "@/components/ui";
import { formatPrice } from "@/utils/price";
import type { CourtDetail, CourtPriceRule } from "./types";
import "./CourtPricingBlock.css";

interface CourtPricingBlockProps {
  court: CourtDetail;
}

function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}

// Map of ruleType to display label
const RULE_TYPE_LABELS: Record<string, string> = {
  WEEKDAYS: "Weekdays (Mon-Fri)",
  WEEKENDS: "Weekends (Sat-Sun)",
  ALL_DAYS: "All Days",
  SPECIFIC_DAY: "Specific Day",
  SPECIFIC_DATE: "Specific Date",
  HOLIDAY: "Holiday",
};

// Default rule type when none is specified
const DEFAULT_RULE_TYPE = "ALL_DAYS" as const;

// Order for displaying rule type groups
const RULE_TYPE_ORDER = ["WEEKDAYS", "WEEKENDS", "ALL_DAYS", "SPECIFIC_DAY", "SPECIFIC_DATE", "HOLIDAY"];

function groupRulesByType(rules: CourtPriceRule[]): Map<string, CourtPriceRule[]> {
  const grouped = new Map<string, CourtPriceRule[]>();
  
  for (const rule of rules) {
    const key = rule.ruleType || DEFAULT_RULE_TYPE;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(rule);
  }
  
  return grouped;
}

function getDayLabel(dayOfWeek: number | null, t: (key: string) => string): string {
  if (dayOfWeek === null) return "";
  return t(DAY_TRANSLATION_KEYS[dayOfWeek]);
}

function formatDate(dateStr: string): string {
  // Format date consistently in YYYY-MM-DD format or using locale
  // Using ISO date format for consistency across locales
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function CourtPricingBlock({ court }: CourtPricingBlockProps) {
  const t = useTranslations();
  const hasRules = court.courtPriceRules && court.courtPriceRules.length > 0;
  const groupedRules = groupRulesByType(court.courtPriceRules || []);

  return (
    <div className="im-block im-court-pricing-block">
      <div className="im-block-header">
        <h2 className="im-block-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          Pricing Rules
        </h2>
        <IMLink
          href={`/admin/courts/${court.id}/price-rules`}
          className="im-edit-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
          Manage
        </IMLink>
      </div>

      <div className="im-block-content">
        <div className="im-block-row">
          <span className="im-block-label">Default Price</span>
          <span className="im-block-value im-block-value--price">
            {formatPrice(court.defaultPriceCents)}/hour
          </span>
        </div>

        {hasRules ? (
          <div className="im-pricing-rules-section">
            <div className="im-pricing-rules-header">
              <span className="im-pricing-rules-count">
                {court.courtPriceRules.length} custom rule{court.courtPriceRules.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="im-pricing-rules-list">
              {RULE_TYPE_ORDER.map((ruleType) => {
                const rules = groupedRules.get(ruleType);
                if (!rules || rules.length === 0) return null;

                return (
                  <div key={ruleType} className="im-pricing-rule-group">
                    <div className="im-pricing-rule-day-type">
                      {RULE_TYPE_LABELS[ruleType] || ruleType}
                    </div>
                    {rules.map((rule) => (
                      <div key={rule.id} className="im-pricing-rule-item">
                        <div className="im-pricing-rule-details">
                          <span className="im-pricing-rule-time">
                            {formatTimeRange(rule.startTime, rule.endTime)}
                          </span>
                          {rule.ruleType === "SPECIFIC_DAY" && rule.dayOfWeek !== null && (
                            <span className="im-pricing-rule-day-label">
                              {getDayLabel(rule.dayOfWeek, t)}
                            </span>
                          )}
                          {rule.ruleType === "SPECIFIC_DATE" && rule.date && (
                            <span className="im-pricing-rule-date-label">
                              {formatDate(rule.date)}
                            </span>
                          )}
                        </div>
                        <span className="im-pricing-rule-price">
                          {formatPrice(rule.priceCents)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="im-pricing-empty">
            <p className="im-pricing-empty-text">
              No custom pricing rules defined. The default price will apply to all time slots.
            </p>
            <IMLink
              href={`/admin/courts/${court.id}/price-rules`}
              className="im-pricing-add-btn"
            >
              + Add Pricing Rule
            </IMLink>
          </div>
        )}
      </div>
    </div>
  );
}
