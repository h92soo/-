/**
 * محرك قاعدة البيانات المحلية المدمجة (IndexedDB)
 * المنظومة: المنهج الرقمي للإدارة الحكومية (تشغيل 2026)
 * المطور: المهندس حسين عبد المنذر
 * 
 * هذا الملف يهيئ الاتصال الآمن والمحلي بقاعدة بيانات IndexedDB المتوافقة
 * كلياً مع العمل دون إنترنت (Offline-First) وتطبيقات سطح المكتب (Electron).
 */

import {
  Employee,
  LeaveRulesSettings,
  AppearanceSettings,
  SystemUserAccount,
  AttendanceRecord,
  DatabaseBackupPayload,
  OfficialHoliday,
  EmploymentTypeLabelsSettings,
  DEFAULT_EMPLOYMENT_TYPE_LABELS,
  CareerTimelineEvent,
  AllowanceRecord,
  PromotionRecord,
  BarcodeScanLog,
  CareerSystemSettings,
  DEFAULT_CAREER_SETTINGS,
  ArchivedDocument,
} from '../types';
import { IRAQ_CABINET_HOLIDAYS_PRESET } from '../data/iraqHolidaysData';

export const DB_NAME = 'GovPersonnelDB_2026';
export const DB_VERSION = 4;
export const STORE_EMPLOYEES = 'employees';
export const STORE_ATTENDANCE = 'attendance_sheets';
export const STORE_SETTINGS = 'system_settings';
export const STORE_USERS = 'system_users';
export const STORE_ATTENDANCE_LOGS = 'attendance_logs';
export const STORE_TIMELINE = 'career_timeline';
export const STORE_ALLOWANCES = 'allowance_records';
export const STORE_PROMOTIONS = 'promotion_records';
export const STORE_BARCODE_LOGS = 'barcode_scan_logs';
export const STORE_ARCHIVE = 'archived_documents';

export const DEFAULT_LEAVE_RULES: LeaveRulesSettings = {
  permanentAnnualBalance: 36,
  permanentMonthlyRate: 3,
  permanentAccumulative: true,
  contractAnnualBalance: 30,
  contractMonthlyRate: 4,
  contractAccumulative: false,
  maxTimePermissionsHoursMonthly: 4,
  timePermissionHoursToLeaveDay: 7,
  earlyWarningThresholdDays: 5,
  // إجازات الحامل والوضع والأمومة وفق القوانين والتشريعات العراقية النافذة
  maternityPreDays: 21, // إجازة ما قبل الوضع للحامل براتب تام (21 يوماً)
  maternityPostDays: 51, // إجازة ما بعد الوضع براتب تام (51 يوماً)
  maternityTotalDeliveryDays: 72, // إجمالي إجازة الحمل والوضع (72 يوماً = 21 + 51)
  maternityChildCareDays: 365, // إجازة الأمومة ورعاية الطفل (سنة كاملة)
  maternityChildCareFirstHalfPaid: true,
};

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  showStatsCards: true,
  compactTable: false,
  showDigitalClock: true,
  showEarlyWarningBadges: true,
  fontSize: 'normal',
  accentTone: 'amber',
  fontFamily: 'Readex Pro',
};

/**
 * فتح وتهيئة قاعدة بيانات IndexedDB وترقية الجداول (Object Stores)
 */
export function openGovDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('متصفحك أو بيئة التشغيل لا تدعم تقنية IndexedDB.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. جدول الموظفين (Employees Store)
      if (!db.objectStoreNames.contains(STORE_EMPLOYEES)) {
        const employeeStore = db.createObjectStore(STORE_EMPLOYEES, { keyPath: 'id' });
        employeeStore.createIndex('employeeNumber', 'employeeNumber', { unique: true });
        employeeStore.createIndex('fullName', 'fullName', { unique: false });
        employeeStore.createIndex('department', 'department', { unique: false });
        employeeStore.createIndex('contractType', 'contractType', { unique: false });
      }

      // 2. جدول حركات الحضور والغياب (Attendance Store)
      if (!db.objectStoreNames.contains(STORE_ATTENDANCE)) {
        const attendanceStore = db.createObjectStore(STORE_ATTENDANCE, { keyPath: 'id' });
        attendanceStore.createIndex('employeeYearMonth', ['employeeId', 'year', 'month'], { unique: true });
      }

      // 3. جدول الإعدادات المركزية (Settings Store)
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }

      // 4. جدول حسابات المستخدمين وصلاحياتهم (System Users Store)
      if (!db.objectStoreNames.contains(STORE_USERS)) {
        const usersStore = db.createObjectStore(STORE_USERS, { keyPath: 'id' });
        usersStore.createIndex('username', 'username', { unique: true });
      }

      // 5. سجل الحضور والغياب اليومي والتفصيلي (Attendance Logs Store)
      if (!db.objectStoreNames.contains(STORE_ATTENDANCE_LOGS)) {
        const logsStore = db.createObjectStore(STORE_ATTENDANCE_LOGS, { keyPath: 'id' });
        logsStore.createIndex('date', 'date', { unique: false });
        logsStore.createIndex('employeeId', 'employeeId', { unique: false });
        logsStore.createIndex('status', 'status', { unique: false });
      }

      // 6. السجل الزمني والتاريخ المهني الموحد (Career Timeline Store)
      if (!db.objectStoreNames.contains(STORE_TIMELINE)) {
        const timelineStore = db.createObjectStore(STORE_TIMELINE, { keyPath: 'id' });
        timelineStore.createIndex('employeeId', 'employeeId', { unique: false });
        timelineStore.createIndex('date', 'date', { unique: false });
        timelineStore.createIndex('category', 'category', { unique: false });
      }

      // 7. سجل العلاوات السنوية (Allowances Store)
      if (!db.objectStoreNames.contains(STORE_ALLOWANCES)) {
        const allowancesStore = db.createObjectStore(STORE_ALLOWANCES, { keyPath: 'id' });
        allowancesStore.createIndex('employeeId', 'employeeId', { unique: false });
        allowancesStore.createIndex('grantDate', 'grantDate', { unique: false });
        allowancesStore.createIndex('status', 'status', { unique: false });
      }

      // 8. سجل الترفيعات الوظيفية (Promotions Store)
      if (!db.objectStoreNames.contains(STORE_PROMOTIONS)) {
        const promotionsStore = db.createObjectStore(STORE_PROMOTIONS, { keyPath: 'id' });
        promotionsStore.createIndex('employeeId', 'employeeId', { unique: false });
        promotionsStore.createIndex('effectiveDate', 'effectiveDate', { unique: false });
      }

      // 9. سجل عمليات مسح الباركود والبطاقات الذكية (Barcode Logs Store)
      if (!db.objectStoreNames.contains(STORE_BARCODE_LOGS)) {
        const barcodeStore = db.createObjectStore(STORE_BARCODE_LOGS, { keyPath: 'id' });
        barcodeStore.createIndex('scanTime', 'scanTime', { unique: false });
        barcodeStore.createIndex('barcode', 'barcode', { unique: false });
        barcodeStore.createIndex('employeeId', 'employeeId', { unique: false });
      }

      // 10. جدول مستندات وأضابير الأرشفة الإلكترونية الشاملة (Archived Documents Store)
      if (!db.objectStoreNames.contains(STORE_ARCHIVE)) {
        const archiveStore = db.createObjectStore(STORE_ARCHIVE, { keyPath: 'id' });
        archiveStore.createIndex('employeeId', 'employeeId', { unique: false });
        archiveStore.createIndex('category', 'category', { unique: false });
        archiveStore.createIndex('documentDate', 'documentDate', { unique: false });
        archiveStore.createIndex('referenceNumber', 'referenceNumber', { unique: false });
        archiveStore.createIndex('isHandwritten', 'isHandwritten', { unique: false });
        archiveStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error(`فشل فتح قاعدة البيانات: ${request.error?.message}`));
    };
  });
}

