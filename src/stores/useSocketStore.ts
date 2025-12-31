import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '@/types/socket';

/**
 * Typed Socket.IO client
 */
type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Socket store state interface
 */
interface SocketState {
  // Notification Socket (always active when authenticated)
  notificationSocket: TypedSocket | null;
  notificationConnected: boolean;
  
  // Booking Socket (active when club is selected and user is admin)
  bookingSocket: TypedSocket | null;
  bookingConnected: boolean;
  activeClubId: string | null;
  
  // Socket token management
  socketToken: string | null;
  isLoadingToken: boolean;
  tokenError: string | null;
  tokenPromise: Promise<string | null> | null;
  
  // Actions
  initializeNotificationSocket: (token: string) => void;
  disconnectNotificationSocket: () => void;
  initializeBookingSocket: (token: string, clubId: string) => void;
  disconnectBookingSocket: () => void;
  setActiveClubId: (clubId: string | null) => void;
  getSocketToken: () => Promise<string | null>;
  clearSocketToken: () => void;
}

/**
 * API endpoint for socket token
 */
const SOCKET_TOKEN_ENDPOINT = '/api/socket/token';

/**
 * Centralized Socket Store
 * 
 * Manages all WebSocket connections and their state in a single Zustand store.
 * This ensures:
 * - Single source of truth for socket state
 * - No duplicate connections
 * - Reactive state for components
 * - Automatic reconnection handling
 * - Development mode (React StrictMode) safety
 * 
 * Architecture:
 * - NotificationSocket: Always active during user session (all roles)
 * - BookingSocket: Active only when club is selected (admin roles only)
 * - Socket token: Cached and deduplicated
 * 
 * @example
 * ```tsx
 * // Initialize notification socket
 * const initializeNotificationSocket = useSocketStore(state => state.initializeNotificationSocket);
 * const token = await getSocketToken();
 * if (token) initializeNotificationSocket(token);
 * 
 * // Get socket instance
 * const notificationSocket = useSocketStore(state => state.notificationSocket);
 * const isConnected = useSocketStore(state => state.notificationConnected);
 * ```
 */
