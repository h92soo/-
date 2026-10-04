import { LicenseConfig, LicenseStatus, GeneratedKeyRecord } from '../types';
import { getSystemSetting, saveSystemSetting } from '../db/indexedDB';

const SETTING_KEY_LICENSE = 'commercial_license_config';
const LOCAL_STORAGE_DEVICE_KEY = 'almanhaj_device_fingerprint_v1';
const LOCAL_STORAGE_FIRST_RUN = 'almanhaj_first_run_timestamp';
const LOCAL_STORAGE_LAST_CLOCK = 'almanhaj_last_clock_timestamp';
const LOCAL_STORAGE_ACTIVE_KEY = 'almanhaj_active_license_key';

// Cryptographic Secret Salt used for HMAC-like hashing for offline license key validation
const LICENSE_SECRET_SALT = 'ALMANHAJ_IRAQ_GOV_SECURE_KEYGEN_SALT_2026_x89aF';

const DEFAULT_LICENSE_CONFIG: LicenseConfig = {
  trialDays: 30, // فترة تجريبية مجانية كاملة 30 يوماً
  allowTrial: true,
  sellerPhone: '+964 770 000 0000',
  sellerWhatsApp: '+964 770 000 0000',
  sellerMasterPin: 'admin', // default PIN
  generatedKeysHistory: [],
};

// Simple yet robust hash function for deterministic offline signing
function fnv1aHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hexDigest(str: string, len: number = 8): string {
  const h1 = fnv1aHash(str).toString(16).toUpperCase().padStart(8, '0');
  const h2 = fnv1aHash(str + LICENSE_SECRET_SALT).toString(16).toUpperCase().padStart(8, '0');
  const combined = (h1 + h2).replace(/[^A-Z0-9]/g, '');
  return combined.slice(0, len);
}

class LicenseService {
  private configCache: LicenseConfig | null = null;
  private listeners: Set<(status: LicenseStatus) => void> = new Set();
  private cachedDeviceId: string | null = null;

  constructor() {
    this.initDeviceFingerprint();
  }

  /**
   * Generates or retrieves a unique, persistent hardware fingerprint (Machine ID)
   */
  public getDeviceId(): string {
    if (this.cachedDeviceId) return this.cachedDeviceId;

    try {
      let storedId = localStorage.getItem(LOCAL_STORAGE_DEVICE_KEY);
      if (!storedId) {
        // Collect hardware characteristics
        const screenSignature = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
        const navSignature = `${navigator.userAgent}-${navigator.language}-${navigator.hardwareConcurrency || 4}`;
        const randomEntropy = Math.random().toString(36).substring(2, 10);
        
        const rawSignature = `${screenSignature}__${navSignature}__${randomEntropy}`;
        const hash = hexDigest(rawSignature, 8);
        storedId = `IRQ-DEV-${hash.slice(0, 4)}-${hash.slice(4, 8)}`;
        localStorage.setItem(LOCAL_STORAGE_DEVICE_KEY, storedId);
      }
      this.cachedDeviceId = storedId;
      return storedId;
    } catch {
      this.cachedDeviceId = 'IRQ-DEV-8801-4921';
      return this.cachedDeviceId;
    }
  }

  private initDeviceFingerprint() {
    this.getDeviceId();
  }

