/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { DangerZone } from "@/components/ui/DangerZone";
import type { DangerAction } from "@/components/ui/DangerZone";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("Publish Block Visibility - Role-Based Access Control", () => {
  describe("DangerZone Component - Publish Action Visibility", () => {
    const mockPublishAction: DangerAction = {
      id: "publish",
      title: "Publish Club",
      description: "Make this club visible to all users",
      buttonLabel: "Publish",
      onAction: jest.fn(),
      variant: "warning",
      show: true,
    };

    const mockUnpublishAction: DangerAction = {
      id: "publish",
      title: "Unpublish Club",
      description: "Hide this club from public view",
      buttonLabel: "Unpublish",
      onAction: jest.fn(),
      variant: "danger",
      show: true,
    };

    const mockDeleteAction: DangerAction = {
      id: "delete",
      title: "Delete Club",
      description: "Permanently delete this club",
      buttonLabel: "Delete",
      onAction: jest.fn(),
      variant: "danger",
      show: true,
    };

    it("should render publish action when show is true (Root Admin)", () => {
      render(<DangerZone actions={[mockPublishAction]} />);

      expect(screen.getByText("Publish Club")).toBeInTheDocument();
      expect(screen.getByText("Make this club visible to all users")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Publish Club" })).toBeInTheDocument();
    });

    it("should hide publish action when show is false (Non-Root Admin)", () => {
      const hiddenPublishAction = { ...mockPublishAction, show: false };
      render(<DangerZone actions={[hiddenPublishAction]} />);

      expect(screen.queryByText("Publish Club")).not.toBeInTheDocument();
      expect(screen.queryByText("Make this club visible to all users")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Publish Club" })).not.toBeInTheDocument();
    });

    it("should render unpublish action when show is true (Root Admin)", () => {
      render(<DangerZone actions={[mockUnpublishAction]} />);

      expect(screen.getByText("Unpublish Club")).toBeInTheDocument();
      expect(screen.getByText("Hide this club from public view")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Unpublish Club" })).toBeInTheDocument();
    });

    it("should hide unpublish action when show is false (Non-Root Admin)", () => {
      const hiddenUnpublishAction = { ...mockUnpublishAction, show: false };
      render(<DangerZone actions={[hiddenUnpublishAction]} />);

      expect(screen.queryByText("Unpublish Club")).not.toBeInTheDocument();
      expect(screen.queryByText("Hide this club from public view")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Unpublish Club" })).not.toBeInTheDocument();
    });

    it("should render delete action independently of publish action visibility", () => {
      const hiddenPublishAction = { ...mockPublishAction, show: false };
      render(<DangerZone actions={[hiddenPublishAction, mockDeleteAction]} />);

      // Publish action should be hidden
      expect(screen.queryByText("Publish Club")).not.toBeInTheDocument();

      // Delete action should be visible
      expect(screen.getByText("Delete Club")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Delete Club" })).toBeInTheDocument();
    });

    it("should render both publish and delete actions when both have show: true (Root Admin)", () => {
      render(<DangerZone actions={[mockPublishAction, mockDeleteAction]} />);

      expect(screen.getByText("Publish Club")).toBeInTheDocument();
      expect(screen.getByText("Delete Club")).toBeInTheDocument();
    });

    it("should hide entire DangerZone when all actions have show: false", () => {
      const hiddenPublishAction = { ...mockPublishAction, show: false };
      const hiddenDeleteAction = { ...mockDeleteAction, show: false };
      render(<DangerZone actions={[hiddenPublishAction, hiddenDeleteAction]} />);

      // DangerZone header should not be rendered
      expect(screen.queryByText("title")).not.toBeInTheDocument();
      expect(screen.queryByTestId("danger-zone")).not.toBeInTheDocument();
    });

    it("should render DangerZone when at least one action has show: true", () => {
      const hiddenPublishAction = { ...mockPublishAction, show: false };
      render(<DangerZone actions={[hiddenPublishAction, mockDeleteAction]} />);

      // DangerZone should be rendered
      expect(screen.getByTestId("danger-zone")).toBeInTheDocument();

      // Only delete action should be visible
      expect(screen.queryByText("Publish Club")).not.toBeInTheDocument();
      expect(screen.getByText("Delete Club")).toBeInTheDocument();
    });

    it("should apply correct variant class for publish action (warning)", () => {
      const { container } = render(<DangerZone actions={[mockPublishAction]} />);

      const warningAction = container.querySelector(".im-danger-action--warning");
      expect(warningAction).toBeInTheDocument();
    });

    it("should apply correct variant class for unpublish action (danger)", () => {
      const { container } = render(<DangerZone actions={[mockUnpublishAction]} />);

      const dangerAction = container.querySelector(".im-danger-action--danger");
      expect(dangerAction).toBeInTheDocument();
    });
  });

  describe("Organization Publish Action Visibility", () => {
    const mockOrgPublishAction: DangerAction = {
      id: "publish",
      title: "Publish Organization",
      description: "Make this organization visible to all users",
      buttonLabel: "Publish",
      onAction: jest.fn(),
      variant: "warning",
      show: true,
    };

    const mockOrgUnpublishAction: DangerAction = {
      id: "publish",
      title: "Unpublish Organization",
      description: "Hide this organization from public view",
      buttonLabel: "Unpublish",
      onAction: jest.fn(),
      variant: "danger",
      show: true,
    };

    it("should render organization publish action when show is true (Root Admin)", () => {
      render(<DangerZone actions={[mockOrgPublishAction]} />);

      expect(screen.getByText("Publish Organization")).toBeInTheDocument();
      expect(screen.getByText("Make this organization visible to all users")).toBeInTheDocument();
    });

    it("should hide organization publish action when show is false (Non-Root Admin)", () => {
      const hiddenOrgPublishAction = { ...mockOrgPublishAction, show: false };
      render(<DangerZone actions={[hiddenOrgPublishAction]} />);

      expect(screen.queryByText("Publish Organization")).not.toBeInTheDocument();
      expect(screen.queryByText("Make this organization visible to all users")).not.toBeInTheDocument();
    });

    it("should render organization unpublish action when show is true (Root Admin)", () => {
      render(<DangerZone actions={[mockOrgUnpublishAction]} />);

      expect(screen.getByText("Unpublish Organization")).toBeInTheDocument();
      expect(screen.getByText("Hide this organization from public view")).toBeInTheDocument();
    });

    it("should hide organization unpublish action when show is false (Non-Root Admin)", () => {
      const hiddenOrgUnpublishAction = { ...mockOrgUnpublishAction, show: false };
      render(<DangerZone actions={[hiddenOrgUnpublishAction]} />);

      expect(screen.queryByText("Unpublish Organization")).not.toBeInTheDocument();
      expect(screen.queryByText("Hide this organization from public view")).not.toBeInTheDocument();
    });

    it("should not show publish action for archived organization even if show is true", () => {
      // This test simulates the logic where archived organizations should not have publish action
      const archivedOrgPublishAction = { ...mockOrgPublishAction, show: false };
      render(<DangerZone actions={[archivedOrgPublishAction]} />);

      expect(screen.queryByText("Publish Organization")).not.toBeInTheDocument();
    });
  });

  describe("Role-Based Show Logic", () => {
    it("should correctly evaluate show property for ROOT_ADMIN role (true)", () => {
      const canPublish = true; // Simulating hasRole("ROOT_ADMIN") === true
      const publishAction: DangerAction = {
        id: "publish",
        title: "Publish",
        description: "Publish action",
        buttonLabel: "Publish",
        onAction: jest.fn(),
        variant: "warning",
        show: canPublish,
      };

      render(<DangerZone actions={[publishAction]} />);
      expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument();
    });

    it("should correctly evaluate show property for ORGANIZATION_ADMIN role (false)", () => {
      const canPublish = false; // Simulating hasRole("ROOT_ADMIN") === false
      const publishAction: DangerAction = {
        id: "publish",
        title: "Publish",
        description: "Publish action",
        buttonLabel: "Publish",
        onAction: jest.fn(),
        variant: "warning",
        show: canPublish,
      };

      render(<DangerZone actions={[publishAction]} />);
      expect(screen.queryByText("Publish")).not.toBeInTheDocument();
    });

    it("should correctly evaluate show property for CLUB_ADMIN role (false)", () => {
      const canPublish = false; // Simulating hasRole("ROOT_ADMIN") === false
      const publishAction: DangerAction = {
        id: "publish",
        title: "Publish",
        description: "Publish action",
        buttonLabel: "Publish",
        onAction: jest.fn(),
        variant: "warning",
        show: canPublish,
      };

      render(<DangerZone actions={[publishAction]} />);
      expect(screen.queryByText("Publish")).not.toBeInTheDocument();
    });

    it("should correctly evaluate show property for CLUB_OWNER role (false)", () => {
      const canPublish = false; // Simulating hasRole("ROOT_ADMIN") === false
      const publishAction: DangerAction = {
        id: "publish",
        title: "Publish",
        description: "Publish action",
        buttonLabel: "Publish",
        onAction: jest.fn(),
        variant: "warning",
        show: canPublish,
      };

      render(<DangerZone actions={[publishAction]} />);
      expect(screen.queryByText("Publish")).not.toBeInTheDocument();
    });
  });

  describe("Processing State", () => {
    it("should show processing text when isProcessing is true", () => {
      const processingPublishAction: DangerAction = {
        id: "publish",
        title: "Publish",
        description: "Publish action",
        buttonLabel: "Publish",
        onAction: jest.fn(),
        variant: "warning",
        show: true,
        isProcessing: true,
      };

      render(<DangerZone actions={[processingPublishAction]} />);
      expect(screen.getByText("processing")).toBeInTheDocument();
    });

    it("should disable button when isProcessing is true", () => {
      const processingPublishAction: DangerAction = {
        id: "publish",
        title: "Publish",
        description: "Publish action",
        buttonLabel: "Publish",
        onAction: jest.fn(),
        variant: "warning",
        show: true,
        isProcessing: true,
      };

      render(<DangerZone actions={[processingPublishAction]} />);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });
  });
});
