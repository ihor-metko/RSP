/**
 * @jest-environment node
 */
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import {
  initializeMockData,
  getMockOrganizations,
  getMockClubs,
  getMockMemberships,
  getMockAuditLogs,
  findOrganizationById,
  findOrganizationBySlug,
  createMockOrganization,
  updateMockOrganization,
  archiveMockOrganization,
  restoreMockOrganization,
  deleteMockOrganization,
  createMockMembership,
  updateMockMembership,
  findMembershipByUserAndOrg,
  getMockUsers,
} from "@/services/mockDb";

import {
  mockCreateOrganizationHandler,
  mockUpdateOrganizationHandler,
  mockArchiveOrganizationHandler,
  mockRestoreOrganizationHandler,
  mockDeleteOrganizationHandler,
  mockReassignOwnerHandler,
} from "@/services/mockApiHandlers";

describe("Organization Management Mock Handlers", () => {
  beforeEach(() => {
    // Reset mock data before each test
    initializeMockData();
  });

  describe("Mock Data CRUD Operations", () => {
    it("should create a new organization", () => {
      const initialCount = getMockOrganizations().length;
      const newOrg = createMockOrganization({
        name: "Test Organization",
        createdById: "user-1",
        slug: "test-org",
        supportedSports: ["PADEL"],
      });

      expect(newOrg).toBeDefined();
      expect(newOrg.name).toBe("Test Organization");
      expect(newOrg.slug).toBe("test-org");
      expect(newOrg.archivedAt).toBeNull();

      const orgs = getMockOrganizations();
      expect(orgs.length).toBe(initialCount + 1);
    });

    it("should update an organization", () => {
      const orgs = getMockOrganizations();
      const orgToUpdate = orgs[0];

      const updated = updateMockOrganization(orgToUpdate.id, {
        name: "Updated Name",
        contactEmail: "updated@example.com",
      });

      expect(updated).toBeDefined();
      expect(updated!.name).toBe("Updated Name");
      expect(updated!.contactEmail).toBe("updated@example.com");
      expect(updated!.id).toBe(orgToUpdate.id);
    });

    it("should archive an organization", () => {
      const orgs = getMockOrganizations();
      const orgToArchive = orgs.find((o) => !o.archivedAt);
      expect(orgToArchive).toBeDefined();

      const archived = archiveMockOrganization(orgToArchive!.id);
      expect(archived).toBeDefined();
      expect(archived!.archivedAt).toBeTruthy();
    });

    it("should restore an archived organization", () => {
      const orgs = getMockOrganizations();
      const archivedOrg = orgs.find((o) => o.archivedAt);
      expect(archivedOrg).toBeDefined();

      const restored = restoreMockOrganization(archivedOrg!.id);
      expect(restored).toBeDefined();
      expect(restored!.archivedAt).toBeNull();
    });

    it("should delete an organization and related memberships", () => {
      const orgs = getMockOrganizations();
      const orgToDelete = orgs[0];
      const orgId = orgToDelete.id;

      // Create a membership for this org
      createMockMembership({
        userId: "user-1",
        organizationId: orgId,
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: true,
      });

      const initialMemberships = getMockMemberships().filter(
        (m) => m.organizationId === orgId
      ).length;
      expect(initialMemberships).toBeGreaterThan(0);

      const result = deleteMockOrganization(orgId);
      expect(result).toBe(true);

      const afterDelete = findOrganizationById(orgId);
      expect(afterDelete).toBeUndefined();

      const afterMemberships = getMockMemberships().filter(
        (m) => m.organizationId === orgId
      ).length;
      expect(afterMemberships).toBe(0);
    });

    it("should find organization by slug", () => {
      const orgs = getMockOrganizations();
      const firstOrg = orgs[0];

      const found = findOrganizationBySlug(firstOrg.slug);
      expect(found).toBeDefined();
      expect(found!.id).toBe(firstOrg.id);
    });
  });

  describe("mockCreateOrganizationHandler", () => {
    it("should create organization with valid data", async () => {
      const result = await mockCreateOrganizationHandler({
        name: "New Test Org",
        createdById: "user-1",
      });

      expect(result).toBeDefined();
      expect(result.name).toBe("New Test Org");
      expect(result.slug).toBe("new-test-org");
      expect(result.id).toBeTruthy();
      expect(result.clubCount).toBe(0);
    });

    it("should reject creation with empty name", async () => {
      await expect(
        mockCreateOrganizationHandler({
          name: "",
          createdById: "user-1",
        })
      ).rejects.toMatchObject({
        status: 400,
        message: "Organization name is required",
      });
    });

    it("should reject duplicate slug", async () => {
      const orgs = getMockOrganizations();
      const existingSlug = orgs[0].slug;

      await expect(
        mockCreateOrganizationHandler({
          name: "New Org",
          slug: existingSlug,
          createdById: "user-1",
        })
      ).rejects.toMatchObject({
        status: 409,
        message: "An organization with this slug already exists",
      });
    });

    it("should generate slug from name if not provided", async () => {
      const result = await mockCreateOrganizationHandler({
        name: "Test Organization Name",
        createdById: "user-1",
      });

      expect(result.slug).toBe("test-organization-name");
    });

    it("should create audit log entry", async () => {
      const initialAuditLogs = getMockAuditLogs().length;

      await mockCreateOrganizationHandler({
        name: "Audit Test Org",
        createdById: "user-1",
      });

      const auditLogs = getMockAuditLogs();
      expect(auditLogs.length).toBe(initialAuditLogs + 1);
      
      const latestLog = auditLogs[auditLogs.length - 1];
      expect(latestLog.action).toBe("org.create");
      expect(latestLog.targetType).toBe("organization");
    });
  });

  describe("mockUpdateOrganizationHandler", () => {
    it("should update organization successfully", async () => {
      const orgs = getMockOrganizations();
      const orgToUpdate = orgs.find((o) => !o.archivedAt);
      expect(orgToUpdate).toBeDefined();

      const result = await mockUpdateOrganizationHandler({
        orgId: orgToUpdate!.id,
        name: "Updated Organization Name",
        contactEmail: "contact@updated.com",
        userId: "user-1",
      });

      expect(result).toBeDefined();
      expect(result.name).toBe("Updated Organization Name");
      expect(result.contactEmail).toBe("contact@updated.com");
    });

    it("should reject update with empty name", async () => {
      const orgs = getMockOrganizations();
      const org = orgs.find((o) => !o.archivedAt);

      await expect(
        mockUpdateOrganizationHandler({
          orgId: org!.id,
          name: "",
          userId: "user-1",
        })
      ).rejects.toMatchObject({
        status: 400,
        message: "Organization name cannot be empty",
      });
    });

    it("should reject update of archived organization", async () => {
      const orgs = getMockOrganizations();
      const archivedOrg = orgs.find((o) => o.archivedAt);
      expect(archivedOrg).toBeDefined();

      await expect(
        mockUpdateOrganizationHandler({
          orgId: archivedOrg!.id,
          name: "New Name",
          userId: "user-1",
        })
      ).rejects.toMatchObject({
        status: 400,
        message: "Cannot update archived organization",
      });
    });

    it("should reject slug conflict with another organization", async () => {
      const orgs = getMockOrganizations();
      const org1 = orgs[0];
      const org2 = orgs[1];

      await expect(
        mockUpdateOrganizationHandler({
          orgId: org1.id,
          slug: org2.slug,
          userId: "user-1",
        })
      ).rejects.toMatchObject({
        status: 409,
        message: "An organization with this slug already exists",
      });
    });

    it("should allow updating to same slug", async () => {
      const orgs = getMockOrganizations();
      const org = orgs.find((o) => !o.archivedAt);

      const result = await mockUpdateOrganizationHandler({
        orgId: org!.id,
        name: "New Name",
        slug: org!.slug,
        userId: "user-1",
      });

      expect(result.slug).toBe(org!.slug);
      expect(result.name).toBe("New Name");
    });
  });

  describe("mockArchiveOrganizationHandler", () => {
    it("should archive organization successfully", async () => {
      const orgs = getMockOrganizations();
      const orgToArchive = orgs.find((o) => !o.archivedAt);
      expect(orgToArchive).toBeDefined();

      const result = await mockArchiveOrganizationHandler({
        orgId: orgToArchive!.id,
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      expect(result.organization.archivedAt).toBeTruthy();
    });

    it("should reject archiving already archived organization", async () => {
      const orgs = getMockOrganizations();
      const archivedOrg = orgs.find((o) => o.archivedAt);
      expect(archivedOrg).toBeDefined();

      await expect(
        mockArchiveOrganizationHandler({
          orgId: archivedOrg!.id,
          userId: "user-1",
        })
      ).rejects.toMatchObject({
        status: 400,
        message: "Organization is already archived",
      });
    });
  });

  describe("mockRestoreOrganizationHandler", () => {
    it("should restore archived organization successfully", async () => {
      const orgs = getMockOrganizations();
      const archivedOrg = orgs.find((o) => o.archivedAt);
      expect(archivedOrg).toBeDefined();

      const result = await mockRestoreOrganizationHandler({
        orgId: archivedOrg!.id,
        userId: "user-1",
      });

      expect(result.success).toBe(true);
      expect(result.organization.archivedAt).toBeNull();
    });

    it("should reject restoring non-archived organization", async () => {
      const orgs = getMockOrganizations();
      const activeOrg = orgs.find((o) => !o.archivedAt);
      expect(activeOrg).toBeDefined();

      await expect(
        mockRestoreOrganizationHandler({
          orgId: activeOrg!.id,
          userId: "user-1",
        })
      ).rejects.toMatchObject({
        status: 400,
        message: "Organization is not archived",
      });
    });
  });

  describe("mockDeleteOrganizationHandler", () => {
    it("should delete organization without clubs", async () => {
      // Create a new org with no clubs
      const newOrg = createMockOrganization({
        name: "Delete Test Org",
        createdById: "user-1",
      });

      const result = await mockDeleteOrganizationHandler({
        orgId: newOrg.id,
        userId: "user-1",
      });

      expect(result.success).toBe(true);

      const afterDelete = findOrganizationById(newOrg.id);
      expect(afterDelete).toBeUndefined();
    });

    it("should require confirmation for organization with clubs", async () => {
      const orgs = getMockOrganizations();
      const clubs = getMockClubs();
      
      // Find an organization that has clubs
      const orgWithClubs = orgs.find((o) => 
        clubs.some((c) => c.organizationId === o.id)
      );
      
      expect(orgWithClubs).toBeDefined();

      await expect(
        mockDeleteOrganizationHandler({
          orgId: orgWithClubs!.id,
          userId: "user-1",
        })
      ).rejects.toMatchObject({
        status: 409,
        message: "Cannot delete organization with active clubs",
        requiresConfirmation: true,
      });
    });

    it("should delete organization with confirmation", async () => {
      const orgs = getMockOrganizations();
      const clubs = getMockClubs();
      
      // Find an organization that has clubs
      const orgWithClubs = orgs.find((o) => 
        clubs.some((c) => c.organizationId === o.id)
      );
      
      expect(orgWithClubs).toBeDefined();

      const result = await mockDeleteOrganizationHandler({
        orgId: orgWithClubs!.id,
        userId: "user-1",
        confirmOrgSlug: orgWithClubs!.slug,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("mockReassignOwnerHandler", () => {
    it("should reassign owner to existing user", async () => {
      const orgs = getMockOrganizations();
      const org = orgs.find((o) => !o.archivedAt);
      const users = getMockUsers();
      const targetUser = users.find((u) => !u.isRoot);

      expect(org).toBeDefined();
      expect(targetUser).toBeDefined();

      const result = await mockReassignOwnerHandler({
        orgId: org!.id,
        userId: targetUser!.id,
        actorId: "user-1",
      });

      expect(result.success).toBe(true);
      expect(result.newOwner?.id).toBe(targetUser!.id);
      expect(result.isNewUser).toBe(false);

      // Check membership was updated
      const membership = findMembershipByUserAndOrg(targetUser!.id, org!.id);
      expect(membership).toBeDefined();
      expect(membership!.isPrimaryOwner).toBe(true);
    });

    it("should create new user and make them owner", async () => {
      const orgs = getMockOrganizations();
      const org = orgs.find((o) => !o.archivedAt);

      const result = await mockReassignOwnerHandler({
        orgId: org!.id,
        email: "newowner@example.com",
        name: "New Owner",
        actorId: "user-1",
      });

      expect(result.success).toBe(true);
      expect(result.isNewUser).toBe(true);
      expect(result.newOwner?.email).toBe("newowner@example.com");
    });

    it("should require name for new user creation", async () => {
      const orgs = getMockOrganizations();
      const org = orgs.find((o) => !o.archivedAt);

      await expect(
        mockReassignOwnerHandler({
          orgId: org!.id,
          email: "newowner@example.com",
          actorId: "user-1",
        })
      ).rejects.toMatchObject({
        status: 400,
        message: "Name is required for new user",
      });
    });

    it("should reject reassignment for archived organization", async () => {
      const orgs = getMockOrganizations();
      const archivedOrg = orgs.find((o) => o.archivedAt);
      const users = getMockUsers();
      const targetUser = users[0];

      await expect(
        mockReassignOwnerHandler({
          orgId: archivedOrg!.id,
          userId: targetUser.id,
          actorId: "user-1",
        })
      ).rejects.toMatchObject({
        status: 400,
        message: "Cannot modify archived organization",
      });
    });

    it("should remove isPrimaryOwner from previous owner", async () => {
      const orgs = getMockOrganizations();
      const org = orgs.find((o) => !o.archivedAt);
      const users = getMockUsers();
      const oldOwner = users[0];
      const newOwner = users[1];

      // Set up initial state
      const oldMembership = createMockMembership({
        userId: oldOwner.id,
        organizationId: org!.id,
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: true,
      });

      await mockReassignOwnerHandler({
        orgId: org!.id,
        userId: newOwner.id,
        actorId: "user-1",
      });

      // Check old owner no longer has isPrimaryOwner
      const updatedOldMembership = findMembershipByUserAndOrg(oldOwner.id, org!.id);
      if (updatedOldMembership) {
        expect(updatedOldMembership.isPrimaryOwner).toBe(false);
      }
    });
  });

  describe("Audit Log Generation", () => {
    it("should create audit logs for all operations", async () => {
      const initialLogCount = getMockAuditLogs().length;

      // Create
      const newOrg = await mockCreateOrganizationHandler({
        name: "Audit Test",
        createdById: "user-1",
      });

      expect(getMockAuditLogs().length).toBe(initialLogCount + 1);

      // Update
      await mockUpdateOrganizationHandler({
        orgId: newOrg.id,
        name: "Updated Audit Test",
        userId: "user-1",
      });

      expect(getMockAuditLogs().length).toBe(initialLogCount + 2);

      // Archive
      await mockArchiveOrganizationHandler({
        orgId: newOrg.id,
        userId: "user-1",
      });

      expect(getMockAuditLogs().length).toBe(initialLogCount + 3);

      // Restore
      await mockRestoreOrganizationHandler({
        orgId: newOrg.id,
        userId: "user-1",
      });

      expect(getMockAuditLogs().length).toBe(initialLogCount + 4);

      // Delete
      await mockDeleteOrganizationHandler({
        orgId: newOrg.id,
        userId: "user-1",
      });

      expect(getMockAuditLogs().length).toBe(initialLogCount + 5);
    });
  });
});
