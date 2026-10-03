import { useEffect } from "react";

const SCROLL_TOP_EVENT = "mori:scroll-top";

/** Tapping the active bottom-nav tab asks the visible screen to scroll up. */
export const requestScrollTop = () => {
  window.dispatchEvent(new CustomEvent(SCROLL_TOP_EVENT));
};

/** Mounts a listener that smooth-scrolls the given container to the top. */
export const useScrollToTop = (ref: React.RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const onScrollTop = () => {
      ref.current?.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener(SCROLL_TOP_EVENT, onScrollTop);
    return () => window.removeEventListener(SCROLL_TOP_EVENT, onScrollTop);
  }, [ref]);
};
