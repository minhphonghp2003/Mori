import React, { useEffect, useRef } from 'react';
import {
  PhoneOff,
  Phone,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2
} from 'lucide-react';
import { useCall } from '../../providers/call-provider';

export const CallModal: React.FC = () => {
  const {
    status,
    peer,
    localStream,
    remoteStream,
    micMuted,
    cameraOff,
    callDuration,
    acceptCall,
    rejectCall,
    cancelCall,
    endCall,
    toggleMic,
    toggleCamera
  } = useCall();

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = remoteVideoRef.current;
    if (el && remoteStream) {
      el.srcObject = remoteStream;
      el.play().catch(() => {});
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
  const showVideo = peer.hasVideo && isActive && remoteStream && !cameraOff;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-sm h-[92vh] max-h-[700px] rounded-[36px] bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col justify-between p-6">

        {/* Remote video fills the card when the video call is live */}
        {showVideo ? (
          <div className="absolute inset-0 z-0 bg-black">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 pointer-events-none" />
            {/* Self PiP */}
            <div className="absolute top-16 right-5 w-24 h-32 rounded-2xl overflow-hidden border-2 border-white/40 shadow-xl bg-slate-800">
              {localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ transform: 'scaleX(-1)' }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50 text-[10px] font-bold">
                  Bạn
                </div>
              )}
              <div className="absolute bottom-1 right-1 text-[9px] font-bold text-white bg-black/60 px-1 rounded">Bạn</div>
            </div>
          </div>
        ) : peer.hasVideo && isActive && cameraOff ? (
          <div className="absolute inset-0 z-0">
            <img
              src={peer.imageUrl || undefined}
              alt="Partner"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover blur-xs opacity-50 scale-105"
            />
          </div>
        ) : null}

        {/* Top Info */}
        <div className="relative z-10 text-center pt-8">
          <div className="relative w-28 h-28 mx-auto mb-4">
            {(isIncoming || isOutgoing) && (
              <span className="absolute -inset-4 bg-indigo-500/20 rounded-full animate-ping" />
            )}
            {peer.imageUrl ? (
              <img
                src={peer.imageUrl}
                alt={peer.name}
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover ring-4 ring-white/20 shadow-2xl"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-indigo-600 text-white flex items-center justify-center text-4xl font-bold ring-4 ring-white/20 shadow-2xl">
                {(peer.name || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold text-white drop-shadow-sm">
            {peer.name || 'Người gọi'}
          </h2>
          <div className="text-xs text-slate-300 font-medium mt-1">
            {(isIncoming || isOutgoing) ? (
              <span className="text-indigo-400 font-semibold animate-pulse">
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
        </div>

        {/* Audio waves animation if voice call */}
        {!peer.hasVideo && isActive && (
          <div className="relative z-10 flex items-center justify-center gap-1.5 h-12">
            {[40, 70, 100, 60, 90, 50, 80, 45].map((height, idx) => (
              <span
                key={idx}
                className="w-1.5 bg-indigo-500 rounded-full animate-pulse"
                style={{
                  height: `${height}%`,
                  animationDelay: `${idx * 150}ms`
                }}
              />
            ))}
          </div>
        )}

        {/* Bottom Control Bar */}
        <div className="relative z-10 pb-6 pt-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
          {isIncoming ? (
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={rejectCall}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
                  title="Từ chối"
                >
                  <PhoneOff className="w-7 h-7" />
                </button>
                <span className="text-[10px] font-semibold text-slate-300">Từ chối</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => acceptCall()}
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
                {/* Mute Mic */}
                <button
                  onClick={toggleMic}
                  disabled={!isActive}
                  className={`w-13 h-13 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 ${
                    micMuted
                      ? 'bg-rose-500 text-white'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                  title={micMuted ? 'Bật mic' : 'Tắt mic'}
                >
                  {micMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                {/* Toggle Camera */}
                {peer.hasVideo && (
                  <button
                    onClick={toggleCamera}
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

                {/* Speaker */}
                <button
                  className="w-13 h-13 rounded-full bg-white/15 text-white hover:bg-white/25 flex items-center justify-center transition-all cursor-pointer"
                  title="Loa ngoài"
                >
                  <Volume2 className="w-6 h-6" />
                </button>
              </div>

              {/* Cancel / End Call Button */}
              <div className="flex justify-center">
                <button
                  onClick={isOutgoing ? cancelCall : endCall}
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
