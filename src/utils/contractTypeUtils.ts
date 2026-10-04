import { ContractType, EmploymentTypeLabelsSettings, DEFAULT_EMPLOYMENT_TYPE_LABELS, Employee } from '../types';

/**
 * دالة مركزية لجلب المسمى الوظيفي المعتمد لنوع الملاك / التعاقد وفق إعدادات المنظومة المخزنة في IndexedDB
 */
export function getContractTypeLabel(
  contractType: ContractType | string | undefined | null,
  customLabels?: Partial<EmploymentTypeLabelsSettings> | null
): string {
  const labels: EmploymentTypeLabelsSettings = {
    ...DEFAULT_EMPLOYMENT_TYPE_LABELS,
    ...(customLabels || {}),
  };

  if (!contractType) {
    return labels.permanent;
  }

  const normalized = String(contractType).trim().toLowerCase();

  if (normalized === 'permanent' || normalized === 'ملاك' || normalized.includes('دائم')) {
    return labels.permanent || DEFAULT_EMPLOYMENT_TYPE_LABELS.permanent;
  }

  if (
    normalized === 'contract' ||
    normalized === 'عقد' ||
    normalized.includes('315') ||
    normalized.includes('وزاري')
  ) {
    return labels.contract || DEFAULT_EMPLOYMENT_TYPE_LABELS.contract;
  }

  if (normalized === 'temporary' || normalized === 'مؤقت' || normalized.includes('أجر')) {
    return labels.temporary || DEFAULT_EMPLOYMENT_TYPE_LABELS.temporary || 'أجر يومي / مؤقت';
  }

  if (normalized === 'daily' || normalized.includes('يومية')) {
    return labels.daily || DEFAULT_EMPLOYMENT_TYPE_LABELS.daily || 'أجور يومية';
  }

  // If already customized Arabic string or unknown
  return String(contractType);
}

/**
 * ألوان وتنسيقات الشارات المعتمدة وفق واجهة macOS الحديثة
 */
export function getContractTypeBadgeClasses(contractType: ContractType | string | undefined | null): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const normalized = String(contractType || 'permanent').trim().toLowerCase();

  if (normalized === 'permanent' || normalized === 'ملاك' || normalized.includes('دائم')) {
    return {
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      dot: 'bg-amber-500',
    };
  }

  if (
    normalized === 'contract' ||
    normalized === 'عقد' ||
    normalized.includes('315') ||
    normalized.includes('وزاري')
  ) {
    return {
      bg: 'bg-blue-50 dark:bg-blue-950/50',
      text: 'text-blue-800 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      dot: 'bg-blue-500',
    };
  }

  if (normalized === 'temporary' || normalized === 'daily') {
    return {
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      text: 'text-emerald-800 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      dot: 'bg-emerald-500',
    };
  }

  return {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
  };
}

/**
 * مطابقة الصفة الوظيفية بدقة لكل موظف استناداً إلى بياناته المخزنة في IndexedDB
 * لمنع أي تداخل أو ثبات على نوع واحد
 */
export function resolveEmployeeContractType(
  empId: string | undefined,
  recordContractType: ContractType | string | undefined,
  employeesSource?: Employee[] | Map<string, Employee> | Record<string, Employee>
): ContractType {
  if (!empId && !recordContractType) return 'permanent';

  let foundEmp: Employee | undefined;

  if (empId && employeesSource) {
    if (employeesSource instanceof Map) {
      foundEmp = employeesSource.get(empId);
    } else if (Array.isArray(employeesSource)) {
      foundEmp = employeesSource.find((e) => e.id === empId);
    } else if (typeof employeesSource === 'object') {
      foundEmp = employeesSource[empId];
    }
  }

  // Priority 1: Current official Employee data in IndexedDB
  if (foundEmp && foundEmp.contractType) {
    return foundEmp.contractType;
  }

  // Priority 2: Record's own contractType
  if (recordContractType) {
    const s = String(recordContractType).toLowerCase();
    if (s.includes('contract') || s.includes('عقد')) return 'contract';
    if (s.includes('temporary') || s.includes('مؤقت')) return 'temporary';
    if (s.includes('daily') || s.includes('أجور')) return 'daily';
    return 'permanent';
  }

  return 'permanent';
}
