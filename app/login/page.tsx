"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  auth,
  googleProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "@/firebase/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);

      router.push("/");
    } catch (error: any) {
      setError(error.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    try {
      await signInWithPopup(auth, googleProvider);

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
        <h1 className="mb-2 text-4xl font-bold">Welcome back</h1>

        <p className="mb-8 text-zinc-400">
          Log in to your Forge account.
        </p>

        <button
          onClick={handleGoogleLogin}
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

        <form onSubmit={handleLogin} className="space-y-4">
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
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Don't have an account?{" "}
          <a href="/signup" className="text-white hover:underline">
            Create one
          </a>
        </p>
      </div>
    </main>
  );
}