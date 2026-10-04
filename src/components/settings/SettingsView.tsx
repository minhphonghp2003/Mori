import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../context/AppContext';
import { useLogout } from '../../hooks/auth/use-logout';
import { useIsPwa } from '../../hooks/use-is-pwa';
import { useTheme } from '../../providers/theme-provider';
import { requestNotificationPermission, syncFcmTokenAfterAuth, deleteFcmToken } from '../../lib/fcm';
import { FriendshipType, VisibilityTier, User as UserType, Timeline, Moment } from '../../types';
import { LogoLoader } from '../common/LogoLoader';
import { useScrollToTop } from '@/hooks/use-scroll-to-top';
import { Avatar } from '../common/Avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VISIBILITY_OPTIONS } from '../../constants/visibility';
import { CreateTimelineModal } from '../timelines/CreateTimelineModal';
import { MomentViewerModal } from '../moments/MomentViewerModal';
import { 
  User, 
  Heart, 
  Star, 
  Users, 
  UserCheck, 
  UserPlus, 
  ShieldCheck, 
  Bell, 
  Moon,
  LogOut, 
  Camera, 
  MessageCircle, 
  Check, 
  Compass, 
  Plus, 
  Calendar, 
  ArrowRight,
  Edit3,
  Download,
  Share,
  X,
  UserX,
  MoreVertical,
  Trash2,
  Image as ImageIcon,
  Upload,
  Loader2,
  Mars,
  Venus,
  Transgender
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const SettingsView: React.FC = () => {
  const { 
    currentUser, 
    friends, 
    moments, 
    ensureUserMoments,
    timelines, 
    isLoadingTimelines,
    setSelectedUser,
    respondFriendRequest, 
    cancelFriendRequest,
    changeFriendshipType, 
    removeFriend,
    updateProfile,
    updateVisibility,
    deleteTimeline,
    openChatWithUser,
    refreshFriendships,
    refreshTimelines,
    showToast 
  } = useApp();
  const router = useRouter();
  const { mutate: logout } = useLogout();
  const { theme, toggleTheme } = useTheme();
  // Already installed → the download banner has nothing to offer.
  const isPwa = useIsPwa();

  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'timelines' | 'friends' | 'settings'>('settings');
  const [showCreateTimeline, setShowCreateTimeline] = useState(false);
  const [timelineToDelete, setTimelineToDelete] = useState<Timeline | null>(null);
  const [viewingMoment, setViewingMoment] = useState<Moment | null>(null);

  // Single Unified Edit Profile Modal (Handles Name, Avatar, Age, Gender, Bio)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: currentUser.name,
    avatar: currentUser.avatar,
    age: currentUser.age,
    gender: currentUser.gender,
    bio: currentUser.bio || ''
  });

  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  // Tapping the active Cài đặt tab scrolls this page up.
  const pageScrollRef = useRef<HTMLDivElement | null>(null);
  useScrollToTop(pageScrollRef);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn một tệp hình ảnh hợp lệ', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
        setProfileForm(prev => ({ ...prev, avatar: dataUrl }));
        showToast('Đã tải ảnh đại diện lên từ máy!', 'success');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Friend Actions & Modals
  const [friendActionMenuId, setFriendActionMenuId] = useState<string | null>(null);
  const [friendToRemove, setFriendToRemove] = useState<UserType | null>(null);

  // Single toggle notification as requested (SSR-safe default, synced post-hydration).
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  const handleToggleNotifications = async (enable: boolean) => {
    if (enable) {
      if (!('Notification' in window)) {
        showToast('Trình duyệt này không hỗ trợ thông báo đẩy', 'error');
        return;
      }
      const perm = await requestNotificationPermission();
      if (perm !== 'granted') {
        setNotificationsEnabled(false);
        showToast('Bạn đã từ chối quyền thông báo. Mở cài đặt trình duyệt để bật lại.', 'error');
        return;
      }
      try {
        await syncFcmTokenAfterAuth();
      } catch (err) {
        console.error('[SettingsView] syncFcmTokenAfterAuth failed:', err);
      }
      setNotificationsEnabled(true);
      showToast('Đã bật thông báo', 'info');
    } else {
      try {
        await deleteFcmToken();
      } catch (err) {
        console.error('[SettingsView] deleteFcmToken failed:', err);
      }
      setNotificationsEnabled(false);
      showToast('Đã tắt thông báo', 'info');
    }
  };

  // Download App modal
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // PWA install prompt captured when the browser offers it.
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      installPromptRef.current = e as BeforeInstallPromptEvent;
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const handleInstallApp = async () => {
    const deferred = installPromptRef.current;
    if (deferred) {
      try {
        await deferred.prompt();
        await deferred.userChoice;
        installPromptRef.current = null;
      } catch {
        // fall through to the manual instructions below
      }
    }
    setShowDownloadModal(true);
  };

  // Logout modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Friends categorization
  const acceptedFriends = friends.filter(f => f.relationship?.status === 'accepted');
  const pendingReceived = friends.filter(f => f.relationship?.status === 'pending_received');
  const pendingSent = friends.filter(f => f.relationship?.status === 'pending_sent');

  const myMoments = moments.filter(m => m.userId === currentUser.id);

  // The feed only carries the recent page — merge my visible moments so the
  // grid shows them all (timelines load globally via AppContext).
  useEffect(() => {
    void ensureUserMoments(currentUser.id);
  }, [currentUser.id, ensureUserMoments]);

  useEffect(() => {
    if (activeSubTab === 'friends') {
      void refreshFriendships();
    }
    if (activeSubTab === 'timelines') {
      void refreshTimelines();
    }
    if (activeSubTab === 'profile') {
      void ensureUserMoments(currentUser.id);
    }
  }, [activeSubTab, currentUser.id, ensureUserMoments, refreshFriendships, refreshTimelines]);

  const handleOpenEditProfile = () => {
    setProfileForm({
      name: currentUser.name,
      avatar: currentUser.avatar,
      age: currentUser.age,
      gender: currentUser.gender,
      bio: currentUser.bio || ''
    });
    setShowEditProfileModal(true);
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    showToast('Đã đăng xuất tài khoản thành công!', 'info');
    try {
      await logout();
    } catch (err) {
      console.error('[SettingsView] logout failed:', err);
    }
  };

  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      showToast('Vui lòng nhập họ tên của bạn', 'error');
      return;
    }
    if (isSavingProfile) return;
    setIsSavingProfile(true);
    try {
      // Save profile details (avatar upload + PUT /User/me)
      await updateProfile({
        name: profileForm.name.trim(),
        avatar: profileForm.avatar.trim() || currentUser.avatar,
        age: Number(profileForm.age) || 20,
        gender: profileForm.gender as 'Nam' | 'Nữ' | 'Khác',
        bio: profileForm.bio.trim()
      });

      setShowEditProfileModal(false);
    } catch {
      // Axios errors are already toasted by the interceptor — keep the
      // modal open so the user can retry without losing their edits.
    } finally {
      setIsSavingProfile(false);
    }
  };

  const confirmRemoveFriend = () => {
    if (friendToRemove) {
      removeFriend(friendToRemove.id);
      setFriendToRemove(null);
      setFriendActionMenuId(null);
    }
  };

  const renderGenderIcon = (gender?: string) => {
    const g = (gender || '').toLowerCase();
    if (g.includes('nam') || g === 'male') {
      return (
        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-600 shrink-0" title="Nam">
          <Mars className="w-2.5 h-2.5" aria-hidden="true" />
        </span>
      );
    }
    if (g.includes('nữ') || g === 'female') {
      return (
        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-pink-100 text-pink-600 shrink-0" title="Nữ">
          <Venus className="w-2.5 h-2.5" aria-hidden="true" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-600 shrink-0" title="Khác">
        <Transgender className="w-2.5 h-2.5" aria-hidden="true" />
      </span>
    );
  };

  return (
    <div ref={pageScrollRef} className="relative w-full h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto no-scrollbar select-none">
      {/* Top Profile Header Hero - Clean, minimal, non-messy */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            {/* Avatar */}
            <div 
              className="relative group cursor-pointer" 
              onClick={handleOpenEditProfile}
              title="Chạm để chỉnh sửa ảnh đại diện & hồ sơ"
            >
              <Avatar
                src={currentUser.avatar}
                name={currentUser.name}
                className="w-15 h-15 rounded-2xl object-cover ring-2 ring-emerald-500/20 shadow-sm group-hover:opacity-90 transition-opacity"
                textClassName="text-xl"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
              <div className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Name on line 1, age + gender on line 2 */}
            <div className="space-y-1 min-w-0 flex-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight whitespace-nowrap truncate">{currentUser.name}</h2>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                  {currentUser.age} tuổi
                </span>
                {renderGenderIcon(currentUser.gender)}
              </div>
            </div>
          </div>

          {/* Single, neat Edit Profile Button - strictly 1 line */}
          <button
            onClick={handleOpenEditProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap truncate shrink-0"
            title="Chỉnh sửa hồ sơ"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="whitespace-nowrap truncate">Sửa hồ sơ</span>
          </button>
        </div>

        {/* Bio section (replaces the location row) */}
        {currentUser.bio?.trim() ? (
          <p className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
            {currentUser.bio.trim()}
          </p>
        ) : null}
      </div>

      {/* Sub-tab Navigation — unified segmented control */}
      <div className="px-3 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
        <div
          role="tablist"
          aria-label="Điều hướng cài đặt"
          className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-2xl p-1"
        >
          {(
            [
              { id: 'settings', label: 'Cài đặt', Icon: ShieldCheck, dot: false },
              { id: 'profile', label: 'Khoảnh khắc', Icon: Camera, dot: false },
              { id: 'timelines', label: 'Hành trình', Icon: Compass, dot: false },
              { id: 'friends', label: 'Bạn bè', Icon: Users, dot: pendingReceived.length > 0 },
            ] as const
          ).map(({ id, label, Icon, dot }) => {
            const isActive = activeSubTab === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSubTab(id)}
                className={`relative flex-1 min-w-0 flex items-center justify-center gap-1 px-1 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{label}</span>
                {dot && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-4 max-w-lg mx-auto w-full pb-20">
        
        {/* 1. SETTINGS TAB */}
        {activeSubTab === 'settings' && (
          <div className="space-y-4">
            {/* Download Banner — hidden once installed as a PWA */}
            {!isPwa && (
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 rounded-3xl p-5 text-white shadow-md">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Download className="w-5 h-5 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-bold mb-1">Tải ứng dụng Mori</h3>
              <p className="text-xs text-white/80 leading-relaxed mb-3">
                Cài đặt ứng dụng trực tiếp vào điện thoại để nhận thông báo và truy cập nhanh chóng.
              </p>
              <button
                onClick={handleInstallApp}
                className="w-full py-2.5 rounded-xl bg-white text-emerald-600 font-bold text-xs shadow-md hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Tải ứng dụng</span>
              </button>
            </div>
            )}

            {/* Notification Setting - temporarily disabled */}
            {/* <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Thông báo</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">Nhận thông báo khi có tin nhắn & cuộc gọi</div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => {
                      void handleToggleNotifications(e.target.checked);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>
            </div> */}

            {/* Dark Mode Toggle */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 dark:text-slate-100">Giao diện tối</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">Dịu mắt khi dùng ban đêm</div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={theme === 'dark'}
                    onChange={toggleTheme}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>
            </div>

            {/* Location Privacy Settings */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Quyền riêng tư vị trí</h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Chọn đối tượng có thể nhìn thấy bạn trên bản đồ:
              </p>

              <div className="space-y-1.5">
                {VISIBILITY_OPTIONS.map((opt) => {
                  const isChecked = currentUser.visibility === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => updateVisibility(opt.value as VisibilityTier)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="text-xs">{opt.label}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">{opt.desc}</div>
                      </div>
                      {isChecked && (
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full py-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>
        )}

        {/* 2. TIMELINES SUB-TAB */}
        {activeSubTab === 'timelines' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Hành trình của bạn & bạn bè</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Các tuyến đường và bộ sưu tập chuyến đi</p>
              </div>
              <button
                onClick={() => setShowCreateTimeline(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo mới</span>
              </button>
            </div>

            {isLoadingTimelines && timelines.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2">
                <LogoLoader size="sm" text={null} />
              </div>
            ) : timelines.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-100 dark:border-slate-800">
                <Compass className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 dark:text-slate-500">Chưa có hành trình nào</p>
              </div>
            ) : (
              <div className="space-y-3">
                {timelines.map((tl) => (
                  <div
                    key={tl.id}
                    onClick={() => router.push(`/timelines/${tl.id}`)}
                    className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow cursor-pointer group"
                  >
                    <div className="relative h-32 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={tl.bannerImage}
                        alt={tl.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <h4 className="font-bold text-sm drop-shadow-xs">{tl.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-white/80 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{tl.startDate} - {tl.endDate}</span>
                          <span>·</span>
                          <span>{tl.momentCount ?? tl.moments.length} điểm dừng</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                          <Avatar
                            src={tl.ownerAvatar}
                            name={tl.ownerName}
                            className="inline-block w-6 h-6 rounded-full ring-2 ring-white object-cover"
                            textClassName="text-[8px]"
                          />
                          {tl.partners.map((p) => (
                            <Avatar
                              key={p.id}
                              src={p.avatar}
                              name={p.name}
                              className="inline-block w-6 h-6 rounded-full ring-2 ring-white object-cover"
                              textClassName="text-[8px]"
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate whitespace-nowrap">
                          Tạo bởi {tl.ownerName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {tl.ownerId === currentUser.id && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTimelineToDelete(tl);
                            }}
                            className="p-1.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Xóa hành trình"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs group-hover:translate-x-0.5 transition-transform whitespace-nowrap truncate">
                          <span>Chi tiết</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. FRIENDS SUB-TAB */}
        {activeSubTab === 'friends' && (
          <div className="space-y-4">
            {/* Pending Received */}
            {pendingReceived.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  <span>Lời mời kết bạn ({pendingReceived.length})</span>
                </h3>
                <div className="space-y-2">
                  {pendingReceived.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                      <div 
                        className="flex items-center gap-2.5 cursor-pointer flex-1"
                        onClick={() => setSelectedUser(req)}
                      >
                        <Avatar
                          src={req.avatar}
                          name={req.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400">{req.name}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">{req.status}</div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => respondFriendRequest(req.id, true)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                        >
                          Đồng ý
                        </button>
                        <button
                          onClick={() => respondFriendRequest(req.id, false)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer"
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Sent */}
            {pendingSent.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Lời mời đã gửi</h3>
                <div className="space-y-2">
                  {pendingSent.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <div 
                        className="flex items-center gap-2 cursor-pointer flex-1"
                        onClick={() => setSelectedUser(req)}
                      >
                        <Avatar
                          src={req.avatar}
                          name={req.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400">{req.name}</span>
                      </div>
                      <button
                        onClick={() => cancelFriendRequest(req.id)}
                        className="text-[11px] text-rose-600 font-semibold hover:underline cursor-pointer"
                      >
                        Thu hồi
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accepted Friends List with Profile Tap and Remove options */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center justify-between">
                <span>Danh sách bạn bè ({acceptedFriends.length})</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Chạm tên/ảnh để xem hồ sơ</span>
              </h3>

              {acceptedFriends.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                  Bạn chưa có bạn bè nào.
                </div>
              ) : (
                <div className="space-y-3">
                  {acceptedFriends.map((friend) => {
                    const type = friend.relationship?.type || 'friend';
                    const isMenuOpen = friendActionMenuId === friend.id;

                    return (
                      <div
                        key={friend.id}
                        className="relative p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors border border-slate-50 dark:border-slate-800"
                      >
                        <div className="flex items-center justify-between">
                          {/* Tap friend to view full profile */}
                          <div 
                            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 pr-2"
                            onClick={() => setSelectedUser(friend)}
                          >
                            <div className="shrink-0">
                              <Avatar
                                src={friend.avatar}
                                name={friend.name}
                                className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/10"
                              />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                                <span className="hover:text-emerald-600 truncate">{friend.name}</span>
                                {type === 'lover' && <span className="text-xs shrink-0" aria-hidden="true" />}
                                {type === 'best_friend' && <span className="text-xs shrink-0" aria-hidden="true" />}
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{friend.status}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Friendship type selector */}
                            <Select
                              value={type}
                              onValueChange={(value) => changeFriendshipType(friend.id, value as FriendshipType)}
                            >
                              <SelectTrigger
                                aria-label={`Loại quan hệ với ${friend.name}`}
                                className="h-7 w-[100px] border-0 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-800 dark:text-slate-300"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent align="end">
                                <SelectItem value="friend">Bạn bè</SelectItem>
                                <SelectItem value="best_friend">Bạn thân</SelectItem>
                                <SelectItem value="lover">Người yêu</SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Chat button */}
                            <button
                              onClick={() => openChatWithUser(friend)}
                              className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                              title="Nhắn tin"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>

                            {/* More Actions Menu Button */}
                            <button
                              onClick={() => setFriendActionMenuId(isMenuOpen ? null : friend.id)}
                              className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                              title="Tùy chọn khác"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Dropdown Action Menu */}
                        {isMenuOpen && (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 animate-in fade-in duration-100">
                            <button
                              onClick={() => {
                                setFriendToRemove(friend);
                                setFriendActionMenuId(null);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 transition-colors cursor-pointer"
                            >
                              <UserX className="w-3 h-3" />
                              <span>Hủy kết bạn</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. MOMENTS SUB-TAB */}
        {activeSubTab === 'profile' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3">Khoảnh khắc đã đăng</h3>
            {myMoments.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
                Chưa có ảnh nào được đăng.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {myMoments.map((m) => (
                  <div 
                    key={m.id} 
                    onClick={() => setViewingMoment(m)}
                    className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 group cursor-pointer hover:shadow-md transition-all active:scale-95"
                  >
                    {m.mediaType === 'video' || m.videoUrl ? (
                      <video
                        src={m.videoUrl || m.imageUrl}
                        poster={m.imageUrl}
                        muted
                        playsInline
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <img
                        src={m.imageUrl}
                        alt={m.caption}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-white text-[10px]">
                      <span className="truncate font-semibold">{m.caption}</span>
                      <span className="text-white/70">{m.timeAgo}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* UNIFIED EDIT PROFILE MODAL */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto no-scrollbar p-5 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Chỉnh sửa hồ sơ</h3>
              </div>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Hidden file input for uploading avatar from device / camera */}
              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />

              {/* Avatar Selector Section */}
              <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col items-center">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2">Ảnh đại diện</label>

                {/* Avatar Preview with Camera Overlay */}
                <div 
                  className="relative group cursor-pointer"
                  onClick={() => avatarFileInputRef.current?.click()}
                  title="Chạm để chọn ảnh từ thư viện hoặc chụp ảnh mới"
                >
                  <Avatar
                    src={profileForm.avatar}
                    name={profileForm.name}
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-emerald-500/30 shadow-md transition-transform group-hover:scale-105"
                    textClassName="text-2xl"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5" />
                    <span className="text-[9px] font-bold mt-0.5">Đổi ảnh</span>
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md border-2 border-white">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Upload from device / camera button */}
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="mt-3 w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                  <span>Chọn ảnh từ Thư viện / Chụp ảnh</span>
                </button>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Họ tên hiển thị</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  maxLength={40}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Age & Gender */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Tuổi</label>
                  <input
                    type="number"
                    min={12}
                    max={99}
                    value={profileForm.age}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, age: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="profile-gender" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Giới tính</label>
                  <Select
                    value={profileForm.gender}
                    onValueChange={(value) => setProfileForm(prev => ({ ...prev, gender: value as 'Nam' | 'Nữ' | 'Khác' }))}
                  >
                    <SelectTrigger id="profile-gender" className="h-auto w-full bg-slate-50 px-3 py-2 text-xs font-medium dark:bg-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nam">Nam</SelectItem>
                      <SelectItem value="Nữ">Nữ</SelectItem>
                      <SelectItem value="Khác">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Tiểu sử giới thiệu</label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  maxLength={150}
                  placeholder="Giới thiệu đôi nét về bản thân..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 text-right block">{profileForm.bio.length}/150</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSavingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVE FRIEND CONFIRMATION MODAL */}
      {friendToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xs p-5 shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 flex items-center justify-center mx-auto mb-3">
              <UserX className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Hủy kết bạn?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Bạn có chắc chắn muốn hủy kết bạn với <span className="font-bold text-slate-800 dark:text-slate-200">{friendToRemove.name}</span>?
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setFriendToRemove(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={confirmRemoveFriend}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Hủy kết bạn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TIMELINE MODAL */}
      {showCreateTimeline && (
        <CreateTimelineModal onClose={() => setShowCreateTimeline(false)} />
      )}

      {/* DOWNLOAD APP MODAL */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Tải ứng dụng Mori</h3>
              </div>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              Bạn có thể thêm ứng dụng trực tiếp vào màn hình chính của điện thoại để sử dụng như một ứng dụng thông thường:
            </p>

            <div className="space-y-3 mb-5">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">Trên iPhone / iPad (Safari):</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Nhấn vào nút <span className="font-bold text-emerald-600">Chia sẻ (Share)</span> ở thanh dưới Safari, sau đó chọn <span className="font-bold text-emerald-600">"Thêm vào MH chính" (Add to Home Screen)</span>.
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">Trên Android (Chrome):</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Nhấn vào menu <span className="font-bold text-emerald-600">ba chấm</span> ở góc trên, sau đó chọn <span className="font-bold text-emerald-600">"Cài đặt ứng dụng" (Install App)</span>.
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowDownloadModal(false);
                showToast('Ứng dụng đã sẵn sàng trên thiết bị của bạn!', 'success');
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xs p-5 shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 flex items-center justify-center mx-auto mb-3">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Đăng xuất tài khoản?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Bạn có chắc chắn muốn đăng xuất khỏi Mori?
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE TIMELINE CONFIRMATION MODAL */}
      {timelineToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xs p-5 shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 whitespace-nowrap truncate">
              Xóa hành trình?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Bạn có chắc muốn xóa "{timelineToDelete.title}"? Hành động này sẽ gỡ bỏ hành trình vĩnh viễn.
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
  );
};
