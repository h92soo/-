import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Network,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { BiometricDevice, BiometricPingResult, BiometricProbePacket } from '../types';
import { biometricService } from '../services/biometricService';

interface BiometricPingModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: BiometricDevice | null;
  onPingCompleted?: (device: BiometricDevice) => void;
}

export const BiometricPingModal: React.FC<BiometricPingModalProps> = ({
  isOpen,
  onClose,
  device,
  onPingCompleted,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [pingLog, setPingLog] = useState<string[]>([]);
  const [result, setResult] = useState<BiometricPingResult | null>(null);

  const runDiagnostic = async () => {
    if (!device) return;
    setIsRunning(true);
    setResult(null);
    setPingLog([
      `بدء فحص الاتصال المباشر بالجهاز: [${device.name}]`,
      `معرّف الجهاز: #${device.id} | العنوان: ${device.ipAddress}:${device.port}`,
      'جارٍ فحص استجابة الجهاز عبر الشبكة وإرسال حزم الاختبار...',
    ]);

    try {
      const packets: BiometricProbePacket[] = [];
      for (let i = 1; i <= 4; i++) {
        const pkt = await biometricService.pingProbePacket(device, i);
        packets.push(pkt);
        setPingLog((prev) => [...prev, pkt.message]);
        if (i < 4) {
          await new Promise((res) => setTimeout(res, 100));
        }
      }

      const packetsReceived = packets.filter((p) => p.success).length;
      const packetLossPercent = Math.round(((4 - packetsReceived) / 4) * 100);
      const isSuccess = packetsReceived > 0;
      let avgLatency = 0;
      if (isSuccess) {
        avgLatency = Math.round(
          packets.filter((p) => p.success).reduce((sum, p) => sum + p.latencyMs, 0) / packetsReceived
        );
      }

      const res: BiometricPingResult = {
        deviceIp: device.ipAddress,
        port: device.port,
        success: isSuccess,
        latencyMs: avgLatency,
        packetsTransmitted: 4,
        packetsReceived,
        packetLossPercent,
        timestamp: new Date().toISOString(),
        details: isSuccess
          ? `✅ الاتصال ناجح: تم استلام ${packetsReceived}/4 حزم بنجاح - متوسط زمن الاستجابة: ${avgLatency}ms.`
          : device.connectionType === 'usb_direct'
          ? '❌ لم يتم العثور على أي جهاز بصمة موصول بمنفذ USB بالحاسبة. تأكد من توصيل الكابل.'
          : `❌ تعذر الوصول إلى (${device.ipAddress}:${device.port}) - الجهاز غير متصل بالشبكة أو كابل الشبكة غير موصول.`,
        packets,
      };

      setResult(res);

      if (isSuccess) {
        setPingLog((prev) => [
          ...prev,
          `✅ المنفذ [${device.port}] مفتوح ويستجيب بنجاح. تم تأكيد اتصال الجهاز بالمنظومة.`,
          `إحصائيات الفحص: 4 حزم أرسلت، ${packetsReceived} استلمت بنجاح، ${packetLossPercent}% نسبة الفقدان. زمن الاستجابة: ${avgLatency} ملي ثانية.`,
        ]);
      } else {
        setPingLog((prev) => [
          ...prev,
          `❌ تعذر الاتصال: لم يستجب الجهاز على العنوان (${device.ipAddress}:${device.port}).`,
          `إحصائيات الفحص: 4 حزم أرسلت، 0 استلمت، 100% نسبة الفقدان. الجهاز مغلق أو الكابل غير متصل.`,
        ]);
      }

      const updatedDevice: BiometricDevice = {
        ...device,
        status: isSuccess ? 'online' : 'offline',
        lastPingLatencyMs: isSuccess ? avgLatency : undefined,
        lastPingAt: isSuccess ? new Date().toISOString() : undefined,
      };

      await biometricService.saveDevice(updatedDevice);

      if (onPingCompleted) {
        onPingCompleted(updatedDevice);
      }
    } catch {
      setPingLog((prev) => [...prev, '❌ حدث خطأ غير متوقع أثناء فحص الاتصال الحقيقي.']);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen && device) {
      setPingLog([]);
      setResult(null);
      runDiagnostic();
    }
  }, [isOpen, device]);

  if (!isOpen || !device) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                فحص البينغ والاتصال الشبكي (Ping Diagnostic)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {device.name} — <span className="font-mono font-bold" dir="ltr">{device.ipAddress}:{device.port}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STATUS CARD */}
        <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-400 block mb-0.5">الحالة:</span>
            <span className={`font-bold ${result?.success ? 'text-emerald-600' : isRunning ? 'text-amber-500' : 'text-slate-500'}`}>
              {isRunning ? 'جارٍ الفحص...' : result?.success ? 'متصل (Online)' : 'غير متصل'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-400 block mb-0.5">زمن الاستجابة:</span>
            <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
              {result?.success ? `${result.latencyMs} ms` : '—'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-400 block mb-0.5">فقدان الحزم:</span>
            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {result ? `${result.packetLossPercent}%` : '0%'}
            </span>
          </div>
        </div>

        {/* TERMINAL LOG OUTPUT */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-[11px] h-48 overflow-y-auto space-y-1.5 leading-relaxed select-text" dir="ltr">
          {pingLog.map((line, idx) => (
            <div key={idx} className="flex items-start gap-1.5">
              <span className="text-slate-600 shrink-0">&gt;</span>
              <span className={line.includes('❌') ? 'text-rose-400' : line.includes('✅') ? 'text-emerald-300 font-bold' : 'text-slate-300'}>
                {line}
              </span>
            </div>
          ))}
          {isRunning && (
            <div className="flex items-center gap-2 text-amber-400 animate-pulse">
              <span>Testing packets handshake...</span>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={runDiagnostic}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>إعادة فحص البينغ</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
