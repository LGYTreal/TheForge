"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  get,
  getDatabase,
  ref,
  serverTimestamp,
  update,
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

const statuses = [
  "Planning",
  "In Development",
  "Beta",
  "Released",
];

type Project = {
  ownerId: string;
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  website?: string;
  github?: string;
  status?: string;
  lookingForCollaborators?: boolean;
  thumbnailUrl?: string;
  contactInfo?: {
    email?: string;
    discord?: string;
    twitter?: string;
    other?: string;
  };
};

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [notFound, setNotFound] = useState(false);

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
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setChecking(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!projectId || checking) {
      return;
    }

    async function loadProject() {
      if (!auth.currentUser) {
        return;
      }

      try {
        const database = getDatabase(app);
        const snapshot = await get(
          ref(database, `projects/${projectId}`)
        );

        if (!snapshot.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const project = snapshot.val() as Project;

        if (project.ownerId !== auth.currentUser.uid) {
          setUnauthorized(true);
          setLoading(false);
          return;
        }

        setName(project.name || "");
        setDescription(project.description || "");
        setCategory(project.category || "Software");
        setTags((project.tags || []).join(", "));
        setWebsite(project.website || "");
        setGithub(project.github || "");
        setStatus(project.status || "Planning");
        setCollaborators(
          project.lookingForCollaborators ?? true
        );
        setContactEmail(project.contactInfo?.email || "");
        setDiscord(project.contactInfo?.discord || "");
        setTwitter(project.contactInfo?.twitter || "");
        setOtherContact(project.contactInfo?.other || "");
        setThumbnailUrl(project.thumbnailUrl || "");

        if (project.thumbnailUrl) {
          setThumbnailName("Current thumbnail");
        }

        setLoading(false);
      } catch {
        setError("Failed to load the project.");
        setLoading(false);
      }
    }

    loadProject();
  }, [projectId, checking]);

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
      setError("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("The thumbnail must be smaller than 10MB.");
      event.target.value = "";
      return;
    }

    setError("");
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
        throw new Error(
          result.error || "Image upload failed."
        );
      }

      setThumbnailUrl(result.url);
    } catch (uploadError) {
      setThumbnailUrl("");
      setThumbnailName("");
      setError(
        uploadError instanceof Error
          ? uploadError.message
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

  async function handleSave() {
    if (!auth.currentUser) {
      router.replace("/login");
      return;
    }

    if (!name.trim() || !description.trim()) {
      setError("Project name and description are required.");
      return;
    }

    if (uploadingImage) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const database = getDatabase(app);
      const projectRef = ref(
        database,
        `projects/${projectId}`
      );

      const updates = {
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
        updatedAt: serverTimestamp(),
      };

      await update(projectRef, updates);

      router.replace(`/projects/${projectId}`);
    } catch (saveError) {
      setSaving(false);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save the project."
      );
    }
  }

  if (checking || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="forge-scale text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white" />

          <p className="mt-4 text-sm text-zinc-500">
            {checking
              ? "Checking your account..."
              : "Loading project..."}
          </p>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="forge-scale max-w-md text-center">
          <h1 className="text-4xl font-black">
            Project not found
          </h1>

          <p className="mt-4 text-zinc-500">
            This project doesn't exist.
          </p>

          <button
            type="button"
            onClick={() => router.replace("/projects")}
            className="forge-button mt-8 rounded-2xl bg-white px-6 py-3.5 font-semibold text-black hover:bg-zinc-200"
          >
            Browse projects
          </button>
        </div>
      </main>
    );
  }

  if (unauthorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="forge-scale max-w-md text-center">
          <h1 className="text-4xl font-black">
            You can't edit this project
          </h1>

          <p className="mt-4 text-zinc-500">
            Only the project owner can edit it.
          </p>

          <button
            type="button"
            onClick={() => router.replace(`/projects/${projectId}`)}
            className="forge-button mt-8 rounded-2xl bg-white px-6 py-3.5 font-semibold text-black hover:bg-zinc-200"
          >
            Back to project
          </button>
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
          type="button"
          onClick={() => router.back()}
          className="forge-button mb-8 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white"
        >
          <span className="text-lg leading-none">←</span>
          Back
        </button>

        <div className="forge-stagger-1 mb-10">
          <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
            EDIT PROJECT
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Update your project.
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-500">
            Change the information people see when they discover
            your project on Forge.
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
                          Thumbnail
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
                onChange={(event) =>
                  setDescription(event.target.value)
                }
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
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
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
                  onChange={(event) =>
                    setStatus(event.target.value)
                  }
                  className="forge-focus w-full appearance-none rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white"
                >
                  {statuses.map((item) => (
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
                  onChange={(event) =>
                    setWebsite(event.target.value)
                  }
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
                  onChange={(event) =>
                    setGithub(event.target.value)
                  }
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
                    onChange={(event) =>
                      setDiscord(event.target.value)
                    }
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
                    onChange={(event) =>
                      setTwitter(event.target.value)
                    }
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
                    Let other Forge users know you're looking for
                    people to join your project.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={collaborators}
                  onClick={() =>
                    setCollaborators(!collaborators)
                  }
                  className={`relative flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors duration-200 ${
                    collaborators
                      ? "bg-violet-500"
                      : "bg-white/10"
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

            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-8 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  router.replace(`/projects/${projectId}`)
                }
                disabled={saving}
                className="forge-button rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-3.5 font-medium text-zinc-300 hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={
                  saving ||
                  uploadingImage ||
                  !name.trim() ||
                  !description.trim()
                }
                className="forge-button rounded-2xl bg-white px-7 py-3.5 font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving
                  ? "Saving..."
                  : uploadingImage
                    ? "Uploading..."
                    : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}