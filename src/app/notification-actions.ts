"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { markNotificationsAsRead } from "@/lib/notification-store";

export async function markAllNotificationsAsRead() {
  await markNotificationsAsRead();
  revalidatePath("/dashboard");
  revalidatePath("/staff");
  revalidatePath("/notifications");
}

export async function openNotificationTask(formData: FormData) {
  const notificationId = String(formData.get("notificationId") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();

  if (notificationId) {
    await markNotificationsAsRead([notificationId]);
    revalidatePath("/dashboard");
    revalidatePath("/staff");
    revalidatePath("/notifications");
  }

  redirect(redirectTo || "/notifications");
}
