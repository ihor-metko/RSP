import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create 1 admin user
  const adminUser = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@test.com",
      password: await hash("password123", 12),
      role: "admin",
    },
  });

  // Create 1 coach user
  const coachUser = await prisma.user.create({
    data: {
      name: "Coach User",
      email: "coach@test.com",
      password: await hash("password123", 12),
      role: "coach",
    },
  });

  // Create 1 player user
  const playerUser = await prisma.user.create({
    data: {
      name: "Player User",
      email: "player@test.com",
      password: await hash("password123", 12),
      role: "player",
    },
  });

  // Create 1 club
  const club = await prisma.club.create({
    data: {
      name: "Padel Club Central",
      location: "123 Main St, City Center",
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

  console.log("Seed data created successfully!");
  console.log({ adminUser, coachUser, playerUser, club, court1, court2, court3, coach });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
