import { getCurrentUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { PricingView } from "@/components/pricing-view";

export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; canceled?: string }>;
}) {
  const user = await getCurrentUser();
  const sp = await searchParams;
  const view = (
    <PricingView
      plan={user?.plan ?? "free"}
      isLoggedIn={!!user}
      upgraded={sp.upgraded === "1"}
      stripeDemo={!process.env.STRIPE_SECRET_KEY}
    />
  );

  if (!user) return view;
  return (
    <div className="min-h-dvh">
      <AppHeader name={user.name} plan={user.plan} />
      {view}
    </div>
  );
}
