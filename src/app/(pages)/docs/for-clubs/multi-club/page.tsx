import { Metadata } from "next";
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { DocsList } from "@/components/ui/DocsList";
import { DocsNote } from "@/components/ui/DocsNote";

export const metadata: Metadata = {
  title: "Multi-Club Management - ArenaOne for Clubs Documentation",
  description: "Manage multiple club locations under one organization with centralized control.",
};

export default function MultiClubPage() {
  return (
    <DocsPage title="Multi-Club Management">
      <DocsSection title="Why Multi-Club Support Matters">
        <p>
          Whether you&apos;re running one club today or planning to expand, ArenaOne is designed to grow with you.
          Our multi-club capability is a core strength of the platform, not an add-on.
        </p>
        <p>
          This means you can start with a single location and add more clubs whenever you&apos;re ready—without
          switching systems or rebuilding your setup.
        </p>
      </DocsSection>

      <DocsSection title="How It Works">
        <p>
          In ArenaOne, you create one <strong>organization</strong> that can contain multiple clubs.
          Think of your organization as your company or brand, and each club as a specific location.
        </p>
        <DocsList type="bulleted">
          <li>One organization = your business or brand</li>
          <li>Multiple clubs = your different locations</li>
          <li>Each club has its own courts, pricing, and settings</li>
          <li>All clubs share the same organizational control</li>
        </DocsList>
        <DocsNote type="info">
          You don&apos;t pay extra to set up multiple clubs. Multi-club support is built into the platform from day one.
        </DocsNote>
      </DocsSection>

      <DocsSection title="Centralized Control">
        <p>
          As an organization owner or administrator, you have a complete view across all your clubs:
        </p>
        <DocsList type="bulleted"
          items={[
            "See performance and bookings across all locations",
            "Set consistent branding and policies",
            "Manage staff and assign them to specific clubs",
            "Control who has access to what",
            "View consolidated reports and analytics"
          ]}
        />
        <p>
          Everything stays under one roof—no jumping between different systems or logging in multiple times.
        </p>
      </DocsSection>

      <DocsSection title="Individual Club Administration">
        <p>
          While you maintain central oversight, each club can have its own dedicated administrators who manage:
        </p>
        <DocsList type="bulleted">
          <li>Day-to-day operations at their specific location</li>
          <li>Court schedules and availability</li>
          <li>Bookings and player interactions</li>
          <li>Pricing specific to their club (if needed)</li>
        </DocsList>
        <DocsNote type="info">
          Club administrators only see and manage their own club. They can&apos;t access other clubs in your organization,
          which keeps operations secure and focused.
        </DocsNote>
      </DocsSection>

      <DocsSection title="Who Benefits from Multi-Club">
        <p>
          Multi-club support is valuable for different types of businesses:
        </p>
        <DocsList type="bulleted">
          <li><strong>Single-club owners planning to grow:</strong> Set up your organization once, 
            then add new locations as you expand without rebuilding your infrastructure.</li>
          <li><strong>Existing multi-location businesses:</strong> Consolidate all your clubs into one 
            unified platform with centralized reporting and control.</li>
          <li><strong>Franchises or partnerships:</strong> Manage different clubs under one brand while 
            giving local teams the autonomy they need.</li>
        </DocsList>
      </DocsSection>

      <DocsSection title="Player Experience Across Clubs">
        <p>
          For players, multi-club support means convenience:
        </p>
        <DocsList type="bulleted">
          <li>Browse and book courts at any of your club locations</li>
          <li>See all your locations on one platform</li>
          <li>Discover new locations easily</li>
        </DocsList>
        <p>
          This increases visibility for each club and makes it easier for players to stay within your network,
          even when traveling or exploring new areas.
        </p>
      </DocsSection>

      <DocsSection title="Getting Started with Multiple Clubs">
        <p>
          Adding a new club to your organization is straightforward:
        </p>
        <DocsList type="numbered">
          <li>Go to your organization dashboard</li>
          <li>Click to add a new club</li>
          <li>Set up courts, pricing, and availability</li>
          <li>Assign administrators if needed</li>
          <li>Your new club is live</li>
        </DocsList>
        <DocsNote type="info">
          Each club operates independently for bookings and scheduling, but you maintain full oversight and 
          control from the organization level.
        </DocsNote>
      </DocsSection>
    </DocsPage>
  );
}
