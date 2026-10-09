import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Moment } from '../../types';
import { getAvailableMoments, formatMomentDate } from '../../services/moment';
import { mapMoment } from '../../lib/moment/mappers';
import { X, Compass, Calendar, Users, Camera, Check, Loader2 } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { LogoLoader } from '../common/LogoLoader';

interface CreateTimelineModalProps {
  onClose: () => void;
}

const toDateInput = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const CreateTimelineModal: React.FC<CreateTimelineModalProps> = ({ onClose }) => {
  const { friends, createTimeline, showToast } = useApp();

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(() => toDateInput(new Date()));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return toDateInput(d);
  });
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);
  const [selectedMomentIds, setSelectedMomentIds] = useState<string[]>([]);
  const [available, setAvailable] = useState<Moment[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const acceptedFriends = friends.filter(f => f.relationship?.status === 'accepted');

  // The API only accepts *your* moments inside the range that aren't already
  // on a timeline (GET /Moment/available requires both dates).
  useEffect(() => {
    if (!startDate || !endDate) {
      setAvailable([]);
      return;
    }
    const from = new Date(`${startDate}T00:00:00`);
    const to = new Date(`${endDate}T23:59:59`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
      setAvailable([]);
      return;
    }
    let alive = true;
    setIsLoadingAvailable(true);
    (async () => {
      try {
        const out: Moment[] = [];
        let prevId: number | null = null;
        for (let page = 0; page < 3; page++) {
          const res = await getAvailableMoments(
            formatMomentDate(from),
            formatMomentDate(to),
            prevId,
            20,
          );
          out.push(...res.data.map(mapMoment));
          if (!res.hasMore || res.prevId == null) break;
          prevId = res.prevId;
        }
        if (!alive) return;
        setAvailable(out);
        // Drop selections that are no longer attachable in this range.
        setSelectedMomentIds((prev) => prev.filter((id) => out.some((m) => m.id === id)));
      } catch (err) {
        console.error('[CreateTimelineModal] getAvailableMoments failed:', err);
        if (alive) setAvailable([]);
      } finally {
        if (alive) setIsLoadingAvailable(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [startDate, endDate]);

  const togglePartner = (id: string) => {
    setSelectedPartnerIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const toggleMoment = (id: string) => {
    setSelectedMomentIds(prev =>
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Vui lòng nhập tên hành trình', 'error');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createTimeline({
        title: title.trim(),
        partnerIds: selectedPartnerIds,
        selectedMomentIds,
      });
      onClose();
    } catch {
      // Axios errors are already toasted by the interceptor — keep the
      // editor open so nothing the user picked is lost.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tạo hành trình mới"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div 
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[92dvh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom-8 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-3 sm:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-600" aria-hidden="true" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Tạo hành trình mới</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên chuyến đi / Hành trình
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="VD: Chuyến đi Đà Lạt mùa sương 🌲, Săn mây Tà Xùa..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 font-medium"
            />
          </div>

          {/* Dates scope which of YOUR moments can be attached */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                <span>Ngày bắt đầu</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                <span>Ngày kết thúc</span>
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Tag Co-Travelers */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>Bạn đồng hành ({selectedPartnerIds.length} người)</span>
            </label>
            {acceptedFriends.length === 0 ? (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                Bạn chưa có bạn bè nào để thêm vào hành trình.
              </p>
            ) : (
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {acceptedFriends.map((friend) => {
                  const isSelected = selectedPartnerIds.includes(friend.id);
                  return (
                    <button
                      type="button"
                      key={friend.id}
                      onClick={() => togglePartner(friend.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Avatar
                        src={friend.avatar}
                        name={friend.name}
                        className="w-5 h-5 rounded-full object-cover"
                        textClassName="text-[8px]"
                      />
                      <span>{friend.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Select moments (yours, in range, not on another timeline) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Camera className="w-3.5 h-3.5 text-emerald-500" />
              <span>Gắn khoảnh khắc vào hành trình ({selectedMomentIds.length} ảnh)</span>
            </label>
            {isLoadingAvailable ? (
              <div className="flex items-center justify-center py-6">
                <LogoLoader size="sm" text={null} />
              </div>
            ) : available.length === 0 ? (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-3 text-center">
                Không có khoảnh khắc nào của bạn trong khoảng ngày này.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto no-scrollbar p-1">
                {available.map((m) => {
                  const isSelected = selectedMomentIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleMoment(m.id)}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        isSelected ? 'border-emerald-600 scale-95 shadow-md' : 'border-transparent opacity-80'
                      }`}
                    >
                      <img
                        src={m.imageUrl}
                        alt={m.caption}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 flex gap-2 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 min-h-[44px] rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 min-h-[44px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu hành trình'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
