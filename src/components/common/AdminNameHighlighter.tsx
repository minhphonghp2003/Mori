"use client";

import { useEffect } from "react";

const ADMIN_NAME = "admin";

function markAdminElements(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = walker.currentNode;
  while (node) {
    const el = node as HTMLElement;
    // Only mark leaf elements so a parent and its child don't both get a
    // shield icon (which would render the shield twice).
    if (
      el.children.length === 0 &&
      el.textContent?.trim().toLowerCase() === ADMIN_NAME &&
      !el.classList.contains("admin-neon")
    ) {
      el.classList.add("admin-neon");
    }
    node = walker.nextNode();
  }
}

export function AdminNameHighlighter() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    markAdminElements(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) markAdminElements(node);
            else if (node.parentElement) markAdminElements(node.parentElement);
          });
        } else if (mutation.type === "characterData" && mutation.target.parentElement) {
          markAdminElements(mutation.target.parentElement);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
