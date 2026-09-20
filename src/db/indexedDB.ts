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
} from '../types';
import { IRAQ_CABINET_HOLIDAYS_PRESET } from '../data/iraqHolidaysData';

export const DB_NAME = 'GovPersonnelDB_2026';
export const DB_VERSION = 2;
export const STORE_EMPLOYEES = 'employees';
export const STORE_ATTENDANCE = 'attendance_sheets';
export const STORE_SETTINGS = 'system_settings';
export const STORE_USERS = 'system_users';
export const STORE_ATTENDANCE_LOGS = 'attendance_logs';

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
 */
export async function saveEmployeesBatch(employees: Employee[]): Promise<number> {
  if (!employees.length) return 0;
  const db = await openGovDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_EMPLOYEES], 'readwrite');
    const store = transaction.objectStore(STORE_EMPLOYEES);
    let count = 0;

    employees.forEach((emp) => {
      const record: Employee = {
        ...emp,
        updatedAt: new Date().toISOString(),
        createdAt: emp.createdAt || new Date().toISOString(),
      };
      store.put(record);
      count++;
    });

    transaction.oncomplete = () => {
      db.close();
      resolve(count);
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error(`فشل حفظ مجموعة الموظفين: ${transaction.error?.message}`));
    };
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
 * دالة برمجية تجريبية تقوم بحفظ موظف نموذجي في IndexedDB ثم إعادة استرجاعه
 * للتحقق من سلامة الاتصال والتخزين المحلي الدائم.
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
    // 1. حفظ السجل
    await saveEmployee(SAMPLE_TEST_EMPLOYEE);

    // 2. استرجاع السجل بالمعرف
    const retrieved = await getEmployeeById(SAMPLE_TEST_EMPLOYEE.id);

    const endTime = performance.now();
    const durationMs = Math.round((endTime - startTime) * 100) / 100;

    if (!retrieved) {
      throw new Error('تم الحفظ ولكن تعذر استرجاع السجل من IndexedDB.');
    }

    return {
      success: true,
      savedData: SAMPLE_TEST_EMPLOYEE,
      retrievedData: retrieved,
      durationMs,
      message: `تم التحقق بنجاح! تم حفظ واسترجاع السجل من IndexedDB محلياً في زمن ${durationMs} مللي ثانية.`,
    };
  } catch (error: any) {
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

