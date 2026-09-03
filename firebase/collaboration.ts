import {
  get,
  push,
  ref,
  remove,
  update,
} from "firebase/database";

import { database } from "./database";
import { createNotification } from "./notifications";

export interface CollaborationRequest {
  id: string;
  projectId: string;
  requesterId: string;
  ownerId: string;
  message: string;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
  updatedAt: number;
}

export async function createCollaborationRequest(
  projectId: string,
  requesterId: string,
  ownerId: string,
  message: string
) {
  const existingSnapshot = await get(
    ref(database, `collaborationRequests/${projectId}`)
  );

  if (existingSnapshot.exists()) {
    const requests = existingSnapshot.val();

    const existing = Object.values(requests).find(
      (request: any) =>
        request.requesterId === requesterId &&
        request.status === "pending"
    );

    if (existing) {
      throw new Error(
        "You already have a pending request for this project."
      );
    }
  }

  const requestRef = push(
    ref(database, `collaborationRequests/${projectId}`)
  );

  const request: CollaborationRequest = {
    id: requestRef.key!,
    projectId,
    requesterId,
    ownerId,
    message: message.trim(),
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await update(requestRef, request);

  await createNotification(ownerId, {
    type: "collaboration_request",
    title: "New collaboration request",
    message: "Someone wants to collaborate on your project.",
    actorId: requesterId,
    projectId,
    requestId: requestRef.key!,
    read: false,
    createdAt: Date.now(),
  });

  return requestRef.key;
}

export async function getProjectRequests(
  projectId: string
): Promise<CollaborationRequest[]> {
  const snapshot = await get(
    ref(database, `collaborationRequests/${projectId}`)
  );

  if (!snapshot.exists()) {
    return [];
  }

  return Object.entries(snapshot.val())
    .map(([id, request]) => ({
      id,
      ...(request as Omit<CollaborationRequest, "id">),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getUserProjectRequest(
  projectId: string,
  uid: string
): Promise<CollaborationRequest | null> {
  const snapshot = await get(
    ref(database, `collaborationRequests/${projectId}`)
  );

  if (!snapshot.exists()) {
    return null;
  }

  const requests = snapshot.val();

  for (const [id, request] of Object.entries(requests)) {
    const data = request as any;

    if (
      data.requesterId === uid &&
      data.status === "pending"
    ) {
      return {
        id,
        ...data,
      } as CollaborationRequest;
    }
  }

  return null;
}

export async function acceptCollaborationRequest(
  request: CollaborationRequest
) {
  const projectSnapshot = await get(
    ref(database, `projects/${request.projectId}`)
  );

  if (!projectSnapshot.exists()) {
    throw new Error("Project no longer exists.");
  }

  const project = projectSnapshot.val();

  if (project.ownerId !== request.ownerId) {
    throw new Error("You do not own this project.");
  }

  const currentMembers = project.members || {};

  if (currentMembers[request.requesterId]) {
    await update(
      ref(
        database,
        `collaborationRequests/${request.projectId}/${request.id}`
      ),
      {
        status: "accepted",
        updatedAt: Date.now(),
      }
    );

    return;
  }

  const memberCount = Object.keys(currentMembers).length;

  const updates: Record<string, any> = {};

  updates[
    `collaborationRequests/${request.projectId}/${request.id}/status`
  ] = "accepted";

  updates[
    `collaborationRequests/${request.projectId}/${request.id}/updatedAt`
  ] = Date.now();

  updates[
    `projects/${request.projectId}/members/${request.requesterId}`
  ] = {
    role: "member",
    joinedAt: Date.now(),
  };

  updates[
    `projects/${request.projectId}/memberCount`
  ] = memberCount + 1;

  await update(ref(database), updates);

  await createNotification(request.requesterId, {
    type: "collaboration_accepted",
    title: "Collaboration request accepted",
    message: "You were accepted as a collaborator.",
    actorId: request.ownerId,
    projectId: request.projectId,
    requestId: request.id,
    read: false,
    createdAt: Date.now(),
  });
}

export async function declineCollaborationRequest(
  request: CollaborationRequest
) {
  await update(
    ref(
      database,
      `collaborationRequests/${request.projectId}/${request.id}`
    ),
    {
      status: "declined",
      updatedAt: Date.now(),
    }
  );

  await createNotification(request.requesterId, {
    type: "collaboration_declined",
    title: "Collaboration request declined",
    message: "Your collaboration request was declined.",
    actorId: request.ownerId,
    projectId: request.projectId,
    requestId: request.id,
    read: false,
    createdAt: Date.now(),
  });
}

export async function cancelCollaborationRequest(
  request: CollaborationRequest
) {
  await remove(
    ref(
      database,
      `collaborationRequests/${request.projectId}/${request.id}`
    )
  );
}