/**
 * حفظ أو تحديث سجل موظف في IndexedDB
 * @param employee كائن بيانات الموظف
 * @returns معرّف الموظف المحفوظ
 */
export async function saveEmployee(employee: Employee): Promise<string> {
  const db = await openGovDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_EMPLOYEES], 'readwrite');
    const store = transaction.objectStore(STORE_EMPLOYEES);

    const recordWithTimestamps: Employee = {
      ...employee,
      updatedAt: new Date().toISOString(),
      createdAt: employee.createdAt || new Date().toISOString(),
    };

    const request = store.put(recordWithTimestamps);

    request.onsuccess = () => {
      resolve(employee.id);
    };

    request.onerror = () => {
      reject(new Error(`فشل حفظ سجل الموظف: ${request.error?.message}`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * استرجاع سجل موظف واحد بواسطة معرّفه (ID)
 * @param id المعرف الفريد للموظف
 * @returns كائن الموظف أو undefined إذا لم يوجد
 */
export async function getEmployeeById(id: string): Promise<Employee | undefined> {
  const db = await openGovDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_EMPLOYEES], 'readonly');
    const store = transaction.objectStore(STORE_EMPLOYEES);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result as Employee | undefined);
    };

    request.onerror = () => {
      reject(new Error(`فشل استرجاع سجل الموظف: ${request.error?.message}`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * استرجاع كافة سجلات الموظفين المخزنة محلياً
 */
export async function getAllEmployees(): Promise<Employee[]> {
  const db = await openGovDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_EMPLOYEES], 'readonly');
    const store = transaction.objectStore(STORE_EMPLOYEES);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve((request.result as Employee[]) || []);
    };

    request.onerror = () => {
      reject(new Error(`فشل استرجاع قائمة الموظفين: ${request.error?.message}`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * حذف موظف بواسطة المعرّف
 */
export async function deleteEmployeeById(id: string): Promise<boolean> {
  const db = await openGovDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_EMPLOYEES], 'readwrite');
    const store = transaction.objectStore(STORE_EMPLOYEES);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = () => {
      reject(new Error(`فشل حذف الموظف: ${request.error?.message}`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * حفظ أو تحديث مجموعة موظفين دفعة واحدة (Batch Save)
 * معالجة فائقة السرعة مع حماية كاملة من تعليق المعاملات وتفادي تضارب الأرقام الوظيفية
 */
export async function saveEmployeesBatch(employees: Employee[]): Promise<number> {
  if (!employees || !employees.length) return 0;

  return new Promise(async (resolve, reject) => {
    let isSettled = false;
    let activeDb: IDBDatabase | null = null;

    // Safety timeout to prevent any permanent hang
    const safetyTimer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        try {
          if (activeDb) activeDb.close();
        } catch {}
        reject(new Error('انتهت مهلة حفظ السجلات في قاعدة البيانات المحلية (IndexedDB).'));
      }
    }, 8000);

    const finish = (result: number | Error, isError = false) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(safetyTimer);
      try {
        if (activeDb) activeDb.close();
      } catch {}

      if (isError) {
        reject(result instanceof Error ? result : new Error(String(result)));
      } else {
        resolve(result as number);
      }
    };

    try {
      const db = await openGovDB();
      activeDb = db;

      const transaction = db.transaction([STORE_EMPLOYEES], 'readwrite');
      const store = transaction.objectStore(STORE_EMPLOYEES);

      transaction.oncomplete = () => {
        finish(successCount);
      };

      transaction.onerror = () => {
        finish(
          new Error(`فشل حفظ مجموعة الموظفين في IndexedDB: ${transaction.error?.message || 'خطأ غير معروف'}`),
          true
        );
      };

      transaction.onabort = () => {
        finish(
          new Error(`تم إلغاء عملية حفظ الموظفين: ${transaction.error?.message || 'تم إلغاء المعاملة'}`),
          true
        );
      };

      let successCount = 0;

      // First, get all existing records to avoid unique index (employeeNumber) collisions
      const getAllReq = store.getAll();

      getAllReq.onsuccess = () => {
        try {
          const existingRecords = (getAllReq.result as Employee[]) || [];
          const existingNumToIdMap = new Map<string, string>();
          const existingIdSet = new Set<string>();

          existingRecords.forEach((rec) => {
            if (rec.employeeNumber) {
              existingNumToIdMap.set(rec.employeeNumber.trim(), rec.id);
            }
            if (rec.id) {
              existingIdSet.add(rec.id);
            }
          });

          const seenInBatch = new Set<string>();
          const baseTimestamp = Date.now() % 100000;

          employees.forEach((emp, index) => {
            let employeeNumber = (emp.employeeNumber || '').trim();

            // Auto-generate employeeNumber if missing
            if (!employeeNumber) {
              employeeNumber = `IQ-GOV-${baseTimestamp}-${String(index + 1).padStart(4, '0')}`;
            }

            // Check if this employeeNumber already exists in IndexedDB
            const existingIdForNumber = existingNumToIdMap.get(employeeNumber);
            let targetId = emp.id;

            if (existingIdForNumber) {
              // Update existing employee to prevent unique constraint error
              targetId = existingIdForNumber;
            } else {
              // If number duplicated within this batch, give it a unique suffix
              if (seenInBatch.has(employeeNumber)) {
                employeeNumber = `${employeeNumber}-${index + 1}`;
              }
              if (!targetId || existingIdSet.has(targetId)) {
                targetId = `EMP-${Date.now()}-${index + 1}-${Math.random().toString(36).substring(2, 6)}`;
              }
            }

            seenInBatch.add(employeeNumber);
            if (targetId) existingIdSet.add(targetId);

            const record: Employee = {
              id: targetId,
              employeeNumber,
              fullName: (emp.fullName || `موظف جديد (${index + 1})`).trim(),
              department: emp.department || 'القسم الإداري العام',
              division: emp.division || 'الديوان العام',
              jobTitle: emp.jobTitle || 'موظف',
              contractType: emp.contractType || 'permanent',
              hireDate: emp.hireDate || '2024-01-01',
              annualBalanceLimit: emp.annualBalanceLimit ?? (emp.contractType === 'contract' ? 30 : 36),
              usedBalance: emp.usedBalance ?? 0,
              remainingBalance:
                emp.remainingBalance ??
                Math.max(
                  0,
                  (emp.annualBalanceLimit ?? (emp.contractType === 'contract' ? 30 : 36)) -
                    (emp.usedBalance ?? 0)
                ),
              monthlyRate: emp.monthlyRate ?? (emp.contractType === 'contract' ? 4 : 3),
              isAccumulative: emp.isAccumulative ?? (emp.contractType !== 'contract'),
              phone: emp.phone || '',
              notes: emp.notes || 'مستورد عبر ملف إكسل',
              updatedAt: new Date().toISOString(),
              createdAt: emp.createdAt || new Date().toISOString(),
            };

            const putReq = store.put(record);
            putReq.onerror = (e) => {
              // Prevent transaction abort on individual record conflict
              e.preventDefault();
              e.stopPropagation();
              console.warn('Skipped record during batch save:', record.employeeNumber, putReq.error);
            };
            successCount++;
          });
        } catch (innerErr: any) {
          finish(innerErr, true);
        }
      };

      getAllReq.onerror = () => {
        // Fallback: put directly if getAll fails
        try {
          employees.forEach((emp, index) => {
            const record: Employee = {
              ...emp,
              id: emp.id || `EMP-${Date.now()}-${index + 1}`,
              updatedAt: new Date().toISOString(),
              createdAt: emp.createdAt || new Date().toISOString(),
            };
            store.put(record);
            successCount++;
          });
        } catch (err: any) {
          finish(err, true);
        }
      };
    } catch (err: any) {
      finish(err, true);
    }
  });
}

/**
 * حذف مجموعة موظفين دفعة واحدة (Batch Delete)
 */
export async function deleteEmployeesBatch(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const db = await openGovDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_EMPLOYEES], 'readwrite');
    const store = transaction.objectStore(STORE_EMPLOYEES);
    let count = 0;

    ids.forEach((id) => {
      store.delete(id);
      count++;
    });

    transaction.oncomplete = () => {
      db.close();
      resolve(count);
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error(`فشل حذف مجموعة الموظفين: ${transaction.error?.message}`));
    };
  });
}