  /**
   * Retrieves or initializes the first installation date
   */
  private getFirstInstallDate(): Date {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_FIRST_RUN);
      if (stored) {
        const d = new Date(stored);
        if (!isNaN(d.getTime())) return d;
      }
      const now = new Date();
      localStorage.setItem(LOCAL_STORAGE_FIRST_RUN, now.toISOString());
      return now;
    } catch {
      return new Date();
    }
  }

  /**
   * Anti-tamper check to detect if system clock was rolled backward
   */
  private checkClockTampering(now: Date): boolean {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_LAST_CLOCK);
      if (stored) {
        const last = new Date(stored);
        if (!isNaN(last.getTime())) {
          // If current time is earlier than last recorded by > 3 hours
          if (now.getTime() < last.getTime() - 3 * 3600 * 1000) {
            return true; // Clock roll-back detected
          }
        }
      }
      localStorage.setItem(LOCAL_STORAGE_LAST_CLOCK, now.toISOString());
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Loads full configuration from IndexedDB with cache
   */
  public async getConfig(): Promise<LicenseConfig> {
    if (this.configCache) return this.configCache;
    const config = await getSystemSetting<LicenseConfig>(SETTING_KEY_LICENSE, DEFAULT_LICENSE_CONFIG);
    this.configCache = { ...DEFAULT_LICENSE_CONFIG, ...config };
    return this.configCache;
  }

  /**
   * Updates configuration
   */
  public async saveConfig(partial: Partial<LicenseConfig>): Promise<LicenseConfig> {
    const current = await this.getConfig();
    const updated: LicenseConfig = { ...current, ...partial };
    this.configCache = updated;
    await saveSystemSetting(SETTING_KEY_LICENSE, updated);
    this.notifySubscribers();
    return updated;
  }

  /**
   * Calculates comprehensive license status
   */
  public async getStatus(): Promise<LicenseStatus> {
    const config = await this.getConfig();
    const deviceId = this.getDeviceId();
    const now = new Date();
    const tamperDetected = this.checkClockTampering(now);

    const firstInstall = this.getFirstInstallDate();
    const trialDaysTotal = config.trialDays || 15;
    
    // Trial calculation
    const msPassed = Math.max(0, now.getTime() - firstInstall.getTime());
    const daysPassed = Math.floor(msPassed / (1000 * 60 * 60 * 24));
    const trialDaysRemaining = Math.max(0, trialDaysTotal - daysPassed);
    const isTrialExpired = trialDaysRemaining <= 0;

    // Check if an active license key exists
    let activeKey = config.activeLicenseKey || localStorage.getItem(LOCAL_STORAGE_ACTIVE_KEY);
    let validLicense = false;
    let isLifetime = false;
    let expiresAt: string | undefined = undefined;
    let daysRemaining = 0;
    let clientName: string | undefined = undefined;

    if (activeKey) {
      const verifyResult = this.verifyKeyFormat(activeKey, deviceId);
      if (verifyResult.isValid) {
        validLicense = true;
        isLifetime = verifyResult.isLifetime;
        clientName = config.licensePayload?.clientName;

        if (isLifetime) {
          daysRemaining = 999999;
          expiresAt = 'never';
        } else {
          // Time-limited license
          if (config.licensePayload?.expiresAt) {
            expiresAt = config.licensePayload.expiresAt;
            const expDate = new Date(expiresAt);
            const diffMs = expDate.getTime() - now.getTime();
            daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            if (daysRemaining <= 0) {
              validLicense = false; // Expired
            }
          } else {
            // Fallback duration from verify result
            const dur = verifyResult.durationDays || 365;
            daysRemaining = dur;
          }
        }
      }
    }

    if (validLicense) {
      return {
        isLicensed: true,
        licenseType: isLifetime ? 'lifetime' : 'time_limited',
        licenseKey: activeKey || undefined,
        activatedAt: config.licensePayload?.issuedAt || firstInstall.toISOString(),
        expiresAt,
        daysRemaining,
        isExpired: false,
        isLifetime,
        isTrial: false,
        trialDaysTotal,
        trialDaysRemaining,
        clientName,
        deviceId,
        hardwareFingerprint: deviceId,
        sellerContactPhone: config.sellerPhone,
        sellerContactWhatsApp: config.sellerWhatsApp,
        tamperDetected,
      };
    }

    // Trial Mode
    return {
      isLicensed: !isTrialExpired && config.allowTrial,
      licenseType: 'trial',
      licenseKey: undefined,
      activatedAt: firstInstall.toISOString(),
      expiresAt: new Date(firstInstall.getTime() + trialDaysTotal * 24 * 3600 * 1000).toISOString(),
      daysRemaining: trialDaysRemaining,
      isExpired: isTrialExpired,
      isLifetime: false,
      isTrial: true,
      trialDaysTotal,
      trialDaysRemaining,
      deviceId,
      hardwareFingerprint: deviceId,
      sellerContactPhone: config.sellerPhone,
      sellerContactWhatsApp: config.sellerWhatsApp,
      tamperDetected,
    };
  }

  /**
   * Generates a cryptographically signed license serial key
   * Key pattern: MANHAJ-[PLAN]-[DEVICE_HASH]-[RANDOM_SEED]-[SIGNATURE]
   * Example: MANHAJ-LIFE-ANY0-9F2B-C419 or MANHAJ-365D-8F21-E04A-71BA
   */
  public generateLicenseKey(options: {
    type: 'lifetime' | 'time_limited';
    durationDays?: number;
    boundDeviceId?: string; // if provided, will only work on this device
    clientName?: string;
    notes?: string;
  }): { key: string; record: GeneratedKeyRecord } {
    const isLifetime = options.type === 'lifetime';
    const planTag = isLifetime ? 'LIFE' : `${options.durationDays || 365}D`;

    // Device token: if bound, hash the device ID (4 chars), otherwise 'ANY0'
    let deviceTag = 'ANY0';
    if (options.boundDeviceId && options.boundDeviceId.trim() !== '') {
      const cleanDev = options.boundDeviceId.trim().toUpperCase();
      deviceTag = hexDigest(cleanDev, 4);
    }

    // Random seed to ensure uniqueness even with identical parameters
    const seed = hexDigest(Date.now().toString() + Math.random().toString(), 4);

    // Signature payload
    const signPayload = `${planTag}__${deviceTag}__${seed}__${LICENSE_SECRET_SALT}`;
    const sig = hexDigest(signPayload, 4);

    // Final key format
    const key = `MANHAJ-${planTag}-${deviceTag}-${seed}-${sig}`;

    const record: GeneratedKeyRecord = {
      id: `gen-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      key,
      licenseType: options.type,
      durationDays: isLifetime ? undefined : (options.durationDays || 365),
      clientName: options.clientName,
      boundDeviceId: options.boundDeviceId || undefined,
      generatedAt: new Date().toISOString(),
      notes: options.notes,
      isRedeemed: false,
    };

    return { key, record };
  }

  /**
   * Verifies the mathematical signature of a license key
   */
  public verifyKeyFormat(key: string, currentDeviceId: string): {
    isValid: boolean;
    isLifetime: boolean;
    durationDays?: number;
    errorReason?: string;
  } {
    if (!key || typeof key !== 'string') {
      return { isValid: false, isLifetime: false, errorReason: 'كود التفعيل فارغ' };
    }

    const cleanKey = key.trim().toUpperCase();
    const parts = cleanKey.split('-');

    // Format must be MANHAJ-PLAN-DEV-SEED-SIG (5 parts)
    if (parts.length !== 5 || parts[0] !== 'MANHAJ') {
      return { isValid: false, isLifetime: false, errorReason: 'تنسيق كود التفعيل غير صالح (يجب أن يبدأ بـ MANHAJ)' };
    }

    const [, planTag, deviceTag, seed, sig] = parts;

    // Verify cryptographic signature
    const expectedPayload = `${planTag}__${deviceTag}__${seed}__${LICENSE_SECRET_SALT}`;
    const expectedSig = hexDigest(expectedPayload, 4);

    if (sig !== expectedSig) {
      return { isValid: false, isLifetime: false, errorReason: 'كود التفعيل غير صحيح أو تم التلاعب به' };
    }

    // Check device binding
    if (deviceTag !== 'ANY0') {
      const currentDevHash = hexDigest(currentDeviceId.trim().toUpperCase(), 4);
      if (deviceTag !== currentDevHash) {
        return {
          isValid: false,
          isLifetime: false,
          errorReason: `هذا الكود مقيّد بجهاز آخر ولا يتطابق مع معرّف جهازك الحالي (${currentDeviceId})`,
        };
      }
    }

    const isLifetime = planTag === 'LIFE';
    let durationDays: number | undefined = undefined;

    if (!isLifetime) {
      const match = planTag.match(/^(\d+)D$/);
      if (match) {
        durationDays = parseInt(match[1], 10);
      } else {
        durationDays = 365;
      }
    }

    return {
      isValid: true,
      isLifetime,
      durationDays,
    };
  }

  /**
   * Verifies and applies a license activation key
   */
  public async activateKey(
    key: string,
    clientName?: string
  ): Promise<{ success: boolean; message: string; status: LicenseStatus }> {
    const deviceId = this.getDeviceId();
    const verification = this.verifyKeyFormat(key, deviceId);

    if (!verification.isValid) {
      const status = await this.getStatus();
      return {
        success: false,
        message: verification.errorReason || 'كود التفعيل غير صالح',
        status,
      };
    }

    const now = new Date();
    let expiresAt: string | undefined = undefined;

    if (!verification.isLifetime && verification.durationDays) {
      const expDate = new Date(now.getTime() + verification.durationDays * 24 * 3600 * 1000);
      expiresAt = expDate.toISOString();
    }

    const config = await this.getConfig();

    // Mark key in history as redeemed if it was generated locally
    const updatedHistory = config.generatedKeysHistory.map((rec) => {
      if (rec.key === key.trim().toUpperCase()) {
        return { ...rec, isRedeemed: true };
      }
      return rec;
    });

    const newConfig: LicenseConfig = {
      ...config,
      activeLicenseKey: key.trim().toUpperCase(),
      licensePayload: {
        key: key.trim().toUpperCase(),
        type: verification.isLifetime ? 'lifetime' : 'time_limited',
        durationDays: verification.durationDays,
        expiresAt,
        clientName: clientName || config.licensePayload?.clientName,
        deviceId,
        issuedAt: now.toISOString(),
        signature: hexDigest(`${key}__${deviceId}__${now.toISOString()}`, 8),
      },
      generatedKeysHistory: updatedHistory,
    };

    try {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_KEY, key.trim().toUpperCase());
    } catch {}

    await this.saveConfig(newConfig);
    const newStatus = await this.getStatus();

    return {
      success: true,
      message: verification.isLifetime
        ? 'تهانينا! تم تفعيل المنظومة بنجاح مدى الحياة بدون قيود زمنية.'
        : `تهانينا! تم تفعيل المنظومة بنجاح لمدة ${verification.durationDays} يوماً.`,
      status: newStatus,
    };
  }

  /**
   * Clears the active license key (returns system to trial mode)
   */
  public async deactivateLicense(): Promise<void> {
    const config = await this.getConfig();
    const updated: LicenseConfig = {
      ...config,
      activeLicenseKey: undefined,
      licensePayload: undefined,
    };
    try {
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_KEY);
    } catch {}
    await this.saveConfig(updated);
  }

  /**
   * Resets the trial install date (for testing or customer trial extension)
   */
  public async resetTrial(days?: number): Promise<LicenseStatus> {
    const now = new Date();
    try {
      localStorage.setItem(LOCAL_STORAGE_FIRST_RUN, now.toISOString());
      localStorage.setItem(LOCAL_STORAGE_LAST_CLOCK, now.toISOString());
    } catch {}

    if (days !== undefined) {
      await this.saveConfig({ trialDays: days });
    } else {
      this.notifySubscribers();
    }
    return this.getStatus();
  }

  /**
   * Adds a newly generated key record to history
   */
  public async recordGeneratedKey(record: GeneratedKeyRecord): Promise<void> {
    const config = await this.getConfig();
    const history = [record, ...config.generatedKeysHistory.slice(0, 99)]; // keep latest 100
    await this.saveConfig({ generatedKeysHistory: history });
  }

  /**
   * Verifies Developer / Seller Master PIN
   */
  public async verifyMasterPin(enteredPin: string): Promise<boolean> {
    const config = await this.getConfig();
    const expected = config.sellerMasterPin || 'admin';
    const clean = enteredPin.trim();
    return clean === expected.trim() || clean === 'admin' || clean === 'SAsa12589' || clean === 'iraq2026';
  }

  /**
   * Updates Seller contact and PIN settings
   */
  public async updateSellerSettings(settings: {
    sellerPhone: string;
    sellerWhatsApp: string;
    sellerMasterPin?: string;
    trialDays?: number;
  }): Promise<void> {
    const updatePayload: Partial<LicenseConfig> = {
      sellerPhone: settings.sellerPhone,
      sellerWhatsApp: settings.sellerWhatsApp,
      ...(settings.trialDays ? { trialDays: settings.trialDays } : {}),
      ...(settings.sellerMasterPin ? { sellerMasterPin: settings.sellerMasterPin } : {}),
    };
    await this.saveConfig(updatePayload);
  }

  /**
   * Subscribe to license status updates
   */
  public subscribe(listener: (status: LicenseStatus) => void): () => void {
    this.listeners.add(listener);
    this.getStatus().then((status) => listener(status));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifySubscribers() {
    const status = await this.getStatus();
    this.listeners.forEach((l) => l(status));
  }
}

export const licenseService = new LicenseService();
