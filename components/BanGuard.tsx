"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/auth";
import { getUserBan, UserBan } from "@/firebase/admin";
import { getUserProfile, ForgeUser } from "@/firebase/users";

function formatDuration(milliseconds: number) {
  if (milliseconds <= 0) {
    return "Ban expired";
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0 || hours > 0 || days > 0) {
    parts.push(`${minutes}m`);
  }

  parts.push(`${seconds}s`);

  return parts.join(" ");
}

export default function BanGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [checking, setChecking] = useState(true);
  const [ban, setBan] = useState<UserBan | null>(null);
  const [admin, setAdmin] = useState<ForgeUser | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    let refreshTimer: ReturnType<typeof setInterval> | null = null;

    async function checkBan(user: User | null) {
      if (!mounted) return;

      setChecking(true);

      if (!user) {
        setBan(null);
        setAdmin(null);
        setRemaining(null);
        setChecking(false);
        return;
      }

      try {
        const currentBan = await getUserBan(user.uid);

        if (!mounted) return;

        if (!currentBan) {
          setBan(null);
          setAdmin(null);
          setRemaining(null);
          setChecking(false);
          return;
        }

        if (
          !currentBan.permanent &&
          currentBan.bannedUntil !== null &&
          currentBan.bannedUntil <= Date.now()
        ) {
          setBan(null);
          setAdmin(null);
          setRemaining(null);
          setChecking(false);
          return;
        }

        setBan(currentBan);

        if (currentBan.permanent) {
          setRemaining(null);
        } else if (currentBan.bannedUntil !== null) {
          setRemaining(
            Math.max(0, currentBan.bannedUntil - Date.now())
          );
        } else {
          setRemaining(null);
        }

        if (currentBan.bannedBy) {
          try {
            const adminProfile = await getUserProfile(
              currentBan.bannedBy
            );

            if (mounted) {
              setAdmin(adminProfile);
            }
          } catch {
            if (mounted) {
              setAdmin(null);
            }
          }
        } else {
          setAdmin(null);
        }

        if (mounted) {
          setChecking(false);
        }
      } catch (error) {
        console.error("BanGuard failed to check ban status:", error);

        if (mounted) {
          setBan(null);
          setAdmin(null);
          setRemaining(null);
          setChecking(false);
        }
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }

      checkBan(user);

      if (user) {
        refreshTimer = setInterval(() => {
          checkBan(user);
        }, 10000);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();

      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, []);

  useEffect(() => {
    if (!ban || ban.permanent || ban.bannedUntil === null) {
      return;
    }

    const update = () => {
      const timeLeft = Math.max(
        0,
        ban.bannedUntil! - Date.now()
      );

      setRemaining(timeLeft);

      if (timeLeft <= 0) {
        setBan(null);
        setAdmin(null);
        setRemaining(null);
      }
    };

    update();

    const timer = setInterval(update, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [ban]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white" />

          <p className="mt-5 text-sm text-zinc-500">
            Checking account status...
          </p>
        </div>
      </main>
    );
  }

  if (ban) {
    const adminName =
      admin?.displayName ||
      admin?.username ||
      "A Forge administrator";

    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-6 py-16 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-300px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-red-600/10 blur-[160px]" />

          <div className="absolute bottom-[-250px] left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[150px]" />
        </div>

        <div className="relative w-full max-w-2xl">
          <div className="rounded-[2rem] border border-red-500/20 bg-white/[0.035] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-12">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] border border-red-400/20 bg-red-500/10 text-4xl shadow-lg shadow-red-950/20">
                🚫
              </div>

              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.35em] text-red-400">
                ACCOUNT SUSPENDED
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                You have been banned.
              </h1>

              <p className="mt-5 max-w-lg text-sm leading-7 text-zinc-500">
                Your access to Forge has been suspended by an
                administrator. You will not be able to use Forge
                until the ban ends.
              </p>

              <div className="mt-10 w-full space-y-3 text-left">
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                  <p className="text-xs font-medium uppercase tracking-widest text-zinc-600">
                    Banned by
                  </p>

                  <p className="mt-2 text-lg font-semibold text-white">
                    {adminName}
                  </p>

                  {admin?.username && (
                    <p className="mt-1 text-sm text-zinc-500">
                      @{admin.username}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                  <p className="text-xs font-medium uppercase tracking-widest text-zinc-600">
                    Reason
                  </p>

                  <p className="mt-2 text-sm leading-7 text-zinc-300">
                    {ban.reason || "No reason was provided."}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                  <p className="text-xs font-medium uppercase tracking-widest text-zinc-600">
                    {ban.permanent
                      ? "Duration"
                      : "Time remaining"}
                  </p>

                  <p className="mt-2 text-2xl font-black text-white">
                    {ban.permanent
                      ? "Permanent"
                      : formatDuration(remaining || 0)}
                  </p>

                  {!ban.permanent &&
                    ban.bannedUntil !== null && (
                      <p className="mt-2 text-xs text-zinc-600">
                        Ban ends{" "}
                        {new Date(
                          ban.bannedUntil
                        ).toLocaleString()}
                      </p>
                    )}
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-white/5 bg-black/20 px-5 py-4">
                <p className="text-xs leading-6 text-zinc-600">
                  If you believe this ban was issued in error,
                  contact a Forge administrator.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-700">
            Forge Moderation System
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}