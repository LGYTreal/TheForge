"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  getDatabase,
  push,
  ref,
  serverTimestamp,
  set,
} from "firebase/database";

import { auth } from "@/firebase/auth";
import app from "@/firebase/config";

const categories = [
  "Game",
  "Software",
  "Website",
  "Creative",
  "Hardware",
  "Education",
  "Other",
];

export default function NewProjectPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Software");
  const [tags, setTags] = useState("");
  const [website, setWebsite] = useState("");
  const [github, setGithub] = useState("");
  const [status, setStatus] = useState("Planning");
  const [collaborators, setCollaborators] = useState(true);

  const [contactEmail, setContactEmail] = useState("");
  const [discord, setDiscord] = useState("");
  const [twitter, setTwitter] = useState("");
  const [otherContact, setOtherContact] = useState("");

  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailName, setThumbnailName] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  function normalizeUrl(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
      return "";
    }

    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://")
    ) {
      return trimmed;
    }

    return `https://${trimmed}`;
  }

  async function handleThumbnailChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("The thumbnail must be smaller than 10MB.");
      event.target.value = "";
      return;
    }

    setUploadingImage(true);
    setThumbnailName(file.name);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Image upload failed.");
      }

      setThumbnailUrl(result.url);
    } catch (error) {
      console.error(error);
      setThumbnailUrl("");
      setThumbnailName("");

      alert(
        error instanceof Error
          ? error.message
          : "Failed to upload image."
      );
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  function removeThumbnail() {
    setThumbnailUrl("");
    setThumbnailName("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handlePublish() {
    if (!auth.currentUser) {
      router.replace("/login");
      return;
    }

    if (!name.trim() || !description.trim()) {
      return;
    }

    if (uploadingImage) {
      return;
    }

    setSaving(true);

    try {
      const database = getDatabase(app);
      const projectsRef = ref(database, "projects");
      const projectRef = push(projectsRef);

      const project = {
        id: projectRef.key,
        ownerId: auth.currentUser.uid,
        name: name.trim(),
        description: description.trim(),
        category,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        website: normalizeUrl(website),
        github: normalizeUrl(github),
        status,
        lookingForCollaborators: collaborators,
        thumbnailUrl: thumbnailUrl || "",
        contactInfo: {
          email: contactEmail.trim(),
          discord: discord.trim(),
          twitter: twitter.trim(),
          other: otherContact.trim(),
        },
        members: {
          [auth.currentUser.uid]: {
            role: "owner",
            joinedAt: serverTimestamp(),
          },
        },
        memberCount: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await set(projectRef, project);

      router.push("/projects");
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to publish project."
      );
      setSaving(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="forge-scale text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white" />

          <p className="mt-4 text-sm text-zinc-500">
            Checking your account...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-6 pb-20 pt-28 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-300px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[140px]" />

        <div className="absolute bottom-[-300px] right-[-150px] h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[140px]" />
      </div>

      <div className="mx-auto max-w-4xl">
        <button
          onClick={() => router.back()}
          className="forge-button mb-8 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.08] hover:text-white"
        >
          <span className="text-lg">←</span>
          Back
        </button>

        <div className="forge-stagger-1 mb-10">
          <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
            CREATE PROJECT
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Bring your idea to life.
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-500">
            Tell the Forge community what you're building and find people
            who want to build it with you.
          </p>
        </div>

        <div className="forge-glass forge-stagger-2 rounded-3xl p-6 sm:p-8">
          <div className="space-y-8">
            <div>
              <label className="mb-3 block text-sm font-medium text-zinc-300">
                Project thumbnail
              </label>

              {thumbnailUrl ? (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <div className="relative aspect-[16/7] w-full overflow-hidden">
                    <img
                      src={thumbnailUrl}
                      alt="Project thumbnail preview"
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {thumbnailName}
                        </p>

                        <p className="mt-1 text-xs text-zinc-400">
                          Thumbnail uploaded
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={removeThumbnail}
                        className="shrink-0 rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-black/70"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="forge-button group relative flex aspect-[16/7] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[0.02] transition hover:border-violet-400/40 hover:bg-violet-500/[0.03] disabled:cursor-wait"
                >
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl transition group-hover:scale-110 group-hover:border-violet-400/30">
                    {uploadingImage ? "↑" : "✦"}
                  </div>

                  <p className="text-sm font-medium text-zinc-300">
                    {uploadingImage
                      ? "Uploading thumbnail..."
                      : "Add a project thumbnail"}
                  </p>

                  <p className="mt-2 text-xs text-zinc-600">
                    PNG, JPG, GIF, or WebP · Max 10MB
                  </p>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="hidden"
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-zinc-300">
                Project name
              </label>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="What's your project called?"
                maxLength={80}
                className="forge-focus w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder:text-zinc-700"
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-zinc-300">
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What are you building?"
                maxLength={500}
                rows={5}
                className="forge-focus w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder:text-zinc-700"
              />

              <p className="mt-2 text-right text-xs text-zinc-700">
                {description.length}/500
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-3 block text-sm font-medium text-zinc-300">
                  Category
                </label>

                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="forge-focus w-full appearance-none rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white"
                >
                  {categories.map((item) => (
                    <option
                      key={item}
                      value={item}
                      className="bg-[#111111]"
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-zinc-300">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="forge-focus w-full appearance-none rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white"
                >
                  <option value="Planning" className="bg-[#111111]">
                    Planning
                  </option>

                  <option
                    value="In Development"
                    className="bg-[#111111]"
                  >
                    In Development
                  </option>

                  <option value="Beta" className="bg-[#111111]">
                    Beta
                  </option>

                  <option value="Released" className="bg-[#111111]">
                    Released
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-zinc-300">
                Tags
              </label>

              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="react, game, ai, open-source"
                className="forge-focus w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder:text-zinc-700"
              />

              <p className="mt-2 text-xs text-zinc-600">
                Separate tags with commas.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-3 block text-sm font-medium text-zinc-300">
                  Website
                </label>

                <input
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  placeholder="example.com"
                  className="forge-focus w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder:text-zinc-700"
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-zinc-300">
                  GitHub
                </label>

                <input
                  value={github}
                  onChange={(event) => setGithub(event.target.value)}
                  placeholder="github.com/username/project"
                  className="forge-focus w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder:text-zinc-700"
                />
              </div>
            </div>

            <div>
              <div className="mb-4">
                <p className="text-lg font-semibold text-white">
                  Contact information
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  Give people a way to reach you about your project.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-3 block text-sm font-medium text-zinc-300">
                    Contact email
                  </label>

                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(event) =>
                      setContactEmail(event.target.value)
                    }
                    placeholder="you@example.com"
                    className="forge-focus w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder:text-zinc-700"
                  />
                </div>

                <div>
                  <label className="mb-3 block text-sm font-medium text-zinc-300">
                    Discord
                  </label>

                  <input
                    value={discord}
                    onChange={(event) => setDiscord(event.target.value)}
                    placeholder="username or server invite"
                    className="forge-focus w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder:text-zinc-700"
                  />
                </div>

                <div>
                  <label className="mb-3 block text-sm font-medium text-zinc-300">
                    X / Twitter
                  </label>

                  <input
                    value={twitter}
                    onChange={(event) => setTwitter(event.target.value)}
                    placeholder="@username or profile URL"
                    className="forge-focus w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder:text-zinc-700"
                  />
                </div>

                <div>
                  <label className="mb-3 block text-sm font-medium text-zinc-300">
                    Other contact
                  </label>

                  <input
                    value={otherContact}
                    onChange={(event) =>
                      setOtherContact(event.target.value)
                    }
                    placeholder="Anything else..."
                    className="forge-focus w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white placeholder:text-zinc-700"
                  />
                </div>
              </div>
            </div>

            <div className="forge-card rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between gap-5">
                <div>
                  <p className="font-medium">
                    Looking for collaborators
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    Let other Forge users know you're looking for people
                    to join your project.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={collaborators}
                  onClick={() => setCollaborators(!collaborators)}
                  className={`relative flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors duration-200 ${
                    collaborators ? "bg-violet-500" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      collaborators
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-8 sm:flex-row sm:justify-end">
              <button
                onClick={() => router.back()}
                className="forge-button rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-3.5 font-medium text-zinc-300 hover:bg-white/[0.07] hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={handlePublish}
                disabled={
                  saving ||
                  uploadingImage ||
                  !name.trim() ||
                  !description.trim()
                }
                className="forge-button rounded-2xl bg-white px-7 py-3.5 font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving
                  ? "Publishing..."
                  : uploadingImage
                    ? "Uploading..."
                    : "Publish project"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}