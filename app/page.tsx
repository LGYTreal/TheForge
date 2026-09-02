"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { onValue, ref } from "firebase/database";

import Navbar from "@/components/Navbar";
import { auth } from "@/firebase/auth";
import { database } from "@/firebase/database";

export default function Home() {
  const router = useRouter();

  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [creatorCount, setCreatorCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);

  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoggedIn(!!user);
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const usersRef = ref(database, "users");
    const projectsRef = ref(database, "projects");

    const unsubscribeUsers = onValue(
      usersRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data || typeof data !== "object") {
          setCreatorCount(0);
        } else {
          setCreatorCount(Object.keys(data).length);
        }

        setStatsLoaded(true);
      },
      () => {
        setCreatorCount(0);
        setStatsLoaded(true);
      }
    );

    const unsubscribeProjects = onValue(
      projectsRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data || typeof data !== "object") {
          setProjectCount(0);
          setCategoryCount(0);
          return;
        }

        const entries = Object.values(data).filter(
          (project) => project && typeof project === "object"
        );

        setProjectCount(entries.length);

        const categories = new Set<string>();

        entries.forEach((project) => {
          const category = (project as { category?: unknown }).category;

          if (typeof category === "string" && category.trim()) {
            categories.add(category.trim().toLowerCase());
          }
        });

        setCategoryCount(categories.size);
      },
      () => {
        setProjectCount(0);
        setCategoryCount(0);
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeProjects();
    };
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
              <p className="text-2xl font-bold">
                {statsLoaded ? creatorCount : "..."}
              </p>

              <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
                Creators
              </p>
            </div>

            <div className="forge-interactive text-center">
              <p className="text-2xl font-bold">
                {statsLoaded ? projectCount : "..."}
              </p>

              <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
                Projects
              </p>
            </div>

            <div className="forge-interactive text-center">
              <p className="text-2xl font-bold">
                {statsLoaded ? categoryCount : "..."}
              </p>

              <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
                Categories
              </p>
            </div>
          </div>
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