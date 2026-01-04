import { Metadata } from "next";
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { DocsList } from "@/components/ui/DocsList";
import { DocsNote } from "@/components/ui/DocsNote";

export const metadata: Metadata = {
  title: "Overview - ArenaOne for Clubs Documentation",
  description: "Learn what ArenaOne is, who it's for, and how it helps padel clubs operate more efficiently.",
};

export default function OverviewPage() {
  return (
    <DocsPage title="Overview">
      <DocsSection title="What is ArenaOne?">
        <p>
          ArenaOne is a cloud-based management platform built specifically for padel clubs.
          Whether you operate a single club or manage multiple facilities, ArenaOne provides
          the tools to streamline your operations, automate bookings, and maintain full control
          over your business.
        </p>
        <p>
          The platform centralizes everything you need to run your club: court scheduling,
          player bookings, availability management, and operational oversight—all accessible
          from a single, unified interface.
        </p>
      </DocsSection>

      <DocsSection title="Who It's For">
        <p>
          ArenaOne is designed for padel club owners and organizations who need to:
        </p>
        <DocsList type="bulleted">
          <li>Manage one or more padel facilities efficiently</li>
          <li>Automate court bookings and reduce manual coordination</li>
          <li>Gain real-time visibility into operations and revenue</li>
          <li>Scale their business without adding administrative overhead</li>
          <li>Provide a professional booking experience for their players</li>
        </DocsList>
        <p>
          If you&apos;re currently managing bookings through WhatsApp, Excel spreadsheets, or
          fragmented tools, ArenaOne helps you consolidate and professionalize your operations.
        </p>
      </DocsSection>

      <DocsSection title="What This Platform Is NOT">
        <DocsNote type="info">
          ArenaOne is your operational management platform—not a replacement for your brand
          or identity.
        </DocsNote>
        <p>
          It&apos;s important to understand what ArenaOne does not do:
        </p>
        <DocsList type="bulleted">
          <li>
            <strong>Not a marketplace.</strong> ArenaOne is not a public directory or booking
            marketplace. It&apos;s your private management system. Players book directly through
            your club&apos;s presence on the platform.
          </li>
          <li>
            <strong>Not replacing your branding.</strong> Your club keeps its identity, name,
            and customer relationships. ArenaOne works behind the scenes to power your operations.
          </li>
          <li>
            <strong>Not a third-party booking aggregator.</strong> You own your data, your
            customer relationships, and your revenue. ArenaOne is a tool for your business,
            not a middleman.
          </li>
        </DocsList>
      </DocsSection>

      <DocsSection title="Core Capabilities">
        <p>
          ArenaOne provides the essential capabilities padel clubs need to operate efficiently:
        </p>
        <DocsList type="bulleted">
          <li>Automated court booking and scheduling</li>
          <li>Real-time availability and calendar management</li>
          <li>Centralized control for single or multi-club operations</li>
          <li>Player management and booking history</li>
          <li>Flexible pricing and special date configurations</li>
          <li>Operational insights and visibility across your business</li>
        </DocsList>
      </DocsSection>
    </DocsPage>
  );
}
