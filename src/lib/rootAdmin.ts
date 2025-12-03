/**
 * Root Admin Creation Logic
 *
 * This module contains the core logic for creating root admin users.
 * It is separated from the CLI script for testability.
 */

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

export const ROOT_ADMIN_ROLE = "root_admin";
export const MIN_PASSWORD_LENGTH = 8;

export interface RootAdminInput {
  name: string;
  email: string;
  password: string;
}

export interface CreateRootAdminResult {
  success: boolean;
  message: string;
  email?: string;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export function isValidName(name: string): boolean {
  return name.trim().length > 0;
}

export async function checkExistingRootAdmin(
  prisma: PrismaClient
): Promise<boolean> {
  const existingRootAdmin = await prisma.user.findFirst({
    where: { role: ROOT_ADMIN_ROLE },
  });
  return existingRootAdmin !== null;
}

export async function checkEmailExists(
  prisma: PrismaClient,
  email: string
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  return existingUser !== null;
}

export async function createRootAdmin(
  prisma: PrismaClient,
  input: RootAdminInput
): Promise<{ id: string; email: string; name: string }> {
  const hashedPassword = await hash(input.password, 12);
  const normalizedEmail = input.email.toLowerCase();

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: normalizedEmail,
      password: hashedPassword,
      role: ROOT_ADMIN_ROLE,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: input.name, // Use validated input name instead of potentially null user.name
  };
}

export async function deleteExistingRootAdmins(
  prisma: PrismaClient
): Promise<number> {
  const result = await prisma.user.deleteMany({
    where: { role: ROOT_ADMIN_ROLE },
  });
  return result.count;
}

export interface CreateRootAdminOptions {
  force?: boolean;
}

export async function executeCreateRootAdmin(
  prisma: PrismaClient,
  input: RootAdminInput,
  options: CreateRootAdminOptions = {}
): Promise<CreateRootAdminResult> {
  const { force = false } = options;

  // Validate input
  if (!isValidName(input.name)) {
    return { success: false, message: "Full name is required." };
  }

  if (!isValidEmail(input.email)) {
    return { success: false, message: "Invalid email format." };
  }

  if (!isValidPassword(input.password)) {
    return {
      success: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  // Check if root admin already exists
  const rootAdminExists = await checkExistingRootAdmin(prisma);

  if (rootAdminExists && !force) {
    return {
      success: false,
      message:
        "A root admin already exists. Use --force flag to recreate.",
    };
  }

  // If force mode, delete existing root admin first (before email check)
  if (force && rootAdminExists) {
    await deleteExistingRootAdmins(prisma);
  }

  // Check if email is already registered (after potential deletion)
  const emailExists = await checkEmailExists(prisma, input.email);
  if (emailExists) {
    return { success: false, message: "This email is already registered." };
  }

  // Create the root admin
  const user = await createRootAdmin(prisma, input);

  return {
    success: true,
    message: "Root admin created successfully!",
    email: user.email,
  };
}
