"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";
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
  thumbnailUrl?: string;
};

const categories = [
  "All",
  "Game",
  "Software",
  "Website",
  "Creative",
  "Hardware",
  "Education",
  "Other",
];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<Record<string, boolean>>({});
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
    });
  }, []);

  useEffect(() => {
    const database = getDatabase(app);
    const projectsRef = ref(database, "projects");

    const unsubscribe = onValue(
      projectsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          setProjects([]);
          setLoading(false);
          return;
        }

        const loadedProjects: Project[] = Object.entries(data).map(
          ([id, value]) => ({
            id,
            ...(value as Omit<Project, "id">),
          })
        );

        loadedProjects.sort(
          (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
        );
        setProjects(loadedProjects);
        setLoading(false);
      },
      () => {
        setProjects([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authUser) {
      setBlockedUsers({});
      return;
    }

    const blockedRef = ref(
      getDatabase(app),
      `blockedUsers/${authUser.uid}`
    );

    return onValue(blockedRef, (snapshot) => {
      setBlockedUsers(snapshot.exists() ? snapshot.val() : {});
    });
  }, [authUser]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      if (authUser && blockedUsers[project.ownerId]) {
        return false;
      }

      const matchesCategory =
        category === "All" || project.category === category;

      if (!matchesCategory) {
        return false;
      }
      if (!query) {
        return true;
      }

      const searchableText = [
        project.name,
        project.description,
        project.category,
        ...(project.tags || []),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [projects, search, category, authUser, blockedUsers]);

  return (
    <main className="min-h-screen bg-[#050505] px-6 pb-20 pt-28 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-300px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[140px]" />
        <div className="absolute bottom-[-300px] right-[-150px] h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[140px]" />
      </div>
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="forge-button forge-stagger-1 mb-8 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
        >
          <span className="text-lg leading-none">←</span>
          Back
        </button>
        <div className="forge-stagger-1 mb-12">
          <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
            FORGE PROJECTS
          </p>
          <div className="mt-3 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                Projects worth building.
              </h1>
              <p className="mt-4 max-w-2xl text-zinc-500">
                Discover what people are building on Forge and find
                something you want to be part of.
              </p>
            </div>
            <Link
              href="/projects/new"
              className="forge-button inline-flex shrink-0 items-center justify-center rounded-2xl bg-white px-6 py-3.5 font-semibold text-black hover:bg-zinc-200"
            >
              + Start a project
            </Link>
          </div>
        </div>
        <div className="forge-stagger-2 mb-8 rounded-3xl border border-white/10 bg-white/[0.025] p-4 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">
                ⌕
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search projects, tags, categories..."
                className="forge-focus w-full rounded-2xl border border-white/10 bg-black/20 py-3.5 pl-11 pr-5 text-white placeholder:text-zinc-700"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:max-w-2xl">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`forge-button shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    category === item
                      ? "bg-white text-black"
                      : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-zinc-600">
            {loading
              ? "Loading projects..."
              : `${filteredProjects.length} ${
                  filteredProjects.length === 1 ? "project" : "projects"
                }`}
          </p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-sm text-zinc-500 transition hover:text-white"
            >
              Clear search
            </button>
          )}
        </div>
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="forge-shimmer h-[330px] rounded-3xl border border-white/10"
              />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="forge-scale rounded-3xl border border-white/10 bg-white/[0.025] px-6 py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl">
              ✦
            </div>
            <h2 className="mt-6 text-2xl font-bold">
              No projects found
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">
              {search
                ? "Try a different search or category."
                : "Be the first person to create something on Forge."}
            </p>
            <Link
              href="/projects/new"
              className="forge-button mt-7 inline-flex rounded-2xl bg-white px-6 py-3 font-semibold text-black hover:bg-zinc-200"
            >
              Create a project
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project, index) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={`forge-card forge-stagger-${Math.min(
                  index + 1,
                  6
                )} group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]`}
              >
                <div className="relative h-44 overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
                  {project.thumbnailUrl ? (
                    <img
                      src={project.thumbnailUrl}
                      alt={`${project.name} thumbnail`}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(139,92,246,.3),transparent_45%)] transition duration-700 group-hover:scale-125" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute left-5 top-5 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur">
                    {project.category}
                  </div>
                  {project.lookingForCollaborators && (
                    <div className="absolute bottom-5 right-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300 backdrop-blur">
                      Looking for people
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="line-clamp-1 text-xl font-bold">
                      {project.name}
                    </h2>
                    <span className="shrink-0 text-zinc-700 transition group-hover:translate-x-1 group-hover:text-zinc-400">
                      →
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 min-h-[72px] text-sm leading-6 text-zinc-500">
                    {project.description}
                  </p>
                  {project.tags && project.tags.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {project.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-500"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-zinc-600">
                    <span>{project.status || "Planning"}</span>
                    <span>
                      {project.memberCount || 1}{" "}
                      {project.memberCount === 1 ? "member" : "members"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
