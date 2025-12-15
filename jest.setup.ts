import "@testing-library/jest-dom";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    // Translations map
    const translations: Record<string, string> = {
      clearFilters: "Clear filters",
      "pagination.showing": "Showing {start} to {end} of {total}",
      "pagination.previous": "Previous",
      "pagination.next": "Next",
      "pagination.pageSize": "Items per page",
      "pagination.page": "Page",
    };
    
    // Get the translation template
    let result = translations[key] || key;
    
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
