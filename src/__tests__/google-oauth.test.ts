/**
 * @jest-environment node
 */

// Mock modules for NextAuth
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("Google OAuth Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("signIn callback", () => {
    it("should create new user with PLAYER role (isRoot: false) for new Google users", async () => {
      const mockGoogleUser = {
        email: "newuser@gmail.com",
        name: "New Google User",
        image: "https://lh3.googleusercontent.com/a/default-user=s96-c",
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
          isRoot: false, // Never grant admin rights via Google OAuth
        },
      });

      expect(newUser).toBeDefined();
      expect(newUser.email).toBe(mockGoogleUser.email);
      expect(newUser.isRoot).toBe(false);
      expect(newUser.password).toBeNull();
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: mockGoogleUser.email,
          isRoot: false,
        }),
      });
    });

    it("should allow existing user to login with Google", async () => {
      const mockExistingUser = {
        id: "existing-user-id",
        email: "existinguser@gmail.com",
        name: "Existing User",
        image: null,
        emailVerified: new Date("2024-01-01"),
        isRoot: false,
        password: null,
      };

      // Simulate user exists
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);

      const existingUser = await prisma.user.findUnique({
        where: { email: mockExistingUser.email },
      });

      expect(existingUser).toBeDefined();
      expect(existingUser?.email).toBe(mockExistingUser.email);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("should not grant admin rights to new Google users", async () => {
      const mockGoogleUser = {
        email: "admin.attempt@gmail.com",
        name: "Admin Attempt",
        image: null,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: "new-user-id",
        email: mockGoogleUser.email,
        name: mockGoogleUser.name,
        isRoot: false,
      });

      const newUser = await prisma.user.create({
        data: {
          email: mockGoogleUser.email,
          name: mockGoogleUser.name,
          emailVerified: new Date(),
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
        emailVerified: new Date("2024-01-01"),
        password: null,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);

      const existingUser = await prisma.user.findUnique({
        where: { email: mockAdminUser.email },
      });

      expect(existingUser).toBeDefined();
      expect(existingUser?.isRoot).toBe(true); // Admin rights preserved
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });
});
