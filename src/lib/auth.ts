import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { MembershipRole, ClubMembershipRole } from "@/constants/roles";

// Re-export types and utilities from constants/roles for backward compatibility
export {
  MembershipRole,
  ClubMembershipRole,
  isValidMembershipRole,
  isValidClubMembershipRole,
  isOrganizationAdmin,
  isClubAdmin,
} from "@/constants/roles";

/**
 * Check if a user has any admin role (Root Admin, Organization Admin, or Club Admin).
 * Used to set the isAdmin flag in the JWT token for Edge Runtime middleware.
 */
async function checkIsAdmin(userId: string, isRoot: boolean | undefined): Promise<boolean> {
  // Root admins are always admins
  if (isRoot) {
    return true;
  }

  // Check for Organization Admin role
  const orgAdminCount = await prisma.membership.count({
    where: {
      userId,
      role: MembershipRole.ORGANIZATION_ADMIN,
    },
  });

  if (orgAdminCount > 0) {
    return true;
  }

  // Check for Club Admin role
  const clubAdminCount = await prisma.clubMembership.count({
    where: {
      userId,
      role: ClubMembershipRole.CLUB_ADMIN,
    },
  });

  return clubAdminCount > 0;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await compare(password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isRoot: user.isRoot,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/sign-in",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isRoot = user.isRoot;
        // Check if user has any admin role (Root Admin, Organization Admin, or Club Admin)
        token.isAdmin = await checkIsAdmin(user.id as string, user.isRoot);
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.isRoot = token.isRoot as boolean;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
});
