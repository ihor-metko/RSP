import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create 1 root admin user
  const adminUser = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@test.com",
      password: await hash("password123", 12),
      isRoot: false,
    },
  });

  // Create 1 coach user (regular user who will be assigned as coach)
  const coachUser = await prisma.user.create({
    data: {
      name: "Coach User",
      email: "coach@test.com",
      password: await hash("password123", 12),
      isRoot: false,
    },
  });

  // Create 1 player user (regular platform user)
  const playerUser = await prisma.user.create({
    data: {
      name: "Player User",
      email: "player@test.com",
      password: await hash("password123", 12),
      isRoot: false,
    },
  });

  // Create an organization first
  const organization = await prisma.organization.create({
    data: {
      name: "Default Organization",
      slug: "default-org",
      createdById: adminUser.id,
    },
  });

  // Create 1 club linked to organization
  const club = await prisma.club.create({
    data: {
      name: "Padel Club Central",
      slug: "padel-club-central",
      location: "123 Main St, City Center",
      organizationId: organization.id,
      createdById: adminUser.id,
    },
  });

  // Create 3 courts
  const court1 = await prisma.court.create({
    data: {
      name: "Court 1",
      clubId: club.id,
      type: "padel",
      surface: "artificial",
      indoor: true,
      defaultPriceCents: 5000,
    },
  });

  const court2 = await prisma.court.create({
    data: {
      name: "Court 2",
      clubId: club.id,
      type: "padel",
      surface: "artificial",
      indoor: true,
      defaultPriceCents: 5000,
    },
  });

  const court3 = await prisma.court.create({
    data: {
      name: "Court 3",
      clubId: club.id,
      type: "padel",
      surface: "clay",
      indoor: false,
      defaultPriceCents: 4000,
    },
  });

  // Create coach entry for the coach user
  const coach = await prisma.coach.create({
    data: {
      userId: coachUser.id,
      clubId: club.id,
      bio: "Experienced padel coach with 10 years of teaching.",
    },
  });

  // Create organization membership for admin
  await prisma.membership.create({
    data: {
      userId: adminUser.id,
      organizationId: organization.id,
      role: "ORGANIZATION_ADMIN",
    },
  });

  // Create club membership for coach user
  await prisma.clubMembership.create({
    data: {
      userId: coachUser.id,
      clubId: club.id,
      role: "MEMBER",
    },
  });

  console.log("Seed data created successfully!");
  console.log({ adminUser, coachUser, playerUser, organization, club, court1, court2, court3, coach });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
