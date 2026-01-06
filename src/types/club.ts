import { SportType } from "@/constants/sports";
import type { EntityLogoMetadata } from "@/components/ui/EntityLogo";
import type { Address } from "./address";

/**
 * Logo data structure
 */
export interface LogoData {
  url?: string;
  altText?: string;
  thumbnailUrl?: string;
  // Theme-aware logo fields (migrated from metadata)
  logoTheme?: 'light' | 'dark';
  secondLogo?: string | null;
  secondLogoTheme?: 'light' | 'dark';
}

/**
 * Banner data structure
 */
export interface BannerData {
  url?: string;
  altText?: string;
  description?: string;
  position?: 'top' | 'center' | 'bottom';
  // Banner alignment field (migrated from metadata)
  bannerAlignment?: 'top' | 'center' | 'bottom';
}

export interface Club {
  id: string;
  name: string;
  slug?: string | null;
  address?: Address | null;
  contactInfo: string | null;
  openingHours: string | null;
  logoData?: LogoData | null;
  status: string;
  supportedSports?: SportType[];
  createdAt: string;
}

/** Organization reference info for clubs */
export interface ClubOrganizationInfo {
  id: string;
  name: string;
  slug: string;
}

/** Club admin reference info */
export interface ClubAdminInfo {
  id: string;
  name: string | null;
  email: string;
}

/** Extended club info with court counts for card display */
export interface ClubWithCounts extends Club {
  organizationId: string;
  shortDescription?: string | null;
  bannerData?: BannerData | null;
  tags?: string | null;
  isPublic?: boolean;
  status: string;
  supportedSports?: SportType[];
  timezone?: string | null;
  indoorCount?: number;
  outdoorCount?: number;
  courtCount?: number;
  bookingCount?: number;
  organization?: ClubOrganizationInfo | null;
  admins?: ClubAdminInfo[];
}

export interface ClubFormData {
  name: string;
  contactInfo: string;
  openingHours: string;
  logo: string;
}

export interface ClubBusinessHours {
  id: string;
  clubId: string;
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClubSpecialHours {
  id: string;
  clubId: string;
  date: string;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClubGalleryImage {
  id: string;
  clubId: string;
  imageUrl: string;
  imageKey: string | null;
  altText: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface ClubCourt {
  id: string;
  clubId: string;
  name: string;
  slug: string | null;
  type: string | null;
  surface: string | null;
  indoor: boolean;
  isActive: boolean;
  sportType?: SportType;
  defaultPriceCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClubCoachUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface ClubCoach {
  id: string;
  userId: string;
  clubId: string | null;
  bio: string | null;
  phone: string | null;
  createdAt: string;
  user: ClubCoachUser;
}

export interface ClubDetail {
  id: string;
  organizationId: string;
  organization?: ClubOrganizationInfo;
  name: string;
  slug: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  address?: Address | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  socialLinks: string | null;
  contactInfo: string | null;
  openingHours: string | null;
  logoData?: LogoData | null;
  bannerData?: BannerData | null;
  defaultCurrency: string | null;
  timezone: string | null;
  isPublic: boolean;
  status: string;
  tags: string | null;
  supportedSports?: SportType[];
  createdAt: string;
  updatedAt: string;
  courts: ClubCourt[];
  coaches: ClubCoach[];
  gallery: ClubGalleryImage[];
  businessHours: ClubBusinessHours[];
  specialHours?: ClubSpecialHours[];
}

/**
 * Payload for creating a new club
 */
export interface CreateClubPayload {
  organizationId: string;
  name: string;
  slug?: string;
  shortDescription: string;
  longDescription?: string;
  address?: Address | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  socialLinks?: string | null;
  defaultCurrency?: string;
  timezone?: string;
  isPublic?: boolean;
  tags?: string | null;
  supportedSports?: SportType[];
  logoData?: LogoData;
  bannerData?: BannerData;
  gallery?: Array<{
    url: string;
    key: string;
  }>;
  businessHours?: Array<{
    dayOfWeek: number;
    openTime: string | null;
    closeTime: string | null;
    isClosed: boolean;
  }>;
  courts?: Array<{
    name: string;
    type: string | null;
    surface: string | null;
    indoor: boolean;
    sportType?: SportType;
    defaultPriceCents: number;
  }>;
}

/**
 * Payload for updating a club
 */
export interface UpdateClubPayload {
  name?: string;
  contactInfo?: string | null;
  openingHours?: string | null;
  logoData?: LogoData | null;
  bannerData?: BannerData | null;
  supportedSports?: SportType[];
}

/**
 * Club metadata type extending EntityLogoMetadata with banner alignment
 */
export interface ClubMetadata extends EntityLogoMetadata {
  /** Banner image vertical alignment */
  bannerAlignment?: 'top' | 'center' | 'bottom';
}

/**
 * Helper function to parse club metadata from JSON string
 */
export function parseClubMetadata(metadataString: string | null | undefined): ClubMetadata | undefined {
  if (!metadataString) {
    return undefined;
  }

  try {
    return JSON.parse(metadataString) as ClubMetadata;
  } catch {
    // Invalid JSON
    return undefined;
  }
}

/**
 * Helper function to parse logo data from JSON string
 *
 * @param logoData - JSON string from database
 * @returns Parsed logo data or undefined if invalid
 */
export function parseLogoData(logoData: string | null | undefined): LogoData | undefined {
  if (!logoData) {
    return undefined;
  }

  try {
    return JSON.parse(logoData) as LogoData;
  } catch {
    return undefined;
  }
}

/**
 * Helper function to parse banner data from JSON string
 *
 * @param bannerData - JSON string from database
 * @returns Parsed banner data or undefined if invalid
 */
export function parseBannerData(bannerData: string | null | undefined): BannerData | undefined {
  if (!bannerData) {
    return undefined;
  }

  try {
    return JSON.parse(bannerData) as BannerData;
  } catch {
    return undefined;
  }
}
