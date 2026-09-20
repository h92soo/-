import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Calendar,
  UserCheck,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  X,
  Plus,
  Briefcase,
  Plane,
  HeartPulse,
  AlertOctagon,
  ShieldCheck,
  ChevronRight,
  Sun,
  Award,
  Search,
  Check,
} from 'lucide-react';
import {
  Employee,
  AttendanceRecord,
  AttendanceStatus,
  MovementCategory,
  UserAccount,
  LeaveType,
} from '../types';
import { saveAttendanceLogsBatch, saveEmployee } from '../db/indexedDB';

interface AddMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  defaultEmployeeId?: string;
  defaultCategory?: MovementCategory;
  currentUser?: UserAccount | null;
  onRecordSaved: (newRecord: AttendanceRecord, updatedEmp?: Employee) => void;
}

interface MovementTypeOption {
  id: string;
  category: MovementCategory;
  title: string;
  status: AttendanceStatus;
  leaveType?: LeaveType;
  timePermissionType?: 'morning' | 'noon' | 'evening';
  defaultMinutes?: number;
  defaultDays?: number;
  defaultDeduct: boolean;
  badgeColor: string;
  description: string;
}

const MOVEMENT_TYPES: MovementTypeOption[] = [
  // 1. الحضور والدوام
  {
    id: 'reg_present',
    category: 'attendance',
    title: 'دوام رسمي اعتيادي (حاضر)',
    status: 'present',
    defaultDeduct: false,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    description: 'حضور في الوقت المحدد وفق جدول الدوام الرسمي',
  },
  {
    id: 'excused_delay',
    category: 'attendance',
    title: 'تأخير صباحي مبرر (بعذر رسمي)',
    status: 'present',
    timePermissionType: 'morning',
    defaultMinutes: 30,
    defaultDeduct: false,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    description: 'تأخير مقبول بموافقة المسؤول المباشر',
  },
  {
    id: 'shift_night',
    category: 'attendance',
    title: 'مناوبة / خفارة ليلية',
    status: 'present',
    defaultDeduct: false,
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    description: 'التحاق بجدول الخفارات والمناوبات الليلية أو العطل',
  },
  {
    id: 'compensatory_work',
    category: 'attendance',
    title: 'تعويض دوام / عمل إضافي معتمد',
    status: 'present',
    defaultDeduct: false,
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    description: 'الدوام في يوم عطلة أو ساعات إضافية لتعويض رصيد أو إنجاز مهمة',
  },

  // 2. الزمنيات والأذونات الساعية
  {
    id: 'time_morning',
    category: 'time_permission',
    title: 'زمنية صباحية (تأخير دخول بإذن)',
    status: 'time_permission',
    timePermissionType: 'morning',
    defaultMinutes: 60,
    defaultDeduct: false,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    description: 'إذن تأخر ساعة أو ساعتين صباحاً بطلب معتمد',
  },
  {
    id: 'time_midday',
    category: 'time_permission',
    title: 'زمنية منتصف الدوام (خروج مؤقت)',
    status: 'time_permission',
    timePermissionType: 'noon',
    defaultMinutes: 60,
    defaultDeduct: false,
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
    description: 'خروج رسمي لإنجاز معاملة ثم العودة لمقر العمل',
  },
  {
    id: 'time_early_exit',
    category: 'time_permission',
    title: 'زمنية انصراف مبكر (قبل نهاية الدوام)',
    status: 'time_permission',
    timePermissionType: 'noon',
    defaultMinutes: 60,
    defaultDeduct: false,
    badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800',
    description: 'مغادرة مقر العمل قبل موعد الانصراف الرسمي بساعات محددة',
  },
  {
    id: 'time_medical',
    category: 'time_permission',
    title: 'إذن مراجعة طبية ساعية',
    status: 'time_permission',
    timePermissionType: 'morning',
    defaultMinutes: 120,
    defaultDeduct: false,
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
    description: 'مراجعة مستوصف أو مستشفى حكومي مع إرفاق وصل الفحص',
  },
  {
    id: 'time_emergency',
    category: 'time_permission',
    title: 'إذن ظرف عائلي أو طارئ',
    status: 'time_permission',
    timePermissionType: 'noon',
    defaultMinutes: 60,
    defaultDeduct: false,
    badgeColor: 'bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-900 dark:text-stone-300 dark:border-stone-700',
    description: 'إذن ساعي لظرف طارئ بموافقة مدير القسم',
  },

  // 3. الإجازات الرسمية
  {
    id: 'leave_annual',
    category: 'leave',
    title: 'إجازة اعتيادية براتب تام (تخصم من الرصيد)',
    status: 'leave',
    leaveType: 'annual',
    defaultDeduct: true,
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    description: 'تخصم من رصيد الإجازات السنوي (36 يوماً للملاك / 30 يوماً للعقد)',
  },
  {
    id: 'leave_sick',
    category: 'leave',
    title: 'إجازة مرضية بتقرير طبي معتمد',
    status: 'leave',
    leaveType: 'sick',
    defaultDeduct: false,
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    description: 'استناداً إلى تقرير اللجنة الطبية الرسمية وفق قانون الخدمة المدنية',
  },
  {
    id: 'leave_maternity_pre_21',
    category: 'leave',
    title: 'إجازة الحمل وما قبل الوضع (21 يوماً - براتب تام)',
    status: 'leave',
    leaveType: 'maternity_pre_21',
    defaultDays: 21,
    defaultDeduct: false,
    badgeColor: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950/60 dark:text-pink-300 dark:border-pink-800',
    description: 'تمنح للموظفة الحامل قبل موعد الوضع بـ 21 يوماً براتب تام (مادة 43 قانون الخدمة المدنية العراقي رقم 24 لسنة 1960)',
  },
  {
    id: 'leave_maternity_post_51',
    category: 'leave',
    title: 'إجازة الوضع وما بعد الولادة (51 يوماً - براتب تام)',
    status: 'leave',
    leaveType: 'maternity_post_51',
    defaultDays: 51,
    defaultDeduct: false,
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    description: 'تمنح للموظفة بعد الوضع مباشرة ولمدة 51 يوماً براتب ومخصصات تامة وفق القوانين العراقية النافذة',
  },
  {
    id: 'leave_maternity_full_72',
    category: 'leave',
    title: 'إجازة الحمل والوضع التامة (72 يوماً = 21 قبل + 51 بعد الوضع)',
    status: 'leave',
    leaveType: 'maternity_full_72',
    defaultDays: 72,
    defaultDeduct: false,
    badgeColor: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:border-fuchsia-800',
    description: 'الإجازة المتصلة الشاملة للولادة براتب ومخصصات تامة (21 يوماً قبل الوضع + 51 يوماً بعد الوضع)',
  },
  {
    id: 'leave_maternity_care_year',
    category: 'leave',
    title: 'إجازة الأمومة ورعاية الطفل (سنة كاملة / 365 يوماً)',
    status: 'leave',
    leaveType: 'maternity_care_year',
    defaultDays: 365,
    defaultDeduct: false,
    badgeColor: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
    description: 'تمنح للموظفة لرعاية طفلها لمدة سنة (6 أشهر براتب تام و6 أشهر بنصف راتب وفق القانون العراقي)',
  },
  {
    id: 'leave_maternity',
    category: 'leave',
    title: 'إجازة أمومة وولادة عامة',
    status: 'leave',
    leaveType: 'maternity',
    defaultDays: 72,
    defaultDeduct: false,
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    description: 'إجازة ولادة وأمومة مدفوعة الراتب للموظفات',
  },
  {
    id: 'leave_bereavement',
    category: 'leave',
    title: 'إجازة عدة وفاة / حداد شرعي',
    status: 'leave',
    leaveType: 'bereavement',
    defaultDeduct: false,
    badgeColor: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200',
    description: 'إجازة وفاة أحد الأقارب من الدرجة الأولى أو عدة وفاة الزوج',
  },
  {
    id: 'leave_hajj',
    category: 'leave',
    title: 'إجازة أداء مناسك الحج أو العمرة',
    status: 'leave',
    leaveType: 'hajj',
    defaultDeduct: false,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    description: 'إجازة حج براتب تام تمنح لمرة واحدة طيلة مدة الخدمة',
  },
  {
    id: 'leave_marriage',
    category: 'leave',
    title: 'إجازة زواج رسمية',
    status: 'leave',
    leaveType: 'marriage',
    defaultDeduct: false,
    badgeColor: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950/60 dark:text-pink-300 dark:border-pink-800',
    description: 'تمنح للموظف عند الزواج بموجب عقد زواج رسمي مصدق',
  },
  {
    id: 'leave_study',
    category: 'leave',
    title: 'إجازة دراسية / أداء امتحانات جامعية',
    status: 'leave',
    leaveType: 'study',
    defaultDeduct: false,
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    description: 'بموجب تأييد من الكلية أو الجامعة وجدول الامتحانات المعتمد',
  },
  {
    id: 'leave_unpaid',
    category: 'leave',
    title: 'إجازة بدون راتب (قرار وزاري)',
    status: 'leave',
    leaveType: 'unpaid',
    defaultDeduct: false,
    badgeColor: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300',
    description: 'إجازة خاصة بموجب موافقة الوزير المختص دون استحقاق مالي',
  },

  // 4. الإيفادات والمهام الميدانية
  {
    id: 'mission_internal',
    category: 'mission',
    title: 'إيفاد رسمي داخل المحافظة',
    status: 'mission',
    defaultDeduct: false,
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
    description: 'مهمة عمل رسمية في دوائر أو مشاريع داخل حدود المحافظة',
  },
  {
    id: 'mission_external',
    category: 'mission',
    title: 'إيفاد رسمي خارج المحافظة / القطر',
    status: 'mission',
    defaultDeduct: false,
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    description: 'مهمة عمل مركزية أو حضور مؤتمر خارجي بأمر وزاري',
  },
  {
    id: 'mission_inspection',
    category: 'mission',
    title: 'جولة تفتيشية / كشف ميداني موقعي',
    status: 'mission',
    defaultDeduct: false,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    description: 'زيارة موقعية لأقسام ومشاريع الوزارة للمتابعة والتدقيق',
  },
  {
    id: 'mission_committee',
    category: 'mission',
    title: 'تكليف بلجنة وزارية / تحقيقية / جرد',
    status: 'mission',
    defaultDeduct: false,
    badgeColor: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
    description: 'التفرغ التام لأعمال اللجنة المحددة بموجب الأمر الإداري',
  },
  {
    id: 'mission_training',
    category: 'mission',
    title: 'مشاركة في دورة تدريبية / ورشة عمل',
    status: 'mission',
    defaultDeduct: false,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    description: 'حضور برامج التطوير والتأهيل المؤسسي الحكومي',
  },

  // 5. الغيابات والعقوبات
  {
    id: 'viol_unexcused_absent',
    category: 'violation',
    title: 'غياب بدون إشعار أو عذر (غير مبرر)',
    status: 'absent',
    defaultDeduct: false,
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    description: 'عدم الالتحاق بالدوام دون تقديم عذر مشروع مسبق',
  },
  {
    id: 'viol_delay_unexcused',
    category: 'violation',
    title: 'تأخير صباحي غير مبرر (مخالفة دوام)',
    status: 'absent',
    timePermissionType: 'morning',
    defaultMinutes: 45,
    defaultDeduct: false,
    badgeColor: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
    description: 'تسجيل دخول متأخر بدون موافقة المسؤول المباشر',
  },
  {
    id: 'viol_penalty',
    category: 'violation',
    title: 'عقوبة انضباطية (لفت نظر / إنذار)',
    status: 'absent',
    defaultDeduct: false,
    badgeColor: 'bg-red-200 text-red-900 border-red-400 dark:bg-red-900 dark:text-red-200',
    description: 'عقوبة إدارية وفق قانون انضباط موظفي الدولة',
  },

  // 6. العطل الرسمية
  {
    id: 'holiday_general',
    category: 'holiday',
    title: 'عطلة رسمية عامة (أعياد ومناسبات)',
    status: 'official_holiday',
    defaultDeduct: false,
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
    description: 'عطلة مقرة في جدول العطل الرسمية لجمهورية العراق',
  },
  {
    id: 'holiday_emergency',
    category: 'holiday',
    title: 'تعطيل دوام رسمي بقرار مجلس الوزراء',
    status: 'official_holiday',
    defaultDeduct: false,
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    description: 'تعطيل الدوام لارتفاع درجات الحرارة أو ظروف أمنية أو طقس',
  },
];

