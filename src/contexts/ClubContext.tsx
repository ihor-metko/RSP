'use client';

/**
 * Club Context
 * 
 * Tracks the currently active/selected club across the application.
 * This is used by the Socket.IO connection to join the correct club room.
 * 
 * Features:
 * - Persists selected clubId in localStorage
 * - Provides setActiveClubId to update the current club
 * - Used by SocketProvider to determine which club room to join
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Club Context interface
 */
interface ClubContextValue {
  /**
   * Currently active club ID (null if none selected)
   */
  activeClubId: string | null;

  /**
   * Set the active club ID
   */
  setActiveClubId: (clubId: string | null) => void;
}

/**
 * Club Context
 */
const ClubContext = createContext<ClubContextValue | undefined>(undefined);

/**
 * Club Provider Props
 */
interface ClubProviderProps {
  children: React.ReactNode;
}

/**
 * Club Provider
 * 
 * Manages the currently active club for socket room targeting.
 * Persists the selection in localStorage.
 * 
 * @example
 * ```tsx
 * <ClubProvider>
 *   <App />
 * </ClubProvider>
 * ```
 */
export function ClubProvider({ children }: ClubProviderProps) {
  const [activeClubId, setActiveClubIdState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('activeClubId');
    if (stored) {
      setActiveClubIdState(stored);
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage when changed
  const setActiveClubId = useCallback((clubId: string | null) => {
    setActiveClubIdState(clubId);
    if (clubId) {
      localStorage.setItem('activeClubId', clubId);
    } else {
      localStorage.removeItem('activeClubId');
    }
    console.log('[ClubContext] Active club changed:', clubId);
  }, []);

  const value: ClubContextValue = useMemo(
    () => ({
      activeClubId: isHydrated ? activeClubId : null,
      setActiveClubId,
    }),
    [activeClubId, setActiveClubId, isHydrated]
  );

  return (
    <ClubContext.Provider value={value}>
      {children}
    </ClubContext.Provider>
  );
}

/**
 * Hook to access the active club context
 * 
 * @throws Error if used outside of ClubProvider
 * 
 * @example
 * ```tsx
 * const { activeClubId, setActiveClubId } = useActiveClub();
 * 
 * // Set active club when navigating to operations page
 * setActiveClubId(clubId);
 * ```
 */
export function useActiveClub(): ClubContextValue {
  const context = useContext(ClubContext);
  
  if (context === undefined) {
    throw new Error('useActiveClub must be used within a ClubProvider');
  }
  
  return context;
}
