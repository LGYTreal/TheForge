import {
  get,
  onValue,
  push,
  ref,
  remove,
  set,
} from "firebase/database";

import { database } from "./database";

export interface ProjectComment {
  id: string;
  authorId: string;
  text: string;
  createdAt: number;
}

export interface ProjectChangelog {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface ProjectReport {
  targetType: "project" | "user";
  targetId: string;
  reporterId: string;
  reason: string;
  details: string;
  createdAt: number;
}

export async function getProjectLikeState(
  projectId: string,
  uid: string
) {
  const snapshot = await get(
    ref(database, `projectLikes/${projectId}/${uid}`)
  );

  return snapshot.exists();
}

export async function toggleProjectLike(
  projectId: string,
  uid: string
) {
  const likeRef = ref(
    database,
    `projectLikes/${projectId}/${uid}`
  );

  const snapshot = await get(likeRef);

  if (snapshot.exists()) {
    await remove(likeRef);
    return false;
  }

  await set(likeRef, true);
  return true;
}

export async function getProjectLikeCount(
  projectId: string
) {
  const snapshot = await get(
    ref(database, `projectLikes/${projectId}`)
  );

  if (!snapshot.exists()) {
    return 0;
  }

  return Object.keys(snapshot.val()).length;
}

export async function getProjectFavoriteState(
  uid: string,
  projectId: string
) {
  const snapshot = await get(
    ref(database, `projectFavorites/${uid}/${projectId}`)
  );

  return snapshot.exists();
}

export async function toggleProjectFavorite(
  uid: string,
  projectId: string
) {
  const favoriteRef = ref(
    database,
    `projectFavorites/${uid}/${projectId}`
  );

  const snapshot = await get(favoriteRef);

  if (snapshot.exists()) {
    await remove(favoriteRef);
    return false;
  }

  await set(favoriteRef, true);
  return true;
}

export async function getProjectComments(
  projectId: string
): Promise<ProjectComment[]> {
  const snapshot = await get(
    ref(database, `projectComments/${projectId}`)
  );

  if (!snapshot.exists()) {
    return [];
  }

  return Object.entries(snapshot.val())
    .map(([id, comment]) => ({
      id,
      ...(comment as Omit<ProjectComment, "id">),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function subscribeToProjectComments(
  projectId: string,
  callback: (comments: ProjectComment[]) => void
) {
  return onValue(
    ref(database, `projectComments/${projectId}`),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }

      const comments = Object.entries(snapshot.val())
        .map(([id, comment]) => ({
          id,
          ...(comment as Omit<ProjectComment, "id">),
        }))
        .sort((a, b) => b.createdAt - a.createdAt);

      callback(comments);
    }
  );
}

export async function createProjectComment(
  projectId: string,
  authorId: string,
  text: string
) {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("Comment cannot be empty.");
  }

  if (trimmed.length > 1000) {
    throw new Error("Comment is too long.");
  }

  const commentRef = push(
    ref(database, `projectComments/${projectId}`)
  );

  const comment: ProjectComment = {
    id: commentRef.key!,
    authorId,
    text: trimmed,
    createdAt: Date.now(),
  };

  await set(commentRef, comment);

  return comment;
}

export async function deleteProjectComment(
  projectId: string,
  commentId: string
) {
  await remove(
    ref(
      database,
      `projectComments/${projectId}/${commentId}`
    )
  );
}

export async function addProjectView(
  projectId: string,
  uid: string
) {
  await set(
    ref(database, `projectViews/${projectId}/${uid}`),
    true
  );
}

export async function getProjectViewCount(
  projectId: string
) {
  const snapshot = await get(
    ref(database, `projectViews/${projectId}`)
  );

  if (!snapshot.exists()) {
    return 0;
  }

  return Object.keys(snapshot.val()).length;
}

export async function getProjectChangelogs(
  projectId: string
): Promise<ProjectChangelog[]> {
  const snapshot = await get(
    ref(database, `projectChangelogs/${projectId}`)
  );

  if (!snapshot.exists()) {
    return [];
  }

  return Object.entries(snapshot.val())
    .map(([id, changelog]) => ({
      id,
      ...(changelog as Omit<ProjectChangelog, "id">),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function createProjectChangelog(
  projectId: string,
  title: string,
  content: string
) {
  const cleanTitle = title.trim();
  const cleanContent = content.trim();

  if (!cleanTitle || !cleanContent) {
    throw new Error("Title and content are required.");
  }

  if (cleanTitle.length > 120) {
    throw new Error("Title is too long.");
  }

  if (cleanContent.length > 5000) {
    throw new Error("Changelog entry is too long.");
  }

  const changelogRef = push(
    ref(database, `projectChangelogs/${projectId}`)
  );

  const changelog: ProjectChangelog = {
    id: changelogRef.key!,
    title: cleanTitle,
    content: cleanContent,
    createdAt: Date.now(),
  };

  await set(changelogRef, changelog);

  return changelog;
}

export async function deleteProjectChangelog(
  projectId: string,
  changelogId: string
) {
  await remove(
    ref(
      database,
      `projectChangelogs/${projectId}/${changelogId}`
    )
  );
}

export async function createReport(
  report: ProjectReport
) {
  const reportRef = push(ref(database, "reports"));

  await set(reportRef, {
    id: reportRef.key,
    ...report,
  });

  return reportRef.key;
}

export async function getBlockState(
  uid: string,
  targetUid: string
) {
  const snapshot = await get(
    ref(database, `blockedUsers/${uid}/${targetUid}`)
  );

  return snapshot.exists();
}

export async function toggleBlockUser(
  uid: string,
  targetUid: string
) {
  if (uid === targetUid) {
    throw new Error("You cannot block yourself.");
  }

  const blockRef = ref(
    database,
    `blockedUsers/${uid}/${targetUid}`
  );

  const snapshot = await get(blockRef);

  if (snapshot.exists()) {
    await remove(blockRef);
    return false;
  }

  await set(blockRef, true);
  return true;
}

export async function getBlockedUsers(uid: string) {
  const snapshot = await get(
    ref(database, `blockedUsers/${uid}`)
  );

  if (!snapshot.exists()) {
    return [];
  }

  return Object.keys(snapshot.val());
}