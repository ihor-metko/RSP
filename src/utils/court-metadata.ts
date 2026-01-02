/**
 * Court metadata parser
 * Helper to parse and validate court metadata JSON
 * 
 * Note: Banner alignment is now stored in bannerData.position, not in metadata
 * 
 * This type may be extended in the future with court-specific metadata fields.
 * For now, it's an empty object that can hold any court-specific metadata.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CourtMetadata {
  // Empty for now - can be extended with court-specific metadata in the future
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
