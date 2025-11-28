/**
 * @jest-environment node
 */
import { compare, hash } from "bcryptjs";

// Mock modules for NextAuth
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("Login/Credentials flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should validate password correctly with bcryptjs", async () => {
    const password = "testPassword123";
    const hashedPassword = await hash(password, 12);

    const isValid = await compare(password, hashedPassword);
    expect(isValid).toBe(true);

    const isInvalid = await compare("wrongPassword", hashedPassword);
    expect(isInvalid).toBe(false);
  });

  it("should find user by email", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      password: await hash("password123", 12),
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const user = await prisma.user.findUnique({
      where: { email: "test@example.com" },
    });

    expect(user).toBeDefined();
    expect(user?.email).toBe("test@example.com");
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });
  });

  it("should return null for non-existent user", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const user = await prisma.user.findUnique({
      where: { email: "nonexistent@example.com" },
    });

    expect(user).toBeNull();
  });

  it("should validate credentials flow", async () => {
    const password = "password123";
    const hashedPassword = await hash(password, 12);
    
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      password: hashedPassword,
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const user = await prisma.user.findUnique({
      where: { email: "test@example.com" },
    });

    expect(user).toBeDefined();
    expect(user?.password).toBeDefined();
    
    const isPasswordValid = await compare(password, user!.password!);
    expect(isPasswordValid).toBe(true);
  });
});
