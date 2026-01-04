import { Metadata } from "next";
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { DocsList } from "@/components/ui/DocsList";

export const metadata: Metadata = {
  title: "Problems We Solve - ArenaOne for Clubs Documentation",
  description: "Real operational challenges padel clubs face and how ArenaOne addresses them.",
};

export default function ProblemsWeSolvePage() {
  return (
    <DocsPage title="Problems We Solve">
      <DocsSection title="Manual Bookings">
        <p>
          Many padel clubs still handle bookings through WhatsApp messages, Instagram DMs,
          or phone calls. This creates constant interruptions, manual scheduling conflicts,
          and errors that frustrate both staff and players.
        </p>
        <p>
          Common issues with manual booking coordination:
        </p>
        <DocsList type="bulleted">
          <li>Staff spends hours responding to booking requests across multiple channels</li>
          <li>Double-bookings happen when messages overlap or get missed</li>
          <li>No clear record of who booked what, when, or whether they paid</li>
          <li>Players get frustrated waiting for confirmations or checking availability</li>
          <li>Impossible to accept bookings outside business hours</li>
        </DocsList>
        <p>
          ArenaOne automates the entire booking process. Players see real-time availability,
          book instantly, and receive immediate confirmation. Your staff is freed from
          constant message management.
        </p>
      </DocsSection>

      <DocsSection title="Excel Spreadsheets and Fragmented Systems">
        <p>
          Running a club with Excel sheets, paper calendars, or a patchwork of disconnected
          tools leads to data chaos. Information lives in different places, nothing syncs,
          and finding answers requires checking multiple sources.
        </p>
        <p>
          What this looks like in practice:
        </p>
        <DocsList type="bulleted">
          <li>Court schedules in one spreadsheet, player info in another</li>
          <li>Revenue tracking separate from booking records</li>
          <li>No single source of truth when conflicts or questions arise</li>
          <li>Time wasted manually copying data between systems</li>
          <li>Risk of losing data when files get corrupted or overwritten</li>
        </DocsList>
        <p>
          ArenaOne unifies your data in one platform. Bookings, courts, players, and
          revenue all live together. Everything stays synchronized, and you can access
          any information instantly.
        </p>
      </DocsSection>

      <DocsSection title="Lack of Visibility and Control">
        <p>
          Without a centralized system, club owners often have no clear view of their
          business performance. How many bookings happened today? Which courts are
          most popular? Who are your regular players? These questions shouldn&apos;t require
          digging through messages or spreadsheets.
        </p>
        <p>
          Challenges of operating without visibility:
        </p>
        <DocsList type="bulleted">
          <li>Can&apos;t see booking patterns or peak times without manual analysis</li>
          <li>Difficult to identify underutilized courts or revenue opportunities</li>
          <li>No way to track player activity or booking history</li>
          <li>Hard to forecast revenue or plan capacity</li>
          <li>Staff makes decisions based on gut feeling instead of data</li>
        </DocsList>
        <p>
          ArenaOne provides real-time visibility into every aspect of your club. See
          bookings as they happen, understand usage patterns, and make informed decisions
          based on actual data.
        </p>
      </DocsSection>

      <DocsSection title="Managing Multiple Clubs">
        <p>
          Operating more than one club multiplies every operational challenge. Each location
          might use different processes, staff can&apos;t see across facilities, and you lack
          a consolidated view of your business.
        </p>
        <p>
          Multi-club management challenges:
        </p>
        <DocsList type="bulleted">
          <li>Each club operates as a separate silo with its own booking system</li>
          <li>No way to compare performance between locations</li>
          <li>Can&apos;t reassign bookings or share resources across clubs</li>
          <li>Reporting requires manually combining data from multiple sources</li>
          <li>Difficult to maintain consistent processes and standards</li>
          <li>Staff at one location can&apos;t help with another location&apos;s operations</li>
        </DocsList>
        <p>
          ArenaOne is built for multi-club operations from the ground up. Manage all
          your facilities from a single interface, maintain consistent processes, and
          get consolidated reporting across your entire organization.
        </p>
      </DocsSection>
    </DocsPage>
  );
}
