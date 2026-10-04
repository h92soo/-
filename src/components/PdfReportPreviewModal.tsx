import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Printer,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Building2,
  FileText,
  Sparkles,
  Users,
  ShieldCheck,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AttendanceRecord, Employee, EmploymentTypeLabelsSettings } from '../types';
import { GovernmentEmblem } from './GovernmentEmblem';
import { getContractTypeLabel } from '../utils/contractTypeUtils';
import {
  getArabicDayOfWeek,
  getArabicStatusText,
  generateReportFilename,
  OFFICIAL_DESIGNER_CREDIT,
} from '../utils/reportExportUtils';

export interface PdfReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'movements' | 'employees' | 'absent' | 'leave';
  title?: string;
  subtitle?: string;
  departmentName?: string;
  selectedDate?: string;
  selectedMonth?: string;
  startDate?: string;
  endDate?: string;
  reportScope?: 'daily' | 'weekly' | 'monthly' | 'custom' | 'all';
  records?: AttendanceRecord[];
  employees?: Employee[];
  stats?: {
    total: number;
    present?: number;
    absent?: number;
    leave?: number;
    timePerm?: number;
    missions?: number;
    sickLeaves?: number;
    totalTimeHours?: number;
  };
  employmentLabels?: EmploymentTypeLabelsSettings;
  includeSignatures?: boolean;
  includeStatsSummary?: boolean;
  includeAttribution?: boolean;
}

