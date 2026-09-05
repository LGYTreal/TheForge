"use client";

import {
  onAuthStateChanged,
  User,
} from "firebase/auth";

import { useEffect, useState } from "react";
import { getDatabase, onValue, ref, remove, set } from "firebase/database";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { auth } from "@/firebase/auth";

import {
  getUserProfile,
  ForgeUser,
} from "@/firebase/users";

import {
  followUser,
  getFollowerIds,
  getFollowingIds,
  getFollowerCount,
  getFollowingCount,
  isFollowing,
  unfollowUser,
} from "@/firebase/follows";

import {
  ForgeProject,
  getProjectsByOwner,
} from "@/firebase/projects";

interface ProfilePerson {
  uid: string;
  profile: ForgeUser;
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedUid = searchParams.get("uid");

  const [authUser, setAuthUser] =
    useState<User | null>(null);

  const [profileUid, setProfileUid] =
    useState<string>("");

  const [profile, setProfile] =
    useState<ForgeUser | null>(null);

  const [followers, setFollowers] = useState<ProfilePerson[]>([]);
  const [following, setFollowing] = useState<ProfilePerson[]>([]);
  const [projects, setProjects] =
    useState<ForgeProject[]>([]);

  const [followerCount, setFollowerCount] =
    useState(0);

  const [followingCount, setFollowingCount] =
    useState(0);

  const [followingUser, setFollowingUser] =
    useState(false);

  const [followLoading, setFollowLoading] =
    useState(false);

  const [blocked, setBlocked] = useState(false);

  const [blockLoading, setBlockLoading] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [activeSection, setActiveSection] =
    useState<"projects" | "followers" | "following">(
      "projects"
    );

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          setAuthUser(user);

          if (!user) {
            setLoading(false);
            return;
          }

          const targetUid =
            requestedUid || user.uid;

          setProfileUid(targetUid);
          setLoading(true);
          setError("");

