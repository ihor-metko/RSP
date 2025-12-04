/**
 * Role-based redirect utilities for the application.
 * Uses the new isRoot field for root admin identification.
 */

/**
 * Get the homepage path for a user based on their isRoot status.
 * Root admins go to the admin dashboard, regular users go to the home page.
 *
 * @param isRoot Whether the user is a root admin
 * @returns The homepage path
 */
export function getRoleHomepage(isRoot: boolean | undefined): string {
  if (isRoot) {
    return "/admin/dashboard";
  }
  return "/";
}