/**
 * تعديل جماعي لمجموعة موظفين (Batch Update)
 */
export async function updateEmployeesBatch(
  ids: string[],
  updates: Partial<Employee>
): Promise<number> {
  if (!ids.length) return 0;
  const db = await openGovDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_EMPLOYEES], 'readwrite');
    const store = transaction.objectStore(STORE_EMPLOYEES);
    let count = 0;

    ids.forEach((id) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const emp = getReq.result as Employee;
        if (emp) {
          const updated: Employee = {
            ...emp,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          // Recalculate remaining if limit or used changed
          if (updates.annualBalanceLimit !== undefined || updates.usedBalance !== undefined) {
            updated.remainingBalance = Math.max(
              0,
              updated.annualBalanceLimit - updated.usedBalance
            );
          }
          store.put(updated);
          count++;
        }
      };
    });

    transaction.oncomplete = () => {
      db.close();
      resolve(count);
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error(`فشل التعديل الجماعي: ${transaction.error?.message}`));
    };
  });
}

/**
 * استرجاع إعدادات المنظومة من IndexedDB
 */
export async function getSystemSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await openGovDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_SETTINGS], 'readonly');
      const store = transaction.objectStore(STORE_SETTINGS);
      const request = store.get(key);

      request.onsuccess = () => {
        db.close();
        if (request.result && request.result.value !== undefined) {
          resolve(request.result.value as T);
        } else {
          resolve(defaultValue);
        }
      };

      request.onerror = () => {
        db.close();
        resolve(defaultValue);
      };
    });
  } catch {
    return defaultValue;
  }
}

/**
 * حفظ إعدادات المنظومة في IndexedDB
 */
