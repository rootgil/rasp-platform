import { prisma } from "@/lib/prisma";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "@/lib/totp";

/**
 * Begin TOTP enrolment: generate a fresh secret and return the otpauth URL for
 * QR display. The secret is stored but MFA stays disabled until confirmed with
 * a valid code (Addendum E.4.3).
 */
export async function beginMfaEnrollment(userId: string, email: string) {
  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: secret, mfaEnabled: false },
  });
  return { secret, otpauthUrl: otpauthUrl(secret, email) };
}

/** Confirm enrolment by verifying the first code, then enable MFA. */
export async function confirmMfaEnrollment(userId: string, token: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true },
  });
  if (!user?.totpSecret) return false;
  if (!verifyTotp(user.totpSecret, token)) return false;
  await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
  return true;
}

export async function disableMfa(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: null, mfaEnabled: false },
  });
}

/**
 * Assert the caller provided a valid TOTP code.
 *
 * @param opts.required - When true (sensitive admin actions), fail closed if
 *   MFA is not enrolled. Default false preserves legacy soft check for
 *   non-critical call sites.
 */
export async function requireMfa(
  userId: string,
  token?: string,
  opts: { required?: boolean } = {}
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, mfaEnabled: true },
  });

  if (!user?.mfaEnabled || !user.totpSecret) {
    if (opts.required) {
      throw new Response(
        JSON.stringify({ error: "MFA enrollment required before this action" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    return;
  }

  if (!token || !verifyTotp(user.totpSecret, token)) {
    throw new Response(JSON.stringify({ error: "MFA code required or invalid" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}
