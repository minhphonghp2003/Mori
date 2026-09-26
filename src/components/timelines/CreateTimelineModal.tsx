import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Compass, Calendar, Users, Camera, Check } from 'lucide-react';

interface CreateTimelineModalProps {
  onClose: () => void;
}

export const CreateTimelineModal: React.FC<CreateTimelineModalProps> = ({ onClose }) => {
  const { friends, moments, createTimeline, showToast } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('20/10/2026');
  const [endDate, setEndDate] = useState('23/10/2026');
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);
  const [selectedMomentIds, setSelectedMomentIds] = useState<string[]>([]);

  const acceptedFriends = friends.filter(f => f.relationship?.status === 'accepted');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Vui lòng nhập tên hành trình', 'error');
      return;
    }

    createTimeline({
      title: title.trim(),
      description: description.trim() || 'Hành trình kỷ niệm đáng nhớ cùng những người bạn tuyệt vời.',
      bannerImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      startDate,
      endDate,
      partnerIds: selectedPartnerIds,
      selectedMomentIds
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl border border-slate-100 p-5 max-h-[90vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom-8 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Tạo hành trình mới</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên chuyến đi / Hành trình
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Chuyến đi Đà Lạt mùa sương 🌲, Săn mây Tà Xùa..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mô tả ngắn
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Kể đôi lời về chuyến đi..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Ngày bắt đầu</span>
              </label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="20/10/2026"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Ngày kết thúc</span>
              </label>
              <input
                type="text"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="23/10/2026"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Tag Co-Travelers */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>Bạn đồng hành ({selectedPartnerIds.length} người)</span>
            </label>
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
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span>{friend.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Select moments */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Camera className="w-3.5 h-3.5 text-indigo-500" />
              <span>Gắn khoảnh khắc vào hành trình ({selectedMomentIds.length} ảnh)</span>
            </label>
            <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto no-scrollbar p-1">
              {moments.map((m) => {
                const isSelected = selectedMomentIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => toggleMoment(m.id)}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                      isSelected ? 'border-indigo-600 scale-95 shadow-md' : 'border-transparent opacity-80'
                    }`}
                  >
                    <img
                      src={m.imageUrl}
                      alt={m.caption}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
            >
              Lưu hành trình
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
