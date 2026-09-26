import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[90%] max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        let icon = <Info className="w-4 h-4 text-blue-500 shrink-0" />;
        const bgStyle = 'bg-white text-slate-800 border-slate-200';
        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
        } else if (toast.type === 'error') {
          icon = <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-xl border ${bgStyle} animate-in fade-in slide-in-from-top-4 duration-200 backdrop-blur-md`}
          >
            <div className="flex items-center gap-2.5 text-xs font-medium">
              {icon}
              <span>{toast.text}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
