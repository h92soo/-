import React, { useState } from 'react';
import {
  ShieldCheck,
  Key,
  Copy,
  Check,
  Clock,
  Sparkles,
  Phone,
  MessageCircle,
  X,
  AlertTriangle,
  Laptop,
  CheckCircle2,
  Lock,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react';
import { licenseService } from '../services/licenseService';
import { LicenseStatus, OrganizationSettings } from '../types';
import { toast } from './ToastNotification';
import { GovernmentEmblem } from './GovernmentEmblem';

interface LicenseActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: LicenseStatus | null;
  organization: OrganizationSettings;
  onOpenGenerator: () => void;
  onActivated?: () => void;
}

export const LicenseActivationModal: React.FC<LicenseActivationModalProps> = ({
  isOpen,
  onClose,
  status,
  organization,
  onOpenGenerator,
  onActivated,
}) => {
  const [inputKey, setInputKey] = useState<string>('');
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCopiedDevice, setIsCopiedDevice] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopyDeviceId = () => {
    if (!status?.deviceId) return;
    navigator.clipboard.writeText(status.deviceId);
    setIsCopiedDevice(true);
    toast.success('تم نسخ معرّف الجهاز إلى الحافظة');
    setTimeout(() => setIsCopiedDevice(false), 2500);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) {
      setErrorMessage('يرجى إدخال كود التفعيل');
      return;
    }

    setErrorMessage('');
    setIsActivating(true);

    try {
      const result = await licenseService.activateKey(inputKey.trim(), organization.ministryName);
      if (result.success) {
        toast.success(result.message);
        setInputKey('');
        onActivated?.();
        onClose();
      } else {
        setErrorMessage(result.message);
        toast.error(result.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ أثناء التحقق من كود التفعيل');
      toast.error('فشل التفعيل');
    } finally {
      setIsActivating(false);
    }
  };

  const whatsAppMessage = encodeURIComponent(
    `السلام عليكم ورحمة الله،\nأود شراء كود تفعيل رسمي لمنظومة المنهج الرقمي للإدارة الحكومية.\n\nالدائرة: ${organization.ministryName || 'جهة حكومية'}\nمعرّف جهازي: ${status?.deviceId || 'جهاز مكتبي'}\n\nيرجى تزويدي بالأسعار وطرق الدفع المعتمدة.`
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                حالة الترخيص وتفعيل النسخة
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                إدارة ترخيص المنظومة، شراء الأكواد، وإدخال مفتاح التفعيل
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* 1. Current License Status Card */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              status?.isLifetime
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : status?.isTrial
                ? status.isExpired
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  status?.isLifetime
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : status?.isTrial
                    ? status.isExpired
                      ? 'bg-rose-500/20 text-rose-600'
                      : 'bg-amber-500/20 text-amber-600'
                    : 'bg-blue-500/20 text-blue-600'
                }`}
              >
                {status?.isLifetime ? (
                  <Sparkles className="w-6 h-6" />
                ) : status?.isTrial ? (
                  status.isExpired ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <Clock className="w-6 h-6" />
                  )
                ) : (
                  <CheckCircle2 className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="text-xs font-semibold opacity-75">الحالة الحالية للنسخة:</div>
                <div className="text-base font-black">
                  {status?.isLifetime
                    ? 'مرخص رسمياً دائم مدى الحياة (Lifetime)'
                    : status?.isTrial
                    ? status.isExpired
                      ? 'انتهت الفترة التجريبية للنظام'
                      : `فترة تجريبية مجانية (متبقي ${status.trialDaysRemaining} يوماً)`
                    : `اشتراك سنوي نشط (متبقي ${status?.daysRemaining} يوماً)`}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  {status?.isLifetime
                    ? 'كافة مزايا المنظومة مفعلة بشكل دائم بدون أي قيود زمنية.'
                    : status?.isTrial
                    ? status.isExpired
                      ? 'يرجى شراء وإدخال كود التفعيل لمتابعة استخدام المنظومة.'
                      : `مدة التجربة الكلية ${status.trialDaysTotal} يوماً، يمكنك التفعيل في أي وقت.`
                    : `تاريخ انتهاء الاشتراك: ${new Date(status?.expiresAt || '').toLocaleDateString('ar-IQ')}`}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Device Fingerprint (Machine ID) Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-amber-500" />
                معرّف الجهاز (Machine ID):
              </span>
              <span className="text-[10px] text-slate-400">خاص بهذا الحاسوب فقط</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-black text-xs text-slate-900 dark:text-white tracking-wider text-center select-all">
                {status?.deviceId || 'جاري استخراج المعرف...'}
              </div>
              <button
                type="button"
                onClick={handleCopyDeviceId}
                className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="نسخ معرف الجهاز لإرساله للبائع"
              >
                {isCopiedDevice ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopiedDevice ? 'تم' : 'نسخ'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              قم بنسخ هذا المعرّف وإرساله للمطور أو المبيعات عبر واتساب لتوليد كود تفعيل مخصص لحاسوبك.
            </p>
          </div>

          {/* 3. Activation Code Input Form */}
          <form onSubmit={handleActivate} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                إدخال كود التفعيل المعتمد (Serial / Activation Key)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                  placeholder="مثال: MANHAJ-LIFE-XXXX-XXXX-XXXX"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm tracking-wider uppercase text-center focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
              {errorMessage && (
                <p className="text-xs text-rose-500 mt-1.5 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMessage}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isActivating}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-50"
            >
              <Key className="w-4 h-4" />
              <span>{isActivating ? 'جاري التحقق والتفعيل...' : 'تفعيل المنظومة الآن ⚡'}</span>
            </button>
          </form>

          {/* 4. Contact Seller / Purchase Assistance Buttons */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block text-center">
              لشراء كود تفعيل جديد أو تمديد الاشتراك:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href={`https://wa.me/${status?.sellerContactWhatsApp?.replace(/[^0-9]/g, '') || ''}?text=${whatsAppMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>شراء وتواصل عبر واتساب</span>
              </a>

              <a
                href={`tel:${status?.sellerContactPhone || ''}`}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 transition-colors"
              >
                <Phone className="w-4 h-4 text-amber-500" />
                <span>اتصال هاتفي بالمبيعات</span>
              </a>
            </div>
          </div>

          {/* 5. Secret Developer / Seller Access */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenGenerator();
              }}
              className="text-[11px] text-slate-400 hover:text-amber-500 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <Lock className="w-3 h-3" />
              <span>لوحة المطور والمالك لتوليد المفاتيح (محمي برمز)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
