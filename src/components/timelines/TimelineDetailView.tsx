import React, { useState } from 'react';
import { Timeline, Moment } from '../../types';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Share2, 
  Users, 
  PlaneTakeoff, 
  Flag,
  Trash2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MomentViewerModal } from '../moments/MomentViewerModal';

interface TimelineDetailViewProps {
  timeline: Timeline;
  onBack: () => void;
}

export const TimelineDetailView: React.FC<TimelineDetailViewProps> = ({ timeline, onBack }) => {
  const { currentUser, showToast, deleteTimeline } = useApp();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [viewingMoment, setViewingMoment] = useState<Moment | null>(null);

  const isOwner = currentUser.id === timeline.ownerId;

  const handleDelete = () => {
    if (!isOwner) {
      showToast('Bạn chỉ có thể xóa hành trình do chính bạn tạo', 'error');
      return;
    }
    deleteTimeline(timeline.id);
    setShowDeleteConfirm(false);
    onBack();
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/timelines/${timeline.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: timeline.title, url });
        return;
      }
      throw new Error('no-share');
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        showToast('Đã sao chép liên kết hành trình! 🧭', 'success');
      } catch {
        showToast('Không thể chia sẻ liên kết lúc này', 'error');
      }
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-50 overflow-y-auto no-scrollbar select-none">
      {/* Top Floating Back Bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer whitespace-nowrap truncate"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap truncate">Quay lại</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={handleShare}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Chia sẻ hành trình"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {isOwner && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Xóa hành trình"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Banner & Intro Card */}
      <div className="p-4 max-w-lg mx-auto w-full">
        <div className="relative rounded-3xl overflow-hidden shadow-sm bg-slate-900 text-white mb-4">
          <img
            src={timeline.bannerImage}
            alt={timeline.title}
            referrerPolicy="no-referrer"
            className="w-full h-48 object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-5 flex flex-col justify-end">
            <h1 className="text-lg font-bold text-white drop-shadow-sm mb-1 leading-snug whitespace-nowrap truncate">
              {timeline.title}
            </h1>
            {timeline.description ? (
              <p className="text-xs text-white/80 line-clamp-2 mb-2 font-normal">
                {timeline.description}
              </p>
            ) : null}

            <div className="flex items-center justify-between pt-2 border-t border-white/20 text-[11px] text-white/90">
              <div className="flex items-center gap-1.5 whitespace-nowrap truncate">
                <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="whitespace-nowrap truncate">{timeline.startDate} – {timeline.endDate}</span>
              </div>

              {/* Co-travelers */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] text-white/70 mr-1 whitespace-nowrap truncate">Cùng đi:</span>
                <div className="flex -space-x-2">
                  {timeline.partners.map((partner) => (
                    <img
                      key={partner.id}
                      src={partner.avatar}
                      alt={partner.name}
                      referrerPolicy="no-referrer"
                      className="w-6 h-6 rounded-full object-cover ring-2 ring-slate-900"
                      title={partner.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* JOURNEY ROUTE VISUALIZATION */}
        <div className="relative pl-6 pr-2 py-4">
          {/* Vertical dashed timeline connector line */}
          <div className="absolute left-[31px] top-6 bottom-6 w-0.5 border-l-2 border-dashed border-indigo-300" />

          {/* START MARKER */}
          <div className="relative flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 z-10 shrink-0">
              <PlaneTakeoff className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider whitespace-nowrap truncate">Khởi hành</div>
              <div className="text-[11px] text-slate-500 whitespace-nowrap truncate">{timeline.startDate}</div>
            </div>
          </div>

          {/* MOMENTS STOPS ALONG THE ROUTE */}
          <div className="space-y-6">
            {timeline.moments.length === 0 && (
              <div className="relative flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white border-2 border-dashed border-slate-300 text-slate-400 flex items-center justify-center font-bold text-xs z-10 shrink-0 mt-2">
                  ?
                </div>
                <div className="flex-1 bg-white rounded-3xl p-4 border border-dashed border-slate-200 text-center">
                  <p className="text-[11px] text-slate-400">
                    Chưa có khoảnh khắc nào trên hành trình này.
                  </p>
                </div>
              </div>
            )}
            {timeline.moments.map((m, index) => (
              <div key={m.id} className="relative flex items-start gap-3">
                {/* Stop node badge */}
                <div className="w-8 h-8 rounded-full bg-white border-2 border-indigo-600 text-indigo-600 flex items-center justify-center font-bold text-xs shadow-xs z-10 shrink-0 mt-2">
                  {index + 1}
                </div>

                {/* Stop Card - Tap to view full screen */}
                <div 
                  onClick={() => setViewingMoment(m.moment ?? {
                    id: m.id,
                    userId: timeline.ownerId,
                    userName: timeline.ownerName,
                    userAvatar: timeline.ownerAvatar,
                    imageUrl: m.imageUrl,
                    caption: `${m.title} — ${m.caption}`,
                    locationName: m.locationName,
                    timeAgo: m.time,
                    createdAt: new Date().toISOString(),
                    visibility: 4,
                    allowComment: true,
                    reactions: []
                  })}
                  className="flex-1 bg-white rounded-3xl p-3.5 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-98"
                >
                  <div className="relative aspect-16/10 rounded-2xl overflow-hidden mb-2.5 bg-slate-100">
                    <img
                      src={m.imageUrl}
                      alt={m.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/60 backdrop-blur-xs rounded-md text-[10px] text-white font-medium flex items-center gap-1 max-w-[200px]">
                      <MapPin className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                      <span className="whitespace-nowrap truncate">{m.locationName}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-1 gap-2">
                    <h3 className="text-xs font-bold text-slate-900 whitespace-nowrap truncate group-hover:text-indigo-600 transition-colors">{m.title}</h3>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap truncate shrink-0">{m.time}</span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed font-normal line-clamp-2">
                    {m.caption}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* FINISH MARKER */}
          <div className="relative flex items-center gap-3 mt-6">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 z-10 shrink-0">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider whitespace-nowrap truncate">Kết thúc hành trình</div>
              <div className="text-[11px] text-slate-500 whitespace-nowrap truncate">{timeline.endDate} · Kỷ niệm đọng lại mãi mãi ✨</div>
            </div>
          </div>
        </div>

        {/* BOTTOM DELETE TIMELINE BUTTON (Owner only) */}
        {isOwner && (
          <div className="mt-6 pt-4 border-t border-slate-200 pb-10">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap truncate"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap truncate">Xóa hành trình này</span>
            </button>
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-xs p-5 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1 whitespace-nowrap truncate">
              Xác nhận xóa hành trình?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Hành trình "{timeline.title}" và toàn bộ các điểm dừng sẽ bị gỡ bỏ vĩnh viễn.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer whitespace-nowrap truncate"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
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