export async function saveSystemSetting<T>(key: string, value: T): Promise<void> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SETTINGS], 'readwrite');
    const store = transaction.objectStore(STORE_SETTINGS);
    const request = store.put({ key, value, updatedAt: new Date().toISOString() });

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`فشل حفظ الإعداد: ${request.error?.message}`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * استرجاع مسميات نوع الملاك والتوظيف المخصصة من IndexedDB
 */
export async function getEmploymentTypeLabels(): Promise<EmploymentTypeLabelsSettings> {
  return getSystemSetting<EmploymentTypeLabelsSettings>(
    'employment_type_labels',
    DEFAULT_EMPLOYMENT_TYPE_LABELS
  );
}

/**
 * حفظ مسميات نوع الملاك والتوظيف المخصصة في IndexedDB
 */
export async function saveEmploymentTypeLabels(
  labels: EmploymentTypeLabelsSettings
): Promise<void> {
  return saveSystemSetting<EmploymentTypeLabelsSettings>('employment_type_labels', labels);
}

/**
 * استرجاع كافة حسابات المستخدمين في النظام
 */
export async function getSystemUsers(): Promise<SystemUserAccount[]> {
  try {
    const db = await openGovDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_USERS], 'readonly');
      const store = transaction.objectStore(STORE_USERS);
      const request = store.getAll();

      request.onsuccess = () => {
        db.close();
        resolve((request.result as SystemUserAccount[]) || []);
      };

      request.onerror = () => {
        db.close();
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}

/**
 * حفظ أو تعديل مستخدم نظام
 */
export async function saveSystemUser(user: SystemUserAccount): Promise<void> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_USERS], 'readwrite');
    const store = transaction.objectStore(STORE_USERS);
    const request = store.put(user);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`فشل حفظ المستخدم: ${request.error?.message}`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * حذف مستخدم نظام
 */
export async function deleteSystemUser(id: string): Promise<boolean> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_USERS], 'readwrite');
    const store = transaction.objectStore(STORE_USERS);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = () => {
      reject(new Error(`فشل حذف المستخدم: ${request.error?.message}`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * استرجاع سجلات الحضور والغياب لتقرير معين
 */
export async function getAttendanceLogs(startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
  try {
    const db = await openGovDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_ATTENDANCE_LOGS], 'readonly');
      const store = transaction.objectStore(STORE_ATTENDANCE_LOGS);
      const request = store.getAll();

      request.onsuccess = () => {
        db.close();
        let logs = (request.result as AttendanceRecord[]) || [];
        if (startDate && endDate) {
          logs = logs.filter((log) => log.date >= startDate && log.date <= endDate);
        }
        resolve(logs);
      };

      request.onerror = () => {
        db.close();
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}

/**
 * استرجاع سجلات الحركات والحضور الخاصة بموظف معين
 */
export async function getAttendanceLogsByEmployee(employeeId: string): Promise<AttendanceRecord[]> {
  try {
    const allLogs = await getAttendanceLogs();
    return allLogs.filter((log) => log.employeeId === employeeId);
  } catch {
    return [];
  }
}

/**
 * حفظ سجلات الحضور والغياب
 */
export async function saveAttendanceLogsBatch(records: AttendanceRecord[]): Promise<number> {
  if (!records.length) return 0;
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_ATTENDANCE_LOGS], 'readwrite');
    const store = transaction.objectStore(STORE_ATTENDANCE_LOGS);
    let count = 0;

    records.forEach((rec) => {
      store.put(rec);
      count++;
    });

    transaction.oncomplete = () => {
      db.close();
      resolve(count);
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error(`فشل حفظ سجلات الحضور: ${transaction.error?.message}`));
    };
  });
}

/**
 * حذف سجل حركة أو حضور معين بواسطة المعرف
 */
export async function deleteAttendanceRecord(id: string): Promise<void> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_ATTENDANCE_LOGS], 'readwrite');
    const store = transaction.objectStore(STORE_ATTENDANCE_LOGS);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`فشل حذف سجل الحركة: ${request.error?.message}`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * حذف مجموعة من سجلات الحركات والحضور دفعة واحدة
 */
export async function deleteAttendanceRecordsBatch(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_ATTENDANCE_LOGS], 'readwrite');
    const store = transaction.objectStore(STORE_ATTENDANCE_LOGS);
    let count = 0;

    ids.forEach((id) => {
      store.delete(id);
      count++;
    });

    transaction.oncomplete = () => {
      db.close();
      resolve(count);
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error(`فشل حذف مجموعة الحركات: ${transaction.error?.message}`));
    };
  });
}

export const SETTING_KEY_HOLIDAYS = 'iraq_official_holidays';

/**
 * استرجاع قائمة العطل والمناسبات الرسمية من IndexedDB
 */
export async function getOfficialHolidays(): Promise<OfficialHoliday[]> {
  try {
    const saved = await getSystemSetting<OfficialHoliday[] | null>(SETTING_KEY_HOLIDAYS, null);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    // إذا لم تكن محفوظة، نقوم بتهيئة قائمة رئاسة الوزراء المعتمدة
    await saveSystemSetting(SETTING_KEY_HOLIDAYS, IRAQ_CABINET_HOLIDAYS_PRESET);
    return IRAQ_CABINET_HOLIDAYS_PRESET;
  } catch (err) {
    console.error('Error fetching official holidays:', err);
    return IRAQ_CABINET_HOLIDAYS_PRESET;
  }
}

/**
 * حفظ أو تحديث قائمة العطل والمناسبات الرسمية
 */
export async function saveOfficialHolidays(holidays: OfficialHoliday[]): Promise<void> {
  await saveSystemSetting(SETTING_KEY_HOLIDAYS, holidays);
}

/**
 * تعميم عطلة رسمية على سجلات دوام كافة الموظفين في النظام
 */
