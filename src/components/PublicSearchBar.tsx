"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input, Button } from "@/components/ui";

const DEFAULT_Q = "";
const DEFAULT_CITY = "";
const DEFAULT_INDOOR = false;
const MIN_SEARCH_LENGTH = 2;

export interface SearchParams {
  q: string;
  city: string;
  indoor?: boolean;
}

interface PublicSearchBarProps {
  initialQ?: string;
  initialCity?: string;
  initialIndoor?: boolean;
  /**
   * If provided, calls this function with search params instead of navigating.
   * Used on /clubs page for in-place filtering.
   */
  onSearch?: (params: SearchParams) => void;
  /**
   * If true, navigates to /clubs with query params on submit.
   * Used on Home page hero.
   */
  navigateOnSearch?: boolean;
  /** Optional: compact mode for hero placement */
  compact?: boolean;
}

export function PublicSearchBar({
  initialQ = DEFAULT_Q,
  initialCity = DEFAULT_CITY,
  initialIndoor = DEFAULT_INDOOR,
  onSearch,
  navigateOnSearch = false,
  compact = false,
}: PublicSearchBarProps) {
  const t = useTranslations();
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [city, setCity] = useState(initialCity);
  
  // Refs to preserve input focus
  const qInputRef = useRef<HTMLInputElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  
  // Track pending debounce timeout
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track if we just performed a manual search action (submit or clear)
  const manualActionRef = useRef(false);
  
  // Helper to reset manual action flag after current render cycle
  const resetManualActionFlag = useCallback(() => {
    // Use setTimeout(0) to reset the flag after React's state updates complete
    // This ensures the debounce effect doesn't trigger for state changes from manual actions
    setTimeout(() => {
      manualActionRef.current = false;
    }, 0);
  }, []);
  
  // Track if we're syncing from URL to prevent triggering debounced search
  const isSyncingFromUrl = useRef(false);
  // Track initial mount to distinguish from prop changes (for URL sync)
  const isInitialMount = useRef(true);

  // Sync with URL changes (for back/forward navigation)
  useEffect(() => {
    // Skip on initial mount - only sync when props actually change
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    isSyncingFromUrl.current = true;
    setQ(initialQ);
    setCity(initialCity);
    // Reset the flag on next tick to allow React state updates to complete
    Promise.resolve().then(() => {
      isSyncingFromUrl.current = false;
    });
  }, [initialQ, initialCity, initialIndoor]);

  // Build URL with query params
  const buildSearchUrl = useCallback((params: SearchParams) => {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set("q", params.q);
    if (params.city) searchParams.set("city", params.city);
    const queryString = searchParams.toString();
    return `/clubs${queryString ? `?${queryString}` : ""}`;
  }, []);

  // Validation: require at least 2 characters in any field for search
  const isSearchValid = useMemo(() => {
    return q.trim().length >= MIN_SEARCH_LENGTH || city.trim().length >= MIN_SEARCH_LENGTH;
  }, [q, city]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any pending debounced search
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    
    // Mark that we're performing a manual action
    manualActionRef.current = true;
    
    // Prevent submission if search is invalid (navigateOnSearch mode only)
    if (navigateOnSearch && !isSearchValid) {
      return;
    }
    
    // Normalize inputs: trim whitespace
    const normalizedQ = q.trim();
    const normalizedCity = city.trim();
    const params = { q: normalizedQ, city: normalizedCity };

    if (navigateOnSearch) {
      router.push(buildSearchUrl(params));
    } else if (onSearch) {
      onSearch(params);
    }
    
    resetManualActionFlag();
  };

  // Handle clear - reset filters and trigger search/navigation
  const handleClear = () => {
    // Clear any pending debounced search
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    
    // Mark that we're performing a manual action
    manualActionRef.current = true;
    
    setQ(DEFAULT_Q);
    setCity(DEFAULT_CITY);
    const defaultParams = { q: DEFAULT_Q, city: DEFAULT_CITY };

    if (navigateOnSearch) {
      router.push(buildSearchUrl(defaultParams));
    } else if (onSearch) {
      onSearch(defaultParams);
    }
    
    resetManualActionFlag();
  };

  // Debounced live search for /clubs page (only when onSearch is provided and not navigating)
  useEffect(() => {
    // Don't trigger search if we're just syncing from URL
    if (!onSearch || navigateOnSearch || isSyncingFromUrl.current) return;
    
    // Don't trigger search if we just performed a manual action
    if (manualActionRef.current) return;

    const handler = setTimeout(() => {
      // Normalize inputs: trim whitespace
      const normalizedQ = q.trim();
      const normalizedCity = city.trim();
      onSearch({ q: normalizedQ, city: normalizedCity });
    }, 500); // Increased from 300ms to 500ms for better debouncing
    
    // Store the timeout ref so we can cancel it if needed
    debounceTimeoutRef.current = handler;

    return () => {
      clearTimeout(handler);
      if (debounceTimeoutRef.current === handler) {
        debounceTimeoutRef.current = null;
      }
    };
  }, [q, city, onSearch, navigateOnSearch]);
  
  const hasFilters = q || city;

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={`tm-public-search-bar ${compact ? "" : "mb-6"}`}
    >
      <div className={`flex flex-col gap-3 ${compact ? "sm:flex-row sm:items-center" : "sm:flex-row sm:items-end"}`}>
        {/* Name/address search */}
        <div className="flex-1">
          <Input
            ref={qInputRef}
            type="text"
            placeholder={t("clubs.searchPlaceholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t("clubs.searchPlaceholder")}
            className="tm-search-input"
          />
        </div>

        {/* City search */}
        <div className={compact ? "flex-1 sm:max-w-[180px]" : "flex-1 sm:max-w-[200px]"}>
          <Input
            ref={cityInputRef}
            type="text"
            placeholder={t("clubs.cityPlaceholder")}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            aria-label={t("clubs.cityPlaceholder")}
            className="tm-city-input"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {/* Search button - always visible when onSearch is provided (clubs page) */}
          {!navigateOnSearch && onSearch && (
            <Button 
              type="submit" 
              className="tm-search-button"
            >
              {t("common.search")}
            </Button>
          )}
          
          {/* Search button for hero (navigateOnSearch mode) */}
          {navigateOnSearch && (
            <Button 
              type="submit" 
              className="tm-search-button"
              disabled={!isSearchValid}
            >
              {t("common.search")}
            </Button>
          )}

          {/* Reset button - always visible, disabled when no filters */}
          {!navigateOnSearch && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={!hasFilters}
              className="tm-clear-filters text-sm"
            >
              {t("clubs.clearFilters")}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
