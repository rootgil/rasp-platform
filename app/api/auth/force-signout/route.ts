import { signOut } from "@/lib/auth";

/** Prefer POST to avoid drive-by logout via GET. */
export async function POST() {
  await signOut({ redirectTo: "/login" });
}

/** Kept for legacy links; prefer POST. */
export async function GET() {
  await signOut({ redirectTo: "/login" });
}
