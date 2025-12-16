"use client";

import type { AdminCreationData, OrganizationOption, ClubOption } from "@/types/adminWizard";

interface ReviewStepProps {
  data: AdminCreationData;
  organizations: OrganizationOption[];
  clubs: ClubOption[];
}

export function ReviewStep({
  data,
  organizations,
  clubs,
}: ReviewStepProps) {
  const organization = organizations.find(org => org.id === data.organizationId);
  const club = data.clubId ? clubs.find(c => c.id === data.clubId) : null;
  const roleLabel = data.role === "ORGANIZATION_ADMIN" ? "Organization Admin" : "Club Admin";

  return (
    <div className="im-wizard-step-content">
      <div className="im-review-section">
        <h3 className="im-review-section-title">Admin Context</h3>
        <dl className="im-review-list">
          <div className="im-review-item">
            <dt className="im-review-label">Organization:</dt>
            <dd className="im-review-value">{organization?.name || "Not selected"}</dd>
          </div>
          {club && (
            <div className="im-review-item">
              <dt className="im-review-label">Club:</dt>
              <dd className="im-review-value">{club.name}</dd>
            </div>
          )}
          <div className="im-review-item">
            <dt className="im-review-label">Role:</dt>
            <dd className="im-review-value">
              <span className="im-review-badge im-review-badge--role">
                {roleLabel}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="im-review-section">
        <h3 className="im-review-section-title">Admin Details</h3>
        <dl className="im-review-list">
          <div className="im-review-item">
            <dt className="im-review-label">Full Name:</dt>
            <dd className="im-review-value">{data.name}</dd>
          </div>
          <div className="im-review-item">
            <dt className="im-review-label">Email:</dt>
            <dd className="im-review-value">{data.email}</dd>
          </div>
          <div className="im-review-item">
            <dt className="im-review-label">Phone:</dt>
            <dd className="im-review-value">{data.phone}</dd>
          </div>
        </dl>
      </div>

      <div className="im-review-note">
        <p>
          <strong>Note:</strong> An invitation email will be sent to the admin with instructions to set up their account.
        </p>
      </div>
    </div>
  );
}
