import { Metadata } from "next";
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { DocsList } from "@/components/ui/DocsList";
import { DocsCTA } from "@/components/ui/DocsCTA";

export const metadata: Metadata = {
  title: "Getting Started - ArenaOne for Clubs Documentation",
  description: "Learn how to set up your padel club on ArenaOne and start accepting bookings.",
};

export default function GettingStartedPage() {
  return (
    <DocsPage title="Getting Started">
      <DocsSection title="How to Start Using the Platform">
        <p>
          ArenaOne helps you manage your padel club operations from a single platform.
          Whether you operate a single club or multiple facilities, getting started is
          straightforward.
        </p>
        <p>
          This guide walks you through the essential steps to set up your organization,
          configure your clubs and courts, and open bookings to players.
        </p>
      </DocsSection>

      <DocsSection title="Onboarding Flow">
        <p>
          Follow these steps to get your club up and running on ArenaOne:
        </p>
        
        <h3 className="im-docs-subsection-title">1. Create Your Organization</h3>
        <p>
          Your organization is the top-level entity that represents your business. All your
          clubs, courts, and bookings will be managed under this organization.
        </p>
        <DocsList type="bulleted">
          <li>Provide your business name and contact details</li>
          <li>Set up organization-level settings and preferences</li>
          <li>Define admin roles and permissions for your team</li>
        </DocsList>

        <h3 className="im-docs-subsection-title">2. Add Your First Club</h3>
        <p>
          Each club represents a physical facility with its own location, courts, and
          operating hours.
        </p>
        <DocsList type="bulleted">
          <li>Enter the club name and address</li>
          <li>Add contact information and facility details</li>
          <li>Configure club-specific settings</li>
        </DocsList>

        <h3 className="im-docs-subsection-title">3. Add Courts to Your Club</h3>
        <p>
          Courts are the bookable resources at your club. Each court can have its own
          availability and pricing rules.
        </p>
        <DocsList type="bulleted">
          <li>Name each court (e.g., &quot;Court 1&quot;, &quot;Center Court&quot;)</li>
          <li>Specify court type and surface details</li>
          <li>Set up pricing for different times and days</li>
        </DocsList>

        <h3 className="im-docs-subsection-title">4. Set Working Hours</h3>
        <p>
          Define when your courts are available for bookings. You can set regular hours
          and handle special dates or holidays.
        </p>
        <DocsList type="bulleted">
          <li>Configure standard operating hours for each day</li>
          <li>Set special hours for holidays or events</li>
          <li>Manage seasonal availability changes</li>
        </DocsList>

        <h3 className="im-docs-subsection-title">5. Open Bookings</h3>
        <p>
          Once your courts are configured, you can start accepting bookings from players.
          The platform handles availability checks, confirmations, and scheduling automatically.
        </p>
        <DocsList type="bulleted">
          <li>Enable online booking for your courts</li>
          <li>Set booking policies and restrictions</li>
          <li>Monitor reservations through the admin dashboard</li>
        </DocsList>
      </DocsSection>

      <DocsSection title="Ready to Get Started?">
        <p>
          If you&apos;re ready to start using ArenaOne for your padel club, sign up to get
          access to the platform and begin setting up your organization.
        </p>
        <div className="im-docs-cta-group">
          <DocsCTA href="/auth/sign-up">
            Get Started
          </DocsCTA>
          <DocsCTA href="/auth/sign-in">
            Sign In
          </DocsCTA>
        </div>
      </DocsSection>
    </DocsPage>
  );
}
