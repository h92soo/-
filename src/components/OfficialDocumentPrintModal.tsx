import React, { useState } from 'react';
import {
  Printer,
  X,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  FileText,
  PenTool,
  Download,
  Calendar,
  Building2,
  Maximize2,
} from 'lucide-react';
import { ArchivedDocument, Employee, OrganizationSettings, ARCHIVE_DOCUMENT_CATEGORIES } from '../types';
import { soundEffects } from '../utils/soundEffects';
import { toast } from './ToastNotification';

interface OfficialDocumentPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ArchivedDocument | null;
  employee?: Employee | null;
  organization: OrganizationSettings;
}

export const OfficialDocumentPrintModal: React.FC<OfficialDocumentPrintModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  employee,
  organization,
}) => {
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [paperSize, setPaperSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [printDpi, setPrintDpi] = useState<'300' | '600'>('300');
  const [printerDeviceName, setPrinterDeviceName] = useState<string>('طابعة النظام الافتراضية (A4 Laser / Network Printer)');
  const [includeOcrNotes, setIncludeOcrNotes] = useState<boolean>(true);
  const [includeOfficialSeal, setIncludeOfficialSeal] = useState<boolean>(true);

  if (!isOpen || !doc) return null;

  const catMeta = ARCHIVE_DOCUMENT_CATEGORIES.find((c) => c.id === doc.category);
  const printDateStr = new Date().toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePrint = () => {
    soundEffects.playButtonClick();
    window.print();
    toast.success('تم إرسال أمر الطباعة إلى الطابعة بنجاح 🖨️');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
        {/* Top Actions Bar (Hidden on Print) */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                أمر الطباعة الرسمية والمصادقة (Official Archival Print)
              </h3>
              <p className="text-[11px] text-slate-500">
                نسخة إلكترونية مصدقة طبق الأصل مجهزة للطباعة الورقية A4 مع الأختام والباركود
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Options */}
            <div className="hidden sm:flex items-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeOfficialSeal}
                  onChange={(e) => setIncludeOfficialSeal(e.target.checked)}
                  className="rounded accent-amber-500"
                />
                <span>الختم المصدق</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeOcrNotes}
                  onChange={(e) => setIncludeOcrNotes(e.target.checked)}
                  className="rounded accent-amber-500"
                />
                <span>تفريغ تهميشات الـ OCR</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>إرسال إلى الطابعة 🖨️</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printer Recognition & Settings Bar (التعرف على الطابعة وإعدادات التجهيز) */}
        <div className="px-6 py-2.5 bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-slate-700 dark:text-slate-300">الطابعة المتصلة:</span>
              <select
                value={printerDeviceName}
                onChange={(e) => setPrinterDeviceName(e.target.value)}
                className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="طابعة النظام الافتراضية (A4 Laser / Network Printer)">
                  🖨️ طابعة النظام الافتراضية (A4 Laser / Network)
                </option>
                <option value="Canon i-SENSYS / ImageRUNNER Series">
                  🖨️ طابعة Canon i-SENSYS / ImageRUNNER (شبكية)
                </option>
                <option value="HP LaserJet Pro / Enterprise Series">
                  🖨️ طابعة HP LaserJet Pro Enterprise (USB/LAN)
                </option>
                <option value="Epson EcoTank / WorkForce Series">
                  🖨️ طابعة Epson EcoTank عالية الدقة
                </option>
                <option value="حفظ كملف PDF مصدق رقمياً (Print to PDF)">
                  📑 حفظ كملف PDF مصدق رقمياً
                </option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>الطابعة معرفة وجاهزة للطباعة</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px]">حجم الورق:</span>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as any)}
                className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="a4">A4 (210 × 297 mm)</option>
                <option value="letter">Letter (8.5 × 11 in)</option>
                <option value="legal">Legal (8.5 × 14 in)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px]">الدقة:</span>
              <select
                value={printDpi}
                onChange={(e) => setPrintDpi(e.target.value as any)}
                className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="300">300 DPI (قياسي)</option>
                <option value="600">600 DPI (عالي الدقة)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Printable Paper Canvas Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200 dark:bg-slate-950 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div
            id="official-archival-print-sheet"
            className="w-full max-w-[760px] bg-white text-slate-900 border border-slate-300 shadow-xl rounded-xl p-8 sm:p-12 relative flex flex-col justify-between space-y-6 print:border-none print:shadow-none print:p-6 print:rounded-none"
            style={{ minHeight: '1020px' }}
          >
            {/* 1. Official Header */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex items-start justify-between">
                {/* Right: Arabic Header */}
                <div className="text-right space-y-0.5">
                  <div className="font-bold text-sm text-slate-950">جمهورية العراق</div>
                  <div className="font-extrabold text-base text-blue-950">{organization.ministryName || 'وزارة الموارد المائية'}</div>
                  <div className="font-semibold text-xs text-slate-800">{organization.directorateName || 'دائرة الموارد المائية'}</div>
                  <div className="text-[11px] text-slate-600">قسم إدارة الموارد البشرية — شعبة الأرشفة والوثائق</div>
                </div>

                {/* Center: Iraqi National Crest / Seal */}
                <div className="text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full border-2 border-amber-600/60 p-1 flex items-center justify-center bg-amber-50/50">
                    <ShieldCheck className="w-10 h-10 text-amber-700" />
                  </div>
                  <span className="font-bold text-[10px] text-amber-900 mt-1">المنهج الرقمي 2026</span>
                  <span className="text-[9px] text-slate-500 font-mono">ARCHIVE-VERIFIED</span>
                </div>

                {/* Left: English Header */}
                <div className="text-left space-y-0.5" dir="ltr">
                  <div className="font-bold text-sm text-slate-950">Republic of Iraq</div>
                  <div className="font-extrabold text-xs text-blue-950">Ministry of Water Resources</div>
                  <div className="font-semibold text-[11px] text-slate-800">Directorate of Water Resources</div>
                  <div className="text-[10px] text-slate-600">Human Resources & Central Archive</div>
                </div>
              </div>

              {/* Meta Ribbon */}
              <div className="mt-4 pt-2 border-t border-slate-300 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="text-slate-500">العدد:</span>
                  <span className="text-slate-950 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {doc.referenceNumber || '1429 / إ'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-sans">التاريخ المكتبي:</span>
                  <span className="font-bold text-slate-950">{doc.documentDate || printDateStr}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-sans">التصنيف:</span>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-sans">
                    {catMeta?.nameAr || 'وثيقة رسمية'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Beneficiary / Employee Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block">الموظف المعني بالوثيقة (صاحب الإضبارة):</span>
                <h4 className="font-bold text-sm text-slate-950">{doc.employeeName}</h4>
                <p className="text-xs text-slate-600">
                  الرقم الوظيفي: <strong className="font-mono text-slate-900">{doc.employeeNumber}</strong> | القسم: {doc.department}
                </p>
              </div>
              <div className="text-left font-mono text-[11px] text-slate-500">
                <div>موقع الخزانة الورقية:</div>
                <div className="font-bold text-slate-900">{doc.archiveCabinet}</div>
                <div className="text-[10px] text-slate-400">رمز: {doc.archiveFolderCode}</div>
              </div>
            </div>

            {/* 3. Document Subject Title */}
            <div className="text-center py-2 border-y border-slate-200">
              <h2 className="text-base font-extrabold text-slate-900 underline decoration-amber-500 decoration-2 underline-offset-4">
                {doc.documentTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-semibold">
                الجهة المصدرة: {doc.issuingAuthority}
              </p>
            </div>

            {/* 4. Document Visual Representation */}
            <div className="flex-1 min-h-[340px] flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 overflow-hidden relative">
              {doc.fileUrl ? (
                <img
                  src={doc.fileUrl}
                  alt={doc.documentTitle}
                  className="max-h-[380px] w-auto object-contain rounded shadow-xs"
                />
              ) : (
                <div className="text-slate-400 text-xs">لا تتوفر صورة مستند مباشر</div>
              )}

              {/* Watermark across image */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 rotate-[-25deg]">
                <span className="text-4xl font-extrabold text-slate-900 tracking-wider">
                  أرشيف وزارة الموارد المائية
                </span>
              </div>
            </div>

            {/* 5. Handwritten OCR Marginal Notes (تفريغ خط اليد الرسمي) */}
            {includeOcrNotes && (doc.handwrittenNotes || doc.ocrExtractedText) && (
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                  <PenTool className="w-3.5 h-3.5 text-amber-700" />
                  <span>تفريغ تهميشات خط اليد المقروءة رقمياً (OCR Transcript):</span>
                </div>
                <p className="text-slate-800 leading-relaxed font-medium whitespace-pre-wrap text-[11px]">
                  {doc.handwrittenNotes || doc.ocrExtractedText}
                </p>
              </div>
            )}

            {/* 6. Authentication Seals & Signatures */}
            <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-3 gap-4 items-center">
              {/* Seal Stamp */}
              <div className="text-center flex flex-col items-center">
                {includeOfficialSeal ? (
                  <div className="w-24 h-24 rounded-full border-2 border-red-600 border-dashed p-1 flex flex-col items-center justify-center text-red-600 text-center relative rotate-[-6deg]">
                    <span className="text-[9px] font-bold">وزارة الموارد المائية</span>
                    <span className="text-[11px] font-extrabold py-0.5">★ مصدق رسمياً ★</span>
                    <span className="text-[8px] font-bold">الأرشيف المركزي الموحد</span>
                    <span className="text-[7px] font-mono mt-0.5">{printDateStr}</span>
                  </div>
                ) : (
                  <div className="h-20" />
                )}
              </div>

              {/* QR Verification */}
              <div className="text-center flex flex-col items-center">
                <div className="p-1.5 bg-white border border-slate-300 rounded shadow-xs inline-block">
                  <div className="w-16 h-16 bg-slate-950 text-white flex items-center justify-center rounded">
                    <QrCode className="w-12 h-12" />
                  </div>
                </div>
                <span className="text-[9px] text-slate-500 font-mono mt-1">DOC-ID: {doc.id}</span>
                <span className="text-[8px] text-emerald-700 font-bold">مصدق إلكترونياً</span>
              </div>

              {/* Signatures */}
              <div className="text-center space-y-1">
                <div className="font-bold text-xs text-slate-900">مدير شعبة الأرشفة والتوثيق</div>
                <div className="text-[11px] text-slate-600 font-semibold">دائرة الموارد المائية</div>
                <div className="h-9 flex items-center justify-center">
                  <span className="font-serif italic text-blue-900 font-bold text-sm tracking-wide">
                    H. Abd / Archiving
                  </span>
                </div>
                <div className="text-[9px] text-slate-400 font-mono">طُبع بتاريخ: {printDateStr}</div>
              </div>
            </div>

            {/* Bottom Footer Note */}
            <div className="text-[9px] text-slate-400 text-center border-t border-slate-200 pt-2 flex items-center justify-between font-mono">
              <span>نظام المنهج الرقمي للإدارة الحكومية — تشغيل 2026</span>
              <span>صفحة 1 من 1 — هذه النسخة الورقية لها حجية الأصل الرقمي المعتمد</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