export async function circulateHolidayToAttendance(
  holiday: OfficialHoliday,
  employees: Employee[]
): Promise<{ appliedCount: number; dates: string[] }> {
  if (!employees || employees.length === 0) {
    return { appliedCount: 0, dates: [] };
  }

  // احتساب تواريخ العطلة (إذا كانت يوماً واحداً أو ممتدة لعدة أيام)
  const holidayDates: string[] = [];
  const startDate = new Date(holiday.date);
  const duration = holiday.durationDays || 1;

  for (let i = 0; i < duration; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    holidayDates.push(d.toISOString().slice(0, 10));
  }

  const generatedRecords: AttendanceRecord[] = [];
  const nowStr = new Date().toISOString();

  for (const emp of employees) {
    for (const hDate of holidayDates) {
      generatedRecords.push({
        id: `HOL-${holiday.id}-${emp.id}-${hDate}`,
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeNumber: emp.employeeNumber,
        department: emp.department,
        contractType: emp.contractType,
        date: hDate,
        status: 'official_holiday',
        category: 'holiday',
        movementType: 'official_holiday',
        movementTitle: `عطلة رسمية: ${holiday.title}`,
        orderNumber: holiday.cabinetDecreeNumber || 'قرار مجلس الوزراء',
        orderDate: holiday.decreeDate || holiday.date,
        notes: holiday.notes || 'عطلة رسمية معتمدة بتعميم رئاسة مجلس الوزراء',
        createdAt: nowStr,
      });
    }
  }

  await saveAttendanceLogsBatch(generatedRecords);

  // تحديث حالة العطلة إلى معممّة
  const allHolidays = await getOfficialHolidays();
  const updated = allHolidays.map((h) =>
    h.id === holiday.id
      ? { ...h, isCirculated: true, circulatedAt: new Date().toISOString() }
      : h
  );
  await saveOfficialHolidays(updated);

  return { appliedCount: generatedRecords.length, dates: holidayDates };
}

/**
 * إلغاء تعميم عطلة رسمية وحذف قيودها من سجلات الحضور
 */
export async function uncirculateHolidayFromAttendance(
  holidayId: string
): Promise<{ removedCount: number }> {
  const db = await openGovDB();

  return new Promise(async (resolve, reject) => {
    try {
      const tx = db.transaction([STORE_ATTENDANCE_LOGS], 'readwrite');
      const store = tx.objectStore(STORE_ATTENDANCE_LOGS);
      const req = store.getAll();

      req.onsuccess = async () => {
        const allRecords = req.result as AttendanceRecord[];
        let removed = 0;
        const prefix = `HOL-${holidayId}-`;

        allRecords.forEach((r) => {
          if (r.id && r.id.startsWith(prefix)) {
            store.delete(r.id);
            removed++;
          }
        });

        tx.oncomplete = async () => {
          db.close();
          const allHolidays = await getOfficialHolidays();
          const updated = allHolidays.map((h) =>
            h.id === holidayId
              ? { ...h, isCirculated: false, circulatedAt: undefined }
              : h
          );
          await saveOfficialHolidays(updated);
          resolve({ removedCount: removed });
        };
      };

      req.onerror = () => {
        db.close();
        reject(new Error(`فشل استرجاع السجلات للإلغاء: ${req.error?.message}`));
      };
    } catch (err) {
      db.close();
      reject(err);
    }
  });
}

/**
 * سجل موظف نموذجي لتجربة الحفظ والاسترجاع الفوري
 */
