import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const SEED_PASSWORD = process.env.SEED_USER_PASSWORD || "testpassword123";
const BCRYPT_SALT_ROUNDS = 12;

async function main() {
  // Hash the seed password with proper salt rounds
  const hashedPassword = await bcrypt.hash(SEED_PASSWORD, BCRYPT_SALT_ROUNDS);

  // Create 1 test user with role "player"
  const testUser = await prisma.user.upsert({
    where: { email: "player@test.com" },
    update: {},
    create: {
      name: "Test Player",
      email: "player@test.com",
      password: hashedPassword,
      role: "player",
    },
  });

  // Create 2 coach users
  const coachUser1 = await prisma.user.upsert({
    where: { email: "coach1@test.com" },
    update: {},
    create: {
      name: "Coach One",
      email: "coach1@test.com",
      password: hashedPassword,
      role: "coach",
    },
  });

  const coachUser2 = await prisma.user.upsert({
    where: { email: "coach2@test.com" },
    update: {},
    create: {
      name: "Coach Two",
      email: "coach2@test.com",
      password: hashedPassword,
      role: "coach",
    },
  });

  // Create 1 club
  const club = await prisma.club.upsert({
    where: { id: "paddle-club-central" },
    update: {},
    create: {
      id: "paddle-club-central",
      name: "Paddle Club Central",
      location: "123 Main St, City Center",
    },
  });

  // Create 3 courts
  const court1 = await prisma.court.upsert({
    where: { id: "court-1" },
    update: {},
    create: {
      id: "court-1",
      name: "Court 1",
      clubId: club.id,
      indoor: true,
      defaultPrice: 50,
    },
  });

  const court2 = await prisma.court.upsert({
    where: { id: "court-2" },
    update: {},
    create: {
      id: "court-2",
      name: "Court 2",
      clubId: club.id,
      indoor: true,
      defaultPrice: 50,
    },
  });

  const court3 = await prisma.court.upsert({
    where: { id: "court-3" },
    update: {},
    create: {
      id: "court-3",
      name: "Court 3",
      clubId: club.id,
      indoor: false,
      defaultPrice: 40,
    },
  });

  // Create 2 coaches
  const coach1 = await prisma.coach.upsert({
    where: { id: "coach-1" },
    update: {},
    create: {
      id: "coach-1",
      userId: coachUser1.id,
      clubId: club.id,
      bio: "Experienced paddle coach with 10 years of teaching.",
    },
  });

  const coach2 = await prisma.coach.upsert({
    where: { id: "coach-2" },
    update: {},
    create: {
      id: "coach-2",
      userId: coachUser2.id,
      clubId: club.id,
      bio: "Professional player turned coach.",
    },
  });

  console.log("Seed data created successfully!");
  console.log({ testUser, coachUser1, coachUser2, club, court1, court2, court3, coach1, coach2 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
