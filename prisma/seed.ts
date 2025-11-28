// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// async function main() {
//   // Create 1 test user with role "player"
//   const testUser = await prisma.user.create({
//     data: {
//       name: "Test Player",
//       email: "player@test.com",
//       role: "player",
//     },
//   });

//   // Create 2 coach users
//   const coachUser1 = await prisma.user.create({
//     data: {
//       name: "Coach One",
//       email: "coach1@test.com",
//       role: "coach",
//     },
//   });

//   const coachUser2 = await prisma.user.create({
//     data: {
//       name: "Coach Two",
//       email: "coach2@test.com",
//       role: "coach",
//     },
//   });

//   // Create 1 club
//   const club = await prisma.club.create({
//     data: {
//       name: "Paddle Club Central",
//       location: "123 Main St, City Center",
//     },
//   });

//   // Create 3 courts
//   const court1 = await prisma.court.create({
//     data: {
//       name: "Court 1",
//       clubId: club.id,
//       indoor: true,
//       defaultPrice: 50,
//     },
//   });

//   const court2 = await prisma.court.create({
//     data: {
//       name: "Court 2",
//       clubId: club.id,
//       indoor: true,
//       defaultPrice: 50,
//     },
//   });

//   const court3 = await prisma.court.create({
//     data: {
//       name: "Court 3",
//       clubId: club.id,
//       indoor: false,
//       defaultPrice: 40,
//     },
//   });

//   // Create 2 coaches
//   const coach1 = await prisma.coach.create({
//     data: {
//       userId: coachUser1.id,
//       clubId: club.id,
//       bio: "Experienced paddle coach with 10 years of teaching.",
//     },
//   });

//   const coach2 = await prisma.coach.create({
//     data: {
//       userId: coachUser2.id,
//       clubId: club.id,
//       bio: "Professional player turned coach.",
//     },
//   });

//   console.log("Seed data created successfully!");
//   console.log({ testUser, coachUser1, coachUser2, club, court1, court2, court3, coach1, coach2 });
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
