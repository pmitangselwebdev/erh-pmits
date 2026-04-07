"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X, Send, User } from "lucide-react";
import { useRealtime } from "./realtime-provider";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [prevMessagesLength, setPrevMessagesLength] = useState(0);
  const [panelStyle, setPanelStyle] = useState({ top: 72, left: 16 });
  const messagesEndRef = useRef(null);
  const fetchUsersRef = useRef(null);
  const fetchMessagesRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const { newMessages, clearNewMessages, playNotificationSound } = useRealtime();

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return;

    const rect = trigger.getBoundingClientRect();
    const panelWidth = Math.min(384, window.innerWidth - 16);
    const panelHeight = Math.min(500, window.innerHeight - 80);
    const left = Math.max(8, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 8));
    const top = Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - panelHeight - 8));

    setPanelStyle({ left, top });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const unreadCount = currentUserId
    ? messages.filter((message) => message.receiverId === currentUserId && !message.isRead).length
    : 0;

  const markConversationAsRead = useCallback(async (userId) => {
    if (!userId || !currentUserId) return;

    setMessages((prev) =>
      prev.map((message) =>
        message.senderId === userId && message.receiverId === currentUserId
          ? { ...message, isRead: true }
          : message
      )
    );

    try {
      await fetch("/api/chat/messages/read-conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      fetchMessagesRef.current?.();
    }
  }, [currentUserId]);

  const fetchCurrentUserId = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/status");
      if (!response.ok) return;

      const data = await response.json();
      if (data.userId) {
        setCurrentUserId(data.userId);
      }
    } catch (error) {
      console.error("Error fetching user ID:", error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/chat/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch("/api/chat/messages");
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }, []);

  // Store functions in refs to avoid dependency issues
  fetchUsersRef.current = fetchUsers;
  fetchMessagesRef.current = fetchMessages;

  useEffect(() => {
    setIsMounted(true);
    fetchCurrentUserId();
    fetchMessagesRef.current?.();
  }, [fetchCurrentUserId]);

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

  useEffect(() => {
    if (isOpen) {
      updatePanelPosition();
      fetchUsersRef.current?.();
      fetchMessagesRef.current?.();
      fetchCurrentUserId();
    }
  }, [isOpen, updatePanelPosition, fetchCurrentUserId]);

  // Real-time updates are now handled by RealtimeProvider
  useEffect(() => {
    if (newMessages.length > 0) {
      // Play notification sound for new messages
      playNotificationSound();
      // Refresh messages to get the latest data
      fetchMessagesRef.current?.();
      // Clear the new messages after processing
      clearNewMessages();
    }
  }, [newMessages, playNotificationSound, clearNewMessages]);

  useEffect(() => {
    // Only scroll to bottom when new messages are added (not on every render)
    if (messages.length > prevMessagesLength) {
      scrollToBottom();
      // Play notification sound for new messages (only if not from current user)
      if (prevMessagesLength > 0 && messages.length > prevMessagesLength) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.senderId !== currentUserId) {
          playNotificationSound();
        }
      }
    }
    setPrevMessagesLength(messages.length);
  }, [messages, prevMessagesLength, currentUserId]);

  // Auto-mark messages as read when viewing a conversation
  useEffect(() => {
    if (selectedUser && currentUserId && messages.length > 0) {
      const hasUnreadMessages = messages.some(
        (message) =>
          message.senderId === selectedUser.id &&
          message.receiverId === currentUserId &&
          !message.isRead
      );

      if (hasUnreadMessages) {
        markConversationAsRead(selectedUser.id);
      }
    }
  }, [selectedUser, currentUserId, messages, markConversationAsRead]);

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, updatePanelPosition]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiverId: selectedUser.id,
          content: newMessage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, data.message]);
        setNewMessage("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await fetch(`/api/chat/messages/${messageId}/read`, {
        method: "POST",
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isRead: true } : m))
      );
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  return (
    <div className="relative z-[70]">
      {/* Chat Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-xl p-2 text-muted-foreground transition hover:bg-accent/70 hover:text-foreground"
      >
        <MessageCircle className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-red-500 via-red-500 to-orange-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white ring-2 ring-background shadow-lg shadow-red-500/30">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isMounted && shouldRender ? createPortal(
        <div
          ref={panelRef}
          className={`fixed z-[120] flex h-[min(500px,calc(100vh-5rem))] w-[min(24rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-3xl bg-card/95 text-card-foreground shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur-2xl transition-all duration-200 ease-out ${
            isOpen ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
          }`}
          style={panelStyle}
        >
          {/* Header */}
          <div className="border-b border-border/60 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold tracking-tight">Chat Petugas</h3>
                <p className="mt-0.5 text-xs text-white/75">Komunikasi internal operasional</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full bg-white/10 p-1 text-white/80 transition hover:bg-white/20 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Users List */}
          {!selectedUser && (
            <div className="flex-1 overflow-y-auto">
              <div className="border-b border-border/60 px-4 py-3">
                <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Petugas Tersedia
                </h4>
              </div>
              {users.length === 0 ? (
                <div className="p-4 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <User className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tidak ada petugas tersedia
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {users.map((user) => {
                    // Count unread messages from this user
                    const unreadFromUser = messages.filter(
                      (m) => m.senderId === user.id && 
                             m.receiverId === currentUserId && 
                             !m.isRead
                    ).length;
                    
                    return (
                      <div
                        key={user.id}
                        onClick={() => {
                          setSelectedUser(user);
                          markConversationAsRead(user.id);
                        }}
                        className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-accent/70"
                      >
                        <div className="relative">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500"></div>
                          {unreadFromUser > 0 && (
                            <div className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-red-500 via-red-500 to-orange-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white ring-2 ring-card shadow-lg shadow-red-500/30">
                              {unreadFromUser > 9 ? "9+" : unreadFromUser}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {user.fullName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.officerType || user.role}
                          </p>
                        </div>
                        <div className="text-muted-foreground">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Chat Messages */}
          {selectedUser && (
            <>
              {/* Selected User Header */}
              <div className="border-b border-border/60 bg-muted/40 p-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="rounded-full p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    ←
                  </button>
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {selectedUser.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedUser.role}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-background/10 to-muted/20 p-4">
                {messages
                  .filter(
                    (m) =>
                      // Messages between current user and selected user
                      (m.senderId === currentUserId && m.receiverId === selectedUser.id) ||
                      (m.senderId === selectedUser.id && m.receiverId === currentUserId)
                  )
                  .map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.senderId === selectedUser.id
                          ? "justify-start"
                          : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[82%] px-3 py-2.5 shadow-sm ${
                          message.senderId === selectedUser.id
                            ? "rounded-[22px] rounded-bl-md border border-border/60 bg-muted/90 text-foreground"
                            : "rounded-[22px] rounded-br-md bg-gradient-to-br from-red-600 via-red-500 to-orange-500 text-white shadow-lg shadow-red-500/20"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <div className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${
                          message.senderId === selectedUser.id
                            ? "text-muted-foreground"
                            : "text-red-100/90"
                        }`}>
                          <span className="text-xs">
                            {new Date(message.createdAt).toLocaleTimeString(
                              "id-ID",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </span>
                          {message.senderId === currentUserId && (
                            <span className="text-xs">
                              {message.isRead ? "Dibaca" : "Terkirim"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form
                onSubmit={sendMessage}
                className="border-t border-border/60 bg-background/70 p-4 backdrop-blur"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Ketik pesan..."
                    className="flex-1 rounded-2xl border border-border bg-background/80 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="rounded-2xl bg-gradient-to-br from-red-600 to-red-500 p-2 text-white shadow-lg shadow-red-500/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>,
        document.body
      ) : null}
    </div>
  );
}