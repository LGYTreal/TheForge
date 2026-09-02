"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth, signOut } from "@/firebase/auth";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(auth.currentUser);
  const [animations, setAnimations] = useState(true);
  const [cursorEffects, setCursorEffects] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        router.replace("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const savedAnimations = localStorage.getItem("forge-animations");
    const savedCursorEffects = localStorage.getItem("forge-cursor-effects");

    if (savedAnimations !== null) {
      setAnimations(savedAnimations === "true");
    }

    if (savedCursorEffects !== null) {
      setCursorEffects(savedCursorEffects === "true");
    }
  }, []);

  function updateAnimations(value: boolean) {
    setAnimations(value);
    localStorage.setItem("forge-animations", String(value));
  }

  function updateCursorEffects(value: boolean) {
    setCursorEffects(value);
    localStorage.setItem("forge-cursor-effects", String(value));
  }

  async function handleLogout() {
    await signOut(auth);
    router.replace("/");
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-6 pb-20 pt-28 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-350px] h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[160px]" />
        <div className="absolute bottom-[-300px] right-[-150px] h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[150px]" />
      </div>

      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="forge-button mb-8 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
        >
          <span className="text-lg leading-none">←</span>
          Back
        </button>

        <div className="forge-stagger-1">
          <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
            FORGE
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Settings
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-500">
            Manage your account, profile, appearance, and Forge preferences.
          </p>
        </div>

        <div className="mt-10 space-y-6">
          <section className="forge-stagger-2 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
            <div className="border-b border-white/10 p-6 sm:p-8">
              <h2 className="text-xl font-bold">Account</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Manage your Forge account.
              </p>
            </div>

            <div className="divide-y divide-white/10">
              <Link
                href="/profile"
                className="forge-button flex items-center justify-between gap-6 p-6 transition hover:bg-white/[0.03] sm:px-8"
              >
                <div>
                  <p className="font-medium text-zinc-200">Profile</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Edit your profile, bio, banner, and contact information.
                  </p>
                </div>

                <span className="text-zinc-500">→</span>
              </Link>

              <div className="flex items-center justify-between gap-6 p-6 sm:px-8">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-200">Email</p>
                  <p className="mt-1 truncate text-sm text-zinc-500">
                    {user.email || "No email address"}
                  </p>
                </div>

                <span className="shrink-0 text-xs text-zinc-600">
                  Managed by Firebase
                </span>
              </div>

              <div className="flex items-center justify-between gap-6 p-6 sm:px-8">
                <div>
                  <p className="font-medium text-zinc-200">Account ID</p>
                  <p className="mt-1 max-w-[260px] truncate font-mono text-xs text-zinc-600">
                    {user.uid}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="forge-stagger-3 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
            <div className="border-b border-white/10 p-6 sm:p-8">
              <h2 className="text-xl font-bold">Appearance</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Customize how Forge behaves and looks.
              </p>
            </div>

            <div className="divide-y divide-white/10">
              <div className="flex items-center justify-between gap-6 p-6 sm:px-8">
                <div>
                  <p className="font-medium text-zinc-200">Animations</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Enable Forge page and interface animations.
                  </p>
                </div>

                <button
                  type="button"
                  aria-pressed={animations}
                  onClick={() => updateAnimations(!animations)}
                  className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
                    animations
                      ? "border-violet-400/40 bg-violet-500"
                      : "border-white/10 bg-white/10"
                  }`}
                >
                  <span
                    className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200 ${
                      animations ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-6 p-6 sm:px-8">
                <div>
                  <p className="font-medium text-zinc-200">Cursor effects</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Enable Forge cursor glow and pointer effects.
                  </p>
                </div>

                <button
                  type="button"
                  aria-pressed={cursorEffects}
                  onClick={() => updateCursorEffects(!cursorEffects)}
                  className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
                    cursorEffects
                      ? "border-violet-400/40 bg-violet-500"
                      : "border-white/10 bg-white/10"
                  }`}
                >
                  <span
                    className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200 ${
                      cursorEffects ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          <section className="forge-stagger-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
            <div className="border-b border-white/10 p-6 sm:p-8">
              <h2 className="text-xl font-bold">Security</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Manage your session and account access.
              </p>
            </div>

            <div className="divide-y divide-white/10">
              <div className="flex items-center justify-between gap-6 p-6 sm:px-8">
                <div>
                  <p className="font-medium text-zinc-200">Sign out</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Sign out of your Forge account on this device.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="forge-button shrink-0 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.1] hover:text-white"
                >
                  Log out
                </button>
              </div>
            </div>
          </section>

          <section className="forge-stagger-5 overflow-hidden rounded-3xl border border-red-500/10 bg-red-500/[0.02]">
            <div className="border-b border-red-500/10 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-red-300">Danger Zone</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Actions here can permanently affect your account.
              </p>
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="font-medium text-zinc-200">Delete account</p>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-500">
                    Permanently delete your Forge account and associated data.
                    This will be added once account deletion is fully wired up.
                  </p>
                </div>

                <button
                  type="button"
                  disabled
                  className="shrink-0 cursor-not-allowed rounded-xl border border-red-500/10 bg-red-500/[0.04] px-4 py-2.5 text-sm font-medium text-red-300/40"
                >
                  Delete account
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}