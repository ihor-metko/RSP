import { render, screen, act } from "@testing-library/react";
import { CurrencyProvider, useCurrency } from "@/contexts/CurrencyContext";
import { Currency } from "@/utils/currency";

// Test component to access the context
function TestComponent() {
  const { currency, setCurrency, setCurrencyFromString } = useCurrency();

  return (
    <div>
      <div data-testid="current-currency">{currency}</div>
      <button onClick={() => setCurrency(Currency.USD)}>Set USD</button>
      <button onClick={() => setCurrency(Currency.EUR)}>Set EUR</button>
      <button onClick={() => setCurrencyFromString("UAH")}>Set UAH from string</button>
      <button onClick={() => setCurrencyFromString("invalid")}>Set Invalid</button>
    </div>
  );
}

describe("CurrencyContext", () => {
  describe("CurrencyProvider", () => {
    it("should provide default currency as UAH", () => {
      render(
        <CurrencyProvider>
          <TestComponent />
        </CurrencyProvider>
      );

      expect(screen.getByTestId("current-currency")).toHaveTextContent("UAH");
    });

    it("should accept initialCurrency prop", () => {
      render(
        <CurrencyProvider initialCurrency={Currency.USD}>
          <TestComponent />
        </CurrencyProvider>
      );

      expect(screen.getByTestId("current-currency")).toHaveTextContent("USD");
    });

    it("should allow setting currency directly", () => {
      render(
        <CurrencyProvider>
          <TestComponent />
        </CurrencyProvider>
      );

      expect(screen.getByTestId("current-currency")).toHaveTextContent("UAH");

      act(() => {
        screen.getByText("Set USD").click();
      });

      expect(screen.getByTestId("current-currency")).toHaveTextContent("USD");

      act(() => {
        screen.getByText("Set EUR").click();
      });

      expect(screen.getByTestId("current-currency")).toHaveTextContent("EUR");
    });

    it("should allow setting currency from string", () => {
      render(
        <CurrencyProvider initialCurrency={Currency.USD}>
          <TestComponent />
        </CurrencyProvider>
      );

      expect(screen.getByTestId("current-currency")).toHaveTextContent("USD");

      act(() => {
        screen.getByText("Set UAH from string").click();
      });

      expect(screen.getByTestId("current-currency")).toHaveTextContent("UAH");
    });

    it("should default to UAH for invalid currency strings", () => {
      render(
        <CurrencyProvider initialCurrency={Currency.EUR}>
          <TestComponent />
        </CurrencyProvider>
      );

      expect(screen.getByTestId("current-currency")).toHaveTextContent("EUR");

      act(() => {
        screen.getByText("Set Invalid").click();
      });

      expect(screen.getByTestId("current-currency")).toHaveTextContent("UAH");
    });
  });

  describe("useCurrency", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<TestComponent />);
      }).toThrow("useCurrency must be used within a CurrencyProvider");

      console.error = originalError;
    });
  });

  describe("Context value stability", () => {
    it("should maintain reference stability for setCurrency and setCurrencyFromString", () => {
      const setCurrencyRefs: Array<(currency: Currency) => void> = [];
      const setCurrencyFromStringRefs: Array<(currencyStr: string | null | undefined) => void> = [];

      function RefTestComponent() {
        const { setCurrency, setCurrencyFromString } = useCurrency();
        setCurrencyRefs.push(setCurrency);
        setCurrencyFromStringRefs.push(setCurrencyFromString);
        return null;
      }

      const { rerender } = render(
        <CurrencyProvider>
          <RefTestComponent />
        </CurrencyProvider>
      );

      rerender(
        <CurrencyProvider>
          <RefTestComponent />
        </CurrencyProvider>
      );

      // Functions should maintain same reference across rerenders
      expect(setCurrencyRefs[0]).toBe(setCurrencyRefs[1]);
      expect(setCurrencyFromStringRefs[0]).toBe(setCurrencyFromStringRefs[1]);
    });
  });

  describe("Integration scenarios", () => {
    it("should support multiple currency changes in sequence", () => {
      render(
        <CurrencyProvider>
          <TestComponent />
        </CurrencyProvider>
      );

      expect(screen.getByTestId("current-currency")).toHaveTextContent("UAH");

      act(() => {
        screen.getByText("Set USD").click();
      });
      expect(screen.getByTestId("current-currency")).toHaveTextContent("USD");

      act(() => {
        screen.getByText("Set EUR").click();
      });
      expect(screen.getByTestId("current-currency")).toHaveTextContent("EUR");

      act(() => {
        screen.getByText("Set UAH from string").click();
      });
      expect(screen.getByTestId("current-currency")).toHaveTextContent("UAH");
    });
  });
});