export const SAMPLE_TEST_EMPLOYEE: Employee = {
  id: 'EMP-2026-001',
  employeeNumber: 'IQ-GOV-98214',
  fullName: 'كرار حيدر جاسم الموسوي',
  department: 'قسم الشؤون الهندسية والمشاريع',
  division: 'شعبة الصيانة والتشغيل',
  jobTitle: 'مهندس أقدم / رئيس مهندسين معاون',
  contractType: 'permanent', // ملاك دائم
  hireDate: '2018-03-15',
  annualBalanceLimit: 36, // استحقاق الملاك الدائم
  usedBalance: 4,
  remainingBalance: 32,
  monthlyRate: 3, // 3 أيام تراكمي شهرياً
  isAccumulative: true,
  phone: '07801234567',
  notes: 'الموظف من الملاك الدائم - سجل دائمي رسمي مجدول لعام 2026',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * دالة برمجية تجريبية تقوم بالتحقق من سلامة الاتصال والتخزين المحلي الدائم بـ IndexedDB.
 * تقوم بحفظ سجل مؤقت للاختبار، والتحقق من قراءته، ثم حذفه تلقائياً فور الانتهاء
 * لضمان عدم بقاء الموظف في جدول الموظفين أو ظهوره مرة أخرى إذا كان محذوفاً.
 */
export async function testSaveAndRetrieveSampleEmployee(): Promise<{
  success: boolean;
  savedData: Employee;
  retrievedData?: Employee;
  durationMs: number;
  message: string;
}> {
  const startTime = performance.now();

  try {
    // 1. حفظ السجل التجريبي
    await saveEmployee(SAMPLE_TEST_EMPLOYEE);

    // 2. استرجاع السجل بالمعرف للتحقق من سلامة القراءة
    const retrieved = await getEmployeeById(SAMPLE_TEST_EMPLOYEE.id);

    if (!retrieved) {
      throw new Error('تم الحفظ ولكن تعذر استرجاع السجل من IndexedDB.');
    }

    // 3. تنظيف وحذف سجل الاختبار فوراً حتى لا يعود الموظف المحذوف إلى قائمة الموظفين
    await deleteEmployeeById(SAMPLE_TEST_EMPLOYEE.id);

    const endTime = performance.now();
    const durationMs = Math.round((endTime - startTime) * 100) / 100;

    return {
      success: true,
      savedData: SAMPLE_TEST_EMPLOYEE,
      retrievedData: retrieved,
      durationMs,
      message: `تم التحقق بنجاح! تم اختبار الحفظ والقراءة ثم تنظيف السجل من IndexedDB في زمن ${durationMs} مللي ثانية (دون التأثير على الموظفين المحذوفين).`,
    };
  } catch (error: any) {
    // في حال حدوث خطأ، محاولة تنظيف السجل أيضاً
    try {
      await deleteEmployeeById(SAMPLE_TEST_EMPLOYEE.id);
    } catch {
      // تجاهل خطأ التنظيف
    }
    const endTime = performance.now();
    return {
      success: false,
      savedData: SAMPLE_TEST_EMPLOYEE,
      durationMs: Math.round((endTime - startTime) * 100) / 100,
      message: error?.message || 'حدث خطأ غير متوقع أثناء الاتصال بـ IndexedDB',
    };
  }
}

/**
 * استخراج إحصائيات عامة عن بيانات النظام وقاعدة البيانات
 */
export async function getDatabaseStatistics(): Promise<{
  employeesCount: number;
  attendanceSheetsCount: number;
  settingsCount: number;
  usersCount: number;
  attendanceLogsCount: number;
  totalRecordsCount: number;
  estimatedSizeKb: number;
}> {
  const db = await openGovDB();
  return new Promise((resolve) => {
    const tx = db.transaction(
      [STORE_EMPLOYEES, STORE_ATTENDANCE, STORE_SETTINGS, STORE_USERS, STORE_ATTENDANCE_LOGS],
      'readonly'
    );

    const empReq = tx.objectStore(STORE_EMPLOYEES).count();
    const attReq = tx.objectStore(STORE_ATTENDANCE).count();
    const setReq = tx.objectStore(STORE_SETTINGS).count();
    const usrReq = tx.objectStore(STORE_USERS).count();
    const logReq = tx.objectStore(STORE_ATTENDANCE_LOGS).count();

    tx.oncomplete = () => {
      db.close();
      const employeesCount = empReq.result || 0;
      const attendanceSheetsCount = attReq.result || 0;
      const settingsCount = setReq.result || 0;
      const usersCount = usrReq.result || 0;
      const attendanceLogsCount = logReq.result || 0;
      const totalRecordsCount =
        employeesCount + attendanceSheetsCount + settingsCount + usersCount + attendanceLogsCount;
      const estimatedSizeKb = Math.max(8, Math.round(totalRecordsCount * 1.2));

      resolve({
        employeesCount,
        attendanceSheetsCount,
        settingsCount,
        usersCount,
        attendanceLogsCount,
        totalRecordsCount,
        estimatedSizeKb,
      });
    };

    tx.onerror = () => {
      db.close();
      resolve({
        employeesCount: 0,
        attendanceSheetsCount: 0,
        settingsCount: 0,
        usersCount: 0,
        attendanceLogsCount: 0,
        totalRecordsCount: 0,
        estimatedSizeKb: 0,
      });
    };
  });
}

/**
 * تصدير كامل بيانات قاعدة البيانات إلى كائن متكامل (DatabaseBackupPayload)
 */
export async function exportDatabaseToJson(exportedBy: string = 'مدير النظام'): Promise<DatabaseBackupPayload> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [STORE_EMPLOYEES, STORE_ATTENDANCE, STORE_SETTINGS, STORE_USERS, STORE_ATTENDANCE_LOGS],
      'readonly'
    );

    const empStore = tx.objectStore(STORE_EMPLOYEES);
    const attStore = tx.objectStore(STORE_ATTENDANCE);
    const setStore = tx.objectStore(STORE_SETTINGS);
    const usrStore = tx.objectStore(STORE_USERS);
    const logStore = tx.objectStore(STORE_ATTENDANCE_LOGS);

    const empReq = empStore.getAll();
    const attReq = attStore.getAll();
    const setReq = setStore.getAll();
    const usrReq = usrStore.getAll();
    const logReq = logStore.getAll();

    tx.oncomplete = () => {
      db.close();
      const employees: Employee[] = empReq.result || [];
      const attendanceSheets: any[] = attReq.result || [];
      const systemSettings: { key: string; value: any }[] = setReq.result || [];
      const systemUsers: SystemUserAccount[] = usrReq.result || [];
      const attendanceLogs: AttendanceRecord[] = logReq.result || [];

      const backup: DatabaseBackupPayload = {
        system: 'GovPersonnelDB',
        version: DB_VERSION,
        backupDate: new Date().toISOString(),
        appVersion: '2026.1.0-GOV',
        metadata: {
          systemTitle: 'المنهج الرقمي للإدارة الحكومية - قاعدة البيانات المركزية',
          operatingYear: 2026,
          exportTimestamp: Date.now(),
          exportedBy,
          developer: {
            name: 'المهندس حسين عبد المنذر',
            phone: '07711145014',
            telegram: '@h92so',
          },
        },
        statistics: {
          employeesCount: employees.length,
          attendanceSheetsCount: attendanceSheets.length,
          settingsCount: systemSettings.length,
          usersCount: systemUsers.length,
          attendanceLogsCount: attendanceLogs.length,
        },
        data: {
          employees,
          attendanceSheets,
          systemSettings,
          systemUsers,
          attendanceLogs,
        },
      };

      resolve(backup);
    };

    tx.onerror = () => {
      db.close();
      reject(new Error(`فشل استخراج بيانات النسخة الاحتياطية: ${tx.error?.message}`));
    };
  });
}

/**
 * إنشاء وتحميل ملف JSON كنسخة احتياطية على جهاز المستخدم فوراً
 */
export async function downloadDatabaseBackupFile(
  exportedBy: string = 'مدير النظام'
): Promise<{ filename: string; payload: DatabaseBackupPayload; fileSizeKb: number }> {
  const payload = await exportDatabaseToJson(exportedBy);
  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const fileSizeKb = Math.round((blob.size / 1024) * 10) / 10;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `GovPersonnelDB_Backup_2026_${dateStr}_${timeStr}.json`;

  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(downloadUrl);

  return { filename, payload, fileSizeKb };
}

/**
 * التحقق من سلامة وصحة ملف النسخة الاحتياطية قبل الاستعادة
 */