export const PdfReportPreviewModal: React.FC<PdfReportPreviewModalProps> = ({
  isOpen,
  onClose,
  reportType,
  title,
  subtitle,
  departmentName = 'كافة التشكيلات والأقسام الإدارية',
  selectedDate = new Date().toISOString().slice(0, 10),
  selectedMonth = new Date().toISOString().slice(0, 7),
  startDate,
  endDate,
  reportScope = 'daily',
  records = [],
  employees = [],
  stats,
  employmentLabels,
  includeSignatures = true,
  includeStatsSummary = true,
  includeAttribution = true,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [exportProgressText, setExportProgressText] = useState<string | null>(null);
  const [showSignatures, setShowSignatures] = useState<boolean>(includeSignatures);
  const [showStats, setShowStats] = useState<boolean>(includeStatsSummary);
  const [showAttribution, setShowAttribution] = useState<boolean>(includeAttribution);

  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Title calculation
  const computedTitle =
    title ||
    (reportType === 'employees'
      ? 'كشف وسجل ملاك الموظفين الرسمي'
      : reportType === 'absent'
      ? `كشف الموظفين الغائبين الرسمي - ${selectedDate}`
      : reportScope === 'monthly'
      ? `تقرير حركات وموقف الدوام الشهري - شهر ${selectedMonth}`
      : reportScope === 'weekly'
      ? `تقرير حركات وموقف الدوام الأسبوعي - من ${selectedDate}`
      : reportScope === 'custom'
      ? `تقرير حركات الدوام المعتمد - من ${startDate || '—'} إلى ${endDate || '—'}`
      : `تقرير موقف الدوام والحركات اليومي - ${selectedDate}`);

  // Base scope subtitle
  const computedSubtitle =
    subtitle ||
    (reportType === 'employees'
      ? `بيانات الكوادر الوظيفية وتوزيع الأقسام وأرصدة الإجازات لسنة 2026`
      : reportScope === 'monthly'
      ? `كشف إحصائي وتحليلي لحركات الدوام خلال شهر ${selectedMonth}`
      : `الموقف اليومي لحركات الكوادر ليوم ${getArabicDayOfWeek(selectedDate)} الموافق ${selectedDate}`);

  // Calculate statistics if not provided
  const computedStats = stats || {
    total: reportType === 'employees' ? employees.length : records.length,
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    leave: records.filter((r) => r.status === 'leave').length,
    timePerm: records.filter((r) => r.status === 'time_permission').length,
    missions: records.filter((r) => r.status === 'mission').length,
  };

  // Direct fast PDF export without any external server (100% Client-side Offline)
  const handleQuickDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setIsExportingPdf(true);
    setExportProgressText('جاري التقاط صفحات التقرير بالخطوط العربية عالية الدقة...');

    try {
      const element = printAreaRef.current;

      // Small delay to ensure any render settles
      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(element, {
        scale: 2.2, // Crisp high-DPI output for printing
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: orientation === 'landscape' ? 1400 : 1000,
      });

      setExportProgressText('جاري تجميع وتنسيق وثيقة A4 PDF...');

      const imgData = canvas.toDataURL('image/jpeg', 0.96);
      const isLandscape = orientation === 'landscape';
      const pdf = new jsPDF(isLandscape ? 'l' : 'p', 'mm', 'a4');

      const pageWidth = isLandscape ? 297 : 210;
      const pageHeight = isLandscape ? 210 : 297;

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // First Page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Subsequent Pages if long document
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const cleanFilename = `${computedTitle.replace(/[\s/\\:*?"<>|]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(cleanFilename);

      setExportProgressText('تم تنزيل ملف الـ PDF بنجاح!');
      setTimeout(() => {
        setExportProgressText(null);
      }, 3500);
    } catch (err: any) {
      console.error('PDF export failed:', err);
      alert('تعذر إنشاء ملف الـ PDF: ' + (err?.message || 'خطأ غير متوقع'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Direct physical print handler
  const handlePrintDocument = () => {
    const originalTitle = document.title;
    document.title = computedTitle;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex flex-col bg-slate-950/80 backdrop-blur-md overflow-hidden text-slate-800 dark:text-slate-100">
      {/* 1. Modal Top Control Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 text-white flex flex-wrap items-center justify-between gap-3 shadow-lg no-print">
        {/* Title and Badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">
                معاينة وتصدير تقرير PDF الرسمي
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% أوفلاين بدون خادم
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {computedTitle} — التنسيق الحكومي القياسي المعتمد A4
            </p>
          </div>
        </div>

        {/* Middle Toolbar: Orientation & Zoom */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Orientation Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setOrientation('landscape')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                orientation === 'landscape'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              أفقي (عرضي)
            </button>
            <button
              type="button"
              onClick={() => setOrientation('portrait')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                orientation === 'portrait'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              عمودي (طولي)
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(50, z - 15))}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              title="تصغير المعاينة"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-12 text-center font-mono font-bold text-[11px] text-amber-400">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(160, z + 15))}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              title="تكبير المعاينة"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(100)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer text-[10px]"
              title="إعادة ضبط الحجم 100%"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Toggle Elements */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showSignatures}
                onChange={(e) => setShowSignatures(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-0 cursor-pointer"
              />
              <span>التواقيع</span>
            </label>
            <span className="text-slate-600">|</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showStats}
                onChange={(e) => setShowStats(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-0 cursor-pointer"
              />
              <span>الإحصائيات</span>
            </label>
          </div>
        </div>

        {/* Action Buttons: Save PDF, Print, Close */}
        <div className="flex items-center gap-2">
          {/* Quick Save PDF button */}
          <button
            type="button"
            id="pdf-quick-download-btn"
            onClick={handleQuickDownloadPdf}
            disabled={isExportingPdf}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
            title="حفظ وتنزيل التقرير بصيغة PDF فورياً ومباشرة على جهازك"
          >
            {isExportingPdf ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                <span>جاري الحفظ والتصدير...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>حفظ وتصدير PDF سريع</span>
              </>
            )}
          </button>

          {/* Physical Print button */}
          <button
            type="button"
            id="pdf-print-dialog-btn"
            onClick={handlePrintDocument}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="طباعة عبر نافذة المتصفح الرسمية A4"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة A4</span>
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-white border border-slate-700 hover:border-rose-700 flex items-center justify-center transition-colors cursor-pointer"
            title="إغلاق المعاينة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Toast Banner */}
      {exportProgressText && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-md animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 animate-bounce" />
          <span>{exportProgressText}</span>
        </div>
      )}

      {/* 2. Scrollable Document Stage Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start bg-slate-950/90 select-none">
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className="pb-16"
        >
          {/* A4 Sheet Container */}
          <div
            ref={printAreaRef}
            id="printable-official-document-canvas"
            dir="rtl"
            style={{
              width: orientation === 'landscape' ? '297mm' : '210mm',
              minHeight: orientation === 'landscape' ? '210mm' : '297mm',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              fontFamily:
                '"Segoe UI", Tahoma, system-ui, -apple-system, BlinkMacSystemFont, "Cairo", "Amiri", Arial, sans-serif',
            }}
            className="relative bg-white p-8 sm:p-10 shadow-2xl rounded-sm border border-slate-300 text-slate-900 mx-auto select-text"
          >
            {/* Watermark Emblem in Background */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.035] flex items-center justify-center overflow-hidden">
              <div className="w-[500px] h-[500px]">
                <GovernmentEmblem className="w-full h-full text-slate-900" />
              </div>
            </div>

            {/* Content Layer */}
            <div className="relative z-10 flex flex-col justify-between min-h-full space-y-5">
              {/* TOP SECTION: Ministerial Official Header */}
              <div>
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                  {/* Right: Ministerial Administration Details */}
                  <div className="text-right space-y-1 w-1/3">
                    <div className="text-xs font-black tracking-wide text-slate-950">
                      جمهورية العراق
                    </div>
                    <div className="text-xs font-black text-slate-900">
                      وزارة الموارد المائية
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 leading-tight">
                      المديرية العامة لتشغيل وصيانة حوض نهر دجلة
                    </div>
                    <div className="text-[10px] font-semibold text-slate-700">
                      شعبة إدارة الموارد البشرية والخدمة المدنية
                    </div>
                    <div className="text-[10px] font-bold text-amber-800">
                      السنة التشغيلية: 2026
                    </div>
                  </div>

                  {/* Center: Golden Emblem & Title */}
                  <div className="text-center flex flex-col items-center justify-center w-1/3">
                    <div className="w-16 h-16 mb-1 drop-shadow-xs">
                      <GovernmentEmblem className="w-full h-full" />
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 mb-0.5">
                      بِسْمِ اللَّـهِ الرَّحْمَـٰنِ الرَّحِيمِ
                    </div>
                    <h1 className="text-sm font-black text-slate-950 px-3 py-1 bg-slate-100 rounded-md border border-slate-300 shadow-2xs">
                      {computedTitle}
                    </h1>
                  </div>

                  {/* Left: Administrative Meta (Date, Code, Seq) */}
                  <div className="text-left space-y-1 w-1/3 font-mono text-[11px]">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="font-bold text-slate-700">التاريخ:</span>
                      <span className="font-bold text-slate-900">{selectedDate}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="font-bold text-slate-700">اليوم:</span>
                      <span className="font-bold text-slate-900">
                        {getArabicDayOfWeek(selectedDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="font-bold text-slate-700">الرقم المرجعي:</span>
                      <span className="font-bold text-slate-900">
                        IQ-MO-2026-{(records.length || employees.length) + 104}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="font-bold text-slate-700">التشكيل:</span>
                      <span className="font-bold text-slate-900 truncate max-w-[170px]" title={departmentName}>
                        {departmentName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subtitle Information Bar */}
                <div className="mt-3 py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-md flex items-center justify-between text-[11px] text-slate-800">
                  <div className="font-bold">
                    <span>📌 نطاق التوثيق: </span>
                    <span className="text-slate-950 font-semibold">{computedSubtitle}</span>
                  </div>
                  <div className="font-mono font-bold text-slate-700">
                    إجمالي السجلات: {reportType === 'employees' ? employees.length : records.length}
                  </div>
                </div>
              </div>

              {/* TABLE SECTION: High-Fidelity Official Data Table */}
              <div className="flex-1 my-2">
                {reportType === 'employees' ? (
                  /* Employees Roster Table */
                  <table className="w-full text-right border-collapse text-[10px] border border-slate-800">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold border-b border-slate-900 text-center">
                        <th className="p-2 border border-slate-700 w-8">ت</th>
                        <th className="p-2 border border-slate-700 w-24">الرقم الوظيفي</th>
                        <th className="p-2 border border-slate-700 text-right pr-3">
                          اسم الموظف الرباعي واللقب
                        </th>
                        <th className="p-2 border border-slate-700">القسم / التشكيل</th>
                        <th className="p-2 border border-slate-700">العنوان الوظيفي</th>
                        <th className="p-2 border border-slate-700">نوع الملاك</th>
                        <th className="p-2 border border-slate-700">تاريخ المباشرة</th>
                        <th className="p-2 border border-slate-700">الرصيد الكلي</th>
                        <th className="p-2 border border-slate-700">المستهلك</th>
                        <th className="p-2 border border-slate-700 bg-amber-950/40 text-amber-200">
                          المتبقي 2026
                        </th>
                        <th className="p-2 border border-slate-700">الهاتف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 text-slate-900">
                      {employees.map((emp, idx) => (
                        <tr
                          key={emp.id}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}
                        >
                          <td className="p-1.5 text-center font-mono font-bold border border-slate-300">
                            {idx + 1}
                          </td>
                          <td className="p-1.5 text-center font-mono font-bold border border-slate-300">
                            {emp.employeeNumber}
                          </td>
                          <td className="p-1.5 font-bold border border-slate-300 pr-3">
                            {emp.fullName}
                          </td>
                          <td className="p-1.5 border border-slate-300">
                            <div>{emp.department}</div>
                            {emp.division && (
                              <div className="text-[9px] text-slate-500">{emp.division}</div>
                            )}
                          </td>
                          <td className="p-1.5 border border-slate-300 font-medium">
                            {emp.jobTitle}
                          </td>
                          <td className="p-1.5 text-center border border-slate-300 whitespace-nowrap">
                            <span
                              className={
                                emp.contractType === 'permanent'
                                  ? 'font-bold text-emerald-800'
                                  : 'font-bold text-amber-800'
                              }
                            >
                              {getContractTypeLabel(emp.contractType, employmentLabels)}
                            </span>
                          </td>
                          <td className="p-1.5 text-center font-mono border border-slate-300">
                            {emp.hireDate || '—'}
                          </td>
                          <td className="p-1.5 text-center font-mono border border-slate-300">
                            {emp.annualBalanceLimit}
                          </td>
                          <td className="p-1.5 text-center font-mono border border-slate-300">
                            {emp.usedBalance}
                          </td>
                          <td className="p-1.5 text-center font-mono font-bold border border-slate-300 bg-amber-50">
                            {emp.remainingBalance} يوماً
                          </td>
                          <td className="p-1.5 text-center font-mono border border-slate-300" dir="ltr">
                            {emp.phone || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  /* Attendance & Movements Table */
                  <table className="w-full text-right border-collapse text-[10px] border border-slate-800">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold border-b border-slate-900 text-center">
                        <th className="p-2 border border-slate-700 w-8">ت</th>
                        <th className="p-2 border border-slate-700 w-24">الرقم الوظيفي</th>
                        <th className="p-2 border border-slate-700 text-right pr-3">
                          اسم الموظف الرباعي واللقب
                        </th>
                        <th className="p-2 border border-slate-700">نوع الملاك والتوظيف</th>
                        <th className="p-2 border border-slate-700">القسم / التشكيل</th>
                        <th className="p-2 border border-slate-700">نوع الحركة / الموقف</th>
                        <th className="p-2 border border-slate-700 w-16">اليوم</th>
                        <th className="p-2 border border-slate-700 w-20">التاريخ</th>
                        <th className="p-2 border border-slate-700">مدة الإذن الزمني</th>
                        <th className="p-2 border border-slate-700">السند الإداري / الملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 text-slate-900">
                      {records.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-slate-500 font-bold">
                            لا توجد حركات مسجلة لهذا النطاق المحدد.
                          </td>
                        </tr>
                      ) : (
                        records.map((r, idx) => {
                          const isAbsent = r.status === 'absent';
                          const isLeave = r.status === 'leave';
                          const isTime = r.status === 'time_permission';
                          const contractText = getContractTypeLabel(r.contractType, employmentLabels);

                          return (
                            <tr
                              key={r.id || idx}
                              className={
                                isAbsent
                                  ? 'bg-rose-50/70 font-semibold'
                                  : idx % 2 === 0
                                  ? 'bg-white'
                                  : 'bg-slate-50/80'
                              }
                            >
                              <td className="p-1.5 text-center font-mono font-bold border border-slate-300">
                                {idx + 1}
                              </td>
                              <td className="p-1.5 text-center font-mono font-bold border border-slate-300">
                                {r.employeeNumber || '—'}
                              </td>
                              <td className="p-1.5 font-bold border border-slate-300 pr-3">
                                {r.employeeName || (r as any).fullName || '—'}
                              </td>
                              <td className="p-1.5 text-center border border-slate-300">
                                <span
                                  className={
                                    r.contractType === 'permanent'
                                      ? 'text-emerald-800 font-bold'
                                      : 'text-amber-800 font-bold'
                                  }
                                >
                                  {contractText}
                                </span>
                              </td>
                              <td className="p-1.5 border border-slate-300 font-medium">
                                {r.department || '—'}
                              </td>
                              <td className="p-1.5 border border-slate-300">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-bold ${
                                    isAbsent
                                      ? 'text-rose-900 bg-rose-100 border border-rose-300'
                                      : isLeave
                                      ? 'text-blue-900 bg-blue-100 border border-blue-300'
                                      : isTime
                                      ? 'text-amber-900 bg-amber-100 border border-amber-300'
                                      : 'text-emerald-900'
                                  }`}
                                >
                                  {getArabicStatusText(r)}
                                </span>
                              </td>
                              <td className="p-1.5 text-center border border-slate-300 font-medium">
                                {getArabicDayOfWeek(r.date)}
                              </td>
                              <td className="p-1.5 text-center font-mono border border-slate-300">
                                {r.date}
                              </td>
                              <td className="p-1.5 text-center font-mono border border-slate-300">
                                {r.timePermissionMinutes
                                  ? `${r.timePermissionMinutes} دقيقة (${(
                                      r.timePermissionMinutes / 60
                                    ).toFixed(1)} س)`
                                  : '—'}
                              </td>
                              <td className="p-1.5 border border-slate-300 text-[9px] text-slate-700">
                                {[r.orderNumber ? `أمر: ${r.orderNumber}` : '', r.notes || '']
                                  .filter(Boolean)
                                  .join(' - ') || '—'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* STATISTICAL SUMMARY BLOCK */}
              {showStats && (
                <div className="p-3 bg-slate-50 rounded-md border border-slate-300 text-[10px] space-y-2">
                  <div className="font-black text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>📊 الخلاصة الإحصائية المعتمدة للموقف:</span>
                    <span className="font-mono text-slate-600">
                      إجمالي الكوادر المستهدفة: {computedStats.total} موظف
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-1.5 bg-emerald-50 rounded border border-emerald-200">
                      <div className="text-slate-600 font-medium">الحضور والالتزام:</div>
                      <div className="font-mono font-black text-emerald-800 text-xs">
                        {computedStats.present ?? '—'}
                      </div>
                    </div>
                    <div className="p-1.5 bg-rose-50 rounded border border-rose-200">
                      <div className="text-slate-600 font-medium">الغياب غير المبرر:</div>
                      <div className="font-mono font-black text-rose-800 text-xs">
                        {computedStats.absent ?? '—'}
                      </div>
                    </div>
                    <div className="p-1.5 bg-blue-50 rounded border border-blue-200">
                      <div className="text-slate-600 font-medium">الإجازات الرسمية:</div>
                      <div className="font-mono font-black text-blue-800 text-xs">
                        {computedStats.leave ?? '—'}
                      </div>
                    </div>
                    <div className="p-1.5 bg-amber-50 rounded border border-amber-200">
                      <div className="text-slate-600 font-medium">الزمنيات والإيفادات:</div>
                      <div className="font-mono font-black text-amber-800 text-xs">
                        {(computedStats.timePerm || 0) + (computedStats.missions || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SIGNATURES SECTION */}
              {showSignatures && (
                <div className="pt-3 border-t border-slate-400">
                  <div className="grid grid-cols-3 gap-6 text-center text-[10px] font-bold text-slate-900">
                    <div className="space-y-10">
                      <div>منظم التقرير (مسؤول البصمة والحركات)</div>
                      <div className="text-slate-500 font-normal">(التوقيع والختم الإداري)</div>
                    </div>
                    <div className="space-y-10">
                      <div>مسؤول شعبة إدارة الموارد البشرية</div>
                      <div className="text-slate-500 font-normal">(التوقيع والختم الرسمي)</div>
                    </div>
                    <div className="space-y-10">
                      <div>مصادقة السيد مدير الدائرة العام</div>
                      <div className="text-slate-500 font-normal">(التوقيع والمصادقة والختم)</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ATTRIBUTION FOOTER */}
              {showAttribution && (
                <div className="pt-2 text-center text-[9px] font-semibold text-slate-500 border-t border-slate-200">
                  {OFFICIAL_DESIGNER_CREDIT}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
