export interface Club {
  id: string;
  name: string;
  location: string;
  contactInfo: string | null;
  openingHours: string | null;
  logo: string | null;
  createdAt: string;
}

/** Organization reference info for clubs */
export interface ClubOrganizationInfo {
  id: string;
  name: string;
}

/** Club admin reference info */
export interface ClubAdminInfo {
  id: string;
  name: string | null;
  email: string;
}

/** Extended club info with court counts for card display */
export interface ClubWithCounts extends Club {
  shortDescription?: string | null;
  city?: string | null;
  heroImage?: string | null;
  tags?: string | null;
  isPublic?: boolean;
  indoorCount?: number;
  outdoorCount?: number;
  courtCount?: number;
  bookingCount?: number;
  organization?: ClubOrganizationInfo | null;
  admins?: ClubAdminInfo[];
}

export interface ClubFormData {
  name: string;
  location: string;
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
  name: string;
  slug: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  location: string;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  socialLinks: string | null;
  contactInfo: string | null;
  openingHours: string | null;
  logo: string | null;
  heroImage: string | null;
  defaultCurrency: string | null;
  timezone: string | null;
  isPublic: boolean;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
  courts: ClubCourt[];
  coaches: ClubCoach[];
  gallery: ClubGalleryImage[];
  businessHours: ClubBusinessHours[];
  specialHours: ClubSpecialHours[];
}
