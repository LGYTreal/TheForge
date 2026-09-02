"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";

import Navbar from "@/components/Navbar";
import { auth } from "@/firebase/auth";

const projects = [
  {
    name: "Neon Runner",
    description: "A futuristic arcade racing experience.",
    category: "Game",
    members: 12,
    progress: 74,
  },
  {
    name: "PixelOS",
    description: "A lightweight operating system experiment.",
    category: "Software",
    members: 7,
    progress: 48,
  },
  {
    name: "Project Aurora",
    description: "An open-source creative toolkit.",
    category: "Creative",
    members: 19,
    progress: 91,
  },
];

export default function Home() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoggedIn(!!user);
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  function handleStartBuilding() {
    if (checkingAuth) return;

    if (loggedIn) {
      router.push("/projects/new");
    } else {
      router.push("/login");
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <Navbar />

      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-300px] h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[140px]" />

        <div className="absolute bottom-[-300px] right-[-100px] h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[140px]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_75%)]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <section className="mx-auto flex min-h-screen max-w-7xl items-center px-6 pb-20 pt-32">
        <div className="w-full">
          <div className="mx-auto max-w-4xl text-center">

            <div className="forge-stagger-1 mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-400 backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              A new way to build together
            </div>

            <h1 className="forge-stagger-2 text-6xl font-black tracking-[-0.05em] sm:text-7xl md:text-8xl">
              Build something
              <br />

              <span className="bg-gradient-to-r from-white via-zinc-300 to-zinc-600 bg-clip-text text-transparent">
                together.
              </span>
            </h1>

            <p className="forge-stagger-3 mx-auto mt-8 max-w-2xl text-lg leading-8 text-zinc-400 sm:text-xl">
              Forge brings creators, developers, designers, and dreamers
              together to turn ideas into real projects.
            </p>

            <div className="forge-stagger-4 mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={handleStartBuilding}
                disabled={checkingAuth}
                className="forge-button group rounded-2xl bg-white px-7 py-4 font-semibold text-black transition duration-300 hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-70"
              >
                {checkingAuth ? "Loading..." : "Start building"}

                {!checkingAuth && (
                  <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                )}
              </button>

              <Link
                href="/explore"
                className="forge-button rounded-2xl border border-white/10 bg-white/[0.04] px-7 py-4 font-semibold text-white backdrop-blur transition duration-300 hover:bg-white/[0.08]"
              >
                Explore projects
              </Link>
            </div>
          </div>

          <div className="forge-stagger-5 mx-auto mt-24 grid max-w-3xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.025] py-6 backdrop-blur-xl">
            <div className="forge-interactive text-center">
              <p className="text-2xl font-bold">1.2K+</p>
              <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
                Creators
              </p>
            </div>

            <div className="forge-interactive text-center">
              <p className="text-2xl font-bold">380+</p>
              <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
                Projects
              </p>
            </div>

            <div className="forge-interactive text-center">
              <p className="text-2xl font-bold">42</p>
              <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
                Categories
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-32">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-violet-400">
              DISCOVER
            </p>

            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Projects worth seeing.
            </h2>
          </div>

          <Link
            href="/explore"
            className="forge-link hidden text-sm text-zinc-400 hover:text-white sm:block"
          >
            View all →
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {projects.map((project, index) => (
            <div
              key={project.name}
              className={`forge-card forge-stagger-${Math.min(
                index + 1,
                6
              )} group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]`}
            >
              <div className="relative h-48 overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,.35),transparent_40%)] transition duration-500 group-hover:scale-125" />

                <div className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-zinc-300 backdrop-blur">
                  {project.category}
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold">{project.name}</h3>

                <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-500">
                  {project.description}
                </p>

                <div className="mt-5 flex items-center justify-between text-xs text-zinc-500">
                  <span>👥 {project.members} members</span>
                  <span>{project.progress}% complete</span>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-700 group-hover:bg-violet-400"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-32">
        <div className="forge-card relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center sm:p-16">
          <div className="absolute left-1/2 top-0 h-40 w-96 -translate-x-1/2 rounded-full bg-violet-600/20 blur-[100px]" />

          <div className="relative">
            <h2 className="forge-stagger-1 text-4xl font-black tracking-tight sm:text-5xl">
              Your next project
              <br />
              starts here.
            </h2>

            <p className="forge-stagger-2 mx-auto mt-5 max-w-xl text-zinc-400">
              Stop waiting for the perfect team. Find people who want to
              build the same things you do.
            </p>

            <button
              onClick={handleStartBuilding}
              disabled={checkingAuth}
              className="forge-button forge-stagger-3 mt-8 inline-block rounded-2xl bg-white px-7 py-4 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-70"
            >
              {checkingAuth ? "Loading..." : "Start building"}
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-zinc-600">
        © 2026 Forge. Build something together.
      </footer>
    </main>
  );
}