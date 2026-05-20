import { redirect } from "next/navigation";
import { getCurrentUserAccessProfile } from "@/lib/authz";

export default async function PortalPage() {
  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive) {
    redirect("/?error=unauthorized");
  }

  if (accessProfile.roles.includes("admin") || accessProfile.roles.includes("hr")) {
    redirect("/dashboard");
  }

  redirect("/staff");
}
