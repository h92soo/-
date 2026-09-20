import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Printer,
  Download,
  RefreshCw,
  FileText,
  Layers,
  ShieldCheck,
  Check,
  Search,
  ChevronRight,
  ChevronLeft,
  Send,
  X,
  Landmark,
  Clock,
  Sparkles,
  Info,
  Home,
  Users,
  Zap,
} from 'lucide-react';
import { OfficialHoliday, HolidayCategory, Employee, UserAccount, WorkspaceTab } from '../types';
import {
  getOfficialHolidays,
  saveOfficialHolidays,
  circulateHolidayToAttendance,
  uncirculateHolidayFromAttendance,
} from '../db/indexedDB';
import {
  IRAQ_CABINET_HOLIDAYS_PRESET,
  IRAQI_MONTH_NAMES,
  ARABIC_DAYS_OF_WEEK,
  getHolidayCategoryMeta,
  getPresetHolidaysForYear,
} from '../data/iraqHolidaysData';
import { GovernmentEmblem } from './GovernmentEmblem';

interface AnnualCalendarHolidaysProps {
  employees: Employee[];
  currentUser?: UserAccount | null;
  onHolidayCirculated?: () => void;
  onBackToDashboard?: () => void;
  onNavigate?: (tab: WorkspaceTab) => void;
}

