import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, FriendshipType, Timeline, Moment } from '../../types';
import { useApp } from '../../context/AppContext';
import { getUserById } from '@/services/user';
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
  User as UserIcon, 
  ChevronRight, 
  Shield, 
  Sparkles,
  Trash2,
  UserX,
  Ban,
  Check,
  UserPlus
} from 'lucide-react';

interface MarkerDetailDialogProps {
  user: User;
  onClose: () => void;
}

export const MarkerDetailDialog: React.FC<MarkerDetailDialogProps> = ({ user, onClose }) => {
  const { 
    currentUser, 
    friends,
    moments,
    ensureUserMoments,
    timelines,
    ensureUserTimelines,
    openChatWithUser, 
    changeFriendshipType,
    respondFriendRequest,
    sendFriendRequest,
    cancelFriendRequest,
    removeFriend,
    blockFriend,
    unblockFriend,
    deleteTimeline
  } = useApp();
  const router = useRouter();

  const [activeTab, setActiveProfileTab] = useState<'moments' | 'timelines' | 'info'>('moments');
  const [timelineToDelete, setTimelineToDelete] = useState<Timeline | null>(null);
  const [viewingMoment, setViewingMoment] = useState<Moment | null>(null);
  // Age/gender/bio come from the public profile endpoint (location events
  // only carry id/name/image) — API doc: no bio field, so it stays empty.
  const [profile, setProfile] = useState<{
    age: number;
    gender: 'Nam' | 'Nữ' | 'Khác';
  } | null>(null);

  const renderGenderIcon = (gender?: string) => {
    const g = (gender || '').toLowerCase();
    if (g.includes('nam') || g === 'male') {
      return (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[11px] font-bold shrink-0" title="Nam">
          ♂
        </span>
      );
    }
    if (g.includes('nữ') || g === 'female') {
      return (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-pink-100 text-pink-600 text-[11px] font-bold shrink-0" title="Nữ">
          ♀
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-100 text-purple-600 text-[11px] font-bold shrink-0" title="Khác">
        ⚧
      </span>
    );
  };

  // Live user reference from friends state so changes are reflected in real-time
  const liveUser = friends.find(f => f.id === user.id) || user;
  const isSelf = liveUser.id === currentUser.id;
  const currentType = liveUser.relationship?.type || 'friend';
  const friendStatus = liveUser.relationship?.status || (liveUser.relationship ? 'accepted' : 'none');

  useEffect(() => {
    setProfile(null);
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
        });
      })
      .catch((err) => console.error('[MarkerDetailDialog] getUserById failed:', err));
    return () => {
      alive = false;
    };
  }, [user.id, isSelf]);

  // The feed only carries the recent page — merge this profile's visible
  // moments so the grid and viewer show them all.
  useEffect(() => {
    void ensureUserMoments(user.id);
    void ensureUserTimelines(user.id);
  }, [user.id, ensureUserMoments, ensureUserTimelines]);

  const displayUser: User = profile
    ? { ...liveUser, age: profile.age, gender: profile.gender }
    : liveUser;

  // Moments posted by this user
  const userMoments = moments.filter(m => m.userId === liveUser.id);

  // Timelines where this user is owner or partner
  const userTimelines = timelines.filter(
    t => t.ownerId === liveUser.id || t.partners.some(p => p.id === liveUser.id)
  );

  const getRelationshipBadge = () => {
  if (isSelf) return { label: 'Tài khoản của bạn', color: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30' };
  if (friendStatus === 'blocked') return { label: 'Đã chặn 🚫', color: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700' };
  if (friendStatus === 'pending_received') return { label: 'Chờ bạn đồng ý 📩', color: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30' };
  if (friendStatus === 'pending_sent') return { label: 'Đã gửi lời mời ⏳', color: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30' };
  if (friendStatus === 'none') return { label: 'Người lạ online 🌐', color: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' };
  if (currentType === 'lover') return { label: 'Người yêu ❤️', color: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30' };
  if (currentType === 'best_friend') return { label: 'Bạn thân ⭐', color: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30' };
  return { label: 'Bạn bè 🤝', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
  };

  const relBadge = getRelationshipBadge();

  const RELATIONSHIP_OPTIONS: { type: FriendshipType; label: string; icon: React.ReactNode; activeColor: string }[] = [
    {
      type: 'friend',
      label: 'Bạn bè 🤝',
      icon: <UserCheck className="w-3.5 h-3.5 shrink-0" />,
      activeColor: 'bg-slate-900 text-white shadow-xs'
    },
    {
      type: 'best_friend',
      label: 'Bạn thân ⭐',
      icon: <Star className="w-3.5 h-3.5 fill-current shrink-0" />,
      activeColor: 'bg-amber-500 text-white shadow-xs'
    },
    {
      type: 'lover',
      label: 'Người yêu ❤️',
      icon: <Heart className="w-3.5 h-3.5 fill-current shrink-0" />,
      activeColor: 'bg-rose-500 text-white shadow-xs'
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Card */}
        <div className="relative bg-gradient-to-b from-indigo-50/70 dark:from-indigo-500/10 via-slate-50/40 dark:via-slate-800/40 to-white dark:to-slate-900 p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          {/* Drag handle for mobile */}
          <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 shadow-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3.5">
            {/* Avatar with online status */}
            <div className="relative shrink-0">
              <Avatar
                src={liveUser.avatar}
                name={liveUser.name}
                className="w-15 h-15 rounded-2xl object-cover ring-3 ring-indigo-500/20 shadow-md"
                textClassName="text-xl"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
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

              {/* Status mood bubble - strictly 1 line, hidden when empty */}
              {liveUser.status?.trim() ? (
                <div 
                  className="text-xs font-semibold text-indigo-700 bg-indigo-50/90 px-2.5 py-0.5 rounded-lg inline-block max-w-full truncate whitespace-nowrap overflow-hidden text-ellipsis"
                  title={liveUser.status}
                >
                  "{liveUser.status}"
                </div>
              ) : null}

              {/* Friend Status Badge */}
              <div className="flex items-center gap-2 overflow-hidden">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap truncate shrink-0 ${relBadge.color}`}>
                  {relBadge.label}
                </span>
                {!isSelf && !!liveUser.distanceM && (
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-0.5 whitespace-nowrap truncate">
                    <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span>Cách {formatDistance(liveUser.distanceM)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Button (Chat only - call is exclusive to chat screen) */}
          {!isSelf && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  onClose();
                  openChatWithUser(liveUser);
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Nhắn tin trò chuyện</span>
              </button>
            </div>
          )}

          {/* FIXED RELATIONSHIP SELECTION LIST */}
          {!isSelf && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {friendStatus === 'accepted' ? (
                <div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Chọn nhóm quan hệ bạn bè:</span>
                    <span className="text-[10px] text-indigo-600 font-semibold">Chạm để đổi</span>
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
                      className="px-2.5 py-1 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap truncate"
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
                <div className="flex items-center justify-between p-2 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <span className="text-xs text-indigo-800 font-medium whitespace-nowrap truncate">
                    Đã gửi lời mời kết bạn ⏳
                  </span>
                  <button
                    onClick={() => cancelFriendRequest(liveUser.id)}
                    className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap truncate shrink-0 transition-colors"
                  >
                    Thu hồi
                  </button>
                </div>
              ) : friendStatus === 'none' ? (
                <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium whitespace-nowrap truncate">
                      Người lạ đang online gần bạn
                    </span>
                  </div>
                  <button
                    onClick={() => sendFriendRequest(liveUser.id)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap truncate shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5 shrink-0" />
                    <span>Kết bạn</span>
                  </button>
                </div>
              ) : friendStatus === 'blocked' ? (
                <div className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap truncate">
                    Bạn đang chặn người này
                  </span>
                  <button
                    onClick={() => unblockFriend(liveUser.id)}
                    className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap truncate shrink-0"
                  >
                    Bỏ chặn
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Profile Tabs Navigation */}
        <div className="flex items-center border-b border-slate-100 dark:border-slate-800 px-4 bg-white dark:bg-slate-900 shrink-0">
          <button
            onClick={() => setActiveProfileTab('moments')}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap truncate ${
              activeTab === 'moments'
                ? 'border-indigo-600 text-indigo-600'
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
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap truncate">Hành trình ({userTimelines.length})</span>
          </button>

          <button
            onClick={() => setActiveProfileTab('info')}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap truncate ${
              activeTab === 'info'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap truncate">Thông tin</span>
          </button>
        </div>

        {/* Tab Contents (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
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
                          <div className="flex items-center text-indigo-600 font-bold gap-0.5 whitespace-nowrap truncate">
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

          {/* TAB 3: BASIC INFO */}
          {activeTab === 'info' && (
            <div className="space-y-3">
              {/* Bio card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 shadow-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 whitespace-nowrap truncate">
                  Tiểu sử giới thiệu
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  "{liveUser.bio || 'Chưa cập nhật tiểu sử.'}"
                </p>
              </div>

              {/* Location card — no reverse-geocode address in the API, so
                  show coordinates + distance instead (hidden when unknown). */}
              {(liveUser.location.lat !== 0 || liveUser.location.lng !== 0) && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap truncate">
                    Vị trí hiện tại
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold whitespace-nowrap truncate">
                        {liveUser.location.lat.toFixed(5)}, {liveUser.location.lng.toFixed(5)}
                      </div>
                      {!!liveUser.distanceM && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 whitespace-nowrap truncate">
                          Cách {formatDistance(liveUser.distanceM)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Profile Actions (Hủy kết bạn / Chặn) */}
              {!isSelf && friendStatus === 'accepted' && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      if (confirm(`Bạn có chắc muốn hủy kết bạn với ${liveUser.name}?`)) {
                        removeFriend(liveUser.id);
                        onClose();
                      }
                    }}
                    className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap truncate"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Hủy kết bạn</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Bạn có chắc muốn chặn ${liveUser.name}?`)) {
                        blockFriend(liveUser.id);
                        onClose();
                      }
                    }}
                    className="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap truncate"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Chặn</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* DELETE TIMELINE CONFIRMATION MODAL */}
        {timelineToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xs p-5 shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
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
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer whitespace-nowrap truncate"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteTimeline(timelineToDelete.id);
                    setTimelineToDelete(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer whitespace-nowrap truncate"
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
