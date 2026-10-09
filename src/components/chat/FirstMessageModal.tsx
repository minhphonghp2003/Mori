import React from "react";
import { Avatar } from "../common/Avatar";
import type { User } from "@/types";
import { MessageCircle, Send, X } from "lucide-react";

interface FirstMessageModalProps {
  target: User | null;
  text: string;
  onTextChange: (value: string) => void;
  isSending: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  /** Moment thumbnail shown when the chat carries a moment share. */
  previewImage?: string | null;
}

const PRESET_GREETINGS = [
  "Chào bạn!",
  "Rất vui được làm quen",
  "Chào cậu, mình kết bạn nhé",
  "Hellooo",
];

/** Greeting composer for a brand-new 1:1 (no conversation yet). */
export const FirstMessageModal: React.FC<FirstMessageModalProps> = ({
  target,
  text,
  onTextChange,
  isSending,
  onClose,
  onSubmit,
  previewImage,
}) => {
  if (!target) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Gửi lời chào tới ${target.name}`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-3xl w-full sm:max-w-xs px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-3 sm:hidden" aria-hidden="true" />
        <div className="flex items-center gap-2.5 mb-3">
          <div className="relative shrink-0">
            <Avatar
              src={target.avatar}
              name={target.name}
              className="w-10 h-10 rounded-2xl object-cover"
            />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
              <MessageCircle className="w-3 h-3" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
              Gửi lời chào tới {target.name}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
              Tin nhắn đầu tiên của hai bạn
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            title="Đóng"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          {/* Preset greetings — tap to fill instead of typing */}
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {PRESET_GREETINGS.map((preset) => {
              const isActive = text.trim() === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onTextChange(preset)}
                  className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
                    isActive
                      ? "bg-emerald-700 border-emerald-700 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 border-transparent text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 hover:text-emerald-900 dark:hover:text-emerald-100 hover:border-emerald-200 dark:hover:border-emerald-500/30"
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
          {previewImage ? (
            <div className="flex items-center gap-2 mb-2 p-1.5 pr-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <img
                src={previewImage}
                alt=""
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-lg object-cover shrink-0"
              />
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                Đính kèm khoảnh khắc này
              </span>
            </div>
          ) : null}
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={3}
            maxLength={500}
            autoFocus
            placeholder="Chào bạn! Rất vui được làm quen"
            aria-label="Lời chào"
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 resize-none"
          />
          <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums text-right block mt-1" aria-live="polite">
            {text.trim().length}/500
          </span>

          <div className="flex gap-2 mt-2 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer whitespace-nowrap truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!text.trim() || isSending}
              className="flex-1 py-2 min-h-[44px] rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? "Đang gửi..." : "Gửi lời chào"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
