import type { ImageDto } from "@/types/chat";

export interface IncomingCallData {
  callerUserId: number;
  callerName: string;
  callerImage: ImageDto | null;
  /** Unique call identifier — used for all signaling and call management. */
  callId: string;
  /** true for video calls, false for voice. */
  hasVideo: boolean;
  startedAt: string;
}

/** Hub method parameter - aligned with actual implementation. */
export interface CallRequestDto {
  targetUserId: number;
  hasVideo?: boolean;
}

export type CallSignalType = "offer" | "answer" | "ice" | "reject" | "cancel" | "end";

/**
 * Outgoing hub parameter — the server routes by TARGET USER ID
 * (VideoCallCommandService.SendCallSignalAsync). There is no callId field
 * server-side; the client keeps its own id for UI/dedupe only.
 */
export interface OutgoingCallSignal {
  targetUserId: number;
  type: CallSignalType;
  payload?: string | null;
}

/** What the server broadcasts back (CallSignalData): sender id + type. */
export interface IncomingCallSignal {
  userId: number;
  userName: string;
  type: CallSignalType;
  payload?: string | null;
}

export interface CallPeer {
  userId: number;
  name: string;
  imageUrl: string | null;
  /** Client-local id for UI/dedupe (FCM + incoming ring). Never sent upstream. */
  callId: string;
  /** true for video calls, false for voice. */
  hasVideo: boolean;
}

/** WebRTC signaling state. */
export interface WebRTCState {
  localDescription: RTCSessionDescriptionInit | null;
  remoteDescription: RTCSessionDescriptionInit | null;
  iceCandidates: RTCIceCandidateInit[];
  signalingState: RTCSignalingState;
  iceConnectionState: RTCIceConnectionState;
  connectionState: RTCPeerConnectionState;
}
