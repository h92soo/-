/**
 * soundEffects.ts - محاكي التنبيهات الصوتية الحكومية للباركود وأصوات الأزرار والعمليات
 * المنهج الرقمي للإدارة الحكومية - دائرة الموارد المائية 2026
 * 
 * تستخدم Web Audio API المضمنة لإنتاج أصوات واضحة وسريعة بدون الحاجة لملفات صوتية خارجية
 * تدعم تشغيل أو إطفاء أصوات الأزرار في كامل النظام مع الحفظ التلقائي
 */

const LOCAL_STORAGE_SOUND_KEY = 'gov_sound_effects_enabled';
const LOCAL_STORAGE_BIOMETRIC_DISCONNECT_SOUND_KEY = 'gov_biometric_disconnect_sound_muted';

class SoundEffectsService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private biometricDisconnectSoundMuted: boolean = true; // إطفاء الأصوات المتكررة لعدم ربط أجهزة البصمة وجعلها عند الفحص المباشر فقط
  private listeners: Set<(enabled: boolean) => void> = new Set();
  private lastClickTime: number = 0;
  private lastDisconnectSoundTime: number = 0;
  private isGlobalAttached: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_SOUND_KEY);
        this.enabled = stored !== null ? stored === 'true' : true;

        const storedBioMute = localStorage.getItem(LOCAL_STORAGE_BIOMETRIC_DISCONNECT_SOUND_KEY);
        // الافتراضي هو إطفاء الأصوات المتكررة لعدم ربط البصمة إلا عند الفحص
        this.biometricDisconnectSoundMuted = storedBioMute !== null ? storedBioMute === 'true' : true;
      } catch {
        this.enabled = true;
        this.biometricDisconnectSoundMuted = true;
      }
    }
  }

  public isBiometricDisconnectSoundMuted(): boolean {
    return this.biometricDisconnectSoundMuted;
  }

  public setBiometricDisconnectSoundMuted(muted: boolean) {
    this.biometricDisconnectSoundMuted = muted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_BIOMETRIC_DISCONNECT_SOUND_KEY, muted ? 'true' : 'false');
      } catch {}
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_SOUND_KEY, val ? 'true' : 'false');
      } catch {}
    }
    this.listeners.forEach((fn) => fn(val));
    if (val) {
      this.playToggle();
    }
  }

  public toggle(): boolean {
    const next = !this.enabled;
    this.setEnabled(next);
    return next;
  }

  public subscribe(fn: (enabled: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.enabled) return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * صوت نقرة زر لطيفة وسلسة (Crisp subtle UI button tap)
   */
  public playButtonClick() {
    if (!this.enabled) return;
    const nowMs = Date.now();
    if (nowMs - this.lastClickTime < 40) return; // منع التكرار المزدوج السريع
    this.lastClickTime = nowMs;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.028);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.028);
    } catch {}
  }

  /**
   * صوت تبديل التبويبات والأقسام (Tactile tab switch)
   */
  public playTabClick() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.035);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.035);
    } catch {}
  }

  /**
   * صوت تبديل خيار أو زر تشغيل (Switch toggle)
   */
  public playToggle() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.04);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}
  }

  /**
   * نغمة نجاح تسجيل الحضور في الوقت المحدد (Chime مزدوج صاعد)
   */
  public playSuccessCheckin() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Note 1 (880 Hz - A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Note 2 (1320 Hz - E6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now + 0.08);
      gain2.gain.setValueAtTime(0.2, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.35);
    } catch {}
  }

  /**
   * نغمة تسجيل الحضور مع تأخير (نغمة مميزة تحذيرية لطيفة)
   */
  public playLateCheckin() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  /**
   * نغمة خطأ أو باركود غير مسجل أو موظف موقوف (Buzz منخفض تحذيري)
   */
  public playError() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  /**
   * نقرة إلكترونية خفيفة عند المسح (Scan Beep)
   */
  public playBeep() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  public playSuccess() {
    this.playSuccessCheckin();
  }

  public playWarning() {
    this.playLateCheckin();
  }

  /**
   * صوت ربط صح مع جهاز البصمة (Device Connected Successfully Chime)
   * نغمة إلكترونية متناغمة صاعدة ثلاثية مميزة تؤكد اتصال الجهاز الحقيقي بالشبكة
   */
  public playDeviceConnectedSound() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Note 1: 523.25 Hz (C5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Note 2: 659.25 Hz (E5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.08);
      gain2.gain.setValueAtTime(0.2, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.22);

      // Note 3: 1046.5 Hz (C6)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1046.5, now + 0.16);
      gain3.gain.setValueAtTime(0.22, now + 0.16);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.16);
      osc3.stop(now + 0.42);
    } catch {}
  }

  /**
   * صوت تنبيه عدم ربط الجهاز (Device Disconnected / Unreachable Alert)
   * نغمة تحذيرية منخفضة مزدوجة تنبه المستخدم فوراً إلى تعذر الاتصال بجهاز البصمة
   * تم كتم الأصوات المتكررة التلقائية وجعلها تعمل حصرياً عند الفحص اليدوي المباشر والطلب
   */
  public playDeviceDisconnectedSound(options?: { isManualInspection?: boolean; force?: boolean }) {
    if (!this.enabled) return;

    // كتم الأصوات المتكررة التلقائية إذا لم تكن عملية فحص يدوي صريحة
    if (!options?.force && !options?.isManualInspection && this.biometricDisconnectSoundMuted) {
      return;
    }

    const nowMs = Date.now();
    // حماية إضافية من التكرار الإزعاجي: لا يتم إطلاق الصوت أكثر من مرة واحدة كل 3 ثوانٍ
    if (nowMs - this.lastDisconnectSoundTime < 3000) {
      return;
    }
    this.lastDisconnectSoundTime = nowMs;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Pulse 1: 330 Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(330, now);
      osc1.frequency.exponentialRampToValueAtTime(260, now + 0.15);
      gain1.gain.setValueAtTime(0.22, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.16);

      // Pulse 2: 220 Hz
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(220, now + 0.14);
      osc2.frequency.exponentialRampToValueAtTime(160, now + 0.35);
      gain2.gain.setValueAtTime(0.24, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.38);
    } catch {}
  }

  /**
   * صوت التقاط صورة بالكاميرا (Camera Shutter Click)
   */
  public playCameraShutter() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Mechanical click 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1200, now);
      osc1.frequency.exponentialRampToValueAtTime(180, now + 0.04);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.04);

      // Shutter mirror slap 2
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(800, now + 0.045);
      osc2.frequency.exponentialRampToValueAtTime(120, now + 0.11);
      gain2.gain.setValueAtTime(0.25, now + 0.045);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.045);
      osc2.stop(now + 0.12);
    } catch {}
  }

  /**
   * صوت مسح السكانر الضوئي (Scanner Optical Sweep)
   */
  public playScannerSweep() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(1400, now + 0.35);
      osc.frequency.linearRampToValueAtTime(880, now + 0.6);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.62);
    } catch {}
  }

  /**
   * تهيئة استماع عام للنقرات في كامل النظام لربط جميع الأزرار بالمؤثرات الصوتية فوراً
   */
  public initGlobalButtonSounds() {
    if (typeof window === 'undefined' || this.isGlobalAttached) return;
    this.isGlobalAttached = true;

    const handleTap = (e: Event) => {
      if (!this.enabled) return;
      const raw = e.target as any;
      const target = (raw instanceof Element ? raw : raw?.parentElement) as Element | null;
      if (!target || typeof target.closest !== 'function') return;

      const clickable = target.closest(
        'button, [role="button"], a, input[type="submit"], input[type="button"], select, input[type="checkbox"], input[type="radio"], .cursor-pointer, [data-clickable="true"]'
      );

      if (clickable) {
        if (clickable.getAttribute('data-no-sound') === 'true') return;
        this.playButtonClick();
      }
    };

    document.addEventListener('click', handleTap, true);

    document.addEventListener(
      'pointerdown',
      () => {
        // تنشيط سياق الصوت فور ملامسة الشاشة أو النقر
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      },
      { capture: true, passive: true }
    );
  }
}

export const soundEffects = new SoundEffectsService();
