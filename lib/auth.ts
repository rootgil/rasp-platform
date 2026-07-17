import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyTotp } from "@/lib/totp";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  totpCode: z.string().regex(/^\d{6}$/).optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "MFA code", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, totpCode } = parsed.data;

        const limited = checkRateLimit(`login:${email.toLowerCase()}`, 10, 15 * 60_000);
        if (!limited.ok) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        if (user.mfaEnabled) {
          if (!totpCode || !user.totpSecret) return null;
          const ok = verifyTotp(user.totpSecret, totpCode);
          if (!ok) return null;
        }

        const membership = await prisma.organizationMember.findFirst({
          where: { userId: user.id },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: membership?.organizationId,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
});
