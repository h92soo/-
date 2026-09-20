/**
 * قاعدة بيانات العطل الرسمية والمناسبات الوطنية والدينية لجمهورية العراق
 * استناداً إلى: قانون العطلات الرسمية رقم 12 لسنة 2024 الصادر عن مجلس النواب
 * والمصادق عليه من رئاسة الجمهورية وتعميمات الأمانة العامة لمجلس الوزراء
 */

import { OfficialHoliday, HolidayCategory } from '../types';

export const IRAQ_CABINET_HOLIDAYS_PRESET: OfficialHoliday[] = [
  {
    id: 'IRQ-HOL-01',
    title: 'رأس السنة الميلادية الجديدة',
    date: '2026-01-01',
    durationDays: 1,
    isOfficialOff: true,
    category: 'international',
    cabinetDecreeNumber: 'قانون العطلات الرسمية رقم 12 لسنة 2024 (المادة 1)',
    decreeDate: '2024-05-22',
    applicableTarget: 'all',
    notes: 'عطلة رسمية عامة لكافة الوزارات والدوائر والمؤسسات الحكومية في عموم العراق.',
    year: 2026,
  },
  {
    id: 'IRQ-HOL-02',
    title: 'عيد تأسيس الجيش العراقي الباسل',
    date: '2026-01-06',
    durationDays: 1,
    isOfficialOff: true,
    category: 'national',
    cabinetDecreeNumber: 'قانون العطلات الرسمية رقم 12 لسنة 2024 (المادة 1)',
    decreeDate: '2024-05-22',
    applicableTarget: 'all',
    notes: 'الذكرى 105 لتأسيس القوات المسلحة والجيش العراقي (1921). عطلة رسمية لكافة الدوائر.',
    year: 2026,
  },
  {
    id: 'IRQ-OCC-01',
    title: 'ذكرى الانتفاضة الشعبانية 1991',
    date: '2026-03-05',
    durationDays: 1,
    isOfficialOff: false,
    category: 'national',
    cabinetDecreeNumber: 'مناسبة وطنية ووقفة استذكارية لشهداء العراق',
    applicableTarget: 'all',
    notes: 'مناسبة وطنية تذكارية لشهداء الانتفاضة، دوام رسمي مع فعاليات استذكارية في الدوائر.',
    year: 2026,
  },
  {
    id: 'IRQ-OCC-02',
    title: 'ذكرى فاجعة قصف حلبجة بالأسلحة الكيماوية',
    date: '2026-03-16',
    durationDays: 1,
    isOfficialOff: false,
    category: 'national',
    cabinetDecreeNumber: 'قرار مجلس الوزراء رقم 12 لسنة 2024',
    applicableTarget: 'all',
    notes: 'وقفة صمت وحداد لمدة خمس دقائق في كافة وزارات ودوائر الدولة استذكاراً لشهداء حلبجة.',
    year: 2026,
  },
  {
    id: 'IRQ-HOL-03',
    title: 'عيد الفطر المبارك',
    date: '2026-03-20',
    endDate: '2026-03-23',
    durationDays: 4,
    isOfficialOff: true,
    category: 'religious_islamic',
    cabinetDecreeNumber: 'قانون العطلات الرسمية رقم 12 لسنة 2024 (1 إلى 4 شوال)',
    applicableTarget: 'all',
    notes: 'عطلة رسمية لجميع دوائر الدولة لمدة أربعة أيام تبدأ من 1 شوال 1447 هـ.',
    year: 2026,
  },
  {
    id: 'IRQ-HOL-04',
    title: 'عيد نوروز (رأس السنة الكردية)',
    date: '2026-03-21',
    durationDays: 1,
    isOfficialOff: true,
    category: 'national',
    cabinetDecreeNumber: 'قانون العطلات الرسمية رقم 12 لسنة 2024',
    applicableTarget: 'all',
    notes: 'عطلة رسمية في عموم أنحاء جمهورية العراق وإقليم كردستان.',
    year: 2026,
  },
  {
    id: 'IRQ-HOL-05',
    title: 'رأس السنة البابلية الآشورية (أكيتو)',
    date: '2026-04-01',
    durationDays: 1,
    isOfficialOff: true,
    category: 'religious_christian',
    cabinetDecreeNumber: 'قانون العطلات الرسمية رقم 12 لسنة 2024 (المادة 2)',
    applicableTarget: 'specific_groups',
    notes: 'عطلة رسمية خاصة بالمواطنين المسيحيين (الكلدان والآشوريين والسريان).',
    year: 2026,
  },
  {
    id: 'IRQ-HOL-06',
    title: 'رأس السنة الإيزيدية (الأربعاء الأحمر)',
    date: '2026-04-15',
    durationDays: 1,
    isOfficialOff: true,
    category: 'religious_other',
    cabinetDecreeNumber: 'قانون العطلات الرسمية رقم 12 لسنة 2024 (المادة 2)',
    applicableTarget: 'specific_groups',
    notes: 'عطلة رسمية لأبناء المكون الإيزيدي في عموم دوائر الدولة.',
    year: 2026,
  },
  {
    id: 'IRQ-HOL-07',
    title: 'عيد العمال العالمي',
    date: '2026-05-01',
    durationDays: 1,
    isOfficialOff: true,
    category: 'international',
    cabinetDecreeNumber: 'قانون العطلات الرسمية رقم 12 لسنة 2024 (المادة 1)',
    applicableTarget: 'all',
    notes: 'عطلة رسمية لجميع موظفي وعمال العراق تكريماً للطبقة العاملة.',
    year: 2026,
  },
  {
    id: 'IRQ-HOL-08',
    title: 'عيد الأضحى المبارك',
    date: '2026-05-26',
    endDate: '2026-05-29',
    durationDays: 4,
    isOfficialOff: true,
    category: 'religious_islamic',
    cabinetDecreeNumber: 'قانون العطلات الرسمية رقم 12 لسنة 2024 (10 إلى 13 ذو الحجة)',
    applicableTarget: 'all',
    notes: 'عطلة رسمية لمدة أربعة أيام بمناسبة عيد الأضحى المبارك لعام 1447 هـ.',
    year: 2026,
  },
  {
    id: 'IRQ-HOL-09',
    title: 'يوم الغدير الأغر',
    date: '2026-06-04',
    durationDays: 1,
    isOfficialOff: true,
    category: 'religious_islamic',
    cabinetDecreeNumber: 'قانون العطلات الرسمية رقم 12 لسنة 2024 (18 ذو الحجة)',
    decreeDate: '2024-05-22',
    applicableTarget: 'all',
    notes: 'عطلة رسمية عامة أُقرت بموجب قانون العطلات الرسمية رقم 12 لعام 2024.',
    year: 2026,
  },
  {
    id: 'IRQ-HOL-10',
    title: 'رأس السنة الهجرية الجديدة (1 محرم 1448 هـ)',
    date: '2026-06-16',
    durationDays: 1,
    isOfficialOff: true,
    category: 'religious_islamic',
    cabinetDecreeNumber: 'قانون العطلات الرسمية رقم 12 لسنة 2024',
    applicableTarget: 'all',
    notes: 'عطلة رسمية عامة لكافة الوزارات والدوائر الحكومية.',
    year: 2026,
  },
  {
    id: 'IRQ-HOL-11',
    title: 'يوم عاشوراء (10 محرم - استشهاد الإمام الحسين ع)',
    date: '2026-06-25',
    durationDays: 1,
    isOfficialOff: true,
    category: 'religious_islamic',
    cabinetDecreeNumber: 'قانون العطلات الرسمية رقم 12 لسنة 2024',
    applicableTarget: 'all',
    notes: 'عطلة رسمية عامة لكافة الدوائر والمؤسسات الرسمية في العراق.',
    year: 2026,
  },
  {
    id: 'IRQ-HOL-12',
    title: 'ذكرى ثورة 14 تموز (تأسيس جمهورية العراق 1958)',
    date: '2026-07-14',
    durationDays: 1,
    isOfficialOff: true,
    category: 'national',
    cabinetDecreeNumber: 'قانون العطلات الرسمية رقم 12 لسنة 2024 (المادة 1)',
    applicableTarget: 'all',
    notes: 'عطلة رسمية عامة بمناسبة إعلان النظام الجمهوري في العراق.',
    year: 2026,
  },
  {
    id: 'IRQ-HOL-13',
    title: 'أربعينية الإمام الحسين (ع) - 20 صفر',
    date: '2026-08-04',
    durationDays: 1,
    isOfficialOff: true,
    category: 'religious_islamic',
    cabinetDecreeNumber: 'قانون العطلات الرسمية رقم 12 لسنة 2024',
    applicableTarget: 'all',
    notes: 'عطلة رسمية عامة لكافة دوائر الدولة وتسهيلاً للزيارة المليونية.',
    year: 2026,
  },
  {
    id: 'IRQ-HOL-14',
    title: 'المولد النبوي الشريف (12 ربيع الأول)',
    date: '2026-08-25',
    durationDays: 1,
    isOfficialOff: true,
    category: 'religious_islamic',
    cabinetDecreeNumber: 'قانون العطلات الرسمية رقم 12 لسنة 2024',
    applicableTarget: 'all',
    notes: 'عطلة رسمية عامة لكافة الوزارات والمحافظات بمناسبة ذكرى المولد النبوي الشريف.',
    year: 2026,
  },
  {
    id: 'IRQ-HOL-15',
    title: 'العيد الوطني لجمهورية العراق (3 تشرين الأول)',
    date: '2026-10-03',
    durationDays: 1,
    isOfficialOff: true,
    category: 'national',
    cabinetDecreeNumber: 'قانون العطلات الرسمية رقم 12 لسنة 2024 (المادة 1)',
    applicableTarget: 'all',
    notes: 'عطلة رسمية عامة بمناسبة قبول العراق في عصبة الأمم واستقلاله التام سنة 1932.',
    year: 2026,
  },
  {
    id: 'IRQ-CAB-01',
    title: 'عطلة إنجاز وتدقيق التعداد السكاني العام',
    date: '2026-11-18',
    endDate: '2026-11-19',
    durationDays: 2,
    isOfficialOff: true,
    category: 'cabinet_special',
    cabinetDecreeNumber: 'قرار مجلس الوزراء رقم 342 لسنة 2026',
    applicableTarget: 'all',
    notes: 'قرار صادر عن رئاسة مجلس الوزراء لتمكين اللجان الإحصائية وفرق المسح الميداني.',
    year: 2026,
  },
  {
    id: 'IRQ-HOL-16',
    title: 'يوم النصر العظيم على عصابات داعش',
    date: '2026-12-10',
    durationDays: 1,
    isOfficialOff: true,
    category: 'national',
    cabinetDecreeNumber: 'قانون العطلات الرسمية رقم 12 لسنة 2024 (المادة 1)',
    applicableTarget: 'all',
    notes: 'عطلة رسمية لكافة دوائر الدولة ابتهاجاً بيوم تحرير كامل الأراضي العراقية.',
    year: 2026,
  },
  {
    id: 'IRQ-HOL-17',
    title: 'عيد ميلاد السيد المسيح (ع) - الكريسماس',
    date: '2026-12-25',
    durationDays: 1,
    isOfficialOff: true,
    category: 'religious_christian',
    cabinetDecreeNumber: 'قانون العطلات الرسمية رقم 12 لسنة 2024',
    applicableTarget: 'all',
    notes: 'عطلة رسمية عامة لجميع العراقيين بموجب قانون العطلات الرسمية الجديد.',
    year: 2026,
  },
  {
    id: 'IRQ-HOL-18',
    title: 'اليوم الثاني لعيد الميلاد المجيد',
    date: '2026-12-26',
    durationDays: 1,
    isOfficialOff: true,
    category: 'religious_christian',
    cabinetDecreeNumber: 'قانون العطلات الرسمية رقم 12 لسنة 2024 (المادة 2)',
    applicableTarget: 'specific_groups',
    notes: 'عطلة رسمية للمواطنين المسيحيين في كافة دوائر ومؤسسات الدولة.',
    year: 2026,
  },
];

