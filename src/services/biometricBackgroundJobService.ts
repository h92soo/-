/**
 * biometricBackgroundJobService.ts
 * وظيفة الفحص الدوري الخلفي التلقائي لأجهزة البصمة (Background Job)
 * المنظومة: المنهج الرقمي للإدارة الحكومية - دائرة الموارد المائية 2026
 * 
 * تفحص اتصال أجهزة البصمة تلقائياً كل 5 دقائق (أو حسب الإعداد المحدد)،
 * وتحدث حالة الجهاز (متصل / غير متصل) مع زمن الاستجابة في IndexedDB
 * وتبث التحديثات لحظياً إلى واجهات المنظومة دون الحاجة لتحديث الصفحة.
 */

import {
  BiometricBackgroundJobSettings,
  BiometricBackgroundJobState,
  BiometricDetectionResult,
  BiometricDevice,
  BiometricDeviceStatus,
} from '../types';
import { biometricService } from './biometricService';
import { getSystemSetting, saveSystemSetting } from '../db/indexedDB';
import { soundEffects } from '../utils/soundEffects';
import { toast } from '../components/ToastNotification';
import { useEffect, useState } from 'react';

const SETTINGS_KEY = 'gov_biometric_bg_job_settings';
const DEFAULT_INTERVAL_MINUTES = 5; // الافتراضي: كل 5 دقائق

export const DEFAULT_BG_JOB_SETTINGS: BiometricBackgroundJobSettings = {
  enabled: true,
  intervalMinutes: DEFAULT_INTERVAL_MINUTES,
  notifyOnStatusChange: true,
  silentAudio: false,
};

type StateListener = (state: BiometricBackgroundJobState) => void;

class BiometricBackgroundJobService {
  private settings: BiometricBackgroundJobSettings = { ...DEFAULT_BG_JOB_SETTINGS };
  private state: BiometricBackgroundJobState = {
    enabled: true,
    intervalMinutes: DEFAULT_INTERVAL_MINUTES,
    isRunning: false,
    lastRunTimestamp: null,
    nextRunTimestamp: null,
    secondsRemaining: DEFAULT_INTERVAL_MINUTES * 60,
    lastResult: null,
    onlineCount: 0,
    offlineCount: 0,
    totalDevices: 0,
  };

