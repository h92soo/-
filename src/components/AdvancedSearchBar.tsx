import React from 'react';
import {
  Search,
  Filter,
  RotateCcw,
  Building2,
  Users,
  Briefcase,
  CheckCircle2,
  X,
  SlidersHorizontal,
  ChevronDown,
  Calendar,
  Clock,
  ArrowUpDown,
  UserX,
  UserCheck,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { ContractType } from '../types';
import { getArabicDayOfWeek } from '../utils/reportExportUtils';

export type SortField = 'seq' | 'name' | 'employeeNumber' | 'department' | 'status' | 'contractType';
export type SortDirection = 'asc' | 'desc';

export interface AdvancedSearchFilterState {
  searchTerm: string; // name, code, job title, phone
  selectedContractType: 'ALL' | 'permanent' | 'contract';
  selectedDepartment: string; // 'ALL' or department name
  selectedStatus: string; // 'ALL' or attendance status (present, absent, leave, time_permission, mission, holiday)
  selectedDate?: string; // YYYY-MM-DD
  sortField?: SortField;
  sortDirection?: SortDirection;
}

export interface AdvancedSearchBarProps {
  filters: AdvancedSearchFilterState;
  onFilterChange: (updated: Partial<AdvancedSearchFilterState>) => void;
  onResetFilters: () => void;
  departments: string[];
  departmentCounts?: Record<string, number>;
  counts: {
    total: number;
    permanent: number;
    contract: number;
    filtered: number;
  };
  statusCounts?: {
    total: number;
    present: number;
    absent: number;
    leave: number;
    timePerm: number;
    mission: number;
  };
  placeholder?: string;
  showStatusFilter?: boolean;
  showDateFilter?: boolean;
  showSortControls?: boolean;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  statusOptions?: { value: string; label: string }[];
  className?: string;
  idPrefix?: string;
}

const DEFAULT_STATUS_OPTIONS = [
  { value: 'ALL', label: 'كافة الحالات والمواقف' },
  { value: 'absent', label: 'غياب غير مبرر (غ)' },
  { value: 'present', label: 'حاضر (دوام رسمي)' },
  { value: 'leave', label: 'إجازة رسمية (اعتيادية / مرضية)' },
  { value: 'time_permission', label: 'إذن زمنية (ساعات)' },
  { value: 'mission', label: 'إيفاد / مهمة رسمية' },
  { value: 'official_holiday', label: 'عطلة رسمية' },
];

export const AdvancedSearchBar: React.FC<AdvancedSearchBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  departments,
  departmentCounts,
  counts,
  statusCounts,
  placeholder = 'بحث بالاسم، الكود الوظيفي، التسلسل، أو العنوان الوظيفي...',
  showStatusFilter = true,
  showDateFilter = false,
  showSortControls = true,
  selectedDate,
  onDateChange,
  statusOptions = DEFAULT_STATUS_OPTIONS,
  className = '',
  idPrefix = 'adv-search',
}) => {
  const isFiltered =
    filters.searchTerm.trim() !== '' ||
    filters.selectedContractType !== 'ALL' ||
    filters.selectedDepartment !== 'ALL' ||
    filters.selectedStatus !== 'ALL' ||
    (filters.sortField && filters.sortField !== 'seq');

  const currentDateValue = selectedDate || filters.selectedDate || new Date().toISOString().slice(0, 10);

  const handleDateShift = (days: number) => {
    const d = new Date(currentDateValue);
    d.setDate(d.getDate() + days);
    const newDateStr = d.toISOString().slice(0, 10);
    if (onDateChange) {
      onDateChange(newDateStr);
    } else {
      onFilterChange({ selectedDate: newDateStr });
    }
  };

  const handleSetToday = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (onDateChange) {
      onDateChange(todayStr);
    } else {
      onFilterChange({ selectedDate: todayStr });
    }
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yestStr = d.toISOString().slice(0, 10);
    if (onDateChange) {
      onDateChange(yestStr);
    } else {
      onFilterChange({ selectedDate: yestStr });
    }
  };

  return (
    <div
      id={`${idPrefix}-container`}
      className={`p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 ${className}`}
    >
      {/* 1. Main Search Field, Results Counter & Reset Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Real-time Search Input Box */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            id={`${idPrefix}-input`}
            type="text"
            value={filters.searchTerm}
            onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
            placeholder={placeholder}
            className="w-full pr-10 pl-9 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all shadow-2xs"
          />
          {filters.searchTerm && (
            <button
              type="button"
              id={`${idPrefix}-clear-term-btn`}
              onClick={() => onFilterChange({ searchTerm: '' })}
              className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="مسح نص البحث"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results Counter Badge & Reset Button */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <div
            id={`${idPrefix}-counter-badge`}
            className="px-3 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-1.5"
          >
            <span className="text-[11px] text-slate-500 dark:text-slate-400">النتائج المطابقة:</span>
            <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
              {counts.filtered}
            </span>
            <span className="text-[10px] text-slate-400">من أصل {counts.total}</span>
          </div>

          {isFiltered && (
            <button
              type="button"
              id={`${idPrefix}-reset-btn`}
              onClick={onResetFilters}
              className="px-3 py-2 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="إعادة ضبط كافة الفلاتر"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Date Selection Filter (If enabled) */}
      {showDateFilter && (
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>تاريخ التقرير والموقف:</span>
            </div>

            {/* Prev / Next Day Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleDateShift(-1)}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 text-xs transition-colors cursor-pointer"
                title="اليوم السابق"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <input
                type="date"
                value={currentDateValue}
                onChange={(e) => {
                  if (onDateChange) onDateChange(e.target.value);
                  else onFilterChange({ selectedDate: e.target.value });
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold text-slate-800 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={() => handleDateShift(1)}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 text-xs transition-colors cursor-pointer"
                title="اليوم التالي"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-amber-600 dark:text-amber-400 font-bold text-xs">
              ({getArabicDayOfWeek(currentDateValue)})
            </span>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSetToday}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentDateValue === new Date().toISOString().slice(0, 10)
                  ? 'bg-amber-500 text-white font-bold'
                  : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              اليوم الحالي
            </button>
            <button
              type="button"
              onClick={handleSetYesterday}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
            >
              يوم أمس
            </button>
          </div>
        </div>
      )}

      {/* 3. Movement / Status Quick Filter Pills (Specific requirement: Showing absent only, etc.) */}
      {showStatusFilter && (
        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Filter className="w-3 h-3 text-amber-500" />
              <span>فلترة سريعة حسب نوع الحركة والموقف:</span>
            </span>
            {filters.selectedStatus === 'absent' && (
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900 animate-pulse">
                تم تفعيل عرض: الغائبين فقط
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* All Statuses */}
            <button
              type="button"
              id={`${idPrefix}-status-all`}
              onClick={() => onFilterChange({ selectedStatus: 'ALL' })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                filters.selectedStatus === 'ALL'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <span>الكل</span>
              {statusCounts && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20 dark:bg-slate-300">
                  {statusCounts.total}
                </span>
              )}
            </button>

            {/* ABSENT ONLY (High Priority) */}
            <button
              type="button"
              id={`${idPrefix}-status-absent-only`}
              onClick={() => onFilterChange({ selectedStatus: 'absent' })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                filters.selectedStatus === 'absent'
                  ? 'bg-rose-600 text-white ring-2 ring-rose-500/40 shadow-md shadow-rose-600/25'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100'
              }`}
              title="إظهار الموظفين الغائبين فقط في التاريخ المحدد"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>الغائبون فقط (غ)</span>
              {statusCounts && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    filters.selectedStatus === 'absent'
                      ? 'bg-white text-rose-700'
                      : 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {statusCounts.absent}
                </span>
              )}
            </button>

            {/* PRESENT ONLY */}
            <button
              type="button"
              id={`${idPrefix}-status-present-only`}
              onClick={() => onFilterChange({ selectedStatus: 'present' })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                filters.selectedStatus === 'present'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>حاضر (دوام رسمي)</span>
              {statusCounts && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-slate-200 dark:bg-slate-800">
                  {statusCounts.present}
                </span>
              )}
            </button>

            {/* LEAVE ONLY */}
            <button
              type="button"
              id={`${idPrefix}-status-leave-only`}
              onClick={() => onFilterChange({ selectedStatus: 'leave' })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                filters.selectedStatus === 'leave'
                  ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/20'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-100'
              }`}
            >
              <span>إجازات رسمية</span>
              {statusCounts && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-amber-200 dark:bg-amber-900">
                  {statusCounts.leave}
                </span>
              )}
            </button>

            {/* TIME PERMISSION ONLY */}
            <button
              type="button"
              id={`${idPrefix}-status-time-only`}
              onClick={() => onFilterChange({ selectedStatus: 'time_permission' })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                filters.selectedStatus === 'time_permission'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 hover:bg-blue-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>زمنيات (ساعات)</span>
              {statusCounts && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-blue-200 dark:bg-blue-900">
                  {statusCounts.timePerm}
                </span>
              )}
            </button>

            {/* MISSION ONLY */}
            <button
              type="button"
              id={`${idPrefix}-status-mission-only`}
              onClick={() => onFilterChange({ selectedStatus: 'mission' })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                filters.selectedStatus === 'mission'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20'
                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50 hover:bg-purple-100'
              }`}
            >
              <span>إيفادات رسمية</span>
              {statusCounts && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-purple-200 dark:bg-purple-900">
                  {statusCounts.mission}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 4. Dropdowns Section: Department, Employment Type & Sorting */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
        {/* Department Dropdown */}
        <div>
          <label
            htmlFor={`${idPrefix}-dept-select`}
            className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"
          >
            <Building2 className="w-3 h-3 text-amber-500" />
            <span>القسم أو التشكيل الإداري:</span>
          </label>
          <div className="relative">
            <select
              id={`${idPrefix}-dept-select`}
              value={filters.selectedDepartment}
              onChange={(e) => onFilterChange({ selectedDepartment: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              <option value="ALL">كافة الأقسام والتشكيلات الإدارية</option>
              {departments.map((dept) => {
                const count = departmentCounts ? departmentCounts[dept] : undefined;
                return (
                  <option key={dept} value={dept}>
                    {dept} {count !== undefined ? `(${count} موظف)` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Contract / Employment Type */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-amber-500" />
            <span>نوع الملاك والتوظيف:</span>
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onFilterChange({ selectedContractType: 'ALL' })}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                filters.selectedContractType === 'ALL'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              الكل ({counts.total})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ selectedContractType: 'permanent' })}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                filters.selectedContractType === 'permanent'
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              ملاك ({counts.permanent})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ selectedContractType: 'contract' })}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                filters.selectedContractType === 'contract'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              عقد 315 ({counts.contract})
            </button>
          </div>
        </div>

        {/* Data Sorting Controls */}
        {showSortControls && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-amber-500" />
              <span>فرز وترتيب البيانات:</span>
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={filters.sortField || 'seq'}
                onChange={(e) => onFilterChange({ sortField: e.target.value as SortField })}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="seq">التسلسل الرقمي (ت)</option>
                <option value="name">الاسم الرباعي واللقب (أبجدي)</option>
                <option value="status">نوع الحركة / الموقف (الغياب أولاً)</option>
                <option value="employeeNumber">الرقم الوظيفي</option>
                <option value="department">القسم والتشكيل</option>
                <option value="contractType">نوع التوظيف والملاك</option>
              </select>

              <button
                type="button"
                onClick={() =>
                  onFilterChange({
                    sortDirection: (filters.sortDirection || 'asc') === 'asc' ? 'desc' : 'asc',
                  })
                }
                className="px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                title={`تبديل اتجاه الفرز (الحالي: ${
                  (filters.sortDirection || 'asc') === 'asc' ? 'تصاعدي' : 'تنازلي'
                })`}
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-500" />
                <span>{(filters.sortDirection || 'asc') === 'asc' ? 'تصاعدي' : 'تنازلي'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