export function getHolidayCategoryMeta(category: HolidayCategory): {
  label: string;
  badgeClass: string;
  dotColor: string;
} {
  switch (category) {
    case 'national':
      return {
        label: 'مناسبة وطنية وقومية',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
        dotColor: 'bg-emerald-500',
      };
    case 'religious_islamic':
      return {
        label: 'عطلة إسلامية',
        badgeClass: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800',
        dotColor: 'bg-teal-500',
      };
    case 'religious_christian':
      return {
        label: 'أعياد الإخوة المسيحيين',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
        dotColor: 'bg-purple-500',
      };
    case 'religious_other':
      return {
        label: 'أعياد الإيزيديين والصابئة',
        badgeClass: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
        dotColor: 'bg-sky-500',
      };
    case 'international':
      return {
        label: 'عطلة دولية وعالمية',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
        dotColor: 'bg-blue-500',
      };
    case 'cabinet_special':
    default:
      return {
        label: 'قرار رئاسة مجلس الوزراء',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
        dotColor: 'bg-amber-500',
      };
  }
}

/**
 * أسماء الأشهر الميلادية بالعربية المستعملة في العراق والمنهج الرسمي
 */
export const IRAQI_MONTH_NAMES = [
  'كانون الثاني (01)',
  'شباط (02)',
  'آذار (03)',
  'نيسان (04)',
  'أيار (05)',
  'حزيران (06)',
  'تموز (07)',
  'آب (08)',
  'أيلول (09)',
  'تشرين الأول (10)',
  'تشرين الثاني (11)',
  'كانون الأول (12)',
];