export function validateBackupPayload(
  jsonData: any
): { isValid: boolean; error?: string; payload?: DatabaseBackupPayload } {
  if (!jsonData || typeof jsonData !== 'object') {
    return { isValid: false, error: 'الملف لا يحتوي على كائن JSON صالح.' };
  }

  if (jsonData.system !== 'GovPersonnelDB') {
    return {
      isValid: false,
      error: 'الملف غير صالح أو صادر من نظام غير متوافق. يرجى اختيار ملف نسخة احتياطية تم تصديره من منظومة المنهج الرقمي للإدارة الحكومية.',
    };
  }

  if (!jsonData.data || typeof jsonData.data !== 'object') {
    return { isValid: false, error: 'حقل البيانات (data) مفقود في ملف النسخة الاحتياطية.' };
  }

  if (!Array.isArray(jsonData.data.employees)) {
    return { isValid: false, error: 'جدول الموظفين مفقود أو غير مهيكل بشكل صحيح في الملف.' };
  }

  return {
    isValid: true,
    payload: jsonData as DatabaseBackupPayload,
  };
}

/**
 * استعادة كامل قاعدة البيانات من كائن النسخة الاحتياطية (JSON)
 * @param backupPayload كائن النسخة المعتمدة
 * @param mode 'replace' لمسح القديم وكتابة الجديد، أو 'merge' لدمج السجلات
 */
export async function restoreDatabaseFromJson(
  backupPayload: DatabaseBackupPayload,
  mode: 'replace' | 'merge' = 'replace'
): Promise<{
  restoredCounts: {
    employees: number;
    users: number;
    settings: number;
    attendanceLogs: number;
    attendanceSheets: number;
    total: number;
  };
  message: string;
}> {
  const db = await openGovDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [STORE_EMPLOYEES, STORE_ATTENDANCE, STORE_SETTINGS, STORE_USERS, STORE_ATTENDANCE_LOGS],
      'readwrite'
    );

    const empStore = tx.objectStore(STORE_EMPLOYEES);
    const attStore = tx.objectStore(STORE_ATTENDANCE);
    const setStore = tx.objectStore(STORE_SETTINGS);
    const usrStore = tx.objectStore(STORE_USERS);
    const logStore = tx.objectStore(STORE_ATTENDANCE_LOGS);

    if (mode === 'replace') {
      empStore.clear();
      attStore.clear();
      setStore.clear();
      usrStore.clear();
      logStore.clear();
    }

    const {
      employees = [],
      attendanceSheets = [],
      systemSettings = [],
      systemUsers = [],
      attendanceLogs = [],
    } = backupPayload.data || {};

    employees.forEach((emp) => empStore.put(emp));
    attendanceSheets.forEach((sheet) => attStore.put(sheet));
    systemSettings.forEach((setting) => setStore.put(setting));
    systemUsers.forEach((user) => usrStore.put(user));
    attendanceLogs.forEach((log) => logStore.put(log));

    tx.oncomplete = () => {
      db.close();
      const restoredCounts = {
        employees: employees.length,
        users: systemUsers.length,
        settings: systemSettings.length,
        attendanceLogs: attendanceLogs.length,
        attendanceSheets: attendanceSheets.length,
        total:
          employees.length +
          systemUsers.length +
          systemSettings.length +
          attendanceLogs.length +
          attendanceSheets.length,
      };

      resolve({
        restoredCounts,
        message: `تمت استعادة قاعدة البيانات بنجاح (${restoredCounts.total} سجل: ${restoredCounts.employees} موظف، ${restoredCounts.users} حساب مستخدم، ${restoredCounts.attendanceLogs} حركة دوام، ${restoredCounts.settings} إعدادات نظام).`,
      });
    };

    tx.onerror = () => {
      db.close();
      reject(new Error(`فشل استعادة قاعدة البيانات من النسخة الاحتياطية: ${tx.error?.message}`));
    };
  });
}

/**
 * -------------------------------------------------------------
 * دوال إدارة السجل المهني والخط الزمني الموحد (Career Timeline)
 * -------------------------------------------------------------
 */

