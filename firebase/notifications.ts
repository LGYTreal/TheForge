import {
  get,
  push,
  ref,
  remove,
  update,
} from "firebase/database";

import { database } from "./database";

export interface ForgeNotification {
  id: string;
  type:
    | "collaboration_request"
    | "collaboration_accepted"
    | "collaboration_declined"
    | "follow"
    | "project"
    | "moderation";
  title: string;
  message: string;
  actorId?: string;
  projectId?: string;
  requestId?: string;
  read: boolean;
  createdAt: number;
}

export async function createNotification(
  uid: string,
  notification: Omit<ForgeNotification, "id">
) {
  const notificationRef = push(
    ref(database, `notifications/${uid}`)
  );

  await update(notificationRef, {
    id: notificationRef.key,
    ...notification,
  });

  return notificationRef.key;
}

export async function getNotifications(
  uid: string
): Promise<ForgeNotification[]> {
  const snapshot = await get(
    ref(database, `notifications/${uid}`)
  );

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();

  return Object.entries(data)
    .map(([id, notification]) => ({
      id,
      ...(notification as Omit<ForgeNotification, "id">),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function markNotificationRead(
  uid: string,
  notificationId: string
) {
  await update(
    ref(
      database,
      `notifications/${uid}/${notificationId}`
    ),
    {
      read: true,
    }
  );
}

export async function markAllNotificationsRead(uid: string) {
  const snapshot = await get(
    ref(database, `notifications/${uid}`)
  );

  if (!snapshot.exists()) {
    return;
  }

  const notifications = snapshot.val();
  const updates: Record<string, boolean> = {};

  Object.keys(notifications).forEach((id) => {
    updates[`notifications/${uid}/${id}/read`] = true;
  });

  await update(ref(database), updates);
}

export async function deleteNotification(
  uid: string,
  notificationId: string
) {
  await remove(
    ref(
      database,
      `notifications/${uid}/${notificationId}`
    )
  );
}