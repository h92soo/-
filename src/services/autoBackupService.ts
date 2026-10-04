/**
 * محرك النسخ الاحتياطي التلقائي والدوري (Auto-Backup Service)
 * لقاعدة بيانات IndexedDB المحلية
 * المنظومة: المنهج الرقمي للإدارة الحكومية (2026)
 * المطور: المهندس حسين عبد المنذر
 * 
 * يوفر هذا النظام:
 * 1. نسخ احتياطي تلقائي عند تسجيل الخروج (Backup on Logout).
 * 2. نسخ احتياطي فوري عند حدوث تعديلات وتغييرات جوهرية في الموظفين (حذف دفعات، تعديل مجمع، استيراد...).
 * 3. نسخ احتياطي دوري كل X دقيقة أثناء جلسة العمل.
 * 4. إدارة سجل النسخ التلقائية والاحتفاظ بآخر N نسخة في IndexedDB و LocalStorage.
 * 5. إشعار المستخدم فورياً بإشعار خفيف (Toast) مع إمكانية التنزيل الفوري أو الاستعادة.
 */

import {
  AutoBackupRecord,
  AutoBackupSettings,
  DatabaseBackupPayload,
  Employee,
} from '../types';

export type { AutoBackupRecord, AutoBackupSettings };
import {
  exportDatabaseToJson,
  saveSystemSetting,
  getSystemSetting,
  openGovDB,
  STORE_SETTINGS,
} from '../db/indexedDB';
import { toast } from '../components/ToastNotification';

export const DEFAULT_AUTO_BACKUP_SETTINGS: AutoBackupSettings = {
  enabled: true,
  backupOnLogout: true,
  backupOnMajorChanges: true,
  periodicIntervalMinutes: 30, // كل 30 دقيقة
  majorChangeThreshold: 3, // 3 تعديلات أو حذف أو استيراد
  maxRetainedBackups: 8, // الاحتفاظ بآخر 8 نسخ احتياطية
};

const AUTO_BACKUP_SETTINGS_KEY = 'gov_auto_backup_settings';
const AUTO_BACKUP_HISTORY_STORE_KEY = 'gov_auto_backups_list';

type AutoBackupListener = (backups: AutoBackupRecord[]) => void;
const backupListeners: Set<AutoBackupListener> = new Set();

export function subscribeAutoBackups(listener: AutoBackupListener): () => void {
  backupListeners.add(listener);
  return () => backupListeners.delete(listener);
}

function notifyBackupListeners(backups: AutoBackupRecord[]) {
  backupListeners.forEach((fn) => {
    try {
      fn(backups);
    } catch (err) {
      console.error('Error in auto-backup listener:', err);
    }
  });
}

/**
 * الحصول على إعدادات النسخ الاحتياطي التلقائي
 */
