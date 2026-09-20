import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Clock,
  User,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  HardDrive,
} from 'lucide-react';
import {
  testSaveAndRetrieveSampleEmployee,
  getAllEmployees,
  SAMPLE_TEST_EMPLOYEE,
} from '../db/indexedDB';
import { Employee } from '../types';

interface IndexedDBTesterProps {
  compact?: boolean;
}

export const IndexedDBTester: React.FC<IndexedDBTesterProps> = ({ compact = false }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    durationMs: number;
    message: string;
    savedData?: Employee;
    retrievedData?: Employee;
  } | null>(null);
  const [totalStoredCount, setTotalStoredCount] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(!compact);

  // Load current stored count on mount
  const refreshCount = async () => {
    try {
      const all = await getAllEmployees();
      setTotalStoredCount(all.length);
    } catch {
      setTotalStoredCount(null);
    }
  };

  useEffect(() => {
    refreshCount();
  }, []);

  const handleRunTest = async () => {
    setIsRunning(true);
    setTestResult(null);

    const result = await testSaveAndRetrieveSampleEmployee();
    setTestResult(result);
    setIsRunning(false);
    refreshCount();
  };

  return (
    <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 shadow-sm overflow-hidden text-xs transition-all">
      {/* Header bar */}
      <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>قاعدة البيانات المحلية (IndexedDB)</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded font-mono">
                GovPersonnelDB_2026
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              تخزين دائم على متصفح الحاسوب المكتبي (بدون خادم خارجي)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalStoredCount !== null && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
              <span>السجلات المحفوظة:</span>
              <span className="font-bold">{totalStoredCount}</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title={isExpanded ? 'طي اللوحة' : 'توسيع اللوحة'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body content */}
      {isExpanded && (
        <div className="p-3.5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              انقر لتشغيل دالة التجربة البرمجية: تقوم بحفظ سجل موظف نموذجي (
              <span className="font-semibold text-slate-900 dark:text-white">
                {SAMPLE_TEST_EMPLOYEE.fullName}
              </span>
              ) في جدول <code className="font-mono text-amber-600 dark:text-amber-400">employees</code>،
              ثم استرجاعه فوراً بالمعرف <code className="font-mono">{SAMPLE_TEST_EMPLOYEE.id}</code>.
            </p>

            <button
              type="button"
              id="run-indexeddb-test-btn"
              disabled={isRunning}
              onClick={handleRunTest}
              className="px-3.5 py-1.5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 transition-all shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isRunning ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري الاختبار...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>تشغيل اختبار الحفظ والاسترجاع</span>
                </>
              )}
            </button>
          </div>

          {/* Test output result card */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border transition-all ${
                testResult.success
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 font-bold">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-200/50 dark:bg-emerald-900/50 text-[10px] font-mono text-emerald-800 dark:text-emerald-300 shrink-0">
                  <Clock className="w-3 h-3" />
                  {testResult.durationMs} ms
                </span>
              </div>

              {testResult.retrievedData && (
                <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/50 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-amber-500" />
                    <span>البيانات المسترجعة من IndexedDB بنجاح:</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-emerald-200/50 dark:border-emerald-900/40">
                      <div className="text-slate-400 text-[10px]">الاسم الكامل:</div>
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {testResult.retrievedData.fullName}
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-emerald-200/50 dark:border-emerald-900/40">
                      <div className="text-slate-400 text-[10px]">الرقم الوظيفي:</div>
                      <div className="font-semibold font-mono text-slate-900 dark:text-white truncate">
                        {testResult.retrievedData.employeeNumber}
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-emerald-200/50 dark:border-emerald-900/40">
                      <div className="text-slate-400 text-[10px]">نوع التوظيف:</div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {testResult.retrievedData.contractType === 'permanent'
                          ? 'ملاك دائم (36 يوماً)'
                          : 'عقد وزاري (30 يوماً)'}
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-emerald-200/50 dark:border-emerald-900/40">
                      <div className="text-slate-400 text-[10px]">الرصيد المتبقي:</div>
                      <div className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                        {testResult.retrievedData.remainingBalance} من أصل{' '}
                        {testResult.retrievedData.annualBalanceLimit} يوماً
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                    <span>القسم: {testResult.retrievedData.department}</span>
                    <span className="font-mono">
                      آخر تحديث: {new Date(testResult.retrievedData.updatedAt).toLocaleTimeString('ar-IQ')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
