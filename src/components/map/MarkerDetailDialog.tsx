import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, FriendshipType, Timeline, Moment } from '../../types';
import { useApp } from '../../context/AppContext';
import { getUserById } from '@/services/user';
import { mapProfileFriendshipToRelationship } from '@/lib/chat/mappers';
import { useFirstMessage } from '@/hooks/chat/use-first-message';
import { FirstMessageModal } from '../chat/FirstMessageModal';
import { MomentViewerModal } from '../moments/MomentViewerModal';
import { Avatar } from '../common/Avatar';
import { formatDistance } from '@/lib/location/geo';
import { 
  X, 
  MessageCircle, 
  Video, 
  MapPin, 
  Heart, 
  Star, 
  UserCheck, 
  Clock,
  Compass, 
  Calendar,
  Image as ImageIcon,
  ChevronRight, 
  Shield, 
  Sparkles,
  Trash2,
  UserX,
  Check,
  UserPlus,
  Mars,
  Venus,
  Transgender
} from 'lucide-react';

interface MarkerDetailDialogProps {
  user: User;
  onClose: () => void;
}

export const MarkerDetailDialog: React.FC<MarkerDetailDialogProps> = ({ user, onClose }) => {
  const { 
    currentUser, 
    moments,
    ensureUserMoments,
    timelines,
    ensureUserTimelines,
    changeFriendshipType,
    respondFriendRequest,
    sendFriendRequest,
    cancelFriendRequest,
    removeFriend,
    friendshipVersion,
    deleteTimeline
  } = useApp();
  const router = useRouter();

  const [activeTab, setActiveProfileTab] = useState<'moments' | 'timelines'>('moments');
  // First-message flow is shared with /home (see useFirstMessage). The
  // profile dialog stays open underneath the modal; a successful send
  // opens the room (which clears the selected user, closing this dialog).
  const {
    greetingTarget,
    greetingText,
    setGreetingText,
    isSendingGreeting,
    startGreetingChat,
    closeGreeting,
    sendGreeting
  } = useFirstMessage();
  const [timelineToDelete, setTimelineToDelete] = useState<Timeline | null>(null);
  const [viewingMoment, setViewingMoment] = useState<Moment | null>(null);
  const [confirmUnfriend, setConfirmUnfriend] = useState(false);
  // Age/gender/bio come from the public profile endpoint (location events
  // only carry id/name/image).
  const [profile, setProfile] = useState<{
    age: number;
    gender: 'Nam' | 'Nữ' | 'Khác';
    bio: string;
    relationship?: User['relationship'];
  } | null>(null);

  const renderGenderIcon = (gender?: string) => {
    const g = (gender || '').toLowerCase();
    if (g.includes('nam') || g === 'male') {
      return (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600 shrink-0" title="Nam">
          <Mars className="w-3 h-3" aria-hidden="true" />
        </span>
      );
    }
    if (g.includes('nữ') || g === 'female') {
      return (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-pink-100 text-pink-600 shrink-0" title="Nữ">
          <Venus className="w-3 h-3" aria-hidden="true" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-100 text-purple-600 shrink-0" title="Khác">
        <Transgender className="w-3 h-3" aria-hidden="true" />
      </span>
    );
  };

  // No cache here — relationship comes straight from GET /User/{id}.
  // friendship: null means stranger, full stop.
  const liveUser = profile ? { ...user, relationship: profile.relationship } : user;
  const isSelf = liveUser.id === currentUser.id;
  const currentType = liveUser.relationship?.type || 'friend';
  const friendStatus = liveUser.relationship?.status || (liveUser.relationship ? 'accepted' : 'none');

  // Reset on user switch; refetch on friendship mutations (send/accept/…)
  // so the dialog shows the new status right away. The reset is split out
  // so a mutation refetch doesn't flash the dialog back to unloaded state.
  useEffect(() => {
    setProfile(null);
    setConfirmUnfriend(false);
  }, [user.id]);

  useEffect(() => {
    if (isSelf) return;
    const numericId = Number(user.id);
    if (!Number.isFinite(numericId) || numericId <= 0) return;
    let alive = true;
    getUserById(numericId)
      .then((u) => {
        if (!alive) return;
        setProfile({
          age: u.age ?? 0,
          gender: u.genderId === 1 ? 'Nam' : u.genderId === 2 ? 'Nữ' : 'Khác',
          bio: u.bio ?? '',
          relationship: u.friendship
            ? mapProfileFriendshipToRelationship(u.friendship, Number(currentUser.id))
            : undefined,
        });
      })
      .catch((err) => console.error('[MarkerDetailDialog] getUserById failed:', err));
    return () => {
      alive = false;
    };
  }, [user.id, isSelf, currentUser.id, friendshipVersion]);

  // The feed only carries the recent page — merge this profile's visible
  // moments so the grid and viewer show them all.
  useEffect(() => {
    void ensureUserMoments(user.id);
    void ensureUserTimelines(user.id);
  }, [user.id, ensureUserMoments, ensureUserTimelines]);

  const displayUser: User = profile
    ? { ...liveUser, age: profile.age, gender: profile.gender, bio: profile.bio }
    : liveUser;

  // Moments posted by this user
  const userMoments = moments.filter(m => m.userId === liveUser.id);

  // Timelines where this user is owner or partner
  const userTimelines = timelines.filter(
    t => t.ownerId === liveUser.id || t.partners.some(p => p.id === liveUser.id)
  );

  const getRelationshipBadge = () => {
  if (isSelf) return { label: 'Tài khoản của bạn', color: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' };
  if (friendStatus === 'pending_received') return { label: 'Chờ bạn đồng ý', color: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30' };
  if (friendStatus === 'pending_sent') return { label: 'Đã gửi lời mời', color: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' };
  if (friendStatus === 'none') return { label: 'Người qua đường', color: 'bg-slate-100 dark:bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-500/30' };
  if (currentType === 'lover') return { label: 'Người yêu', color: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30' };
  if (currentType === 'best_friend') return { label: 'Bạn thân', color: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30' };
  return { label: 'Bạn bè', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
  };

  const relBadge = getRelationshipBadge();

  const RELATIONSHIP_OPTIONS: { type: FriendshipType; label: string; icon: React.ReactNode; activeColor: string }[] = [
    {
      type: 'friend',
      label: 'Bạn bè',
      icon: <UserCheck className="w-3.5 h-3.5 shrink-0" />,
      activeColor: 'bg-slate-900 text-white shadow-xs'
    },
    {
      type: 'best_friend',
      label: 'Bạn thân',
      icon: <Star className="w-3.5 h-3.5 fill-current shrink-0" />,
      activeColor: 'bg-amber-500 text-white shadow-xs'
    },
    {
      type: 'lover',
      label: 'Người yêu',
      icon: <Heart className="w-3.5 h-3.5 fill-current shrink-0" />,
      activeColor: 'bg-rose-500 text-white shadow-xs'
    }
  ];

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label={`Hồ sơ của ${liveUser.name}`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[92dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button (pinned above the single scroll area) */}
        <button
          onClick={onClose}
          aria-label="Đóng hồ sơ"
          className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 shadow-md ring-1 ring-slate-900/5 dark:ring-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Fixed user-info header (sticks at top) */}
        <div className="relative shrink-0 bg-gradient-to-b from-emerald-50/70 dark:from-emerald-500/10 via-slate-50/40 dark:via-slate-800/40 to-white dark:to-slate-900 px-5 pt-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          {/* Drag handle for mobile */}
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" aria-hidden="true" />

          <div className="flex items-start gap-3.5">
            {/* Avatar with online status */}
            <div className="relative shrink-0">
              <Avatar
                src={liveUser.avatar}
                name={liveUser.name}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/20 shadow-md"
                textClassName="text-xl"
              />
            </div>

            {/* Basic Info */}
            <div className="flex-1 min-w-0 pr-6 space-y-1">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">{liveUser.name}</h3>
                <div className="flex items-center gap-1 shrink-0">
                  {displayUser.age > 0 && (
                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                      {displayUser.age} tuổi
                    </span>
                  )}
                  {renderGenderIcon(displayUser.gender)}
                </div>
              </div>

              {/* Bio bubble - clamped to 2 lines so a long bio can't push the
                  fixed header past the modal max-h (full text stays in title) */}
              {displayUser.bio?.trim() ? (
                <div
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-500/15 px-2.5 py-0.5 rounded-lg max-w-full line-clamp-2 break-words"
                  title={displayUser.bio}
                >
                  {displayUser.bio}
                </div>
              ) : null}

              {/* Friend Status Badge */}
              <div className="flex items-center gap-2 overflow-hidden">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap truncate shrink-0 ${relBadge.color}`}>
                  {relBadge.label}
                </span>
                {!isSelf && !!liveUser.distanceM && (
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-0.5 whitespace-nowrap truncate">
                    <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Cách {formatDistance(liveUser.distanceM)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll area: chat / relationship / danger buttons scroll off,
            tab bar sticks right below the user-info header.
            min-h-0 lets it shrink inside the flex column; bottom padding
            keeps scrolled-to-end content clear of the safe area. */}
        <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar bg-white dark:bg-slate-900 pb-[env(safe-area-inset-bottom)]">
          {!isSelf && (
            <div className="px-5 py-3 space-y-3 border-b border-slate-100 dark:border-slate-800">
              {friendStatus === 'none' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      void startGreetingChat(liveUser);
                    }}
                    className="flex-[2] py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span>Nhắn tin</span>
                  </button>

                  <button
                    onClick={() => sendFriendRequest(liveUser.id)}
                    className="flex-1 py-2.5 px-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap truncate"
                  >
                    <UserPlus className="w-3.5 h-3.5 shrink-0" />
                    <span>Kết bạn</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    void startGreetingChat(liveUser);
                  }}
                  className="w-full py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>Nhắn tin trò chuyện</span>
                </button>
              )}

          {/* FIXED RELATIONSHIP SELECTION LIST */}
              {friendStatus === 'accepted' ? (
                <div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Chọn nhóm quan hệ bạn bè:</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">Chạm để đổi</span>
                  </div>

                  {/* 3-Column Segmented Relationship Picker */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                    {RELATIONSHIP_OPTIONS.map((opt) => {
                      const isSelected = currentType === opt.type;
                      return (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => changeFriendshipType(liveUser.id, opt.type)}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap truncate ${
                            isSelected
                              ? opt.activeColor
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          {opt.icon}
                          <span className="whitespace-nowrap truncate">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : friendStatus === 'pending_received' ? (
                <div className="flex items-center justify-between p-2 bg-amber-50 rounded-2xl border border-amber-100">
                  <span className="text-xs text-amber-800 font-medium whitespace-nowrap truncate">
                    Đã gửi cho bạn lời mời kết bạn
                  </span>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => respondFriendRequest(liveUser.id, true)}
                      className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap truncate"
                    >
                      Đồng ý
                    </button>
                    <button
                      onClick={() => respondFriendRequest(liveUser.id, false)}
                      className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap truncate"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              ) : friendStatus === 'pending_sent' ? (
                <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <span className="text-xs text-emerald-800 font-medium whitespace-nowrap truncate">
                    Đã gửi lời mời kết bạn
                  </span>
                  <button
                    onClick={() => cancelFriendRequest(liveUser.id)}
                    className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap truncate shrink-0 transition-colors"
                  >
                    Thu hồi
                  </button>
                </div>
              ) : null}

          {/* Danger actions (moved from removed Info tab) */}
          {friendStatus === 'accepted' && (
            <div className="flex flex-col gap-2">
              {!confirmUnfriend ? (
                <button
                  onClick={() => setConfirmUnfriend(true)}
                  aria-label={`Hủy kết bạn với ${liveUser.name}`}
                  className="flex-1 py-2 px-3 min-h-[44px] bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap truncate focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <UserX className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Hủy kết bạn</span>
                </button>
              ) : (
                <div role="alert" className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3">
                  <p className="text-xs font-bold text-rose-700 dark:text-rose-200">
                    Hủy kết bạn với {liveUser.name}? Hai bạn sẽ không còn thấy nhau trên bản đồ.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setConfirmUnfriend(false)}
                      className="flex-1 py-2 min-h-[44px] rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                      Giữ lại
                    </button>
                    <button
                      onClick={() => {
                        removeFriend(liveUser.id);
                        onClose();
                      }}
                      aria-label={`Xác nhận hủy kết bạn với ${liveUser.name}`}
                      className="flex-1 py-2 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                    >
                      Hủy kết bạn
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
            </div>
          )}

        {/* Profile Tabs Navigation (sticky — sticks below the user-info header) */}
        <div className="sticky top-0 z-10 px-4 flex items-center border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <button
              onClick={() => setActiveProfileTab('moments')}
              className={`flex-1 py-3 text-xs font-bold text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap truncate ${
                activeTab === 'moments'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap truncate">Khoảnh khắc ({userMoments.length})</span>
            </button>

            <button
              onClick={() => setActiveProfileTab('timelines')}
              className={`flex-1 py-3 text-xs font-bold text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap truncate ${
                activeTab === 'timelines'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap truncate">Hành trình ({userTimelines.length})</span>
          </button>
          </div>

          {/* Tab panels */}
          <div className="p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/50">
          {/* TAB 1: MOMENTS */}
          {activeTab === 'moments' && (
            <div>
              {userMoments.length === 0 ? (
                <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                  <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap truncate">Chưa có khoảnh khắc nào</div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    {liveUser.name} chưa chia sẻ hình ảnh hoặc câu chuyện nào gần đây.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {userMoments.map((m) => (
                    <div 
                      key={m.id} 
                      onClick={() => setViewingMoment(m)}
                      className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-xs group cursor-pointer hover:shadow-md transition-all active:scale-95"
                    >
                      <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        {m.mediaType === 'video' || m.videoUrl ? (
                          <div className="relative w-full h-full">
                            <video
                              src={m.videoUrl || m.imageUrl}
                              poster={m.imageUrl}
                              muted
                              playsInline
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                              <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white">
                                <Video className="w-4 h-4 fill-white" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={m.imageUrl}
                            alt={m.caption}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )}
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] flex items-center gap-1 whitespace-nowrap truncate">
                          <span>❤️ {m.reactions.length}</span>
                        </div>
                      </div>

                      <div className="p-2.5 space-y-1">
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed">
                          {m.caption}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-50 dark:border-slate-800">
                          <span className="truncate max-w-[90px] whitespace-nowrap">{m.locationName}</span>
                          <span className="whitespace-nowrap truncate">{m.timeAgo}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TIMELINES WITH DELETE BUTTON */}
          {activeTab === 'timelines' && (
            <div className="space-y-3">
              {userTimelines.length === 0 ? (
                <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                  <Compass className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap truncate">Chưa tham gia chuyến đi nào</div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Các tuyến đường và hành trình chung sẽ hiển thị tại đây.
                  </p>
                </div>
              ) : (
                userTimelines.map((tl) => {
                  const canDelete = isSelf || tl.ownerId === currentUser.id;

                  return (
                    <div
                      key={tl.id}
                      onClick={() => {
                        onClose();
                        router.push(`/timelines/${tl.id}`);
                      }}
                      className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow cursor-pointer group"
                    >
                      <div className="relative h-28 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <img
                          src={tl.bannerImage}
                          alt={tl.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        
                        {/* Top action row on card */}
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTimelineToDelete(tl);
                              }}
                              className="p-1.5 rounded-full bg-black/60 hover:bg-rose-600 text-white backdrop-blur-md transition-colors cursor-pointer"
                              title="Xóa hành trình này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="absolute bottom-2 left-3 right-3 text-white">
                          <h4 className="font-bold text-xs whitespace-nowrap truncate">{tl.title}</h4>
                          <div className="flex items-center gap-1.5 text-[10px] text-white/80 whitespace-nowrap truncate">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>{tl.startDate} - {tl.endDate}</span>
                            <span>·</span>
                            <span>{tl.momentCount ?? tl.moments.length} điểm dừng</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 flex items-center justify-between text-[11px] gap-2">
                        <span className="text-slate-500 dark:text-slate-400 truncate whitespace-nowrap overflow-hidden text-ellipsis flex-1">
                          {tl.description || `Tạo bởi ${tl.ownerName}`}
                        </span>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTimelineToDelete(tl);
                              }}
                              className="text-rose-600 hover:text-rose-700 font-bold text-xs flex items-center gap-0.5 cursor-pointer whitespace-nowrap truncate"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Xóa</span>
                            </button>
                          )}
                          <div className="flex items-center text-emerald-600 font-bold gap-0.5 whitespace-nowrap truncate">
                            <span>Chi tiết</span>
                            <ChevronRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
          </div>
        </div>

        {/* FIRST-MESSAGE MODAL (new 1:1 only — overlays this dialog) */}
        <FirstMessageModal
          target={greetingTarget}
          text={greetingText}
          onTextChange={setGreetingText}
          isSending={isSendingGreeting}
          onClose={closeGreeting}
          onSubmit={sendGreeting}
        />
        {/* DELETE TIMELINE CONFIRMATION MODAL */}
        {timelineToDelete && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Xóa hành trình"
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setTimelineToDelete(null)}
          >
            <div
              className="bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-3xl w-full sm:max-w-xs px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/15 ring-1 ring-rose-600/15 text-rose-600 dark:text-rose-300 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 whitespace-nowrap truncate">
                Xóa hành trình?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                Bạn có chắc muốn xóa "{timelineToDelete.title}"? Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTimelineToDelete(null)}
                  className="flex-1 py-2 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer whitespace-nowrap truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteTimeline(timelineToDelete.id);
                    setTimelineToDelete(null);
                  }}
                  className="flex-1 py-2 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer whitespace-nowrap truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
                >
                  Xóa luôn
                </button>
              </div>
            </div>
          </div>
        )}
        {/* FULLSCREEN MOMENT VIEWER MODAL */}
        {viewingMoment && (
          <MomentViewerModal
            moment={viewingMoment}
            onClose={() => setViewingMoment(null)}
          />
        )}
      </div>
    </div>
  );
};
