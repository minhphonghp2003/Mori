import type { CallEndedReason } from "@/types/notification";

/**
 * Bridge between the UI surfaces (AppContext actions, push listener) and the
 * CallProvider, which lives under `(main)/layout` while those surfaces live
 * at the app root. The provider registers itself on mount.
 */
export interface CallController {
  startCall(targetUserId: number, name: string, imageUrl: string | null, hasVideo: boolean): void;
  acceptCall(): void;
  rejectCall(): void;
  cancelCall(): void;
  endCall(): void;
  toggleMic(): void;
  toggleCamera(): void;
  /** Foreground FCM `call.incoming` (full push payload, strings normalized). */
  handlePushIncoming(data: PushIncomingCall): void;
  /** Foreground FCM `call.ended` — dismiss ringing for this callId. */
  handlePushEnded(callId: string, reason?: CallEndedReason): void;
}

export interface PushIncomingCall {
  callId: string;
  callerUserId: number;
  callerName: string;
  callerAvatar?: string | null;
  hasVideo: boolean;
}

let controller: CallController | null = null;

export const setCallController = (next: CallController | null): void => {
  controller = next;
};

export const getCallController = (): CallController | null => controller;
