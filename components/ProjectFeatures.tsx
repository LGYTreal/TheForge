"use client";

import { useEffect, useState } from "react";
import {
  createProjectChangelog,
  createProjectComment,
  createReport,
  deleteProjectChangelog,
  deleteProjectComment,
  getBlockState,
  getProjectChangelogs,
  getProjectFavoriteState,
  getProjectLikeCount,
  getProjectLikeState,
  getProjectViewCount,
  ProjectChangelog,
  ProjectComment,
  subscribeToProjectComments,
  toggleBlockUser,
  toggleProjectFavorite,
  toggleProjectLike,
  addProjectView,
} from "@/firebase/projectFeatures";
import { getUserProfile } from "@/firebase/users";

interface ProjectFeaturesProps {
  projectId: string;
  ownerId: string;
  currentUserId: string | null;
  isOwner: boolean;
}

interface CommentAuthor {
  displayName: string;
  username: string;
  avatar?: string;
}

export default function ProjectFeatures({
  projectId,
  ownerId,
  currentUserId,
  isOwner,
}: ProjectFeaturesProps) {
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [commentAuthors, setCommentAuthors] = useState<
    Record<string, CommentAuthor>
  >({});
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [changelogs, setChangelogs] = useState<ProjectChangelog[]>([]);
  const [showChangelogForm, setShowChangelogForm] = useState(false);
  const [changelogTitle, setChangelogTitle] = useState("");
  const [changelogContent, setChangelogContent] = useState("");
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reported, setReported] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [likesResult, viewsResult, changelogResult] =
        await Promise.allSettled([
          getProjectLikeCount(projectId),
          getProjectViewCount(projectId),
          getProjectChangelogs(projectId),
        ]);

      if (!mounted) {
        return;
      }

      if (likesResult.status === "fulfilled") {
        setLikeCount(likesResult.value);
      }

      if (viewsResult.status === "fulfilled") {
        setViewCount(viewsResult.value);
      }

      if (changelogResult.status === "fulfilled") {
        setChangelogs(changelogResult.value);
      }

      if (currentUserId) {
        const [likeStateResult, favoriteStateResult, blockStateResult] =
          await Promise.allSettled([
            getProjectLikeState(projectId, currentUserId),
            getProjectFavoriteState(currentUserId, projectId),
            getBlockState(currentUserId, ownerId),
          ]);

        if (!mounted) {
          return;
        }

        if (likeStateResult.status === "fulfilled") {
          setLiked(likeStateResult.value);
        }

        if (favoriteStateResult.status === "fulfilled") {
          setFavorited(favoriteStateResult.value);
        }

        if (blockStateResult.status === "fulfilled") {
          setBlocked(blockStateResult.value);
        }

        if (!isOwner) {
          try {
            await addProjectView(projectId, currentUserId);

            if (mounted) {
              try {
                const updatedViews =
                  await getProjectViewCount(projectId);

                setViewCount(updatedViews);
              } catch {}
            }
          } catch {}
        }
      }
    }

    load().catch(() => {});

    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = subscribeToProjectComments(
        projectId,
        (nextComments) => {
          if (mounted) {
            setComments(nextComments);
          }
        }
      );
    } catch {}

    return () => {
      mounted = false;

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [projectId, currentUserId, ownerId, isOwner]);

  useEffect(() => {
    let cancelled = false;

    async function loadAuthors() {
      const uniqueIds = [
        ...new Set(comments.map((comment) => comment.authorId)),
      ];

      const entries = await Promise.all(
        uniqueIds.map(async (uid) => {
          try {
            const profile = await getUserProfile(uid);

            if (!profile) {
              return [
                uid,
                {
                  displayName: "Unknown user",
                  username: "unknown",
                },
              ] as const;
            }

            return [
              uid,
              {
                displayName:
                  profile.displayName || profile.username,
                username: profile.username,
                avatar: profile.avatar,
              },
            ] as const;
          } catch {
            return [
              uid,
              {
                displayName: "Unknown user",
                username: "unknown",
              },
            ] as const;
          }
        })
      );

      if (!cancelled) {
        setCommentAuthors(Object.fromEntries(entries));
      }
    }

    if (comments.length > 0) {
      loadAuthors().catch(() => {});
    } else {
      setCommentAuthors({});
    }

    return () => {
      cancelled = true;
    };
  }, [comments]);

  async function handleLike() {
    if (!currentUserId) {
      window.location.href = "/login";
      return;
    }

    try {
      const nextState = await toggleProjectLike(
        projectId,
        currentUserId
      );

      setLiked(nextState);
      setLikeCount((count) =>
        nextState ? count + 1 : Math.max(0, count - 1)
      );
    } catch {}
  }

  async function handleFavorite() {
    if (!currentUserId) {
      window.location.href = "/login";
      return;
    }

    try {
      const nextState = await toggleProjectFavorite(
        currentUserId,
        projectId
      );

      setFavorited(nextState);
    } catch {}
  }

  async function handleShare() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: document.title,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      setShareMessage("Link copied");

      window.setTimeout(() => {
        setShareMessage("");
      }, 2000);
    } catch {}
  }

  async function handleComment() {
    if (!currentUserId) {
      window.location.href = "/login";
      return;
    }

    if (!commentText.trim()) {
      return;
    }

    setCommentLoading(true);

    try {
      await createProjectComment(
        projectId,
        currentUserId,
        commentText
      );

      setCommentText("");
    } catch {
    } finally {
      setCommentLoading(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!currentUserId) {
      return;
    }

    try {
      await deleteProjectComment(
        projectId,
        commentId
      );
    } catch {}
  }

  async function handleCreateChangelog() {
    if (!isOwner) {
      return;
    }

    setChangelogLoading(true);

    try {
      const changelog =
        await createProjectChangelog(
          projectId,
          changelogTitle,
          changelogContent
        );

      setChangelogs((current) => [
        changelog,
        ...current,
      ]);

      setChangelogTitle("");
      setChangelogContent("");
      setShowChangelogForm(false);
    } catch {
    } finally {
      setChangelogLoading(false);
    }
  }

  async function handleDeleteChangelog(
    changelogId: string
  ) {
    try {
      await deleteProjectChangelog(
        projectId,
        changelogId
      );

      setChangelogs((current) =>
        current.filter(
          (item) => item.id !== changelogId
        )
      );
    } catch {}
  }

  async function handleReport() {
    if (!currentUserId) {
      window.location.href = "/login";
      return;
    }

    setReportLoading(true);

    try {
      await createReport({
        targetType: "project",
        targetId: projectId,
        reporterId: currentUserId,
        reason: reportReason,
        details: reportDetails.trim(),
        createdAt: Date.now(),
      });

      setReported(true);
      setShowReport(false);
      setReportDetails("");
    } catch {
    } finally {
      setReportLoading(false);
    }
  }

  async function handleBlock() {
    if (!currentUserId || isOwner) {
      return;
    }

    setBlockLoading(true);

    try {
      const nextState = await toggleBlockUser(
        currentUserId,
        ownerId
      );

      setBlocked(nextState);
    } catch {
    } finally {
      setBlockLoading(false);
    }
  }

  const ownerProfile = commentAuthors[ownerId];

  return (
    <div className="mt-10 space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleLike}
            className={`forge-button flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
              liked
                ? "border-violet-400/30 bg-violet-500/15 text-violet-200"
                : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            <span>{liked ? "♥" : "♡"}</span>
            <span>{likeCount}</span>
            <span>Like</span>
          </button>

          <button
            type="button"
            onClick={handleFavorite}
            className={`forge-button flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
              favorited
                ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            <span>{favorited ? "★" : "☆"}</span>
            <span>
              {favorited
                ? "Favorited"
                : "Favorite"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="forge-button flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white"
          >
            <span>↗</span>
            <span>Share</span>
          </button>

          {shareMessage && (
            <span className="text-sm text-emerald-300">
              {shareMessage}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2 text-sm text-zinc-600">
            <span>◉</span>
            <span>{viewCount} views</span>
          </div>
        </div>
      </section>

      {!isOwner && currentUserId && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
          <div>
            <p className="font-medium text-zinc-200">
              Project owner
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {ownerProfile
                ? `@${ownerProfile.username}`
                : "Manage your interaction with this project."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleBlock}
              disabled={blockLoading}
              className={`forge-button rounded-xl border px-4 py-2.5 text-sm font-medium ${
                blocked
                  ? "border-red-400/20 bg-red-500/10 text-red-300"
                  : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {blockLoading
                ? "Updating..."
                : blocked
                  ? "Unblock owner"
                  : "Block owner"}
            </button>

            <button
              type="button"
              onClick={() => setShowReport(true)}
              disabled={reported}
              className="forge-button rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-400 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reported
                ? "Report submitted"
                : "Report project"}
            </button>
          </div>
        </section>
      )}

      {!blocked && (
        <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                Comments
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Talk about the project with its community.
              </p>
            </div>

            <span className="text-sm text-zinc-600">
              {comments.length}{" "}
              {comments.length === 1
                ? "comment"
                : "comments"}
            </span>
          </div>

          {currentUserId ? (
            <div className="mt-6 flex flex-col gap-3">
              <textarea
                value={commentText}
                onChange={(event) =>
                  setCommentText(event.target.value)
                }
                maxLength={1000}
                rows={4}
                placeholder="Write a comment..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/10"
              />

              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-zinc-700">
                  {commentText.length}/1000
                </span>

                <button
                  type="button"
                  onClick={handleComment}
                  disabled={
                    commentLoading ||
                    !commentText.trim()
                  }
                  className="forge-button rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {commentLoading
                    ? "Posting..."
                    : "Post comment"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-zinc-500">
                Log in to leave a comment.
              </p>
            </div>
          )}

          <div className="mt-8 space-y-4">
            {comments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <p className="text-sm text-zinc-600">
                  No comments yet.
                </p>
              </div>
            ) : (
              comments.map((comment) => {
                const author =
                  commentAuthors[comment.authorId];

                return (
                  <article
                    key={comment.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  >
                    <div className="flex items-start gap-3">
                      {author?.avatar ? (
                        <img
                          src={author.avatar}
                          alt=""
                          className="h-9 w-9 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-zinc-300">
                          {(author?.displayName ||
                            "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-zinc-200">
                            {author?.displayName ||
                              "Loading..."}
                          </span>

                          {author?.username && (
                            <span className="text-xs text-zinc-600">
                              @{author.username}
                            </span>
                          )}

                          <span className="text-xs text-zinc-700">
                            {new Date(
                              comment.createdAt
                            ).toLocaleDateString()}
                          </span>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-400">
                          {comment.text}
                        </p>
                      </div>

                      {currentUserId ===
                        comment.authorId && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteComment(
                              comment.id
                            )
                          }
                          className="text-xs text-zinc-700 transition hover:text-red-300"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold">
              Changelog
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Updates and milestones from this project.
            </p>
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={() =>
                setShowChangelogForm(
                  !showChangelogForm
                )
              }
              className="forge-button rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white"
            >
              {showChangelogForm
                ? "Cancel"
                : "Add update"}
            </button>
          )}
        </div>

        {showChangelogForm && isOwner && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
            <input
              value={changelogTitle}
              onChange={(event) =>
                setChangelogTitle(
                  event.target.value
                )
              }
              maxLength={120}
              placeholder="Update title"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-violet-400/30"
            />

            <textarea
              value={changelogContent}
              onChange={(event) =>
                setChangelogContent(
                  event.target.value
                )
              }
              maxLength={5000}
              rows={6}
              placeholder="What changed?"
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-violet-400/30"
            />

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleCreateChangelog}
                disabled={
                  changelogLoading ||
                  !changelogTitle.trim() ||
                  !changelogContent.trim()
                }
                className="forge-button rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {changelogLoading
                  ? "Publishing..."
                  : "Publish update"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-5">
          {changelogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
              <p className="text-sm text-zinc-600">
                No updates have been published yet.
              </p>
            </div>
          ) : (
            changelogs.map((changelog) => (
              <article
                key={changelog.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-zinc-200">
                      {changelog.title}
                    </h3>

                    <p className="mt-1 text-xs text-zinc-600">
                      {new Date(
                        changelog.createdAt
                      ).toLocaleDateString(
                        undefined,
                        {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>

                  {isOwner && (
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteChangelog(
                          changelog.id
                        )
                      }
                      className="text-xs text-zinc-700 transition hover:text-red-300"
                    >
                      Delete
                    </button>
                  )}
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-400">
                  {changelog.content}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      {showReport && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowReport(false);
            }
          }}
        >
          <div className="forge-scale w-full max-w-lg rounded-3xl border border-white/10 bg-[#0b0b0b] p-6 shadow-2xl shadow-black/50">
            <p className="text-sm font-medium uppercase tracking-widest text-red-300">
              REPORT
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              Report this project
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Tell us why you think this project
              violates Forge rules.
            </p>

            <select
              value={reportReason}
              onChange={(event) =>
                setReportReason(event.target.value)
              }
              className="mt-6 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
            >
              <option>Spam</option>
              <option>Harassment</option>
              <option>Inappropriate content</option>
              <option>Copyright violation</option>
              <option>Scam or fraud</option>
              <option>Other</option>
            </select>

            <textarea
              value={reportDetails}
              onChange={(event) =>
                setReportDetails(event.target.value)
              }
              maxLength={2000}
              rows={5}
              placeholder="Additional details..."
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700"
            />

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowReport(false)
                }
                className="forge-button rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-zinc-300"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReport}
                disabled={reportLoading}
                className="forge-button rounded-xl bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 ring-1 ring-red-500/20 hover:bg-red-500/20 disabled:opacity-50"
              >
                {reportLoading
                  ? "Submitting..."
                  : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}