import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getAnalytics } from "@/lib/services/analytics.service";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import type { Analytics } from "@/types/api";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const rawAnalytics = await getAnalytics(user.id, { days: 14, weeks: 8 });
  const initialAnalytics: Analytics = JSON.parse(JSON.stringify(rawAnalytics));

  return <DashboardView initialAnalytics={initialAnalytics} />;
}
