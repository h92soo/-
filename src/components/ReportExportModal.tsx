import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  CheckSquare,
  Square,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  Eye,
} from 'lucide-react';
import {
  ReportExportOptions,
  exportMovementsToExcel,
  exportComprehensiveExcel,
  triggerOfficialPrint,
  generateReportFilename,
  OFFICIAL_DESIGNER_CREDIT,
} from '../utils/reportExportUtils';
import { AttendanceRecord, Employee, EmploymentTypeLabelsSettings } from '../types';
import { getAllEmployees } from '../db/indexedDB';
import { PdfReportPreviewModal } from './PdfReportPreviewModal';

export interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: AttendanceRecord[];
  employees?: Employee[];
  reportScope: 'daily' | 'weekly' | 'monthly' | 'custom';
  selectedDate: string;
  selectedMonth: string;
  startDate?: string;
  endDate?: string;
  departmentName: string;
  employmentLabels?: EmploymentTypeLabelsSettings;
  stats?: {
    total: number;
    present: number;
    absent: number;
    leave: number;
    timePerm: number;
    totalTimeHours?: number;
    sickLeaves?: number;
    missions?: number;
  };
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  isOpen,
  onClose,
  records,
  employees,
  reportScope: initialScope,
  selectedDate: initialDate,
  selectedMonth: initialMonth,
  startDate: initialStart,
  endDate: initialEnd,
  departmentName,
  employmentLabels,
  stats,
}) => {
  const [activeScope, setActiveScope] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>(initialScope || 'daily');
  const [scopeDate, setScopeDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [scopeMonth, setScopeMonth] = useState(initialMonth || new Date().toISOString().slice(0, 7));
  const [scopeStartDate, setScopeStartDate] = useState(initialStart || initialDate || '2026-09-01');
  const [scopeEndDate, setScopeEndDate] = useState(initialEnd || initialDate || '2026-09-30');

  const [exportFormat, setExportFormat] = useState<'comprehensive_xlsx' | 'xlsx' | 'pdf'>('comprehensive_xlsx');
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [includeStatsSummary, setIncludeStatsSummary] = useState(true);
  const [includeAttribution, setIncludeAttribution] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportSuccessNotice, setExportSuccessNotice] = useState<string | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  // Filter records based on selected export scope in the modal
  const exportFilteredRecords = React.useMemo(() => {
    return records.filter((r) => {
      if (activeScope === 'daily') {
        return r.date === scopeDate;
      }
      if (activeScope === 'weekly') {
        const start = new Date(scopeDate);
        const cur = new Date(r.date);
        const diff = (cur.getTime() - start.getTime()) / (1000 * 3600 * 24);
        return diff >= 0 && diff <= 6;
      }
      if (activeScope === 'monthly') {
        return r.date.startsWith(scopeMonth);
      }
      if (activeScope === 'custom') {
        return r.date >= scopeStartDate && r.date <= scopeEndDate;
      }
      return true;
    });
  }, [records, activeScope, scopeDate, scopeMonth, scopeStartDate, scopeEndDate]);

  // Recalculate statistics for exported subset
  const exportStats = React.useMemo(() => {
    const present = exportFilteredRecords.filter((r) => r.status === 'present').length;
    const absent = exportFilteredRecords.filter((r) => r.status === 'absent').length;
    const leave = exportFilteredRecords.filter((r) => r.status === 'leave').length;
    const timePerm = exportFilteredRecords.filter((r) => r.status === 'time_permission').length;
    const missions = exportFilteredRecords.filter((r) => r.status === 'mission').length;
    const sickLeaves = exportFilteredRecords.filter((r) => r.status === 'leave' && r.leaveType === 'sick').length;
    const totalTimeHours = Math.round(
      exportFilteredRecords.reduce((acc, curr) => acc + (curr.timePermissionMinutes || 0), 0) / 60
    );

    return {
      total: exportFilteredRecords.length,
      present,
      absent,
      leave,
      timePerm,
      missions,
      sickLeaves,
      totalTimeHours,
    };
  }, [exportFilteredRecords]);

  if (!isOpen) return null;

  const exportOptions: ReportExportOptions = {
    reportTitle:
      activeScope === 'monthly'
        ? `تقرير حركات وموقف الدوام الشهري - شهر ${scopeMonth}`
        : activeScope === 'weekly'
        ? `تقرير حركات وموقف الدوام الأسبوعي - من ${scopeDate}`
        : activeScope === 'custom'
        ? `تقرير حركات وموقف الدوام المعتمد - من ${scopeStartDate} إلى ${scopeEndDate}`
        : `تقرير حركات موقف الدوام اليومي - ${scopeDate}`,
    reportScope: activeScope,
    selectedDate: scopeDate,
    selectedMonth: scopeMonth,
    startDate: scopeStartDate,
    endDate: scopeEndDate,
    departmentName,
    employmentLabels,
    stats: exportStats,
    includeSignatures,
    includeStatsSummary,
    includeAttribution,
  };

  const filenamePreview =
    exportFormat === 'comprehensive_xlsx'
      ? `المصنف_الشامل_الموظفين_والحركات_${(exportOptions.departmentName || 'كافة_الأقسام').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
      : generateReportFilename(exportOptions, exportFormat === 'pdf' ? 'pdf' : 'xlsx');

  const handleExecuteExport = async () => {
    setIsProcessing(true);
    setExportSuccessNotice(null);

    try {
      if (exportFormat === 'comprehensive_xlsx') {
        let emps = employees;
        if (!emps || emps.length === 0) {
          emps = await getAllEmployees();
        }
        const savedFile = exportComprehensiveExcel(emps, exportFilteredRecords, exportOptions);
        setExportSuccessNotice(`تم تصدير مصنف Excel الشامل (سجلات الموظفين + الحركات + الإحصائيات) بنجاح: ${savedFile}`);
      } else if (exportFormat === 'xlsx') {
        const savedFile = exportMovementsToExcel(exportFilteredRecords, exportOptions);
        setExportSuccessNotice(`تم تصدير ملف الإكسل بنجاح: ${savedFile}`);
      } else {
        triggerOfficialPrint(exportOptions);
        setExportSuccessNotice('تم إرسال التقرير إلى نافذة الطباعة / حفظ PDF بنجاح.');
      }
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء التصدير: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onClose();
        }
      }}
    >
      <div
        id="report-export-modal"
        className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                تصدير وطباعة تقارير الموقف الإداري
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                خيارات الحفظ بصيغة Excel المعتمدة أو الطباعة الرسمية A4
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {exportSuccessNotice && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportSuccessNotice}</span>
            </div>
          )}

          {/* Scope Selector: Daily / Weekly / Monthly / Custom Date Range */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                نطاق التقرير والمدة الزمنية:
              </label>
              <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                {exportFilteredRecords.length} حركة مطابقة
              </span>
            </div>

            {/* Scope Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveScope('daily')}
                className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeScope === 'daily'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                يومي
              </button>
              <button
                type="button"
                onClick={() => setActiveScope('weekly')}
                className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeScope === 'weekly'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                أسبوعي
              </button>
              <button
                type="button"
                onClick={() => setActiveScope('monthly')}
                className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeScope === 'monthly'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                شهري
              </button>
              <button
                type="button"
                onClick={() => setActiveScope('custom')}
                className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeScope === 'custom'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                محدد (من - إلى)
              </button>
            </div>

            {/* Specific Date inputs according to chosen scope */}
            {activeScope === 'daily' && (
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">تاريخ اليوم:</span>
                <input
                  type="date"
                  value={scopeDate}
                  onChange={(e) => setScopeDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold text-slate-800 dark:text-slate-200"
                />
              </div>
            )}

            {activeScope === 'weekly' && (
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">بداية الأسبوع:</span>
                <input
                  type="date"
                  value={scopeDate}
                  onChange={(e) => setScopeDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold text-slate-800 dark:text-slate-200"
                />
                <span className="text-[11px] text-slate-500">(لمدة 7 أيام متتالية)</span>
              </div>
            )}

            {activeScope === 'monthly' && (
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">الشهر المحدد:</span>
                <input
                  type="month"
                  value={scopeMonth}
                  onChange={(e) => setScopeMonth(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold text-slate-800 dark:text-slate-200"
                />
              </div>
            )}

            {activeScope === 'custom' && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">من تاريخ:</span>
                  <input
                    type="date"
                    value={scopeStartDate}
                    onChange={(e) => setScopeStartDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">إلى تاريخ:</span>
                  <input
                    type="date"
                    value={scopeEndDate}
                    onChange={(e) => setScopeEndDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Export Format Selector (Excel vs PDF) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              تنسيق ونوع التصدير المطلوب:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: Comprehensive Excel (.xlsx) */}
              <button
                type="button"
                id="export-format-comprehensive-btn"
                onClick={() => setExportFormat('comprehensive_xlsx')}
                className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col gap-2 ${
                  exportFormat === 'comprehensive_xlsx'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                    موصى به
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold">المصنف الشامل (.xlsx)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">سجلات الموظفين + الحركات + المؤشرات</div>
                </div>
              </button>

              {/* Option 2: Movements Excel (.xlsx) */}
              <button
                type="button"
                id="export-format-movements-xlsx-btn"
                onClick={() => setExportFormat('xlsx')}
                className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col gap-2 ${
                  exportFormat === 'xlsx'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold">
                    حركات فقط
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold">كشف الحركات (.xlsx)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">جدول الحركات والإجازات المحددة</div>
                </div>
              </button>

              {/* Option 3: Official Printable A4 PDF */}
              <button
                type="button"
                id="export-format-pdf-btn"
                onClick={() => setExportFormat('pdf')}
                className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col gap-2 ${
                  exportFormat === 'pdf'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 font-bold ring-2 ring-amber-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                    <Printer className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                    رسمي A4
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold">طباعة وحفظ PDF</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">وثيقة رسمية بالأختام والتواقيع</div>
                </div>
              </button>
            </div>
          </div>

          {/* Export Settings Checklist */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              عناصر الوثيقة المعتمدة:
            </div>

            {/* 1. Official Signatures */}
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>تضمين التوقيعات الثلاثية الرسمية (منظم التقرير / مسؤول البصمة، مسؤول شعبة الموارد البشرية، ومصادقة السيد مدير الدائرة)</span>
            </label>

            {/* 2. Statistical Summary */}
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeStatsSummary}
                onChange={(e) => setIncludeStatsSummary(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>تضمين ملخص الإحصائيات (أعداد الغياب غير المبرر، المجازين، والزمنيات ساعة وساعتين، والإيفادات)</span>
            </label>

            {/* 3. Attribution */}
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeAttribution}
                onChange={(e) => setIncludeAttribution(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>إسناد تصميم وإدارة المنظومة (المهندس حسين عبد المنذر)</span>
            </label>
          </div>

          {/* Generated Filename Preview */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              اسم الملف التلقائي المعتمد:
            </div>
            <div className="font-mono font-bold text-amber-800 dark:text-amber-300 text-[11px] truncate" dir="ltr">
              {filenamePreview}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
          >
            إلغاء
          </button>

          <div className="flex items-center gap-2">
            {exportFormat === 'pdf' && (
              <button
                type="button"
                id="modal-pdf-preview-trigger-btn"
                onClick={() => setIsPdfPreviewOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="فتح نافذة المعاينة التفاعلية لشكل وثيقة الـ PDF قبل الحفظ"
              >
                <Eye className="w-4 h-4 text-amber-500" />
                <span>معاينة وثيقة PDF</span>
              </button>
            )}

            <button
              type="button"
              id="execute-report-export-btn"
              onClick={handleExecuteExport}
              disabled={isProcessing}
              className={`px-5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                exportFormat === 'pdf'
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              {exportFormat === 'pdf' ? <Printer className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              <span>
                {isProcessing
                  ? 'جاري إعداد الملف...'
                  : exportFormat === 'comprehensive_xlsx'
                  ? 'تصدير المصنف الشامل Excel (.xlsx)'
                  : exportFormat === 'xlsx'
                  ? 'تصدير كشف الحركات Excel (.xlsx)'
                  : 'بدء الطباعة الرسمية / PDF'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive PDF Preview Modal */}
      {isPdfPreviewOpen && (
        <PdfReportPreviewModal
          isOpen={isPdfPreviewOpen}
          onClose={() => setIsPdfPreviewOpen(false)}
          reportType="movements"
          title={exportOptions.reportTitle}
          departmentName={departmentName}
          selectedDate={scopeDate}
          selectedMonth={scopeMonth}
          startDate={scopeStartDate}
          endDate={scopeEndDate}
          reportScope={activeScope}
          records={exportFilteredRecords}
          stats={exportStats}
          employmentLabels={employmentLabels}
          includeSignatures={includeSignatures}
          includeStatsSummary={includeStatsSummary}
          includeAttribution={includeAttribution}
        />
      )}
    </div>,
    document.body
  );
};
