import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Check,
  Loader2
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
      showToast('Đã tải xuống thành công!', 'success');
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
      showToast('Đang tải xuống tệp...', 'info');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={senderName || (mediaType === 'video' ? 'Video' : 'Hình ảnh')}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
    >
      
      {/* Top Controls Header */}
      <div className="relative z-10 shrink-0 flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3 text-white min-w-0">
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
            className={`px-3.5 py-2 min-h-[40px] rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-60 ${
              downloadSuccess 
                ? 'bg-emerald-600 text-white' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title="Tải xuống tệp"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">Đã tải</span>
              </>
            ) : isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Đang tải…</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
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
              src={mediaUrl}
              controls
              autoPlay
              playsInline
              loop
              className="max-h-[82vh] max-w-full rounded-2xl shadow-2xl object-contain bg-black"
            />
          </div>
        )}
      </div>

      {/* Bottom Caption Bar */}
      {caption && (
        <div className="relative z-10 shrink-0 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/90 to-transparent text-center">
          <p className="text-xs text-white/90 font-medium max-w-lg mx-auto leading-relaxed">
            {caption}
          </p>
        </div>
      )}
    </div>
  );
};
