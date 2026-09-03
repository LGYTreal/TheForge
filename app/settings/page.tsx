"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from "firebase/auth";
import {
  auth,
  deleteUser,
  signOut,
  updateEmail,
} from "@/firebase/auth";
import {
  get,
  getDatabase,
  ref,
  remove,
  serverTimestamp,
  update,
} from "firebase/database";
import firebaseApp from "@/firebase/config";

const database = getDatabase(firebaseApp);

export default function SettingsPage() {
  const router = useRouter();

  const [user, setUser] = useState(auth.currentUser);

  const [animations, setAnimations] = useState(true);
  const [cursorEffects, setCursorEffects] = useState(true);

  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

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
    const savedCursorEffects = localStorage.getItem(
      "forge-cursor-effects"
    );

    if (savedAnimations !== null) {
      setAnimations(savedAnimations === "true");
    }

    if (savedCursorEffects !== null) {
      setCursorEffects(savedCursorEffects === "true");
    }
  }, []);

  function dispatchPreferenceChange() {
    window.dispatchEvent(new Event("forge-preferences-changed"));
  }

  function updateAnimations(value: boolean) {
    setAnimations(value);
    localStorage.setItem("forge-animations", String(value));
    dispatchPreferenceChange();
  }

  function updateCursorEffects(value: boolean) {
    setCursorEffects(value);
    localStorage.setItem("forge-cursor-effects", String(value));
    dispatchPreferenceChange();
  }

  async function handleLogout() {
    await signOut(auth);
    router.replace("/");
  }

  async function handleEmailChange() {
    if (!user) return;

    setEmailError("");
    setEmailSuccess("");

    const trimmedEmail = newEmail.trim();

    if (!trimmedEmail) {
      setEmailError("Enter a new email address.");
      return;
    }

    if (trimmedEmail === user.email) {
      setEmailError("That is already your current email.");
      return;
    }

    try {
      if (
        user.providerData.some(
          (provider) => provider.providerId === "password"
        )
      ) {
        if (!emailPassword) {
          setEmailError("Enter your current account password.");
          return;
        }

        const credential = EmailAuthProvider.credential(
          user.email || "",
          emailPassword
        );

        await reauthenticateWithCredential(user, credential);
      } else {
        await reauthenticateWithPopup(
          user,
          new GoogleAuthProvider()
        );
      }

      await updateEmail(user, trimmedEmail);

      setNewEmail("");
      setEmailPassword("");
      setChangingEmail(false);
      setEmailSuccess("Your email address has been updated.");
    } catch (error: any) {
      if (error?.code === "auth/wrong-password") {
        setEmailError("Your current password is incorrect.");
      } else if (error?.code === "auth/invalid-email") {
        setEmailError("That email address is invalid.");
      } else if (error?.code === "auth/email-already-in-use") {
        setEmailError("That email address is already in use.");
      } else if (error?.code === "auth/requires-recent-login") {
        setEmailError(
          "For security, you need to sign in again before changing your email."
        );
      } else {
        setEmailError(
          error?.message || "Unable to update your email address."
        );
      }
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;

    setDeleteError("");
    setDeleting(true);

    try {
      if (
        user.providerData.some(
          (provider) => provider.providerId === "password"
        )
      ) {
        if (!deletePassword) {
          setDeleteError("Enter your password to continue.");
          setDeleting(false);
          return;
        }

        const credential = EmailAuthProvider.credential(
          user.email || "",
          deletePassword
        );

        await reauthenticateWithCredential(user, credential);
      } else {
        await reauthenticateWithPopup(
          user,
          new GoogleAuthProvider()
        );
      }

      const projectsSnapshot = await get(ref(database, "projects"));
      const projects = projectsSnapshot.val() || {};

      const deletions: Promise<void>[] = [];

      Object.entries(projects).forEach(
        ([projectId, project]: [string, any]) => {
          if (project?.ownerId === user.uid) {
            deletions.push(
              remove(ref(database, `projects/${projectId}`))
            );
          }
        }
      );

      deletions.push(remove(ref(database, `users/${user.uid}`)));
      deletions.push(remove(ref(database, `followers/${user.uid}`)));
      deletions.push(remove(ref(database, `following/${user.uid}`)));

      await Promise.all(deletions);

      await deleteUser(user);

      localStorage.removeItem("forge-animations");
      localStorage.removeItem("forge-cursor-effects");

      router.replace("/");
    } catch (error: any) {
      if (error?.code === "auth/wrong-password") {
        setDeleteError("Your password is incorrect.");
      } else if (error?.code === "auth/requires-recent-login") {
        setDeleteError(
          "For security, you need to sign in again before deleting your account."
        );
      } else {
        setDeleteError(
          error?.message || "Unable to delete your account."
        );
      }

      setDeleting(false);
    }
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white" />
      </main>
    );
  }

  const isPasswordAccount = user.providerData.some(
    (provider) => provider.providerId === "password"
  );

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

              <div className="p-6 sm:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-200">Email</p>
                    <p className="mt-1 truncate text-sm text-zinc-500">
                      {user.email || "No email address"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setChangingEmail(!changingEmail);
                      setEmailError("");
                      setEmailSuccess("");
                    }}
                    className="forge-button shrink-0 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/[0.1] hover:text-white"
                  >
                    {changingEmail ? "Cancel" : "Change email"}
                  </button>
                </div>

                {emailSuccess && (
                  <p className="mt-4 text-sm text-emerald-400">
                    {emailSuccess}
                  </p>
                )}

                {changingEmail && (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="space-y-3">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(event) =>
                          setNewEmail(event.target.value)
                        }
                        placeholder="New email address"
                        className="forge-focus w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-600"
                      />

                      {isPasswordAccount && (
                        <input
                          type="password"
                          value={emailPassword}
                          onChange={(event) =>
                            setEmailPassword(event.target.value)
                          }
                          placeholder="Current password"
                          className="forge-focus w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-600"
                        />
                      )}

                      {emailError && (
                        <p className="text-sm text-red-400">
                          {emailError}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={handleEmailChange}
                        className="forge-button rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-zinc-200"
                      >
                        Update email
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-6 p-6 sm:px-8">
                <div>
                  <p className="font-medium text-zinc-200">
                    Account ID
                  </p>
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
                  <p className="font-medium text-zinc-200">
                    Animations
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Enable Forge page and interface animations.
                  </p>
                </div>

                <button
                  type="button"
                  aria-pressed={animations}
                  onClick={() => updateAnimations(!animations)}
                  className={`relative h-7 w-12 shrink-0 rounded-full border ${
                    animations
                      ? "border-violet-400/40 bg-violet-500"
                      : "border-white/10 bg-white/10"
                  }`}
                >
                  <span
                    className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200 ${
                      animations
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-6 p-6 sm:px-8">
                <div>
                  <p className="font-medium text-zinc-200">
                    Cursor effects
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Enable Forge cursor glow and pointer effects.
                  </p>
                </div>

                <button
                  type="button"
                  aria-pressed={cursorEffects}
                  onClick={() =>
                    updateCursorEffects(!cursorEffects)
                  }
                  className={`relative h-7 w-12 shrink-0 rounded-full border ${
                    cursorEffects
                      ? "border-violet-400/40 bg-violet-500"
                      : "border-white/10 bg-white/10"
                  }`}
                >
                  <span
                    className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200 ${
                      cursorEffects
                        ? "translate-x-5"
                        : "translate-x-0"
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
                  <p className="font-medium text-zinc-200">
                    Sign out
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Sign out of your Forge account on this device.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="forge-button shrink-0 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/[0.1] hover:text-white"
                >
                  Log out
                </button>
              </div>
            </div>
          </section>

          <section className="forge-stagger-5 overflow-hidden rounded-3xl border border-red-500/10 bg-red-500/[0.02]">
            <div className="border-b border-red-500/10 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-red-300">
                Danger Zone
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Actions here can permanently affect your account.
              </p>
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="font-medium text-zinc-200">
                    Delete account
                  </p>

                  <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-500">
                    Permanently delete your Forge account, profile,
                    and projects.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDeleteOpen(true);
                    setDeleteError("");
                    setDeletePassword("");
                  }}
                  className="forge-button shrink-0 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/[0.14]"
                >
                  Delete account
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {deleteOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-red-500/20 bg-[#090909] p-6 shadow-2xl shadow-black/50 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-xl text-red-400">
              !
            </div>

            <h2 className="mt-6 text-2xl font-bold">
              Delete your account?
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              This permanently deletes your Forge profile and every
              project you own. This action cannot be undone.
            </p>

            {isPasswordAccount && (
              <input
                type="password"
                value={deletePassword}
                onChange={(event) =>
                  setDeletePassword(event.target.value)
                }
                placeholder="Enter your current password"
                className="forge-focus mt-6 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-600"
              />
            )}

            {deleteError && (
              <p className="mt-4 text-sm text-red-400">
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteOpen(false)}
                className="forge-button rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAccount}
                className="forge-button rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white hover:bg-red-400 disabled:cursor-wait disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Yes, delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}