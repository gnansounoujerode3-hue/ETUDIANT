import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const sp = await searchParams;
  return <AuthForm initialMode={sp.mode === "login" ? "login" : "signup"} />;
}
