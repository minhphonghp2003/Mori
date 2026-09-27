"use client";

import { useEffect, useState } from "react";

/** True when the app runs as an installed PWA (standalone / fullscreen). */
export const useIsPwa = (): boolean => {
  // SSR-safe: resolve after hydration so server and client render identically.
  const [isPwa, setIsPwa] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const onChange = () => {
      setIsPwa(
        (window.navigator as { standalone?: boolean }).standalone === true || mq.matches,
      );
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isPwa;
};
