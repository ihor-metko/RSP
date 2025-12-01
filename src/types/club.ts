export interface Club {
  id: string;
  name: string;
  location: string;
  contactInfo: string | null;
  openingHours: string | null;
  logo: string | null;
  descriptionUA: string | null;
  descriptionEN: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  heroImage: string | null;
  galleryImages: string[];
  createdAt: string;
}

export interface ClubFormData {
  name: string;
  location: string;
  contactInfo: string;
  openingHours: string;
  logo: string;
  descriptionUA: string;
  descriptionEN: string;
  phone: string;
  email: string;
  instagram: string;
  heroImage: string;
  galleryImages: string[];
}
