import { Metadata } from "next";
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { DocsList } from "@/components/ui/DocsList";
import { DocsNote } from "@/components/ui/DocsNote";

export const metadata: Metadata = {
  title: "How It Works - ArenaOne for Clubs Documentation",
  description: "Understanding the ArenaOne platform structure and how it helps your club operate efficiently.",
};

export default function HowItWorksPage() {
  return (
    <DocsPage title="How It Works">
      <DocsSection title="The Platform Structure">
        <p>
          ArenaOne is organized in a simple, logical hierarchy that mirrors how padel
          clubs actually operate. This structure helps you stay organized, scale your
          business, and maintain clear control over your operations.
        </p>
        <p>
          The hierarchy flows from top to bottom:
        </p>
        <DocsList type="numbered">
          <li><strong>Organization</strong> — Your business entity (single club or multi-club company)</li>
          <li><strong>Clubs</strong> — Individual facilities within your organization</li>
          <li><strong>Courts</strong> — The actual padel courts at each club</li>
          <li><strong>Bookings</strong> — Player reservations for specific courts at specific times</li>
        </DocsList>
      </DocsSection>

      <DocsSection title="Organization: Your Business">
        <p>
          At the top level, your organization represents your entire business. This is
          the umbrella under which all your clubs operate.
        </p>
        <p>
          For single-club owners, your organization simply contains one club. For
          multi-club operators, your organization contains all your facilities, giving
          you a consolidated view of your entire business.
        </p>
        <p>
          Benefits of the organization level:
        </p>
        <DocsList type="bulleted">
          <li>See performance across all your clubs in one place</li>
          <li>Maintain consistent settings and processes</li>
          <li>Manage staff who work across multiple locations</li>
          <li>Access consolidated reporting and insights</li>
        </DocsList>
      </DocsSection>

      <DocsSection title="Clubs: Your Facilities">
        <p>
          Each club represents a physical location with its own address, courts, and
          operating hours. Whether you have one club or ten, each is managed as a
          distinct facility within your organization.
        </p>
        <p>
          At the club level, you control:
        </p>
        <DocsList type="bulleted">
          <li>Location details and contact information</li>
          <li>Operating hours and availability schedules</li>
          <li>Pricing rules and special date configurations</li>
          <li>The courts available for booking</li>
        </DocsList>
        <p>
          This structure allows each club to operate with its own identity and settings
          while remaining connected to your broader organization.
        </p>
      </DocsSection>

      <DocsSection title="Courts: Your Bookable Resources">
        <p>
          Courts are the actual padel courts at your club. Each court exists within a
          specific club and can be booked by players according to your availability
          and pricing rules.
        </p>
        <p>
          For each court, you define:
        </p>
        <DocsList type="bulleted">
          <li>Court name or number (e.g., &quot;Court 1&quot;, &quot;Center Court&quot;)</li>
          <li>When the court is available for bookings</li>
          <li>Pricing for different times or days</li>
          <li>Any special characteristics or notes</li>
        </DocsList>
      </DocsSection>

      <DocsSection title="Bookings: Player Reservations">
        <p>
          Bookings are player reservations for a specific court at a specific time.
          This is where everything comes together: a player selects a club, chooses
          a court, picks a time slot, and creates a booking.
        </p>
        <p>
          The booking system handles:
        </p>
        <DocsList type="bulleted">
          <li>Real-time availability checks to prevent conflicts</li>
          <li>Immediate confirmation to players</li>
          <li>Recording who booked what and when</li>
          <li>Tracking booking status and history</li>
        </DocsList>
      </DocsSection>

      <DocsSection title="Why This Structure Matters">
        <p>
          This four-level hierarchy might seem simple, but it&apos;s intentionally designed
          to support how padel clubs actually work and grow.
        </p>
        
        <DocsNote type="info">
          The structure ensures that as your business grows—adding more courts, opening
          new clubs, or expanding to new locations—the platform scales naturally without
          becoming more complicated to manage.
        </DocsNote>

        <p>
          Key benefits of this organizational approach:
        </p>
        <DocsList type="bulleted">
          <li>
            <strong>Clarity:</strong> Everyone understands which club, court, and time
            a booking refers to. No ambiguity, no confusion.
          </li>
          <li>
            <strong>Scalability:</strong> Adding a new club or court doesn&apos;t disrupt
            existing operations. Everything stays organized.
          </li>
          <li>
            <strong>Control:</strong> You can manage settings at the right level—organization-wide
            policies, club-specific rules, or court-level details.
          </li>
          <li>
            <strong>Flexibility:</strong> Each club can operate differently while still
            being part of your larger business.
          </li>
        </DocsList>
      </DocsSection>

      <DocsSection title="Putting It All Together">
        <p>
          When a player books a court, they&apos;re interacting with all four levels of this
          structure:
        </p>
        <DocsList type="numbered">
          <li>They select a club (from your organization)</li>
          <li>They choose a court (at that club)</li>
          <li>They pick a time slot (when that court is available)</li>
          <li>They create a booking (reservation confirmed)</li>
        </DocsList>
        <p>
          From your perspective as the club owner, you see everything: which clubs are
          busiest, which courts are most popular, when peak booking times occur, and
          how your overall business is performing.
        </p>
        <p>
          This simple structure keeps your operations organized today while supporting
          your growth tomorrow.
        </p>
      </DocsSection>
    </DocsPage>
  );
}