export const ARABIC_DAYS_OF_WEEK = [
  { key: 6, label: 'السبت', isWeekend: true },
  { key: 0, label: 'الأحد', isWeekend: false },
  { key: 1, label: 'الاثنين', isWeekend: false },
  { key: 2, label: 'الثلاثاء', isWeekend: false },
  { key: 3, label: 'الأربعاء', isWeekend: false },
  { key: 4, label: 'الخميس', isWeekend: false },
  { key: 5, label: 'الجمعة', isWeekend: true },
];

/**
 * توليد وتكييف جدول العطل والمناسبات الرسمية العراقية لأي سنة يختارها المستخدم دون أي تقييد
 * يتيح العمل على السنوات السابقة والحالية والمستقبلية بحرية تامة
 */
export function getPresetHolidaysForYear(targetYear: number): OfficialHoliday[] {
  const yearStr = String(targetYear);
  return IRAQ_CABINET_HOLIDAYS_PRESET.map((h) => {
    const originalDate = h.date;
    const monthDay = originalDate.slice(4); // e.g. -01-01
    const newDate = `${yearStr}${monthDay}`;
    let newEndDate: string | undefined = undefined;
    if (h.endDate) {
      const endMonthDay = h.endDate.slice(4);
      newEndDate = `${yearStr}${endMonthDay}`;
    }
    return {
      ...h,
      id: `${h.id}-${yearStr}`,
      date: newDate,
      endDate: newEndDate,
      year: targetYear,
    };
  });
}

