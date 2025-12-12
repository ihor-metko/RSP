"use client";

/**
 * Entity Colors Demo Component
 * 
 * This component demonstrates how to use centralized entity colors
 * throughout the application. It shows examples of:
 * - Using entity colors with the Badge component
 * - Using entity color hooks for dynamic styling
 * - Using CSS classes for entity-specific styling
 * - Applying entity colors to custom components
 * 
 * This file serves as both documentation and a visual test
 * for the entity color system.
 */

import { Badge } from "@/components/ui";
import { ENTITY_COLORS } from "@/constants/entityColors";

export function EntityColorsDemo() {
  return (
    <div className="p-8 space-y-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Entity Colors System Demo</h1>
        
        {/* Section 1: Badge Component Examples */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Entity Badges</h2>
          <div className="flex flex-wrap gap-4">
            <Badge entityType="organization">Organization</Badge>
            <Badge entityType="club">Club</Badge>
            <Badge entityType="court">Court</Badge>
            <Badge entityType="booking">Booking</Badge>
          </div>
        </section>
        
        {/* Section 2: Color Reference */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Color Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(ENTITY_COLORS).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3 p-3 rounded-lg border">
                <div 
                  className="w-12 h-12 rounded-md shadow-sm" 
                  style={{ backgroundColor: value }}
                />
                <div>
                  <div className="font-mono text-sm font-medium capitalize">{key}</div>
                  <div className="font-mono text-xs opacity-70">{value}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
