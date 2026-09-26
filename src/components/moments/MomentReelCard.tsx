import React, { useState, useRef, useEffect } from 'react';
import { Moment, User, ReactionEmoji, Timeline } from '../../types';
import { useApp } from '../../context/AppContext';
import { TimelineDetailView } from '../timelines/TimelineDetailView';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MapPin, 
  Play, 
  Pause,
  Volume2,
  VolumeX,
  Trash2, 
  ArrowLeft, 
  X, 
  AlertTriangle, 
  Compass 
} from 'lucide-react';

export interface MomentReelCardProps {
  moment: Moment;
  onClose?: () => void;
  autoPlayVideo?: boolean;
  isImmersive: boolean;
  onToggleImmersive: () => void;
}

const EMOJI_REACTIONS: { emoji: ReactionEmoji; label: string }[] = [
  { emoji: '❤️', label: 'Yêu thích' },
  { emoji: '👍', label: 'Thích' },
  { emoji: '😂', label: 'Haha' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Buồn' },
  { emoji: '😡', label: 'Phẫn nộ' }
];

export const MomentReelCard: React.FC<MomentReelCardProps> = ({
  moment,
  onClose,
  autoPlayVideo = true,
  isImmersive,
  onToggleImmersive
}) => {
  const { 
    currentUser, 
    friends, 
    timelines,
    reactToMoment, 
    deleteMoment,
    openChatWithUser, 
    setSelectedUser,
    showToast 
  } = useApp();

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [showVideoControls, setShowVideoControls] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState<Timeline | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef<boolean>(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const author: User = friends.find(f => f.id === moment.userId) || currentUser;
  const isMine = moment.userId === currentUser.id;
  const isLover = author.relationship?.type === 'lover';
  const isBestFriend = author.relationship?.type === 'best_friend';
  const isVideo = moment.mediaType === 'video' || !!moment.videoUrl;

  // Find user's current reaction on this moment
  const userReaction = moment.reactions.find(r => r.userId === currentUser.id);
  const isLiked = !!userReaction;

  // Find associated timeline if any
  const momentTimeline = timelines.find(t => 
    (moment.timelineId && t.id === moment.timelineId) ||
    t.moments.some(m => m.id === moment.id)
  );

  // Multi-image handling
  const images = moment.imageUrls && moment.imageUrls.length > 0 ? moment.imageUrls : [moment.imageUrl];
  const hasMultipleImages = !isVideo && images.length > 1;

  // Close reaction picker on outside tap
  useEffect(() => {
    if (!showReactionPicker) return;
    const handleWindowClick = () => setShowReactionPicker(false);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, [showReactionPicker]);

  const handleSelectEmojiReaction = (emoji: ReactionEmoji, e: React.MouseEvent) => {
    e.stopPropagation();
    reactToMoment(moment.id, emoji);
    setShowReactionPicker(false);
  };

  const handleHeartPointerDown = (e: React.PointerEvent | React.TouchEvent) => {
    isHoldingRef.current = false;
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    
    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      setShowReactionPicker(true);
      if (navigator.vibrate) navigator.vibrate(40);
    }, 380);
  };

  const handleHeartPointerUp = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    // If it was not a hold, perform regular tap reaction
    if (!isHoldingRef.current && !showReactionPicker) {
      e.stopPropagation();
      reactToMoment(moment.id, '❤️');
    }
    isHoldingRef.current = false;
  };

  const handleTogglePlayPause = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowVideoControls(false);
      }, 3000);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowVideoControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  };

  const handleMediaClick = (e: React.MouseEvent) => {
    const now = Date.now();
    // Handle double tap to love
    if (now - lastTapRef.current < 300) {
      reactToMoment(moment.id, '❤️');
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 800);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    // Close reaction picker if open
    if (showReactionPicker) {
      setShowReactionPicker(false);
      return;
    }

    if (isVideo) {
      // Tap on video: Toggle video controller (time seeker, play/stop)
      setShowVideoControls(prev => {
        const next = !prev;
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (next && isPlaying) {
          controlsTimeoutRef.current = setTimeout(() => {
            setShowVideoControls(false);
          }, 3500);
        }
        return next;
      });
    } else {
      // Single tap toggles immersive media-only mode for images
      onToggleImmersive();
    }
  };

  // Horizontal Swipe Handling for Multi-image Moments (No next/prev button)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Check if horizontal swipe was dominant
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 35 && hasMultipleImages) {
      if (deltaX < 0 && activeImageIndex < images.length - 1) {
        // Swipe left -> Next image
        setActiveImageIndex(prev => prev + 1);
      } else if (deltaX > 0 && activeImageIndex > 0) {
        // Swipe right -> Prev image
        setActiveImageIndex(prev => prev - 1);
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handleShare = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: `Khoảnh khắc của ${moment.userName}`,
        text: moment.caption,
        url: window.location.href
      }).catch(() => {});
    } else {
      showToast('Đã sao chép liên kết khoảnh khắc! 📋', 'success');
    }
  };

  const handleDelete = () => {
    deleteMoment(moment.id);
    setShowDeleteConfirm(false);
    showToast('Đã xóa khoảnh khắc thành công', 'info');
    onClose?.();
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVideoSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newTime = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setVideoCurrentTime(newTime);
    }
  };

  const formatVideoTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Media: Video or Image(s) */}
      {isVideo ? (
        <div 
          className="relative w-full h-full flex items-center justify-center cursor-pointer" 
          onClick={handleMediaClick}
        >
          <video
            ref={videoRef}
            src={moment.videoUrl || moment.imageUrl}
            poster={moment.imageUrl}
            autoPlay={autoPlayVideo}
            loop
            muted={isMuted}
            playsInline
            onTimeUpdate={(e) => setVideoCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
            className="w-full h-full object-cover"
          />
          {/* Center Play / Stop Controller Overlay (When tapped or paused) */}
          {(showVideoControls || !isPlaying) && (
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-auto z-25 animate-in fade-in duration-150"
              onClick={handleMediaClick}
            >
              <button
                type="button"
                onClick={handleTogglePlayPause}
                className="w-18 h-18 rounded-full bg-black/75 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:scale-110 active:scale-90 transition-all shadow-2xl cursor-pointer"
                title={isPlaying ? 'Dừng video' : 'Phát tiếp'}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 fill-white" />
                ) : (
                  <Play className="w-8 h-8 fill-white translate-x-0.5" />
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div 
          className="w-full h-full relative flex items-center justify-center cursor-pointer overflow-hidden" 
          onClick={handleMediaClick}
        >
          {/* Active Image */}
          <img
            key={activeImageIndex}
            src={images[activeImageIndex]}
            alt={moment.caption}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover animate-in fade-in duration-200"
          />

          {/* Top Dots Indicator (Pure swipe, no buttons) */}
          {hasMultipleImages && !isImmersive && (
            <div className="absolute top-14 inset-x-0 flex justify-center items-center gap-1.5 z-25 pointer-events-none">
              {images.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === activeImageIndex 
                      ? 'w-6 bg-white shadow-sm' 
                      : 'w-1.5 bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Double tap big floating heart animation */}
      {showHeartAnim && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in zoom-in-50 duration-200">
          <Heart className="w-24 h-24 fill-rose-500 text-rose-500 drop-shadow-2xl animate-pulse" />
        </div>
      )}

      {/* Top & Bottom Cinematic Gradient Overlays - Hidden in Immersive Media-Only mode */}
      <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none transition-opacity duration-300 ${
        isImmersive ? 'opacity-0' : 'opacity-100'
      }`} />
      
      <div className={`absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none transition-opacity duration-300 ${
        isImmersive ? 'opacity-0' : 'opacity-100'
      }`} />

      {/* Top Navigation Bar (When opened as viewer modal) */}
      {onClose && !isImmersive && (
        <div className="absolute top-4 inset-x-4 z-30 flex items-center justify-between pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/75 active:scale-90 transition-all cursor-pointer shadow-lg"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5 stroke-white" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/75 active:scale-90 transition-all cursor-pointer shadow-lg"
            title="Đóng"
          >
            <X className="w-5 h-5 stroke-white" />
          </button>
        </div>
      )}

      {/* Left Bottom Information Overlay - Hidden in Immersive Media-Only mode */}
      <div className={`absolute left-3 bottom-5 right-18 z-20 text-white space-y-2 pointer-events-auto transition-all duration-300 ${
        isImmersive ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'
      }`}>
        {/* Author row */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            setSelectedUser(author);
          }}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="relative">
            <img
              src={moment.userAvatar}
              alt={moment.userName}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white/90 shadow-md group-hover:scale-105 transition-transform"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-black rounded-full" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="text-sm font-bold text-white drop-shadow-sm truncate whitespace-nowrap">
                {moment.userName}
              </span>
              {isLover && (
                <span className="text-[10px] font-bold text-rose-300 bg-rose-950/60 backdrop-blur-xs px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap truncate">
                  ❤️ Người yêu
                </span>
              )}
              {isBestFriend && (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 backdrop-blur-xs px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap truncate">
                  ⭐ Bạn thân
                </span>
              )}
            </div>
            <div className="text-[11px] text-white/70 whitespace-nowrap truncate">
              {moment.timeAgo}
            </div>
          </div>
        </div>

        {/* Caption */}
        {moment.caption && (
          <p className="text-xs text-white/95 leading-relaxed drop-shadow-sm line-clamp-3">
            {moment.caption}
          </p>
        )}

        {/* Location & Timeline Badges Row (Same line as requested) */}
        {(moment.locationName || momentTimeline) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Location badge */}
            {moment.locationName && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-[11px] text-white/90 whitespace-nowrap truncate max-w-[170px]">
                <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis">{moment.locationName}</span>
              </div>
            )}

            {/* Timeline name badge (on the same line as location badge) */}
            {momentTimeline && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTimelineModal(momentTimeline);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-600/80 to-purple-600/80 hover:from-indigo-600 hover:to-purple-600 backdrop-blur-md border border-indigo-300/30 text-[11px] text-white font-semibold whitespace-nowrap truncate max-w-[180px] shadow-sm cursor-pointer transition-all active:scale-95"
                title={`Xem chi tiết hành trình: ${momentTimeline.title}`}
              >
                <Compass className="w-3 h-3 text-indigo-200 shrink-0" />
                <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis">{momentTimeline.title}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right Side TikTok / Reel Action Column - Hidden in Immersive Media-Only mode */}
      <div className={`absolute right-3 bottom-6 z-20 flex flex-col items-center gap-3.5 text-white pointer-events-auto transition-all duration-300 ${
        isImmersive ? 'opacity-0 translate-x-4 pointer-events-none' : 'opacity-100 translate-x-0'
      }`}>
        {/* Like / Reaction Button with Long-press emoji picker */}
        <div className="relative flex flex-col items-center">
          {/* Floating Emoji Picker Popup when holding */}
          {showReactionPicker && (
            <div 
              className="absolute -top-12 right-0 flex items-center gap-1 p-1 rounded-full bg-slate-900/95 backdrop-blur-xl border border-white/25 shadow-2xl z-40 animate-in zoom-in-75 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {EMOJI_REACTIONS.map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={(e) => handleSelectEmojiReaction(r.emoji, e)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg hover:scale-125 active:scale-95 transition-all cursor-pointer hover:bg-white/10"
                  title={r.label}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          )}

          <button
            onPointerDown={handleHeartPointerDown}
            onPointerUp={handleHeartPointerUp}
            onPointerLeave={() => {
              if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
            }}
            onTouchStart={handleHeartPointerDown}
            onTouchEnd={handleHeartPointerUp}
            className="flex flex-col items-center gap-1 cursor-pointer group active:scale-80 transition-transform"
            title="Nhấn để thả tim, giữ lâu để chọn cảm xúc (Haha, Phẫn nộ...)"
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${
              isLiked 
                ? 'bg-rose-500/90 border-rose-400 text-white shadow-lg shadow-rose-500/30' 
                : 'bg-black/50 border-white/20 text-white hover:bg-black/70'
            }`}>
              {userReaction && userReaction.emoji !== '❤️' ? (
                <span className="text-xl leading-none">{userReaction.emoji}</span>
              ) : (
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-white stroke-white' : 'stroke-white'}`} />
              )}
            </div>
            <span className="text-[11px] font-bold text-white/95 drop-shadow-sm whitespace-nowrap truncate">
              {moment.reactions.length}
            </span>
          </button>
        </div>

        {/* Chat / Direct Message Button (if allowed) */}
        {moment.allowDirectMessage !== false && moment.allowComment !== false && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openChatWithUser(author);
            }}
            className="flex flex-col items-center gap-1 cursor-pointer group active:scale-80 transition-transform"
            title="Nhắn tin"
          >
            <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
              <MessageCircle className="w-5 h-5 stroke-white" />
            </div>
            <span className="text-[10px] font-bold text-white/90 drop-shadow-sm whitespace-nowrap truncate">
              Nhắn tin
            </span>
          </button>
        )}

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-1 cursor-pointer group active:scale-80 transition-transform"
          title="Chia sẻ"
        >
          <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
            <Share2 className="w-4.5 h-4.5 stroke-white" />
          </div>
          <span className="text-[10px] font-bold text-white/90 drop-shadow-sm whitespace-nowrap truncate">
            Chia sẻ
          </span>
        </button>

        {/* Mute/Unmute Button for Video Moments */}
        {isVideo && (
          <button
            type="button"
            onClick={handleToggleMute}
            className="flex flex-col items-center gap-1 cursor-pointer group active:scale-80 transition-transform"
            title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
          >
            <div className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${
              isMuted ? 'bg-black/50 border-white/20 text-white hover:bg-black/70' : 'bg-indigo-600/80 border-indigo-400 text-white shadow-md shadow-indigo-600/30'
            }`}>
              {isMuted ? <VolumeX className="w-4.5 h-4.5 stroke-white" /> : <Volume2 className="w-4.5 h-4.5 stroke-white" />}
            </div>
            <span className="text-[10px] font-bold text-white/90 drop-shadow-sm whitespace-nowrap truncate">
              {isMuted ? 'Tắt tiếng' : 'Bật tiếng'}
            </span>
          </button>
        )}

        {/* Delete button if owner */}
        {isMine && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="flex flex-col items-center gap-1 cursor-pointer group active:scale-80 transition-transform"
            title="Xóa khoảnh khắc"
          >
            <div className="w-11 h-11 rounded-full bg-rose-600/40 backdrop-blur-md border border-rose-500/40 flex items-center justify-center text-rose-300 hover:bg-rose-600/60 transition-colors">
              <Trash2 className="w-4.5 h-4.5 stroke-rose-200" />
            </div>
            <span className="text-[10px] font-bold text-rose-300 drop-shadow-sm whitespace-nowrap truncate">
              Xóa
            </span>
          </button>
        )}
      </div>

      {/* Video Controller: Time Seeker & Controls */}
      {isVideo && (
        <div 
          className={`absolute inset-x-0 bottom-0 z-35 px-4 pb-3 pt-6 flex flex-col gap-1.5 bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-auto transition-all duration-300 ${
            showVideoControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTogglePlayPause}
              className="text-white hover:text-indigo-400 active:scale-90 transition-all cursor-pointer p-1"
              title={isPlaying ? 'Dừng video' : 'Phát video'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <span className="text-[11px] font-mono text-white/90 shrink-0 font-medium select-none">
              {formatVideoTime(videoCurrentTime)}
            </span>

            <input
              type="range"
              min={0}
              max={videoDuration || 10}
              step={0.1}
              value={videoCurrentTime}
              onChange={handleVideoSeek}
              className="flex-1 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all"
            />

            <span className="text-[11px] font-mono text-white/60 shrink-0 font-medium select-none">
              {formatVideoTime(videoDuration)}
            </span>

            <button
              type="button"
              onClick={handleToggleMute}
              className="text-white hover:text-indigo-400 active:scale-90 transition-all cursor-pointer p-1"
              title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl p-5 text-center text-white shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold whitespace-nowrap truncate">Xóa khoảnh khắc này?</h4>
            <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
              Khoảnh khắc sẽ bị gỡ bỏ vĩnh viễn và không thể khôi phục lại.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer whitespace-nowrap truncate"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-md transition-colors cursor-pointer whitespace-nowrap truncate"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TIMELINE DETAIL FULL MODAL */}
      {showTimelineModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setShowTimelineModal(null);
          }}
        >
          <div 
            className="w-full h-full sm:max-w-md bg-white sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <TimelineDetailView
              timeline={showTimelineModal}
              onBack={() => setShowTimelineModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
