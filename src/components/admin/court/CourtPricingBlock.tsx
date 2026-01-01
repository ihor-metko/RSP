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

function groupRulesByDay(rules: CourtPriceRule[]): Map<number | null, CourtPriceRule[]> {
  const grouped = new Map<number | null, CourtPriceRule[]>();
  
  for (const rule of rules) {
    const key = rule.dayOfWeek;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(rule);
  }
  
  return grouped;
}

export function CourtPricingBlock({ court }: CourtPricingBlockProps) {
  const t = useTranslations();
  const hasRules = court.courtPriceRules && court.courtPriceRules.length > 0;
  const groupedRules = groupRulesByDay(court.courtPriceRules || []);

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
              {/* All days rules */}
              {groupedRules.get(null) && (
                <div className="im-pricing-rule-group">
                  <div className="im-pricing-rule-day">All Days</div>
                  {groupedRules.get(null)!.map((rule) => (
                    <div key={rule.id} className="im-pricing-rule-item">
                      <span className="im-pricing-rule-time">
                        {formatTimeRange(rule.startTime, rule.endTime)}
                      </span>
                      <span className="im-pricing-rule-price">
                        {formatPrice(rule.priceCents)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Day-specific rules */}
              {Array.from(groupedRules.entries())
                .filter(([key]) => key !== null)
                .sort(([a], [b]) => (a as number) - (b as number))
                .map(([dayOfWeek, rules]) => (
                  <div key={dayOfWeek} className="im-pricing-rule-group">
                    <div className="im-pricing-rule-day">
                      {t(DAY_TRANSLATION_KEYS[dayOfWeek as number])}
                    </div>
                    {rules.map((rule) => (
                      <div key={rule.id} className="im-pricing-rule-item">
                        <span className="im-pricing-rule-time">
                          {formatTimeRange(rule.startTime, rule.endTime)}
                        </span>
                        <span className="im-pricing-rule-price">
                          {formatPrice(rule.priceCents)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
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
