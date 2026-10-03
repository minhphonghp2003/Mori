import React, { useEffect, useRef, useState } from 'react';
import {
  PhoneOff,
  Phone,
  Video,
  VideoOff,
} from 'lucide-react';
import { useCall } from '../../providers/call-provider';

export const CallModal: React.FC = () => {
  const {
    status,
    peer,
    localStream,
    remoteStream,
    cameraOff,
    remoteCameraOff,
    callDuration,
    acceptCall,
    rejectCall,
    cancelCall,
    endCall,
    toggleCamera
  } = useCall();

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);

  useEffect(() => {
    const el = remoteVideoRef.current;
    if (el && remoteStream) {
      el.srcObject = remoteStream;
      el.muted = true;
      el.play().catch(() => {});
    }
  }, [remoteStream, status]);

  useEffect(() => {
    const el = remoteAudioRef.current;
    if (!el) return;
    el.srcObject = remoteStream;
    el.muted = false;
    if (remoteStream && (status === 'active' || status === 'reconnecting')) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [remoteStream, status]);

  useEffect(() => {
    const el = localVideoRef.current;
    if (el && localStream) {
      el.srcObject = localStream;
      el.play().catch(() => {});
    }
  }, [localStream, status]);

  if (status === 'idle' || !peer) return null;

  const isIncoming = status === 'incoming';
  const isOutgoing = status === 'outgoing';
  const isActive = status === 'active';
  const isReconnecting = status === 'reconnecting';
  const isInCall = isActive || isReconnecting;
  const showVideo = peer.hasVideo && isInCall && remoteStream && !remoteCameraOff;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const statusLine = isIncoming
    ? (peer.hasVideo ? 'Cuộc gọi video đến...' : 'Cuộc gọi thoại đến...')
    : isOutgoing
      ? 'Đang đổ chuông...'
      : isReconnecting
        ? 'Đang kết nối lại...'
        : `${peer.hasVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại'} · ${formatDuration(callDuration)}`;

  return (
    <div className="fixed inset-0 z-50 h-[100dvh] w-screen overflow-hidden bg-black animate-in fade-in duration-200 select-none">
      <audio ref={remoteAudioRef} autoPlay playsInline aria-hidden="true" className="sr-only" />
      <div className="relative h-full w-full overflow-hidden bg-black">
        {showVideo ? (
          <div className="absolute inset-0 z-0 bg-black">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 pointer-events-none" />
            {/* Self PiP */}
            <div className="absolute top-4 right-4 z-20 w-24 h-32 rounded-2xl overflow-hidden border-2 border-white/40 shadow-xl bg-slate-800">
              {localStream && !cameraOff ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ transform: 'scaleX(-1)' }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-white/50 text-[10px] font-bold">
                  <VideoOff className="w-4 h-4" />
                  <span>Camera tắt</span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {isInCall && !showVideo && (
          <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden bg-slate-900">
            {peer.imageUrl ? (
              <img
                src={peer.imageUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-xl"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-900 to-black" />
            )}
            <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
            <div className="relative z-10 flex flex-col items-center px-6 text-center">
              {peer.imageUrl ? (
                <img
                  src={peer.imageUrl}
                  alt={peer.name || 'Người gọi'}
                  referrerPolicy="no-referrer"
                  className="mb-5 h-28 w-28 rounded-full border border-white/30 object-cover shadow-2xl"
                />
              ) : (
                <div className="mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-emerald-700 text-4xl font-bold text-white shadow-2xl">
                  {(peer.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <h2 className="text-xl font-bold text-white drop-shadow-sm">
                {peer.name || 'Người gọi'}
              </h2>
              <div className="mt-2 text-sm font-semibold tabular-nums text-white/80">
                {isReconnecting ? 'Đang kết nối lại...' : formatDuration(callDuration)}
              </div>
            </div>
          </div>
        )}

        {isInCall && (
          <button
            type="button"
            aria-label={controlsVisible ? 'Ẩn điều khiển cuộc gọi' : 'Hiện điều khiển cuộc gọi'}
            onClick={() => {
              setControlsVisible((visible) => !visible);
              const audio = remoteAudioRef.current;
              if (audio?.paused) audio.play().catch(() => {});
            }}
            className="absolute inset-0 z-10 h-full w-full cursor-default"
          />
        )}

        {!isInCall && <div className="absolute inset-x-0 top-0 z-10 text-center px-6 pt-[max(env(safe-area-inset-top),2rem)]">
          <div className="relative w-28 h-28 mx-auto mb-4">
            {(isIncoming || isOutgoing) && (
              <span className="absolute -inset-4 bg-emerald-500/20 rounded-full animate-ping" />
            )}
            {peer.imageUrl ? (
              <img
                src={peer.imageUrl}
                alt={peer.name}
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover ring-4 ring-white/20 shadow-2xl"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-emerald-600 text-white flex items-center justify-center text-4xl font-bold ring-4 ring-white/20 shadow-2xl">
                {(peer.name || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold text-white drop-shadow-sm">
            {peer.name || 'Người gọi'}
          </h2>
          <div className="text-xs text-slate-300 font-medium mt-1">
            {(isIncoming || isOutgoing) ? (
              <span className="text-emerald-400 font-semibold animate-pulse">
                {statusLine}
              </span>
            ) : isReconnecting ? (
              <span className="text-amber-400 font-semibold animate-pulse">
                {statusLine}
              </span>
            ) : (
              <span className="text-emerald-400 font-bold tabular-nums">
                {statusLine}
              </span>
            )}
          </div>
        </div>}

        <div className={`absolute inset-x-0 bottom-0 z-30 px-6 pt-16 pb-[max(env(safe-area-inset-bottom),1.5rem)] bg-gradient-to-t from-black via-black/75 to-transparent transition-all duration-200 ${
          isInCall && !controlsVisible ? 'translate-y-4 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}>
          {isIncoming ? (
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={(event) => { event.stopPropagation(); rejectCall(); }}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
                  title="Từ chối"
                >
                  <PhoneOff className="w-7 h-7" />
                </button>
                <span className="text-[10px] font-semibold text-slate-300">Từ chối</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={(event) => { event.stopPropagation(); acceptCall(); }}
                  className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer animate-pulse"
                  title="Nghe máy"
                >
                  <Phone className="w-7 h-7" />
                </button>
                <span className="text-[10px] font-semibold text-slate-300">Nghe máy</span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-5 mb-6">
                {/* Toggle Camera */}
                {peer.hasVideo && (
                  <button
                    onClick={(event) => { event.stopPropagation(); toggleCamera(); }}
                    disabled={!isActive}
                    className={`w-13 h-13 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 ${
                      cameraOff
                        ? 'bg-rose-500 text-white'
                        : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                    title={cameraOff ? 'Bật camera' : 'Tắt camera'}
                  >
                    {cameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  </button>
                )}

              </div>

              {/* Cancel / End Call Button */}
              <div className="flex justify-center">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isOutgoing) cancelCall();
                    else endCall();
                  }}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
                  title={isOutgoing ? 'Hủy cuộc gọi' : 'Kết thúc cuộc gọi'}
                >
                  <PhoneOff className="w-7 h-7" />
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
