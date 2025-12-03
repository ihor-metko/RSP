/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";

// Mock next-intl/server
jest.mock("next-intl/server", () => ({
  getTranslations: () => Promise.resolve((key: string) => {
    const translations: Record<string, string> = {
      // How It Works section
      "home.howItWorks.title": "How It Works",
      "home.howItWorks.step1Title": "Find a Club",
      "home.howItWorks.step1Desc": "Search for padel clubs near you.",
      "home.howItWorks.step2Title": "Book a Court",
      "home.howItWorks.step2Desc": "Choose your preferred time slot.",
      "home.howItWorks.step3Title": "Play & Improve",
      "home.howItWorks.step3Desc": "Enjoy your game and track progress.",
      // Clubs & Coaches section
      "home.clubsCoaches.title": "Featured Clubs & Coaches",
      "home.clubsCoaches.viewClub": "View Club",
      "home.clubsCoaches.bookCoach": "Book Coach",
      "home.clubsCoaches.club1Name": "Elite Padel Center",
      "home.clubsCoaches.club1Desc": "Premium indoor courts.",
      "home.clubsCoaches.club2Name": "Sunset Padel Club",
      "home.clubsCoaches.club2Desc": "Beautiful outdoor courts.",
      "home.clubsCoaches.club3Name": "Urban Padel Arena",
      "home.clubsCoaches.club3Desc": "Modern urban facility.",
      "home.clubsCoaches.coach1Name": "Carlos Rodriguez",
      "home.clubsCoaches.coach1Desc": "Former professional player.",
      "home.clubsCoaches.coach2Name": "Maria Santos",
      "home.clubsCoaches.coach2Desc": "Certified coach.",
      "home.clubsCoaches.coach3Name": "David Chen",
      "home.clubsCoaches.coach3Desc": "Technical expert.",
      // Testimonials section
      "home.testimonials.title": "What Our Players Say",
      "home.testimonials.testimonial1Name": "John Smith",
      "home.testimonials.testimonial1Text": "Amazing platform!",
      "home.testimonials.testimonial2Name": "Emma Wilson",
      "home.testimonials.testimonial2Text": "So easy to use.",
      "home.testimonials.testimonial3Name": "Michael Brown",
      "home.testimonials.testimonial3Text": "Great variety of clubs.",
      "home.testimonials.testimonial4Name": "Sarah Johnson",
      "home.testimonials.testimonial4Text": "Hassle-free booking!",
    };
    return translations[key] || key;
  }),
}));

// Mock UI components
jest.mock("@/components/ui", () => ({
  IMLink: ({ href, children, className, ...props }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className} data-testid={`link-${href}`} {...props}>{children}</a>
  ),
}));

// Import components after mocks
import { LandingHowItWorks } from "@/components/home/LandingHowItWorks";
import { LandingClubsCoaches } from "@/components/home/LandingClubsCoaches";
import { LandingTestimonials } from "@/components/home/LandingTestimonials";

describe("LandingHowItWorks", () => {
  it("renders the section title", async () => {
    const Component = await LandingHowItWorks();
    render(Component);
    expect(screen.getByText("How It Works")).toBeInTheDocument();
  });

  it("renders all three steps", async () => {
    const Component = await LandingHowItWorks();
    render(Component);
    expect(screen.getByText("Find a Club")).toBeInTheDocument();
    expect(screen.getByText("Book a Court")).toBeInTheDocument();
    expect(screen.getByText("Play & Improve")).toBeInTheDocument();
  });

  it("renders step descriptions", async () => {
    const Component = await LandingHowItWorks();
    render(Component);
    expect(screen.getByText("Search for padel clubs near you.")).toBeInTheDocument();
    expect(screen.getByText("Choose your preferred time slot.")).toBeInTheDocument();
    expect(screen.getByText("Enjoy your game and track progress.")).toBeInTheDocument();
  });

  it("has proper accessibility attributes", async () => {
    const Component = await LandingHowItWorks();
    render(Component);
    const section = screen.getByRole("region", { name: /how it works/i });
    expect(section).toBeInTheDocument();
  });

  it("renders step cards as list items", async () => {
    const Component = await LandingHowItWorks();
    render(Component);
    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(3);
  });
});

describe("LandingClubsCoaches", () => {
  it("renders the section title", async () => {
    const Component = await LandingClubsCoaches();
    render(Component);
    expect(screen.getByText("Featured Clubs & Coaches")).toBeInTheDocument();
  });

  it("renders all featured clubs", async () => {
    const Component = await LandingClubsCoaches();
    render(Component);
    expect(screen.getByText("Elite Padel Center")).toBeInTheDocument();
    expect(screen.getByText("Sunset Padel Club")).toBeInTheDocument();
    expect(screen.getByText("Urban Padel Arena")).toBeInTheDocument();
  });

  it("renders all featured coaches", async () => {
    const Component = await LandingClubsCoaches();
    render(Component);
    expect(screen.getByText("Carlos Rodriguez")).toBeInTheDocument();
    expect(screen.getByText("Maria Santos")).toBeInTheDocument();
    expect(screen.getByText("David Chen")).toBeInTheDocument();
  });

  it("renders CTA buttons for clubs", async () => {
    const Component = await LandingClubsCoaches();
    render(Component);
    const viewClubButtons = screen.getAllByText("View Club");
    expect(viewClubButtons).toHaveLength(3);
  });

  it("renders CTA buttons for coaches", async () => {
    const Component = await LandingClubsCoaches();
    render(Component);
    const bookCoachButtons = screen.getAllByText("Book Coach");
    expect(bookCoachButtons).toHaveLength(3);
  });

  it("has proper accessibility attributes", async () => {
    const Component = await LandingClubsCoaches();
    render(Component);
    const section = screen.getByRole("region", { name: /featured clubs & coaches/i });
    expect(section).toBeInTheDocument();
  });

  it("renders cards as list items", async () => {
    const Component = await LandingClubsCoaches();
    render(Component);
    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(6); // 3 clubs + 3 coaches
  });
});

describe("LandingTestimonials", () => {
  it("renders the section title", async () => {
    const Component = await LandingTestimonials();
    render(Component);
    expect(screen.getByText("What Our Players Say")).toBeInTheDocument();
  });

  it("renders all testimonial names", async () => {
    const Component = await LandingTestimonials();
    render(Component);
    expect(screen.getByText("John Smith")).toBeInTheDocument();
    expect(screen.getByText("Emma Wilson")).toBeInTheDocument();
    expect(screen.getByText("Michael Brown")).toBeInTheDocument();
    expect(screen.getByText("Sarah Johnson")).toBeInTheDocument();
  });

  it("renders testimonial text", async () => {
    const Component = await LandingTestimonials();
    render(Component);
    expect(screen.getByText(/Amazing platform!/)).toBeInTheDocument();
    expect(screen.getByText(/So easy to use./)).toBeInTheDocument();
    expect(screen.getByText(/Great variety of clubs./)).toBeInTheDocument();
    expect(screen.getByText(/Hassle-free booking!/)).toBeInTheDocument();
  });

  it("has proper accessibility attributes", async () => {
    const Component = await LandingTestimonials();
    render(Component);
    const section = screen.getByRole("region", { name: /what our players say/i });
    expect(section).toBeInTheDocument();
  });

  it("renders testimonial cards as list items", async () => {
    const Component = await LandingTestimonials();
    render(Component);
    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(4);
  });

  it("renders star ratings", async () => {
    const Component = await LandingTestimonials();
    const { container } = render(Component);
    // Check for star elements
    const stars = container.querySelectorAll(".im-star");
    expect(stars.length).toBeGreaterThan(0);
  });
});