          try {
            const [
              profileData,
              followerCountData,
              followingCountData,
              followerIds,
              followingIds,
              projectData,
            ] = await Promise.all([
              getUserProfile(targetUid),
              getFollowerCount(targetUid),
              getFollowingCount(targetUid),
              getFollowerIds(targetUid),
              getFollowingIds(targetUid),
              getProjectsByOwner(targetUid),
            ]);

            if (!profileData) {
              setProfile(null);
              setError("This user could not be found.");
              setLoading(false);
              return;
            }

            setProfile(profileData);
            setFollowerCount(followerCountData);
            setFollowingCount(followingCountData);
            setProjects(projectData);

            if (targetUid !== user.uid) {
              const followingResult =
                await isFollowing(
                  user.uid,
                  targetUid
                );

              setFollowingUser(followingResult);
            } else {
              setFollowingUser(false);
            }

            const followerProfiles =
              await Promise.all(
                followerIds.map(async (uid) => {
                  const userProfile =
                    await getUserProfile(uid);

                  if (!userProfile) {
                    return null;
                  }

                  return {
                    uid,
                    profile: userProfile,
                  };
                })
              );

            const followingProfiles =
              await Promise.all(
                followingIds.map(async (uid) => {
                  const userProfile =
                    await getUserProfile(uid);

                  if (!userProfile) {
                    return null;
                  }

                  return {
                    uid,
                    profile: userProfile,
                  };
                })
              );

            setFollowers(
              followerProfiles.filter(
                (
                  person
                ): person is ProfilePerson =>
                  person !== null
              )
            );

            setFollowing(
              followingProfiles.filter(
                (
                  person
                ): person is ProfilePerson =>
                  person !== null
              )
            );
          } catch {
            setError(
              "Unable to load this profile right now."
            );
          } finally {
            setLoading(false);
          }
        }
      );

    return () => unsubscribe();
  }, [requestedUid]);

  useEffect(() => {
    if (!authUser || !profileUid || authUser.uid === profileUid) {
      setBlocked(false);
      return;
    }

    const blockedRef = ref(
      getDatabase(),
      `blockedUsers/${authUser.uid}/${profileUid}`
    );

    return onValue(blockedRef, (snapshot) => {
      setBlocked(snapshot.exists());
    });
  }, [authUser, profileUid]);

  async function handleBlock() {
    if (
      !authUser ||
      !profileUid ||
      authUser.uid === profileUid ||
      blockLoading
    ) {
      return;
    }

    setBlockLoading(true);

    try {
      const blockedRef = ref(
        getDatabase(),
        `blockedUsers/${authUser.uid}/${profileUid}`
      );

      if (blocked) {
        await remove(blockedRef);
        setBlocked(false);
      } else {
        await set(blockedRef, true);
        setBlocked(true);
      }
    } finally {
      setBlockLoading(false);
    }
  }

  async function handleFollow() {
    if (
      !authUser ||
      !profileUid ||
      authUser.uid === profileUid ||
      followLoading
    ) {
      return;
    }

    setFollowLoading(true);

    try {
      if (followingUser) {
        await unfollowUser(
          authUser.uid,
          profileUid
        );

        setFollowingUser(false);
        setFollowerCount((count) =>
          Math.max(0, count - 1)
        );
      } else {
        await followUser(
          authUser.uid,
          profileUid
        );

        setFollowingUser(true);
        setFollowerCount((count) => count + 1);
      }
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="forge-scale text-zinc-500">
          Loading profile...
        </div>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            You're not logged in.
          </h1>

          <p className="mt-3 text-zinc-500">
            Log in to view Forge profiles.
          </p>

          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-black"
          >
            Log in
          </Link>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="forge-glass max-w-md rounded-3xl p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
            ?
          </div>

          <h1 className="mt-6 text-2xl font-bold">
            Profile not found
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            {error ||
              "This Forge user doesn't exist."}
          </p>

          <Link
            href="/users"
            className="mt-7 inline-flex rounded-xl bg-white px-6 py-3 font-semibold text-black"
          >
            Browse users
          </Link>
        </div>
      </main>
    );
  }

  const isOwnProfile =
    authUser.uid === profileUid;

  const displayName =
    profile.displayName ||
    "Forge User";

  const username =
    profile.username ||
    `user${profileUid.slice(0, 6)}`;

  const activePeople =
    activeSection === "followers"
      ? followers
      : following;

  return (
    <main className="forge-page min-h-screen bg-[#050505] px-6 pb-20 pt-28 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-300px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[140px]" />
        <div className="absolute bottom-[-300px] right-[-150px] h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[140px]" />
      </div>

      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => router.back()}
          className="forge-button mb-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
        >
          <span className="text-lg leading-none">
            ←
          </span>

          Back
        </button>

        <div className="forge-card overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
          <div className="relative h-48 overflow-hidden bg-gradient-to-br from-violet-600/30 via-blue-600/10 to-transparent">
            {profile.banner && (
              <img
                src={profile.banner}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>

          <div className="px-8 pb-8">
            <div className="forge-stagger-1 -mt-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
                <div className="relative z-10 flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-[#050505] bg-zinc-800 text-4xl font-bold">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    displayName
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>

                <div className="pb-2">
                  <h1 className="text-3xl font-bold">
                    {displayName}
                  </h1>

                  <p className="mt-1 text-zinc-500">
                    @{username}
                  </p>
                </div>
              </div>

              {isOwnProfile ? (
                <Link
                  href="/profile/edit"
                  className="forge-button rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-sm font-medium transition hover:bg-white/[0.08]"
                >
                  Edit profile
                </Link>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleFollow}
                    disabled={followLoading || blockLoading}
                    className={`forge-button rounded-xl px-6 py-3 text-sm font-semibold transition ${
                      followingUser
                        ? "border border-white/10 bg-white/[0.04] text-zinc-300 hover:border-red-400/20 hover:bg-red-400/5 hover:text-red-300"
                        : "bg-white text-black hover:bg-zinc-200"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {followLoading
                      ? "..."
                      : followingUser
                        ? "Following"
                        : "Follow"}
                  </button>

                  <button
                    type="button"
                    onClick={handleBlock}
                    disabled={blockLoading || followLoading}
                    className={`forge-button rounded-xl border px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      blocked
                        ? "border-red-500/20 bg-red-500/[0.08] text-red-300 hover:bg-red-500/[0.14]"
                        : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    {blockLoading ? "..." : blocked ? "Unblock" : "Block"}
                  </button>
                </div>
              )}
            </div>

            <div className="forge-stagger-2 mt-8 max-w-2xl">
              <p className="text-zinc-400">
                {profile.bio ||
                  "This creator hasn't written a bio yet."}
              </p>
            </div>

            <div className="forge-stagger-3 mt-8 flex flex-wrap gap-2">
              {(profile.skills || []).map(
                (skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-white/[0.08]"
                  >
                    {skill}
                  </span>
                )
              )}
            </div>

            <div className="forge-stagger-4 mt-10 grid grid-cols-3 gap-3 border-t border-white/10 pt-8">
              <button
                type="button"
                onClick={() =>
                  setActiveSection("projects")
                }
                className={`forge-interactive rounded-2xl p-4 text-left transition ${
                  activeSection === "projects"
                    ? "bg-white/[0.06]"
                    : "hover:bg-white/[0.03]"
                }`}
              >
                <p className="text-2xl font-bold">
                  {projects.length}
                </p>

                <p className="text-sm text-zinc-500">
                  Projects
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveSection("followers")
                }
                className={`forge-interactive rounded-2xl p-4 text-left transition ${
                  activeSection === "followers"
                    ? "bg-white/[0.06]"
                    : "hover:bg-white/[0.03]"
                }`}
              >
                <p className="text-2xl font-bold">
                  {followerCount}
                </p>

                <p className="text-sm text-zinc-500">
                  Followers
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveSection("following")
                }
                className={`forge-interactive rounded-2xl p-4 text-left transition ${
                  activeSection === "following"
                    ? "bg-white/[0.06]"
                    : "hover:bg-white/[0.03]"
                }`}
              >
                <p className="text-2xl font-bold">
                  {followingCount}
                </p>

                <p className="text-sm text-zinc-500">
                  Following
                </p>
              </button>
            </div>
          </div>
        </div>

        <section className="mt-8">
          {activeSection === "projects" ? (
            <div>
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    Projects
                  </h2>

                  <p className="mt-1 text-sm text-zinc-600">
                    Things {isOwnProfile ? "you" : `${displayName}`} are building.
                  </p>
                </div>

                <span className="text-sm text-zinc-600">
                  {projects.length}
                </span>
              </div>

              {projects.length === 0 ? (
                <div className="forge-glass rounded-3xl border border-white/10 p-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-xl">
                    ✦
                  </div>

                  <h3 className="mt-5 text-lg font-semibold">
                    No projects yet
                  </h3>

                  <p className="mt-2 text-sm text-zinc-600">
                    {isOwnProfile
                      ? "Create your first project and start building."
                      : "This user hasn't created any projects yet."}
                  </p>

                  {isOwnProfile && (
                    <Link
                      href="/projects/new"
                      className="forge-button mt-6 inline-flex rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black"
                    >
                      Create a project
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {projects.map((project, index) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className={`forge-card forge-stagger-${Math.min(
                        index + 1,
                        6
                      )} group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] transition hover:bg-white/[0.04]`}
                    >
                      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
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
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="line-clamp-1 text-xl font-bold">
                            {project.name}
                          </h3>

                          <span className="text-zinc-700 transition group-hover:translate-x-1 group-hover:text-zinc-400">
                            →
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
                          {project.description}
                        </p>

                        {project.tags &&
                          project.tags.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {project.tags
                                .slice(0, 3)
                                .map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-500"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                            </div>
                          )}

                        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-zinc-600">
                          <span>
                            {project.status ||
                              "Planning"}
                          </span>

                          <span>
                            {project.memberCount ||
                              1}{" "}
                            {(project.memberCount ||
                              1) === 1
                              ? "member"
                              : "members"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-5">
                <h2 className="text-2xl font-bold">
                  {activeSection === "followers"
                    ? "Followers"
                    : "Following"}
                </h2>

                <p className="mt-1 text-sm text-zinc-600">
                  {activeSection === "followers"
                    ? `People following ${isOwnProfile ? "you" : displayName}.`
                    : `People ${isOwnProfile ? "you" : displayName} follow.`}
                </p>
              </div>

              {activePeople.length === 0 ? (
                <div className="forge-glass rounded-3xl border border-white/10 p-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-xl">
                    @
                  </div>

                  <h3 className="mt-5 text-lg font-semibold">
                    No{" "}
                    {activeSection === "followers"
                      ? "followers"
                      : "following"}{" "}
                    yet
                  </h3>

                  <p className="mt-2 text-sm text-zinc-600">
                    {activeSection === "followers"
                      ? "When people follow this user, they'll appear here."
                      : "People this user follows will appear here."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {activePeople.map(
                    (person, index) => (
                      <Link
                        key={person.uid}
                        href={`/profile?uid=${person.uid}`}
                        className={`forge-card forge-stagger-${Math.min(
                          index + 1,
                          6
                        )} group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition hover:bg-white/[0.05]`}
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-800 text-lg font-bold">
                          {person.profile.avatar ? (
                            <img
                              src={person.profile.avatar}
                              alt={
                                person.profile
                                  .displayName
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            (
                              person.profile
                                .displayName ||
                              person.profile.username ||
                              "?"
                            )
                              .charAt(0)
                              .toUpperCase()
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold transition group-hover:text-violet-300">
                            {person.profile
                              .displayName ||
                              person.profile.username}
                          </h3>

                          <p className="mt-0.5 truncate text-sm text-zinc-600">
                            @
                            {
                              person.profile
                                .username
                            }
                          </p>
                        </div>

                        <span className="text-zinc-700 transition group-hover:translate-x-1 group-hover:text-zinc-400">
                          →
                        </span>
                      </Link>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}