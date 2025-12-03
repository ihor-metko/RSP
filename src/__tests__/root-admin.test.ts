/**
 * @jest-environment node
 */
import { compare } from "bcryptjs";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

import {
  ROOT_ADMIN_ROLE,
  MIN_PASSWORD_LENGTH,
  isValidEmail,
  isValidPassword,
  isValidName,
  checkExistingRootAdmin,
  checkEmailExists,
  createRootAdmin,
  deleteExistingRootAdmins,
  executeCreateRootAdmin,
} from "@/lib/rootAdmin";
import { prisma } from "@/lib/prisma";

describe("Root Admin Module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Constants", () => {
    it("should have correct ROOT_ADMIN_ROLE value", () => {
      expect(ROOT_ADMIN_ROLE).toBe("root_admin");
    });

    it("should have correct MIN_PASSWORD_LENGTH value", () => {
      expect(MIN_PASSWORD_LENGTH).toBe(8);
    });
  });

  describe("isValidEmail", () => {
    it("should return true for valid email formats", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.org")).toBe(true);
      expect(isValidEmail("user+tag@company.co.uk")).toBe(true);
    });

    it("should return false for invalid email formats", () => {
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail("notanemail")).toBe(false);
      expect(isValidEmail("@nodomain.com")).toBe(false);
      expect(isValidEmail("noat.com")).toBe(false);
      expect(isValidEmail("spaces in@email.com")).toBe(false);
    });
  });

  describe("isValidPassword", () => {
    it("should return true for passwords meeting minimum length", () => {
      expect(isValidPassword("12345678")).toBe(true);
      expect(isValidPassword("longerpassword")).toBe(true);
      expect(isValidPassword("super_secure_password!")).toBe(true);
    });

    it("should return false for passwords below minimum length", () => {
      expect(isValidPassword("")).toBe(false);
      expect(isValidPassword("1234567")).toBe(false);
      expect(isValidPassword("short")).toBe(false);
    });
  });

  describe("isValidName", () => {
    it("should return true for valid names", () => {
      expect(isValidName("John Doe")).toBe(true);
      expect(isValidName("Jane")).toBe(true);
      expect(isValidName("  Spaced Name  ")).toBe(true);
    });

    it("should return false for empty or whitespace-only names", () => {
      expect(isValidName("")).toBe(false);
      expect(isValidName("   ")).toBe(false);
      expect(isValidName("\t\n")).toBe(false);
    });
  });

  describe("checkExistingRootAdmin", () => {
    it("should return true when root admin exists", async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: "root-admin-id",
        role: "root_admin",
      });

      const result = await checkExistingRootAdmin(prisma as never);

      expect(result).toBe(true);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { role: ROOT_ADMIN_ROLE },
      });
    });

    it("should return false when no root admin exists", async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await checkExistingRootAdmin(prisma as never);

      expect(result).toBe(false);
    });
  });

  describe("checkEmailExists", () => {
    it("should return true when email exists", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-id",
        email: "existing@example.com",
      });

      const result = await checkEmailExists(prisma as never, "existing@example.com");

      expect(result).toBe(true);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "existing@example.com" },
      });
    });

    it("should return false when email does not exist", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await checkEmailExists(prisma as never, "new@example.com");

      expect(result).toBe(false);
    });
  });

  describe("createRootAdmin", () => {
    it("should create root admin with hashed password", async () => {
      const input = {
        name: "Root Admin",
        email: "root@example.com",
        password: "securepassword123",
      };

      (prisma.user.create as jest.Mock).mockImplementation(async ({ data }) => ({
        id: "new-root-admin-id",
        email: data.email,
        name: data.name,
        password: data.password,
        role: data.role,
      }));

      const result = await createRootAdmin(prisma as never, input);

      expect(result.id).toBe("new-root-admin-id");
      expect(result.email).toBe(input.email);
      expect(result.name).toBe(input.name);

      // Verify password was hashed
      const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.role).toBe(ROOT_ADMIN_ROLE);
      const hashedPassword = createCall.data.password;
      const isPasswordHashed = await compare(input.password, hashedPassword);
      expect(isPasswordHashed).toBe(true);
    });
  });

  describe("deleteExistingRootAdmins", () => {
    it("should delete all root admin users", async () => {
      (prisma.user.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await deleteExistingRootAdmins(prisma as never);

      expect(result).toBe(1);
      expect(prisma.user.deleteMany).toHaveBeenCalledWith({
        where: { role: ROOT_ADMIN_ROLE },
      });
    });
  });

  describe("executeCreateRootAdmin", () => {
    const validInput = {
      name: "Root Admin",
      email: "root@example.com",
      password: "securepassword123",
    };

    beforeEach(() => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockImplementation(async ({ data }) => ({
        id: "new-id",
        email: data.email,
        name: data.name,
        password: data.password,
        role: data.role,
      }));
    });

    it("should fail if name is empty", async () => {
      const result = await executeCreateRootAdmin(prisma as never, {
        ...validInput,
        name: "",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("Full name is required.");
    });

    it("should fail if email is invalid", async () => {
      const result = await executeCreateRootAdmin(prisma as never, {
        ...validInput,
        email: "invalid-email",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid email format.");
    });

    it("should fail if password is too short", async () => {
      const result = await executeCreateRootAdmin(prisma as never, {
        ...validInput,
        password: "short",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    });

    it("should fail if root admin already exists without force flag", async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: "existing-root-admin",
        role: ROOT_ADMIN_ROLE,
      });

      const result = await executeCreateRootAdmin(prisma as never, validInput);

      expect(result.success).toBe(false);
      expect(result.message).toBe("A root admin already exists. Use --force flag to recreate.");
    });

    it("should fail if email is already registered", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "existing-user",
        email: validInput.email,
      });

      const result = await executeCreateRootAdmin(prisma as never, validInput);

      expect(result.success).toBe(false);
      expect(result.message).toBe("This email is already registered.");
    });

    it("should create root admin successfully with valid input", async () => {
      const result = await executeCreateRootAdmin(prisma as never, validInput);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Root admin created successfully!");
      expect(result.email).toBe(validInput.email);
    });

    it("should replace existing root admin with force flag", async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: "existing-root-admin",
        role: ROOT_ADMIN_ROLE,
      });
      (prisma.user.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await executeCreateRootAdmin(prisma as never, validInput, {
        force: true,
      });

      expect(result.success).toBe(true);
      expect(prisma.user.deleteMany).toHaveBeenCalledWith({
        where: { role: ROOT_ADMIN_ROLE },
      });
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it("should not delete existing root admin if none exists with force flag", async () => {
      const result = await executeCreateRootAdmin(prisma as never, validInput, {
        force: true,
      });

      expect(result.success).toBe(true);
      expect(prisma.user.deleteMany).not.toHaveBeenCalled();
    });

    it("should allow replacing root admin with same email using force flag", async () => {
      // Setup: existing root admin with the same email we want to use
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: "existing-root-admin",
        email: validInput.email,
        role: ROOT_ADMIN_ROLE,
      });
      (prisma.user.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      // After deletion, findUnique should return null (email no longer exists)
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await executeCreateRootAdmin(prisma as never, validInput, {
        force: true,
      });

      expect(result.success).toBe(true);
      expect(prisma.user.deleteMany).toHaveBeenCalledWith({
        where: { role: ROOT_ADMIN_ROLE },
      });
      expect(prisma.user.create).toHaveBeenCalled();
    });
  });
});
