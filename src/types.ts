export type UserRole = 'super_admin' | 'hr_director' | 'attendance_officer' | 'auditor';

export interface UserAccount {
  username: string;
  fullName: string;
  jobTitle: string;
  department: string;
  role: UserRole;
  roleTitleAr: string;
  avatarColor: string;
  permissions: {
    canEditAttendance: boolean;
    canApproveLeaves: boolean;
    canDeleteRecords: boolean;
    canGenerateReports: boolean;
    canAccessMasterSettings: boolean;
  };
}

export type ContractType = 'permanent' | 'contract' | 'temporary' | 'daily';

export interface Employee {
  id: string; // المعرف الفريد
  employeeNumber: string; // الرقم الوظيفي الرسمي
  fullName: string; // الاسم الرباعي واللقب
  department: string; // القسم أو التشكيل
  division?: string; // الشعبة
  jobTitle: string; // العنوان الوظيفي
  contractType: ContractType; // نوع التوظيف (ملاك دائم / عقد)
  hireDate: string; // تاريخ المباشرة أو التعيين
  annualBalanceLimit: number; // رصيد الإجازات السنوي (36 للملاك، 30 للعقد)
  usedBalance: number; // المستهلك
  remainingBalance: number; // المتبقي
  monthlyRate: number; // الاستحقاق الشهري (3 أيام للملاك، 4 أيام للعقد)
  isAccumulative: boolean; // هل الإجازات تراكمية
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRulesSettings {
  permanentAnnualBalance: number; // 36
  permanentMonthlyRate: number; // 3
  permanentAccumulative: boolean; // true
  contractAnnualBalance: number; // 30
  contractMonthlyRate: number; // 4
  contractAccumulative: boolean; // false
  maxTimePermissionsHoursMonthly: number; // الحد الأقصى لساعات الزمنية شهرياً (مثلاً 4 ساعات)
  timePermissionHoursToLeaveDay: number; // كم ساعة زمنيات تعادل إجازة يوم اعتيادي (مثلاً 7 ساعات)
  earlyWarningThresholdDays: number; // حد التنبيه المبكر عند وصول الرصيد إلى أقل من X أيام

  // ضوابط وقوانين إجازات الحامل والوضع والأمومة وفق القوانين العراقية
  maternityPreDays: number; // إجازة ما قبل الوضع للحامل براتب تام (21 يوماً وفق قانون الخدمة المدنية وقانون العمل)
  maternityPostDays: number; // إجازة ما بعد الوضع براتب تام (51 يوماً)
  maternityTotalDeliveryDays: number; // إجمالي إجازة الحمل والوضع (72 يوماً = 21 قبل + 51 بعد)
  maternityChildCareDays: number; // إجازة الأمومة ورعاية الطفل (365 يوماً - سنة كاملة)
  maternityChildCareFirstHalfPaid?: boolean; // أول 6 أشهر براتب تام و6 أشهر بنصف راتب
}

export type LeaveType =
  | 'annual'
  | 'sick'
  | 'unpaid'
  | 'maternity'
  | 'maternity_pre_21' // إجازة ما قبل الوضع للحامل (21 يوماً)
  | 'maternity_post_51' // إجازة ما بعد الوضع (51 يوماً)
  | 'maternity_full_72' // إجازة الحمل والوضع التامة (72 يوماً: 21 قبل + 51 بعد)
  | 'maternity_care_year' // إجازة الأمومة ورعاية الطفل (سنة كاملة)
  | 'study'
  | 'bereavement'
  | 'hajj'
  | 'marriage';

export interface OrganizationSettings {
  ministryName: string; // اسم الوزارة (مثال: وزارة التعليم العالي والبحث العلمي)
  directorateName: string; // اسم الدائرة / التشكيل
  departmentName: string; // اسم القسم / الشعبة
  officialEmblem: 'gold' | 'dark' | 'crest';
  operatingYear: number;
}

export type FontFamilyOption =
  | 'Readex Pro'
  | 'Cairo'
  | 'Alexandria'
  | 'Almarai'
  | 'Tajawal'
  | 'IBM Plex Sans Arabic'
  | 'Noto Sans Arabic';

export interface AppearanceSettings {
  showStatsCards: boolean;
  compactTable: boolean;
  showDigitalClock: boolean;
  showEarlyWarningBadges: boolean;
  fontSize: 'compact' | 'normal' | 'large';
  accentTone: 'amber' | 'emerald' | 'blue';
  fontFamily?: FontFamilyOption;
  navigationLayout?: 'dashboard_hub' | 'sidebar'; // 'dashboard_hub' = لوحة التحكم المركزية بالأزرار الملونة | 'sidebar' = القائمة الجانبية المستمرة
}

export type HolidayCategory =
  | 'national' // مناسبات وطنية وقومية
  | 'religious_islamic' // مناسبات دينية إسلامية
  | 'religious_christian' // مناسبات دينية مسيحية
  | 'religious_other' // مناسبات الأديان الأخرى (إيزيديون، صابئة مندائيون)
  | 'international' // مناسبات دولية وعالمية
  | 'cabinet_special'; // قرارات رئاسة مجلس الوزراء الخاصة والاستثنائية

export interface OfficialHoliday {
  id: string;
  title: string; // مسمى العطلة أو المناسبة
  date: string; // YYYY-MM-DD
  endDate?: string; // تاريخ انتهاء العطلة إذا كانت ممتدة
  durationDays: number; // عدد الأيام
  isOfficialOff: boolean; // عطلة رسمية معطلة للدوام (true) أو مناسبة بدون تعطيل (false)
  category: HolidayCategory;
  cabinetDecreeNumber?: string; // رقم قرار مجلس الوزراء أو السند القانوني
  decreeDate?: string;
  applicableTarget?: 'all' | 'central_ministries' | 'governorates' | 'specific_groups';
  notes?: string;
  isCirculated?: boolean; // هل تم تعميم العطلة على سجلات دوام الموظفين
  circulatedAt?: string;
  year?: number;
}

export interface SystemUserAccount extends UserAccount {
  id: string;
  passwordHash: string; // أو كلمة المرور للمنظومة المحلية
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'leave'
  | 'time_permission'
  | 'official_holiday'
  | 'mission'
  | 'duty';

export type MovementCategory =
  | 'attendance' // الحضور والدوام والمناوبات
  | 'time_permission' // الزمنيات والأذونات الساعية
  | 'leave' // الإجازات الرسمية بأنواعها
  | 'mission' // الإيفادات والمهام واللجان
  | 'violation' // الغيابات والتأخير والعقوبات
  | 'holiday'; // العطل الرسمية

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  contractType: ContractType;
  date: string; // YYYY-MM-DD
  endDate?: string; // تاريخ نهاية الحركة إذا كانت تمتد لعدة أيام
  status: AttendanceStatus;
  
