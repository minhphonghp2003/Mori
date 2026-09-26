"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Real update check (bug fix: the old hook never fetched anything remote).
 * The service worker itself is the version signal: when a newly installed
 * worker sits in `waiting`, a newer deploy is ready to take over.
 */
export const useSwUpdate = () => {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;

    const watchRegistration = (reg: ServiceWorkerRegistration) => {
      if (cancelled) return;
      if (reg.waiting) {
        setUpdateReady(true);
        return;
      }
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller &&
            !cancelled
          ) {
            setUpdateReady(true);
          }
        });
      });
    };

    navigator.serviceWorker.ready.then(watchRegistration).catch(() => {});

    // Re-check for a new worker when the tab regains focus + hourly.
    const check = () => {
      navigator.serviceWorker.ready
        .then((reg) => reg.update().catch(() => {}))
        .catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(check, 60 * 60 * 1000);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, []);

  const dismiss = useCallback(() => setUpdateReady(false), []);

  const applyUpdate = useCallback(() => {
    // String form — matches the sw.js message handler.
    navigator.serviceWorker.ready
      .then((reg) => {
        if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
        else window.location.reload();
      })
      .catch(() => window.location.reload());
  }, []);

  return { updateReady, applyUpdate, dismiss };
};
