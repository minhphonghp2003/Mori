import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Volume2, 
  VolumeX, 
  Sparkles 
} from 'lucide-react';

export const CallModal: React.FC = () => {
  const { activeCall, endCall, toggleMuteCall, toggleCameraCall } = useApp();

  if (!activeCall) return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-sm h-[92vh] max-h-[700px] rounded-[36px] bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col justify-between p-6">
        
        {/* If video call and connected, show simulated camera feed */}
        {activeCall.isVideo && activeCall.isConnected && !activeCall.isCameraOff && (
          <div className="absolute inset-0 z-0">
            <img
              src={activeCall.partner.avatar}
              alt="Partner video"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover blur-xs opacity-50 scale-105"
            />
            {/* Small self selfie view */}
            <div className="absolute top-16 right-5 w-24 h-32 rounded-2xl overflow-hidden border-2 border-white/40 shadow-xl bg-slate-800">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
                alt="Self video"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 right-1 text-[9px] font-bold text-white bg-black/60 px-1 rounded">Bạn</div>
            </div>
          </div>
        )}

        {/* Top Info */}
        <div className="relative z-10 text-center pt-8">
          <div className="relative w-28 h-28 mx-auto mb-4">
            {!activeCall.isConnected && (
              <span className="absolute -inset-4 bg-indigo-500/20 rounded-full animate-ping" />
            )}
            <img
              src={activeCall.partner.avatar}
              alt={activeCall.partner.name}
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-full object-cover ring-4 ring-white/20 shadow-2xl"
            />
          </div>

          <h2 className="text-xl font-bold text-white drop-shadow-sm">
            {activeCall.partner.name}
          </h2>
          <div className="text-xs text-slate-300 font-medium mt-1">
            {!activeCall.isConnected ? (
              <span className="text-indigo-400 font-semibold animate-pulse">
                Đang đổ chuông...
              </span>
            ) : (
              <span className="text-emerald-400 font-bold tabular-nums">
                {activeCall.isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại'} · {formatDuration(activeCall.duration)}
              </span>
            )}
          </div>
        </div>

        {/* Audio waves animation if voice call */}
        {!activeCall.isVideo && activeCall.isConnected && (
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
          <div className="flex items-center justify-center gap-5 mb-6">
            {/* Mute Mic */}
            <button
              onClick={toggleMuteCall}
              className={`w-13 h-13 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                activeCall.isMuted
                  ? 'bg-rose-500 text-white'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
              title={activeCall.isMuted ? 'Bật mic' : 'Tắt mic'}
            >
              {activeCall.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {/* Toggle Camera */}
            {activeCall.isVideo && (
              <button
                onClick={toggleCameraCall}
                className={`w-13 h-13 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  activeCall.isCameraOff
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
                title={activeCall.isCameraOff ? 'Bật camera' : 'Tắt camera'}
              >
                {activeCall.isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            )}

            {/* Speaker Toggle */}
            <button
              className="w-13 h-13 rounded-full bg-white/15 text-white hover:bg-white/25 flex items-center justify-center transition-all cursor-pointer"
              title="Loa ngoài"
            >
              <Volume2 className="w-6 h-6" />
            </button>
          </div>

          {/* End Call Button */}
          <div className="flex justify-center">
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
              title="Kết thúc cuộc gọi"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
