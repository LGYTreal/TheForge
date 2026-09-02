"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";

import { auth, signOut } from "@/firebase/auth";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);

    return () => unsubscribe();
  }, []);

  async function handleLogout() {
    await signOut(auth);
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50">
      <nav className="mx-auto mt-4 flex max-w-7xl items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-5 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black font-black transition-transform duration-300 group-hover:rotate-6">
            F
          </div>

          <span className="text-lg font-bold tracking-tight">
            Forge
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="/projects"
            className="text-sm text-zinc-400 transition hover:text-white"
          >
            Projects
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/profile"
                className="hidden rounded-xl px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white sm:block"
              >
                Profile
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden px-3 py-2 text-sm text-zinc-300 transition hover:text-white sm:block"
              >
                Log in
              </Link>

              <Link
                href="/signup"
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}