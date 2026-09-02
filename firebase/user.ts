import { get, ref } from "firebase/database";

import { database } from "./database";
import type { ForgeUser } from "./users";

export async function getUserProfile(
  uid: string
): Promise<ForgeUser | null> {
  const snapshot = await get(ref(database, `users/${uid}`));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val() as ForgeUser;
}