import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { ImportWizard } from "@/components/import-wizard";

export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="min-h-dvh">
      <AppHeader name={user.name} plan={user.plan} />
      <ImportWizard />
    </div>
  );
}
