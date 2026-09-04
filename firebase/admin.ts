import {
  get,
  ref,
  remove,
  set,
  update,
} from "firebase/database";
import { auth } from "./auth";
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
}

export interface UserBan {
  uid: string;
  bannedUntil: number | null;
  reason: string;
  bannedBy: string;
  createdAt: number;
  permanent: boolean;
}

export async function isAdmin(uid: string) {
  const currentUser = auth.currentUser;

  if (!currentUser || currentUser.uid !== uid) {
    return false;
  }

  const snapshot = await get(
    ref(database, `admins/${uid}`)
  );

  const latestUser = auth.currentUser;

  if (!latestUser || latestUser.uid !== uid) {
    return false;
  }

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
    .sort(
      (a, b) =>
        (b.createdAt || 0) - (a.createdAt || 0)
    );
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
    }));
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
    .sort(
      (a, b) => b.createdAt - a.createdAt
    );
}

export async function updateReportStatus(
  reportId: string,
  status: "resolved" | "denied",
  adminUid: string
) {
  await update(
    ref(database, `reports/${reportId}`),
    {
      status,
      resolvedBy: adminUid,
      resolvedAt: Date.now(),
    }
  );
}

export async function deleteAdminProject(
  projectId: string
) {
  await remove(
    ref(database, `projects/${projectId}`)
  );
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

  await set(
    ref(database, `bans/${uid}`),
    ban
  );

  return ban;
}

export async function removeBan(uid: string) {
  await remove(
    ref(database, `bans/${uid}`)
  );
}

export async function getAllBans(): Promise<UserBan[]> {
  const snapshot = await get(
    ref(database, "bans")
  );

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

export async function getUserBan(
  uid: string
): Promise<UserBan | null> {
  const snapshot = await get(
    ref(database, `bans/${uid}`)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    uid,
    ...(snapshot.val() as Omit<UserBan, "uid">),
  };
}