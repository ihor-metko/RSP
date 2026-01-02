/**
 * Court metadata parser
 * Helper to parse and validate court metadata JSON
 * 
 * Note: Banner alignment is now stored in bannerData.position, not in metadata
 */

export interface CourtMetadata {
  // Banner alignment removed - now stored in bannerData.position
}

/**
 * Parse court metadata JSON string into typed object
 */
export function parseCourtMetadata(metadata: string | Record<string, unknown> | null | undefined): CourtMetadata | undefined {
  if (!metadata) return undefined;

  try {
    const parsed = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    
    // Return empty object for now - can be extended with other court-specific metadata
    return parsed as CourtMetadata;
  } catch {
    return undefined;
  }
}
