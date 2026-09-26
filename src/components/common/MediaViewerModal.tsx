import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface MediaViewerModalProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  senderName?: string;
  timestamp?: string;
  onClose: () => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  mediaUrl,
  mediaType,
  caption,
  senderName,
  timestamp,
  onClose
}) => {
  const { showToast } = useApp();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const res = await fetch(mediaUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const extension = mediaType === 'video' ? 'mp4' : 'jpg';
      a.download = `media_${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      setDownloadSuccess(true);
      showToast('Đã tải xuống thành công! 📥', 'success');
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch {
      // Fallback
      const a = document.createElement('a');
      a.href = mediaUrl;
      a.target = '_blank';
      a.download = `media_${Date.now()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Đang tải xuống tệp... 📥', 'info');
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleVideoPlayback = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleVideoMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200">
      
      {/* Top Controls Header */}
      <div className="relative z-10 shrink-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3 text-white min-w-0">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate whitespace-nowrap">
              {senderName || (mediaType === 'video' ? 'Video' : 'Hình ảnh')}
            </h4>
            {timestamp && (
              <span className="text-[11px] text-white/60 block truncate whitespace-nowrap">
                {timestamp}
              </span>
            )}
          </div>
        </div>

        {/* Action Button: Download only */}
        <div className="flex items-center gap-2">

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95 ${
              downloadSuccess 
                ? 'bg-emerald-600 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
            title="Tải xuống tệp"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">Đã tải</span>
              </>
            ) : (
              <>
                <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
                <span>Tải xuống</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Media Display Viewport */}
      <div 
        className="flex-1 w-full h-full flex items-center justify-center p-2 relative overflow-hidden cursor-grab active:cursor-grabbing"
        onClick={(e) => {
          if (e.target === e.currentTarget && mediaType === 'image') {
            // Click outside image closes
            onClose();
          }
        }}
      >
        {mediaType === 'image' ? (
          <img
            src={mediaUrl}
            alt={caption || "Media preview"}
            referrerPolicy="no-referrer"
            className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl select-none pointer-events-auto"
            draggable={false}
          />
        ) : (
          <div className="relative max-h-[82vh] max-w-full flex items-center justify-center">
            <video
              ref={videoRef}
              src={mediaUrl}
              autoPlay
              playsInline
              loop
              className="max-h-[82vh] max-w-full rounded-2xl shadow-2xl object-contain bg-black"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Video overlay controls */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between p-2 rounded-xl bg-black/60 backdrop-blur-md text-white">
              <button
                onClick={toggleVideoPlayback}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                title={isPlaying ? 'Tạm dừng' : 'Phát'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
              </button>

              <button
                onClick={toggleVideoMute}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Caption Bar */}
      {caption && (
        <div className="relative z-10 shrink-0 px-5 py-3.5 bg-gradient-to-t from-black/90 to-transparent text-center">
          <p className="text-xs text-white/90 font-medium max-w-lg mx-auto leading-relaxed">
            {caption}
          </p>
        </div>
      )}
    </div>
  );
};
