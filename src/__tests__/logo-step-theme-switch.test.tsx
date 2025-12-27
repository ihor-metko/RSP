/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { LogoStep } from "@/components/admin/SharedSteps/LogoStep";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      logoTitle: "Organization Logo & Theme",
      logoDescription: "Upload your organization logo and configure theme settings",
      logoCountLabel: "Logo Count",
      logoCountOne: "One logo for both themes",
      logoCountOneDescription: "Upload a single logo that works well on both light and dark backgrounds",
      logoCountTwo: "Two separate logos for different themes",
      logoCountTwoDescription: "Upload different logo versions optimized for light and dark themes",
      primaryLogo: "Primary Logo",
      firstLogo: "First Logo",
      primaryLogoHelperText: "Upload a square image. SVG format recommended for best quality.",
      logoBackgroundLabel: "Logo Background for Display",
      logoBackgroundLight: "Light Background",
      logoBackgroundDark: "Dark Background",
      logoBackgroundLightDescription: "Logo will be displayed on light backgrounds",
      logoBackgroundDarkDescription: "Logo will be displayed on dark backgrounds",
      logoBackgroundHelperText: "Select the background color to use when displaying the logo in banners and cards",
      logoThemeLight: "Light Theme",
      logoThemeDark: "Dark Theme",
      firstLogoThemeLabel: "First Logo Theme",
      secondLogoThemeLabel: "Second Logo Theme",
      logoThemeHelperText: "Select which theme (Light/Dark) this logo is designed for",
      secondLogo: "Second Logo (Alternate Theme)",
      secondLogoHelperText: "Upload an alternate logo for the other theme.",
    };
    return translations[key] || key;
  },
}));

describe("LogoStep - Theme Switch Feature", () => {
  const mockOnChange = jest.fn();
  const mockFieldErrors = {};
  const mockIsSubmitting = false;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows logo background selector only when logoCount is 'one'", () => {
    const formData = {
      logoCount: 'one' as const,
      logo: null,
      logoTheme: 'light' as const,
      logoBackground: 'light' as const,
      secondLogo: null,
      secondLogoTheme: 'dark' as const,
    };

    render(
      <LogoStep
        formData={formData}
        fieldErrors={mockFieldErrors}
        isSubmitting={mockIsSubmitting}
        onChange={mockOnChange}
      />
    );

    // Should show logo background selector
    expect(screen.getByText("Logo Background for Display")).toBeInTheDocument();
    expect(screen.getByText("Light Background")).toBeInTheDocument();
    expect(screen.getByText("Dark Background")).toBeInTheDocument();
  });

  it("hides logo background selector when logoCount is 'two'", () => {
    const formData = {
      logoCount: 'two' as const,
      logo: null,
      logoTheme: 'light' as const,
      logoBackground: 'light' as const,
      secondLogo: null,
      secondLogoTheme: 'dark' as const,
    };

    render(
      <LogoStep
        formData={formData}
        fieldErrors={mockFieldErrors}
        isSubmitting={mockIsSubmitting}
        onChange={mockOnChange}
      />
    );

    // Should NOT show logo background selector
    expect(screen.queryByText("Logo Background for Display")).not.toBeInTheDocument();
    
    // Should show theme selectors instead
    expect(screen.getByText("First Logo Theme")).toBeInTheDocument();
    expect(screen.getByText("Second Logo Theme")).toBeInTheDocument();
  });

  it("calls onChange when background is switched", () => {
    const formData = {
      logoCount: 'one' as const,
      logo: null,
      logoTheme: 'light' as const,
      logoBackground: 'light' as const,
      secondLogo: null,
      secondLogoTheme: 'dark' as const,
    };

    render(
      <LogoStep
        formData={formData}
        fieldErrors={mockFieldErrors}
        isSubmitting={mockIsSubmitting}
        onChange={mockOnChange}
      />
    );

    // Find the dark background radio button by its value attribute
    const darkBackgroundRadio = screen.getAllByRole('radio').find(
      (radio) => radio.getAttribute('value') === 'dark' && radio.getAttribute('name') === 'logoBackground'
    );
    
    expect(darkBackgroundRadio).toBeDefined();
    fireEvent.click(darkBackgroundRadio!);

    // Should call onChange with the new background value
    expect(mockOnChange).toHaveBeenCalledWith('logoBackground', 'dark');
  });

  it("switches between one and two logos correctly", () => {
    const formData = {
      logoCount: 'one' as const,
      logo: null,
      logoTheme: 'light' as const,
      logoBackground: 'light' as const,
      secondLogo: null,
      secondLogoTheme: 'dark' as const,
    };

    const { rerender } = render(
      <LogoStep
        formData={formData}
        fieldErrors={mockFieldErrors}
        isSubmitting={mockIsSubmitting}
        onChange={mockOnChange}
      />
    );

    // Initially shows background selector
    expect(screen.getByText("Logo Background for Display")).toBeInTheDocument();

    // Switch to two logos
    const twoLogosRadio = screen.getByLabelText(/Two separate logos/i);
    fireEvent.click(twoLogosRadio);

    expect(mockOnChange).toHaveBeenCalledWith('logoCount', 'two');

    // Rerender with updated formData
    const updatedFormData = { ...formData, logoCount: 'two' as const };
    rerender(
      <LogoStep
        formData={updatedFormData}
        fieldErrors={mockFieldErrors}
        isSubmitting={mockIsSubmitting}
        onChange={mockOnChange}
      />
    );

    // Should now show theme selectors instead of background selector
    expect(screen.queryByText("Logo Background for Display")).not.toBeInTheDocument();
    expect(screen.getByText("First Logo Theme")).toBeInTheDocument();
  });

  it("shows second logo upload field when logoCount is 'two'", () => {
    const formData = {
      logoCount: 'two' as const,
      logo: null,
      logoTheme: 'light' as const,
      logoBackground: 'light' as const,
      secondLogo: null,
      secondLogoTheme: 'dark' as const,
    };

    render(
      <LogoStep
        formData={formData}
        fieldErrors={mockFieldErrors}
        isSubmitting={mockIsSubmitting}
        onChange={mockOnChange}
      />
    );

    // Should show second logo field
    expect(screen.getByText("Second Logo (Alternate Theme)")).toBeInTheDocument();
  });

  it("hides second logo upload field when logoCount is 'one'", () => {
    const formData = {
      logoCount: 'one' as const,
      logo: null,
      logoTheme: 'light' as const,
      logoBackground: 'light' as const,
      secondLogo: null,
      secondLogoTheme: 'dark' as const,
    };

    render(
      <LogoStep
        formData={formData}
        fieldErrors={mockFieldErrors}
        isSubmitting={mockIsSubmitting}
        onChange={mockOnChange}
      />
    );

    // Should NOT show second logo field
    expect(screen.queryByText("Second Logo (Alternate Theme)")).not.toBeInTheDocument();
  });
});
