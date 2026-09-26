import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Users, Lock, Check } from 'lucide-react';

interface CreateGroupModalProps {
  onClose: () => void;
  onSuccess: (newConvId: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose, onSuccess }) => {
  const { friends, createGroup, showToast } = useApp();

  const [groupName, setGroupName] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const acceptedFriends = friends.filter(f => f.relationship?.status === 'accepted');

  const toggleSelectFriend = (id: string) => {
    setSelectedFriendIds(prev =>
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      showToast('Vui lòng nhập tên nhóm chat', 'error');
      return;
    }
    if (selectedFriendIds.length < 2) {
      showToast('Vui lòng chọn ít nhất 2 thành viên để lập nhóm', 'error');
      return;
    }
    if (isCreating) return;

    setIsCreating(true);
    try {
      const newId = await createGroup(groupName.trim(), selectedFriendIds, isPrivate);
      if (newId) onSuccess(newId);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl border border-slate-100 p-5 animate-in slide-in-from-bottom-8 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Tạo nhóm trò chuyện</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên nhóm
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="VD: Hội bạn thân, Team phượt..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Members Multi-select */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">
                Thêm bạn bè ({selectedFriendIds.length} đã chọn)
              </label>
              <span className="text-[10px] text-slate-400">Tối thiểu 2 người</span>
            </div>

            <div className="max-h-48 overflow-y-auto no-scrollbar space-y-1.5 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
              {acceptedFriends.map((friend) => {
                const isChecked = selectedFriendIds.includes(friend.id);
                return (
                  <div
                    key={friend.id}
                    onClick={() => toggleSelectFriend(friend.id)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                      isChecked ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={friend.avatar}
                        alt={friend.name}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <div>
                        <div className="text-xs font-bold">{friend.name}</div>
                        <div className="text-[10px] text-slate-400">{friend.status}</div>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                      isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Private Group Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-500" />
              <div>
                <div className="text-xs font-bold text-slate-800">Nhóm riêng tư</div>
                <div className="text-[10px] text-slate-400">Chỉ thành viên được mời mới có thể tham gia</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
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
              disabled={isCreating}
              className="flex-1 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95 transition-all disabled:opacity-60 disabled:cursor-wait"
            >
              {isCreating ? 'Đang tạo...' : 'Tạo nhóm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
