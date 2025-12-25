import "@testing-library/jest-dom";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string, params?: Record<string, string>) => {
    // Translations map organized by namespace
    const translations: Record<string, Record<string, string>> = {
      common: {
        clearFilters: "Clear filters",
        loadingDashboard: "Loading dashboard...",
      },
      pagination: {
        showing: "Showing {start} to {end} of {total}",
        previous: "Previous",
        next: "Next",
        pageSize: "Items per page",
        page: "Page",
      },
      entityBanner: {
        edit: "Edit",
        publish: "Publish",
        unpublish: "Unpublish",
        processing: "Processing...",
        published: "Published",
        unpublished: "Unpublished",
        archived: "Archived",
        active: "Active",
        inactive: "Inactive",
        draft: "Draft",
        editDetails: "Edit {name} details",
        publishEntity: "Publish {name}",
        unpublishEntity: "Unpublish {name}",
        heroImageAlt: "{name} hero image",
        logoAlt: "{name} logo",
      },
    };
    
    // Get the translation template from the appropriate namespace
    const nsTranslations = namespace ? translations[namespace] : {};
    let result = nsTranslations?.[key] || key;
    
    // Replace placeholders if params are provided
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(`{${k}}`, v);
      });
    }
    
    return result;
  },
  useFormatter: () => ({
    dateTime: (date: Date) => date.toISOString(),
  }),
}));
