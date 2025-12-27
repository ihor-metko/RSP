/**
 * Structured Address type for clubs and organizations
 */
export type Address = {
  street: string;
  city: string;
  zip?: string;
  country?: string;
  coords?: { lat: number; lng: number };
};

/**
 * Helper function to parse address from legacy string format
 * Legacy format: "street, city, zip, country"
 * 
 * @param addressString - Legacy address string
 * @returns Parsed Address object or undefined if invalid
 */
export function parseLegacyAddress(addressString: string | null | undefined): Address | undefined {
  if (!addressString || typeof addressString !== 'string') {
    return undefined;
  }

  const parts = addressString.split(',').map(p => p.trim());
  
  if (parts.length < 2) {
    // At minimum we need street and city
    return undefined;
  }

  return {
    street: parts[0] || '',
    city: parts[1] || '',
    zip: parts[2] || undefined,
    country: parts[3] || undefined,
  };
}

/**
 * Helper function to parse address from metadata
 * Supports both the new Address object and legacy individual fields
 * 
 * @param metadata - Organization or Club metadata object
 * @param legacyFields - Legacy individual fields (for backward compatibility)
 * @returns Parsed Address object or undefined
 */
export function parseAddressFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  legacyFields?: {
    street?: string;
    city?: string;
    zip?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  }
): Address | undefined {
  // First try to parse from metadata.address if it exists
  if (metadata && typeof metadata === 'object' && 'address' in metadata) {
    const addr = metadata.address;
    if (typeof addr === 'object' && addr !== null && 'street' in addr && 'city' in addr) {
      const address = addr as Record<string, unknown>;
      return {
        street: String(address.street || ''),
        city: String(address.city || ''),
        zip: address.zip ? String(address.zip) : undefined,
        country: address.country ? String(address.country) : undefined,
        coords: address.coords && typeof address.coords === 'object' && 
                'lat' in (address.coords as object) && 'lng' in (address.coords as object)
          ? { 
              lat: Number((address.coords as { lat: unknown }).lat), 
              lng: Number((address.coords as { lng: unknown }).lng) 
            }
          : undefined,
      };
    }
  }

  // Fall back to legacy metadata fields
  if (metadata && typeof metadata === 'object') {
    const street = metadata.street ? String(metadata.street) : undefined;
    const city = metadata.city ? String(metadata.city) : undefined;
    const country = metadata.country ? String(metadata.country) : undefined;
    const latitude = typeof metadata.latitude === 'number' ? metadata.latitude : undefined;
    const longitude = typeof metadata.longitude === 'number' ? metadata.longitude : undefined;

    if (street && city) {
      return {
        street,
        city,
        country,
        coords: latitude !== undefined && longitude !== undefined 
          ? { lat: latitude, lng: longitude }
          : undefined,
      };
    }
  }

  // Fall back to legacy fields parameter
  if (legacyFields && legacyFields.street && legacyFields.city) {
    return {
      street: legacyFields.street,
      city: legacyFields.city,
      zip: legacyFields.zip,
      country: legacyFields.country,
      coords: legacyFields.latitude !== undefined && legacyFields.longitude !== undefined
        ? { lat: legacyFields.latitude, lng: legacyFields.longitude }
        : undefined,
    };
  }

  return undefined;
}

/**
 * Helper function to format Address object to a display string
 * 
 * @param address - Address object
 * @returns Formatted address string
 */
export function formatAddress(address: Address | null | undefined): string {
  if (!address) {
    return '';
  }

  const parts = [
    address.street,
    address.city,
    address.zip,
    address.country,
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Helper function to convert Address object to legacy string format
 * For backward compatibility when needed
 * 
 * @param address - Address object
 * @returns Legacy address string
 */
export function addressToLegacyString(address: Address | null | undefined): string {
  return formatAddress(address);
}

/**
 * Helper function to extract coordinates from Address
 * 
 * @param address - Address object
 * @returns Coordinates object or undefined
 */
export function getAddressCoordinates(address: Address | null | undefined): { lat: number; lng: number } | undefined {
  return address?.coords;
}

/**
 * Helper function to create Address object from form data
 * 
 * @param formData - Form data object
 * @returns Address object
 */
export function createAddressFromForm(formData: {
  street: string;
  city: string;
  zip?: string;
  postalCode?: string;
  country?: string;
  latitude?: string | number;
  longitude?: string | number;
}): Address {
  const address: Address = {
    street: formData.street.trim(),
    city: formData.city.trim(),
  };

  // Support both 'zip' and 'postalCode' field names
  const zipCode = formData.zip || formData.postalCode;
  if (zipCode && String(zipCode).trim()) {
    address.zip = String(zipCode).trim();
  }

  if (formData.country && formData.country.trim()) {
    address.country = formData.country.trim();
  }

  const lat = typeof formData.latitude === 'string' ? parseFloat(formData.latitude) : formData.latitude;
  const lng = typeof formData.longitude === 'string' ? parseFloat(formData.longitude) : formData.longitude;

  if (lat !== undefined && !isNaN(Number(lat)) && lng !== undefined && !isNaN(Number(lng))) {
    address.coords = { lat: Number(lat), lng: Number(lng) };
  }

  return address;
}
