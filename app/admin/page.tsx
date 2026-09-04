"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "@/firebase/auth";
import {
  createBan,
  deleteAdminProject,
  getAdminProjects,
  getAdminReports,
  getAdminUsers,
  getAllBans,
  isAdmin,
  removeBan,
  updateReportStatus,
  AdminProject,
  AdminReport,
  AdminUser,
  UserBan,
} from "@/firebase/admin";
import { createNotification } from "@/firebase/notifications";

type Section =
  | "overview"
  | "projects"
  | "reports"
  | "users"
  | "bans";

const durations = [
  { label: "1 hour", value: 60 * 60 * 1000 },
  { label: "6 hours", value: 6 * 60 * 60 * 1000 },
  { label: "1 day", value: 24 * 60 * 60 * 1000 },
  { label: "3 days", value: 3 * 24 * 60 * 60 * 1000 },
  { label: "7 days", value: 7 * 24 * 60 * 60 * 1000 },
  { label: "30 days", value: 30 * 24 * 60 * 60 * 1000 },
];

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [section, setSection] = useState<Section>("overview");

  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [bans, setBans] = useState<UserBan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [deleteProject, setDeleteProject] =
    useState<AdminProject | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [banUser, setBanUser] = useState<AdminUser | null>(null);
  const [banDuration, setBanDuration] = useState(
    String(24 * 60 * 60 * 1000)
  );
  const [banReason, setBanReason] = useState("");
  const [banning, setBanning] = useState(false);

  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!active) {
          return;
        }

        setUser(currentUser);
        setAuthorized(null);
        setLoading(true);

        if (!currentUser) {
          if (!active) {
            return;
          }

          setAuthorized(false);
          setLoading(false);
          return;
        }

        const uid = currentUser.uid;

        try {
          const admin = await isAdmin(uid);

          if (!active) {
            return;
          }

          if (
            !auth.currentUser ||
            auth.currentUser.uid !== uid
          ) {
            return;
          }

          setAuthorized(admin);
        } catch {
          if (!active) {
            return;
          }

          if (
            auth.currentUser &&
            auth.currentUser.uid === uid
          ) {
            setAuthorized(false);
          }
        } finally {
          if (
            active &&
            auth.currentUser &&
            auth.currentUser.uid === uid
          ) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authorized) {
      return;
    }

    let active = true;

    async function load() {
      try {
        const [
          projectData,
          userData,
          reportData,
          banData,
        ] = await Promise.all([
          getAdminProjects(),
          getAdminUsers(),
          getAdminReports(),
          getAllBans(),
        ]);

        if (!active) {
          return;
        }

        if (!auth.currentUser) {
          return;
        }

        setProjects(projectData);
        setUsers(userData);
        setReports(reportData);
        setBans(banData);
      } catch (error: any) {
        if (!active) {
          return;
        }

        setActionError(
          error?.message || "Unable to load moderation data."
        );
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [authorized]);

  function flashSuccess(message: string) {
    setActionError("");
    setActionSuccess(message);

    window.setTimeout(() => {
      setActionSuccess("");
    }, 4000);
  }

  function flashError(message: string) {
    setActionSuccess("");
    setActionError(message);

    window.setTimeout(() => {
      setActionError("");
    }, 5000);
  }

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return projects;
    }

    return projects.filter((project) =>
      [
        project.name,
        project.description,
        project.category,
        project.ownerId,
        ...(project.tags || []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [projects, search]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((userItem) =>
      [
        userItem.username,
        userItem.displayName,
        userItem.email,
        userItem.uid,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [users, search]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return reports;
    }

    return reports.filter((report) =>
      [
        report.reason,
        report.details,
        report.targetId,
        report.reporterId,
        report.targetType,
        report.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [reports, search]);

  const openReports = reports.filter(
    (report) =>
      !report.status || report.status === "open"
  );

  const activeBans = bans.filter(
    (ban) =>
      ban.permanent ||
      !ban.bannedUntil ||
      ban.bannedUntil > Date.now()
  );

  function getUser(uid: string) {
    return users.find((item) => item.uid === uid);
  }

  function formatDate(timestamp?: number) {
    if (!timestamp) {
      return "Unknown";
    }

    return new Date(timestamp).toLocaleString();
  }

  function formatBan(ban: UserBan) {
    if (ban.permanent) {
      return "Permanent";
    }

    if (!ban.bannedUntil) {
      return "Unknown";
    }

    return `Until ${formatDate(ban.bannedUntil)}`;
  }

  async function handleDeleteProject() {
    if (!deleteProject || !user) {
      return;
    }

    const reason = deleteReason.trim();

    if (!reason) {
      flashError("A deletion reason is required.");
      return;
    }

    setDeleting(true);

    try {
      await deleteAdminProject(deleteProject.id);

      await createNotification(deleteProject.ownerId, {
        type: "moderation",
        title: "Project removed",
        message: `Your project "${deleteProject.name}" was removed by a Forge administrator. Reason: ${reason}`,
        actorId: user.uid,
        projectId: deleteProject.id,
        read: false,
        createdAt: Date.now(),
      });

      setProjects((current) =>
        current.filter(
          (project) => project.id !== deleteProject.id
        )
      );

      setDeleteProject(null);
      setDeleteReason("");

      flashSuccess(
        "Project deleted and creator notified."
      );
    } catch (error: any) {
      flashError(
        error?.message ||
          "Unable to delete the project."
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleReportStatus(
    report: AdminReport,
    status: "resolved" | "denied"
  ) {
    if (!user) {
      return;
    }

    try {
      await updateReportStatus(
        report.id,
        status,
        user.uid
      );

      setReports((current) =>
        current.map((item) =>
          item.id === report.id
            ? {
                ...item,
                status,
                resolvedBy: user.uid,
                resolvedAt: Date.now(),
              }
            : item
        )
      );

      flashSuccess(
        status === "resolved"
          ? "Report marked as resolved."
          : "Report denied."
      );
    } catch (error: any) {
      flashError(
        error?.message ||
          "Unable to update report."
      );
    }
  }

  async function handleBan() {
    if (!banUser || !user) {
      return;
    }

    const reason = banReason.trim();

    if (!reason) {
      flashError("A ban reason is required.");
      return;
    }

    setBanning(true);

    try {
      let bannedUntil: number | null = null;

      if (banDuration !== "permanent") {
        const duration = durations.find(
          (item) =>
            item.value.toString() === banDuration
        );

        if (duration) {
          bannedUntil =
            Date.now() + duration.value;
        }
      }

      const ban = await createBan(
        banUser.uid,
        bannedUntil,
        reason,
        user.uid
      );

      await createNotification(banUser.uid, {
        type: "moderation",
        title: "Your Forge account has been banned",
        message: ban.permanent
          ? `You have been permanently banned from Forge. Reason: ${reason}`
          : `You have been banned from Forge until ${formatDate(
              bannedUntil!
            )}. Reason: ${reason}`,
        actorId: user.uid,
        read: false,
        createdAt: Date.now(),
      });

      setBans((current) => [
        ...current.filter(
          (item) => item.uid !== banUser.uid
        ),
        ban,
      ]);

      setBanUser(null);
      setBanReason("");
      setBanDuration("86400000");

      flashSuccess("User banned and notified.");
    } catch (error: any) {
      flashError(
        error?.message ||
          "Unable to ban this user."
      );
    } finally {
      setBanning(false);
    }
  }

  async function handleUnban(uid: string) {
    try {
      await removeBan(uid);

      setBans((current) =>
        current.filter((ban) => ban.uid !== uid)
      );

      flashSuccess("User unbanned.");
    } catch (error: any) {
      flashError(
        error?.message ||
          "Unable to remove the ban."
      );
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="forge-scale text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white" />
          <p className="mt-4 text-sm text-zinc-500">
            Checking administrator access...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="forge-scale max-w-md text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-red-400/20 bg-red-400/10 text-3xl">
            !
          </div>

          <p className="mt-8 text-sm font-medium uppercase tracking-widest text-red-400">
            ACCESS DENIED
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Sign in required.
          </h1>

          <Link
            href="/login"
            className="forge-button mt-8 inline-flex rounded-2xl bg-white px-6 py-3.5 font-semibold text-black"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="forge-scale max-w-lg text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-red-400/20 bg-red-400/10 text-3xl">
            ⛔
          </div>

          <p className="mt-8 text-sm font-medium uppercase tracking-widest text-red-400">
            ADMIN ONLY
          </p>

          <h1 className="mt-3 text-4xl font-black">
            You don't have access.
          </h1>

          <p className="mt-4 leading-7 text-zinc-500">
            This area is restricted to authorized Forge
            administrators.
          </p>

          <Link
            href="/"
            className="forge-button mt-8 inline-flex rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-3.5 font-semibold text-white"
          >
            Return home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-6 pb-20 pt-28 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-350px] h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[160px]" />
        <div className="absolute bottom-[-300px] right-[-150px] h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[150px]" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="forge-stagger-1">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-violet-400">
            FORGE ADMIN
          </p>

          <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
                Command Center
              </h1>

              <p className="mt-4 max-w-2xl text-zinc-500">
                Manage projects, reports, users, and
                moderation from one place.
              </p>
            </div>

            <Link
              href="/"
              className="forge-button inline-flex w-fit rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white"
            >
              ← Back to Forge
            </Link>
          </div>
        </div>

        {(actionError || actionSuccess) && (
          <div
            className={`forge-pop mt-8 rounded-2xl border px-5 py-4 text-sm ${
              actionError
                ? "border-red-500/20 bg-red-500/10 text-red-300"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {actionError || actionSuccess}
          </div>
        )}

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Overview", "overview"],
            ["Projects", "projects"],
            ["Reports", "reports"],
            ["Users", "users"],
            ["Bans", "bans"],
          ].map(([label, value]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setSection(value as Section);
                setSearch("");
              }}
              className={`forge-button rounded-2xl border px-5 py-4 text-left transition ${
                section === value
                  ? "border-violet-400/30 bg-violet-400/10 text-white"
                  : "border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span className="text-sm font-semibold">
                {label}
              </span>
            </button>
          ))}
        </div>

        {section === "overview" && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                "Projects",
                projects.length,
                "Total projects",
              ],
              [
                "Open reports",
                openReports.length,
                "Need attention",
              ],
              [
                "Users",
                users.length,
                "Registered users",
              ],
              [
                "Active bans",
                activeBans.length,
                "Currently banned",
              ],
            ].map(([title, value, subtitle]) => (
              <div
                key={title}
                className="forge-card forge-stagger-2 rounded-3xl border border-white/10 bg-white/[0.025] p-6"
              >
                <p className="text-sm text-zinc-500">
                  {title}
                </p>

                <p className="mt-3 text-4xl font-black">
                  {value}
                </p>

                <p className="mt-2 text-xs text-zinc-600">
                  {subtitle}
                </p>
              </div>
            ))}
          </div>
        )}

        {section !== "overview" && (
          <div className="mt-8">
            <div className="relative">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder={
                  section === "projects"
                    ? "Search projects, creators, categories, tags..."
                    : section === "reports"
                      ? "Search reports..."
                      : section === "users"
                        ? "Search users..."
                        : "Search bans..."
                }
                className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/40"
              />
            </div>
          </div>
        )}

        {section === "projects" && (
          <div className="mt-5 space-y-3">
            {filteredProjects.map((project) => {
              const owner = getUser(project.ownerId);

              return (
                <div
                  key={project.id}
                  className="forge-card rounded-3xl border border-white/10 bg-white/[0.025] p-5"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-violet-400/10 px-2.5 py-1 text-xs text-violet-300">
                          {project.category}
                        </span>

                        <span className="text-xs text-zinc-600">
                          {formatDate(project.createdAt)}
                        </span>
                      </div>

                      <h2 className="mt-3 truncate text-xl font-bold">
                        {project.name}
                      </h2>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
                        {project.description}
                      </p>

                      <p className="mt-3 text-xs text-zinc-600">
                        Creator:{" "}
                        <span className="text-zinc-400">
                          {owner?.displayName ||
                            owner?.username ||
                            project.ownerId}
                        </span>
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Link
                        href={`/projects/${project.id}`}
                        className="forge-button rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                      >
                        View
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setDeleteProject(project);
                          setDeleteReason("");
                        }}
                        className="forge-button rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/15"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredProjects.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-12 text-center text-zinc-600">
                No projects found.
              </div>
            )}
          </div>
        )}

        {section === "reports" && (
          <div className="mt-5 space-y-3">
            {filteredReports.map((report) => {
              const reporter = getUser(report.reporterId);

              const targetUser =
                report.targetType === "user"
                  ? getUser(report.targetId)
                  : null;

              return (
                <div
                  key={report.id}
                  className="forge-card rounded-3xl border border-white/10 bg-white/[0.025] p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-red-400/10 px-2.5 py-1 text-xs font-medium uppercase text-red-300">
                          {report.reason}
                        </span>

                        <span className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs text-zinc-500">
                          {report.targetType}
                        </span>

                        <span
                          className={`rounded-lg px-2.5 py-1 text-xs ${
                            report.status === "resolved"
                              ? "bg-emerald-400/10 text-emerald-300"
                              : report.status === "denied"
                                ? "bg-zinc-400/10 text-zinc-400"
                                : "bg-amber-400/10 text-amber-300"
                          }`}
                        >
                          {report.status || "open"}
                        </span>
                      </div>

                      <p className="mt-4 text-sm leading-7 text-zinc-400">
                        {report.details ||
                          "No additional details provided."}
                      </p>

                      <div className="mt-4 space-y-1 text-xs text-zinc-600">
                        <p>
                          Reporter:{" "}
                          <span className="text-zinc-400">
                            {reporter?.displayName ||
                              reporter?.username ||
                              report.reporterId}
                          </span>
                        </p>

                        <p>
                          Target:{" "}
                          <span className="text-zinc-400">
                            {targetUser?.displayName ||
                              targetUser?.username ||
                              report.targetId}
                          </span>
                        </p>

                        <p>
                          Submitted:{" "}
                          {formatDate(report.createdAt)}
                        </p>
                      </div>
                    </div>

                    {(!report.status ||
                      report.status === "open") && (
                      <div className="flex shrink-0 gap-2 lg:self-start">
                        <button
                          type="button"
                          onClick={() =>
                            handleReportStatus(
                              report,
                              "resolved"
                            )
                          }
                          className="forge-button rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-300 hover:bg-emerald-400/15"
                        >
                          Resolve
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleReportStatus(
                              report,
                              "denied"
                            )
                          }
                          className="forge-button rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-400 hover:bg-white/[0.08] hover:text-white"
                        >
                          Deny
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredReports.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-12 text-center text-zinc-600">
                No reports found.
              </div>
            )}
          </div>
        )}

        {section === "users" && (
          <div className="mt-5 space-y-3">
            {filteredUsers.map((userItem) => {
              const ban = bans.find(
                (item) => item.uid === userItem.uid
              );

              return (
                <div
                  key={userItem.uid}
                  className="forge-card rounded-3xl border border-white/10 bg-white/[0.025] p-5"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                        {userItem.avatar ? (
                          <img
                            src={userItem.avatar}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-zinc-500">
                            {(
                              userItem.displayName ||
                              userItem.username ||
                              "?"
                            )[0].toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {userItem.displayName ||
                            userItem.username ||
                            "Unnamed user"}
                        </p>

                        <p className="truncate text-sm text-zinc-500">
                          @{userItem.username || "unknown"}
                        </p>

                        <p className="mt-1 truncate text-xs text-zinc-600">
                          {userItem.uid}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {ban &&
                      (ban.permanent ||
                        !ban.bannedUntil ||
                        ban.bannedUntil > Date.now()) ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleUnban(userItem.uid)
                          }
                          className="forge-button rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-300 hover:bg-emerald-400/15"
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setBanUser(userItem);
                            setBanReason("");
                            setBanDuration(
                              "86400000"
                            );
                          }}
                          className="forge-button rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/15"
                        >
                          Ban
                        </button>
                      )}

                      <Link
                        href={`/profile/${userItem.uid}`}
                        className="forge-button rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-400 hover:bg-white/[0.08] hover:text-white"
                      >
                        Profile
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-12 text-center text-zinc-600">
                No users found.
              </div>
            )}
          </div>
        )}

        {section === "bans" && (
          <div className="mt-5 space-y-3">
            {bans
              .filter((ban) => {
                const target = getUser(ban.uid);
                const query = search.trim().toLowerCase();

                if (!query) {
                  return true;
                }

                return [
                  ban.uid,
                  ban.reason,
                  target?.username,
                  target?.displayName,
                  target?.email,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase()
                  .includes(query);
              })
              .map((ban) => {
                const target = getUser(ban.uid);

                return (
                  <div
                    key={ban.uid}
                    className="forge-card rounded-3xl border border-white/10 bg-white/[0.025] p-5"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-semibold">
                          {target?.displayName ||
                            target?.username ||
                            ban.uid}
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          {ban.uid}
                        </p>

                        <p className="mt-3 text-sm text-zinc-400">
                          {ban.reason}
                        </p>

                        <p className="mt-2 text-xs text-zinc-600">
                          {formatBan(ban)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleUnban(ban.uid)
                        }
                        className="forge-button rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-300 hover:bg-emerald-400/15"
                      >
                        Unban
                      </button>
                    </div>
                  </div>
                );
              })}

            {bans.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-12 text-center text-zinc-600">
                No bans.
              </div>
            )}
          </div>
        )}
      </div>

      {deleteProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6 backdrop-blur-md">
          <div className="forge-scale w-full max-w-lg rounded-3xl border border-white/10 bg-[#0b0b0b] p-6 shadow-2xl">
            <p className="text-xs font-medium uppercase tracking-widest text-red-400">
              DELETE PROJECT
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Remove "{deleteProject.name}"?
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              This permanently removes the project. The
              creator will receive a notification containing
              the reason you provide.
            </p>

            <textarea
              value={deleteReason}
              onChange={(event) =>
                setDeleteReason(event.target.value)
              }
              placeholder="Why is this project being removed?"
              rows={5}
              className="mt-5 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-red-400/30"
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteProject(null);
                  setDeleteReason("");
                }}
                className="rounded-xl px-4 py-2.5 text-sm text-zinc-500 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteProject}
                className="forge-button rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50"
              >
                {deleting
                  ? "Deleting..."
                  : "Delete project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {banUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6 backdrop-blur-md">
          <div className="forge-scale w-full max-w-lg rounded-3xl border border-white/10 bg-[#0b0b0b] p-6 shadow-2xl">
            <p className="text-xs font-medium uppercase tracking-widest text-red-400">
              BAN USER
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Ban{" "}
              {banUser.displayName ||
                banUser.username ||
                "this user"}?
            </h2>

            <p className="mt-3 text-sm text-zinc-500">
              The user will be prevented from performing
              Forge actions while the ban is active.
            </p>

            <label className="mt-5 block text-xs uppercase tracking-wider text-zinc-600">
              Duration
            </label>

            <select
              value={banDuration}
              onChange={(event) =>
                setBanDuration(event.target.value)
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none"
            >
              {durations.map((duration) => (
                <option
                  key={duration.value}
                  value={duration.value}
                  className="bg-[#0b0b0b]"
                >
                  {duration.label}
                </option>
              ))}

              <option
                value="permanent"
                className="bg-[#0b0b0b]"
              >
                Permanent
              </option>
            </select>

            <label className="mt-5 block text-xs uppercase tracking-wider text-zinc-600">
              Reason
            </label>

            <textarea
              value={banReason}
              onChange={(event) =>
                setBanReason(event.target.value)
              }
              placeholder="Why is this user being banned?"
              rows={4}
              className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-red-400/30"
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setBanUser(null)}
                className="rounded-xl px-4 py-2.5 text-sm text-zinc-500 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={banning}
                onClick={handleBan}
                className="forge-button rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50"
              >
                {banning
                  ? "Banning..."
                  : "Ban user"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}