import {
  get,
  push,
  ref,
  remove,
  update,
} from "firebase/database";

import { database } from "./database";

export type NotificationType =
  | "follow"
  | "like"
  | "report"
  | "moderation"
  | "collaboration_request"
  | "collaboration_accepted"
  | "collaboration_declined";

export interface ForgeNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
  actorId?: string;
  fromUid?: string;
  targetId?: string;
  projectId?: string;
  requestId?: string;
}

export async function createNotification(
  uid: string,
  notification: Omit<ForgeNotification, "id">
) {
  if (!uid) {
    throw new Error("Notification recipient is required.");
  }

  const notificationRef = push(
    ref(database, `notifications/${uid}`)
  );

  const id = notificationRef.key;

  if (!id) {
    throw new Error("Failed to create notification.");
  }

  const data: Omit<ForgeNotification, "id"> = {
    ...notification,
    read: false,
  };

  await update(notificationRef, data);

  return {
    id,
    ...data,
  };
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

  return Object.entries(snapshot.val())
    .filter(
      ([, notification]) =>
        notification &&
        typeof notification === "object"
    )
    .map(([id, notification]) => ({
      id,
      ...(notification as Omit<ForgeNotification, "id">),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getUnreadNotificationCount(
  uid: string
) {
  const notifications = await getNotifications(uid);

  return notifications.filter(
    (notification) => !notification.read
  ).length;
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

export async function markAllNotificationsRead(
  uid: string
) {
  const notifications = await getNotifications(uid);

  if (notifications.length === 0) {
    return;
  }

  const updates: Record<string, boolean> = {};

  for (const notification of notifications) {
    if (!notification.read) {
      updates[
        `notifications/${uid}/${notification.id}/read`
      ] = true;
    }
  }

  if (Object.keys(updates).length > 0) {
    await update(ref(database), updates);
  }
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