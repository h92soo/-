import React, { useState } from 'react';
import {
  Lock,
  Key,
  Laptop,
  Copy,
  Check,
  MessageCircle,
  Phone,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { GovernmentEmblem } from './GovernmentEmblem';
import { LicenseStatus, OrganizationSettings } from '../types';
import { licenseService } from '../services/licenseService';
import { toast } from './ToastNotification';

interface LicenseLockScreenProps {
  status: LicenseStatus;
  organization: OrganizationSettings;
  onOpenGenerator: () => void;
  onActivated: () => void;
}

export const LicenseLockScreen: React.FC<LicenseLockScreenProps> = ({
  status,
  organization,
  onOpenGenerator,
  onActivated,
}) => {
  const [activationKey, setActivationKey] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isCopiedDevice, setIsCopiedDevice] = useState<boolean>(false);

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(status.deviceId);
    setIsCopiedDevice(true);
    toast.success('تم نسخ معرّف الجهاز إلى الحافظة');
    setTimeout(() => setIsCopiedDevice(false), 2500);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationKey.trim()) {
      setErrorMsg('يرجى إدخال كود التفعيل أولاً');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await licenseService.activateKey(activationKey.trim(), organization.ministryName);
      if (res.success) {
        toast.success(res.message);
        onActivated();
      } else {
        setErrorMsg(res.message);
        toast.error(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل التفعيل');
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsAppMessage = encodeURIComponent(
    `السلام عليكم ورحمة الله،\nانتهت الفترة التجريبية لمنظومة المنهج الرقمي للإدارة الحكومية، وأود شراء كود التفعيل الرسمي.\n\nالدائرة: ${organization.ministryName || 'جهة حكومية'}\nمعرّف جهازي: ${status.deviceId}\n\nيرجى تزويدي بالأسعار وطريقة استلام الكود.`
  );

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6 bg-slate-950 text-slate-100 overflow-y-auto"
      dir="rtl"
    >
      {/* Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-xl rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-2xl p-6 sm:p-8 space-y-6 text-center my-auto">
        {/* Iraqi Government Emblem & Title */}
        <div className="flex flex-col items-center">
          <GovernmentEmblem type="golden_eagle" className="w-16 h-16 sm:w-20 sm:h-20 mb-3 drop-shadow-md" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>انتهت الفترة التجريبية للمنظومة</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            المنهج الرقمي للإدارة الحكومية وشؤون الموظفين
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            لقد انتهت مدة التجربة المجانية الممنوحة لهذا الحاسوب ({status.trialDaysTotal} يوماً).
          </p>
        </div>

        {/* Safe Data Assurance Notice */}
        <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 flex items-start gap-3 text-right">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-slate-100">بياناتك وسجلاتك محفوظة بأمان 100%</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              كافة سجلات الموظفين، الحضور والغياب، والإجازات لا تزال محفوظة بالكامل داخل قاعدة البيانات المحلية. فور إدخال كود التفعيل سيتم استئناف العمل فوراً وبنفس السجلات بدون أي فقدان.
            </p>
          </div>
        </div>

        {/* Machine ID Box */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-right">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-amber-400" />
              معرّف جهازك (Machine ID):
            </span>
            <span className="text-[10px] text-slate-400">شاركه مع البائع لتوليد كود التفعيل</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 font-mono text-xs sm:text-sm font-black text-amber-300 text-center tracking-wider select-all">
              {status.deviceId}
            </div>
            <button
              type="button"
              onClick={handleCopyDeviceId}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isCopiedDevice ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{isCopiedDevice ? 'تم النسخ' : 'نسخ المعرف'}</span>
            </button>
          </div>
        </div>

        {/* Activation Key Input Form */}
        <form onSubmit={handleActivate} className="space-y-3 text-right">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              أدخل كود التفعيل للفتح الفوري (Serial / License Key):
            </label>
            <input
              type="text"
              required
              value={activationKey}
              onChange={(e) => setActivationKey(e.target.value.toUpperCase())}
              placeholder="مثال: MANHAJ-LIFE-XXXX-XXXX-XXXX"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border-2 border-amber-500/40 focus:border-amber-400 font-mono text-sm tracking-wider uppercase text-center text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-inner"
            />
            {errorMsg && (
              <p className="text-rose-400 text-xs font-bold mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <Key className="w-4 h-4" />
            <span>{isSubmitting ? 'جاري التحقق...' : 'تفعيل المنظومة الآن واستئناف العمل ⚡'}</span>
          </button>
        </form>

        {/* Purchase Contact Buttons */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 block">
            لشراء كود تفعيل فوري يرجى التواصل مع إدارة المبيعات:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href={`https://wa.me/${status.sellerContactWhatsApp?.replace(/[^0-9]/g, '') || ''}?text=${whatsAppMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>تواصل وشراء عبر واتساب</span>
            </a>

            <a
              href={`tel:${status.sellerContactPhone || ''}`}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <Phone className="w-4 h-4 text-amber-400" />
              <span>اتصال هاتفي بالمبيعات</span>
            </a>
          </div>
        </div>

        {/* Developer Portal Access */}
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={onOpenGenerator}
            className="text-[11px] text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
          >
            منطقة المالك والمطور لتوليد المفاتيح (محمي برمز)
          </button>
        </div>
      </div>
    </div>
  );
};
