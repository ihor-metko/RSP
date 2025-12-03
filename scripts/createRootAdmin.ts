#!/usr/bin/env ts-node
/**
 * Initial Setup Script: Create Root Admin
 *
 * This script creates a root admin (platform owner) with full privileges across the entire platform.
 * It should only be run once during initial platform setup, unless the --force flag is used.
 *
 * Usage:
 *   npm run create-root-admin
 *   npm run create-root-admin -- --force
 *
 * Or directly:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/createRootAdmin.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/createRootAdmin.ts --force
 *
 * Options:
 *   --force    Allow recreation of root admin even if one already exists
 */

import { PrismaClient } from "@prisma/client";
import * as readline from "readline";
import {
  ROOT_ADMIN_ROLE,
  MIN_PASSWORD_LENGTH,
  isValidEmail,
  isValidPassword,
  checkExistingRootAdmin,
  checkEmailExists,
  createRootAdmin,
  deleteExistingRootAdmins,
  RootAdminInput,
} from "../src/lib/rootAdmin";

const prisma = new PrismaClient();

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

function questionHidden(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(prompt);

    const wasRaw = stdin.isRaw;

    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }

    let password = "";

    const onData = (char: Buffer) => {
      const c = char.toString("utf8");

      switch (c) {
        case "\n":
        case "\r":
        case "\u0004":
          if (stdin.isTTY) {
            stdin.setRawMode(wasRaw ?? false);
          }
          stdin.removeListener("data", onData);
          stdout.write("\n");
          resolve(password);
          break;
        case "\u0003":
          // Ctrl+C
          process.exit(1);
          break;
        case "\u007F":
        case "\b":
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            stdout.clearLine(0);
            stdout.cursorTo(0);
            stdout.write(prompt + "*".repeat(password.length));
          }
          break;
        default:
          password += c;
          stdout.write("*");
          break;
      }
    };

    stdin.resume();
    stdin.on("data", onData);
  });
}

async function promptForInput(rl: readline.Interface): Promise<RootAdminInput> {
  console.log("\n=== Root Admin Creation ===\n");

  // Prompt for full name
  let name = "";
  while (!name.trim()) {
    name = await question(rl, "Full name: ");
    if (!name.trim()) {
      console.log("Error: Full name is required.");
    }
  }

  // Prompt for email
  let email = "";
  while (!isValidEmail(email)) {
    email = await question(rl, "Email: ");
    if (!isValidEmail(email)) {
      console.log("Error: Please enter a valid email address.");
    }
  }

  // Prompt for password
  let password = "";
  while (!isValidPassword(password)) {
    password = await questionHidden(rl, "Password: ");
    if (!isValidPassword(password)) {
      console.log(`Error: Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
  }

  // Confirm password
  let confirmPassword = "";
  while (confirmPassword !== password) {
    confirmPassword = await questionHidden(rl, "Confirm password: ");
    if (confirmPassword !== password) {
      console.log("Error: Passwords do not match. Please try again.");
    }
  }

  return { name: name.trim(), email: email.trim().toLowerCase(), password };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const forceMode = args.includes("--force");

  try {
    // Check if root admin already exists
    const rootAdminExists = await checkExistingRootAdmin(prisma);

    if (rootAdminExists && !forceMode) {
      console.log("\n❌ Error: A root admin already exists.");
      console.log("If you need to recreate the root admin, use the --force flag:");
      console.log("  npm run create-root-admin -- --force\n");
      process.exit(1);
    }

    if (rootAdminExists && forceMode) {
      console.log("\n⚠️  Warning: Force mode enabled. Existing root admin will be replaced.\n");
    }

    const rl = createReadlineInterface();

    try {
      const input = await promptForInput(rl);

      // If force mode, delete existing root admin first (before email check)
      if (forceMode && rootAdminExists) {
        await deleteExistingRootAdmins(prisma);
        console.log("\n✓ Existing root admin removed.");
      }

      // Check if email is already registered (after potential deletion)
      const emailExists = await checkEmailExists(prisma, input.email);
      if (emailExists) {
        console.log("\n❌ Error: This email is already registered.");
        process.exit(1);
      }

      // Create the root admin
      await createRootAdmin(prisma, input);

      console.log("\n✅ Root admin created successfully!");
      console.log(`   Email: ${input.email}`);
      console.log(`   Role: ${ROOT_ADMIN_ROLE}`);
      console.log("\n   ⚠️  This account has full platform privileges.\n");
    } finally {
      rl.close();
    }
  } catch (error) {
    console.error("\n❌ Error creating root admin:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
