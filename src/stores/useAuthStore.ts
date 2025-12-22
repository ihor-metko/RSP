import { create } from "zustand";

/**
 * API endpoint for socket token
 */
const SOCKET_TOKEN_ENDPOINT = '/api/socket/token';

/**
 * Auth store state interface
 */
interface AuthState {
  // Socket token state
  socketToken: string | null;
  isLoadingToken: boolean;
  tokenError: string | null;
  
  // Inflight guard to prevent duplicate token requests
  tokenPromise: Promise<string | null> | null;
  
  // Actions
  getSocketToken: () => Promise<string | null>;
  clearSocketToken: () => void;
}

/**
 * Zustand store for managing authentication tokens and socket connections.
 * 
 * This store is the centralized source of truth for:
 * - Socket authentication token (with caching)
 * - Inflight request guards to prevent duplicate fetches
 * 
 * Socket Token Flow:
 * 1. Component calls getSocketToken()
 * 2. If token exists and request not in-flight, return cached token
 * 3. If request already in-flight, return the same promise (prevents duplicates)
 * 4. If no token, fetch from API and cache the result
 * 
 * @example
 * const getSocketToken = useAuthStore(state => state.getSocketToken);
 * const token = await getSocketToken(); // Cached and deduplicated
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  socketToken: null,
  isLoadingToken: false,
  tokenError: null,
  tokenPromise: null,

  /**
   * Get socket authentication token with caching and inflight guards
   * 
   * This method ensures:
   * - Only one API request happens at a time (inflight guard)
   * - Token is cached and reused until cleared
   * - Proper error handling for auth failures
   * 
   * @returns Promise<string | null> - The socket token or null on failure
   */
  getSocketToken: async () => {
    const state = get();
    
    // If we already have a token, return it immediately
    if (state.socketToken && !state.tokenError) {
      return state.socketToken;
    }
    
    // If a request is already in-flight, return the same promise
    if (state.tokenPromise) {
      return state.tokenPromise;
    }
    
    // Create new token fetch promise
    const tokenPromise = (async () => {
      set({ isLoadingToken: true, tokenError: null });
      
      try {
        const response = await fetch(SOCKET_TOKEN_ENDPOINT);
        
        if (!response.ok) {
          const errorMsg = `Failed to get socket token: ${response.status}`;
          console.error('[AuthStore]', errorMsg);
          
          // Handle authentication errors
          if (response.status === 401 || response.status === 403) {
            set({
              socketToken: null,
              isLoadingToken: false,
              tokenError: 'Unauthorized',
              tokenPromise: null,
            });
            return null;
          }
          
          set({
            socketToken: null,
            isLoadingToken: false,
            tokenError: errorMsg,
            tokenPromise: null,
          });
          return null;
        }
        
        const data = await response.json();
        const token = data.token;
        
        set({
          socketToken: token,
          isLoadingToken: false,
          tokenError: null,
          tokenPromise: null,
        });
        
        return token;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[AuthStore] Error getting socket token:', errorMsg);
        
        set({
          socketToken: null,
          isLoadingToken: false,
          tokenError: errorMsg,
          tokenPromise: null,
        });
        
        return null;
      }
    })();
    
    // Store the promise to prevent duplicate requests
    set({ tokenPromise });
    
    return tokenPromise;
  },

  /**
   * Clear the cached socket token
   * 
   * Call this on logout or when token becomes invalid
   */
  clearSocketToken: () => {
    set({
      socketToken: null,
      isLoadingToken: false,
      tokenError: null,
      tokenPromise: null,
    });
  },
}));

/**
 * Convenience hook to get socket token
 */
export const useSocketToken = () => {
  const getSocketToken = useAuthStore(state => state.getSocketToken);
  return getSocketToken;
};
