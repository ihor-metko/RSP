import { Metadata } from "next";
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { DocsList } from "@/components/ui/DocsList";
import { DocsNote } from "@/components/ui/DocsNote";

export const metadata: Metadata = {
  title: "Booking Flow - ArenaOne for Clubs Documentation",
  description: "Understand how court bookings work from both player and club perspectives.",
};

export default function BookingFlowPage() {
  return (
    <DocsPage title="Booking Flow">
      <DocsSection title="How Booking Works">
        <p>
          The booking process in ArenaOne is designed to be simple for players and transparent for club owners.
          Every booking happens in real-time, with immediate visibility for both parties.
        </p>
        <p>
          This means no double bookings, no confusion, and complete control over your court availability.
        </p>
      </DocsSection>

      <DocsSection title="Player Perspective">
        <p>
          When a player wants to book a court at your club, they go through a straightforward process:
        </p>
        <DocsList type="numbered">
          <li>Browse available clubs and view courts</li>
          <li>Select their preferred date and time</li>
          <li>See real-time availability instantly</li>
          <li>Choose a court and confirm the booking</li>
          <li>Receive immediate confirmation</li>
        </DocsList>
        <DocsNote type="info">
          Players see availability as you set it. When you block a time slot or mark a court as unavailable,
          it disappears from their view immediately—no waiting, no sync delays.
        </DocsNote>
      </DocsSection>

      <DocsSection title="Club Perspective">
        <p>
          As a club owner or administrator, you maintain complete visibility and control:
        </p>
        <DocsList type="bulleted"
          items={[
            "See all bookings as they happen, in real-time",
            "View upcoming reservations in your dashboard",
            "Know exactly which courts are booked and when",
            "Create bookings manually if needed (phone reservations, walk-ins)",
            "Cancel or modify bookings when necessary"
          ]}
        />
        <p>
          Every action is reflected immediately across the entire system—your staff, your dashboard, 
          and the player&apos;s view all stay synchronized.
        </p>
      </DocsSection>

      <DocsSection title="No Double Bookings">
        <p>
          The system prevents double bookings automatically. When a court is booked for a specific time:
        </p>
        <DocsList type="bulleted">
          <li>That slot becomes unavailable to other players instantly</li>
          <li>No two people can reserve the same court at the same time</li>
          <li>Your calendar stays accurate without manual intervention</li>
        </DocsList>
        <DocsNote type="info">
          This happens behind the scenes, so you don&apos;t have to worry about conflicts, 
          overlapping reservations, or manual calendar management.
        </DocsNote>
      </DocsSection>

      <DocsSection title="Booking Confirmations">
        <p>
          Both players and your club receive clear confirmation of every booking:
        </p>
        <DocsList type="bulleted">
          <li>Players get instant confirmation after completing their reservation</li>
          <li>Your dashboard updates immediately</li>
          <li>All booking details are visible: date, time, court, player information</li>
        </DocsList>
      </DocsSection>

      <DocsSection title="Managing Changes and Cancellations">
        <p>
          Sometimes plans change. When a booking needs to be modified or cancelled:
        </p>
        <DocsList type="bulleted">
          <li>Club admins can cancel or reschedule bookings from the dashboard</li>
          <li>The court becomes available again immediately after cancellation</li>
          <li>Changes are visible to everyone in real-time</li>
        </DocsList>
        <DocsNote type="warning">
          Any changes you make are reflected instantly, so players always see the most current availability.
        </DocsNote>
      </DocsSection>
    </DocsPage>
  );
}
