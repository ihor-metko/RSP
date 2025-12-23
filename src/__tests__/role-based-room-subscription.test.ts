/**
 * Integration tests for role-based room subscription
 * 
 * Validates that socket connections properly subscribe to rooms based on user roles:
 * - Root Admin → root_admin room
 * - Organization Admin → organization:{orgId} rooms for managed organizations
 * - Club Admin → club:{clubId} rooms for managed clubs
 * - Player → club:{clubId} rooms for clubs they belong to
 */

import { verifySocketToken } from '@/lib/socketAuth';
import { prisma } from '@/lib/prisma';
import { MembershipRole, ClubMembershipRole } from '@/constants/roles';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    membership: {
      findMany: jest.fn(),
    },
    clubMembership: {
      findMany: jest.fn(),
    },
    club: {
      findMany: jest.fn(),
    },
  },
}));

// Mock next-auth JWT decode
jest.mock('next-auth/jwt', () => ({
  decode: jest.fn(),
}));

describe('Role-based room subscription', () => {
  const mockDecode = require('next-auth/jwt').decode;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Root Admin', () => {
    it('should subscribe to root_admin room', async () => {
      // Mock token decode for root admin
      mockDecode.mockResolvedValue({
        id: 'root-user-1',
        isRoot: true,
      });

      // Mock empty memberships (root admin doesn't need them)
      mockPrisma.membership.findMany.mockResolvedValue([]);
      mockPrisma.clubMembership.findMany.mockResolvedValue([]);

      const userData = await verifySocketToken('mock-token');

      expect(userData).toEqual({
        userId: 'root-user-1',
        isRoot: true,
        organizationIds: [],
        clubIds: [],
      });

      // Root admin has isRoot=true which allows joining root_admin room
      expect(userData?.isRoot).toBe(true);
    });
  });

  describe('Organization Admin', () => {
    it('should subscribe to organization:{orgId} rooms for managed organizations', async () => {
      // Mock token decode for org admin
      mockDecode.mockResolvedValue({
        id: 'org-admin-1',
        isRoot: false,
      });

      // Mock organization memberships
      mockPrisma.membership.findMany.mockResolvedValue([
        {
          userId: 'org-admin-1',
          organizationId: 'org-1',
          role: MembershipRole.ORGANIZATION_ADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPrimaryOwner: false,
        },
        {
          userId: 'org-admin-1',
          organizationId: 'org-2',
          role: MembershipRole.ORGANIZATION_ADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPrimaryOwner: false,
        },
      ]);

      // Mock club memberships (org admin may also have direct club memberships)
      mockPrisma.clubMembership.findMany.mockResolvedValue([]);

      // Mock clubs belonging to managed organizations
      mockPrisma.club.findMany.mockResolvedValue([
        { id: 'club-1', name: 'Club 1', organizationId: 'org-1', createdAt: new Date(), updatedAt: new Date() },
        { id: 'club-2', name: 'Club 2', organizationId: 'org-1', createdAt: new Date(), updatedAt: new Date() },
        { id: 'club-3', name: 'Club 3', organizationId: 'org-2', createdAt: new Date(), updatedAt: new Date() },
      ]);

      const userData = await verifySocketToken('mock-token');

      expect(userData).toEqual({
        userId: 'org-admin-1',
        isRoot: false,
        organizationIds: ['org-1', 'org-2'],
        clubIds: ['club-1', 'club-2', 'club-3'], // All clubs in managed orgs
      });

      // Verify organization rooms will be joined: organization:org-1, organization:org-2
      expect(userData?.organizationIds).toContain('org-1');
      expect(userData?.organizationIds).toContain('org-2');

      // Verify club rooms will be joined for all clubs in managed orgs
      expect(userData?.clubIds).toContain('club-1');
      expect(userData?.clubIds).toContain('club-2');
      expect(userData?.clubIds).toContain('club-3');
    });
  });

  describe('Club Admin', () => {
    it('should subscribe to club:{clubId} rooms for managed clubs', async () => {
      // Mock token decode for club admin
      mockDecode.mockResolvedValue({
        id: 'club-admin-1',
        isRoot: false,
      });

      // Mock organization memberships (club admin may be member of org but not admin)
      mockPrisma.membership.findMany.mockResolvedValue([
        {
          userId: 'club-admin-1',
          organizationId: 'org-1',
          role: MembershipRole.MEMBER,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPrimaryOwner: false,
        },
      ]);

      // Mock club memberships where user is club admin
      mockPrisma.clubMembership.findMany.mockResolvedValue([
        {
          userId: 'club-admin-1',
          clubId: 'club-1',
          role: ClubMembershipRole.CLUB_ADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          userId: 'club-admin-1',
          clubId: 'club-2',
          role: ClubMembershipRole.CLUB_ADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const userData = await verifySocketToken('mock-token');

      expect(userData).toEqual({
        userId: 'club-admin-1',
        isRoot: false,
        organizationIds: ['org-1'],
        clubIds: ['club-1', 'club-2'],
      });

      // Verify club rooms will be joined: club:club-1, club:club-2
      expect(userData?.clubIds).toContain('club-1');
      expect(userData?.clubIds).toContain('club-2');

      // Verify organization room will be joined even though user is just a member
      expect(userData?.organizationIds).toContain('org-1');
    });
  });

  describe('Player', () => {
    it('should subscribe to club:{clubId} rooms for clubs they belong to', async () => {
      // Mock token decode for player
      mockDecode.mockResolvedValue({
        id: 'player-1',
        isRoot: false,
      });

      // Mock organization memberships (player may be member of org)
      mockPrisma.membership.findMany.mockResolvedValue([
        {
          userId: 'player-1',
          organizationId: 'org-1',
          role: MembershipRole.MEMBER,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPrimaryOwner: false,
        },
      ]);

      // Mock club memberships where user is a regular member
      mockPrisma.clubMembership.findMany.mockResolvedValue([
        {
          userId: 'player-1',
          clubId: 'club-1',
          role: ClubMembershipRole.MEMBER,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          userId: 'player-1',
          clubId: 'club-3',
          role: ClubMembershipRole.MEMBER,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const userData = await verifySocketToken('mock-token');

      expect(userData).toEqual({
        userId: 'player-1',
        isRoot: false,
        organizationIds: ['org-1'],
        clubIds: ['club-1', 'club-3'],
      });

      // Verify club rooms will be joined: club:club-1, club:club-3
      expect(userData?.clubIds).toContain('club-1');
      expect(userData?.clubIds).toContain('club-3');

      // Verify organization room will be joined
      expect(userData?.organizationIds).toContain('org-1');
    });
  });

  describe('Error handling', () => {
    it('should return null for invalid token', async () => {
      mockDecode.mockResolvedValue(null);

      const userData = await verifySocketToken('invalid-token');

      expect(userData).toBeNull();
    });

    it('should return null for token without user ID', async () => {
      mockDecode.mockResolvedValue({
        // No id field
        isRoot: false,
      });

      const userData = await verifySocketToken('invalid-token');

      expect(userData).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockDecode.mockResolvedValue({
        id: 'user-1',
        isRoot: false,
      });

      // Mock database error
      mockPrisma.membership.findMany.mockRejectedValue(new Error('Database error'));

      const userData = await verifySocketToken('mock-token');

      expect(userData).toBeNull();
    });
  });

  describe('No duplicate room subscriptions', () => {
    it('should not include duplicate club IDs when org admin also has direct club membership', async () => {
      mockDecode.mockResolvedValue({
        id: 'org-admin-2',
        isRoot: false,
      });

      // User is org admin
      mockPrisma.membership.findMany.mockResolvedValue([
        {
          userId: 'org-admin-2',
          organizationId: 'org-1',
          role: MembershipRole.ORGANIZATION_ADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPrimaryOwner: false,
        },
      ]);

      // User also has direct club membership in a club within the same org
      mockPrisma.clubMembership.findMany.mockResolvedValue([
        {
          userId: 'org-admin-2',
          clubId: 'club-1',
          role: ClubMembershipRole.CLUB_ADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Mock clubs in the organization (including club-1 which user is directly member of)
      mockPrisma.club.findMany.mockResolvedValue([
        { id: 'club-1', name: 'Club 1', organizationId: 'org-1', createdAt: new Date(), updatedAt: new Date() },
        { id: 'club-2', name: 'Club 2', organizationId: 'org-1', createdAt: new Date(), updatedAt: new Date() },
      ]);

      const userData = await verifySocketToken('mock-token');

      // club-1 should appear only once in clubIds
      const clubIdCount = userData?.clubIds.filter(id => id === 'club-1').length;
      expect(clubIdCount).toBe(1);

      // All clubs should be included
      expect(userData?.clubIds).toContain('club-1');
      expect(userData?.clubIds).toContain('club-2');
    });
  });
});
