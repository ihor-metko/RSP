"use client";

import { useTranslations } from "next-intl";
import { Select, Input, Button } from "@/components/ui";
import type { WizardUser, WizardStepUser } from "./types";

interface Step5UserProps {
  data: WizardStepUser;
  users: WizardUser[];
  isLoading: boolean;
  error: string | null;
  onSelect: (user: WizardUser) => void;
  onToggleCreateNew: () => void;
  onToggleGuest: () => void;
  onNewUserChange: (field: "name" | "email", value: string) => void;
  onGuestNameChange: (name: string) => void;
  onCreateUser: () => void;
  isCreatingUser: boolean;
}

export function Step5User({
  data,
  users,
  isLoading,
  error,
  onSelect,
  onToggleCreateNew,
  onToggleGuest,
  onNewUserChange,
  onGuestNameChange,
  onCreateUser,
  isCreatingUser,
}: Step5UserProps) {
  const t = useTranslations();

  const handleUserChange = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      onSelect(user);
    }
  };

  return (
    <div className="rsp-admin-wizard-step">
      <div className="rsp-admin-wizard-step-header">
        <h3 className="rsp-admin-wizard-step-title">
          {t("adminWizard.selectUser")}
        </h3>
        <p className="rsp-admin-wizard-step-description">
          {t("adminWizard.selectUserDescription")}
        </p>
      </div>

      <div className="rsp-admin-wizard-step-content">
        {error ? (
          <div className="rsp-admin-wizard-error" role="alert">
            {error}
          </div>
        ) : null}

        {data.isGuestBooking ? (
          <div className="rsp-admin-wizard-create-user-form">
            <h4 className="rsp-admin-wizard-form-title">
              {t("adminWizard.guestBookingDetails")}
            </h4>
            <p className="rsp-admin-wizard-step-description">
              {t("adminWizard.guestBookingDescription")}
            </p>
            <Input
              id="guest-name"
              label={t("common.name")}
              type="text"
              value={data.guestName}
              onChange={(e) => onGuestNameChange(e.target.value)}
              placeholder={t("adminWizard.enterGuestName")}
              required
            />
            <div className="rsp-admin-wizard-form-actions">
              <Button
                onClick={onToggleGuest}
                variant="outline"
              >
                {t("common.back")}
              </Button>
            </div>
          </div>
        ) : !data.isCreatingNewUser ? (
          <>
            {isLoading ? (
              <div className="rsp-admin-wizard-loading">
                <div className="rsp-admin-wizard-loading-spinner" />
                <span>{t("common.loading")}</span>
              </div>
            ) : users.length === 0 ? (
              <div className="rsp-admin-wizard-empty">
                <p>{t("adminWizard.noUsersAvailable")}</p>
                <div className="rsp-admin-wizard-form-actions">
                  <Button onClick={onToggleCreateNew} variant="primary">
                    {t("adminWizard.createNewUser")}
                  </Button>
                  <Button onClick={onToggleGuest} variant="outline">
                    {t("adminWizard.bookForGuest")}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Select
                  id="user-select"
                  label={t("adminWizard.existingUser")}
                  options={users.map((user) => ({
                    value: user.id,
                    label: user.name
                      ? `${user.name} (${user.email})`
                      : user.email,
                  }))}
                  value={data.selectedUserId || ""}
                  onChange={handleUserChange}
                  placeholder={t("adminWizard.selectUserPlaceholder")}
                />
                <div className="rsp-admin-wizard-divider">
                  <span>{t("common.or")}</span>
                </div>
                <div className="rsp-admin-wizard-form-actions">
                  <Button
                    onClick={onToggleCreateNew}
                    variant="outline"
                    className="rsp-admin-wizard-create-user-btn"
                  >
                    {t("adminWizard.createNewUser")}
                  </Button>
                  <Button
                    onClick={onToggleGuest}
                    variant="outline"
                    className="rsp-admin-wizard-create-user-btn"
                  >
                    {t("adminWizard.bookForGuest")}
                  </Button>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="rsp-admin-wizard-create-user-form">
            <h4 className="rsp-admin-wizard-form-title">
              {t("adminWizard.newUserDetails")}
            </h4>
            <Input
              id="new-user-name"
              label={t("common.name")}
              type="text"
              value={data.newUserName}
              onChange={(e) => onNewUserChange("name", e.target.value)}
              placeholder={t("adminWizard.enterUserName")}
              disabled={isCreatingUser}
            />
            <Input
              id="new-user-email"
              label={t("common.email")}
              type="email"
              value={data.newUserEmail}
              onChange={(e) => onNewUserChange("email", e.target.value)}
              placeholder={t("adminWizard.enterUserEmail")}
              required
              disabled={isCreatingUser}
            />
            <div className="rsp-admin-wizard-form-actions">
              <Button
                onClick={onToggleCreateNew}
                variant="outline"
                disabled={isCreatingUser}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={onCreateUser}
                variant="primary"
                disabled={!data.newUserEmail || isCreatingUser}
              >
                {isCreatingUser
                  ? t("adminWizard.creatingUser")
                  : t("adminWizard.createUser")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
