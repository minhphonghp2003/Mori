"use client";

import { useEffect, useRef, useState } from "react";
import { WifiOff, CloudUpload } from "lucide-react";
import { httpClient } from "@/lib/axios";
import { emitToast } from "@/lib/toast";
import {
  initOfflineStatus,
  subscribe,
  isOnline,
  setOnline as setSharedOnlineStatus,
  countOutbox,
  subscribeOutboxChange,
  flushOutbox,
} from "@/lib/offline";

/**
 * Offline banner + outbox sync trigger. Mounted at the app root so it is
 * active on every route: window online/offline events flip the shared
 * status, and every reconnect replays the queued mutations.
 *
 * `navigator.onLine` is unreliable (VPNs, Chrome connectivity checks on
 * LAN-only networks, stale DevTools emulation all report false while the
 * network works fine), so a browser "offline" is only trusted after a real
 * heartbeat to our own origin fails. The heartbeat is a HEAD request, which
 * the service worker lets straight through to the network (no cache mask).
 */
const HEARTBEAT_INTERVAL_MS = 10_000;

export const OfflineBanner = () => {
  const [browserOnline, setBrowserOnline] = useState<boolean>(() => isOnline());
  /** null = not probed (or browser says online); true/false = heartbeat verdict. */
  const [heartbeatOk, setHeartbeatOk] = useState<boolean | null>(null);
  const [pending, setPending] = useState(0);

  // Online if the browser says so, or a heartbeat just proved it wrong.
  const online = browserOnline || heartbeatOk === true;

  useEffect(() => {
    const detachStatus = initOfflineStatus();
    let cancelled = false;

    const resync = () => setSharedOnlineStatus(navigator.onLine);
    window.addEventListener("focus", resync);
    const onVisible = () => {
      if (document.visibilityState === "visible") resync();
    };
    document.addEventListener("visibilitychange", onVisible);

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
      setBrowserOnline(value);
      if (value) setHeartbeatOk(null);
    });

    return () => {
      cancelled = true;
      detachStatus();
      detachCount();
      detachOnline();
      window.removeEventListener("focus", resync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Confirm a browser "offline" with a real heartbeat; re-probe while it
  // persists so recovery is picked up within seconds.
  useEffect(() => {
    if (browserOnline) return;
    let cancelled = false;
    const probe = async () => {
      try {
        const res = await fetch(`/?_hb=${Date.now()}`, {
          method: "HEAD",
          cache: "no-store",
        });
        if (cancelled) return;
        const ok = res.ok;
        setHeartbeatOk(ok);
        // The network works despite what the browser claims — let the
        // adapter + outbox behave accordingly.
        if (ok) setSharedOnlineStatus(true);
      } catch {
        if (!cancelled) setHeartbeatOk(false);
      }
    };
    void probe();
    const timer = setInterval(() => {
      void probe();
    }, HEARTBEAT_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [browserOnline]);

  // Reconnected (by either signal) — replay queued mutations once.
  const wasOnline = useRef(online);
  useEffect(() => {
    const flipped = !wasOnline.current && online;
    wasOnline.current = online;
    if (!flipped) return;
    void (async () => {
      try {
        const before = await countOutbox();
        await flushOutbox(httpClient);
        const after = await countOutbox();
        setPending(after);
        const synced = before - after;
        if (synced > 0) {
          emitToast(`Đã đồng bộ ${synced} thay đổi khi offline ⛅`, "success");
        }
      } catch {
        // Next reconnect retries; the banner keeps showing the queue.
      }
    })();
  }, [online]);

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
