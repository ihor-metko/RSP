import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsCallout,
  DocsSteps,
  DocsNote,
  DocsScreenshot,
  DocsCTA,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.player.quickBooking");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function QuickBookingPage() {
  const t = await getTranslations("docs.preSales.player.quickBooking");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title="Fast & Simple">
          Quick Booking allows you to reserve a court in just a few clicks. Perfect for spontaneous games or last-minute bookings.
        </DocsCallout>

        <DocsSteps
          steps={[
            {
              title: "Select a Club",
              description: "Browse available clubs in your area or search for a specific venue",
            },
            {
              title: "Choose Date & Time",
              description: "Pick your preferred date and see real-time court availability",
            },
            {
              title: "Select a Court",
              description: "View available courts with details like surface type and pricing",
            },
            {
              title: "Confirm Booking",
              description: "Review your selection and complete the reservation",
            },
            {
              title: "Receive Confirmation",
              description: "Get instant confirmation via email and in-app notification",
            },
          ]}
        />

        <DocsScreenshot
          alt="Quick Booking Interface"
          caption="The quick booking interface shows real-time availability and court details"
        />

        <DocsNote type="success">
          Your booking is confirmed instantly and the court is reserved exclusively for you during the selected time slot.
        </DocsNote>

        <DocsCTA href="/docs/pre-sales/player/calendar">
          Next: View Your Bookings in Calendar
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
