/**
 * Banner data parser for Court entity
 * Helper to parse and validate court banner data JSON
 */

export interface CourtBannerData {
  url?: string;
  altText?: string;
  description?: string;
  position?: string;
  bannerAlignment?: 'top' | 'center' | 'bottom';
}

/**
 * Parse court bannerData JSON string into typed object
 */
export function parseCourtBannerData(bannerData: string | Record<string, unknown> | null | undefined): CourtBannerData | undefined {
  if (!bannerData) return undefined;

  try {
    const parsed = typeof bannerData === 'string' ? JSON.parse(bannerData) : bannerData;
    
    return {
      url: typeof parsed.url === 'string' ? parsed.url : undefined,
      altText: typeof parsed.altText === 'string' ? parsed.altText : undefined,
      description: typeof parsed.description === 'string' ? parsed.description : undefined,
      position: typeof parsed.position === 'string' ? parsed.position : undefined,
      bannerAlignment: ['top', 'center', 'bottom'].includes(parsed.bannerAlignment) ? parsed.bannerAlignment : 'center',
    };
  } catch {
    return undefined;
  }
}
