/**
 * Utility function to generate a unique guest email address
 * Uses secure random values to ensure uniqueness
 */

const GUEST_EMAIL_DOMAIN = "guest.arenaone.local";

export function generateGuestEmail(): string {
  const randomValues = new Uint32Array(2);
  crypto.getRandomValues(randomValues);
  const randomId = Array.from(randomValues, (num) => num.toString(36)).join("");
  return `guest-${Date.now()}-${randomId}@${GUEST_EMAIL_DOMAIN}`;
}
