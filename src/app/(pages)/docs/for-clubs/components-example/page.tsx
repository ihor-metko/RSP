import { Metadata } from "next";
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { DocsSubsection } from "@/components/ui/DocsSubsection";
import { DocsList } from "@/components/ui/DocsList";
import { DocsNote } from "@/components/ui/DocsNote";
import { DocsCTA } from "@/components/ui/DocsCTA";
import { DocsScreenshot } from "@/components/ui/DocsScreenshot";
import { DocsCallout } from "@/components/ui/DocsCallout";

export const metadata: Metadata = {
  title: "Components Example - ArenaOne Documentation",
  description: "Example page showing all available documentation components.",
};

export default function ComponentsExamplePage() {
  return (
    <DocsPage 
      title="Documentation Components Example"
      sidebar={
        <div>
          <h3 className="text-sm font-semibold mb-2">Quick Links</h3>
          <DocsList 
            type="bulleted" 
            items={[
              "Overview",
              "Features",
              "Installation",
              "Next Steps"
            ]}
          />
        </div>
      }
    >
      <DocsSection title="Overview">
        <p>
          This page demonstrates all available documentation components that can be used
          to create consistent and professional documentation pages for ArenaOne.
        </p>
        <p>
          All components follow the dark theme design system and use im-docs-* semantic CSS classes.
        </p>
      </DocsSection>

      <DocsSection title="Key Features">
        <p>
          Our documentation components provide the following capabilities:
        </p>
        <DocsList 
          type="bulleted"
          items={[
            "Consistent dark theme styling",
            "Responsive layout support",
            "Semantic CSS classes (im-docs-*)",
            "TypeScript support with proper types",
            "Accessibility-friendly markup"
          ]}
        />
      </DocsSection>

      <DocsSection title="Installation Steps">
        <p>Follow these steps to get started:</p>
        <DocsList type="numbered">
          <li>Import the required components from @/components/ui</li>
          <li>Structure your page using DocsPage as the wrapper</li>
          <li>Add sections with DocsSection for organized content</li>
          <li>Use DocsList for bulleted or numbered lists</li>
          <li>Highlight important information with DocsNote</li>
          <li>Add call-to-action buttons with DocsCTA</li>
        </DocsList>
      </DocsSection>

      <DocsSection title="Important Notes">
        <DocsNote type="info">
          All documentation components are designed to work seamlessly with the existing
          ArenaOne design system. They automatically support dark mode and use CSS variables
          for consistent theming.
        </DocsNote>
        
        <DocsNote type="warning">
          When using these components, make sure to import them from @/components/ui to ensure
          proper tree-shaking and code splitting. Do not copy components to other locations.
        </DocsNote>

        <DocsNote type="success">
          You&apos;ve successfully set up the documentation components! They&apos;re ready to use.
        </DocsNote>
      </DocsSection>

      <DocsSection title="Visual Elements">
        <DocsSubsection title="Screenshots">
          <p>Use DocsScreenshot to add visual examples with captions:</p>
          <DocsScreenshot 
            alt="Dashboard overview showing key metrics"
            caption="Example placeholder - actual screenshot to be added"
          />
        </DocsSubsection>

        <DocsSubsection title="Callouts">
          <p>Highlight key benefits or important information:</p>
          <DocsCallout title="Why This Matters">
            Using consistent documentation components ensures a professional appearance
            and makes it easier for users to navigate and understand your content.
          </DocsCallout>
        </DocsSubsection>
      </DocsSection>

      <DocsSection title="Component List">
        <p>Here&apos;s a complete list of available documentation components:</p>
        <DocsList type="bulleted">
          <li><strong>DocsPage</strong> - Main wrapper with title and optional sidebar</li>
          <li><strong>DocsSection</strong> - Section container with title and content</li>
          <li><strong>DocsSubsection</strong> - Subsection for better content hierarchy</li>
          <li><strong>DocsList</strong> - Bulleted or numbered lists</li>
          <li><strong>DocsNote</strong> - Highlighted note boxes (info/warning/success)</li>
          <li><strong>DocsCallout</strong> - Emphasized callout boxes for key points</li>
          <li><strong>DocsScreenshot</strong> - Screenshot display with placeholder support</li>
          <li><strong>DocsCTA</strong> - Call-to-action buttons with links</li>
        </DocsList>
      </DocsSection>

      <DocsSection title="Next Steps">
        <p>
          Ready to start using these components? Check out our getting started guide
          or dive right into creating your first documentation page.
        </p>
        
        <div className="flex gap-4 mt-6">
          <DocsCTA href="/docs/for-clubs/getting-started">
            Getting Started Guide
          </DocsCTA>
          <DocsCTA href="/docs/for-clubs/overview" variant="secondary">
            View Documentation
          </DocsCTA>
        </div>
      </DocsSection>
    </DocsPage>
  );
}
