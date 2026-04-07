"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

const RealtimeContext = createContext();

export function RealtimeProvider({ children }) {
  const [newMessages, setNewMessages] = useState([]);
  const [newNotifications, setNewNotifications] = useState([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const eventSourceRef = useRef(null);
  const notificationSoundRef = useRef(null);

  const playNotificationSound = () => {
    try {
      if (notificationSoundRef.current && isAudioEnabled) {
        notificationSoundRef.current.currentTime = 0;
        notificationSoundRef.current.play().catch(err => {
          console.log("Could not play notification sound:", err);
        });
      }
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  };

  // Enable audio on first user interaction
  useEffect(() => {
    const enableAudio = () => {
      setIsAudioEnabled(true);
      // Try to play a silent sound to enable audio
      if (notificationSoundRef.current) {
        notificationSoundRef.current.volume = 0;
        notificationSoundRef.current.play().then(() => {
          notificationSoundRef.current.pause();
          notificationSoundRef.current.volume = 1;
        }).catch(() => {
          // Ignore errors
        });
      }
    };

    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('keydown', enableAudio, { once: true });

    return () => {
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
    };
  }, []);

  useEffect(() => {
    const setupSSE = async () => {
      try {
        const eventSource = new EventSource("/api/realtime");
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === "new_messages") {
              // Play notification sound immediately for new messages
              playNotificationSound();
              // Add to new messages array
              setNewMessages(prev => [...prev, ...data.messages]);
            } else if (data.type === "new_notifications") {
              // Play notification sound for new notifications
              playNotificationSound();
              // Add to new notifications array
              setNewNotifications(prev => [...prev, ...data.notifications]);
            }
          } catch (error) {
            console.error("Error parsing SSE message:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.error("SSE connection error:", error);
          if (eventSource.readyState === EventSource.CLOSED) {
            eventSource.close();
            // Retry connection after 5 seconds
            setTimeout(setupSSE, 5000);
          }
        };

        eventSource.onopen = () => {
          console.log("SSE connection established globally");
        };

      } catch (error) {
        console.error("Error setting up SSE:", error);
        // Retry connection after 5 seconds
        setTimeout(setupSSE, 5000);
      }
    };

    setupSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const clearNewMessages = () => {
    setNewMessages([]);
  };

  const clearNewNotifications = () => {
    setNewNotifications([]);
  };

  return (
    <RealtimeContext.Provider
      value={{
        newMessages,
        newNotifications,
        clearNewMessages,
        clearNewNotifications,
        playNotificationSound,
      }}
    >
      {/* Hidden Audio Element for Notification Sound */}
      <audio
        ref={notificationSoundRef}
        src="/sfx/Notification.mp3"
        preload="auto"
      />
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
}