import { getSupabaseAdminClient } from "./supabase-admin";
import { getSupabaseServerClient } from "./supabase-server";

export const TASK_NOTIFICATION_TYPES = [
  "task_assigned",
  "task_submitted",
  "task_approved",
  "task_changes_requested",
] as const;

export type TaskNotificationType = (typeof TASK_NOTIFICATION_TYPES)[number];

export type NotificationRecord = {
  id: string;
  recipientUserId: string;
  actorUserId: string | null;
  taskId: string | null;
  submissionId: string | null;
  type: TaskNotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  task_id: string | null;
  submission_id: string | null;
  type: TaskNotificationType;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
};

export type CreateNotificationInput = {
  recipientUserId: string;
  actorUserId: string;
  taskId?: string | null;
  submissionId?: string | null;
  type: TaskNotificationType;
  title: string;
  body?: string;
};

function mapNotification(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    recipientUserId: row.recipient_user_id,
    actorUserId: row.actor_user_id,
    taskId: row.task_id,
    submissionId: row.submission_id,
    type: row.type,
    title: row.title,
    body: row.body ?? "",
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

async function getCurrentUserId() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function getCurrentUserNotifications(limit = 20) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return [] satisfies NotificationRecord[];
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, recipient_user_id, actor_user_id, task_id, submission_id, type, title, body, is_read, created_at")
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<NotificationRow[]>();

  if (error) {
    throw new Error(`Failed to fetch notifications: ${error.message}`);
  }

  return data.map(mapNotification);
}

export async function getUnreadNotificationCount() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return 0;
  }

  const supabase = await getSupabaseServerClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new Error(`Failed to count unread notifications: ${error.message}`);
  }

  return count ?? 0;
}

export async function markNotificationsAsRead(notificationIds?: string[]) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return;
  }

  const supabase = await getSupabaseServerClient();
  let query = supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("recipient_user_id", userId)
    .eq("is_read", false);

  if (notificationIds && notificationIds.length > 0) {
    query = query.in("id", notificationIds);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Failed to update notifications: ${error.message}`);
  }
}

export async function createNotification(input: CreateNotificationInput) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("notifications").insert({
    recipient_user_id: input.recipientUserId,
    actor_user_id: input.actorUserId,
    task_id: input.taskId ?? null,
    submission_id: input.submissionId ?? null,
    type: input.type,
    title: input.title.trim(),
    body: input.body?.trim() || null,
  });

  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }
}
