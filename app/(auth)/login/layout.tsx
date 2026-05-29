import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user) {
    const user = session.user as { role?: string; mustChangePassword?: boolean };
    if (user.mustChangePassword) redirect("/change-password");
    redirect(user.role === "admin" ? "/backoffice" : "/dashboard");
  }
  return children;
}
