/**
 * Tests for Socket.IO authentication
 */
import { verifySocketToken } from '@/lib/socketAuth';
import { prisma } from '@/lib/prisma';
import { decode } from 'next-auth/jwt';
import { MembershipRole, ClubMembershipRole } from '@/constants/roles';

// Mock next-auth/jwt
jest.mock('next-auth/jwt', () => ({
  decode: jest.fn(),
}));

// Mock prisma
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

describe('Socket Authentication', () => {
  const mockDecode = decode as jest.MockedFunction<typeof decode>;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifySocketToken - Token Validation', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('should return null when token is null', async () => {
      const result = await verifySocketToken(null as any);
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SocketAuth] Invalid token type:',
        'object'
      );
      expect(mockDecode).not.toHaveBeenCalled();
    });

    it('should return null when token is undefined', async () => {
      const result = await verifySocketToken(undefined as any);
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SocketAuth] Invalid token type:',
        'undefined'
      );
      expect(mockDecode).not.toHaveBeenCalled();
    });

    it('should return null when token is a number', async () => {
      const result = await verifySocketToken(12345 as any);
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SocketAuth] Invalid token type:',
        'number'
      );
      expect(mockDecode).not.toHaveBeenCalled();
    });

    it('should return null when token is an object', async () => {
      const result = await verifySocketToken({ token: 'invalid' } as any);
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SocketAuth] Invalid token type:',
        'object'
      );
      expect(mockDecode).not.toHaveBeenCalled();
    });

    it('should return null when token is an empty string', async () => {
      const result = await verifySocketToken('');
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SocketAuth] Invalid token type:',
        'string'
      );
      expect(mockDecode).not.toHaveBeenCalled();
    });

    it('should return null when token is only whitespace', async () => {
      const result = await verifySocketToken('   ');
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SocketAuth] Token is empty or whitespace'
      );
      expect(mockDecode).not.toHaveBeenCalled();
    });
  });

  describe('verifySocketToken', () => {
    it('should return null for invalid token', async () => {
      mockDecode.mockResolvedValue(null);

      const result = await verifySocketToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for token without user ID', async () => {
      mockDecode.mockResolvedValue({ sub: 'test' } as any);

      const result = await verifySocketToken('token-without-id');

      expect(result).toBeNull();
    });

    it('should return user data for valid token with no memberships', async () => {
      mockDecode.mockResolvedValue({
        id: 'user-123',
        isRoot: false,
      } as any);

      mockPrisma.membership.findMany.mockResolvedValue([]);
      mockPrisma.clubMembership.findMany.mockResolvedValue([]);

      const result = await verifySocketToken('valid-token');

      expect(result).toEqual({
        userId: 'user-123',
        isRoot: false,
        organizationIds: [],
        clubIds: [],
      });
    });

    it('should return user data for root admin', async () => {
      mockDecode.mockResolvedValue({
        id: 'root-user',
        isRoot: true,
      } as any);

      mockPrisma.membership.findMany.mockResolvedValue([]);
      mockPrisma.clubMembership.findMany.mockResolvedValue([]);

      const result = await verifySocketToken('root-token');

      expect(result).toEqual({
        userId: 'root-user',
        isRoot: true,
        organizationIds: [],
        clubIds: [],
      });
    });

    it('should include organization IDs from memberships', async () => {
      mockDecode.mockResolvedValue({
        id: 'user-123',
        isRoot: false,
      } as any);

      mockPrisma.membership.findMany.mockResolvedValue([
        { organizationId: 'org-1', role: MembershipRole.MEMBER },
        { organizationId: 'org-2', role: MembershipRole.MEMBER },
      ] as any);
      mockPrisma.clubMembership.findMany.mockResolvedValue([]);

      const result = await verifySocketToken('valid-token');

      expect(result).toEqual({
        userId: 'user-123',
        isRoot: false,
        organizationIds: ['org-1', 'org-2'],
        clubIds: [],
      });
    });

    it('should include club IDs from club memberships', async () => {
      mockDecode.mockResolvedValue({
        id: 'user-123',
        isRoot: false,
      } as any);

      mockPrisma.membership.findMany.mockResolvedValue([]);
      mockPrisma.clubMembership.findMany.mockResolvedValue([
        { clubId: 'club-1', role: ClubMembershipRole.MEMBER },
        { clubId: 'club-2', role: ClubMembershipRole.CLUB_ADMIN },
      ] as any);

      const result = await verifySocketToken('valid-token');

      expect(result).toEqual({
        userId: 'user-123',
        isRoot: false,
        organizationIds: [],
        clubIds: ['club-1', 'club-2'],
      });
    });

    it('should include all clubs from organizations where user is admin', async () => {
      mockDecode.mockResolvedValue({
        id: 'user-123',
        isRoot: false,
      } as any);

      mockPrisma.membership.findMany.mockResolvedValue([
        { organizationId: 'org-1', role: MembershipRole.ORGANIZATION_ADMIN },
        { organizationId: 'org-2', role: MembershipRole.MEMBER },
      ] as any);

      mockPrisma.clubMembership.findMany.mockResolvedValue([
        { clubId: 'club-1', role: ClubMembershipRole.MEMBER },
      ] as any);

      // Clubs in org-1 that the user should get access to
      mockPrisma.club.findMany.mockResolvedValue([
        { id: 'club-2' },
        { id: 'club-3' },
      ] as any);

      const result = await verifySocketToken('valid-token');

      expect(result).toEqual({
        userId: 'user-123',
        isRoot: false,
        organizationIds: ['org-1', 'org-2'],
        clubIds: ['club-1', 'club-2', 'club-3'], // club-1 from direct membership, club-2 and club-3 from org admin
      });
    });

    it('should avoid duplicate club IDs', async () => {
      mockDecode.mockResolvedValue({
        id: 'user-123',
        isRoot: false,
      } as any);

      mockPrisma.membership.findMany.mockResolvedValue([
        { organizationId: 'org-1', role: MembershipRole.ORGANIZATION_ADMIN },
      ] as any);

      // User is already a member of club-1
      mockPrisma.clubMembership.findMany.mockResolvedValue([
        { clubId: 'club-1', role: ClubMembershipRole.MEMBER },
      ] as any);

      // club-1 is also in org-1, so it would be returned twice
      mockPrisma.club.findMany.mockResolvedValue([
        { id: 'club-1' },
        { id: 'club-2' },
      ] as any);

      const result = await verifySocketToken('valid-token');

      expect(result).toEqual({
        userId: 'user-123',
        isRoot: false,
        organizationIds: ['org-1'],
        clubIds: ['club-1', 'club-2'], // No duplicates
      });
    });

    it('should handle errors gracefully', async () => {
      mockDecode.mockRejectedValue(new Error('Token decode failed'));

      const result = await verifySocketToken('error-token');

      expect(result).toBeNull();
    });
  });
});
