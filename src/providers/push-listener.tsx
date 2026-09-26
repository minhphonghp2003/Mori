"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { emitToast } from "@/lib/toast";
import { primePush } from "@/lib/fcm";
import { getCallController } from "@/lib/call/controller";
import { PUSH_TYPE } from "@/types/notification";

const toNumber = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toBool = (v: unknown): boolean => v === true || v === "true";

/**
 * Listens for service-worker messages (the SW intercepts FCM pushes and
 * forwards them when a window is visible+focused, otherwise it shows system
 * notifications whose clicks arrive as NAVIGATE_TO_DEEP_LINK).
 */
export const PushListener = ({ children }: { children: ReactNode }) => {
  const router = useRouter();

  // Silent push prime on every app start (no permission prompt).
  useEffect(() => {
    void primePush();
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const msg = event.data as { type?: string; deepLink?: unknown; data?: unknown } | null;
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "NAVIGATE_TO_DEEP_LINK" && typeof msg.deepLink === "string") {
        router.push(msg.deepLink);
        return;
      }

      if (msg.type !== "PUSH_DATA" || !msg.data || typeof msg.data !== "object") return;
      const data = msg.data as Record<string, unknown>;
      const controller = getCallController();

      switch (String(data.type ?? "")) {
        case PUSH_TYPE.CALL_INCOMING:
          controller?.handlePushIncoming({
            callId: String(data.callId ?? ""),
            callerUserId: toNumber(data.callerUserId),
            callerName: String(data.callerName ?? "Người gọi"),
            callerAvatar:
              typeof data.callerAvatar === "string" ? data.callerAvatar : null,
            hasVideo: toBool(data.hasVideo),
          });
          break;
        case PUSH_TYPE.CALL_ENDED:
          controller?.handlePushEnded(
            String(data.callId ?? ""),
            typeof data.reason === "string" ? (data.reason as "cancelled" | "rejected" | "ended" | "missed" | "timeout") : undefined,
          );
          break;
        case PUSH_TYPE.CHAT_MESSAGE:
          emitToast(`${String(data.senderName ?? "Tin nhắn mới")}: ${String(data.preview ?? "")}`, "info");
          break;
        default:
          break;
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  return <>{children}</>;
};