export async function getAutoBackupSettings(): Promise<AutoBackupSettings> {
  try {
    const fromDb = await getSystemSetting<AutoBackupSettings>(
      AUTO_BACKUP_SETTINGS_KEY,
      DEFAULT_AUTO_BACKUP_SETTINGS
    );
    return fromDb || DEFAULT_AUTO_BACKUP_SETTINGS;
  } catch {
    const raw = localStorage.getItem(AUTO_BACKUP_SETTINGS_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    return DEFAULT_AUTO_BACKUP_SETTINGS;
  }
}

/**
 * حفظ وتحديث إعدادات النسخ الاحتياطي التلقائي
 */
export async function saveAutoBackupSettings(
  settings: AutoBackupSettings
): Promise<void> {
  localStorage.setItem(AUTO_BACKUP_SETTINGS_KEY, JSON.stringify(settings));
  try {
    await saveSystemSetting(AUTO_BACKUP_SETTINGS_KEY, settings);
  } catch (err) {
    console.error('Failed to save auto backup settings to IndexedDB:', err);
  }
}

/**
 * استرجاع قائمة النسخ الاحتياطية التلقائية المحفوظة في النظام
 */
export async function getStoredAutoBackups(): Promise<AutoBackupRecord[]> {
  try {
    const saved = await getSystemSetting<AutoBackupRecord[]>(
      AUTO_BACKUP_HISTORY_STORE_KEY,
      []
    );
    if (Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
  } catch {}

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_HISTORY_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return [];
}

/**
 * حفظ قائمة النسخ الاحتياطية التلقائية (مع التقيد بالحد الأقصى)
 */
async function saveStoredAutoBackups(
  backups: AutoBackupRecord[],
  maxLimit = 8
): Promise<void> {
  const trimmed = backups.slice(0, maxLimit);
  try {
    localStorage.setItem(AUTO_BACKUP_HISTORY_STORE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('LocalStorage full or quota exceeded for backups, keeping in IndexedDB:', err);
  }

  try {
    await saveSystemSetting(AUTO_BACKUP_HISTORY_STORE_KEY, trimmed);
  } catch (err) {
    console.error('Failed to persist backups in IndexedDB:', err);
  }

  notifyBackupListeners(trimmed);
}

// Global state to throttle automatic triggers
let isBackupRunning = false;
let lastBackupTime = 0;
const MIN_INTERVAL_BETWEEN_TRIGGERS_MS = 15000; // 15 seconds minimum between two backups

/**
 * تنفيذ عملية النسخ الاحتياطي التلقائي لقاعدة بيانات IndexedDB
 */
export async function performAutoBackup(
  reason: 'logout' | 'major_change' | 'periodic' | 'manual',
  description?: string,
  options?: { silent?: boolean; exportedBy?: string }
): Promise<AutoBackupRecord | null> {
  const settings = await getAutoBackupSettings();
  if (!settings.enabled && reason !== 'manual') {
    return null;
  }

  if (reason === 'logout' && !settings.backupOnLogout) return null;
  if (reason === 'major_change' && !settings.backupOnMajorChanges) return null;

  const now = Date.now();
  if (now - lastBackupTime < MIN_INTERVAL_BETWEEN_TRIGGERS_MS && reason !== 'manual') {
    return null;
  }

  if (isBackupRunning) return null;
  isBackupRunning = true;

  try {
    const who = options?.exportedBy || (reason === 'logout' ? 'النظام تلقائياً (تسجيل الخروج)' : 'النسخ التلقائي للنظام');
    const payload = await exportDatabaseToJson(who);

    const jsonStr = JSON.stringify(payload);
    const sizeKb = Math.round((new Blob([jsonStr]).size / 1024) * 10) / 10;

    let defaultDesc = 'نسخة احتياطية تلقائية';
    if (reason === 'logout') {
      defaultDesc = 'نسخ احتياطي تلقائي أماني عند تسجيل الخروج من النظام';
    } else if (reason === 'major_change') {
      defaultDesc = description || 'نسخ تلقائي إثر تعديل وتحديث جوهري في بيانات الموظفين';
    } else if (reason === 'periodic') {
      defaultDesc = 'نسخ احتياطي دوري تلقائي مجدول';
    } else if (reason === 'manual') {
      defaultDesc = description || 'نسخ احتياطي يدوي فوري';
    }

    const newRecord: AutoBackupRecord = {
      id: `BACKUP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      triggerReason: reason,
      triggerDescription: description || defaultDesc,
      employeeCount: payload.data.employees?.length || 0,
      totalRecordsCount:
        (payload.data.employees?.length || 0) +
        (payload.data.attendanceLogs?.length || 0) +
        (payload.data.systemUsers?.length || 0) +
        (payload.data.systemSettings?.length || 0),
      sizeKb,
      payload,
    };

    const currentBackups = await getStoredAutoBackups();
    const updated = [newRecord, ...currentBackups.filter((b) => b.id !== newRecord.id)];
    await saveStoredAutoBackups(updated, settings.maxRetainedBackups || 8);

    lastBackupTime = Date.now();

    // Show toast notification if not silent
    if (!options?.silent) {
      const timeFormatted = new Date().toLocaleTimeString('ar-IQ', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      toast.success(
        `تم حفظ نسخة احتياطية تلقائية بنجاح (${newRecord.employeeCount} موظفاً، ${newRecord.sizeKb} KB) في ${timeFormatted}`,
        {
          duration: 5000,
          actionText: 'تنزيل الملف',
          onAction: () => downloadAutoBackupRecord(newRecord),
        }
      );
    }

    return newRecord;
  } catch (err: any) {
    console.error('Auto backup failed:', err);
    return null;
  } finally {
    isBackupRunning = false;
  }
}

/**
 * تنزيل نسخة احتياطية معينة كملف JSON إلى الحاسوب
 */
export function downloadAutoBackupRecord(record: AutoBackupRecord): void {
  try {
    const jsonString = JSON.stringify(record.payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateFormatted = record.timestamp.slice(0, 10);
    const timeFormatted = record.timestamp.slice(11, 16).replace(':', '-');
    a.href = url;
    a.download = `GovPersonnel_AutoBackup_${record.triggerReason}_${dateFormatted}_${timeFormatted}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Failed to trigger download of backup file:', e);
  }
}

/**
 * حذف نسخة احتياطية من سجل النسخ المحفوظة
 */
export async function deleteAutoBackupRecord(backupId: string): Promise<void> {
  const current = await getStoredAutoBackups();
  const filtered = current.filter((b) => b.id !== backupId);
  await saveStoredAutoBackups(filtered);
}

/**
 * تفريغ كامل سجل النسخ الاحتياطية التلقائية
 */
export async function clearAllAutoBackups(): Promise<void> {
  await saveStoredAutoBackups([]);
}

// Major change accumulator to detect significant changes
let changeCounter = 0;
let changeTimer: any = null;

/**
 * تسجيل تغيير في بيانات الموظفين، وتشغيل النسخ الاحتياطي التلقائي إذا كان التغيير كبيراً
 */
export function recordEmployeeDataChange(
  changeWeight = 1,
  changeDetail = 'تعديل في سجلات الموظفين'
) {
  changeCounter += changeWeight;

  if (changeTimer) clearTimeout(changeTimer);

  // Debounce to collect rapid consecutive edits before backing up
  changeTimer = setTimeout(async () => {
    const settings = await getAutoBackupSettings();
    const threshold = settings.majorChangeThreshold || 3;

    if (changeCounter >= threshold) {
      const count = changeCounter;
      changeCounter = 0;
      await performAutoBackup(
        'major_change',
        `${changeDetail} (${count} تغييرات مجمعة في بيانات الموظفين)`
      );
    }
  }, 3000);
}
