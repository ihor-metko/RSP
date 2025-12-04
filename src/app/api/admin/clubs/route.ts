import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { ADMIN_ROLES } from "@/constants/roles";
import { MembershipRole, ClubMembershipRole } from "@prisma/client";
import { generateSlug } from "@/utils/club";

export async function GET(request: Request) {
  const authResult = await requireRole(request, ADMIN_ROLES);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const clubs = await prisma.club.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        shortDescription: true,
        location: true,
        city: true,
        contactInfo: true,
        openingHours: true,
        logo: true,
        heroImage: true,
        tags: true,
        isPublic: true,
        createdAt: true,
        organizationId: true,
        courts: {
          select: {
            id: true,
            indoor: true,
          },
        },
      },
    });

    // Process clubs to add indoor/outdoor counts (single pass)
    const clubsWithCounts = clubs.map((club) => {
      const { indoorCount, outdoorCount } = club.courts.reduce(
        (acc, court) => {
          if (court.indoor) {
            acc.indoorCount++;
          } else {
            acc.outdoorCount++;
          }
          return acc;
        },
        { indoorCount: 0, outdoorCount: 0 }
      );

      return {
        id: club.id,
        name: club.name,
        shortDescription: club.shortDescription,
        location: club.location,
        city: club.city,
        contactInfo: club.contactInfo,
        openingHours: club.openingHours,
        logo: club.logo,
        heroImage: club.heroImage,
        tags: club.tags,
        isPublic: club.isPublic,
        createdAt: club.createdAt,
        organizationId: club.organizationId,
        indoorCount,
        outdoorCount,
        courtCount: club.courts.length,
      };
    });

    return NextResponse.json(clubsWithCounts);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching clubs:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authResult = await requireRole(request, ADMIN_ROLES);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { name, location, contactInfo, openingHours, logo, organizationId } = body;

    if (!name || !location) {
      return NextResponse.json(
        { error: "Name and location are required" },
        { status: 400 }
      );
    }

    const club = await prisma.$transaction(async (tx) => {
      // If no organizationId is provided, get or create a default organization for this user
      let orgId = organizationId;
      
      if (!orgId) {
        // Check if user has any organization membership as admin
        const existingMembership = await tx.membership.findFirst({
          where: {
            userId: authResult.userId,
            role: MembershipRole.ORGANIZATION_ADMIN,
          },
          select: { organizationId: true },
        });

        if (existingMembership) {
          orgId = existingMembership.organizationId;
        } else {
          // Create a default organization for this user
          const orgSlug = `org-${generateSlug(name)}-${Date.now()}`;
          const newOrg = await tx.organization.create({
            data: {
              name: `${name.trim()} Organization`,
              slug: orgSlug,
              createdById: authResult.userId,
            },
          });
          
          // Make the user an organization admin
          await tx.membership.create({
            data: {
              userId: authResult.userId,
              organizationId: newOrg.id,
              role: MembershipRole.ORGANIZATION_ADMIN,
            },
          });
          
          orgId = newOrg.id;
        }
      }

      // Create the club
      const newClub = await tx.club.create({
        data: {
          name,
          location,
          organizationId: orgId,
          createdById: authResult.userId,
          contactInfo: contactInfo || null,
          openingHours: openingHours || null,
          logo: logo || null,
        },
      });

      // Make the creator a club admin
      await tx.clubMembership.create({
        data: {
          userId: authResult.userId,
          clubId: newClub.id,
          role: ClubMembershipRole.CLUB_ADMIN,
        },
      });

      return newClub;
    });

    return NextResponse.json(club, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error creating club:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
