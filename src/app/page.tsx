import { getCurrentUser } from "@/lib/auth";
import { Landing } from "@/components/landing";

export default async function HomePage() {
  const user = await getCurrentUser();
  return <Landing isLoggedIn={!!user} />;
}
