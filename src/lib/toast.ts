/**
 * Module-level toast bridge.
 *
 * Non-React code (axios interceptors, SignalR, FCM) cannot use the design's
 * AppContext toast directly — this bridge routes those calls into the design
 * ToastContainer once AppProvider registers itself as the sink. Messages
 * fired before registration are queued (bounded) and flushed on mount.
 */

export type ToastType = "success" | "info" | "error";

type ToastListener = (text: string, type: ToastType) => void;

const MAX_QUEUED = 10;

let listener: ToastListener | null = null;
const pending: Array<{ text: string; type: ToastType }> = [];

/** Register the design ToastContainer as the single toast sink. */
export function setToastListener(next: ToastListener | null): void {
  listener = next;
  if (next) {
    while (pending.length > 0) {
      const item = pending.shift();
      if (item) next(item.text, item.type);
    }
  }
}

/** Fire a toast from non-React code. */
export function emitToast(text: string, type: ToastType = "info"): void {
  if (typeof window === "undefined") return;
  if (listener) {
    listener(text, type);
    return;
  }
  if (pending.length < MAX_QUEUED) pending.push({ text, type });
}