export async function addTimelineEvent(event: CareerTimelineEvent): Promise<string> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TIMELINE], 'readwrite');
    const store = tx.objectStore(STORE_TIMELINE);
    const req = store.put(event);
    req.onsuccess = () => resolve(event.id);
    req.onerror = () => reject(new Error(`فشل إضافة الحدث الزمني: ${req.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

export async function getTimelineEventsByEmployeeId(employeeId: string): Promise<CareerTimelineEvent[]> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TIMELINE], 'readonly');
    const store = tx.objectStore(STORE_TIMELINE);
    const index = store.index('employeeId');
    const req = index.getAll(employeeId);
    req.onsuccess = () => {
      const results = (req.result as CareerTimelineEvent[]) || [];
      // Sort newest first
      results.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      resolve(results);
    };
    req.onerror = () => reject(new Error(`فشل استرجاع السجل الزمني: ${req.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

export async function getAllTimelineEvents(): Promise<CareerTimelineEvent[]> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TIMELINE], 'readonly');
    const store = tx.objectStore(STORE_TIMELINE);
    const req = store.getAll();
    req.onsuccess = () => {
      const results = (req.result as CareerTimelineEvent[]) || [];
      // Sort newest first
      results.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      resolve(results);
    };
    req.onerror = () => reject(new Error(`فشل استرجاع سجل العمليات والتعديلات: ${req.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

/**
 * -------------------------------------------------------------
 * دوال إدارة العلاوات السنوية (Allowances)
 * -------------------------------------------------------------
 */

export async function saveAllowanceRecord(record: AllowanceRecord): Promise<string> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ALLOWANCES], 'readwrite');
    const store = tx.objectStore(STORE_ALLOWANCES);
    const req = store.put(record);
    req.onsuccess = () => resolve(record.id);
    req.onerror = () => reject(new Error(`فشل حفظ سجل العلاوة: ${req.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

export async function getAllAllowances(): Promise<AllowanceRecord[]> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ALLOWANCES], 'readonly');
    const store = tx.objectStore(STORE_ALLOWANCES);
    const req = store.getAll();
    req.onsuccess = () => {
      const records = (req.result as AllowanceRecord[]) || [];
      records.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
      resolve(records);
    };
    req.onerror = () => reject(new Error(`فشل استرجاع العلاوات: ${req.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

export async function getAllowancesByEmployeeId(employeeId: string): Promise<AllowanceRecord[]> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ALLOWANCES], 'readonly');
    const store = tx.objectStore(STORE_ALLOWANCES);
    const index = store.index('employeeId');
    const req = index.getAll(employeeId);
    req.onsuccess = () => {
      const records = (req.result as AllowanceRecord[]) || [];
      records.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
      resolve(records);
    };
    req.onerror = () => reject(new Error(`فشل استرجاع سجلات علاوات الموظف: ${req.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

/**
 * -------------------------------------------------------------
 * دوال إدارة الترفيعات الوظيفية (Promotions)
 * -------------------------------------------------------------
 */

export async function savePromotionRecord(record: PromotionRecord): Promise<string> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PROMOTIONS], 'readwrite');
    const store = tx.objectStore(STORE_PROMOTIONS);
    const req = store.put(record);
    req.onsuccess = () => resolve(record.id);
    req.onerror = () => reject(new Error(`فشل حفظ سجل الترفيع: ${req.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

export async function getAllPromotions(): Promise<PromotionRecord[]> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PROMOTIONS], 'readonly');
    const store = tx.objectStore(STORE_PROMOTIONS);
    const req = store.getAll();
    req.onsuccess = () => {
      const records = (req.result as PromotionRecord[]) || [];
      records.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
      resolve(records);
    };
    req.onerror = () => reject(new Error(`فشل استرجاع الترفيعات: ${req.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

export async function getPromotionsByEmployeeId(employeeId: string): Promise<PromotionRecord[]> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PROMOTIONS], 'readonly');
    const store = tx.objectStore(STORE_PROMOTIONS);
    const index = store.index('employeeId');
    const req = index.getAll(employeeId);
    req.onsuccess = () => {
      const records = (req.result as PromotionRecord[]) || [];
      records.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
      resolve(records);
    };
    req.onerror = () => reject(new Error(`فشل استرجاع سجلات ترفيعات الموظف: ${req.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

/**
 * -------------------------------------------------------------
 * دوال سجلات مسح الباركود والبطاقات الذكية (Barcode Logs)
 * -------------------------------------------------------------
 */

export async function saveBarcodeScanLog(log: BarcodeScanLog): Promise<string> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_BARCODE_LOGS], 'readwrite');
    const store = tx.objectStore(STORE_BARCODE_LOGS);
    const req = store.put(log);
    req.onsuccess = () => resolve(log.id);
    req.onerror = () => reject(new Error(`فشل حفظ سجل المسح: ${req.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

export async function getBarcodeScanLogs(limit: number = 50): Promise<BarcodeScanLog[]> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_BARCODE_LOGS], 'readonly');
    const store = tx.objectStore(STORE_BARCODE_LOGS);
    const req = store.getAll();
    req.onsuccess = () => {
      const logs = (req.result as BarcodeScanLog[]) || [];
      logs.sort((a, b) => new Date(b.scanTime).getTime() - new Date(a.scanTime).getTime());
      resolve(logs.slice(0, limit));
    };
    req.onerror = () => reject(new Error(`فشل استرجاع سجلات المسح: ${req.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

/**
 * -------------------------------------------------------------
 * قسم الأرشفة الإلكترونية والإضبارة الذكية (Smart Archive & Dossiers)
 * -------------------------------------------------------------
 */

export async function saveArchivedDocument(doc: ArchivedDocument): Promise<string> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ARCHIVE], 'readwrite');
    const store = tx.objectStore(STORE_ARCHIVE);
    const req = store.put(doc);
    req.onsuccess = () => resolve(doc.id);
    req.onerror = () => reject(new Error(`فشل حفظ المستند في الأرشيف: ${req.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

export async function getAllArchivedDocuments(): Promise<ArchivedDocument[]> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ARCHIVE], 'readonly');
    const store = tx.objectStore(STORE_ARCHIVE);
    const req = store.getAll();
    req.onsuccess = () => {
      const docs = (req.result as ArchivedDocument[]) || [];
      docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(docs);
    };
    req.onerror = () => reject(new Error(`فشل استرجاع مستندات الأرشيف: ${req.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

export async function getArchivedDocumentsByEmployeeId(empId: string): Promise<ArchivedDocument[]> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ARCHIVE], 'readonly');
    const store = tx.objectStore(STORE_ARCHIVE);
    let req: IDBRequest;
    try {
      const index = store.index('employeeId');
      req = index.getAll(empId);
    } catch {
      req = store.getAll();
    }
    req.onsuccess = () => {
      let docs = (req.result as ArchivedDocument[]) || [];
      if (!store.indexNames.contains('employeeId')) {
        docs = docs.filter((d) => d.employeeId === empId);
      }
      docs.sort((a, b) => new Date(b.documentDate || b.createdAt).getTime() - new Date(a.documentDate || a.createdAt).getTime());
      resolve(docs);
    };
    req.onerror = () => reject(new Error(`فشل استرجاع إضبارة الموظف: ${req.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

export async function getArchivedDocumentById(id: string): Promise<ArchivedDocument | null> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ARCHIVE], 'readonly');
    const store = tx.objectStore(STORE_ARCHIVE);
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as ArchivedDocument) || null);
    req.onerror = () => reject(new Error(`فشل جلب المستند: ${req.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

export async function deleteArchivedDocument(id: string): Promise<void> {
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ARCHIVE], 'readwrite');
    const store = tx.objectStore(STORE_ARCHIVE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error(`فشل حذف المستند: ${req.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

export async function saveArchivedDocumentsBatch(docs: ArchivedDocument[]): Promise<void> {
  if (!docs || docs.length === 0) return;
  const db = await openGovDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ARCHIVE], 'readwrite');
    const store = tx.objectStore(STORE_ARCHIVE);
    docs.forEach((doc) => store.put(doc));
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(new Error(`فشل الحفظ المجمع للمستندات: ${tx.error?.message}`));
    };
  });
}

