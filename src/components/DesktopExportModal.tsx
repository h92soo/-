import React, { useState } from 'react';
import {
  Monitor,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  HelpCircle,
  X,
  FileCode,
  Terminal,
  FolderDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';

interface DesktopExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopExportModal: React.FC<DesktopExportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'direct_pwa' | 'electron_exe' | 'offline_bundle'>('direct_pwa');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const appUrl = window.location.origin;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleDownloadOfflineZip = () => {
    // إنشاء ملف تعليمات وسكربت تشغيل محلي فوري ينشئ اختصار سطح المكتب ويشغل التطبيق
    const batScriptContent = `@echo off
chcp 65001 > nul
title المنهج الرقمي للإدارة الحكومية - تشغيل تطبيق سطح المكتب
color 0b

echo ===============================================================================
echo            الجمهورية العراقية - المنظومة الإدارية الموحدة
echo            المنهج الرقمي للإدارة الحكومية - إصدار حواسيب سطح المكتب 2026
echo ===============================================================================
echo.
echo  [1/2] جاري إنشاء اختصار رسمي على سطح مكتب حاسوبك (Desktop Shortcut)...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [System.Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, 'المنهج الرقمي للإدارة الحكومية.lnk')); $s.TargetPath = 'msedge.exe'; $s.Arguments = '--app=${appUrl} --window-size=1400,900'; $s.Description = 'المنهج الرقمي للإدارة الحكومية'; $s.Save()" > nul 2>&1

echo  [+] تم إنشاء اختصار سطح المكتب بنجاح!
echo.
echo  [2/2] جاري إطلاق التطبيق كنافذة سطح مكتب مستقلة...

start msedge.exe --app="${appUrl}" --window-size=1400,900
if %ERRORLEVEL% NEQ 0 (
  start chrome.exe --app="${appUrl}" --window-size=1400,900
)
if %ERRORLEVEL% NEQ 0 (
  start "" "${appUrl}"
)

echo.
echo  [✓] يعمل التطبيق الآن كنافذة مستقلة بدون متصفح.
echo  [★] البيانات تُحفظ محلياً داخل قاعدة بيانات جهازك (IndexedDB).
timeout /t 4 > nul
exit
`;
    const blob = new Blob([batScriptContent], { type: 'application/x-bat;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'تشغيل_تطبيق_سطح_المكتب.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col text-slate-900 dark:text-slate-100"
          dir="rtl"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>تحويل إلى تطبيق سطح مكتب (Desktop Windows .exe)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-bold">
                    جاهز 100%
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  تشغيل المنظومة كنافذة مستقلة بدون متصفح على أجهزة Windows مع حفظ البيانات محلياً
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 px-5 pt-3 gap-2 bg-slate-50/40 dark:bg-slate-800/20 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('direct_pwa')}
              className={`pb-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'direct_pwa'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1. التثبيت الفوري (موصى به - بنقرة واحدة)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('offline_bundle')}
              className={`pb-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'offline_bundle'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>2. ملف تشغيل مباشر (.bat)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('electron_exe')}
              className={`pb-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'electron_exe'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>3. حزمة Electron / Nativefier (.exe)</span>
            </button>
          </div>

          {/* Content Body */}
          <div className="p-5 space-y-4 overflow-y-auto text-xs leading-relaxed">
            {activeTab === 'direct_pwa' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="font-bold flex items-center gap-2 text-sm">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>تثبيت البرنامج كتطبيق سطح مكتب رسمي (PWA Standalone Window):</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    هذه هي الطريقة القياسية والأسرع المعتمدة من Microsoft و Google، حيث يتم إنشاء أيقونة رسمية على شاشة سطح المكتب وقائمة Start، ويعمل البرنامج في نافذة مستقلة منفصلة تماماً عن المتصفح بدون شريط عناوين.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/70 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      1
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">من متصفح Microsoft Edge أو Google Chrome:</div>
                      <div className="text-slate-600 dark:text-slate-400 mt-1">
                        انقر على أيقونة التثبيت <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[11px]">Install app (تثبيت التطبيق)</span> في أقصى يمين شريط العنوان أو من قائمة النقاط الثلاث <code className="text-amber-600 font-bold">App &gt; Install this site as an app</code>.
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/70 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      2
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">تأكيد التثبيت وإنشاء اختصار سطح المكتب:</div>
                      <div className="text-slate-600 dark:text-slate-400 mt-1">
                        اختر اسم التطبيق: <strong className="text-slate-900 dark:text-white">المنهج الرقمي للإدارة الحكومية</strong>، وضع علامة صح على <span className="font-semibold">"إنشاء اختصار على سطح المكتب"</span> و <span className="font-semibold">"تثبيت في شريط المهام (Pin to taskbar)"</span>.
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/70 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      3
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">التشغيل المباشر:</div>
                      <div className="text-slate-600 dark:text-slate-400 mt-1">
                        سيفتح البرنامج كنافذة سطح مكتب فاخرة تشبه برامج Windows الأصلية تماماً وستبقى بيانات الموظفين محفوظة محلياً في قاعدة بيانات الجهاز.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'offline_bundle' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 space-y-2">
                  <div className="font-bold flex items-center gap-2 text-sm">
                    <Monitor className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>إنشاء مشغل سطح مكتب مباشر (Direct Launcher .bat):</span>
                  </div>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300">
                    يمكنك بنقرة واحدة تنزيل ملف تشغيل تنفيذي خفيف يُوضع على سطح المكتب بحاسوبك، وعند النقر المزدوج عليه يفتح المنظومة فوراً في وضع التطبيق المستقل (Standalone App Window) بدون شريط متصفح أو تبويبات.
                  </p>
                </div>

                <div className="text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                  <Monitor className="w-10 h-10 text-amber-500 mx-auto" />
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    تنزيل مشغل سطح المكتب لحواسيب ويندوز
                  </div>
                  <p className="text-slate-500 text-[11px] max-w-md mx-auto">
                    احفظ الملف على سطح المكتب وقم بتشغيله بنقرة واحدة لفتح واجهة المنظومة كبرنامج مكتبي مستقل.
                  </p>

                  <button
                    type="button"
                    onClick={handleDownloadOfflineZip}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold shadow-md shadow-amber-500/20 inline-flex items-center gap-2 transition-all cursor-pointer text-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>تنزيل ملف المشغل (تشغيل_تطبيق_سطح_المكتب.bat)</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-slate-800 dark:text-slate-200 space-y-1.5">
                  <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>حل مشكلة الشاشة البيضاء عند تحميل ملف ZIP:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                    عند فك ضغط ملف ZIP على جهاز الكمبيوتر، تجنب فتح <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">index.html</code> مباشرة بالمتصفح لأن أنظمة الأمان تمنع تشغيله وتظهر شاشة بيضاء. بدلاً من ذلك، انقر نقراً مزدوجاً على ملف <strong className="text-amber-600 dark:text-amber-400">تشغيل_تطبيق_سطح_المكتب.bat</strong> أو <strong className="text-amber-600 dark:text-amber-400">START_HERE_ابدأ_هنا.html</strong> المرفقين في المجلد، وسيتم إنشاء اختصار رسمي على سطح المكتب وتشغيل التطبيق كنافذة ويندوز مستقلة بدون شاشة بيضاء.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'electron_exe' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-200 space-y-2">
                  <div className="font-bold flex items-center gap-2 text-sm">
                    <Cpu className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>تحزيم التطبيق إلى ملف تنفيذي (.exe) عبر Nativefier / Electron:</span>
                  </div>
                  <p className="text-[11px] text-purple-800 dark:text-purple-300">
                    إذا كنت تريد ملف <code className="font-mono font-bold">.exe</code> مستقل تماماً للتثبيت في دوائر الدولة بدون حاجة لمتصفح:
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">أمر التوليد الفوري عبر Nativefier (سطر واحد في موجه الأوامر CMD):</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(`npx nativefier "${appUrl}" --name "المنهج الرقمي للإدارة الحكومية" --platform "windows" --arch "x64" --single-instance`, 'cmd1')}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer hover:bg-slate-100"
                      >
                        {copiedCode === 'cmd1' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode === 'cmd1' ? 'تم النسخ' : 'نسخ الأمر'}</span>
                      </button>
                    </div>

                    <pre className="p-3 rounded-xl bg-slate-900 text-amber-400 font-mono text-[11px] overflow-x-auto text-left" dir="ltr">
{`npx nativefier "${appUrl}" --name "المنهج الرقمي للإدارة الحكومية" --platform "windows" --arch "x64" --single-instance`}
                    </pre>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      * افتح موجه الأوامر (Command Prompt / PowerShell) على جهاز الحاسوب والصق هذا الأمر، وسيتم توليد مجلد يحتوي على ملف <code className="font-mono text-emerald-600 font-bold">.exe</code> قابل للنقل على فلاش ميموري وتشغيله فوراً.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs">
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">
              المنهج الرقمي للإدارة الحكومية © 2026 — المهندس حسين عبد المنذر
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold transition-colors cursor-pointer"
            >
              إغلاق النافذة
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
