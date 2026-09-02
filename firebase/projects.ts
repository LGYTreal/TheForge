import { get, ref } from "firebase/database";

import { database } from "./database";

export async function getProjectCount(uid: string) {
  const snapshot = await get(ref(database, "projects"));

  if (!snapshot.exists()) {
    return 0;
  }

  const projects = snapshot.val();

  return Object.values(projects).filter(
    (project) =>
      project &&
      typeof project === "object" &&
      "ownerId" in project &&
      project.ownerId === uid
  ).length;
}