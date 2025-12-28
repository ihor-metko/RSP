import { create } from "zustand";

/**
 * Player-visible club data types
 * These types represent public club information visible to all players
 */

interface PlayerClubCoach {
  id: string;
  name: string;
}

interface PlayerClubCourt {
  id: string;
  name: string;
  type: string | null;
  surface: string | null;
  indoor: boolean;
  defaultPriceCents: number;
}

interface PlayerClubBusinessHours {
  id: string;
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

interface PlayerClubGalleryImage {
  id: string;
  imageUrl: string;
  altText: string | null;
}

/**
 * Basic player club info for list display
 */
export interface PlayerClub {
  id: string;
  name: string;
  shortDescription?: string | null;
  location: string;
  city?: string | null;
  contactInfo?: string | null;
  openingHours?: string | null;
  logoData?: { url: string; altText?: string; thumbnailUrl?: string } | null;
  bannerData?: { url: string; altText?: string; description?: string; position?: string } | null;
  tags?: string | null;
  createdAt: string;
  indoorCount: number;
  outdoorCount: number;
}

/**
 * Detailed player club info with courts, coaches, etc.
 */
export interface PlayerClubDetail {
  id: string;
  name: string;
  slug?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  location: string;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  socialLinks?: string | null;
  contactInfo?: string | null;
  openingHours?: string | null;
  logoData?: { url: string; altText?: string; thumbnailUrl?: string } | null;
  bannerData?: { url: string; altText?: string; description?: string; position?: string } | null;
  defaultCurrency?: string | null;
  timezone?: string | null;
  tags?: string | null;
  courts: PlayerClubCourt[];
  coaches: PlayerClubCoach[];
  businessHours?: PlayerClubBusinessHours[];
  gallery?: PlayerClubGalleryImage[];
}

/**
 * Player club store state
 */
interface PlayerClubState {
  // State
  clubs: PlayerClub[];
  clubsById: Record<string, PlayerClubDetail>;
  currentClub: PlayerClubDetail | null;
  loadingClubs: boolean;
  loading: boolean;
  clubsError: string | null;
  error: string | null;
  lastFetchedAt: number | null;

  // Internal inflight Promise guards (not exposed)
  _inflightFetchClubs: Promise<void> | null;
  _inflightFetchClubById: Record<string, Promise<PlayerClubDetail>> | null;

  // Actions
  setClubs: (clubs: PlayerClub[]) => void;
  setCurrentClub: (club: PlayerClubDetail | null) => void;
  clearCurrentClub: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // New idempotent, concurrency-safe methods
  fetchClubsIfNeeded: (options?: { force?: boolean; search?: string; city?: string }) => Promise<void>;
  ensureClubById: (id: string, options?: { force?: boolean }) => Promise<PlayerClubDetail>;
  invalidateClubs: () => void;

