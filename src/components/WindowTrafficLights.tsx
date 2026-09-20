import React from 'react';

interface WindowTrafficLightsProps {
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export const WindowTrafficLights: React.FC<WindowTrafficLightsProps> = ({
  onClose,
  onMinimize,
  onMaximize,
}) => {
  return (
    <div className="flex items-center gap-2 group/lights py-1" dir="ltr">
      <button
        type="button"
        onClick={onClose}
        title="إغلاق النافذة"
        className="w-3.5 h-3.5 rounded-full bg-rose-500 hover:bg-rose-600 transition-colors flex items-center justify-center cursor-pointer shadow-sm shadow-rose-500/30 border border-rose-600/30"
      >
        <span className="opacity-0 group-hover/lights:opacity-100 text-[9px] text-rose-950 font-bold leading-none select-none">
          ✕
        </span>
      </button>
      <button
        type="button"
        onClick={onMinimize}
        title="تصغير إلى شريط المهام"
        className="w-3.5 h-3.5 rounded-full bg-amber-400 hover:bg-amber-500 transition-colors flex items-center justify-center cursor-pointer shadow-sm shadow-amber-400/30 border border-amber-500/30"
      >
        <span className="opacity-0 group-hover/lights:opacity-100 text-[9px] text-amber-950 font-bold leading-none select-none -translate-y-0.5">
          –
        </span>
      </button>
      <button
        type="button"
        onClick={onMaximize}
        title="تكبير الشاشة كاملة"
        className="w-3.5 h-3.5 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center cursor-pointer shadow-sm shadow-emerald-500/30 border border-emerald-600/30"
      >
        <span className="opacity-0 group-hover/lights:opacity-100 text-[8px] text-emerald-950 font-bold leading-none select-none">
          ⤢
        </span>
      </button>
    </div>
  );
};
