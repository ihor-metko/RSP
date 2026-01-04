import { Metadata } from "next";
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { DocsList } from "@/components/ui/DocsList";
import { DocsNote } from "@/components/ui/DocsNote";

export const metadata: Metadata = {
  title: "Roles and Access Control - ArenaOne for Clubs Documentation",
  description: "Understanding who manages what in your organization and clubs.",
};

export default function RolesAndControlPage() {
  return (
    <DocsPage title="Roles and Access Control">
      <DocsSection title="Why Roles Matter">
        <p>
          Running a successful club—or multiple clubs—means delegating responsibility without losing control.
          ArenaOne gives you different levels of access so the right people can do their jobs without 
          interfering with others.
        </p>
        <p>
          Everyone sees only what they&apos;re responsible for. This keeps things organized, secure, and efficient.
        </p>
      </DocsSection>

      <DocsSection title="Organization Owner">
        <p>
          The <strong>Organization Owner</strong> is the person who created the organization. This is typically 
          the business owner or founder.
        </p>
        <p><strong>What they manage:</strong></p>
        <DocsList type="bulleted">
          <li>The entire organization and all its clubs</li>
          <li>Creating new clubs or closing existing ones</li>
          <li>Appointing other administrators</li>
          <li>Organization-wide settings and policies</li>
          <li>Access to all data and reports across every club</li>
        </DocsList>
        <DocsNote type="info">
          Think of the Organization Owner as having the master key—they can access everything and 
          make any decision across the organization.
        </DocsNote>
      </DocsSection>

      <DocsSection title="Organization Admin">
        <p>
          An <strong>Organization Admin</strong> is someone you trust to help manage your organization.
          You can have multiple Organization Admins.
        </p>
        <p><strong>What they manage:</strong></p>
        <DocsList type="bulleted">
          <li>All clubs within the organization</li>
          <li>Viewing performance across all locations</li>
          <li>Helping with organization-level decisions</li>
          <li>Assigning or managing club administrators</li>
        </DocsList>
        <p>
          Organization Admins are useful if you have business partners, regional managers, or trusted 
          staff who need to oversee operations but shouldn&apos;t be limited to a single club.
        </p>
        <DocsNote type="info">
          Organization Admins can see and manage everything in your organization, similar to the owner—but
          they don&apos;t own the organization itself.
        </DocsNote>
      </DocsSection>

      <DocsSection title="Club Admin">
        <p>
          A <strong>Club Admin</strong> manages one specific club. They focus on the day-to-day operations 
          of their location.
        </p>
        <p><strong>What they manage:</strong></p>
        <DocsList type="bulleted">
          <li>Bookings and schedules for their club</li>
          <li>Court availability and pricing (if allowed)</li>
          <li>Viewing reports for their club only</li>
          <li>Handling player inquiries and issues</li>
        </DocsList>
        <p><strong>What they cannot see:</strong></p>
        <DocsList type="bulleted">
          <li>Other clubs in your organization</li>
          <li>Organization-wide settings or data</li>
          <li>Information about other locations</li>
        </DocsList>
        <DocsNote type="info">
          Club Admins are perfect for on-site managers or staff who need control over their location but 
          shouldn&apos;t access other clubs or organization-level settings.
        </DocsNote>
      </DocsSection>

      <DocsSection title="Why This Structure Works">
        <p>
          This role system gives you flexibility and security:
        </p>
        <DocsList type="bulleted">
          <li><strong>Clear responsibility:</strong> Everyone knows what they&apos;re in charge of</li>
          <li><strong>No confusion:</strong> People only see what they need to see</li>
          <li><strong>Easy delegation:</strong> You can trust others to manage parts of your business</li>
          <li><strong>Secure access:</strong> Sensitive data stays protected from unnecessary access</li>
        </DocsList>
      </DocsSection>

      <DocsSection title="Assigning Roles">
        <p>
          You can assign roles to people as your organization grows:
        </p>
        <DocsList type="bulleted">
          <li>Invite someone and assign them as Organization Admin if they need full access</li>
          <li>Assign someone as Club Admin if they should only manage a specific club</li>
          <li>Change roles anytime as responsibilities shift</li>
          <li>Remove access if someone leaves or their role changes</li>
        </DocsList>
        <DocsNote type="warning">
          Always assign the minimum level of access someone needs to do their job. This keeps your 
          organization secure and prevents accidental changes to settings they shouldn&apos;t touch.
        </DocsNote>
      </DocsSection>

      <DocsSection title="Common Scenarios">
        <p><strong>Single club owner:</strong></p>
        <p>
          You&apos;re the Organization Owner. You might assign a Club Admin to your on-site manager so they 
          can handle daily bookings and operations.
        </p>
        
        <p className="mt-4"><strong>Multi-club business:</strong></p>
        <p>
          You&apos;re the Organization Owner. You assign Organization Admins to business partners or regional 
          managers, and Club Admins to each location manager.
        </p>

        <p className="mt-4"><strong>Growing from one to multiple clubs:</strong></p>
        <p>
          Start as the Organization Owner with yourself managing everything. When you open a second club, 
          assign a Club Admin to your first location so you can focus on the new one.
        </p>
      </DocsSection>

      <DocsSection title="Key Takeaway">
        <DocsNote type="info">
          The role system exists to make your life easier—not more complicated. You stay in control 
          while giving trusted people the access they need to help your business succeed.
        </DocsNote>
      </DocsSection>
    </DocsPage>
  );
}
