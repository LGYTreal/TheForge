import { get, ref } from "firebase/database";

import { database } from "./database";

export interface ForgeProject {
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
  memberCount?: number;
  createdAt?: number;
  thumbnailUrl?: string;
}

export async function getProjectsByOwner(
  uid: string
): Promise<ForgeProject[]> {
  const snapshot = await get(ref(database, "projects"));

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();

  const projects: ForgeProject[] = Object.entries(data)
    .filter(
      ([, value]) =>
        value &&
        typeof value === "object" &&
        (value as ForgeProject).ownerId === uid
    )
    .map(([id, value]) => ({
      id,
      ...(value as Omit<ForgeProject, "id">),
    }));

  projects.sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  );

  return projects;
}