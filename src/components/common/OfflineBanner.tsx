"use client";

import { useEffect, useState } from "react";
import { WifiOff, CloudUpload } from "lucide-react";
import { httpClient } from "@/lib/axios";
import { emitToast } from "@/lib/toast";
import {
  initOfflineStatus,
  subscribe,
  isOnline,
  countOutbox,
  subscribeOutboxChange,
  flushOutbox,
} from "@/lib/offline";

/**
 * Offline banner + outbox sync trigger. Mounted at the app root so it is
 * active on every route: window online/offline events flip the shared
 * status, and every reconnect replays the queued mutations.
 */
export const OfflineBanner = () => {
  const [online, setOnline] = useState<boolean>(() => isOnline());
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const detachStatus = initOfflineStatus();
    let cancelled = false;

    const refreshCount = async () => {
      try {
        const n = await countOutbox();
        if (!cancelled) setPending(n);
      } catch {
        // IndexedDB unavailable — banner still reflects connectivity.
      }
    };
    void refreshCount();

    const detachCount = subscribeOutboxChange(() => {
      void refreshCount();
    });
    const detachOnline = subscribe((value) => {
      setOnline(value);
      if (value) {
        // Reconnected — replay queued mutations, then report what synced.
        void (async () => {
          try {
            const before = await countOutbox();
            await flushOutbox(httpClient);
            const after = await countOutbox();
            if (!cancelled) setPending(after);
            const synced = before - after;
            if (synced > 0) {
              emitToast(`Đã đồng bộ ${synced} thay đổi khi offline ⛅`, "success");
            }
          } catch {
            // Next reconnect retries; the banner keeps showing the queue.
          }
        })();
      }
    });

    return () => {
      cancelled = true;
      detachStatus();
      detachCount();
      detachOnline();
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[90] flex justify-center px-4 pt-2 pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold shadow-lg backdrop-blur-md ${
          online ? "bg-indigo-600/95 text-white" : "bg-slate-900/95 text-white"
        }`}
      >
        {online ? (
          <>
            <CloudUpload className="w-3.5 h-3.5 animate-pulse" />
            <span>Đang đồng bộ {pending} thay đổi...</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5" />
            <span>
              Ngoại tuyến{pending > 0 ? ` · ${pending} thay đổi đang chờ` : " · dữ liệu có thể đã cũ"}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
