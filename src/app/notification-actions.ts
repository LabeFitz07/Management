"use server";

import { revalidatePath } from "next/cache";
import { markNotificationsAsRead } from "@/lib/notification-store";

export async function markAllNotificationsAsRead() {
  await markNotificationsAsRead();
  revalidatePath("/dashboard");
  revalidatePath("/staff");
  revalidatePath("/notifications");
}
