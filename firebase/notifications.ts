import {
  getDatabase,
  get,
  push,
  ref,
  remove,
  update,
} from "firebase/database";
import database from "./config";

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
  reportId?: string;
  requestId?: string;
  targetId?: string;
  read: boolean;
  createdAt: number;
}

export async function createNotification(
  uid: string,
  notification: Omit<ForgeNotification, "id">
) {
  const notificationRef = push(
    ref(getDatabase(database), `notifications/${uid}`)
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
    ref(getDatabase(database), `notifications/${uid}`)
  );

  if (!snapshot.exists()) {
    return [];
  }

  const notifications: ForgeNotification[] = [];

  snapshot.forEach((child) => {
    notifications.push({
      id: child.key!,
      ...child.val(),
    });
  });

  return notifications.sort((a, b) => b.createdAt - a.createdAt);
}

export async function markNotificationRead(
  uid: string,
  notificationId: string
) {
  await update(
    ref(getDatabase(database), `notifications/${uid}/${notificationId}`),
    {
      read: true,
    }
  );
}

export async function markAllNotificationsRead(uid: string) {
  const snapshot = await get(
    ref(getDatabase(database), `notifications/${uid}`)
  );

  if (!snapshot.exists()) {
    return;
  }

  const updates: Record<string, boolean> = {};

  snapshot.forEach((child) => {
    if (!child.val().read) {
      updates[`${child.key}/read`] = true;
    }
  });

  if (Object.keys(updates).length > 0) {
    await update(ref(getDatabase(database), `notifications/${uid}`), updates);
  }
}

export async function deleteNotification(
  uid: string,
  notificationId: string
) {
  await remove(
    ref(getDatabase(database), `notifications/${uid}/${notificationId}`)
  );
}