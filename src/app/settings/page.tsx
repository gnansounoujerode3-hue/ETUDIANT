import { redirect } from "next/navigation";
import { AccountSettings } from "@/components/account-settings";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <AccountSettings user={{ email: user.email, name: user.name, locale: user.locale, plan: user.plan }} />;
}
