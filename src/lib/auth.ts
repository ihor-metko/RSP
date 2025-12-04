import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validateRole } from "@/constants/roles";

// Re-export types and utilities from constants/roles for backward compatibility
export type { UserRole, MembershipRoleType, ClubMembershipRoleType } from "@/constants/roles";
export { 
  Roles, 
  VALID_ROLES, 
  DEFAULT_ROLE, 
  ADMIN_ROLES, 
  isValidRole, 
  isAdminRole, 
  validateRole,
  MembershipRole,
  ClubMembershipRole,
  VALID_MEMBERSHIP_ROLES,
  VALID_CLUB_MEMBERSHIP_ROLES,
  isValidMembershipRole,
  isValidClubMembershipRole,
} from "@/constants/roles";

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
          // Keep role for backward compatibility during migration
          // For non-root users, use the default player role since roles are now context-specific
          role: user.isRoot ? "root_admin" : "player",
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
        // Keep role for backward compatibility during migration
        // For non-root users, use the default player role since roles are now context-specific
        token.role = user.isRoot ? "root_admin" : "player";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.isRoot = token.isRoot as boolean | undefined;
        // Keep role for backward compatibility during migration
        session.user.role = validateRole(token.role);
      }
      return session;
    },
  },
});
