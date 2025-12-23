/**
 * Tests for Socket.IO authentication
 */
import { verifySocketToken } from '@/lib/socketAuth';
import { jwtVerify } from 'jose';

// Mock jose
jest.mock('jose', () => ({
  jwtVerify: jest.fn(),
}));

// Set up environment variable for tests
process.env.AUTH_SECRET = 'test-secret-key-for-testing-only';

describe('Socket Authentication', () => {
  const mockJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;

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
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    it('should return null when token is undefined', async () => {
      const result = await verifySocketToken(undefined as any);
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SocketAuth] Invalid token type:',
        'undefined'
      );
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    it('should return null when token is a number', async () => {
      const result = await verifySocketToken(12345 as any);
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SocketAuth] Invalid token type:',
        'number'
      );
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    it('should return null when token is an object', async () => {
      const result = await verifySocketToken({ token: 'invalid' } as any);
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SocketAuth] Invalid token type:',
        'object'
      );
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    it('should return null when token is an empty string', async () => {
      const result = await verifySocketToken('');
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SocketAuth] Invalid token type:',
        'string'
      );
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    it('should return null when token is only whitespace', async () => {
      const result = await verifySocketToken('   ');
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SocketAuth] Token is empty or whitespace'
      );
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });
  });

  describe('verifySocketToken', () => {
    it('should return null for invalid token', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Invalid token'));

      const result = await verifySocketToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for token without user ID', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { role: 'test' },
        protectedHeader: { alg: 'HS256' },
      } as any);

      const result = await verifySocketToken('token-without-id');

      expect(result).toBeNull();
    });

    it('should return user data for valid token with no memberships', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'user-123',
          isRoot: false,
          organizationIds: [],
          clubIds: [],
        },
        protectedHeader: { alg: 'HS256' },
      } as any);

      const result = await verifySocketToken('valid-token');

      expect(result).toEqual({
        userId: 'user-123',
        isRoot: false,
        organizationIds: [],
        clubIds: [],
      });
    });

    it('should return user data for root admin', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'root-user',
          isRoot: true,
          organizationIds: [],
          clubIds: [],
        },
        protectedHeader: { alg: 'HS256' },
      } as any);

      const result = await verifySocketToken('root-token');

      expect(result).toEqual({
        userId: 'root-user',
        isRoot: true,
        organizationIds: [],
        clubIds: [],
      });
    });

    it('should include organization IDs from token payload', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'user-123',
          isRoot: false,
          organizationIds: ['org-1', 'org-2'],
          clubIds: [],
        },
        protectedHeader: { alg: 'HS256' },
      } as any);

      const result = await verifySocketToken('valid-token');

      expect(result).toEqual({
        userId: 'user-123',
        isRoot: false,
        organizationIds: ['org-1', 'org-2'],
        clubIds: [],
      });
    });

    it('should include club IDs from token payload', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'user-123',
          isRoot: false,
          organizationIds: [],
          clubIds: ['club-1', 'club-2'],
        },
        protectedHeader: { alg: 'HS256' },
      } as any);

      const result = await verifySocketToken('valid-token');

      expect(result).toEqual({
        userId: 'user-123',
        isRoot: false,
        organizationIds: [],
        clubIds: ['club-1', 'club-2'],
      });
    });

    it('should include all organizations and clubs from token payload', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'user-123',
          isRoot: false,
          organizationIds: ['org-1', 'org-2'],
          clubIds: ['club-1', 'club-2', 'club-3'],
        },
        protectedHeader: { alg: 'HS256' },
      } as any);

      const result = await verifySocketToken('valid-token');

      expect(result).toEqual({
        userId: 'user-123',
        isRoot: false,
        organizationIds: ['org-1', 'org-2'],
        clubIds: ['club-1', 'club-2', 'club-3'],
      });
    });

    it('should handle errors gracefully', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Token verification failed'));

      const result = await verifySocketToken('error-token');

      expect(result).toBeNull();
    });

    it('should verify token with correct algorithm', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'user-123',
          isRoot: false,
          organizationIds: [],
          clubIds: [],
        },
        protectedHeader: { alg: 'HS256' },
      } as any);

      await verifySocketToken('valid-token');

      expect(mockJwtVerify).toHaveBeenCalledWith(
        'valid-token',
        expect.any(Uint8Array),
        { algorithms: ['HS256'] }
      );
    });
  });
});