export const useSocketStore = create<SocketState>((set, get) => ({
  // Initial state
  notificationSocket: null,
  notificationConnected: false,
  bookingSocket: null,
  bookingConnected: false,
  activeClubId: null,
  socketToken: null,
  isLoadingToken: false,
  tokenError: null,
  tokenPromise: null,

  /**
   * Initialize NotificationSocket connection
   * 
   * Creates a persistent notification socket that remains active
   * throughout the user session. Safe to call multiple times - will
   * only create one instance.
   * 
   * @param token - Socket authentication token
   */
  initializeNotificationSocket: (token: string) => {
    const state = get();
    
    // Prevent duplicate initialization
    if (state.notificationSocket) {
      console.log('[SocketStore] NotificationSocket already initialized');
      return;
    }

    console.log('[SocketStore] Initializing NotificationSocket');

    // Create socket instance
    const socket: TypedSocket = io({
      path: '/socket.io',
      auth: {
        token,
      },
    });

    // Connection event handlers
    socket.on('connect', () => {
      console.log('[SocketStore] NotificationSocket connected:', socket.id);
      set({ notificationConnected: true });
    });

    socket.on('disconnect', (reason) => {
      console.log('[SocketStore] NotificationSocket disconnected:', reason);
      set({ notificationConnected: false });
    });

    socket.on('connect_error', (error) => {
      console.error('[SocketStore] NotificationSocket error:', error.message);
      if (error.message.includes('Authentication')) {
        console.error('[SocketStore] Authentication failed, disconnecting');
        socket.disconnect();
      }
    });

    socket.io.on('reconnect', (attemptNumber) => {
      console.log('[SocketStore] NotificationSocket reconnected after', attemptNumber, 'attempts');
      set({ notificationConnected: true });
    });

    set({ notificationSocket: socket });
  },

  /**
   * Disconnect NotificationSocket
   * 
   * Cleans up the notification socket connection.
   * Call this on logout or when user session ends.
   */
  disconnectNotificationSocket: () => {
    const state = get();
    
    if (!state.notificationSocket) {
      return;
    }

    console.log('[SocketStore] Disconnecting NotificationSocket');

    const socket = state.notificationSocket;
    socket.off('connect');
    socket.off('disconnect');
    socket.off('connect_error');
    socket.io.off('reconnect');
    socket.disconnect();

    set({
      notificationSocket: null,
      notificationConnected: false,
    });
  },

  /**
   * Initialize BookingSocket connection
   * 
   * Creates a club-specific booking socket. Safe to call multiple times
   * with same clubId - will only create one instance per club.
   * 
   * @param token - Socket authentication token
   * @param clubId - Club ID for room targeting
   */
  initializeBookingSocket: (token: string, clubId: string) => {
    const state = get();
    
    // If same club socket already exists, skip
    if (state.bookingSocket && state.activeClubId === clubId) {
      console.log('[SocketStore] BookingSocket already initialized for club:', clubId);
      return;
    }

    // If different club, disconnect existing socket first
    if (state.bookingSocket && state.activeClubId !== clubId) {
      get().disconnectBookingSocket();
    }

    console.log('[SocketStore] Initializing BookingSocket for club:', clubId);

    // Create socket instance
    const socket: TypedSocket = io({
      path: '/socket.io',
      auth: {
        token,
        clubId,
      },
    });

    // Connection event handlers
    socket.on('connect', () => {
      console.log('[SocketStore] BookingSocket connected:', socket.id, 'for club:', clubId);
      set({ bookingConnected: true });
    });

    socket.on('disconnect', (reason) => {
      console.log('[SocketStore] BookingSocket disconnected:', reason);
      set({ bookingConnected: false });
    });

    socket.on('connect_error', (error) => {
      console.error('[SocketStore] BookingSocket error:', error.message);
      if (error.message.includes('Authentication')) {
        console.error('[SocketStore] Authentication failed, disconnecting');
        socket.disconnect();
      }
    });

    socket.io.on('reconnect', (attemptNumber) => {
      console.log('[SocketStore] BookingSocket reconnected after', attemptNumber, 'attempts');
      set({ bookingConnected: true });
    });

    set({
      bookingSocket: socket,
      activeClubId: clubId,
    });
  },

  /**
   * Disconnect BookingSocket
   * 
   * Cleans up the booking socket connection.
   * Call this when leaving club operations page or changing clubs.
   */
  disconnectBookingSocket: () => {
    const state = get();
    
    if (!state.bookingSocket) {
      return;
    }

    console.log('[SocketStore] Disconnecting BookingSocket');

    const socket = state.bookingSocket;
    socket.off('connect');
    socket.off('disconnect');
    socket.off('connect_error');
    socket.io.off('reconnect');
    socket.disconnect();

    set({
      bookingSocket: null,
      bookingConnected: false,
      activeClubId: null,
    });
  },

  /**
   * Set active club ID
   * 
   * This is a convenience method that can be used to track
   * which club is currently active. The actual socket connection
   * is managed separately via initializeBookingSocket/disconnectBookingSocket.
   * 
   * @param clubId - Club ID or null to clear
   */
  setActiveClubId: (clubId: string | null) => {
    set({ activeClubId: clubId });
  },

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
          console.error('[SocketStore]', errorMsg);
          
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
        
        // Validate response structure
        if (!data || typeof data.token !== 'string' || !data.token.trim()) {
          const errorMsg = 'Invalid token response from server';
          console.error('[SocketStore]', errorMsg);
          set({
            socketToken: null,
            isLoadingToken: false,
            tokenError: errorMsg,
            tokenPromise: null,
          });
          return null;
        }
        
        const token = data.token;
        
        set({
          socketToken: token,
          isLoadingToken: false,
          tokenError: null,
          tokenPromise: null,
        });
        
        return token;
      } catch (error) {
        // Handle network failures and other errors
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[SocketStore] Error getting socket token:', errorMsg);
        
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
