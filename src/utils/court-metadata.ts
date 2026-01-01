/**
 * Court metadata parser
 * Helper to parse and validate court metadata JSON
 */

export interface CourtMetadata {
  bannerAlignment?: 'top' | 'center' | 'bottom';
}

/**
 * Parse court metadata JSON string into typed object
 */
export function parseCourtMetadata(metadata: string | Record<string, unknown> | null | undefined): CourtMetadata | undefined {
  if (!metadata) return undefined;

  try {
    const parsed = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    
    return {
      bannerAlignment: parsed.bannerAlignment === 'top' || parsed.bannerAlignment === 'bottom' 
        ? parsed.bannerAlignment 
        : 'center',
    };
  } catch {
    return undefined;
  }
}
