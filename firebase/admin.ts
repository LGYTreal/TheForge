import {
  get,
  push,
  ref,
  remove,
  set,
  update,
} from "firebase/database";

import { database } from "./database";

export interface AdminProject {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  category: string;
  tags?: string[];
  website?: string;
  github?: string;
  status?: string;
  lookingForCollaborators?: boolean;
  thumbnailUrl?: string;
  contactInfo?: {
    email?: string;
    discord?: string;
    twitter?: string;
    other?: string;
  };
  memberCount?: number;
  createdAt?: number;
  updatedAt?: number;
  hidden?: boolean;
}

export interface AdminUser {
  uid: string;
  username?: string;
  displayName?: string;
  email?: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  skills?: string[];
  createdAt?: number;
  canPublish?: boolean;
  canFollow?: boolean;
}

export interface AdminReport {
  id: string;
  targetType: "project" | "user";
  targetId: string;
  reporterId: string;
  reason: string;
  details: string;
  status?: "open" | "resolved" | "denied";
  resolvedBy?: string;
  resolvedAt?: number;
  createdAt: number;
  adminNote?: string;
}

export interface UserBan {
  uid: string;
  bannedUntil: number | null;
  reason: string;
  bannedBy: string;
  createdAt: number;
  permanent: boolean;
}

export interface ModerationLog {
  id: string;
  action: string;
  adminUid: string;
  targetType: "user" | "project" | "report" | "system";
  targetId: string;
  targetName?: string;
  details?: string;
  createdAt: number;
}

export async function isAdmin(uid: string) {
  const snapshot = await get(ref(database, `admins/${uid}`));
  return snapshot.exists() && snapshot.val() === true;
}

export async function getAdminProjects(): Promise<AdminProject[]> {
  const snapshot = await get(ref(database, "projects"));

  if (!snapshot.exists()) {
    return [];
  }

  return Object.entries(snapshot.val())
    .filter(([, project]) => project && typeof project === "object")
    .map(([id, project]) => ({
      id,
      ...(project as Omit<AdminProject, "id">),
    }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const snapshot = await get(ref(database, "users"));

  if (!snapshot.exists()) {
    return [];
  }

  return Object.entries(snapshot.val())
    .filter(([, user]) => user && typeof user === "object")
    .map(([uid, user]) => ({
      uid,
      ...(user as Omit<AdminUser, "uid">),
    }))
    .sort((a, b) =>
      (a.displayName || a.username || "").localeCompare(
        b.displayName || b.username || ""
      )
    );
}

export async function getAdminReports(): Promise<AdminReport[]> {
  const snapshot = await get(ref(database, "reports"));

  if (!snapshot.exists()) {
    return [];
  }

  return Object.entries(snapshot.val())
    .filter(([, report]) => report && typeof report === "object")
    .map(([id, report]) => ({
      id,
      ...(report as Omit<AdminReport, "id">),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getAllBans(): Promise<UserBan[]> {
  const snapshot = await get(ref(database, "bans"));

  if (!snapshot.exists()) {
    return [];
  }

  return Object.entries(snapshot.val())
    .filter(([, ban]) => ban && typeof ban === "object")
    .map(([uid, ban]) => ({
      uid,
      ...(ban as Omit<UserBan, "uid">),
    }));
}

export async function getAdminIds(): Promise<string[]> {
  const snapshot = await get(ref(database, "admins"));

  if (!snapshot.exists()) {
    return [];
  }

  return Object.entries(snapshot.val())
    .filter(([, value]) => value === true)
    .map(([uid]) => uid);
}

export async function updateReportStatus(
  reportId: string,
  status: "resolved" | "denied",
  adminUid: string,
  adminNote?: string
) {
  await update(ref(database, `reports/${reportId}`), {
    status,
    resolvedBy: adminUid,
    resolvedAt: Date.now(),
    ...(adminNote !== undefined ? { adminNote } : {}),
  });
}

export async function deleteAdminProject(projectId: string) {
  await remove(ref(database, `projects/${projectId}`));
}

export async function setProjectHidden(
  projectId: string,
  hidden: boolean
) {
  await update(ref(database, `projects/${projectId}`), {
    hidden,
  });
}

export async function createBan(
  uid: string,
  bannedUntil: number | null,
  reason: string,
  adminUid: string
) {
  const cleanReason = reason.trim();

  if (!cleanReason) {
    throw new Error("A ban reason is required.");
  }

  if (cleanReason.length > 500) {
    throw new Error("The ban reason is too long.");
  }

  const permanent = bannedUntil === null;

  const ban: UserBan = {
    uid,
    bannedUntil,
    reason: cleanReason,
    bannedBy: adminUid,
    createdAt: Date.now(),
    permanent,
  };

  await set(ref(database, `bans/${uid}`), ban);
  return ban;
}

export async function removeBan(uid: string) {
  await remove(ref(database, `bans/${uid}`));
}

export async function setUserRestriction(
  uid: string,
  field: "canPublish" | "canFollow",
  value: boolean
) {
  await update(ref(database, `users/${uid}`), {
    [field]: value,
  });
}

export async function setAdminStatus(
  uid: string,
  value: boolean
) {
  if (value) {
    await set(ref(database, `admins/${uid}`), true);
  } else {
    await remove(ref(database, `admins/${uid}`));
  }
}

export async function deleteAdminUser(
  uid: string,
  projectIds: string[]
) {
  const updates: Record<string, null> = {
    [`users/${uid}`]: null,
    [`bans/${uid}`]: null,
    [`followers/${uid}`]: null,
    [`following/${uid}`]: null,
    [`notifications/${uid}`]: null,
    [`blockedUsers/${uid}`]: null,
  };

  for (const projectId of projectIds) {
    updates[`projects/${projectId}`] = null;
  }

  await update(ref(database), updates);
}

export async function createModerationLog(
  log: Omit<ModerationLog, "id">
) {
  const logRef = push(ref(database, "moderationLogs"));

  await set(logRef, {
    id: logRef.key,
    ...log,
  });

  return logRef.key;
}

export async function getModerationLogs(): Promise<ModerationLog[]> {
  const snapshot = await get(ref(database, "moderationLogs"));

  if (!snapshot.exists()) {
    return [];
  }

  return Object.entries(snapshot.val())
    .filter(([, log]) => log && typeof log === "object")
    .map(([id, log]) => ({
      id,
      ...(log as Omit<ModerationLog, "id">),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}
