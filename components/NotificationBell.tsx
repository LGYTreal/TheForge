"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  onValue,
  ref,
} from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/auth";
import { database } from "@/firebase/database";
import {
  markAllNotificationsRead,
  markNotificationRead,
  ForgeNotification,
} from "@/firebase/notifications";

export default function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<
    ForgeNotification[]
  >([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let notificationUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (notificationUnsubscribe) {
          notificationUnsubscribe();
          notificationUnsubscribe = null;
        }

        if (!user) {
          setUserId(null);
          setNotifications([]);
          setLoading(false);
          return;
        }

        setUserId(user.uid);
        setLoading(true);

        const notificationsRef = ref(
          database,
          `notifications/${user.uid}`
        );

        notificationUnsubscribe = onValue(
          notificationsRef,
          (snapshot) => {
            if (!snapshot.exists()) {
              setNotifications([]);
              setLoading(false);
              return;
            }

            const data = snapshot.val();

            const items: ForgeNotification[] = Object.entries(
              data
            )
              .filter(
                ([, notification]) =>
                  notification &&
                  typeof notification === "object"
              )
              .map(([id, notification]) => ({
                id,
                ...(notification as Omit<
                  ForgeNotification,
                  "id"
                >),
              }))
              .sort(
                (a, b) =>
                  b.createdAt - a.createdAt
              );

            setNotifications(items);
            setLoading(false);
          },
          () => {
            setNotifications([]);
            setLoading(false);
          }
        );
      }
    );

    return () => {
      authUnsubscribe();

      if (notificationUnsubscribe) {
        notificationUnsubscribe();
      }
    };
  }, []);

  if (!userId) {
    return null;
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  async function handleMarkAllRead() {
    if (!userId || unreadCount === 0) {
      return;
    }

    try {
      await markAllNotificationsRead(userId);

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read: true,
        }))
      );
    } catch {}
  }

  async function handleNotificationClick(
    notification: ForgeNotification
  ) {
    if (!userId || notification.read) {
      return;
    }

    try {
      await markNotificationRead(
        userId,
        notification.id
      );

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                read: true,
              }
            : item
        )
      );
    } catch {}
  }

  function getNotificationHref(
    notification: ForgeNotification
  ) {
    if (
      notification.type ===
        "collaboration_request" &&
      notification.projectId
    ) {
      return `/projects/${notification.projectId}`;
    }

    if (
      notification.type ===
        "collaboration_accepted" &&
      notification.projectId
    ) {
      return `/projects/${notification.projectId}`;
    }

    if (
      notification.type ===
        "collaboration_declined" &&
      notification.projectId
    ) {
      return `/projects/${notification.projectId}`;
    }

    return "/profile";
  }

  function getNotificationIcon(
    type: ForgeNotification["type"]
  ) {
    if (type === "follow") {
      return "👤";
    }

    if (type === "moderation") {
      return "🛡️";
    }

    if (type === "collaboration_request") {
      return "↗";
    }

    if (type === "collaboration_accepted") {
      return "✓";
    }

    if (type === "collaboration_declined") {
      return "×";
    }

    return "•";
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((current) => !current)}
        className="forge-button relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17H9m10-2.5V11a7 7 0 0 0-14 0v3.5L3 17h18l-3-2.5ZM10 20h4"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border border-[#050505] bg-violet-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />

          <div className="absolute right-0 top-12 z-50 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="font-semibold text-white">
                  Notifications
                </p>

                <p className="mt-0.5 text-xs text-zinc-600">
                  {unreadCount
                    ? `${unreadCount} unread`
                    : "You're all caught up"}
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-violet-400 transition hover:text-violet-300"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-sm text-zinc-600">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-xl">
                    ♢
                  </div>

                  <p className="mt-4 text-sm font-medium text-zinc-300">
                    No notifications
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    New activity will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={getNotificationHref(
                      notification
                    )}
                    onClick={() =>
                      handleNotificationClick(
                        notification
                      )
                    }
                    className={`block border-b border-white/5 px-5 py-4 transition hover:bg-white/[0.04] ${
                      notification.read
                        ? ""
                        : "bg-violet-500/[0.04]"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          notification.read
                            ? "bg-white/[0.04] text-zinc-500"
                            : "bg-violet-500/10 text-violet-300"
                        }`}
                      >
                        {getNotificationIcon(
                          notification.type
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-zinc-200">
                            {notification.title}
                          </p>

                          {!notification.read && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                          )}
                        </div>

                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          {notification.message}
                        </p>

                        <p className="mt-2 text-[10px] text-zinc-700">
                          {new Date(
                            notification.createdAt
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}