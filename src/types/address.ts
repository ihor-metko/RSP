/**
 * Address types for Club and Organization entities
 */

/**
 * Dedicated address object structure
 * Used by both Club and Organization entities
 */
export interface Address {
  country?: string | null;
  city?: string | null;
  street?: string | null;
  postalCode?: string | null;
  region?: string | null;
  lat?: number | null;
  lng?: number | null;
  formattedAddress?: string | null;
}

/**
 * Helper function to parse address from JSON string
 * 
 * @param addressData - JSON string from database
 * @returns Parsed address object or undefined if invalid
 */
export function parseAddress(addressData: string | null | undefined): Address | undefined {
  if (!addressData) {
    return undefined;
  }

  try {
    return JSON.parse(addressData) as Address;
  } catch {
    return undefined;
  }
}

/**
 * Helper function to create a formatted address string from address object
 * 
 * @param address - Address object
 * @returns Formatted address string
 */
export function formatAddress(address: Address | null | undefined): string {
  if (!address) {
    return "";
  }

  // Use formattedAddress if available
  if (address.formattedAddress) {
    return address.formattedAddress;
  }

  // Otherwise, construct from available fields
  const parts = [
    address.street,
    address.city,
    address.region,
    address.postalCode,
    address.country,
  ].filter(Boolean);

  return parts.join(", ");
}

/**
 * Helper function to get location display (city, country)
 * 
 * @param address - Address object
 * @returns Location display string (e.g., "New York, USA")
 */
export function getLocationDisplay(address: Address | null | undefined): string {
  if (!address) {
    return "";
  }

  const parts = [address.city, address.country].filter(Boolean);
  return parts.join(", ");
}
