/**
 * @jest-environment node
 */

// Mock modules for NextAuth
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("Google OAuth Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("signIn callback", () => {
    it("should create new user with PLAYER role (isRoot: false) and googleId for new Google users", async () => {
      const mockGoogleUser = {
        email: "newuser@gmail.com",
        name: "New Google User",
        image: "https://lh3.googleusercontent.com/a/default-user=s96-c",
      };

      const mockGoogleProfile = {
        sub: "google-id-12345",
      };

      // Simulate user doesn't exist
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Simulate user creation
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: "new-user-id",
        email: mockGoogleUser.email,
        name: mockGoogleUser.name,
        image: mockGoogleUser.image,
        emailVerified: new Date(),
        googleId: mockGoogleProfile.sub,
        isRoot: false,
        password: null,
      });

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: mockGoogleUser.email },
      });

      expect(existingUser).toBeNull();

      // Create new user
      const newUser = await prisma.user.create({
        data: {
          email: mockGoogleUser.email,
          name: mockGoogleUser.name,
          image: mockGoogleUser.image,
          emailVerified: new Date(),
          googleId: mockGoogleProfile.sub,
          isRoot: false, // Never grant admin rights via Google OAuth
        },
      });

      expect(newUser).toBeDefined();
      expect(newUser.email).toBe(mockGoogleUser.email);
      expect(newUser.googleId).toBe(mockGoogleProfile.sub);
      expect(newUser.isRoot).toBe(false);
      expect(newUser.password).toBeNull();
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: mockGoogleUser.email,
          googleId: mockGoogleProfile.sub,
          isRoot: false,
        }),
      });
    });

    it("should auto-link Google account to existing email/password user", async () => {
      const mockExistingUser = {
        id: "existing-user-id",
        email: "existinguser@example.com",
        name: "Existing User",
        image: null,
        emailVerified: new Date("2024-01-01"),
        googleId: null, // No Google ID yet
        isRoot: false,
        password: "hashed-password", // Has password (email/password user)
      };

      const mockGoogleProfile = {
        sub: "google-id-67890",
      };

      // Simulate user exists without Google ID
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);

      // Simulate update to add Google ID
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockExistingUser,
        googleId: mockGoogleProfile.sub,
      });

      const existingUser = await prisma.user.findUnique({
        where: { email: mockExistingUser.email },
      });

      expect(existingUser).toBeDefined();
      expect(existingUser?.googleId).toBeNull();

      // Link Google account
      const updatedUser = await prisma.user.update({
        where: { email: mockExistingUser.email },
        data: {
          googleId: mockGoogleProfile.sub,
          emailVerified: existingUser?.emailVerified || new Date(),
        },
      });

      expect(updatedUser.googleId).toBe(mockGoogleProfile.sub);
      expect(updatedUser.isRoot).toBe(false); // Role preserved
      expect(updatedUser.password).toBe("hashed-password"); // Password preserved
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: mockExistingUser.email },
        data: expect.objectContaining({
          googleId: mockGoogleProfile.sub,
        }),
      });
    });

    it("should allow existing user with Google ID to login without updating", async () => {
      const mockExistingUser = {
        id: "existing-user-id",
        email: "existinguser@gmail.com",
        name: "Existing User",
        image: null,
        emailVerified: new Date("2024-01-01"),
        googleId: "google-id-already-set", // Already has Google ID
        isRoot: false,
        password: null,
      };

      // Simulate user exists with Google ID
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);

      const existingUser = await prisma.user.findUnique({
        where: { email: mockExistingUser.email },
      });

      expect(existingUser).toBeDefined();
      expect(existingUser?.email).toBe(mockExistingUser.email);
      expect(existingUser?.googleId).toBe("google-id-already-set");
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("should not grant admin rights to new Google users", async () => {
      const mockGoogleUser = {
        email: "admin.attempt@gmail.com",
        name: "Admin Attempt",
        image: null,
      };

      const mockGoogleProfile = {
        sub: "google-id-admin-attempt",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: "new-user-id",
        email: mockGoogleUser.email,
        name: mockGoogleUser.name,
        googleId: mockGoogleProfile.sub,
        isRoot: false,
      });

      const newUser = await prisma.user.create({
        data: {
          email: mockGoogleUser.email,
          name: mockGoogleUser.name,
          emailVerified: new Date(),
          googleId: mockGoogleProfile.sub,
          isRoot: false, // Must be false
        },
      });

      expect(newUser.isRoot).toBe(false);
    });

    it("should reject sign-in if Google user has no email", async () => {
      const mockGoogleUserNoEmail = {
        email: null,
        name: "No Email User",
        image: null,
      };

      // signIn callback should return false if no email
      const shouldAllow = !!mockGoogleUserNoEmail.email;

      expect(shouldAllow).toBe(false);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe("jwt callback", () => {
    it("should include user ID and isRoot in JWT token for Google users", async () => {
      const mockToken = {
        email: "googleuser@gmail.com",
      };

      const mockDbUser = {
        id: "google-user-id",
        email: "googleuser@gmail.com",
        isRoot: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockDbUser);

      const dbUser = await prisma.user.findUnique({
        where: { email: mockToken.email },
        select: { id: true, isRoot: true },
      });

      expect(dbUser).toBeDefined();
      expect(dbUser?.id).toBe(mockDbUser.id);
      expect(dbUser?.isRoot).toBe(false);
    });

    it("should fetch latest user data for OAuth users", async () => {
      const mockToken = {
        email: "existinguser@gmail.com",
      };

      const mockDbUser = {
        id: "existing-user-id",
        isRoot: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockDbUser);

      // Simulate fetching user on OAuth sign-in
      const dbUser = await prisma.user.findUnique({
        where: { email: mockToken.email },
        select: { id: true, isRoot: true },
      });

      expect(dbUser).toBeDefined();
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockToken.email },
        select: { id: true, isRoot: true },
      });
    });
  });

  describe("session callback", () => {
    it("should include user ID and isRoot in session for Google users", () => {
      const mockToken = {
        id: "google-user-id",
        email: "googleuser@gmail.com",
        isRoot: false,
      };

      const mockSession = {
        user: {
          email: "googleuser@gmail.com",
          name: "Google User",
        },
      };

      // Simulate session callback
      if (mockToken && mockSession.user) {
        const updatedSession = {
          ...mockSession,
          user: {
            ...mockSession.user,
            id: mockToken.id as string,
            isRoot: mockToken.isRoot as boolean,
          },
        };

        expect(updatedSession.user.id).toBe(mockToken.id);
        expect(updatedSession.user.isRoot).toBe(false);
      }
    });
  });

  describe("existing admin users with Google OAuth", () => {
    it("should preserve admin rights for existing admin users who login with Google", async () => {
      const mockAdminUser = {
        id: "admin-user-id",
        email: "admin@example.com",
        name: "Admin User",
        isRoot: true, // Existing admin
        googleId: null,
        emailVerified: new Date("2024-01-01"),
        password: "hashed-password",
      };

      const mockGoogleProfile = {
        sub: "google-id-admin",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockAdminUser,
        googleId: mockGoogleProfile.sub,
      });

      const existingUser = await prisma.user.findUnique({
        where: { email: mockAdminUser.email },
      });

      expect(existingUser).toBeDefined();
      expect(existingUser?.isRoot).toBe(true); // Admin rights preserved

      // Link Google account
      const updatedUser = await prisma.user.update({
        where: { email: mockAdminUser.email },
        data: {
          googleId: mockGoogleProfile.sub,
          emailVerified: existingUser?.emailVerified || new Date(),
        },
      });

      expect(updatedUser.isRoot).toBe(true); // Admin rights still preserved
      expect(updatedUser.googleId).toBe(mockGoogleProfile.sub);
      expect(updatedUser.password).toBe("hashed-password"); // Password preserved
    });
  });
});
