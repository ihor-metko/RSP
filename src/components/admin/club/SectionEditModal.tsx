"use client";

import { useTranslations } from "next-intl";
import { Modal, Button } from "@/components/ui";
import "./SectionEditModal.css";

interface SectionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSave: () => void;
  isSaving?: boolean;
  children: React.ReactNode;
}

export function SectionEditModal({
  isOpen,
  onClose,
  title,
  onSave,
  isSaving = false,
  children,
}: SectionEditModalProps) {
  const t = useTranslations("clubDetail");
  const tCommon = useTranslations("common");
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="im-section-edit-modal">
        <div className="im-section-edit-modal-content">{children}</div>
        <div className="im-section-edit-modal-actions">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? t("saving") : t("saveChanges")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
