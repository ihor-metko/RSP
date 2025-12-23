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
