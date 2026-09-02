"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  auth,
  createUserWithEmailAndPassword,
  googleProvider,
  signInWithPopup,
} from "@/firebase/auth";

import { createUserProfile } from "@/firebase/users";

export default function SignupPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await createUserProfile(credential.user.uid, {
        username,
        displayName: username,
        email,
        bio: "",
        avatar: "",
        skills: [],
        createdAt: Date.now(),
      });

      router.push("/");
    } catch (error: any) {
      setError(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setError("");
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const username =
        user.displayName?.replace(/\s+/g, "").toLowerCase() ||
        `user${user.uid.slice(0, 6)}`;

      await createUserProfile(user.uid, {
        username,
        displayName: user.displayName || username,
        email: user.email || "",
        bio: "",
        avatar: user.photoURL || "",
        skills: [],
        createdAt: Date.now(),
      });

      router.push("/");
    } catch (error: any) {
      setError(error.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6 text-white">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-4xl font-bold">Join Forge</h1>

        <p className="mb-8 text-zinc-400">
          Build something together.
        </p>

        <button
          onClick={handleGoogleSignup}
          disabled={loading}
          className="mb-6 flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-medium transition hover:bg-zinc-800 disabled:opacity-50"
        >
          <span className="text-lg">G</span>
          Continue with Google
        </button>

        <div className="mb-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-sm text-zinc-500">OR</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none focus:border-zinc-500"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none focus:border-zinc-500"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none focus:border-zinc-500"
          />

          {error && (
            <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <a href="/login" className="text-white hover:underline">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}