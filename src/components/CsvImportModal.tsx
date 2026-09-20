import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  Download,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { Employee, ContractType } from '../types';
import { saveEmployeesBatch } from '../db/indexedDB';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (count: number) => void;
  existingEmployees: Employee[];
}

interface ParsedEmployeeRow {
  index: number;
  data?: Employee;
  raw: Record<string, string>;
  isValid: boolean;
  errors: string[];
}

export function CsvImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  existingEmployees,
}: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedEmployeeRow[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'errors'>('all');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Normalizing helper for CSV column headers
  const getFieldVal = (row: Record<string, string>, aliases: string[]): string => {
    for (const key of Object.keys(row)) {
      const cleanKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '');
      for (const alias of aliases) {
        const cleanAlias = alias.trim().toLowerCase().replace(/[\s_-]+/g, '');
        if (cleanKey === cleanAlias || cleanKey.includes(cleanAlias)) {
          const val = row[key];
          if (val !== undefined && val !== null) {
            return String(val).trim();
          }
        }
      }
    }
    return '';
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setParseError(null);
    setParsedRows([]);
    setIsParsing(true);

    Papa.parse<Record<string, string>>(selectedFile, {
      header: true,
      skipEmptyLines: 'greedy',
      encoding: 'UTF-8',
      complete: (results) => {
        setIsParsing(false);

        if (results.errors.length > 0 && results.data.length === 0) {
          setParseError(`الملف غير متوافق: ${results.errors[0]?.message || 'خطأ في بنية ملف CSV'}`);
          return;
        }

        if (results.data.length === 0) {
          setParseError('الملف فارغ أو لا يحتوي على أي صفوف بيانات صالحة.');
          return;
        }

        // Process and validate rows
        const seenNumbersInFile = new Set<string>();
        const existingNumbers = new Set(existingEmployees.map((e) => e.employeeNumber.trim()));

        const evaluatedRows: ParsedEmployeeRow[] = results.data.map((row, idx) => {
          const rowErrors: string[] = [];

          const fullName = getFieldVal(row, ['الاسم الرباعي', 'الاسم', 'اسم الموظف', 'fullname', 'name']);
          const empNumRaw = getFieldVal(row, ['الرقم الوظيفي', 'رقم الموظف', 'كود الموظف', 'employeenumber', 'empnumber', 'code', 'id']);
          const department = getFieldVal(row, ['القسم', 'التشكيل', 'الدائرة', 'department', 'dept']);
          const division = getFieldVal(row, ['الشعبة', 'الوحدة', 'division', 'unit']) || 'الديوان العام';
          const jobTitle = getFieldVal(row, ['العنوان الوظيفي', 'الوظيفة', 'المسمى الوظيفي', 'jobtitle', 'title']) || 'موظف';
          const contractTypeRaw = getFieldVal(row, ['نوع الملاك', 'نوع التوظيف', 'الصفة', 'contracttype', 'type']);
          const hireDate = getFieldVal(row, ['تاريخ المباشرة', 'تاريخ التعيين', 'hiredate', 'date']) || '2026-01-01';
          const annualLimitRaw = getFieldVal(row, ['رصيد الإجازات', 'الرصيد السنوي', 'annualbalancelimit', 'limit', 'balance']);
          const usedBalanceRaw = getFieldVal(row, ['المستهلك', 'الرصيد المستهلك', 'usedbalance', 'used']);
          const phone = getFieldVal(row, ['الهاتف', 'رقم الهاتف', 'الموبايل', 'phone', 'mobile']) || '';
          const notes = getFieldVal(row, ['ملاحظات', 'notes', 'remarks']) || 'مستورد عبر ملف CSV';

          // Validate required fields
          if (!fullName) {
            rowErrors.push('الاسم الرباعي مفقود أو فارغ');
          }

          let employeeNumber = empNumRaw;
          if (!employeeNumber) {
            rowErrors.push('الرقم الوظيفي مفقود');
          } else {
            if (seenNumbersInFile.has(employeeNumber)) {
              rowErrors.push(`الرقم الوظيفي (${employeeNumber}) مكرر داخل هذا الملف`);
            } else {
              seenNumbersInFile.add(employeeNumber);
            }

            if (existingNumbers.has(employeeNumber)) {
              rowErrors.push(`الرقم الوظيفي (${employeeNumber}) مسجل مسبقاً في قاعدة البيانات`);
            }
          }

          if (!department) {
            rowErrors.push('القسم الإداري أو التشكيل مفقود');
          }

          // Determine contract type
          let contractType: ContractType = 'permanent';
          if (
            contractTypeRaw.includes('عقد') ||
            contractTypeRaw.toLowerCase().includes('contract') ||
            contractTypeRaw.includes('315')
          ) {
            contractType = 'contract';
          }

          const defaultLimit = contractType === 'permanent' ? 36 : 30;
          const defaultMonthly = contractType === 'permanent' ? 3 : 4;
          const isAccumulative = contractType === 'permanent';

          const annualBalanceLimit = Number(annualLimitRaw) > 0 ? Number(annualLimitRaw) : defaultLimit;
          const usedBalance = Number(usedBalanceRaw) >= 0 ? Number(usedBalanceRaw) : 0;
          const remainingBalance = Math.max(0, annualBalanceLimit - usedBalance);

          const isValid = rowErrors.length === 0;

          const employee: Employee | undefined = isValid
            ? {
                id: `EMP-${Date.now()}-${idx + 1}`,
                employeeNumber,
                fullName,
                department,
                division,
                jobTitle,
                contractType,
                hireDate,
                annualBalanceLimit,
                usedBalance,
                remainingBalance,
                monthlyRate: defaultMonthly,
                isAccumulative,
                phone,
                notes,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : undefined;

          return {
            index: idx + 1,
            data: employee,
            raw: row,
            isValid,
            errors: rowErrors,
          };
        });

        setParsedRows(evaluatedRows);
      },
      error: (err) => {
        setIsParsing(false);
        setParseError(`تعذر قراءة ملف CSV: ${err.message}`);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv') || droppedFile.type === 'text/csv') {
        handleFileSelect(droppedFile);
      } else {
        setParseError('يرجى اختيار ملف بصيغة CSV المتوافقة مع جداول الإكسل.');
      }
    }
  };

  // Download official CSV template
  const handleDownloadTemplate = () => {
    const csvContent =
      '\uFEFF' + // UTF-8 BOM so Excel opens Arabic correctly
      'الرقم الوظيفي,الاسم الرباعي,القسم,الشعبة,العنوان الوظيفي,نوع الملاك,تاريخ المباشرة,رصيد الإجازات السنوي,المستهلك,الهاتف,ملاحظات\n' +
      'IQ-GOV-98301,حسين علي رضا العبادي,قسم الموارد البشرية,شعبة الحضور,مدير شعبة,ملاك دائم,2020-04-01,36,2,07801112233,سجل رسمي\n' +
      'IQ-GOV-98302,فاطمة جاسم محمد الزبيدي,قسم الشؤون المالية,شعبة الحسابات,محاسب أقدم,عقد وزاري,2023-08-15,30,5,07704445566,قرار 315';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'قالب_استيراد_الموظفين_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Execute import of valid rows
  const handleConfirmImport = async () => {
    const validEmployees = parsedRows
      .filter((r) => r.isValid && r.data)
      .map((r) => r.data as Employee);

    if (validEmployees.length === 0) return;

    setIsSaving(true);
    try {
      const count = await saveEmployeesBatch(validEmployees);
      onImportSuccess(count);
      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'خطأ غير متوقع';
      setParseError(`فشل حفظ السجلات في قاعدة البيانات المحلية: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const errorRows = parsedRows.filter((r) => !r.isValid);

  const displayedRows =
    activeTab === 'valid'
      ? validRows
      : activeTab === 'errors'
      ? errorRows
      : parsedRows;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>استيراد سجلات الموظفين من ملف CSV / Excel</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-semibold">
                  تشغيل محلي دائم
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                قراءة ومعالجة الملف محلياً مع التحقق الصارم من صحة الحقول والأرقام الوظيفية
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Top Actions: Template Download & Drag Zone */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                هل ترغب بنموذج جاهز؟ حمل القالب الرسمي المتوافق مع الترميز العربي (UTF-8).
              </span>
            </div>
            <button
              type="button"
              id="download-template-csv-btn"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل قالب Excel CSV</span>
            </button>
          </div>

          {/* Upload Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-slate-300 dark:border-slate-700 hover:border-amber-500/60 bg-slate-50/50 dark:bg-slate-800/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 mb-3">
              <UploadCloud className="w-6 h-6 text-amber-500" />
            </div>

            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {file ? file.name : 'اسحب وأفلت ملف CSV هنا، أو انقر للاختيار'}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              يدعم ملفات CSV المصدرة من Microsoft Excel و Google Sheets (ترميز UTF-8)
            </p>
          </div>

          {/* Loading or Parse Errors */}
          {isParsing && (
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-blue-500" />
              <span>جارٍ فحص وتحليل بيانات الملف ومطابقة الأعمدة...</span>
            </div>
          )}

          {parseError && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold">خطأ في توافق الملف:</div>
                <div>{parseError}</div>
              </div>
            </div>
          )}

          {/* Evaluation Results & Summary */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              {/* Summary Badges & Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    إجمالي الصفوف: {parsedRows.length}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    صالحة: {validRows.length}
                  </span>
                  {errorRows.length > 0 && (
                    <>
                      <span className="text-slate-300">|</span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        تحتوي أخطاء: {errorRows.length}
                      </span>
                    </>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      activeTab === 'all'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    الكل ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('valid')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      activeTab === 'valid'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    الصالحة ({validRows.length})
                  </button>
                  {errorRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('errors')}
                      className={`px-3 py-1 rounded-lg font-medium transition-all ${
                        activeTab === 'errors'
                          ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      الأخطاء ({errorRows.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Preview Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 sticky top-0 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">الحالة</th>
                      <th className="p-2.5">الرقم الوظيفي</th>
                      <th className="p-2.5">الاسم الرباعي</th>
                      <th className="p-2.5">القسم</th>
                      <th className="p-2.5">نوع الملاك</th>
                      <th className="p-2.5">تفاصيل التدقيق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {displayedRows.map((row) => (
                      <tr
                        key={row.index}
                        className={`${
                          row.isValid
                            ? 'hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10'
                            : 'bg-rose-50/40 dark:bg-rose-950/20'
                        }`}
                      >
                        <td className="p-2.5 font-mono text-slate-400">{row.index}</td>
                        <td className="p-2.5">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              صالح
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                              <AlertTriangle className="w-3 h-3" />
                              غير صالح
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {row.data?.employeeNumber || getFieldVal(row.raw, ['الرقم الوظيفي', 'رقم الموظف', 'employeenumber']) || '—'}
                        </td>
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                          {row.data?.fullName || getFieldVal(row.raw, ['الاسم الرباعي', 'الاسم', 'fullname']) || '—'}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-300">
                          {row.data?.department || getFieldVal(row.raw, ['القسم', 'department']) || '—'}
                        </td>
                        <td className="p-2.5">
                          {row.data?.contractType === 'permanent' ? (
                            <span className="text-amber-700 dark:text-amber-400 font-semibold">
                              ملاك دائم
                            </span>
                          ) : (
                            <span className="text-blue-700 dark:text-blue-400 font-semibold">
                              عقد وزاري
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          {row.isValid ? (
                            <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                              جاهز للحفظ في السجل
                            </span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
                              {row.errors.join('، ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
          >
            إلغاء
          </button>

          <button
            type="button"
            id="confirm-import-csv-btn"
            disabled={validRows.length === 0 || isSaving}
            onClick={handleConfirmImport}
            className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>جارٍ حفظ السجلات في IndexedDB...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>استيراد السجلات الصالحة ({validRows.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