  // Extended Movement categorization
  category?: MovementCategory;
  movementType?: string; // نوع الحركة الدقيق (إجازة اعتيادية، زمنية صباحية، إيفاد، خفارة...)
  movementTitle?: string; // مسمى الحركة للعرض
  
  // Hours, minutes, and timings
  timePermissionMinutes?: number; // للموظف الحاصل على زمنية
  timePermissionType?: 'morning' | 'noon' | 'evening'; // صباحية أو ظهيرة أو مسائية
  startTime?: string; // مثلاً 08:30
  endTime?: string; // مثلاً 11:30
  durationDays?: number; // عدد الأيام
  durationHours?: number; // عدد الساعات
  
  // Leave specific
  leaveType?: LeaveType;
  customLeaveDays?: number; // عدد أيام الإجازة المحددة (مثلاً 21 للحامل، 51 للوضع، أو أي عدد مخصص)
  deductFromAnnualBalance?: boolean; // هل تخصم من الرصيد السنوي للموظف
  
  // Administrative Order & Details
  orderNumber?: string; // رقم الأمر الإداري / الاستمارة
  orderDate?: string; // تاريخ صدور الأمر الإداري
  destination?: string; // الجهة المقصودة أو الموفد إليها أو المستشفى
  approvedBy?: string; // المسؤول أو المدير المانح للموافقة
  
  notes?: string;
  recordedBy?: string;
  createdAt?: string;
}

export interface DatabaseBackupPayload {
  system: 'GovPersonnelDB';
  version: number;
  backupDate: string;
  appVersion: string;
  metadata: {
    systemTitle: string;
    operatingYear: number;
    exportTimestamp: number;
    exportedBy?: string;
    developer: {
      name: string;
      phone: string;
      telegram: string;
    };
  };
  statistics: {
    employeesCount: number;
    attendanceSheetsCount: number;
    settingsCount: number;
    usersCount: number;
    attendanceLogsCount: number;
  };
  data: {
    employees: Employee[];
    attendanceSheets: any[];
    systemSettings: { key: string; value: any }[];
    systemUsers: SystemUserAccount[];
    attendanceLogs: AttendanceRecord[];
  };
}

export type WorkspaceTab =
  | 'dashboard'
  | 'employees'
  | 'daily_movements'
  | 'reports'
  | 'calendar'
  | 'settings'
  | 'profile'
  | 'db_test'
  | 'backup'
  | 'movement_designer';


