"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Bell, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { useRealtime } from "./realtime-provider";

export default function NotificationBar() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [panelStyle, setPanelStyle] = useState({ top: 72, left: 16 });
  const { newNotifications, clearNewNotifications, playNotificationSound } = useRealtime();
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return;

    const rect = trigger.getBoundingClientRect();
    const panelWidth = Math.min(320, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 8));
    const top = Math.max(8, rect.bottom + 8);

    setPanelStyle({ left, top });
  }, []);

  useEffect(() => {
    // Fetch notifications on mount
    fetchNotifications();
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setShouldRender(false);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  // Play sound when new notifications arrive
  useEffect(() => {
    if (newNotifications.length > 0) {
      playNotificationSound();
      // Refresh notifications to get the latest data
      fetchNotifications();
      // Clear the new notifications after processing
      clearNewNotifications();
    }
  }, [newNotifications, playNotificationSound, clearNewNotifications]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getIcon = (type) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const markAsRead = async (id) => {
    try {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, isRead: true, readAt: new Date().toISOString() }
            : notification
        )
      );

      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      fetchNotifications();
    }
  };

  const markAllAsRead = useCallback(async () => {
    if (!notifications.some((notification) => !notification.isRead)) return;

    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        isRead: true,
        readAt: notification.readAt || new Date().toISOString(),
      }))
    );

    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      fetchNotifications();
    }
  }, [notifications]);

  useEffect(() => {
    if (!isOpen) return;

    updatePanelPosition();
    markAllAsRead();

    const handleViewportChange = () => updatePanelPosition();
    const handlePointerDown = (event) => {
      const target = event.target;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen, updatePanelPosition, markAllAsRead]);

  return (
    <div className="relative z-[70]">
      {/* Notification Bell */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-xl p-2 text-muted-foreground transition hover:bg-accent/70 hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-red-500 via-red-500 to-orange-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white ring-2 ring-background shadow-lg shadow-red-500/30">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isMounted && shouldRender ? createPortal(
        <div
          ref={panelRef}
          className={`fixed z-[120] w-[min(21rem,calc(100vw-1rem))] overflow-hidden rounded-3xl bg-card/95 text-card-foreground shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur-2xl transition-all duration-200 ease-out ${
            isOpen ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
          }`}
          style={panelStyle}
        >
          <div className="border-b border-border/60 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold tracking-tight text-white">Notifikasi</h3>
                <p className="mt-0.5 text-xs text-white/75">Alert dan update sistem</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full bg-white/10 p-1 text-white/80 transition hover:bg-white/20 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Tidak ada notifikasi
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`cursor-pointer border-b border-border/50 px-4 py-3 transition-colors last:border-b-0 hover:bg-accent/70 ${
                    !notification.isRead ? "bg-primary/8" : "bg-transparent"
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {getIcon(notification.category)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground/80">
                        {new Date(notification.createdAt).toLocaleDateString(
                          "id-ID"
                        )}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="mt-1 h-2 w-2 rounded-full bg-red-500"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}