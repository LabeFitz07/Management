import { redirect } from "next/navigation";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import { canAccessDashboard } from "@/lib/roles";

export default async function PortalPage() {
  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive) {
    redirect("/?error=unauthorized");
  }

  if (canAccessDashboard(accessProfile.roles)) {
    redirect("/dashboard");
  }

  redirect("/staff");
}