  // Selectors
  getClubById: (id: string) => PlayerClub | undefined;
  isClubSelected: (id: string) => boolean;
}

/**
 * Zustand store for managing player-visible clubs
 * This store fetches only public club data from /api/player/clubs endpoints
 */
export const usePlayerClubStore = create<PlayerClubState>((set, get) => ({
  // Initial state
  clubs: [],
  clubsById: {},
  currentClub: null,
  loadingClubs: false,
  loading: false,
  clubsError: null,
  error: null,
  lastFetchedAt: null,
  _inflightFetchClubs: null,
  _inflightFetchClubById: null,

  // State setters
  setClubs: (clubs) => set({ clubs }),

  setCurrentClub: (club) => set({ currentClub: club }),

  clearCurrentClub: () => set({ currentClub: null }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  /**
   * Fetch clubs if needed with inflight guard
   * - If !force and clubs.length > 0, returns immediately
   * - If an inflight request exists, returns that Promise
   * - Otherwise, performs a new network request
   */
  fetchClubsIfNeeded: async (options = {}) => {
    const { force = false, search = "", city = "" } = options;
    const state = get();

    // If not forcing and clubs are already loaded, return immediately
    if (!force && state.clubs.length > 0) {
      return Promise.resolve();
    }

    // If there's already an inflight request, return it
    if (state._inflightFetchClubs) {
      return state._inflightFetchClubs;
    }

    // Create new inflight request
    const inflightPromise = (async () => {
      set({ loadingClubs: true, clubsError: null });
      try {
        // Build query params
        const params = new URLSearchParams();
        if (search) {
          params.append('q', search);
        }
        if (city) {
          params.append('city', city);
        }

        const url = `/api/clubs${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url);

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch clubs" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const clubs: PlayerClub[] = await response.json();
        set({
          clubs,
          loadingClubs: false,
          clubsError: null,
          lastFetchedAt: Date.now(),
          _inflightFetchClubs: null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch clubs";
        set({
          clubsError: errorMessage,
          loadingClubs: false,
          _inflightFetchClubs: null,
        });
        throw error;
      }
    })();

    set({ _inflightFetchClubs: inflightPromise });
    return inflightPromise;
  },

  /**
   * Ensure a club is loaded by ID with inflight guard
   * - If !force and clubsById[id] exists, returns cached club
   * - If an inflight request for this ID exists, returns that Promise
   * - Otherwise, performs a new network request
   */
  ensureClubById: async (id: string, options = {}) => {
    const { force = false } = options;
    const state = get();

    // If not forcing and club is already cached, return it
    if (!force && state.clubsById[id]) {
      return Promise.resolve(state.clubsById[id]);
    }

    // If there's already an inflight request for this ID, return it
    if (state._inflightFetchClubById && id in state._inflightFetchClubById) {
      return state._inflightFetchClubById[id];
    }

    // Create new inflight request
    const inflightPromise = (async (): Promise<PlayerClubDetail> => {
      set({ loadingClubs: true, clubsError: null });
      try {
        const response = await fetch(`/api/clubs/${id}`);

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch club" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const club: PlayerClubDetail = await response.json();

        // Update clubsById cache and set as currentClub
        set((state) => {
          const newInflight = { ...(state._inflightFetchClubById || {}) };
          delete newInflight[id];

          return {
            clubsById: { ...state.clubsById, [id]: club },
            currentClub: club,
            loadingClubs: false,
            clubsError: null,
            _inflightFetchClubById: Object.keys(newInflight).length > 0 ? newInflight : null,
          };
        });

        // Also update clubs array if club exists there
        const currentClubs = get().clubs;
        const clubIndex = currentClubs.findIndex(c => c.id === id);
        if (clubIndex >= 0) {
          const updatedClubs = [...currentClubs];
          // Update with all shared fields from the detail view
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { courts: _courts, coaches: _coaches, businessHours: _businessHours, gallery: _gallery, ...publicFields } = club;
          updatedClubs[clubIndex] = {
            ...updatedClubs[clubIndex],
            ...publicFields,
          };
          set({ clubs: updatedClubs });
        }

        return club;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch club";

        // Clear inflight for this ID
        set((state) => {
          const newInflight = { ...(state._inflightFetchClubById || {}) };
          delete newInflight[id];

          return {
            clubsError: errorMessage,
            loadingClubs: false,
            _inflightFetchClubById: Object.keys(newInflight).length > 0 ? newInflight : null,
          };
        });

        throw error;
      }
    })();

    // Store inflight promise
    set((state) => ({
      _inflightFetchClubById: {
        ...(state._inflightFetchClubById || {}),
        [id]: inflightPromise,
      },
    }));

    return inflightPromise;
  },

  /**
   * Invalidate clubs cache
   * Clears clubs, clubsById, and lastFetchedAt
   */
  invalidateClubs: () => {
    set({
      clubs: [],
      clubsById: {},
      lastFetchedAt: null,
      clubsError: null,
    });
  },

  // Selector: Get club by ID from the store
  getClubById: (id: string) => {
    return get().clubs.find((club) => club.id === id);
  },

  // Selector: Check if a club is currently selected
  isClubSelected: (id: string) => {
    return get().currentClub?.id === id;
  },
}));
