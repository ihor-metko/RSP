import type { Organization } from "@/types/organization";

/**
 * Simple organization option type for dropdowns and selections
 */
export interface OrganizationOption {
  id: string;
  name: string;
  slug: string;
}

/**
 * Convert Organization to OrganizationOption
 * Useful for mapping store organizations to UI dropdown options
 */
export function toOrganizationOption(org: Organization): OrganizationOption {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
  };
}

/**
 * Convert array of Organizations to OrganizationOptions
 */
export function toOrganizationOptions(orgs: Organization[]): OrganizationOption[] {
  return orgs.map(toOrganizationOption);
}
