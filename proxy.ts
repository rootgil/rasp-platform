import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

function docsEnabled(): boolean {
  if (process.env.DOCS_ENABLED !== undefined) {
    return process.env.DOCS_ENABLED === "true";
  }
  return process.env.NODE_ENV !== "production";
}

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  const mustChangePassword = (session?.user as { mustChangePassword?: boolean })?.mustChangePassword === true;

  // API docs: open in development; admin-only in production when DOCS_ENABLED=true.
  if (nextUrl.pathname.startsWith("/docs")) {
    if (!docsEnabled()) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    const isProd = process.env.NODE_ENV === "production";
    if (isProd) {
      if (!isLoggedIn) {
        return NextResponse.redirect(
          new URL(`/login?callbackUrl=${encodeURIComponent("/docs")}`, nextUrl)
        );
      }
      if (!isAdmin) {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
      }
    }
  }

  // Logged-in user with a required password change: allow only /change-password (and sign-out).
  if (isLoggedIn && mustChangePassword) {
    if (nextUrl.pathname !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", nextUrl));
    }
    return NextResponse.next();
  }

  // Prevent accessing /change-password without a pending flag.
  if (isLoggedIn && !mustChangePassword && nextUrl.pathname === "/change-password") {
    return NextResponse.redirect(new URL(isAdmin ? "/backoffice" : "/dashboard", nextUrl));
  }

  if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/signup")) {
    return NextResponse.redirect(
      new URL(isAdmin ? "/backoffice" : "/dashboard", nextUrl)
    );
  }

  if (nextUrl.pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${encodeURIComponent(nextUrl.pathname)}`, nextUrl)
      );
    }
  }

  if (nextUrl.pathname.startsWith("/backoffice")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