export const AnnualCalendarHolidays: React.FC<AnnualCalendarHolidaysProps> = ({
  employees,
  currentUser,
  onHolidayCirculated,
  onBackToDashboard,
  onNavigate,
}) => {
  const [holidays, setHolidays] = useState<OfficialHoliday[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [showAllYears, setShowAllYears] = useState<boolean>(false);
  const [isCustomYearMode, setIsCustomYearMode] = useState<boolean>(false);
  const [customYearInput, setCustomYearInput] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // 0-indexed: 8 is September (2026-09)
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-09-15');
  
  // View mode
  const [viewMode, setViewMode] = useState<'calendar' | 'table' | 'year_grid'>('calendar');
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [officialOffOnly, setOfficialOffOnly] = useState<boolean>(false);
  
  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [editingHoliday, setEditingHoliday] = useState<OfficialHoliday | null>(null);
  const [isFetchCabinetModalOpen, setIsFetchCabinetModalOpen] = useState<boolean>(false);
  const [isPrintPreview, setIsPrintPreview] = useState<boolean>(false);
  
  // Action notifications
  const [notification, setNotification] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);
  const [isCirculatingId, setIsCirculatingId] = useState<string | null>(null);

  // Load holidays from IndexedDB
  const loadHolidays = async () => {
    setIsLoading(true);
    try {
      const data = await getOfficialHolidays();
      setHolidays(data);
    } catch (err) {
      console.error('Error loading holidays:', err);
      showNotification('error', 'تعذر تحميل قائمة العطل من قاعدة البيانات المحلية.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  const showNotification = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Filtered holidays list
  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => {
      // Year filter (if holiday has a year or date)
      if (!showAllYears) {
        const hYear = h.year || parseInt(h.date.slice(0, 4), 10);
        if (hYear !== selectedYear) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && h.category !== categoryFilter) return false;

      // Official off only
      if (officialOffOnly && !h.isOfficialOff) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = h.title.toLowerCase().includes(query);
        const matchesDecree = (h.cabinetDecreeNumber || '').toLowerCase().includes(query);
        const matchesNotes = (h.notes || '').toLowerCase().includes(query);
        const matchesDate = h.date.includes(query);
        if (!matchesTitle && !matchesDecree && !matchesNotes && !matchesDate) return false;
      }

      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays, selectedYear, showAllYears, categoryFilter, officialOffOnly, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const yearHolidays = holidays.filter((h) => {
      if (showAllYears) return true;
      const hYear = h.year || parseInt(h.date.slice(0, 4), 10);
      return hYear === selectedYear;
    });

    const officialOffCount = yearHolidays
      .filter((h) => h.isOfficialOff)
      .reduce((acc, curr) => acc + (curr.durationDays || 1), 0);

    const occasionsCount = yearHolidays.filter((h) => !h.isOfficialOff).length;
    const circulatedCount = yearHolidays.filter((h) => h.isCirculated).length;

    return {
      totalEntries: yearHolidays.length,
      officialOffDays: officialOffCount,
      occasionsCount,
      circulatedCount,
    };
  }, [holidays, selectedYear]);

  // Circulate holiday handler
  const handleCirculateHoliday = async (holiday: OfficialHoliday) => {
    if (!employees || employees.length === 0) {
      showNotification('error', 'لا يوجد موظفون في النظام لتعميم العطلة عليهم.');
      return;
    }

    setIsCirculatingId(holiday.id);
    try {
      const res = await circulateHolidayToAttendance(holiday, employees);
      await loadHolidays();
      if (onHolidayCirculated) onHolidayCirculated();
      showNotification(
        'success',
        `تم تعميم العطلة بنجاح على ${employees.length} موظف (${res.appliedCount} قيد دوام لـ ${res.dates.length} أيام) وتوثيقها رسمياً.`
      );
    } catch (err) {
      console.error(err);
      showNotification('error', 'حدث خطأ أثناء تعميم العطلة على سجلات الدوام.');
    } finally {
      setIsCirculatingId(null);
    }
  };

  // Uncirculate handler
  const handleUncirculateHoliday = async (holiday: OfficialHoliday) => {
    if (!confirm(`هل أنت متأكد من رغبتك في إلغاء تعميم "${holiday.title}" وحذف قيود العطلة من سجلات دوام الموظفين؟`)) {
      return;
    }

    setIsCirculatingId(holiday.id);
    try {
      const res = await uncirculateHolidayFromAttendance(holiday.id);
      await loadHolidays();
      if (onHolidayCirculated) onHolidayCirculated();
      showNotification(
        'info',
        `تم إلغاء تعميم العطلة وحذف ${res.removedCount} قيد من سجلات الحضور بنجاح.`
      );
    } catch (err) {
      console.error(err);
      showNotification('error', 'حدث خطأ أثناء إلغاء تعميم العطلة.');
    } finally {
      setIsCirculatingId(null);
    }
  };

  // Delete holiday
  const handleDeleteHoliday = async (id: string, title: string) => {
    if (!confirm(`هل أنت متأكد من حذف "${title}" نهائياً من التقويم؟`)) {
      return;
    }
    const updated = holidays.filter((h) => h.id !== id);
    await saveOfficialHolidays(updated);
    setHolidays(updated);
    showNotification('success', `تم حذف "${title}" من التقويم بنجاح.`);
  };

  // Fetch / Sync Iraqi Cabinet Holidays
  const handleApplyCabinetHolidays = async (mode: 'merge' | 'reset') => {
    try {
      const yearPreset = getPresetHolidaysForYear(selectedYear);
      let finalHolidays: OfficialHoliday[];
      if (mode === 'reset') {
        // Keep holidays from other years, reset selectedYear
        const otherYears = holidays.filter((h) => {
          const y = h.year || parseInt(h.date.slice(0, 4), 10);
          return y !== selectedYear;
        });
        finalHolidays = [...otherYears, ...yearPreset];
      } else {
        // Merge: Keep custom ones and update/add Cabinet standard ones
        const existingMap = new Map<string, OfficialHoliday>();
        holidays.forEach((h) => existingMap.set(h.id, h));
        yearPreset.forEach((cabinetH) => {
          // If already exists with circulation, preserve circulation
          const existing = existingMap.get(cabinetH.id);
          if (existing) {
            existingMap.set(cabinetH.id, {
              ...cabinetH,
              isCirculated: existing.isCirculated,
              circulatedAt: existing.circulatedAt,
            });
          } else {
            existingMap.set(cabinetH.id, cabinetH);
          }
        });
        finalHolidays = Array.from(existingMap.values());
      }

      await saveOfficialHolidays(finalHolidays);
      setHolidays(finalHolidays);
      setIsFetchCabinetModalOpen(false);
      showNotification(
        'success',
        mode === 'reset'
          ? `تمت استعادة جدول عطل ومناسبات رئاسة الوزراء المعتمدة لسنة ${selectedYear} بالكامل بنجاح.`
          : `تم دمج وتحديث عطل رئاسة الوزراء لسنة ${selectedYear} مع الاحتفاظ بالمناسبات المضافة يدوياً.`
      );
    } catch (err) {
      console.error(err);
      showNotification('error', 'حدث خطأ أثناء مزامنة عطل رئاسة الوزراء.');
    }
  };

  // Calendar Days calculation for selected Month
  const calendarMonthDays = useMemo(() => {
    const year = selectedYear;
    const month = selectedMonth; // 0-indexed

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    // In Arabic standard (Iraq), week starts Saturday (index 6 in JS Date.getDay(), where Sun=0, Sat=6)
    // Let's compute offset from Saturday:
    // JS: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
    // Saturday offset: (day + 1) % 7
    const firstDayIndex = firstDayOfMonth.getDay();
    const leadingEmptyDays = (firstDayIndex + 1) % 7;

    const days = [];
    for (let i = 0; i < leadingEmptyDays; i++) {
      days.push({ dayNumber: null, dateStr: '', isWeekend: false, holidaysOnDay: [] });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(year, month, d);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday (5) & Saturday (6) in Iraq

      // Find holidays that cover this day
      const dayHolidays = holidays.filter((h) => {
        if (h.date === dStr) return true;
        if (h.endDate && dStr >= h.date && dStr <= h.endDate) return true;
        // duration days check
        if (h.durationDays && h.durationDays > 1) {
          const startD = new Date(h.date);
          const endD = new Date(startD);
          endD.setDate(startD.getDate() + (h.durationDays - 1));
          const endDStr = endD.toISOString().slice(0, 10);
          if (dStr >= h.date && dStr <= endDStr) return true;
        }
        return false;
      });

      days.push({
        dayNumber: d,
        dateStr: dStr,
        isWeekend,
        holidaysOnDay: dayHolidays,
      });
    }

    return days;
  }, [selectedYear, selectedMonth, holidays]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'المعرف,المسمى,التاريخ,تاريخ الانتهاء,المدة بالأيام,نوع التعطيل,التصنيف,السند القانوني,معممة\n';
    const rows = filteredHolidays
      .map((h) => {
        return `"${h.id}","${h.title}","${h.date}","${h.endDate || h.date}",${h.durationDays || 1},"${
          h.isOfficialOff ? 'عطلة رسمية معطلة للدوام' : 'مناسبة تذكارية'
        }","${getHolidayCategoryMeta(h.category).label}","${h.cabinetDecreeNumber || ''}","${
          h.isCirculated ? 'نعم' : 'لا'
        }"`;
      })
      .join('\n');

    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Iraqi_Cabinet_Holidays_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('success', 'تم تصدير ملف جدول العطل بنجاح.');
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* 0. Top Navigation & Quick Panel Switching Toolbar */}
      <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="px-3.5 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all border border-amber-200 dark:border-amber-800 cursor-pointer shadow-2xs"
              title="الرجوع إلى لوحة التحكم الرئيسية"
            >
              <Home className="w-4 h-4" />
              <span>الرئيسية</span>
            </button>
          )}

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">التنقل السريع:</span>
            {onNavigate && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onNavigate('employees')}
                  className="px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Users className="w-3 h-3 text-amber-500" />
                  <span>سجل الموظفين</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('daily_movements')}
                  className="px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-indigo-500" />
                  <span>الحركات اليومية</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('reports')}
                  className="px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                >
                  <FileText className="w-3 h-3 text-emerald-500" />
                  <span>تقارير الدوام</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            التقويم السنوي والعطل
          </span>
        </div>
      </div>

      {/* 1. Header Banner with Government Emblem & Direct Actions */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-full bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          {/* Title & Official Iraqi Branding */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <GovernmentEmblem size={40} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  التقويم السنوي والعطل الرسمية والمناسبات
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-mono">
                  {selectedYear}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                <Landmark className="w-3.5 h-3.5 text-amber-500" />
                <span>قانون العطلات الرسمية رقم (12) لسنة 2024 وتعميمات الأمانة العامة لمجلس الوزراء</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  قابلة للتعديل والتعميم الفوري على سجلات دوام الموظفين
                </span>
              </p>
            </div>
          </div>

          {/* Action Buttons & Unrestricted Year Selector */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Year Selector (All years without restriction) */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">السنة:</span>

              {/* Prev Year */}
              <button
                type="button"
                onClick={() => {
                  setSelectedYear((y) => y - 1);
                  setCustomYearInput(String(selectedYear - 1));
                }}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="السنة السابقة"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {isCustomYearMode ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={customYearInput}
                    onChange={(e) => setCustomYearInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseInt(customYearInput, 10);
                        if (!isNaN(val) && val > 1900 && val < 2100) {
                          setSelectedYear(val);
                          setIsCustomYearMode(false);
                        }
                      }
                    }}
                    placeholder="أدخل السنة"
                    className="w-16 px-1.5 py-0.5 text-center font-mono font-bold bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-600 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = parseInt(customYearInput, 10);
                      if (!isNaN(val) && val > 1900 && val < 2100) {
                        setSelectedYear(val);
                      }
                      setIsCustomYearMode(false);
                    }}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg text-xs"
                    title="تثبيت السنة"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomYearMode(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg text-xs"
                    title="إلغاء"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'custom') {
                      setCustomYearInput(String(selectedYear));
                      setIsCustomYearMode(true);
                    } else {
                      setSelectedYear(Number(v));
                      setCustomYearInput(v);
                    }
                  }}
                  className="bg-transparent font-mono font-black text-amber-700 dark:text-amber-300 focus:outline-none cursor-pointer px-1 py-0.5"
                  title="اختيار أو كتابة أي سنة دون تقييد"
                >
                  {/* Dynamic range of years from 1995 to 2045 */}
                  {Array.from({ length: 51 }, (_, i) => 1995 + i).map((y) => (
                    <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {y}
                    </option>
                  ))}
                  <option value="custom" className="bg-amber-50 dark:bg-slate-800 text-amber-800 dark:text-amber-300 font-bold">
                    ✏️ كتابة سنة أخرى يدوياً...
                  </option>
                </select>
              )}

              {/* Next Year */}
              <button
                type="button"
                onClick={() => {
                  setSelectedYear((y) => y + 1);
                  setCustomYearInput(String(selectedYear + 1));
                }}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="السنة اللاحقة"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Toggle All Years (كافة السنوات بدون تقييد) */}
            <button
              type="button"
              onClick={() => setShowAllYears(!showAllYears)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                showAllYears
                  ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              title="عرض سجلات ومناسبات كافة السنوات السابقة والمستقبلية في جدول واحد"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showAllYears ? 'عرض كافة السنوات (مفعل)' : 'عرض كل السنوات'}</span>
            </button>

            {/* Fetch Iraqi Cabinet Holidays Button */}
            <button
              type="button"
              id="fetch-cabinet-holidays-btn"
              onClick={() => setIsFetchCabinetModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer"
              title="جلب وتحديث العطل الرسمية المعتمدة الصادرة عن رئاسة مجلس الوزراء"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>جلب عطل رئاسة الوزراء</span>
            </button>

            {/* Add Holiday Button */}
            <button
              type="button"
              id="open-add-holiday-btn"
              onClick={() => {
                setEditingHoliday(null);
                setIsAddEditModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مناسبة أو عطلة</span>
            </button>

            {/* Print Official Circular */}
            <button
              type="button"
              onClick={() => setIsPrintPreview(!isPrintPreview)}
              className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              title="طباعة جدول العطل الرسمي"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              title="تصدير جدول العطل كملف CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Key Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 block">
              أيام العطل الرسمية المعتمدة
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-amber-900 dark:text-amber-200 font-mono">
                {stats.officialOffDays}
              </span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400">يوماً معطلاً</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40">
            <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 block">
              مناسبات ووقفات تذكارية
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-teal-900 dark:text-teal-200 font-mono">
                {stats.occasionsCount}
              </span>
              <span className="text-[11px] text-teal-600 dark:text-teal-400">مناسبة وطنية</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block">
              عطل معممة على الموظفين
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-200 font-mono">
                {stats.circulatedCount}
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400">عطلة موثقة</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40">
            <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 block">
              إجمالي قيود التقويم
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-blue-900 dark:text-blue-200 font-mono">
                {stats.totalEntries}
              </span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400">قيداً مسجلاً</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold transition-all shadow-md ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              : 'bg-blue-50 dark:bg-blue-950/80 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. View Switcher & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>عرض التقويم الشهري</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>جدول العطل والقرارات</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('year_grid')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'year_grid'
                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>نظرة السنة (12 شهراً)</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في العطل والمناسبات..."
              className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
          >
            <option value="all">كافة التصنيفات</option>
            <option value="national">مناسبات وطنية</option>
            <option value="religious_islamic">عطل إسلامية</option>
            <option value="religious_christian">أعياد المسيحيين</option>
            <option value="religious_other">الإيزيديون والصابئة</option>
            <option value="international">عطل دولية</option>
            <option value="cabinet_special">قرارات مجلس الوزراء</option>
          </select>

          {/* Official Off checkbox */}
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 text-xs font-medium select-none">
            <input
              type="checkbox"
              checked={officialOffOnly}
              onChange={(e) => setOfficialOffOnly(e.target.checked)}
              className="rounded text-amber-500 focus:ring-amber-500"
            />
            <span>عطل معطلة للدوام فقط</span>
          </label>
        </div>
      </div>

      {/* 4. MAIN VIEWS */}

      {/* VIEW A: Calendar View */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar Month Grid (Takes 3 columns) */}
          <div className="lg:col-span-3 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedMonth === 0) {
                      setSelectedMonth(11);
                      setSelectedYear((y) => y - 1);
                    } else {
                      setSelectedMonth((m) => m - 1);
                    }
                  }}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                  title="الشهر السابق"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {IRAQI_MONTH_NAMES[selectedMonth]} {selectedYear}
                </h2>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedMonth === 11) {
                      setSelectedMonth(0);
                      setSelectedYear((y) => y + 1);
                    } else {
                      setSelectedMonth((m) => m + 1);
                    }
                  }}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                  title="الشهر التالي"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Today Jump */}
              <button
                type="button"
                onClick={() => {
                  setSelectedYear(2026);
                  setSelectedMonth(8); // September 2026
                  setSelectedDateStr('2026-09-15');
                }}
                className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                اليوم (15 أيلول 2026)
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 dark:text-slate-400 py-1 border-b border-slate-200 dark:border-slate-800">
              {ARABIC_DAYS_OF_WEEK.map((day) => (
                <div
                  key={day.key}
                  className={`p-1.5 rounded-lg ${
                    day.isWeekend ? 'text-rose-600 dark:text-rose-400 font-extrabold' : ''
                  }`}
                >
                  {day.label}
                  {day.isWeekend && <span className="text-[9px] block font-normal text-rose-400">عطلة أسبوعية</span>}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 min-h-[400px]">
              {calendarMonthDays.map((cell, idx) => {
                if (cell.dayNumber === null) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="p-2 rounded-2xl bg-slate-50/40 dark:bg-slate-800/20 border border-dashed border-slate-200/50 dark:border-slate-800/40 min-h-[75px]"
                    />
                  );
                }

                const isSelected = cell.dateStr === selectedDateStr;
                const hasHoliday = cell.holidaysOnDay.length > 0;
                const hasOfficialOff = cell.holidaysOnDay.some((h) => h.isOfficialOff);

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    className={`p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[78px] select-none ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/20 shadow-md ring-2 ring-amber-500/30'
                        : hasOfficialOff
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 hover:border-amber-400'
                        : cell.isWeekend
                        ? 'border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          cell.dateStr === '2026-09-15'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : isSelected
                            ? 'bg-amber-600 text-white'
                            : cell.isWeekend
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {hasHoliday && (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            hasOfficialOff ? 'bg-amber-500 animate-pulse' : 'bg-teal-500'
                          }`}
                        />
                      )}
                    </div>

                    {/* Holiday badge preview inside cell */}
                    <div className="space-y-1 mt-1">
                      {cell.holidaysOnDay.map((h) => (
                        <div
                          key={h.id}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate ${
                            h.isOfficialOff
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300/60'
                              : 'bg-teal-100 dark:bg-teal-950/80 text-teal-900 dark:text-teal-200 border border-teal-300/60'
                          }`}
                          title={`${h.title} (${h.isOfficialOff ? 'عطلة رسمية' : 'مناسبة'})`}
                        >
                          {h.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Details Sidebar (Takes 1 column) */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400">تفاصيل اليوم المختار</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                  {selectedDateStr}
                </h3>
              </div>

              {/* Find holidays on selected date */}
              {(() => {
                const dayHolidays = holidays.filter((h) => {
                  if (h.date === selectedDateStr) return true;
                  if (h.endDate && selectedDateStr >= h.date && selectedDateStr <= h.endDate) return true;
                  return false;
                });

                if (dayHolidays.length === 0) {
                  return (
                    <div className="py-8 text-center space-y-3 text-slate-400">
                      <CalendarDays className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                      <p className="text-xs">لا توجد عطلات رسمية مسجلة لهذا التاريخ.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingHoliday({
                            id: `HOL-CUSTOM-${Date.now()}`,
                            title: '',
                            date: selectedDateStr,
                            durationDays: 1,
                            isOfficialOff: true,
                            category: 'national',
                            cabinetDecreeNumber: 'قرار رقم...',
                            year: selectedYear,
                          });
                          setIsAddEditModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold transition-colors cursor-pointer"
                      >
                        + إضافة عطلة أو مناسبة لهذا اليوم
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4 mt-3">
                    {dayHolidays.map((h) => {
                      const meta = getHolidayCategoryMeta(h.category);
                      return (
                        <div
                          key={h.id}
                          className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                {h.title}
                              </h4>
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border mt-1 ${meta.badgeClass}`}
                              >
                                {meta.label}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                h.isOfficialOff
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {h.isOfficialOff ? 'عطلة رسمية' : 'مناسبة تذكارية'}
                            </span>
                          </div>

                          {h.cabinetDecreeNumber && (
                            <div className="text-[10px] text-slate-600 dark:text-slate-300 font-mono bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800">
                              <span className="font-bold block text-slate-400 text-[9px]">
                                السند القانوني / القرار:
                              </span>
                              {h.cabinetDecreeNumber}
                            </div>
                          )}

                          {h.notes && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {h.notes}
                            </p>
                          )}

                          {/* Circulation Status & Action */}
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2">
                            {h.isCirculated ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span>معممة على الدوام</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">غير معممة على الدوام</span>
                            )}

                            <div className="flex items-center gap-1">
                              {h.isCirculated ? (
                                <button
                                  type="button"
                                  disabled={isCirculatingId === h.id}
                                  onClick={() => handleUncirculateHoliday(h)}
                                  className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-[10px] font-bold transition-colors cursor-pointer"
                                  title="إلغاء تعميم العطلة وحذف قيودها من سجلات الحضور"
                                >
                                  إلغاء التعميم
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isCirculatingId === h.id}
                                  onClick={() => handleCirculateHoliday(h)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                                  title="تعميم العطلة على كافة الموظفين في سجلات الحضور"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>تعميم العطلة</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingHoliday(h);
                                  setIsAddEditModalOpen(true);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                title="تعديل"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Add button at bottom of sidebar */}
            <button
              type="button"
              onClick={() => {
                setEditingHoliday(null);
                setIsAddEditModalOpen(true);
              }}
              className="w-full py-2.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مناسبة أو عطلة جديدة</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW B: Table View */}
      {viewMode === 'table' && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">التاريخ والمناسبة</th>
                  <th className="p-4">التصنيف</th>
                  <th className="p-4">المدة</th>
                  <th className="p-4">نوع الإجراء</th>
                  <th className="p-4">السند القانوني / قرار مجلس الوزراء</th>
                  <th className="p-4">حالة التعميم</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredHolidays.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      لا توجد عطلات مطابقة لمعايير البحث.
                    </td>
                  </tr>
                ) : (
                  filteredHolidays.map((h) => {
                    const meta = getHolidayCategoryMeta(h.category);
                    return (
                      <tr
                        key={h.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Title & Date */}
                        <td className="p-4 font-medium text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs">{h.title}</span>
                            {showAllYears && (
                              <span className="px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/80 text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 border border-amber-300/60">
                                {h.year || h.date.slice(0, 4)}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                            {h.date} {h.endDate && `إلى ${h.endDate}`}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="p-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </td>

                        {/* Duration */}
                        <td className="p-4 text-slate-700 dark:text-slate-300 font-mono">
                          {h.durationDays || 1} {h.durationDays && h.durationDays > 2 ? 'أيام' : 'يوم'}
                        </td>

                        {/* Off vs Occasion */}
                        <td className="p-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              h.isOfficialOff
                                ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {h.isOfficialOff ? 'عطلة رسمية معطلة' : 'مناسبة تذكارية'}
                          </span>
                        </td>

                        {/* Decree */}
                        <td className="p-4 text-slate-600 dark:text-slate-400 text-[11px]">
                          {h.cabinetDecreeNumber || '—'}
                        </td>

                        {/* Circulation */}
                        <td className="p-4">
                          {h.isCirculated ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>معممة على الدوام</span>
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              غير معممة
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Circulate / Uncirculate button */}
                            {h.isCirculated ? (
                              <button
                                type="button"
                                disabled={isCirculatingId === h.id}
                                onClick={() => handleUncirculateHoliday(h)}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-[11px] font-bold transition-colors cursor-pointer"
                                title="إلغاء تعميم العطلة"
                              >
                                إلغاء التعميم
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isCirculatingId === h.id}
                                onClick={() => handleCirculateHoliday(h)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                                title="تعميم العطلة على سجلات الحضور لكافة الموظفين"
                              >
                                <Send className="w-3 h-3" />
                                <span>تعميم</span>
                              </button>
                            )}

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingHoliday(h);
                                setIsAddEditModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                              title="تعديل بيانات العطلة"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteHoliday(h.id, h.title)}
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW C: Full 12-Month Year Overview Grid */}
      {viewMode === 'year_grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {IRAQI_MONTH_NAMES.map((monthName, monthIndex) => {
            const monthHolidays = holidays.filter((h) => {
              const hDate = new Date(h.date);
              return hDate.getFullYear() === selectedYear && hDate.getMonth() === monthIndex;
            });

            return (
              <div
                key={monthName}
                onClick={() => {
                  setSelectedMonth(monthIndex);
                  setViewMode('calendar');
                }}
                className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {monthName}
                    </h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {monthHolidays.length} مناسبة
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    {monthHolidays.length === 0 ? (
                      <p className="text-[10px] text-slate-400 py-3 text-center">لا توجد عطل مسجلة</p>
                    ) : (
                      monthHolidays.slice(0, 4).map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between text-[11px] p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                            {h.title}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 shrink-0">
                            {h.date.slice(8, 10)}
                          </span>
                        </div>
                      ))
                    )}
                    {monthHolidays.length > 4 && (
                      <div className="text-[10px] text-amber-600 font-bold text-center pt-1">
                        + {monthHolidays.length - 4} مناسبات أخرى
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between font-semibold">
                  <span>فتح التقويم المفصل</span>
                  <ChevronLeft className="w-3.5 h-3.5 text-amber-500" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL: ADD / EDIT HOLIDAY OR OCCASION */}
      {isAddEditModalOpen && (
        <AddEditHolidayModal
          isOpen={isAddEditModalOpen}
          onClose={() => {
            setIsAddEditModalOpen(false);
            setEditingHoliday(null);
          }}
          holiday={editingHoliday}
          employees={employees}
          selectedYear={selectedYear}
          onSave={async (savedHoliday, circulateImmediately) => {
            let updatedList: OfficialHoliday[];
            const exists = holidays.some((h) => h.id === savedHoliday.id);
            if (exists) {
              updatedList = holidays.map((h) => (h.id === savedHoliday.id ? savedHoliday : h));
            } else {
              updatedList = [savedHoliday, ...holidays];
            }

            await saveOfficialHolidays(updatedList);
            setHolidays(updatedList);

            if (circulateImmediately && employees.length > 0) {
              await circulateHolidayToAttendance(savedHoliday, employees);
              await loadHolidays();
              if (onHolidayCirculated) onHolidayCirculated();
              showNotification(
                'success',
                `تم حفظ وتعميم "${savedHoliday.title}" فوراً على ${employees.length} موظف.`
              );
            } else {
              showNotification('success', `تم حفظ بيانات "${savedHoliday.title}" بنجاح.`);
            }

            setIsAddEditModalOpen(false);
            setEditingHoliday(null);
          }}
        />
      )}

      {/* 6. MODAL: FETCH / SYNC CABINET HOLIDAYS */}
      {isFetchCabinetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-amber-50/70 dark:bg-amber-950/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <GovernmentEmblem size={26} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    جلب عطل ومناسبات رئاسة الوزراء (جمهورية العراق)
                  </h3>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    استناداً إلى قانون العطلات الرسمية رقم (12) لسنة 2024
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFetchCabinetModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 space-y-2">
                <p className="font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-amber-500" />
                  <span>تتضمن الحزمة الرسمية المعتمدة لعام 2026:</span>
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] pr-2 text-slate-500 dark:text-slate-400">
                  <li>عطل المناسبات الوطنية (رأس السنة الميلادية، عيد الجيش 6 كانون، نوروز، 14 تموز، العيد الوطني 3 تشرين، يوم النصر 10 كانون).</li>
                  <li>عطل المناسبات الإسلامية (عيد الفطر، عيد الأضحى، عيد الغدير، 1 محرم، عاشوراء 10 محرم، أربعينية الإمام الحسين ع، المولد النبوي).</li>
                  <li>أعياد الأخوة المسيحيين وأبناء المكون الإيزيدي والصابئة المندائيين (أكيتو، عيد الفصح، الأربعاء الأحمر).</li>
                  <li>قرارات مجلس الوزراء الخاصة بالمسح السكاني والعطل الطارئة.</li>
                </ul>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleApplyCabinetHolidays('merge')}
                  className="w-full p-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="text-right">
                    <div>دمج وتحديث العطل الرسمية لعام 2026</div>
                    <div className="text-[10px] font-normal text-amber-100">
                      يُحدث القائمة مع الاحتفاظ بالمناسبات التي أضفتها يدوياً
                    </div>
                  </div>
                  <Sparkles className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyCabinetHolidays('reset')}
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs active:scale-98 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="text-right">
                    <div>إعادة ضبط القائمة الرسمية الافتراضية بالكامل</div>
                    <div className="text-[10px] font-normal text-slate-400">
                      يستبدل القائمة بالجدول القياسي الصادر عن مجلس الوزراء
                    </div>
                  </div>
                  <RefreshCw className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-end">
              <button
                type="button"
                onClick={() => setIsFetchCabinetModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 font-medium cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. PRINT PREVIEW CONTAINER (Government Circular Format) */}
      {isPrintPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white text-slate-900 p-8 rounded-3xl shadow-2xl space-y-6 my-8 print:p-0 print:shadow-none print:m-0">
            {/* Action Bar (hidden on paper) */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <span className="text-xs font-bold text-slate-600">معاينة جدول العطل الرسمي للطباعة</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة فورية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintPreview(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 text-center">
              <div className="text-right text-xs space-y-0.5">
                <div className="font-bold">جمهورية العراق</div>
                <div>رئاسة مجلس الوزراء</div>
                <div className="text-slate-600">الأمانة العامة / الدائرة القانونية والإدارية</div>
              </div>
              <div className="flex flex-col items-center">
                <GovernmentEmblem size={55} />
                <span className="text-sm font-black mt-1">جدول العطلات والمناسبات الرسمية</span>
                <span className="text-xs font-mono text-slate-600">لسنة {selectedYear} م</span>
              </div>
              <div className="text-left text-xs space-y-0.5 font-mono">
                <div>العدد: ع / {selectedYear} / 12</div>
                <div>التاريخ: 15 / 09 / {selectedYear}</div>
                <div>المرفقات: جدول قانون (12)</div>
              </div>
            </div>

            {/* Content Table */}
            <table className="w-full text-right text-xs border border-slate-300">
              <thead className="bg-slate-100 font-bold border-b border-slate-300">
                <tr>
                  <th className="p-2 border-l border-slate-300 text-center w-10">ت</th>
                  <th className="p-2 border-l border-slate-300">المناسبة / العطلة الرسمية</th>
                  <th className="p-2 border-l border-slate-300">التاريخ</th>
                  <th className="p-2 border-l border-slate-300 text-center">المدة</th>
                  <th className="p-2 border-l border-slate-300">نوع الإجراء</th>
                  <th className="p-2">السند القانوني ورقم القرار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredHolidays.map((h, i) => (
                  <tr key={h.id}>
                    <td className="p-2 border-l border-slate-300 text-center font-mono">{i + 1}</td>
                    <td className="p-2 border-l border-slate-300 font-bold">{h.title}</td>
                    <td className="p-2 border-l border-slate-300 font-mono">
                      {h.date} {h.endDate && `إلى ${h.endDate}`}
                    </td>
                    <td className="p-2 border-l border-slate-300 text-center font-mono">
                      {h.durationDays || 1} يوم
                    </td>
                    <td className="p-2 border-l border-slate-300">
                      {h.isOfficialOff ? 'عطلة رسمية عامة معطلة' : 'مناسبة تذكارية'}
                    </td>
                    <td className="p-2 text-[11px] text-slate-600">{h.cabinetDecreeNumber || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Official Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
              <div className="space-y-12">
                <div className="font-bold">مسؤول شعبة إدارة الدوام والأفراد</div>
                <div className="font-medium text-slate-700">التوقيع والختم الإداري</div>
              </div>
              <div className="space-y-12">
                <div className="font-bold">مدير قسم الشؤون الإدارية والقانونية</div>
                <div className="font-medium text-slate-700">المصادقة والتعميم</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 8. SUB-COMPONENT: Add/Edit Holiday Modal
 */
interface AddEditHolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  holiday: OfficialHoliday | null;
  employees: Employee[];
  selectedYear: number;
  onSave: (holiday: OfficialHoliday, circulateImmediately: boolean) => void;
}

const AddEditHolidayModal: React.FC<AddEditHolidayModalProps> = ({
  isOpen,
  onClose,
  holiday,
  employees,
  selectedYear,
  onSave,
}) => {
  const [title, setTitle] = useState<string>(holiday?.title || '');
  const [date, setDate] = useState<string>(holiday?.date || `${selectedYear}-09-15`);
  const [endDate, setEndDate] = useState<string>(holiday?.endDate || '');
  const [durationDays, setDurationDays] = useState<number>(holiday?.durationDays || 1);
  const [isOfficialOff, setIsOfficialOff] = useState<boolean>(holiday?.isOfficialOff ?? true);
  const [category, setCategory] = useState<HolidayCategory>(holiday?.category || 'national');
  const [cabinetDecreeNumber, setCabinetDecreeNumber] = useState<string>(
    holiday?.cabinetDecreeNumber || 'قانون العطلات الرسمية رقم 12 لسنة 2024'
  );
  const [notes, setNotes] = useState<string>(holiday?.notes || '');
  const [circulateImmediately, setCirculateImmediately] = useState<boolean>(false);

  // Auto-recalculate duration if endDate changes
  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    if (newEnd && date && newEnd >= date) {
      const diffMs = new Date(newEnd).getTime() - new Date(date).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      setDurationDays(diffDays);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalHoliday: OfficialHoliday = {
      id: holiday?.id || `IRQ-HOL-${Date.now()}`,
      title: title.trim(),
      date,
      endDate: endDate ? endDate : undefined,
      durationDays: Number(durationDays) || 1,
      isOfficialOff,
      category,
      cabinetDecreeNumber: cabinetDecreeNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      year: new Date(date).getFullYear() || selectedYear,
      isCirculated: holiday?.isCirculated || false,
      circulatedAt: holiday?.circulatedAt,
    };

    onSave(finalHoliday, circulateImmediately);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {holiday ? 'تعديل بيانات العطلة / المناسبة' : 'إضافة مناسبة أو عطلة جديدة'}
              </h3>
              <p className="text-[10px] text-slate-500">توثيق رسمي في التقويم السنوي للمنظومة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              مسمى العطلة أو المناسبة: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: عيد الغدير الأغر، عطلة التعداد العام..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Dates & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                تاريخ البداية:
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                تاريخ النهاية (اختياري):
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                عدد الأيام:
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Category & Off vs Occasion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                تصنيف المناسبة:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as HolidayCategory)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="national">مناسبة وطنية وقومية</option>
                <option value="religious_islamic">عطلة دينية إسلامية</option>
                <option value="religious_christian">أعياد الإخوة المسيحيين</option>
                <option value="religious_other">أعياد الإيزيديين والصابئة</option>
                <option value="international">عطلة دولية وعالمية</option>
                <option value="cabinet_special">قرار خاص لرئاسة مجلس الوزراء</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                نوع الإجراء:
              </label>
              <select
                value={isOfficialOff ? 'off' : 'working'}
                onChange={(e) => setIsOfficialOff(e.target.value === 'off')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="off">عطلة رسمية عامة معطلة للدوام</option>
                <option value="working">مناسبة ووقفة استذكارية (دوام رسمي)</option>
              </select>
            </div>
          </div>

          {/* Decree / Legal basis */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              السند القانوني / رقم قرار مجلس الوزراء:
            </label>
            <input
              type="text"
              value={cabinetDecreeNumber}
              onChange={(e) => setCabinetDecreeNumber(e.target.value)}
              placeholder="مثال: قانون العطلات الرسمية رقم 12 لسنة 2024 أو كتاب الأمانة العامة..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ملاحظات أو توجيهات إدارية:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تعطيل الدوام لكافة الموظفين باستثناء الخفارات واللجان الطارئة..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Auto circulate checkbox */}
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <label className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={circulateImmediately}
                onChange={(e) => setCirculateImmediately(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>تعميم العطلة فور الحفظ على سجلات دوام كافة الموظفين ({employees.length} موظف)</span>
            </label>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 mr-5">
              سيتم تسجيل قيد عطلة رسمية تلقائياً في شيتات الحضور والغياب دون خصم أي رصيد من إجازات الموظفين.
            </p>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md shadow-amber-500/20 active:scale-98 transition-all cursor-pointer"
            >
              حفظ القيد في التقويم
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
