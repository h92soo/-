import React from 'react';
import {
  Clock,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Radio,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { useBiometricBackgroundJob } from '../services/biometricBackgroundJobService';
import { soundEffects } from '../utils/soundEffects';

interface BiometricBackgroundJobBannerProps {
  className?: string;
  compact?: boolean;
}

export const BiometricBackgroundJobBanner: React.FC<BiometricBackgroundJobBannerProps> = ({
  className = '',
  compact = false,
}) => {
  const {
    state,
    isRunning,
    enabled,
    secondsRemaining,
    onlineCount,
    offlineCount,
    totalDevices,
    lastRunTimestamp,
    runNow,
    toggleEnabled,
    updateSettings,
  } = useBiometricBackgroundJob();

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (timestamp: number | null) => {
    if (!timestamp) return 'لم يتم بعد في هذه الجلسة';
    const diffSec = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
    if (diffSec < 60) return `منذ ${diffSec} ثانية`;
    const diffMin = Math.floor(diffSec / 60);
    return `منذ ${diffMin} دقيقة`;
  };

  const handleIntervalChange = (mins: number) => {
    soundEffects.playButtonClick();
    updateSettings({ intervalMinutes: mins });
  };

  if (compact) {
    return (
      <div
        className={`px-3 py-2 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
          enabled
            ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
            : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
        } ${className}`}
        dir="rtl"
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isRunning
                ? 'bg-amber-500 animate-ping'
                : enabled
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-slate-400'
            }`}
          />
          <div className="flex items-center gap-1.5 font-bold">
            <Radio className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              {isRunning
                ? 'جارٍ الفحص الدوري الآن...'
                : enabled
                ? `فحص دوري (كل ${state.intervalMinutes} دقائق)`
                : 'الفحص الدوري متوقف'}
            </span>
          </div>

          {enabled && (
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-emerald-500/20" dir="ltr">
              {formatCountdown(secondsRemaining)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runNow}
            disabled={isRunning}
            className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="فحص أجهزة البصمة الآن فورياً"
          >
            <RefreshCw className={`w-3 h-3 ${isRunning ? 'animate-spin' : ''}`} />
            <span>فحص الآن</span>
          </button>

          <button
            type="button"
            onClick={toggleEnabled}
            className={`p-1 rounded-xl transition-colors cursor-pointer border ${
              enabled
                ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300'
                : 'text-slate-500 bg-slate-200 dark:bg-slate-700 border-slate-300'
            }`}
            title={enabled ? 'إيقاف الفحص التلقائي مؤقتاً' : 'تشغيل الفحص التلقائي'}
          >
            {enabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl border transition-all space-y-3.5 shadow-2xs ${
        enabled
          ? 'bg-gradient-to-br from-indigo-50/50 via-white to-emerald-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-emerald-950/20 border-indigo-200/70 dark:border-indigo-900/50'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      } ${className}`}
      dir="rtl"
    >
      {/* TOP ROW: Header, Status Pill, Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
              isRunning
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 animate-pulse'
                : enabled
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            {isRunning ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Radio className={`w-5 h-5 ${enabled ? 'animate-pulse' : ''}`} />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>وظيفة الفحص التلقائي بالخلفية (Background Job)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                  كل {state.intervalMinutes} دقائق
                </span>
              </h3>

              {/* Live status badge */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isRunning
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                    : enabled
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isRunning
                      ? 'bg-amber-500 animate-ping'
                      : enabled
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-slate-400'
                  }`}
                />
                <span>
                  {isRunning
                    ? 'جارٍ الفحص الحقيقي الآن...'
                    : enabled
                    ? 'نشطة وتفحص تلقائياً'
                    : 'متوقفة مؤقتاً'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              فحص اتصال أجهزة البصمة المربوطة تلقائياً وتحديث حالاتها (متصل / غير متصل) مع زمن الاستجابة في اللوحة لحظياً
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Run Now Button */}
          <button
            type="button"
            onClick={runNow}
            disabled={isRunning}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="تنفيذ فحص فوري لكافة أجهزة البصمة الآن"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'جارٍ الفحص...' : 'فحص فوري الآن'}</span>
          </button>

          {/* Toggle Pause / Resume */}
          <button
            type="button"
            onClick={toggleEnabled}
            className={`px-3 py-2 rounded-xl font-bold text-xs transition-all border flex items-center gap-1.5 cursor-pointer ${
              enabled
                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
            }`}
            title={enabled ? 'إيقاف الفحص الدوري التلقائي مؤقتاً' : 'تفعيل الفحص الدوري التلقائي'}
          >
            {enabled ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>إيقاف مؤقت</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>تشغيل الفحص</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* METRICS & COUNTDOWN BAR */}
      <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Countdown */}
        <div>
          <span className="text-[10px] text-slate-400 block mb-0.5 font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3 text-indigo-500" />
            <span>الفحص القادم خلال:</span>
          </span>
          <span className="font-mono text-base font-extrabold text-indigo-700 dark:text-indigo-400" dir="ltr">
            {enabled ? formatCountdown(secondsRemaining) : '— — : — —'}
          </span>
        </div>

        {/* Last check time */}
        <div>
          <span className="text-[10px] text-slate-400 block mb-0.5 font-semibold">
            آخر فحص مكتمل:
          </span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {formatTimeAgo(lastRunTimestamp)}
          </span>
        </div>

        {/* Online Devices */}
        <div>
          <span className="text-[10px] text-slate-400 block mb-0.5 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>الأجهزة المربوطة (Online):</span>
          </span>
          <span className="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400">
            {onlineCount} <span className="text-xs text-slate-400 font-normal">/ {totalDevices}</span>
          </span>
        </div>

        {/* Offline Devices */}
        <div>
          <span className="text-[10px] text-slate-400 block mb-0.5 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            <span>أجهزة غير مربوطة:</span>
          </span>
          <span className={`font-mono text-base font-extrabold ${offlineCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
            {offlineCount}
          </span>
        </div>
      </div>

      {/* BOTTOM CONFIG BAR: Interval presets */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-indigo-500" />
          <span className="font-bold">فترة الفحص الدوري:</span>
          <div className="flex items-center gap-1">
            {[1, 3, 5, 10].map((mins) => {
              const isSelected = state.intervalMinutes === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleIntervalChange(mins)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                  title={`تغيير الفحص الدوري إلى كل ${mins} دقائق`}
                >
                  {mins === 5 ? 'كل 5 دقائق (افتراضي)' : `كل ${mins} د`}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>يتم فحص أجهزة الـ TCP/IP ومنافذ الـ USB في الخلفية وبث الحالة لجميع الأقسام فورياً</span>
        </div>
      </div>
    </div>
  );
};
