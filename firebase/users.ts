import { get, ref, set, update } from "firebase/database";

import { database } from "./database";

export interface ForgeUser {
  username: string;
  displayName: string;
  email: string;
  bio: string;
  avatar: string;
  banner: string;
  skills: string[];
  createdAt: number;
}

export interface ForgeUserWithId extends ForgeUser {
  uid: string;
}

export async function createUserProfile(
  uid: string,
  user: ForgeUser
) {
  const userRef = ref(database, `users/${uid}`);
  const snapshot = await get(userRef);

  if (!snapshot.exists()) {
    await set(userRef, user);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<ForgeUser>
) {
  await update(ref(database, `users/${uid}`), updates);
}

export async function getUserProfile(
  uid: string
): Promise<ForgeUser | null> {
  const snapshot = await get(ref(database, `users/${uid}`));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val() as ForgeUser;
}

export async function getAllUsers(): Promise<ForgeUserWithId[]> {
  const snapshot = await get(ref(database, "users"));

  if (!snapshot.exists()) {
    return [];
  }

  const users = snapshot.val();

  return Object.entries(users)
    .filter(
      ([, user]) =>
        user &&
        typeof user === "object"
    )
    .map(([uid, user]) => ({
      uid,
      ...(user as ForgeUser),
    }));
}