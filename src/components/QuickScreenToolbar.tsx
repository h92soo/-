import React, { useState } from 'react';
import {
  Type,
  Moon,
  Sun,
  Clock,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Eye,
  Sliders,
  Calendar,
} from 'lucide-react';
import { AppearanceSettings, FontFamilyOption } from '../types';

interface QuickScreenToolbarProps {
  appearance: AppearanceSettings;
  onAppearanceChange: (newAppearance: AppearanceSettings) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenMovementModal: () => void;
  onOpenCalendar?: () => void;
}

export const ARABIC_FONTS_CATALOG: {
  id: FontFamilyOption;
  nameAr: string;
  cssClass: string;
  badge: string;
  sample: string;
}[] = [
  {
    id: 'Readex Pro',
    nameAr: 'ريدكس برو (Readex Pro)',
    cssClass: 'font-readex',
    badge: 'الافتراضي المعتمد',
    sample: 'جمهورية العراق - الأمانة العامة لمجلس الوزراء',
  },
  {
    id: 'Cairo',
    nameAr: 'القاهرة (Cairo)',
    cssClass: 'font-cairo',
    badge: 'عريض وفخم',
    sample: 'وزارة التخطيط والخدمة المدنية 2026',
  },
  {
    id: 'Alexandria',
    nameAr: 'الإسكندرية (Alexandria)',
    cssClass: 'font-alexandria',
    badge: 'حديث وعصري',
    sample: 'شؤون الموظفين ومتابعة شيتات الحضور والغياب',
  },
  {
    id: 'Almarai',
    nameAr: 'المراعي (Almarai)',
    cssClass: 'font-almarai',
    badge: 'رسمي نقي',
    sample: 'قسم الموارد البشرية والشؤون القانونية والإدارية',
  },
  {
    id: 'Tajawal',
    nameAr: 'تجوال (Tajawal)',
    cssClass: 'font-tajawal',
    badge: 'سلس ومريح',
    sample: 'تنظيم الأرصدة والزمنيات والإجازات الرسمية',
  },
  {
    id: 'IBM Plex Sans Arabic',
    nameAr: 'آي بي إم بلكس (IBM Plex)',
    cssClass: 'font-ibm-plex',
    badge: 'تقني رصين',
    sample: 'الأنظمة والبيانات الرقمية وقواعد IndexedDB',
  },
  {
    id: 'Noto Sans Arabic',
    nameAr: 'نووتو العربي (Noto Sans)',
    cssClass: 'font-noto',
    badge: 'هندسي قياسي',
    sample: 'متابعة حركة الموظفين والملاك الدائم والعقود',
  },
];

export function QuickScreenToolbar({
  appearance,
  onAppearanceChange,
  isDarkMode,
  onToggleDarkMode,
  onOpenMovementModal,
  onOpenCalendar,
}: QuickScreenToolbarProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Handle font selection
  const handleFontChange = (font: FontFamilyOption) => {
    const updated = { ...appearance, fontFamily: font };
    onAppearanceChange(updated);
  };

  // Handle toggle settings
  const handleToggle = (key: keyof AppearanceSettings, val: any) => {
    const updated = { ...appearance, [key]: val };
    onAppearanceChange(updated);
  };

  const currentFont = appearance.fontFamily || 'Readex Pro';

  return (
    <div
      id="quick-screen-toolbar"
      className="mb-4 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-md backdrop-blur-md overflow-hidden transition-all duration-200"
    >
      {/* Top Banner & Quick Controls */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-amber-500/10 via-blue-500/5 to-transparent flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                خيارات الشاشة والعرض الفوري (Display & Font Bar)
              </span>
              <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/60">
                مباشر
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              الخط النشط حالياً:{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {ARABIC_FONTS_CATALOG.find((f) => f.id === currentFont)?.nameAr || currentFont}
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons on Right */}
        <div className="flex items-center gap-2">
          {/* Quick Calendar & Holidays Button */}
          {onOpenCalendar && (
            <button
              type="button"
              id="quick-open-calendar-btn"
              onClick={onOpenCalendar}
              className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="عرض التقويم السنوي وعطل مجلس الوزراء والتعميم"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">التقويم والعطل</span>
            </button>
          )}

          {/* Direct Movement Register Button */}
          <button
            type="button"
            id="quick-add-movement-btn"
            onClick={onOpenMovementModal}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.99] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="تسجيل حركة جديدة للموظف (إجازة، زمنية، إيفاد، تأخير، غياب)"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>تسجيل حركة للموظف</span>
          </button>

          {/* Dark/Light Quick Toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={isDarkMode ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={isExpanded ? 'طي شريط خيارات العرض' : 'توسيع شريط خيارات العرض'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Quick Controls Panel */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3.5">
          {/* Row 1: Font Selector Pill Carousel */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-amber-500" />
                <span>تبديل نوع الخط المعتمد (اختر الخط الأنسب لك):</span>
              </label>
              <span className="text-[10px] text-slate-400">7 خطوط عربية فائقة الدقة</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {ARABIC_FONTS_CATALOG.map((font) => {
                const isSelected = currentFont === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => handleFontChange(font.id)}
                    className={`p-2 rounded-2xl border text-center transition-all cursor-pointer flex flex-col justify-between items-center ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20 ring-2 ring-amber-500/25 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    <div className={`text-xs ${font.cssClass} truncate w-full`}>
                      {font.nameAr.split(' ')[0]}
                    </div>
                    <span
                      className={`text-[9px] mt-1 px-1.5 py-0.2 rounded-full truncate ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {font.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Display & Layout Toggles */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Font Size Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                حجم الخط:
              </span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                {(['compact', 'normal', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleToggle('fontSize', size)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      appearance.fontSize === size
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {size === 'compact' ? 'مضغوط' : size === 'normal' ? 'قياسي' : 'كبير'}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Toggle Checkboxes */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Digital Clock */}
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                <input
                  type="checkbox"
                  checked={appearance.showDigitalClock}
                  onChange={(e) => handleToggle('showDigitalClock', e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400 w-3.5 h-3.5"
                />
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>الساعة الحكومية</span>
              </label>

              {/* Stats Cards */}
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                <input
                  type="checkbox"
                  checked={appearance.showStatsCards}
                  onChange={(e) => handleToggle('showStatsCards', e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400 w-3.5 h-3.5"
                />
                <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
                <span>بطاقات الإحصائيات</span>
              </label>

              {/* Compact Mode */}
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                <input
                  type="checkbox"
                  checked={appearance.compactTable}
                  onChange={(e) => handleToggle('compactTable', e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400 w-3.5 h-3.5"
                />
                <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
                <span>الجدول المضغوط</span>
              </label>

              {/* Early Warning Badges */}
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                <input
                  type="checkbox"
                  checked={appearance.showEarlyWarningBadges}
                  onChange={(e) => handleToggle('showEarlyWarningBadges', e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400 w-3.5 h-3.5"
                />
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>إنذار الرصيد</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
