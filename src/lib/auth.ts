import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Re-export types and utilities from constants/roles for backward compatibility
export {
  MembershipRole,
  ClubMembershipRole,
  isValidMembershipRole,
  isValidClubMembershipRole,
  isOrganizationAdmin,
  isClubAdmin,
} from "@/constants/roles";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === "development" ? "dev-secret-change-in-production" : undefined),
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
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
    async signIn({ user, account }) {
      // For Google OAuth, ensure user exists in database
      if (account?.provider === "google") {
        const email = user.email;
        
        if (!email) {
          return false; // Reject if no email provided
        }

        // Check if user exists in database
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        // If user doesn't exist, create new user with PLAYER role (isRoot: false)
        if (!existingUser) {
          try {
            await prisma.user.create({
              data: {
                email,
                name: user.name || null,
                image: user.image || null,
                emailVerified: new Date(), // OAuth users are verified
                isRoot: false, // Never grant admin rights via Google OAuth
                // Note: password is null for OAuth users
              },
            });
          } catch (error) {
            console.error("Error creating Google OAuth user:", error);
            return false;
          }
        }
      }
      
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      // On sign in, add user data to token
      if (user) {
        token.id = user.id;
        token.isRoot = user.isRoot;
      }
      
      // For Google OAuth, ensure we fetch the latest user data
      if (account?.provider === "google" || trigger === "signIn") {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { id: true, isRoot: true },
        });
        
        if (dbUser) {
          token.id = dbUser.id;
          token.isRoot = dbUser.isRoot;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.isRoot = token.isRoot as boolean;
      }
      return session;
    },
  },
});