export function AddMovementModal({
  isOpen,
  onClose,
  employees,
  defaultEmployeeId,
  defaultCategory,
  currentUser,
  onRecordSaved,
}: AddMovementModalProps) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<MovementCategory>('attendance');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('reg_present');

  // Instant Search states
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState<string>('');
  const [isEmployeeSearchOpen, setIsEmployeeSearchOpen] = useState<boolean>(false);
  const [movementSearchTerm, setMovementSearchTerm] = useState<string>('');

  // Dates & timings
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [hasEndDate, setHasEndDate] = useState<boolean>(false);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customDaysCount, setCustomDaysCount] = useState<number>(1);
  const [timeMinutes, setTimeMinutes] = useState<number>(60);
  const [startTime, setStartTime] = useState<string>('08:30');
  const [endTime, setEndTime] = useState<string>('09:30');

  // Helper to add days to YYYY-MM-DD
  const calculateEndDate = (startDateStr: string, days: number): string => {
    try {
      const parts = startDateStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      d.setDate(d.getDate() + Math.max(0, days - 1));
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch {
      return startDateStr;
    }
  };

  // Administrative order info
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [approvedBy, setApprovedBy] = useState<string>('');
  const [deductFromBalance, setDeductFromBalance] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Initialize selected employee
  useEffect(() => {
    if (defaultEmployeeId) {
      setSelectedEmpId(defaultEmployeeId);
    } else if (employees.length > 0 && !selectedEmpId) {
      setSelectedEmpId(employees[0].id);
    }
  }, [defaultEmployeeId, employees, selectedEmpId]);

  // Handle defaultCategory if opened directly for leave or other category
  useEffect(() => {
    if (defaultCategory) {
      setActiveCategory(defaultCategory);
      const firstOfType = MOVEMENT_TYPES.find((m) => m.category === defaultCategory);
      if (firstOfType) {
        setSelectedTypeId(firstOfType.id);
        setDeductFromBalance(firstOfType.defaultDeduct);
      }
    }
  }, [defaultCategory, isOpen]);

  // Filtered employees based on search query
  const searchedEmployees = useMemo(() => {
    const q = employeeSearchTerm.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (emp) =>
        emp.fullName.toLowerCase().includes(q) ||
        emp.employeeNumber.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        (emp.jobTitle && emp.jobTitle.toLowerCase().includes(q))
    );
  }, [employees, employeeSearchTerm]);

  // Selected employee object
  const currentEmp = useMemo(() => {
    return employees.find((e) => e.id === selectedEmpId) || null;
  }, [employees, selectedEmpId]);

  // Selected movement type
  const selectedMovement = useMemo(() => {
    return MOVEMENT_TYPES.find((m) => m.id === selectedTypeId) || MOVEMENT_TYPES[0];
  }, [selectedTypeId]);

  // Update defaults when movement type changes
  const handleSelectMovementType = (item: MovementTypeOption) => {
    setSelectedTypeId(item.id);
    setActiveCategory(item.category);
    setDeductFromBalance(item.defaultDeduct);
    if (item.defaultMinutes) {
      setTimeMinutes(item.defaultMinutes);
    }
    if (item.defaultDays) {
      const d = item.defaultDays;
      setCustomDaysCount(d);
      if (d > 1) {
        setHasEndDate(true);
        setEndDate(calculateEndDate(logDate, d));
      } else {
        setHasEndDate(false);
        setEndDate(logDate);
      }
    }
  };

  const handleSetDaysCount = (days: number) => {
    const valid = Math.max(1, days);
    setCustomDaysCount(valid);
    if (valid > 1) {
      setHasEndDate(true);
      setEndDate(calculateEndDate(logDate, valid));
    } else {
      setHasEndDate(false);
      setEndDate(logDate);
    }
  };

  const handleStartDateChange = (newDate: string) => {
    setLogDate(newDate);
    if (hasEndDate && customDaysCount > 1) {
      setEndDate(calculateEndDate(newDate, customDaysCount));
    } else {
      setEndDate(newDate);
    }
  };

  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    if (newEnd && newEnd >= logDate) {
      const start = new Date(logDate);
      const end = new Date(newEnd);
      const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      setCustomDaysCount(Math.max(1, diff));
    }
  };

  // Filter types by active category or movement search query (real-time)
  const filteredTypes = useMemo(() => {
    const q = movementSearchTerm.trim().toLowerCase();
    if (q) {
      return MOVEMENT_TYPES.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          (m.leaveType && m.leaveType.toLowerCase().includes(q)) ||
          m.category.toLowerCase().includes(q)
      );
    }
    return MOVEMENT_TYPES.filter((m) => m.category === activeCategory);
  }, [activeCategory, movementSearchTerm]);

  // Calculate days count
  const daysCount = useMemo(() => {
    if (!hasEndDate || !endDate || endDate <= logDate) return 1;
    const start = new Date(logDate);
    const end = new Date(endDate);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  }, [logDate, hasEndDate, endDate]);

  // Handle Form Submission
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmp) return;

    setIsSaving(true);
    setSuccessNotice(null);

    try {
      const recordId = `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const newRecord: AttendanceRecord = {
        id: recordId,
        employeeId: currentEmp.id,
        employeeName: currentEmp.fullName,
        employeeNumber: currentEmp.employeeNumber,
        department: currentEmp.department,
        contractType: currentEmp.contractType,
        date: logDate,
        endDate: hasEndDate ? endDate : undefined,
        status: selectedMovement.status,
        category: selectedMovement.category,
        movementType: selectedMovement.id,
        movementTitle: selectedMovement.title,
        leaveType: selectedMovement.leaveType,
        timePermissionMinutes:
          selectedMovement.category === 'time_permission' || selectedMovement.id === 'excused_delay'
            ? timeMinutes
            : undefined,
        timePermissionType: selectedMovement.timePermissionType,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        durationDays: daysCount,
        customLeaveDays: selectedMovement.category === 'leave' ? daysCount : undefined,
        deductFromAnnualBalance: deductFromBalance,
        orderNumber: orderNumber.trim() || undefined,
        orderDate: orderDate || undefined,
        destination: destination.trim() || undefined,
        approvedBy: approvedBy.trim() || currentUser?.fullName || undefined,
        notes: notes.trim() || undefined,
        recordedBy: currentUser?.fullName || 'مسؤول النظام',
        createdAt: new Date().toISOString(),
      };

      // 1. Save Attendance Log
      await saveAttendanceLogsBatch([newRecord]);

      // 2. If it deducts from employee annual leave balance, update employee
      let updatedEmp: Employee | undefined = undefined;
      if (deductFromBalance && currentEmp) {
        const daysToDeduct = daysCount;
        const newRemaining = Math.max(0, currentEmp.remainingBalance - daysToDeduct);
        const newUsed = currentEmp.usedBalance + daysToDeduct;

        updatedEmp = {
          ...currentEmp,
          remainingBalance: newRemaining,
          usedBalance: newUsed,
          updatedAt: new Date().toISOString(),
        };

        await saveEmployee(updatedEmp);
      }

      setSuccessNotice(`تم تسجيل حركة (${selectedMovement.title}) للموظف ${currentEmp.fullName} بنجاح.`);
      onRecordSaved(newRecord, updatedEmp);

      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Error saving movement record:', err);
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl my-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  تسجيل حركة وموقف دوام تفصيلي للموظف
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold border border-amber-300/60">
                  منظومة الخدمة المدنية 2026
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                إجازات اعتيادية ومرضية، زمنيات ساعية، إيفادات، خفارات، وعقوبات مع ربط الأرصدة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto text-xs">
          {/* 1. Target Employee Selector & Searchable Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-600" />
                <span>الموظف المعني بالحركة أو الإجازة:</span>
              </label>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                إجمالي الكادر: <span className="font-bold font-mono">{employees.length}</span> موظف
              </div>
            </div>

            {/* Instant Real-Time Search for Employee */}
            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={employeeSearchTerm}
                  onChange={(e) => {
                    setEmployeeSearchTerm(e.target.value);
                    setIsEmployeeSearchOpen(true);
                  }}
                  onFocus={() => setIsEmployeeSearchOpen(true)}
                  placeholder="بحث سريع عن الموظف بالاسم، الرقم الوظيفي، أو القسم..."
                  className="w-full pr-10 pl-9 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 shadow-xs"
                />
                {employeeSearchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmployeeSearchTerm('');
                      setIsEmployeeSearchOpen(false);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Instant Search Results Dropdown */}
              {isEmployeeSearchOpen && employeeSearchTerm.trim() && (
                <div className="absolute z-30 mt-1.5 w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-h-56 overflow-y-auto p-1.5 space-y-1">
                  {searchedEmployees.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 text-xs">
                      لا يوجد موظف يطابق "{employeeSearchTerm}"
                    </div>
                  ) : (
                    searchedEmployees.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setSelectedEmpId(emp.id);
                          setEmployeeSearchTerm('');
                          setIsEmployeeSearchOpen(false);
                        }}
                        className={`w-full p-2.5 rounded-xl text-right transition-colors flex items-center justify-between gap-3 text-xs cursor-pointer ${
                          selectedEmpId === emp.id
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold flex items-center gap-2">
                            <span>{emp.fullName}</span>
                            <span className="font-mono text-[10px] text-slate-400">({emp.employeeNumber})</span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {emp.department} • {emp.contractType === 'permanent' ? 'ملاك دائم' : 'عقد وزاري'}
                          </div>
                        </div>
                        <div className="text-left shrink-0 flex items-center gap-1.5">
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            رصيد: {emp.remainingBalance} يوم
                          </span>
                          {selectedEmpId === emp.id && (
                            <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Direct Selection Dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                أو اختر من القائمة الكاملة:
              </span>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-amber-500/40"
                required
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeNumber}) — {emp.department} [رصيد: {emp.remainingBalance} يوماً]
                  </option>
                ))}
              </select>
            </div>

            {currentEmp && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/60 text-[11px]">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px]">القسم والشعبة:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {currentEmp.department}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px]">نوع الملاك:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    {currentEmp.contractType === 'permanent' ? 'ملاك دائم (36 يوماً)' : 'عقد وزاري (30 يوماً)'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px]">الرصيد المتاح الحالي:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs block">
                    {currentEmp.remainingBalance} / {currentEmp.annualBalanceLimit} يوماً
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px]">المستهلك في 2026:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-xs block">
                    {currentEmp.usedBalance} يوماً
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Movement Category Tabs */}
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
              <span>اختر تصنيف الحركة أو الإجازة:</span>
              <span className="text-[11px] text-slate-400 font-normal">
                {MOVEMENT_TYPES.length} نوع حركة متاح بالنظام
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('attendance');
                  setMovementSearchTerm('');
                }}
                className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  activeCategory === 'attendance' && !movementSearchTerm
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/25 font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span className="text-[11px]">الدوام والحضور</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveCategory('time_permission');
                  setMovementSearchTerm('');
                }}
                className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  activeCategory === 'time_permission' && !movementSearchTerm
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/25 font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="text-[11px]">الزمنيات الساعية</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveCategory('leave');
                  setMovementSearchTerm('');
                }}
                className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  activeCategory === 'leave' && !movementSearchTerm
                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-600/25 font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span className="text-[11px]">الإجازات الرسمية</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveCategory('mission');
                  setMovementSearchTerm('');
                }}
                className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  activeCategory === 'mission' && !movementSearchTerm
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm shadow-indigo-600/25 font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span className="text-[11px]">الإيفاد والمهام</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveCategory('violation');
                  setMovementSearchTerm('');
                }}
                className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  activeCategory === 'violation' && !movementSearchTerm
                    ? 'bg-rose-600 text-white border-rose-700 shadow-sm shadow-rose-600/25 font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-300'
                }`}
              >
                <AlertOctagon className="w-4 h-4" />
                <span className="text-[11px]">الغياب والعقوبات</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveCategory('holiday');
                  setMovementSearchTerm('');
                }}
                className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  activeCategory === 'holiday' && !movementSearchTerm
                    ? 'bg-slate-700 text-white border-slate-800 shadow-sm font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Award className="w-4 h-4" />
                <span className="text-[11px]">العطل الرسمية</span>
              </button>
            </div>
          </div>

          {/* 3. Detailed Movement Type Grid with Instant Search */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                حدد نوع الإجازة أو الحركة المطلوب تسجيلها:
              </span>
              {movementSearchTerm && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  مطابقة ({filteredTypes.length}) خيار
                </span>
              )}
            </div>

            {/* Instant Search in Leave & Movement Types */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={movementSearchTerm}
                onChange={(e) => setMovementSearchTerm(e.target.value)}
                placeholder="بحث في أنواع الإجازات والحركات (مثال: اعتيادية، مرضية، دراسية، أمومة، زمنية، إيفاد...)"
                className="w-full pr-10 pl-9 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
              {movementSearchTerm && (
                <button
                  type="button"
                  onClick={() => setMovementSearchTerm('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
              {filteredTypes.length === 0 ? (
                <div className="col-span-2 p-4 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  لا يوجد نوع إجازة أو حركة يطابق بحثك "{movementSearchTerm}".
                  <button
                    type="button"
                    onClick={() => setMovementSearchTerm('')}
                    className="block mx-auto mt-1.5 text-amber-600 font-semibold hover:underline"
                  >
                    عرض كافة الخيارات
                  </button>
                </div>
              ) : (
                filteredTypes.map((item) => {
                  const isSelected = selectedTypeId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectMovementType(item)}
                      className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white text-xs mb-0.5 flex items-center gap-2">
                          <span>{item.title}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 4. Dates & Timings Form Fields */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>فترة الحركة والتوقيت:</span>
              </span>
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasEndDate}
                  onChange={(e) => setHasEndDate(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span>الحركة تمتد لعدة أيام (تاريخ نهاية)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ الحركة (أو بدء الإجازة/الإيفاد):
                </label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>

              {hasEndDate && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ النهاية (شامل لغاية):
                  </label>
                  <input
                    type="date"
                    min={logDate}
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    required
                  />
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-semibold">
                    إجمالي المدة: {daysCount} {daysCount === 1 ? 'يوم' : daysCount === 2 ? 'يومان' : 'أيام'}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Days Input & Quick Presets (Especially for Leave & Iraqi Maternity Law) */}
            {(selectedMovement.category === 'leave' || hasEndDate) && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      عدد أيام الإجازة / مدة الحركة:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={daysCount}
                        onChange={(e) => handleSetDaysCount(Number(e.target.value))}
                        className="w-20 px-2.5 py-1 text-center font-mono font-bold text-sm rounded-xl border border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 focus:ring-2 focus:ring-amber-500/50"
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">يوماً</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    (يتم احتساب تاريخ النهاية تلقائياً)
                  </span>
                </div>

                {/* Quick Presets Buttons with Iraqi Law Standards */}
                <div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                    خيارات سريعة لعدد الأيام ومحددات القانون العراقي:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetDaysCount(1)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        daysCount === 1
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-100'
                      }`}
                    >
                      1 يوم
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDaysCount(2)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        daysCount === 2
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-100'
                      }`}
                    >
                      2 يوم
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDaysCount(3)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        daysCount === 3
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-100'
                      }`}
                    >
                      3 أيام
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDaysCount(5)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        daysCount === 5
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-100'
                      }`}
                    >
                      5 أيام
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDaysCount(21)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        daysCount === 21
                          ? 'bg-pink-600 text-white border-pink-700'
                          : 'bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800 hover:bg-pink-100'
                      }`}
                      title="المادة 43 قانون الخدمة المدنية رقم 24 لسنة 1960"
                    >
                      21 يوماً (حامل قبل الوضع)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDaysCount(51)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        daysCount === 51
                          ? 'bg-purple-600 text-white border-purple-700'
                          : 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100'
                      }`}
                      title="المادة 43 قانون الخدمة المدنية والتشريعات النافذة"
                    >
                      51 يوماً (وضع بعد الولادة)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDaysCount(72)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        daysCount === 72
                          ? 'bg-fuchsia-600 text-white border-fuchsia-700'
                          : 'bg-fuchsia-50 dark:bg-fuchsia-950/50 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800 hover:bg-fuchsia-100'
                      }`}
                      title="21 قبل الوضع + 51 بعد الوضع = 72 يوماً تامة"
                    >
                      72 يوماً (ولادة كاملة)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDaysCount(365)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        daysCount === 365
                          ? 'bg-violet-600 text-white border-violet-700'
                          : 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 hover:bg-violet-100'
                      }`}
                      title="سنة رعاية طفل براتب تام 6 أشهر ونصف راتب 6 أشهر"
                    >
                      365 يوماً (أمومة ورعاية طفل)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Iraqi Maternity Legal Standards Information Box */}
            {(selectedMovement.id.includes('maternity') || selectedMovement.leaveType?.startsWith('maternity')) && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-300 dark:border-pink-800 text-xs space-y-1.5">
                <div className="font-bold text-pink-900 dark:text-pink-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-pink-600" />
                  <span>ضوابط إجازات الحمل والوضع والأمومة وفق القوانين العراقية النافذة:</span>
                </div>
                <ul className="text-[11px] text-slate-700 dark:text-slate-300 list-disc list-inside space-y-0.5 leading-relaxed">
                  <li>
                    <strong className="text-pink-700 dark:text-pink-300">إجازة الحمل (21 يوماً):</strong> تستحقها الموظفة الحامل قبل موعد الوضع المتوقع استناداً لتقرير طبي مصدق (مادة 43 قانون الخدمة المدنية رقم 24 لسنة 1960).
                  </li>
                  <li>
                    <strong className="text-purple-700 dark:text-purple-300">إجازة الوضع (51 يوماً):</strong> تستحقها الموظفة بعد الوضع مباشرة براتب ومخصصات تامة.
                  </li>
                  <li>
                    <strong className="text-fuchsia-700 dark:text-fuchsia-300">إجمالي مدة الولادة (72 يوماً):</strong> 21 يوماً قبل الوضع + 51 يوماً بعد الوضع براتب كامل ولا تستقطع مطلقاً من رصيد الإجازات الاعتيادي.
                  </li>
                  <li>
                    <strong className="text-violet-700 dark:text-violet-300">إجازة الأمومة (سنة كاملة):</strong> 6 أشهر الأولى براتب تام و6 أشهر الثانية بنصف راتب لرعاية الطفل.
                  </li>
                </ul>
              </div>
            )}

            {/* Time details for Permissions & Delays */}
            {(selectedMovement.category === 'time_permission' ||
              selectedMovement.id === 'excused_delay' ||
              selectedMovement.id === 'viol_delay_unexcused') && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المدة بالدقائق:
                  </label>
                  <select
                    value={timeMinutes}
                    onChange={(e) => setTimeMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  >
                    <option value={30}>نصف ساعة (30 دقيقة)</option>
                    <option value={60}>ساعة واحدة (60 دقيقة)</option>
                    <option value={90}>ساعة ونصف (90 دقيقة)</option>
                    <option value={120}>ساعتان (120 دقيقة)</option>
                    <option value={180}>3 ساعات (180 دقيقة)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    من الساعة (وقت البدء):
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    إلى الساعة (وقت الانتهاء):
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* Deduct from balance toggle */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deductFromBalance}
                    onChange={(e) => setDeductFromBalance(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-400"
                  />
                  <span>خصم الحركة من رصيد الإجازات السنوي للموظف</span>
                </label>
                <p className="text-[10px] text-slate-500 mr-6">
                  {deductFromBalance
                    ? `سيتم إنقاص ${daysCount} يوم من رصيد الموظف (المتبقي الجديد: ${
                        currentEmp ? Math.max(0, currentEmp.remainingBalance - daysCount) : 0
                      } يوماً)`
                    : 'لن يتم التأثير على رصيد الإجازات السنوي (إجازة مبررة أو مدفوعة بموجب القانون)'}
                </p>
              </div>
              {deductFromBalance && currentEmp && (
                <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300">
                  سيتبقى: {Math.max(0, currentEmp.remainingBalance - daysCount)} يوم
                </span>
              )}
            </div>
          </div>

          {/* 5. Administrative Documentation & Notes */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>التوثيق الرسمي والأمر الإداري:</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الأمر الإداري / الاستمارة:
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="مثال: ق/إ/1042"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ صدور الأمر الإداري:
                </label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الجهة الموفد إليها / المستشفى / اللجنة:
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="مثال: مستشفى بغداد التعليمي / محافظة البصرة"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المسؤول المانح للموافقة:
                </label>
                <input
                  type="text"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  placeholder="المدير العام / معاون المدير / مدير القسم"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات أو مبررات الحركة:
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي تفاصيل قانونية أو ملحقة بالحركة..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Success Notice */}
          {successNotice && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2 font-bold text-xs animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-semibold"
            >
              إلغاء الأمر
            </button>

            <button
              type="submit"
              disabled={isSaving || !currentEmp}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-[0.99] text-white font-bold shadow-md shadow-amber-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'جارٍ الحفظ في IndexedDB...' : 'اعتماد وتسجيل الحركة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
