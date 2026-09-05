"use client";

import ProjectFeatures from "@/components/ProjectFeatures";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getDatabase, onValue, ref, remove, set } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { getUserProfile, ForgeUser } from "@/firebase/users";

import app from "@/firebase/config";
import { auth } from "@/firebase/auth";

type Project = {
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
  updatedAt?: number;
  thumbnailUrl?: string;
  contactInfo?: {
    email?: string;
    discord?: string;
    twitter?: string;
    other?: string;
  };
};

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();

  const projectId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [creator, setCreator] = useState<ForgeUser | null>(null);
  const [creatorBlocked, setCreatorBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid ?? null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const database = getDatabase(app);
    const projectRef = ref(database, `projects/${projectId}`);

    const unsubscribe = onValue(
      projectRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setProject(null);
          setNotFound(true);
          setLoading(false);
          return;
        }

        setProject({
          id: projectId,
          ...data,
        });
        setNotFound(false);
        setLoading(false);
      },
      () => {
        setProject(null);
        setNotFound(true);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  useEffect(() => {
    if (!project?.ownerId) {
      setCreator(null);
      return;
    }

    let active = true;

    getUserProfile(project.ownerId).then((profile) => {
      if (active) {
        setCreator(profile);
      }
    });

    return () => {
      active = false;
    };
  }, [project?.ownerId]);

  useEffect(() => {
    if (!currentUserId || !project?.ownerId || currentUserId === project.ownerId) {
      setCreatorBlocked(false);
      return;
    }

    const blockedRef = ref(
      getDatabase(app),
      `blockedUsers/${currentUserId}/${project.ownerId}`
    );

    return onValue(blockedRef, (snapshot) => {
      setCreatorBlocked(snapshot.exists());
    });
  }, [currentUserId, project?.ownerId]);

  async function handleCreatorBlock() {
    if (
      !currentUserId ||
      !project?.ownerId ||
      currentUserId === project.ownerId ||
      blockLoading
    ) {
      return;
    }

    setBlockLoading(true);

    try {
      const blockedRef = ref(
        getDatabase(app),
        `blockedUsers/${currentUserId}/${project.ownerId}`
      );

      if (creatorBlocked) {
        await remove(blockedRef);
        setCreatorBlocked(false);
      } else {
        await set(blockedRef, true);
        setCreatorBlocked(true);
      }
    } finally {
      setBlockLoading(false);
    }
  }

  function formatDate(timestamp?: number) {
    if (!timestamp) {
      return "Recently";
    }

    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function normalizeUrl(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
      return "";
    }

    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://")
    ) {
      return trimmed;
    }

    return `https://${trimmed}`;
  }

  async function handleDelete() {
    if (!project || !currentUserId || currentUserId !== project.ownerId) {
      return;
    }

    setDeleting(true);
    setDeleteError(false);

    try {
      const database = getDatabase(app);
      await remove(ref(database, `projects/${projectId}`));
      router.replace("/projects");
    } catch {
      setDeleting(false);
      setDeleteError(true);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="forge-scale text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white" />
          <p className="mt-4 text-sm text-zinc-500">
            Loading project...
          </p>
        </div>
      </main>
    );
  }

  if (notFound || !project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="forge-scale max-w-md text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] text-3xl">
            ?
          </div>

          <p className="mt-8 text-sm font-medium uppercase tracking-widest text-violet-400">
            PROJECT NOT FOUND
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight">
            This project doesn't exist.
          </h1>

          <p className="mt-4 text-zinc-500">
            The project may have been deleted or the link is incorrect.
          </p>

          <Link
            href="/projects"
            className="forge-button mt-8 inline-flex rounded-2xl bg-white px-6 py-3.5 font-semibold text-black hover:bg-zinc-200"
          >
            Browse projects
          </Link>
        </div>
      </main>
    );
  }

  const websiteUrl = project.website
    ? normalizeUrl(project.website)
    : "";

  const githubUrl = project.github
    ? normalizeUrl(project.github)
    : "";

  const hasContactInfo =
    project.contactInfo?.email ||
    project.contactInfo?.discord ||
    project.contactInfo?.twitter ||
    project.contactInfo?.other;

  const isOwner =
    currentUserId !== null && currentUserId === project.ownerId;

  return (
    <main className="min-h-screen bg-[#050505] px-6 pb-20 pt-28 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-350px] h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[160px]" />
        <div className="absolute bottom-[-300px] right-[-150px] h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[150px]" />
      </div>

      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="forge-button mb-8 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
        >
          <span className="text-lg leading-none">←</span>
          Back
        </button>

        <div className="forge-stagger-1 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
          <div className="relative h-[240px] overflow-hidden bg-gradient-to-br from-violet-950/60 via-zinc-900 to-black sm:h-[360px]">
            {project.thumbnailUrl ? (
              <img
                src={project.thumbnailUrl}
                alt={`${project.name} thumbnail`}
                className="h-full w-full object-cover"
              />
            ) : (
              <>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,.35),transparent_40%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(59,130,246,.15),transparent_40%)]" />
              </>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/30 to-transparent" />

            <div className="absolute left-6 top-6 flex flex-wrap gap-2">
              <span className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur">
                {project.category}
              </span>

              <span className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur">
                {project.status || "Planning"}
              </span>
            </div>

            {project.lookingForCollaborators && (
              <div className="absolute bottom-6 right-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300 backdrop-blur">
                Looking for collaborators
              </div>
            )}
          </div>

          <div className="p-6 sm:p-10">
            <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
              FORGE PROJECT
            </p>

            <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
                {project.name}
              </h1>

              {isOwner && (
                <div className="flex shrink-0 gap-3">
                  <Link
                    href={`/projects/${projectId}/edit`}
                    className="forge-button rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.1] hover:text-white"
                  >
                    Edit project
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(false);
                      setShowDeleteModal(true);
                    }}
                    className="forge-button rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/[0.15] hover:text-red-200"
                  >
                    Delete project
                  </button>
                </div>
              )}
            </div>

            <p className="mt-6 max-w-3xl whitespace-pre-wrap text-base leading-8 text-zinc-400 sm:text-lg">
              {project.description}
            </p>

            {creator && (
              <div className="mt-8 flex flex-col gap-5 rounded-3xl border border-white/10 bg-black/20 p-5 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  href={`/profile?uid=${project.ownerId}`}
                  className="group flex min-w-0 items-center gap-4"
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-800 text-xl font-bold">
                    {creator.avatar ? (
                      <img
                        src={creator.avatar}
                        alt={creator.displayName || creator.username || "Creator"}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      (
                        creator.displayName ||
                        creator.username ||
                        "?"
                      )
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
                      Created by
                    </p>
                    <h2 className="mt-1 truncate text-lg font-bold text-white transition group-hover:text-violet-300">
                      {creator.displayName || creator.username || "Forge User"}
                    </h2>
                    <p className="mt-0.5 truncate text-sm text-zinc-500">
                      @{creator.username || project.ownerId.slice(0, 6)}
                    </p>
                  </div>
                </Link>

                <div className="flex shrink-0 flex-wrap gap-3">
                  <Link
                    href={`/profile?uid=${project.ownerId}`}
                    className="forge-button rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    View profile
                  </Link>

                  {!isOwner && currentUserId && (
                    <button
                      type="button"
                      onClick={handleCreatorBlock}
                      disabled={blockLoading}
                      className={`forge-button rounded-xl border px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        creatorBlocked
                          ? "border-red-500/20 bg-red-500/[0.08] text-red-300 hover:bg-red-500/[0.14]"
                          : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                      }`}
                    >
                      {blockLoading
                        ? "..."
                        : creatorBlocked
                          ? "Unblock creator"
                          : "Block creator"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {project.tags && project.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-10 grid gap-4 border-y border-white/10 py-6 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-600">
                  Status
                </p>

                <p className="mt-2 font-medium text-zinc-200">
                  {project.status || "Planning"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-600">
                  Team
                </p>

                <p className="mt-2 font-medium text-zinc-200">
                  {project.memberCount || 1}{" "}
                  {project.memberCount === 1 ? "member" : "members"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-600">
                  Created
                </p>

                <p className="mt-2 font-medium text-zinc-200">
                  {formatDate(project.createdAt)}
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
                <h2 className="text-xl font-bold">
                  Project links
                </h2>

                <div className="mt-5 flex flex-col gap-3">
                  {websiteUrl && (
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="forge-button flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300 hover:bg-white/[0.07] hover:text-white"
                    >
                      <span className="truncate">
                        Website
                      </span>
                      <span>↗</span>
                    </a>
                  )}

                  {githubUrl && (
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="forge-button flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300 hover:bg-white/[0.07] hover:text-white"
                    >
                      <span className="truncate">
                        GitHub
                      </span>
                      <span>↗</span>
                    </a>
                  )}

                  {!websiteUrl && !githubUrl && (
                    <p className="text-sm text-zinc-600">
                      No project links have been added yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
                <h2 className="text-xl font-bold">
                  Contact
                </h2>

                {hasContactInfo ? (
                  <div className="mt-5 space-y-4 text-sm">
                    {project.contactInfo?.email && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-zinc-600">
                          Email
                        </p>

                        <a
                          href={`mailto:${project.contactInfo.email}`}
                          className="mt-1 inline-block text-zinc-300 transition hover:text-white"
                        >
                          {project.contactInfo.email}
                        </a>
                      </div>
                    )}

                    {project.contactInfo?.discord && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-zinc-600">
                          Discord
                        </p>

                        <p className="mt-1 text-zinc-300">
                          {project.contactInfo.discord}
                        </p>
                      </div>
                    )}

                    {project.contactInfo?.twitter && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-zinc-600">
                          X / Twitter
                        </p>

                        <p className="mt-1 text-zinc-300">
                          {project.contactInfo.twitter}
                        </p>
                      </div>
                    )}

                    {project.contactInfo?.other && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-zinc-600">
                          Other
                        </p>

                        <p className="mt-1 whitespace-pre-wrap text-zinc-300">
                          {project.contactInfo.other}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-zinc-600">
                    No contact information has been added yet.
                  </p>
                )}
              </div>
            </div>

            <ProjectFeatures
            projectId={projectId}
            ownerId={project.ownerId}
            currentUserId={currentUserId}
            isOwner={isOwner}
            />

            <div className="mt-10 rounded-3xl border border-violet-400/10 bg-violet-500/[0.04] p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                <div>
                  <p className="text-lg font-bold">
                    Interested in this project?
                  </p>

                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Contact the project owner using the information above
                    to learn more or get involved.
                  </p>
                </div>

                <Link
                  href="/projects"
                  className="forge-button shrink-0 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 font-medium text-zinc-200 hover:bg-white/[0.1] hover:text-white"
                >
                  Explore more
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setShowDeleteModal(false);
            }
          }}
        >
          <div className="forge-scale w-full max-w-md rounded-3xl border border-white/10 bg-[#0b0b0b]/95 p-6 shadow-2xl shadow-black/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-xl font-bold text-red-400">
              !
            </div>

            <h2 className="mt-5 text-2xl font-bold text-white">
              Delete project?
            </h2>

            <p className="mt-3 leading-7 text-zinc-500">
              Are you sure you want to delete{" "}
              <span className="font-medium text-zinc-300">
                {project.name}
              </span>
              ? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
                Failed to delete the project. Please try again.
              </div>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="forge-button rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="forge-button rounded-xl bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 ring-1 ring-red-500/20 hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}