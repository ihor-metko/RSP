import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";

interface SuperAdmin {
  id: string;
  name: string | null;
  email: string;
  isPrimaryOwner: boolean;
}

/**
 * GET /api/admin/organizations
 * Returns list of organizations with club counts and all SuperAdmins for root admin
 */
export async function GET(request: Request) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {

    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { clubs: true },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        memberships: {
          where: {
            role: "ORGANIZATION_ADMIN",
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: [
            { isPrimaryOwner: "desc" },
            { createdAt: "asc" },
          ],
        },
      },
    });

    const formattedOrganizations = organizations.map((org) => {
      const superAdmins: SuperAdmin[] = org.memberships.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        isPrimaryOwner: m.isPrimaryOwner,
      }));

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        address: org.address,
        createdAt: org.createdAt,
        clubCount: org._count.clubs,
        createdBy: org.createdBy,
        superAdmins,
        // Keep backward compatibility - superAdmin field contains the primary owner or first admin
        superAdmin: superAdmins.find((a) => a.isPrimaryOwner) || superAdmins[0] || null,
        // New structure
        logoData: org.logoData ? JSON.parse(org.logoData) : null,
        bannerData: org.bannerData ? JSON.parse(org.bannerData) : null,
        // Deprecated - kept for backward compatibility
        logo: org.logo,
        heroImage: org.heroImage,
        metadata: org.metadata ? JSON.parse(org.metadata) : null,
        supportedSports: org.supportedSports,
        isPublic: org.isPublic,
      };
    });

    return NextResponse.json(formattedOrganizations);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching organizations:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/organizations
 * Creates a new organization (root admin only)
 */
export async function POST(request: Request) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { 
      name, 
      slug, 
      description,
      contactEmail,
      contactPhone,
      website,
      address,
      logo,
      heroImage,
      logoData,
      bannerData,
      metadata,
      supportedSports 
    } = body;


    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    // Generate slug from name if not provided
    const finalSlug = slug?.trim() || generateSlug(name);

    // Check if slug already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: finalSlug },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: "An organization with this slug already exists" },
        { status: 409 }
      );
    }

    const organization = await prisma.organization.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        description: description?.trim() || null,
        contactEmail: contactEmail?.trim() || null,
        contactPhone: contactPhone?.trim() || null,
        website: website?.trim() || null,
        address: address?.trim() || null,
        // Deprecated - kept for backward compatibility
        logo: logo?.trim() || null,
        heroImage: heroImage?.trim() || null,
        // New structure
        logoData: logoData ? JSON.stringify(logoData) : null,
        bannerData: bannerData ? JSON.stringify(bannerData) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        createdById: authResult.userId,
        supportedSports: supportedSports || ["PADEL"],
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        description: organization.description,
        address: organization.address,
        createdAt: organization.createdAt,
        clubCount: 0,
        createdBy: organization.createdBy,
        superAdmin: null,
        supportedSports: organization.supportedSports,
        // New structure
        logoData: organization.logoData ? JSON.parse(organization.logoData) : null,
        bannerData: organization.bannerData ? JSON.parse(organization.bannerData) : null,
        // Deprecated - kept for backward compatibility
        logo: organization.logo,
        heroImage: organization.heroImage,
        metadata: organization.metadata ? JSON.parse(organization.metadata) : null,
        isPublic: organization.isPublic,
      },
      { status: 201 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error creating organization:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Generate a URL-friendly slug from a name
 * Falls back to a random string if the name contains only special characters
 */
function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  
  // If slug is empty, generate a fallback using timestamp
  if (!slug) {
    return `org-${Date.now()}`;
  }
  
  return slug;
}
