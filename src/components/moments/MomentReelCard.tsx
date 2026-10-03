import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Moment, User, ReactionEmoji, Timeline, VisibilityTier } from '../../types';
import { useApp } from '../../context/AppContext';
import { TimelineDetailView } from '../timelines/TimelineDetailView';
import { Avatar } from '../common/Avatar';
import { LogoLoader } from '../common/LogoLoader';
import { getMomentReactions } from '@/services/moment';
import type { GroupedReactionDto } from '@/types/moment';
import { emptyUser } from '@/lib/chat/mappers';
import { useFirstMessage } from '@/hooks/chat/use-first-message';
import { FirstMessageModal } from '../chat/FirstMessageModal';
import { VISIBILITY_OPTIONS } from '@/constants/visibility';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MapPin,
  Play,
  Pause,
  Trash2,
  ArrowLeft,
  AlertTriangle,
  Compass,
  Eye,
  EyeOff
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
    ensureTimelineById,
    reactToMoment,
    deleteMoment,
    hideMoment,
    changeMomentVisibility,
    setSelectedUser,
    showToast
  } = useApp();
  // First-message flow shared with /home + location (see useFirstMessage).
  // The moment still attaches via ?momentId= for the share flow.
  const {
    greetingTarget,
    greetingText,
    setGreetingText,
    greetingMoment,
    isSendingGreeting,
    startGreetingChat,
    closeGreeting,
    sendGreeting
  } = useFirstMessage();

  // Start muted so the native autoplay never blares on first paint (the
  // effect unmutes only when allowed: scroll-into-view, tap, or play press).
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  // Center floating emoji shown when reacting (tap heart / picker emoji).
  const [floatingEmoji, setFloatingEmoji] = useState<{ emoji: string; key: number } | null>(null);
  const floatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHideConfirm, setShowHideConfirm] = useState(false);
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState<Timeline | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  // Reactions viewer (own moments show a stack instead of the react button).
  const [showReactionsViewer, setShowReactionsViewer] = useState(false);
  const [reactionUsers, setReactionUsers] = useState<GroupedReactionDto[]>([]);
  const [isLoadingReactions, setIsLoadingReactions] = useState(false);

  // Latest unique emojis for the stack (max 3).
  const stackedEmojis = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (let i = moment.reactions.length - 1; i >= 0 && out.length < 3; i--) {
      const emoji = moment.reactions[i].emoji;
      if (!seen.has(emoji)) {
        seen.add(emoji);
        out.push(emoji);
      }
    }
    return out.reverse();
  }, [moment.reactions]);

  const openReactionsViewer = async () => {
    setShowReactionsViewer(true);
    setIsLoadingReactions(true);
    try {
      const res = await getMomentReactions(Number(moment.id), null, 50);
      setReactionUsers(res.data ?? []);
    } catch (err) {
      console.error('[MomentReelCard] getMomentReactions failed:', err);
    } finally {
      setIsLoadingReactions(false);
    }
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastTapRef = useRef<number>(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef<boolean>(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const isMine = moment.userId === currentUser.id;
  // Own moments show me; friends resolve to their live profile; strangers get
  // a stub built from the moment itself (never falls back to currentUser).
  const author: User = isMine
    ? currentUser
    : (friends.find(f => f.id === moment.userId) ??
      emptyUser(moment.userId, moment.userName, moment.userAvatar || ''));
  const isLover = author.relationship?.type === 'lover';
  const isBestFriend = author.relationship?.type === 'best_friend';
  const isVideo = moment.mediaType === 'video' || !!moment.videoUrl;

  const currentVisibilityLabel =
    VISIBILITY_OPTIONS.find(o => o.value === moment.visibility)?.label ?? 'Quyền xem';

  // User's latest reaction on this moment (reactions are add-only
  // server-side, so there can be several — `find` would stick to the oldest).
  const userReaction = (() => {
    for (let i = moment.reactions.length - 1; i >= 0; i--) {
      const r = moment.reactions[i];
      if (r.userId === currentUser.id) return r;
    }
    return undefined;
  })();

  // Find associated timeline if any (fetch on demand when the moment
  // belongs to a timeline that isn't in the list yet).
  const momentTimeline = timelines.find(t => 
    (moment.timelineId && t.id === moment.timelineId) ||
    t.moments.some(m => m.id === moment.id)
  );

  useEffect(() => {
    if (moment.timelineId && !momentTimeline) {
      void ensureTimelineById(moment.timelineId);
    }
  }, [moment.timelineId, momentTimeline, ensureTimelineById]);

  // Multi-image handling
  const images = moment.imageUrls && moment.imageUrls.length > 0 ? moment.imageUrls : [moment.imageUrl];
  const hasMultipleImages = !isVideo && images.length > 1;

  // Close reaction/visibility pickers on outside tap
  useEffect(() => {
    if (!showReactionPicker && !showVisibilityPicker) return;
    const handleWindowClick = () => {
      setShowReactionPicker(false);
      setShowVisibilityPicker(false);
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, [showReactionPicker, showVisibilityPicker]);

  // The feed mounts every card at once — track whether this card is the
  // on-screen one so only it plays.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isActive, setIsActive] = useState(false);
  const activeRef = useRef(false);
  // Invalidates in-flight play() attempts so a stale promise resolving
  // late can never restart a video that was paused meanwhile (fast scroll).
  const playGenRef = useRef(0);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      activeRef.current = true;
      setIsActive(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        const active = entry.isIntersecting && entry.intersectionRatio >= 0.6;
        activeRef.current = active;
        setIsActive(active);
      },
      { threshold: [0, 0.6, 1] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Sound policy: the first activation happens on mount (navigation) and
  // always starts muted — no surprise audio. Later activations come from
  // scrolling to the video and attempt with sound (muted fallback when the
  // browser blocks it). A tap enables sound for that video going forward.
  const soundOnRef = useRef(false);
  const skipSoundOnceRef = useRef(true);
  const tryAutoplay = useCallback(async (withSound: boolean) => {
    const v = videoRef.current;
    if (!isVideo || !v) return;
    const gen = ++playGenRef.current;
    if (withSound) {
      try {
        v.muted = false;
        await v.play();
        if (playGenRef.current !== gen) {
          v.pause();
          return;
        }
        setIsMuted(false);
        setIsPlaying(true);
        return;
      } catch {
        if (playGenRef.current !== gen) return;
        // Fall through to muted autoplay below.
      }
    } else if (playGenRef.current !== gen) {
      return;
    }
    try {
      v.muted = true;
      await v.play();
      if (playGenRef.current !== gen) {
        v.pause();
        return;
      }
      setIsMuted(true);
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }, [isVideo]);

  // Only the on-screen card plays; scrolling past pauses it. Re-runs when
  // the card scrolls into view — after any tap, autoplay with audio is
  // allowed and the video unmutes by itself.
  useEffect(() => {
    const v = videoRef.current;
    if (!isVideo || !v) return;
    if (!isActive || autoPlayVideo === false) {
      if (!isActive) {
        playGenRef.current++;
        v.pause();
        setIsPlaying(false);
      }
      return;
    }
    // First activation = mount/navigation → muted. Scrolling into view
    // later attempts video+audio (falls back to muted when blocked).
    const first = skipSoundOnceRef.current;
    skipSoundOnceRef.current = false;
    void tryAutoplay(!first || soundOnRef.current);
  }, [isVideo, moment.videoUrl, isActive, autoPlayVideo, tryAutoplay]);

  // Browser tab hidden → pause (audio must not survive a tab switch);
  // visible again → resume if still the on-screen card. Unmount (route /
  // modal switch) pauses as a final safety net.
  useEffect(() => {
    const onVisibility = () => {
      const v = videoRef.current;
      if (!isVideo || !v) return;
      if (document.hidden) {
        playGenRef.current++;
        v.pause();
        setIsPlaying(false);
      } else if (activeRef.current && autoPlayVideo !== false) {
        void tryAutoplay(soundOnRef.current);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [isVideo, autoPlayVideo, tryAutoplay]);

  useEffect(() => () => {
    try {
      videoRef.current?.pause();
    } catch {
      // Element already gone — nothing to stop.
    }
  }, []);

  const showFloatingEmoji = (emoji: string) => {
    if (floatTimerRef.current) clearTimeout(floatTimerRef.current);
    setFloatingEmoji({ emoji, key: Date.now() });
    floatTimerRef.current = setTimeout(() => setFloatingEmoji(null), 900);
  };

  // Clear the float timer if the card unmounts mid-animation.
  useEffect(() => () => {
    if (floatTimerRef.current) clearTimeout(floatTimerRef.current);
  }, []);

  const handleSelectEmojiReaction = (emoji: ReactionEmoji, e: React.MouseEvent) => {
    e.stopPropagation();
    reactToMoment(moment.id, emoji);
    setShowReactionPicker(false);
    showFloatingEmoji(emoji);
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

    // If it was not a hold, react with the shown emoji (❤️ when
    // unreacted, otherwise your last emoji) and float that same one.
    // Re-sending your own emoji is a server-side no-op (add-only).
    if (!isHoldingRef.current && !showReactionPicker) {
      e.stopPropagation();
      const emoji = userReaction?.emoji ?? '❤️';
      reactToMoment(moment.id, emoji);
      showFloatingEmoji(emoji);
    }
    isHoldingRef.current = false;
  };

  const handleTogglePlayPause = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    // Manual intent wins over any in-flight autoplay attempt.
    playGenRef.current++;
    if (v.paused) {
      // Play press is a user gesture — resume with sound.
      soundOnRef.current = true;
      setIsPlaying(true);
      void tryAutoplay(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleMediaClick = (e: React.MouseEvent) => {
    const now = Date.now();
    // Double tap no longer reacts — swallow it so it doesn't double-toggle
    // the tap action below.
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    // Close reaction picker if open
    if (showReactionPicker) {
      setShowReactionPicker(false);
      return;
    }

    // A tap is a user gesture — enable sound on a playing muted video.
    // Fresh mounts always start muted so navigation never blasts audio.
    if (isVideo && videoRef.current && !videoRef.current.paused && videoRef.current.muted) {
      soundOnRef.current = true;
      videoRef.current.muted = false;
      setIsMuted(false);
    }

    // Single tap toggles the moment info overlays (video controller lives
    // at the bottom and is always visible, never toggled by tapping).
    onToggleImmersive();
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
    // Deep link: opening it in the feed shows this exact moment in the viewer.
    const shareUrl = `${window.location.origin}/moments?momentId=${moment.id}`;
    if (navigator.share) {
      navigator.share({
        title: `Khoảnh khắc của ${moment.userName}`,
        text: moment.caption,
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareUrl).catch(() => {});
      showToast('Đã sao chép liên kết khoảnh khắc! 📋', 'success');
    }
  };

  const handleDelete = () => {
    deleteMoment(moment.id);
    setShowDeleteConfirm(false);
    showToast('Đã xóa khoảnh khắc thành công', 'info');
    onClose?.();
  };

  const handleHide = () => {
    hideMoment(moment.id);
    setShowHideConfirm(false);
    onClose?.();
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
      ref={rootRef}
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

      {/* Floating emoji animation on react (tap heart / picker emoji) */}
      {floatingEmoji && (
        <div
          key={floatingEmoji.key}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
        >
          <span className="text-7xl leading-none drop-shadow-2xl animate-float-emoji">
            {floatingEmoji.emoji}
          </span>
        </div>
      )}

      {/* Top & Bottom Cinematic Gradient Overlays - Hidden in Immersive Media-Only mode */}
      <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none transition-opacity duration-300 ${
        isImmersive ? 'opacity-0' : 'opacity-100'
      }`} />
      
      <div className={`absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none transition-opacity duration-300 ${
        isImmersive ? 'opacity-0' : 'opacity-100'
      }`} />

      {/* Top Navigation Bar (When opened as viewer modal) — back only */}
      {onClose && !isImmersive && (
        <div className="absolute top-4 inset-x-4 z-30 flex items-center justify-start pointer-events-auto">
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
        </div>
      )}

      {/* Left Bottom Information Overlay - Hidden in Immersive Media-Only mode.
          Lifted on videos so the appended controller sits right below it. */}
      <div className={`absolute left-3 ${isVideo ? 'bottom-11' : 'bottom-5'} right-18 z-20 text-white space-y-2 pointer-events-auto transition-all duration-300 ${
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
            <Avatar
              src={author.avatar || moment.userAvatar}
              name={author.name || moment.userName}
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
      <div className={`absolute right-3 ${isVideo ? 'bottom-12' : 'bottom-6'} z-20 flex flex-col items-center gap-3.5 text-white pointer-events-auto transition-all duration-300 ${
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

          {isMine ? (
            // Own moment: stacked emojis instead of the react button —
            // tap to see everyone who reacted.
            <button
              onClick={(e) => {
                e.stopPropagation();
                void openReactionsViewer();
              }}
              className="flex flex-col items-center gap-1 cursor-pointer group active:scale-80 transition-transform"
              title="Xem tất cả cảm xúc"
            >
              {stackedEmojis.length > 0 ? (
                <div className="flex items-center -space-x-4">
                  {stackedEmojis.map((emoji) => (
                    <span
                      key={emoji}
                      className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/25 flex items-center justify-center text-lg shadow-md"
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 bg-black/50 text-white/40">
                  <Heart className="w-5 h-5" />
                </div>
              )}
            </button>
          ) : (
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
              {userReaction ? (
                <span className="text-4xl leading-none drop-shadow-lg active:scale-90 transition-transform">
                  {userReaction.emoji}
                </span>
              ) : (
                <div className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 bg-black/50 text-white hover:bg-black/70 transition-all">
                  <Heart className="w-5 h-5 stroke-white" />
                </div>
              )}
              <span className="text-[11px] font-bold text-white/95 drop-shadow-sm whitespace-nowrap truncate">
                {moment.reactions.length}
              </span>
            </button>
          )}
        </div>

        {/* Chat / Direct Message Button (others' moments only — carries the
            moment into the conversation via ?momentId=) */}
        {!isMine && moment.allowDirectMessage !== false && moment.allowComment !== false && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              void startGreetingChat(author, { id: moment.id, previewImage: moment.imageUrl });
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

        {/* Visibility button if owner (opens quick picker above) */}
        {isMine && (
          <div className="relative">
            {showVisibilityPicker && (
              <div
                className="absolute bottom-full right-0 mb-2 z-40 w-36 p-1 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col animate-in zoom-in-75 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="px-3 pt-1.5 pb-1 text-[9px] font-bold uppercase tracking-wider text-white/50">
                  Quyền xem
                </span>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (opt.value !== moment.visibility) {
                        changeMomentVisibility(moment.id, opt.value as VisibilityTier);
                      }
                      setShowVisibilityPicker(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-left text-[11px] font-semibold transition-colors cursor-pointer ${
                      opt.value === moment.visibility
                        ? 'bg-indigo-600/80 text-white'
                        : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVisibilityPicker(prev => !prev);
              }}
              className="flex flex-col items-center gap-1 cursor-pointer group active:scale-80 transition-transform"
              title="Đổi quyền xem khoảnh khắc"
            >
              <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                <Eye className="w-4.5 h-4.5 stroke-white" />
              </div>
              <span className="text-[10px] font-bold text-white/90 drop-shadow-sm whitespace-nowrap truncate max-w-[68px]">
                {currentVisibilityLabel}
              </span>
            </button>
          </div>
        )}

        {/* Hide button for others' moments (removed from my feed) */}
        {!isMine && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowHideConfirm(true);
            }}
            className="flex flex-col items-center gap-1 cursor-pointer group active:scale-80 transition-transform"
            title="Ẩn khoảnh khắc khỏi feed"
          >
            <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
              <EyeOff className="w-4.5 h-4.5 stroke-white" />
            </div>
            <span className="text-[10px] font-bold text-white/90 drop-shadow-sm whitespace-nowrap truncate">
              Ẩn
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

      {/* Video controller: appended right below the moment info, toggles
          with it. Compact single-row seeker (mute lives in the side column). */}
      {isVideo && (
        <div
          className={`absolute inset-x-0 bottom-0 z-30 px-3 pb-2 pt-3 flex items-center gap-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-all duration-300 ${
            isImmersive ? 'opacity-0 translate-y-3 pointer-events-none' : 'opacity-100 translate-y-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleTogglePlayPause}
            className="text-white hover:text-indigo-400 active:scale-90 transition-all cursor-pointer p-0.5 shrink-0"
            title={isPlaying ? 'Dừng video' : 'Phát video'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
          </button>

          <span className="text-[10px] font-mono text-white/90 shrink-0 font-medium select-none">
            {formatVideoTime(videoCurrentTime)}
          </span>

          <input
            type="range"
            min={0}
            max={videoDuration || 10}
            step={0.1}
            value={videoCurrentTime}
            onChange={handleVideoSeek}
            className="flex-1 h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-indigo-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-white"
          />

          <span className="text-[10px] font-mono text-white/60 shrink-0 font-medium select-none">
            {formatVideoTime(videoDuration)}
          </span>
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

      {/* HIDE CONFIRMATION MODAL (others' moments — no undo endpoint) */}
      {showHideConfirm && (
        <div 
          className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl p-5 text-center text-white shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <EyeOff className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold whitespace-nowrap truncate">Ẩn khoảnh khắc này?</h4>
            <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
              Khoảnh khắc sẽ biến mất khỏi feed của bạn và không thể hoàn tác.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowHideConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer whitespace-nowrap truncate"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleHide}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md transition-colors cursor-pointer whitespace-nowrap truncate"
              >
                Ẩn ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REACTIONS BOTTOM SHEET (own moments — tap the emoji stack) */}
      {showReactionsViewer && (
        <div
          className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setShowReactionsViewer(false);
          }}
        >
          <div
            className="w-full bg-slate-900 border-t border-x border-slate-800 rounded-t-[32px] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white shadow-2xl max-h-[75%] flex flex-col animate-in slide-in-from-bottom-8 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-3 shrink-0" />
            <h4 className="text-sm font-bold whitespace-nowrap truncate text-center">
              Cảm xúc · {moment.reactions.length}
            </h4>
            <div className="mt-3 flex-1 overflow-y-auto no-scrollbar space-y-1 min-h-[60px]">
              {isLoadingReactions ? (
                <div className="py-6">
                  <LogoLoader size="sm" text={null} />
                </div>
              ) : reactionUsers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Chưa có cảm xúc nào.
                </p>
              ) : (
                reactionUsers.map((u) => (
                  <div
                    key={u.userId}
                    className="flex items-center gap-2.5 p-2 rounded-2xl hover:bg-white/5 transition-colors"
                  >
                    <Avatar
                      src={u.userImage?.thumbUrl ?? ''}
                      name={u.userName}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                    <span className="flex-1 min-w-0 text-xs font-bold truncate">
                      {u.userName}
                    </span>
                    <span className="text-lg leading-none shrink-0 tracking-tight">
                      {u.emojis.join('')}
                    </span>
                  </div>
                ))
              )}
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
            className="w-full h-full sm:max-w-md bg-white dark:bg-slate-900 sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <TimelineDetailView
              timeline={showTimelineModal}
              onBack={() => setShowTimelineModal(null)}
            />
          </div>
        </div>
      )}

      {/* FIRST-MESSAGE MODAL (new 1:1 only) */}
      <FirstMessageModal
        target={greetingTarget}
        text={greetingText}
        onTextChange={setGreetingText}
        isSending={isSendingGreeting}
        onClose={closeGreeting}
        onSubmit={sendGreeting}
        previewImage={greetingMoment?.previewImage ?? null}
      />
    </div>
  );
};
