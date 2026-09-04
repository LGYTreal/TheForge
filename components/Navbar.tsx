"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, signOut } from "@/firebase/auth";
import { isAdmin } from "@/firebase/admin";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);

        if (!currentUser) {
          setAdmin(false);
          return;
        }

        try {
          setAdmin(await isAdmin(currentUser.uid));
        } catch {
          setAdmin(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  async function handleLogout() {
    await signOut(auth);
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50">
      <nav className="mx-auto mt-4 flex max-w-7xl items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-5 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white font-black text-black transition-transform duration-300 group-hover:rotate-6">
            F
          </div>
          <span className="text-lg font-bold tracking-tight">
            Forge
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <Link
            href="/projects"
            className="rounded-xl px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
          >
            Projects
          </Link>

          <Link
            href="/users"
            className="rounded-xl px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
          >
            Users
          </Link>

          {user && (
            <>
              <Link
                href="/profile"
                className="rounded-xl px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
              >
                Profile
              </Link>

              <Link
                href="/settings"
                className="rounded-xl px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
              >
                Settings
              </Link>

              {admin && (
                <Link
                  href="/admin"
                  className="rounded-xl px-4 py-2 text-sm font-medium text-violet-300 transition hover:bg-violet-400/10 hover:text-violet-200"
                >
                  Admin
                </Link>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://discord.gg/nQtf8RBaXy"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Forge Discord"
            className="forge-button flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M19.54 5.11A16.1 16.1 0 0 0 15.46 3.8l-.5 1.02a15.3 15.3 0 0 0-5.92 0l-.5-1.02a16.1 16.1 0 0 0-4.08 1.31C1.88 8.14 1.18 11.1 1.53 14.02a16.4 16.4 0 0 0 5.01 2.54l1.21-1.64c-.66-.24-1.29-.54-1.88-.9l.46-.35c3.62 1.7 7.54 1.7 11.12 0l.47.35c-.6.36-1.23.66-1.89.9l1.21 1.64a16.4 16.4 0 0 0 5.01-2.54c.42-3.38-.72-6.31-2.71-8.91ZM8.38 13.17c-1.08 0-1.96-1-1.96-2.23s.86-2.24 1.96-2.24 1.98 1 1.96 2.24c0 1.23-.86 2.23-1.96 2.23Zm7.24 0c-1.08 0-1.96-1-1.96-2.23s.86-2.24 1.96-2.24 1.98 1 1.96 2.24c0 1.23-.86 2.23-1.96 2.23Z" />
            </svg>
          </a>

          <a
            href="https://github.com/LGYTreal/TheForge"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Forge GitHub"
            className="forge-button flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.25c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.2.08 1.84 1.23 1.84 1.23 1.07 1.84 2.8 1.31 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.94 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.18 0 0 1-.32 3.3 1.23A11.5 11.5 0 0 1 12 5.3c1.02 0 2.05.14 3.01.41 2.3-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.76.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.93.43.37.81 1.1.81 2.22v3.28c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
            </svg>
          </a>

          {user ? (
            <button
              onClick={handleLogout}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Log out
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-xl px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white sm:block"
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