  private listeners: Set<StateListener> = new Set();
  private tickTimer: any = null;
  private isInitialized: boolean = false;
  private previousDeviceStatusMap: Map<string, BiometricDeviceStatus> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  /**
   * تهيئة الخدمة وتحميل الإعدادات المخزنة وبدء المؤقت
   */
  public async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // قراءة الإعدادات من IndexedDB أو localStorage
      const saved = await getSystemSetting<BiometricBackgroundJobSettings>(
        SETTINGS_KEY,
        DEFAULT_BG_JOB_SETTINGS
      );
      if (saved) {
        this.settings = { ...DEFAULT_BG_JOB_SETTINGS, ...saved };
      }
    } catch {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) {
          this.settings = { ...DEFAULT_BG_JOB_SETTINGS, ...JSON.parse(raw) };
        }
      } catch {}
    }

    // تهيئة حالة الأجهزة الأولية
    const initialDevices = await biometricService.getDevices();
    initialDevices.forEach((d) => {
      this.previousDeviceStatusMap.set(d.id, d.status);
    });

    const online = initialDevices.filter((d) => d.status === 'online').length;
    this.state = {
      ...this.state,
      enabled: this.settings.enabled,
      intervalMinutes: this.settings.intervalMinutes || DEFAULT_INTERVAL_MINUTES,
      onlineCount: online,
      offlineCount: initialDevices.length - online,
      totalDevices: initialDevices.length,
      secondsRemaining: (this.settings.intervalMinutes || DEFAULT_INTERVAL_MINUTES) * 60,
    };

    // الاستماع للتغييرات الخارجية في الأجهزة
    biometricService.subscribe((devices) => {
      const currentOnline = devices.filter((d) => d.status === 'online').length;
      this.state.totalDevices = devices.length;
      this.state.onlineCount = currentOnline;
      this.state.offlineCount = devices.length - currentOnline;
      this.notify();
    });

    // استماع لتغيير رؤية التبويب بالمتصفح (عند استعادة التبويب)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.settings.enabled) {
          const now = Date.now();
          if (
            this.state.nextRunTimestamp &&
            now >= this.state.nextRunTimestamp &&
            !this.state.isRunning
          ) {
            this.executeJob(true);
          }
        }
      });
    }

    if (this.settings.enabled) {
      this.scheduleNextRun();
      this.startTicker();
    }
  }

  /**
   * الاشتراك في تحديثات حالة الوظيفة الخلفية
   */
  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = { ...this.state };
    this.listeners.forEach((fn) => {
      try {
        fn(snapshot);
      } catch (err) {
        console.error('Error in background job subscriber:', err);
      }
    });
  }

  public getState(): BiometricBackgroundJobState {
    return { ...this.state };
  }

  public getSettings(): BiometricBackgroundJobSettings {
    return { ...this.settings };
  }

  /**
   * تحديث الإعدادات وحفظها
   */
  public async updateSettings(newSettings: Partial<BiometricBackgroundJobSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.state.enabled = this.settings.enabled;
    this.state.intervalMinutes = this.settings.intervalMinutes;

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      await saveSystemSetting(SETTINGS_KEY, this.settings);
    } catch (e) {
      console.warn('Failed to persist background job settings:', e);
    }

    if (this.settings.enabled) {
      this.scheduleNextRun();
      this.startTicker();
    } else {
      this.stopTicker();
      this.state.nextRunTimestamp = null;
      this.state.secondsRemaining = 0;
    }

    this.notify();
  }

  /**
   * تبديل تفعيل/تعطيل الفحص التلقائي
   */
  public async toggleEnabled(): Promise<boolean> {
    const next = !this.settings.enabled;
    await this.updateSettings({ enabled: next });
    if (next) {
      soundEffects.playButtonClick();
      toast.info('تم تفعيل وظيفة الفحص الدوري التلقائي لأجهزة البصمة (كل 5 دقائق) ⏱️');
    } else {
      soundEffects.playButtonClick();
      toast.info('تم إيقاف وظيفة الفحص الدوري التلقائي لأجهزة البصمة ⏸️');
    }
    return next;
  }

  /**
   * جدولة موعد الفحص القادم
   */
  private scheduleNextRun() {
    const intervalMs = (this.settings.intervalMinutes || DEFAULT_INTERVAL_MINUTES) * 60 * 1000;
    const nextTime = Date.now() + intervalMs;
    this.state.nextRunTimestamp = nextTime;
    this.state.secondsRemaining = Math.round(intervalMs / 1000);
  }

  /**
   * بدء مؤقت الثواني التنازلي الحي (1s ticker)
   */
  private startTicker() {
    if (this.tickTimer) clearInterval(this.tickTimer);

    this.tickTimer = setInterval(() => {
      if (!this.settings.enabled) return;

      const now = Date.now();
      if (this.state.nextRunTimestamp) {
        const remaining = Math.max(0, Math.round((this.state.nextRunTimestamp - now) / 1000));
        this.state.secondsRemaining = remaining;

        if (remaining <= 0 && !this.state.isRunning) {
          // حان وقت الفحص الدوري!
          this.executeJob(false);
        } else {
          this.notify();
        }
      }
    }, 1000);
  }

  private stopTicker() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  /**
   * تشغيل الفحص الفوري الآن يدوياً من قبل المستخدم
   */
  public async runNow(): Promise<BiometricDetectionResult> {
    soundEffects.playButtonClick();
    return this.executeJob(true);
  }

  /**
   * تنفيذ وظيفة الفحص التلقائي الحقيقي لأجهزة البصمة
   */
  public async executeJob(isManual = false): Promise<BiometricDetectionResult> {
    if (this.state.isRunning) {
      // فحص جارٍ بالفعل
      return (
        this.state.lastResult || {
          hasConnected: false,
          connectedCount: 0,
          disconnectedCount: 0,
          totalScanned: 0,
          detectedDevices: [],
          disconnectedDevices: [],
          results: [],
          message: 'الفحص جارٍ بالفعل...',
        }
      );
    }

    this.state.isRunning = true;
    this.notify();

    try {
      const devices = await biometricService.getDevices();

      // تسجيل الحالة السابقة لملاحظة أي انقطاع أو عودة للاتصال
      const previousMap = new Map<string, BiometricDeviceStatus>();
      devices.forEach((d) => previousMap.set(d.id, d.status));

      // تنفيذ الكشف الحقيقي الشامل عبر الشبكة ومنافذ USB
      const result = await biometricService.autoDetectDevices(devices);

      const now = Date.now();
      this.state.lastRunTimestamp = now;
      this.state.lastResult = result;
      this.state.totalDevices = result.totalScanned;
      this.state.onlineCount = result.connectedCount;
      this.state.offlineCount = result.disconnectedCount;

      // فحص التغيرات في الاتصال لإشعار المستخدم عند الضرورة
      if (this.settings.notifyOnStatusChange) {
        let wentOfflineCount = 0;
        let wentOnlineCount = 0;
        let changedDeviceName = '';

        result.results.forEach((item) => {
          const prevStatus = previousMap.get(item.device.id);
          const currentStatus = item.success ? 'online' : 'offline';

          if (prevStatus && prevStatus !== currentStatus) {
            changedDeviceName = item.device.name;
            if (currentStatus === 'offline') wentOfflineCount++;
            if (currentStatus === 'online') wentOnlineCount++;
          }
        });

        // إشعار رقيق عند تغير الحالة أثناء الفحص التلقائي بالخلفية (بدون أي أصوات إزعاج متكررة)
        if (wentOfflineCount > 0 && !isManual) {
          // تم كتم الصوت في الفحص التلقائي بالخلفية تلبيةً لطلب المستخدم
          toast.warning(
            `⚠️ تنبيه دوري: انقطع اتصال جهاز البصمة [${changedDeviceName}] أو كابل الشبكة غير متصل!`,
            { duration: 5000 }
          );
        } else if (wentOnlineCount > 0 && !isManual) {
          toast.success(
            `✅ تم استعادة ربط جهاز البصمة [${changedDeviceName}] بنجاح أثناء الفحص الدوري!`,
            { duration: 4000 }
          );
        }
      }

      // إذا كان الفحص يدوياً بطلب المستخدم المباشر، إشعار فوري بالنتيجة
      if (isManual) {
        if (result.hasConnected) {
          soundEffects.playDeviceConnectedSound();
          toast.success(
            `✅ اكتمل الفحص الفوري: (${result.connectedCount}) أجهزة متصلة بالشبكة بنجاح.`
          );
        } else {
          soundEffects.playDeviceDisconnectedSound({ isManualInspection: true });
          toast.error(
            `⚠️ تنبيه: عدم ربط أجهزة البصمة! (${result.disconnectedCount}) أجهزة غير متصلة.`
          );
        }
      }

      // إعادة جدولة الموعد القادم (بعد 5 دقائق)
      this.scheduleNextRun();

      return result;
    } catch (err: any) {
      console.error('Biometric Background Job execution error:', err);
      this.scheduleNextRun();
      return {
        hasConnected: false,
        connectedCount: 0,
        disconnectedCount: this.state.totalDevices,
        totalScanned: this.state.totalDevices,
        detectedDevices: [],
        disconnectedDevices: [],
        results: [],
        message: err?.message || 'فشل الفحص الدوري لأجهزة البصمة',
      };
    } finally {
      this.state.isRunning = false;
      this.notify();
    }
  }
}

// كائن مفرد ثابت للنظام بالكامل
export const biometricBackgroundJobService = new BiometricBackgroundJobService();

/**
 * Hook مخصص لربط المكونات بلحظية وتحديثات الوظيفة الخلفية
 */
export function useBiometricBackgroundJob() {
  const [jobState, setJobState] = useState<BiometricBackgroundJobState>(() =>
    biometricBackgroundJobService.getState()
  );

  useEffect(() => {
    const unsub = biometricBackgroundJobService.subscribe(setJobState);
    return () => unsub();
  }, []);

  return {
    state: jobState,
    isRunning: jobState.isRunning,
    enabled: jobState.enabled,
    secondsRemaining: jobState.secondsRemaining,
    onlineCount: jobState.onlineCount,
    offlineCount: jobState.offlineCount,
    totalDevices: jobState.totalDevices,
    lastRunTimestamp: jobState.lastRunTimestamp,
    lastResult: jobState.lastResult,
    runNow: () => biometricBackgroundJobService.runNow(),
    toggleEnabled: () => biometricBackgroundJobService.toggleEnabled(),
    updateSettings: (settings: Partial<BiometricBackgroundJobSettings>) =>
      biometricBackgroundJobService.updateSettings(settings),
  };
}
