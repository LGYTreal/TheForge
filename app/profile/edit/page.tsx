"use client";

import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { auth } from "@/firebase/auth";
import { getUserProfile, updateUserProfile } from "@/firebase/users";

export default function EditProfilePage() {
  const router = useRouter();

  const [uid, setUid] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [banner, setBanner] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setUid(user.uid);

      try {
        const profile = await getUserProfile(user.uid);

        if (profile) {
          setUsername(profile.username || "");
          setDisplayName(profile.displayName || "");
          setBio(profile.bio || "");
          setAvatar(profile.avatar || "");
          setBanner(profile.banner || "");
        }
      } catch {
        setError("Unable to load your profile.");
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  async function uploadImage(
    file: File,
    type: "avatar" | "banner"
  ) {
    setError("");
    setSuccess("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Images must be smaller than 10MB.");
      return;
    }

    if (type === "avatar") {
      setUploadingAvatar(true);
    } else {
      setUploadingBanner(true);
    }

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Image upload failed."
        );
      }

      if (type === "avatar") {
        setAvatar(data.url);
      } else {
        setBanner(data.url);
      }

      setSuccess(
        type === "avatar"
          ? "Profile picture uploaded!"
          : "Profile banner uploaded!"
      );
    } catch (error: any) {
      setError(
        error.message || "Failed to upload image."
      );
    } finally {
      if (type === "avatar") {
        setUploadingAvatar(false);
      } else {
        setUploadingBanner(false);
      }
    }
  }

  async function handleAvatarUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    await uploadImage(file, "avatar");

    event.target.value = "";
  }

  async function handleBannerUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    await uploadImage(file, "banner");

    event.target.value = "";
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!username.trim()) {
      setError("Username cannot be empty.");
      return;
    }

    if (!displayName.trim()) {
      setError("Display name cannot be empty.");
      return;
    }

    if (username.length < 3) {
      setError(
        "Username must be at least 3 characters."
      );
      return;
    }

    setSaving(true);

    try {
      await updateUserProfile(uid, {
        username: username.trim(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar: avatar.trim(),
        banner: banner.trim(),
      });

      setSuccess(
        "Profile updated successfully."
      );

      setTimeout(() => {
        router.push("/profile");
      }, 700);
    } catch (error: any) {
      setError(
        error.message ||
          "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <p className="text-zinc-500">
          Loading...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-6 pb-20 pt-32 text-white">
      <div className="mx-auto max-w-2xl">

        {/* Header */}

        <div className="mb-8">
          <Link
            href="/profile"
            className="text-sm text-zinc-500 transition hover:text-white"
          >
            ← Back to profile
          </Link>

          <h1 className="mt-5 text-4xl font-bold">
            Edit profile
          </h1>

          <p className="mt-2 text-zinc-500">
            Customize how people see you on Forge.
          </p>
        </div>

        <form
          onSubmit={handleSave}
          className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8"
        >

          {/* Banner */}

          <div className="mb-8">
            <label className="mb-3 block text-sm font-medium">
              Profile banner
            </label>

            <div className="relative h-40 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/30 via-blue-600/10 to-transparent">

              {banner && (
                <img
                  src={banner}
                  alt="Banner preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}

              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <label className="cursor-pointer rounded-xl border border-white/10 bg-black/50 px-5 py-3 text-sm font-medium backdrop-blur-md transition hover:bg-black/70">
                  {uploadingBanner
                    ? "Uploading..."
                    : "Choose banner"}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    disabled={uploadingBanner}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <p className="mt-2 text-xs text-zinc-600">
              Recommended: wide images such as 1500×500.
              Maximum 10MB.
            </p>
          </div>

          {/* Profile picture */}

          <div className="mb-8">
            <label className="mb-3 block text-sm font-medium">
              Profile picture
            </label>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-zinc-800 text-2xl font-bold">

                {avatar ? (
                  <img
                    src={avatar}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  displayName
                    .charAt(0)
                    .toUpperCase() || "?"
                )}

              </div>

              <div className="flex-1">
                <label className="flex cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium transition hover:bg-white/[0.08]">

                  {uploadingAvatar
                    ? "Uploading..."
                    : "Choose image"}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    className="hidden"
                  />

                </label>

                <p className="mt-2 text-xs text-zinc-600">
                  Maximum 10MB.
                </p>
              </div>

            </div>
          </div>

          {/* Display name */}

          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium">
              Display name
            </label>

            <input
              type="text"
              value={displayName}
              onChange={(e) =>
                setDisplayName(e.target.value)
              }
              placeholder="Your display name"
              maxLength={40}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none transition placeholder:text-zinc-600 focus:border-white/30"
            />
          </div>

          {/* Username */}

          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium">
              Username
            </label>

            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] focus-within:border-white/30">

              <span className="pl-4 text-zinc-600">
                @
              </span>

              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                      .toLowerCase()
                      .replace(
                        /[^a-z0-9_]/g,
                        ""
                      )
                  )
                }
                placeholder="username"
                maxLength={24}
                className="w-full bg-transparent px-2 py-3 outline-none placeholder:text-zinc-600"
              />

            </div>

            <p className="mt-2 text-xs text-zinc-600">
              Only letters, numbers, and underscores.
            </p>
          </div>

          {/* Bio */}

          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">
                Bio
              </label>

              <span className="text-xs text-zinc-600">
                {bio.length}/160
              </span>
            </div>

            <textarea
              value={bio}
              onChange={(e) =>
                setBio(e.target.value.slice(0, 160))
              }
              placeholder="Tell people a little about yourself..."
              rows={4}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none transition placeholder:text-zinc-600 focus:border-white/30"
            />
          </div>

          {/* Messages */}

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
              {success}
            </div>
          )}

          {/* Buttons */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            <Link
              href="/profile"
              className="rounded-xl border border-white/10 px-5 py-3 text-center text-sm font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                saving ||
                uploadingAvatar ||
                uploadingBanner
              }
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Save changes"}
            </button>

          </div>

        </form>
      </div>
    </main>
  );
}