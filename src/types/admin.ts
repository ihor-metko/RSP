/**
 * Shared types for admin forms and components
 */

/**
 * Business hour entry for a single day of the week
 */
export interface BusinessHour {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

/**
 * File upload state for images
 */
export interface UploadedFile {
  url: string;
  key: string;
  file?: File;
  preview?: string;
}

/**
 * Inline court data for creation/editing
 */
export interface InlineCourt {
  id: string;
  name: string;
  type: string;
  surface: string;
  indoor: boolean;
  defaultPriceCents: number;
}
