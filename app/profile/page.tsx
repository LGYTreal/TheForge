"use client";

import {
  onAuthStateChanged,
  User,
} from "firebase/auth";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { auth } from "@/firebase/auth";

import {
  getUserProfile,
  ForgeUser,
} from "@/firebase/users";

import {
  getFollowerCount,
  getFollowingCount,
} from "@/firebase/follows";

import { getProjectCount } from "@/firebase/projects";

export default function ProfilePage() {
  const router = useRouter();

  const [authUser, setAuthUser] =
    useState<User | null>(null);

  const [profile, setProfile] =
    useState<ForgeUser | null>(null);

  const [projects, setProjects] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          setAuthUser(user);

          if (user) {
            try {
              const [
                profileData,
                projectCount,
                followerCount,
                followingCount,
              ] = await Promise.all([
                getUserProfile(user.uid),
                getProjectCount(user.uid),
                getFollowerCount(user.uid),
                getFollowingCount(user.uid),
              ]);

              setProfile(profileData);
              setProjects(projectCount);
              setFollowers(followerCount);
              setFollowing(followingCount);
            } catch (error) {
              console.error(
                "Failed to load profile:",
                error
              );
            }
          }

          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="text-zinc-500">
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
            Log in to view your Forge profile.
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

  const displayName =
    profile?.displayName ||
    authUser.displayName ||
    "Forge User";

  const username =
    profile?.username ||
    `user${authUser.uid.slice(0, 6)}`;

  return (
    <main className="forge-page min-h-screen bg-[#050505] px-6 pb-20 pt-28 text-white">
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
            {profile?.banner && (
              <img
                src={profile.banner}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          <div className="px-8 pb-8">
            <div className="forge-stagger-1 -mt-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
                <div className="relative z-10 flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-[#050505] bg-zinc-800 text-4xl font-bold">
                  {profile?.avatar ? (
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

              <Link
                href="/profile/edit"
                className="forge-button rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-sm font-medium transition hover:bg-white/[0.08]"
              >
                Edit profile
              </Link>
            </div>

            <div className="forge-stagger-2 mt-8 max-w-2xl">
              <p className="text-zinc-400">
                {profile?.bio ||
                  "This creator hasn't written a bio yet."}
              </p>
            </div>

            <div className="forge-stagger-3 mt-8 flex flex-wrap gap-2">
              {(profile?.skills || []).map(
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
              <div className="forge-interactive text-center">
                <p className="text-2xl font-bold">
                  {projects}
                </p>

                <p className="text-sm text-zinc-500">
                  Projects
                </p>
              </div>

              <div className="forge-interactive text-center">
                <p className="text-2xl font-bold">
                  {followers}
                </p>

                <p className="text-sm text-zinc-500">
                  Followers
                </p>
              </div>

              <div className="forge-interactive text-center">
                <p className="text-2xl font-bold">
                  {following}
                </p>

                <p className="text-sm text-zinc-500">
                  Following
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}