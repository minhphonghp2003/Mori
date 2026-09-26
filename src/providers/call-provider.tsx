"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { appHub } from "@/lib/signalr/app-hub";
import { callAudio } from "@/lib/call-audio";
import { emitToast } from "@/lib/toast";
import { setCallController, type PushIncomingCall } from "@/lib/call/controller";
import type { CallEndedReason } from "@/types/notification";
import type { CallPeer } from "@/types/call";

export type CallStatus = "idle" | "incoming" | "outgoing" | "active" | "reconnecting" | "failed";

interface CallContextValue {
  status: CallStatus;
  peer: CallPeer | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  micMuted: boolean;
  cameraOff: boolean;
  callDuration: number;
  acceptCall: () => void;
  rejectCall: () => void;
  cancelCall: () => void;
  endCall: () => void;
  toggleMic: () => void;
  toggleCamera: () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    // NOTE: STUN-only like the old app — some symmetric-NAT networks will
    // fail. A TURN server is the documented future work for production.
  ],
  iceCandidatePoolSize: 10,
};

const CallContext = createContext<CallContextValue | null>(null);

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const statusRef = useRef<CallStatus>("idle");
  const peerRef = useRef<CallPeer | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const offeredSdpRef = useRef<RTCSessionDescriptionInit | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    peerRef.current = peer;
  }, [peer]);

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callAudio.stop();
    };
  }, []);

  // Duration ticks only while the call is established.
  useEffect(() => {
    if (status === "active" || status === "reconnecting") {
      if (status === "active") setCallDuration(0);
      if (!callTimerRef.current) {
        callTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current && status !== "active" && status !== "reconnecting") {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, [status]);

  const cleanup = useCallback(() => {
    callAudio.stop();
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    pendingCandidatesRef.current = [];
    offeredSdpRef.current = null;
    reconnectAttemptsRef.current = 0;
    setPeer(null);
    setLocalStream(null);
    setRemoteStream(null);
    setMicMuted(false);
    setCameraOff(false);
    setCallDuration(0);
    setStatus("idle");
  }, []);

  const flushCandidates = useCallback((pc: RTCPeerConnection) => {
    const pending = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const c of pending) {
      pc.addIceCandidate(c).catch((err) => console.error("[Call] addIceCandidate failed:", err));
    }
  }, []);

  /** Signals route by TARGET USER ID (server contract) — never by callId. */
  const sendSignal = useCallback(
    async (type: "offer" | "answer" | "ice" | "reject" | "cancel" | "end", payload?: string | null) => {
      const target = peerRef.current?.userId;
      if (!target) return;
      await appHub.sendCallSignal({ targetUserId: target, type, payload: payload ?? null });
    },
    [],
  );

  const createPeer = useCallback(() => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        void sendSignal("ice", JSON.stringify(e.candidate)).catch((err) =>
          console.error("[Call] send ICE failed:", err),
        );
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      setRemoteStream(stream);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        reconnectAttemptsRef.current = 0;
        if (statusRef.current === "reconnecting") setStatus("active");
      } else if (state === "disconnected") {
        if (statusRef.current !== "active") return;
        setStatus("reconnecting");
        emitToast("Đang kết nối lại...", "info");
        void (async () => {
          reconnectAttemptsRef.current += 1;
          const attempt = reconnectAttemptsRef.current;
          if (attempt > 3) {
            cleanup();
            emitToast("Mất kết nối cuộc gọi", "error");
            return;
          }
          await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** (attempt - 1), 4000)));
          if (pcRef.current !== pc || pc.connectionState !== "disconnected") return;
          try {
            const offer = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(offer);
            await sendSignal("offer", JSON.stringify(offer));
          } catch (err) {
            console.error("[Call] ICE restart failed:", err);
          }
        })();
      } else if (state === "failed") {
        if (statusRef.current === "active" || statusRef.current === "reconnecting") {
          cleanup();
          emitToast("Mất kết nối cuộc gọi", "error");
        }
      }
    };

    pcRef.current = pc;
    return pc;
  }, [cleanup, sendSignal]);

  const getLocalMedia = useCallback(async (hasVideo: boolean): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: hasVideo
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
          : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch {
      if (hasVideo) {
        try {
          const fallback = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          localStreamRef.current = fallback;
          setLocalStream(fallback);
          return fallback;
        } catch {
          // fall through to the friendly error below
        }
      }
      throw new Error("Không thể truy cập camera/micro. Hãy cấp quyền và thử lại.");
    }
  }, []);

  const startCall = useCallback(
    async (targetUserId: number, name = "", imageUrl: string | null = null, hasVideo = true) => {
      if (statusRef.current !== "idle") {
        emitToast("Đang có cuộc gọi khác", "info");
        return;
      }
      // Local-only id for UI/dedupe — the SERVER mints the real callId and
      // delivers it to the callee via ReceiveCall / FCM push.
      const callId = `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const nextPeer: CallPeer = { userId: targetUserId, name, imageUrl, callId, hasVideo };
      setPeer(nextPeer);
      setStatus("outgoing");
      callAudio.play();

      try {
        const stream = await getLocalMedia(hasVideo);
        const pc = createPeer();
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        // 1. Ring the target (server generates the callId + notifies).
        await appHub.call(targetUserId, hasVideo);

        // 2. Send our offer, routed to the target user.
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: hasVideo,
        });
        await pc.setLocalDescription(offer);
        await sendSignal("offer", JSON.stringify(offer));
      } catch (err) {
        console.error("[Call] start failed:", err);
        cleanup();
        emitToast(err instanceof Error ? err.message : "Không thể bắt đầu cuộc gọi", "error");
      }
    },
    [getLocalMedia, createPeer, sendSignal, cleanup],
  );

  const acceptCall = useCallback(async () => {
    const current = peerRef.current;
    if (!current || statusRef.current !== "incoming") return;
    try {
      const stream = await getLocalMedia(current.hasVideo);
      const pc = createPeer();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      if (!offeredSdpRef.current) {
        throw new Error("Không nhận được tín hiệu từ người gọi, vui lòng gọi lại.");
      }
      await pc.setRemoteDescription(new RTCSessionDescription(offeredSdpRef.current));
      flushCandidates(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal("answer", JSON.stringify(answer));

      callAudio.stop();
      setStatus("active");
    } catch (err) {
      console.error("[Call] accept failed:", err);
      cleanup();
      emitToast(err instanceof Error ? err.message : "Không thể nhận cuộc gọi", "error");
    }
  }, [getLocalMedia, createPeer, flushCandidates, sendSignal, cleanup]);

  const rejectCall = useCallback(() => {
    void sendSignal("reject").catch((err) => console.error("[Call] reject failed:", err));
    cleanup();
  }, [sendSignal, cleanup]);

  const cancelCall = useCallback(() => {
    void sendSignal("cancel").catch((err) => console.error("[Call] cancel failed:", err));
    cleanup();
    emitToast("Đã hủy cuộc gọi", "info");
  }, [sendSignal, cleanup]);

  const endCall = useCallback(() => {
    void sendSignal("end").catch((err) => console.error("[Call] end failed:", err));
    cleanup();
    emitToast("Cuộc gọi đã kết thúc", "info");
  }, [sendSignal, cleanup]);

  const toggleMic = useCallback(() => {
    setMicMuted((prev) => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = !next;
      });
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraOff((prev) => {
      const next = !prev;
      localStreamRef.current?.getVideoTracks().forEach((t) => {
        t.enabled = !next;
      });
      return next;
    });
  }, []);

  /** Foreground FCM `call.incoming` — same ringing UI, deduped by callId. */
  const handlePushIncoming = useCallback(
    (data: PushIncomingCall) => {
      if (peerRef.current?.callId === data.callId) return;
      if (statusRef.current !== "idle") {
        // Busy — release the caller instead of ringing over the live call.
        void appHub
          .sendCallSignal({ targetUserId: data.callerUserId, type: "reject" })
          .catch((err) => console.error("[Call] busy-reject failed:", err));
        return;
      }
      setPeer({
        userId: data.callerUserId,
        name: data.callerName,
        imageUrl: data.callerAvatar ?? null,
        callId: data.callId,
        hasVideo: data.hasVideo,
      });
      setStatus("incoming");
      callAudio.play();
    },
    [],
  );

  /** Foreground FCM `call.ended` — dismiss ringing for this callId. */
  const handlePushEnded = useCallback(
    (callId: string, reason?: CallEndedReason) => {
      const current = peerRef.current;
      if (!current || current.callId !== callId) return;
      if (statusRef.current !== "incoming" && statusRef.current !== "outgoing") return;
      cleanup();
      if (reason === "missed" || reason === "timeout") {
        emitToast("Cuộc gọi nhỡ 📵", "info");
      }
    },
    [cleanup],
  );

  useEffect(() => {
    const unsubCall = appHub.onReceiveCall((data) => {
      if (peerRef.current?.callId === data.callId) return;
      if (statusRef.current !== "idle") {
        void appHub
          .sendCallSignal({ targetUserId: data.callerUserId, type: "reject" })
          .catch((err) => console.error("[Call] busy-reject failed:", err));
        return;
      }
      setPeer({
        userId: data.callerUserId,
        name: data.callerName,
        imageUrl: data.callerImage?.thumbUrl ?? data.callerImage?.originalUrl ?? null,
        callId: data.callId,
        hasVideo: data.hasVideo,
      });
      setStatus("incoming");
      callAudio.play();
    });

    const unsubSignal = appHub.onReceiveCallSignal(async (data) => {
      const current = peerRef.current;
      // Server signals carry the SENDER user id (no callId) — only the
      // peer we're talking to can move this call forward.
      if (!current || data.userId !== current.userId) return;

      switch (data.type) {
        case "offer":
          if (statusRef.current === "incoming" && data.payload) {
            try {
              offeredSdpRef.current = JSON.parse(data.payload);
            } catch (err) {
              console.error("[Call] bad offer payload:", err);
            }
          }
          break;

        case "answer": {
          const pc = pcRef.current;
          if (
            pc &&
            (statusRef.current === "outgoing" || statusRef.current === "reconnecting") &&
            pc.signalingState === "have-local-offer"
          ) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.payload ?? "{}")));
              flushCandidates(pc);
              callAudio.stop();
              setStatus("active");
            } catch (err) {
              console.error("[Call] bad answer:", err);
              if (statusRef.current === "outgoing") {
                cleanup();
                emitToast("Không thể kết nối cuộc gọi", "error");
              }
            }
          }
          break;
        }

        case "ice":
          if (data.payload) {
            try {
              const candidate = JSON.parse(data.payload);
              if (pcRef.current?.remoteDescription) {
                pcRef.current.addIceCandidate(candidate).catch((err) =>
                  console.error("[Call] addIceCandidate failed:", err),
                );
              } else {
                pendingCandidatesRef.current.push(candidate);
              }
            } catch (err) {
              console.error("[Call] bad ICE payload:", err);
            }
          }
          break;

        case "reject":
          if (statusRef.current === "outgoing") {
            cleanup();
            emitToast(`${current.name || "Người kia"} đã từ chối cuộc gọi`, "info");
          }
          break;

        case "cancel":
          if (statusRef.current === "incoming") {
            cleanup();
            emitToast(`Cuộc gọi nhỡ từ ${current.name || "người lạ"} 📵`, "info");
          }
          break;

        case "end":
          if (statusRef.current === "active" || statusRef.current === "reconnecting") {
            cleanup();
            emitToast("Cuộc gọi đã kết thúc", "info");
          }
          break;
      }
    });

    return () => {
      unsubCall();
      unsubSignal();
    };
  }, [cleanup, flushCandidates]);

  // Publish the controller for AppContext actions + the push listener.
  useEffect(() => {
    setCallController({
      startCall: (targetUserId, name, imageUrl, hasVideo) => {
        void startCall(targetUserId, name, imageUrl, hasVideo);
      },
      acceptCall: () => void acceptCall(),
      rejectCall,
      cancelCall,
      endCall,
      toggleMic,
      toggleCamera,
      handlePushIncoming,
      handlePushEnded,
    });
    return () => setCallController(null);
  }, [
    startCall,
    acceptCall,
    rejectCall,
    cancelCall,
    endCall,
    toggleMic,
    toggleCamera,
    handlePushIncoming,
    handlePushEnded,
  ]);

  return (
    <CallContext.Provider
      value={{
        status,
        peer,
        localStream,
        remoteStream,
        micMuted,
        cameraOff,
        callDuration,
        acceptCall: () => void acceptCall(),
        rejectCall,
        cancelCall,
        endCall,
        toggleMic,
        toggleCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
};
