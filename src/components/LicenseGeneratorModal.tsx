import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Copy,
  Check,
  Printer,
  Calendar,
  Laptop,
  User,
  Clock,
  RefreshCw,
  Sliders,
  X,
  Lock,
  Sparkles,
  Phone,
  MessageCircle,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Eye,
  Settings,
} from 'lucide-react';
import { licenseService } from '../services/licenseService';
import { LicenseConfig, LicenseStatus, GeneratedKeyRecord, OrganizationSettings } from '../types';
import { toast } from './ToastNotification';
import { GovernmentEmblem } from './GovernmentEmblem';

interface LicenseGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: OrganizationSettings;
  onLicenseChanged?: () => void;
}

export const LicenseGeneratorModal: React.FC<LicenseGeneratorModalProps> = ({
  isOpen,
  onClose,
  organization,
  onLicenseChanged,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [masterPin, setMasterPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Key Generation Form State
  const [licenseType, setLicenseType] = useState<'lifetime' | 'time_limited'>('time_limited');
  const [durationPreset, setDurationPreset] = useState<number>(365); // 365, 180, 90, 30, custom
  const [customDays, setCustomDays] = useState<number>(365);
  const [clientName, setClientName] = useState<string>('');
  const [boundDeviceId, setBoundDeviceId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Result State
  const [generatedKey, setGeneratedKey] = useState<string>('');
  const [lastGeneratedRecord, setLastGeneratedRecord] = useState<GeneratedKeyRecord | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Settings & Trial Config State
  const [activeTab, setActiveTab] = useState<'generator' | 'trial_settings' | 'history'>('generator');
  const [config, setConfig] = useState<LicenseConfig | null>(null);
  const [trialDaysInput, setTrialDaysInput] = useState<number>(15);
  const [sellerPhoneInput, setSellerPhoneInput] = useState<string>('');
  const [sellerWhatsAppInput, setSellerWhatsAppInput] = useState<string>('');
  const [sellerNewPinInput, setSellerNewPinInput] = useState<string>('');
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      licenseService.getConfig().then((c) => {
        setConfig(c);
        setTrialDaysInput(c.trialDays || 15);
        setSellerPhoneInput(c.sellerPhone || '+964 770 000 0000');
        setSellerWhatsAppInput(c.sellerWhatsApp || '+964 770 000 0000');
      });
      setCurrentDeviceId(licenseService.getDeviceId());
    } else {
      setIsAuthenticated(false);
      setMasterPin('');
      setPinError('');
      setGeneratedKey('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Master PIN Unlock
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    const valid = await licenseService.verifyMasterPin(masterPin);
    if (valid) {
      setIsAuthenticated(true);
      toast.success('تم تسجيل الدخول إلى لوحة المالك ومولد التراخيص بنجاح');
    } else {
      setPinError('رمز المشرف/المالك غير صحيح! (الافتراضي: SAsa12589)');
    }
  };

  // Generate Key
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveDays = licenseType === 'lifetime' ? undefined : (durationPreset === -1 ? customDays : durationPreset);

    const { key, record } = licenseService.generateLicenseKey({
      type: licenseType,
      durationDays: effectiveDays,
      boundDeviceId: boundDeviceId.trim() || undefined,
      clientName: clientName.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    await licenseService.recordGeneratedKey(record);
    setGeneratedKey(key);
    setLastGeneratedRecord(record);
    setIsCopied(false);

    // Refresh history
    const c = await licenseService.getConfig();
    setConfig(c);

    toast.success('تم توليد كود التفعيل المشفر بنجاح');
  };

  // Copy Key
  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setIsCopied(true);
    toast.success('تم نسخ كود التفعيل إلى الحافظة');
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Save Trial & Contact Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await licenseService.updateSellerSettings({
      trialDays: Number(trialDaysInput) || 15,
      sellerPhone: sellerPhoneInput,
      sellerWhatsApp: sellerWhatsAppInput,
      ...(sellerNewPinInput.trim() ? { sellerMasterPin: sellerNewPinInput.trim() } : {}),
    });
    const c = await licenseService.getConfig();
    setConfig(c);
    setSellerNewPinInput('');
    toast.success('تم حفظ إعدادات البيع والأيام التجريبية بنجاح');
    onLicenseChanged?.();
  };

  // Reset Trial on Current Device
  const handleResetCurrentTrial = async () => {
    if (confirm('هل أنت متأكد من رغبتك بإعادة ضبط وتمديد الفترة التجريبية لهذا الحاسوب؟')) {
      await licenseService.resetTrial(Number(trialDaysInput) || 15);
      toast.success(`تمت إعادة ضبط الفترة التجريبية إلى (${trialDaysInput}) يوماً بنجاح.`);
      onLicenseChanged?.();
    }
  };

  // Print Official Certificate A4
  const handlePrintCertificate = () => {
    if (!lastGeneratedRecord) return;
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  لوحة المالك ومولّد أكواد التفعيل والبيع
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  خاص بالمطور والمالك
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                توليد مفاتيح الترخيص للزبائن، تخصيص الأيام التجريبية، وضبط بيانات البيع
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
        <div className="p-6">
          {!isAuthenticated ? (
            /* Master PIN Protection Screen */
            <div className="max-w-md mx-auto py-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  منطقة المالك المحمية برمز المشرف
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  هذه اللوحة مخصصة لمالك ومطور البرنامج فقط لتوليد وتصدير أكواد التفعيل وتحديد مدة الأيام التجريبية للزبائن.
                </p>
              </div>

              <form onSubmit={handleUnlock} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-right">
                    رمز المالك السري (Master PIN)
                  </label>
                  <input
                    type="password"
                    autoFocus
                    required
                    value={masterPin}
                    onChange={(e) => setMasterPin(e.target.value)}
                    placeholder="أدخل رمز المطور (الافتراضي: SAsa12589)"
                    className="w-full px-4 py-2.5 rounded-xl text-center text-sm font-mono tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {pinError && (
                    <p className="text-rose-500 text-xs mt-1.5 font-medium text-right flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{pinError}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>تأكيد والدخول للوحة</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Authenticated Portal Interface */
            <div className="space-y-5">
              {/* Segmented Top Navigation Tabs */}
              <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('generator')}
                  className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'generator'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Key className="w-4 h-4" />
                  <span>مولّد أكواد البيع ⚡</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('trial_settings')}
                  className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'trial_settings'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>ضبط الأيام التجريبية والبيع</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'history'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>سجل المفاتيح المصدرة ({config?.generatedKeysHistory.length || 0})</span>
                </button>
              </div>

              {/* TAB 1: KEY GENERATOR */}
              {activeTab === 'generator' && (
                <div className="space-y-5">
                  <form onSubmit={handleGenerateKey} className="space-y-4">
                    {/* License Type Selection */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                        1. نوع الترخيص وخطة البيع
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setLicenseType('time_limited')}
                          className={`p-3.5 rounded-2xl border text-right cursor-pointer transition-all ${
                            licenseType === 'time_limited'
                              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs">اشتراك زمني محدد (سنوي / شهري)</span>
                            <Clock className="w-4 h-4 text-amber-500" />
                          </div>
                          <p className="text-[11px] opacity-80">
                            صالح لعدد محدد من الأيام (30، 90، 180، 365 يوماً أو مخصص)، ينتهي تلقائياً بعد انقضاء المدة.
                          </p>
                        </div>

                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setLicenseType('lifetime')}
                          className={`p-3.5 rounded-2xl border text-right cursor-pointer transition-all ${
                            licenseType === 'lifetime'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs">شراء دائم مدى الحياة (Lifetime)</span>
                            <Sparkles className="w-4 h-4 text-emerald-500" />
                          </div>
                          <p className="text-[11px] opacity-80">
                            تفعيل دائم 100% غير محدد بوقت، لا ينتهي ولا يتطلب أي تجديد مستقبلي.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Duration Presets (if time_limited) */}
                    {licenseType === 'time_limited' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          2. مدة الترخيص
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {[
                            { label: 'سنة كاملة (365 يوم)', value: 365 },
                            { label: '6 أشهر (180 يوم)', value: 180 },
                            { label: '3 أشهر (90 يوم)', value: 90 },
                            { label: 'شهر واحد (30 يوم)', value: 30 },
                            { label: 'أيام مخصصة ✍️', value: -1 },
                          ].map((item) => (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => setDurationPreset(item.value)}
                              className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                durationPreset === item.value
                                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>

                        {durationPreset === -1 && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                              حدد عدد الأيام:
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={3650}
                              value={customDays}
                              onChange={(e) => setCustomDays(Number(e.target.value))}
                              className="w-32 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-mono text-center bg-white dark:bg-slate-800"
                            />
                            <span className="text-xs text-slate-500">يوماً من تاريخ التفعيل</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Machine Binding & Client Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          معرّف جهاز الزبون (Machine ID) — اختياري
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={boundDeviceId}
                            onChange={(e) => setBoundDeviceId(e.target.value)}
                            placeholder="مثال: IRQ-DEV-XXXX-YYYY (اتركه فارغاً لأي جهاز)"
                            className="w-full px-3 py-2 rounded-xl text-xs font-mono uppercase bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          إذا تم إدخال معرّف الجهاز، سيعمل هذا الكود على حاسوب الزبون المحدد فقط ولن يقبل التفعيل على جهاز آخر.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          اسم الجهة أو المشتري (Client Name) — اختياري
                        </label>
                        <input
                          type="text"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="مثال: دائرة صحة بغداد / الشركة العامة..."
                          className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          يُكتب في شهادة الترخيص الرسمية وفاتورة البيع للتوثيق.
                        </span>
                      </div>
                    </div>

                    {/* Generate Button */}
                    <button
                      type="submit"
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                    >
                      <Sparkles className="w-5 h-5 text-amber-200" />
                      <span>توليد كود التفعيل المشفر للبيع (Generate Serial Key)</span>
                    </button>
                  </form>

                  {/* Generated Key Result Banner */}
                  {generatedKey && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/80 space-y-3 animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          تم توليد كود التفعيل بنجاح:
                        </span>
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 font-mono">
                          {licenseType === 'lifetime' ? 'دائم مدى الحياة' : `${durationPreset === -1 ? customDays : durationPreset} يوم`}
                        </span>
                      </div>

                      {/* Display Key Field with Copy */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={generatedKey}
                          className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-amber-400/80 font-mono text-sm sm:text-base font-black text-slate-900 dark:text-white text-center tracking-wider select-all shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={handleCopyKey}
                          className={`px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                            isCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                          }`}
                        >
                          {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          <span>{isCopied ? 'تم النسخ' : 'نسخ الكود'}</span>
                        </button>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200 dark:border-amber-900/60 text-xs">
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                          {boundDeviceId ? `مربوط بالجهاز: ${boundDeviceId}` : 'يعمل على أي جهاز (استخدام واحد)'}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Send WhatsApp */}
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(
                              `كود تفعيل منظومة المنهج الرقمي للإدارة الحكومية:\nالترخيص: ${
                                licenseType === 'lifetime' ? 'دائم مدى الحياة' : `${durationPreset === -1 ? customDays : durationPreset} يوماً`
                              }\nالكود: ${generatedKey}\n\nيرجى فتح المنظومة والنقر على تفعيل وإدخال الكود أعلاه.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>إرسال عبر واتساب</span>
                          </a>

                          {/* Print Invoice/Certificate */}
                          <button
                            type="button"
                            onClick={handlePrintCertificate}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>طباعة شهادة الترخيص A4</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TRIAL PERIOD & SELLER SETTINGS */}
              {activeTab === 'trial_settings' && (
                <div className="space-y-5">
                  <form onSubmit={handleSaveSettings} className="space-y-4">
                    {/* Trial Days Config */}
                    <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                            مدة الفترة التجريبية الافتراضية (Trial Days)
                          </h4>
                          <p className="text-[11px] text-indigo-800 dark:text-indigo-300">
                            المدة التي يُمنح فيها المشتري/المستخدم تجربة المنظومة مجاناً قبل أن يقفل النظام ويطلب كود التفعيل للبيع.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={180}
                            value={trialDaysInput}
                            onChange={(e) => setTrialDaysInput(Number(e.target.value))}
                            className="w-24 px-3 py-2 rounded-xl text-center text-sm font-mono font-bold bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200"
                          />
                          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">يوماً</span>
                        </div>
                      </div>

                      {/* Quick Presets for Trial */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-indigo-200/60 dark:border-indigo-900/40">
                        <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold ml-1">
                          خيارات سريعة:
                        </span>
                        {[7, 14, 15, 30, 60].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setTrialDaysInput(d)}
                            className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100"
                          >
                            {d} يوم
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Seller Contact Info for Buyers */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        بيانات التواصل لشراء الأكواد (تظهر للزبائن عند انتهاء التجربة)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            رقم الهاتف المباشر
                          </label>
                          <input
                            type="text"
                            value={sellerPhoneInput}
                            onChange={(e) => setSellerPhoneInput(e.target.value)}
                            placeholder="مثال: +964 770 123 4567"
                            className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            رقم الواتساب للشراء الفوري
                          </label>
                          <input
                            type="text"
                            value={sellerWhatsAppInput}
                            onChange={(e) => setSellerWhatsAppInput(e.target.value)}
                            placeholder="مثال: +964 770 123 4567"
                            className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          تغيير رمز المشرف/المالك (PIN) — اختياري
                        </label>
                        <input
                          type="password"
                          value={sellerNewPinInput}
                          onChange={(e) => setSellerNewPinInput(e.target.value)}
                          placeholder="اتركه فارغاً للإبقاء على الرمز الحالي"
                          className="w-full max-w-xs px-3 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                      {/* Reset Trial for Current Device */}
                      <button
                        type="button"
                        onClick={handleResetCurrentTrial}
                        className="px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-amber-100"
                        title="تمديد أو إعادة بدء الفترة التجريبية لهذا الحاسوب"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>إعادة ضبط الفترة التجريبية للجهاز الحالي</span>
                      </button>

                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 cursor-pointer transition-all"
                      >
                        حفظ إعدادات البيع
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: GENERATED KEYS HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>قائمة بآخر المفاتيح المشفرة التي تم إنشاؤها عبر هذه اللوحة:</span>
                    <span>{config?.generatedKeysHistory.length || 0} مفتاح</span>
                  </div>

                  {(!config?.generatedKeysHistory || config.generatedKeysHistory.length === 0) ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      لم يتم إنشاء أي مفاتيح تفعيل بعد.
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                      {config.generatedKeysHistory.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {item.key}
                              </span>
                              <span
                                className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                  item.licenseType === 'lifetime'
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                }`}
                              >
                                {item.licenseType === 'lifetime' ? 'مدى الحياة' : `${item.durationDays} يوم`}
                              </span>
                              {item.isRedeemed && (
                                <span className="px-1.5 py-0.2 rounded-md text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                                  مفعل ومستخدم ✓
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2">
                              <span>بتاريخ: {new Date(item.generatedAt).toLocaleDateString('ar-IQ')}</span>
                              {item.clientName && <span>الزبون: {item.clientName}</span>}
                              {item.boundDeviceId && <span>مربوط بالجهاز: {item.boundDeviceId}</span>}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(item.key);
                              toast.success('تم نسخ الكود');
                            }}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 text-slate-700 dark:text-slate-200 cursor-pointer"
                            title="نسخ الكود"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Printable Official License Certificate (Only rendered on window.print) */}
        <div className="hidden print:block print:p-8 text-black bg-white text-right" dir="rtl">
          <div className="border-4 border-amber-600 p-8 rounded-3xl space-y-6">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-2xl font-black">جمهورية العراق</h1>
                <h2 className="text-lg font-bold">شهادة ترخيص وتفعيل نظام رسمي</h2>
                <p className="text-xs text-slate-600">المنهج الرقمي للإدارة الحكومية وشؤون الموظفين</p>
              </div>
              <GovernmentEmblem type="golden_eagle" className="w-20 h-20" />
            </div>

            <div className="space-y-3 py-4 text-sm leading-relaxed">
              <p>
                تشهد إدارة النظام والمطور المعتمد بأن النسخة الإلكترونية الخاصة بالسيد/الجهة:
              </p>
              <div className="p-3 bg-slate-100 rounded-xl font-bold text-base">
                {lastGeneratedRecord?.clientName || 'الجهة المشترية المعتمدة'}
              </div>
              <p>
                قد تم ترخيصها رسمياً بالبيانات الموثقة أدناه:
              </p>

              <table className="w-full border-collapse border border-slate-400 text-xs">
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold bg-slate-50 w-1/3">كود التفعيل المشفر:</td>
                    <td className="border border-slate-300 p-2 font-mono font-black text-sm">{lastGeneratedRecord?.key}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold bg-slate-50">نوع الترخيص:</td>
                    <td className="border border-slate-300 p-2 font-bold">
                      {lastGeneratedRecord?.licenseType === 'lifetime' ? 'ترخيص دائم مدى الحياة (Lifetime License)' : `اشتراك زمني لمدة (${lastGeneratedRecord?.durationDays}) يوماً`}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold bg-slate-50">تاريخ الإصدار:</td>
                    <td className="border border-slate-300 p-2">{new Date().toLocaleDateString('ar-IQ')}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold bg-slate-50">تقييد الجهاز:</td>
                    <td className="border border-slate-300 p-2">{lastGeneratedRecord?.boundDeviceId || 'ترخيص حر لجهاز واحد'}</td>
                  </tr>
                </tbody>
              </table>

              <div className="pt-4 text-xs text-slate-500">
                ملاحظة: هذا الكود مشفر وغير قابل للتزوير. لحفظ حقوق الملكية الفكرية، يرجى إدخال الكود داخل البرنامج لتأكيد الترخيص.
              </div>
            </div>

            <div className="flex justify-between items-center pt-8 border-t border-slate-300">
              <div className="text-center">
                <p className="font-bold text-xs">الختم والتوقيع الرسمي للمطور</p>
                <div className="w-32 h-16 border-b border-dashed border-slate-400 mt-2" />
              </div>
              <div className="text-left text-xs font-mono">
                ID: {lastGeneratedRecord?.id}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
