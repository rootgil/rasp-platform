import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  // Prefer AUTH_URL in production; trustHost only when unset (local/Docker).
  trustHost: process.env.NODE_ENV !== "production" || !process.env.AUTH_URL,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "user";
        token.organizationId = (user as { organizationId?: string }).organizationId;
        token.mustChangePassword =
          (user as { mustChangePassword?: boolean }).mustChangePassword ?? false;
        token.passwordChangedAt =
          (user as { passwordChangedAt?: string | null }).passwordChangedAt ?? null;
      }
      // Client called useSession().update({ name }) after profile save
      if (trigger === "update" && session?.name != null) {
        token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        if (typeof token.name === "string") {
          session.user.name = token.name;
        }
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { organizationId?: string }).organizationId =
          token.organizationId as string | undefined;
        (session.user as { mustChangePassword?: boolean }).mustChangePassword =
          token.mustChangePassword as boolean | undefined;
        (session.user as { passwordChangedAt?: string | null }).passwordChangedAt =
          (token.passwordChangedAt as string | null | undefined) ?? null;
      }
      return session;
    },
  },
  providers: [],
};
