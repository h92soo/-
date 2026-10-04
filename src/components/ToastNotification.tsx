import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
  Briefcase,
  Clock,
  ChevronLeft,
} from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'error' | 'retirement' | 'leave';

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration?: number;
  durationMs?: number;
  actionText?: string;
  onAction?: () => void | Promise<void>;
}

export interface ToastOptions {
  title?: string;
  duration?: number;
  durationMs?: number;
  actionText?: string;
  onAction?: () => void | Promise<void>;
}

// Global listener pattern for simple, zero-overhead toasts anywhere in the app
type ToastListener = (toast: ToastItem) => void;
const listeners: Set<ToastListener> = new Set();

export const showToast = (
  message: string,
  type: ToastType = 'success',
  durationOrOptions?: number | ToastOptions
) => {
  let duration = 4500;
  let title: string | undefined;
  let actionText: string | undefined;
  let onAction: (() => void | Promise<void>) | undefined;

  if (typeof durationOrOptions === 'number') {
    duration = durationOrOptions;
  } else if (durationOrOptions && typeof durationOrOptions === 'object') {
    duration = durationOrOptions.duration ?? durationOrOptions.durationMs ?? 4500;
    title = durationOrOptions.title;
    actionText = durationOrOptions.actionText;
    onAction = durationOrOptions.onAction;
  }

  const item: ToastItem = {
    id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title,
    message,
    type,
    duration,
    actionText,
    onAction,
  };
  listeners.forEach((listener) => listener(item));
};

export const toast = {
  success: (msg: string, options?: number | ToastOptions) => showToast(msg, 'success', options),
  info: (msg: string, options?: number | ToastOptions) => showToast(msg, 'info', options),
  warning: (msg: string, options?: number | ToastOptions) => showToast(msg, 'warning', options),
  error: (msg: string, options?: number | ToastOptions) => showToast(msg, 'error', options),

  // Specialized retirement alert toast
  retirementAlert: (
    title: string,
    message: string,
    onAction?: () => void | Promise<void>,
    actionText: string = 'استعراض التقاعد'
  ) => {
    showToast(message, 'retirement', {
      title,
      duration: 6000,
      actionText,
      onAction,
    });
  },

  // Specialized leave balance alert toast
  leaveAlert: (
    title: string,
    message: string,
    onAction?: () => void | Promise<void>,
    actionText: string = 'معاينة الإجازات'
  ) => {
    showToast(message, 'leave', {
      title,
      duration: 6000,
      actionText,
      onAction,
    });
  },
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleNewToast: ToastListener = (newToast) => {
      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep up to 5 max

      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, newToast.duration || 4500);

      return () => clearTimeout(timer);
    };

    listeners.add(handleNewToast);
    return () => {
      listeners.delete(handleNewToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      id="global-toast-container"
      className="fixed bottom-5 left-5 z-[9999] flex flex-col gap-2.5 max-w-md w-full pointer-events-none"
      dir="rtl"
    >
      {toasts.map((item) => {
        let bgStyle = 'bg-slate-900/95 text-slate-100 border-slate-700/80 shadow-slate-950/40';
        let IconComponent = Info;
        let iconColor = 'text-sky-400';
        let actionBtnBg = 'bg-white/15 hover:bg-white/25 text-white';

        if (item.type === 'success') {
          bgStyle = 'bg-emerald-950/95 text-emerald-100 border-emerald-600/40 shadow-emerald-950/40';
          IconComponent = CheckCircle2;
          iconColor = 'text-emerald-400';
          actionBtnBg = 'bg-emerald-600 hover:bg-emerald-500 text-white';
        } else if (item.type === 'error') {
          bgStyle = 'bg-rose-950/95 text-rose-100 border-rose-600/40 shadow-rose-950/40';
          IconComponent = AlertCircle;
          iconColor = 'text-rose-400';
          actionBtnBg = 'bg-rose-600 hover:bg-rose-500 text-white';
        } else if (item.type === 'warning') {
          bgStyle = 'bg-amber-950/95 text-amber-100 border-amber-600/40 shadow-amber-950/40';
          IconComponent = AlertTriangle;
          iconColor = 'text-amber-400';
          actionBtnBg = 'bg-amber-600 hover:bg-amber-500 text-white';
        } else if (item.type === 'retirement') {
          bgStyle = 'bg-purple-950/95 text-purple-100 border-purple-500/50 shadow-purple-950/50';
          IconComponent = Briefcase;
          iconColor = 'text-purple-300';
          actionBtnBg = 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm';
        } else if (item.type === 'leave') {
          bgStyle = 'bg-amber-950/95 text-amber-100 border-amber-500/50 shadow-amber-950/50';
          IconComponent = Clock;
          iconColor = 'text-amber-300';
          actionBtnBg = 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm';
        }

        return (
          <div
            key={item.id}
            id={`toast-${item.id}`}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${bgStyle}`}
          >
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="p-1 rounded-xl bg-white/10 shrink-0 mt-0.5">
                <IconComponent className={`w-4 h-4 ${iconColor}`} />
              </div>

              <div className="space-y-0.5 min-w-0 flex-1">
                {item.title && (
                  <div className="text-xs font-black tracking-tight leading-snug flex items-center gap-1.5">
                    <span>{item.title}</span>
                  </div>
                )}
                <p className="text-[11px] font-medium leading-relaxed opacity-95 text-justify">
                  {item.message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 self-center">
              {item.actionText && item.onAction && (
                <button
                  type="button"
                  onClick={async () => {
                    removeToast(item.id);
                    try {
                      await item.onAction!();
                    } catch (err) {
                      console.error('Toast action failed:', err);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-xs active:scale-95 ${actionBtnBg}`}
                >
                  <span>{item.actionText}</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                title="إغلاق الإشعار"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
