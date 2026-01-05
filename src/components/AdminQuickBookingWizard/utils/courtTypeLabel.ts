/**
 * Court type localization helper
 */

// Court type constants for type safety
const COURT_TYPE_SINGLE = 'single';
const COURT_TYPE_DOUBLE = 'double';

/**
 * Get localized label for court type
 * @param type - Court type string (e.g., "single", "double", "SINGLE", "DOUBLE")
 * @param t - Translation function from useTranslations
 * @returns Localized court type label
 */
export function getCourtTypeLabel(
  type: string | null,
  t: (key: string) => string
): string {
  if (!type) return "";
  
  const normalizedType = type.toLowerCase();
  
  if (normalizedType === COURT_TYPE_SINGLE) {
    return t("court.type.single");
  } else if (normalizedType === COURT_TYPE_DOUBLE) {
    return t("court.type.double");
  }
  
  // Fallback to original type if no translation exists
  return type;
}
