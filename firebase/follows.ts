import {
  get,
  ref,
  remove,
  set,
} from "firebase/database";

import { database } from "./database";
import { createNotification } from "./notifications";
import { getUserProfile } from "./users";

export async function isFollowing(
  followerUid: string,
  targetUid: string
) {
  const snapshot = await get(
    ref(database, `following/${followerUid}/${targetUid}`)
  );

  return snapshot.exists();
}

export async function followUser(
  followerUid: string,
  targetUid: string
) {
  if (followerUid === targetUid) {
    return;
  }

  const alreadyFollowing = await isFollowing(
    followerUid,
    targetUid
  );

  await Promise.all([
    set(
      ref(
        database,
        `following/${followerUid}/${targetUid}`
      ),
      true
    ),
    set(
      ref(
        database,
        `followers/${targetUid}/${followerUid}`
      ),
      true
    ),
  ]);

  if (!alreadyFollowing) {
    let username = "Someone";

    try {
      const profile = await getUserProfile(followerUid);

      if (profile?.username) {
        username = `@${profile.username}`;
      } else if (profile?.displayName) {
        username = profile.displayName;
      }
    } catch {}

    try {
      await createNotification(targetUid, {
        type: "follow",
        title: "New follower",
        message: `${username} started following you.`,
        createdAt: Date.now(),
        read: false,
        fromUid: followerUid,
        targetId: followerUid,
      });
    } catch {}
  }
}

export async function unfollowUser(
  followerUid: string,
  targetUid: string
) {
  await Promise.all([
    remove(
      ref(
        database,
        `following/${followerUid}/${targetUid}`
      )
    ),
    remove(
      ref(
        database,
        `followers/${targetUid}/${followerUid}`
      )
    ),
  ]);
}

export async function getFollowerCount(uid: string) {
  const snapshot = await get(
    ref(database, `followers/${uid}`)
  );

  if (!snapshot.exists()) {
    return 0;
  }

  return Object.keys(snapshot.val()).length;
}

export async function getFollowingCount(uid: string) {
  const snapshot = await get(
    ref(database, `following/${uid}`)
  );

  if (!snapshot.exists()) {
    return 0;
  }

  return Object.keys(snapshot.val()).length;
}

export async function getFollowerIds(uid: string) {
  const snapshot = await get(
    ref(database, `followers/${uid}`)
  );

  if (!snapshot.exists()) {
    return [];
  }

  return Object.keys(snapshot.val());
}

export async function getFollowingIds(uid: string) {
  const snapshot = await get(
    ref(database, `following/${uid}`)
  );

  if (!snapshot.exists()) {
    return [];
  }

  return Object.keys(snapshot.val());
}