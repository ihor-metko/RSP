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
  
  let roleLabel = "";
  let actionText = "";
  
  switch (data.role) {
    case "ORGANIZATION_OWNER":
      roleLabel = "Organization Owner";
      break;
    case "ORGANIZATION_ADMIN":
      roleLabel = "Organization Admin";
      break;
    case "CLUB_OWNER":
      roleLabel = "Club Owner";
      break;
    case "CLUB_ADMIN":
      roleLabel = "Club Admin";
      break;
    default:
      roleLabel = data.role;
  }

  if (data.userSource === "existing") {
    actionText = "The selected user will be assigned the role.";
  } else {
    actionText = "A new user will be created and an invitation email will be sent.";
  }

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
        <h3 className="im-review-section-title">User Information</h3>
        <dl className="im-review-list">
          <div className="im-review-item">
            <dt className="im-review-label">User Source:</dt>
            <dd className="im-review-value">
              {data.userSource === "existing" ? "Existing User" : "New User"}
            </dd>
          </div>
          <div className="im-review-item">
            <dt className="im-review-label">Full Name:</dt>
            <dd className="im-review-value">{data.name || "N/A"}</dd>
          </div>
          <div className="im-review-item">
            <dt className="im-review-label">Email:</dt>
            <dd className="im-review-value">{data.email || "N/A"}</dd>
          </div>
          {data.userSource === "new" && data.phone && (
            <div className="im-review-item">
              <dt className="im-review-label">Phone:</dt>
              <dd className="im-review-value">{data.phone}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="im-review-note">
        <p>
          <strong>Action:</strong> {actionText}
        </p>
      </div>
    </div>
  );
}
