"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/firebase/auth";
import {
  followUser,
  isFollowing,
  unfollowUser,
} from "@/firebase/follows";
import { getAllUsers, ForgeUserWithId } from "@/firebase/users";

function shuffleUsers(users: ForgeUserWithId[]) {
  const shuffled = [...users];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function UserCard({
  user,
  index,
  currentUid,
}: {
  user: ForgeUserWithId;
  index: number;
  currentUid: string;
}) {
  const isSelf = user.uid === currentUid;
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (isSelf) {
      return;
    }

    let active = true;

    async function checkFollowing() {
      try {
        const result = await isFollowing(currentUid, user.uid);

        if (active) {
          setFollowing(result);
        }
      } catch {
        if (active) {
          setFollowing(false);
        }
      }
    }

    checkFollowing();

    return () => {
      active = false;
    };
  }, [currentUid, user.uid, isSelf]);

  async function handleFollow(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isSelf || followLoading) {
      return;
    }

    setFollowLoading(true);

    try {
      if (following) {
        await unfollowUser(currentUid, user.uid);
        setFollowing(false);
      } else {
        await followUser(currentUid, user.uid);
        setFollowing(true);
      }
    } finally {
      setFollowLoading(false);
    }
  }

  return (
    <div
      className={`forge-card forge-glass forge-hover-glow group rounded-3xl p-6 ${
        index < 6 ? `forge-stagger-${index + 1}` : "forge-slide-up"
      }`}
    >
      <Link
        href={`/profile?uid=${user.uid}`}
        className="block"
      >
        <div className="flex items-start gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.displayName || user.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-bold text-zinc-400">
                {(user.displayName || user.username || "?")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-white transition-colors group-hover:text-violet-300">
              {user.displayName || user.username}
            </h2>

            <p className="mt-0.5 truncate text-sm text-zinc-500">
              @{user.username}
            </p>
          </div>

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-500 transition-all duration-300 group-hover:border-violet-400/20 group-hover:bg-violet-400/10 group-hover:text-violet-300">
            →
          </div>
        </div>

        <p className="mt-5 line-clamp-2 min-h-10 text-sm leading-5 text-zinc-400">
          {user.bio || "No bio yet."}
        </p>

        {user.skills?.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {user.skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-400"
              >
                {skill}
              </span>
            ))}

            {user.skills.length > 3 && (
              <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-500">
                +{user.skills.length - 3}
              </span>
            )}
          </div>
        )}
      </Link>

      <div className="mt-5 border-t border-white/10 pt-5">
        {isSelf ? (
          <div className="flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-sm font-medium text-zinc-500">
            You
          </div>
        ) : (
          <button
            type="button"
            onClick={handleFollow}
            disabled={followLoading}
            className={`forge-button h-10 w-full rounded-xl border text-sm font-semibold transition ${
              following
                ? "border-white/10 bg-white/[0.05] text-zinc-300 hover:border-red-400/20 hover:bg-red-400/5 hover:text-red-300"
                : "border-white/10 bg-white text-black hover:bg-zinc-200"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {followLoading
              ? "..."
              : following
                ? "Following"
                : "Follow"}
          </button>
        )}
      </div>
    </div>
  );
}

function UserSkeleton() {
  return (
    <div className="forge-glass rounded-3xl p-6">
      <div className="flex items-start gap-4">
        <div className="forge-shimmer h-16 w-16 shrink-0 rounded-2xl" />

        <div className="flex-1 space-y-3">
          <div className="forge-shimmer h-5 w-32 rounded-lg" />
          <div className="forge-shimmer h-4 w-24 rounded-lg" />
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div className="forge-shimmer h-4 w-full rounded-lg" />
        <div className="forge-shimmer h-4 w-3/4 rounded-lg" />
      </div>

      <div className="forge-shimmer mt-5 h-10 w-full rounded-xl" />
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<ForgeUserWithId[]>([]);
  const [randomUsers, setRandomUsers] = useState<ForgeUserWithId[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUid, setCurrentUid] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      setAuthenticated(true);
      setCurrentUid(user.uid);
      setLoading(true);
      setError("");

      try {
        const allUsers = await getAllUsers();

        setUsers(allUsers);
        setRandomUsers(shuffleUsers(allUsers).slice(0, 8));
      } catch {
        setError("Unable to load users right now.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return randomUsers;
    }

    return users.filter((user) => {
      const username = user.username?.toLowerCase() || "";
      const displayName = user.displayName?.toLowerCase() || "";

      return (
        username.includes(query) ||
        displayName.includes(query)
      );
    });
  }, [search, users, randomUsers]);

  function randomizeUsers() {
    setRandomUsers(shuffleUsers(users).slice(0, 8));
  }

  if (!authenticated && !loading) {
    return (
      <main className="min-h-screen bg-[#050505] px-5 pb-20 pt-32 text-white">
        <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center">
          <div className="forge-glass forge-scale w-full rounded-3xl p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-black text-black">
              F
            </div>

            <h1 className="mt-6 text-3xl font-bold tracking-tight">
              Sign in to discover people
            </h1>

            <p className="mx-auto mt-3 max-w-md text-zinc-400">
              Find developers, creators, and potential collaborators on
              Forge.
            </p>

            <Link
              href="/login"
              className="forge-button mt-7 inline-flex rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-5 pb-24 pt-32 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="forge-page">
          <div className="max-w-3xl">

            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Find your next{" "}
              <span className="forge-gradient-text">
                collaborator.
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
              Discover people building interesting things and find
              developers who could be a great fit for your next project.
            </p>
          </div>

          <div className="forge-glass forge-glow mt-10 rounded-3xl p-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <svg
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or username..."
                  className="forge-focus h-14 w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600"
                />
              </div>

              <button
                type="button"
                onClick={randomizeUsers}
                disabled={loading || users.length === 0}
                className="forge-button h-14 rounded-2xl border border-white/10 bg-white/5 px-6 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-40"
              >
                <span className="mr-2">↻</span>
                Randomize
              </button>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {search.trim()
                  ? "Search results"
                  : "People you might like"}
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {search.trim()
                  ? `${filteredUsers.length} ${
                      filteredUsers.length === 1
                        ? "person"
                        : "people"
                    } found`
                  : "Random members from the Forge community"}
              </p>
            </div>

            {!search.trim() && users.length > 8 && (
              <span className="hidden text-sm text-zinc-600 sm:block">
                {users.length} total members
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <UserSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <div className="forge-glass rounded-3xl p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/10 bg-red-400/5 text-red-300">
                !
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Something went wrong
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                {error}
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="forge-button mt-6 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
              >
                Try again
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="forge-glass forge-scale rounded-3xl p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
                ?
              </div>

              <h3 className="mt-5 text-xl font-semibold">
                No users found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                We couldn't find anyone matching "{search}".
                Try searching for another name or username.
              </p>

              <button
                type="button"
                onClick={() => setSearch("")}
                className="forge-button mt-6 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredUsers.map((user, index) => (
                <UserCard
                  key={user.uid}
                  user={user}
                  index={index}
                  currentUid={currentUid}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}