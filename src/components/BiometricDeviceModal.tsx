import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Building2,
  Network,
  Fingerprint,
  ScanFace,
  Cable,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Laptop,
  Save,
  KeyRound,
  Radio,
  FileSpreadsheet,
  Cloud,
  Eye,
  Hand,
  CreditCard,
  Hash,
  Mic,
} from 'lucide-react';
import {
  BiometricDevice,
  BiometricBrand,
  BiometricModality,
  BiometricConnectionType,
  Department,
} from '../types';
import { biometricService } from '../services/biometricService';
import { toast } from './ToastNotification';

interface BiometricDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceToEdit?: BiometricDevice | null;
  departments: Department[];
  onDeviceSaved: (device: BiometricDevice) => void;
}

export const BiometricDeviceModal: React.FC<BiometricDeviceModalProps> = ({
  isOpen,
  onClose,
  deviceToEdit,
  departments,
  onDeviceSaved,
}) => {
  const [formData, setFormData] = useState<Partial<BiometricDevice>>({
    id: '',
    name: '',
    model: 'ZKTeco uFace800 Plus',
    brand: 'zkteco',
    deviceType: 'multi_biometric',
    ipAddress: '192.168.1.201',
    port: 4370,
    subnetMask: '255.255.255.0',
    gateway: '192.168.1.1',
    connectionType: 'tcp_ip',
    serialNumber: '',
    commKey: '0',
    departmentName: '',
    location: '',
    notes: '',
  });

  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{
    success: boolean;
    latency: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (deviceToEdit) {
      setFormData(deviceToEdit);
    } else {
      const generatedId = `DEV-ZK-${Math.floor(10 + Math.random() * 90)}`;
      setFormData({
        id: generatedId,
        name: '',
        model: 'ZKTeco uFace800 Plus',
        brand: 'zkteco',
        deviceType: 'multi_biometric',
        ipAddress: `192.168.1.${Math.floor(200 + Math.random() * 50)}`,
        port: 4370,
        subnetMask: '255.255.255.0',
        gateway: '192.168.1.1',
        connectionType: 'tcp_ip',
        serialNumber: `SN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        commKey: '0',
        departmentName: departments[0]?.name || 'المدخل العام والمصاعد',
        location: 'المدخل الإداري الرئيسي',
        notes: '',
      });
    }
    setPingResult(null);
  }, [deviceToEdit, isOpen, departments]);

  // Suggest default port based on brand & protocol
  const handleBrandChange = (brand: BiometricBrand) => {
    let suggestedPort = 4370;
    if (brand === 'hikvision') suggestedPort = 80;
    else if (brand === 'dahua') suggestedPort = 37777;
    else if (brand === 'realand') suggestedPort = 5005;
    else if (brand === 'anviz') suggestedPort = 5010;
    else if (brand === 'suprema') suggestedPort = 51211;

    setFormData((prev) => ({
      ...prev,
      brand,
      port: prev.port === 4370 || prev.port === 80 || prev.port === 5005 ? suggestedPort : prev.port,
    }));
  };

  // Handle Quick Real Ping from inside the Modal
  const handleTestPing = async () => {
    if (!formData.ipAddress?.trim()) {
      toast.error('يرجى إدخال عنوان الآي بي أولاً');
      return;
    }
    setIsPinging(true);
    setPingResult(null);
    try {
      const mockDevice: BiometricDevice = {
        id: formData.id || deviceToEdit?.id || 'TEST',
        name: formData.name || 'جهاز فحص',
        model: formData.model || '',
        brand: formData.brand || 'zkteco',
        deviceType: formData.deviceType || 'fingerprint',
        ipAddress: formData.ipAddress,
        port: Number(formData.port) || 4370,
        connectionType: formData.connectionType || 'tcp_ip',
        location: formData.location || '',
        status: 'offline',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = await biometricService.pingDevice(mockDevice);
      setPingResult({
        success: res.success,
        latency: res.latencyMs,
        message: res.details,
      });
      if (res.success) {
        toast.success(`فحص البينغ ناجح! زمن الاستجابة: ${res.latencyMs}ms`);
      } else {
        toast.error('فشل الاتصال: الجهاز غير متصل بالشبكة أو غير موصول');
      }
    } catch {
      setPingResult({
        success: false,
        latency: 0,
        message: 'حدث خطأ أثناء إجراء اختبار الاتصال الشبكي الحقيقي.',
      });
    } finally {
      setIsPinging(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.ipAddress?.trim()) {
      toast.error('يرجى إكمال الحقول الإلزامية (اسم الجهاز وعنوان الآي بي).');
      return;
    }

    const assignedId = (formData.id || '').trim() || (deviceToEdit ? deviceToEdit.id : `DEV-${Date.now().toString().slice(-4)}`);

    const deviceToSave: BiometricDevice = {
      id: assignedId,
      name: formData.name.trim(),
      model: formData.model || 'Standard Terminal',
      brand: formData.brand || 'zkteco',
      deviceType: formData.deviceType || 'multi_biometric',
      ipAddress: formData.ipAddress.trim(),
      port: Number(formData.port) || 4370,
      subnetMask: formData.subnetMask || '255.255.255.0',
      gateway: formData.gateway || '192.168.1.1',
      connectionType: formData.connectionType || 'tcp_ip',
      serialNumber: formData.serialNumber?.trim() || undefined,
      commKey: formData.commKey?.trim() || '0',
      departmentName: formData.departmentName || 'عام',
      location: formData.location?.trim() || 'المدخل الرئيسي',
      status: pingResult?.success
        ? 'online'
        : deviceToEdit?.status
        ? deviceToEdit.status
        : 'offline',
      lastPingLatencyMs: pingResult?.success ? pingResult.latency : deviceToEdit?.lastPingLatencyMs,
      lastPingAt: pingResult?.success ? new Date().toISOString() : deviceToEdit?.lastPingAt,
      userCount: deviceToEdit?.userCount || 25,
      logCount: deviceToEdit?.logCount || 0,
      notes: formData.notes?.trim() || undefined,
      createdAt: deviceToEdit ? deviceToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const saved = await biometricService.saveDevice(deviceToSave);
      onDeviceSaved(saved);
      toast.success(
        deviceToEdit
          ? `تم تحديث إعدادات جهاز البصمة [${saved.id} - ${saved.name}] بنجاح!`
          : `تمت إضافة جهاز البصمة الجديد [${saved.id} - ${saved.name}] بالمنظومة بنجاح!`
      );
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ في حفظ الجهاز';
      toast.error(msg);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {deviceToEdit ? 'تعديل إعدادات وجهاز البصمة' : 'إضافة جهاز بصمة جديد وربطه بالمنظومة'}
                </h3>
                {formData.id && (
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800" dir="ltr">
                    #{formData.id}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                تعديل عنوان الآي بي (IP)، المنفذ، رقم المعرف، نوع البصمة، وفحص البينغ الحقيقي
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* 1. Device ID & Device Name */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-4">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                رقم / معرف الجهاز (ID): <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.id || ''}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="مثال: DEV-ZK-01"
                dir="ltr"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono font-bold text-xs"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">الرمز المميز للجهاز في السجلات والتقارير</span>
            </div>

            <div className="sm:col-span-8">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                اسم الجهاز التعريفي: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: جهاز بصمة الإدارة الهندسية - ZKTeco"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">الاسم الظاهر للموظفين والإدارات</span>
            </div>
          </div>

          {/* 2. Brand & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                الشركة المصنعة / الماركة (Brand):
              </label>
              <select
                value={formData.brand || 'zkteco'}
                onChange={(e) => handleBrandChange(e.target.value as BiometricBrand)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
              >
                <option value="zkteco">ZKTeco (سلسلة uFace, SilkBio, iFace, K-Series)</option>
                <option value="hikvision">Hikvision (محطات التعرف على الوجه DS-K1T)</option>
                <option value="dahua">Dahua Technology (محطات بصمة الوجه ASI)</option>
                <option value="realand">Realand (أجهزة البصمة المباشرة USB/LAN)</option>
                <option value="anviz">Anviz (FacePass, C2, EP300, VF Series)</option>
                <option value="suprema">Suprema (BioStation, FaceStation)</option>
                <option value="virdi">Virdi Biometrics (AC Series)</option>
                <option value="idemia">IDEMIA / Morpho (Sigma Series)</option>
                <option value="matrix">Matrix Comsec (COSEC Series)</option>
                <option value="universal_usb">جهاز بصمة مدمج / USB عام (Universal HID)</option>
                <option value="other">أجهزة بصمة أخرى (Generic Biometric)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                موديل الجهاز (Model):
              </label>
              <input
                type="text"
                value={formData.model || ''}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="مثال: uFace800 Plus / DS-K1T671"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          {/* 3. Biometric Modality & Connection Method (Support ALL types) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                نوع وطريقة البصمة الحيوية (Modality):
              </label>
              <select
                value={formData.deviceType || 'multi_biometric'}
                onChange={(e) => setFormData({ ...formData, deviceType: e.target.value as BiometricModality })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
              >
                <option value="multi_biometric">🌟 متعدد حيوي شامل (وجه + إصبع + كف + بطاقة + كود)</option>
                <option value="fingerprint">👆 بصمة الإصبع الحيوية (Optical / SilkID Fingerprint)</option>
                <option value="face">👤 بصمة الوجه الذكية (AI Facial Recognition)</option>
                <option value="palm">✋ بصمة الكف والأوردة (Palm Vein Recognition)</option>
                <option value="iris">👁️ بصمة قزحية العين (Iris Biometric Scan)</option>
                <option value="iris_palm">👁️✋ بصمة مشتركة للعين والكف (Iris & Palm)</option>
                <option value="rfid_card">💳 بطاقات القرب الذكية (RFID / Mifare / NFC Card)</option>
                <option value="password">🔢 الرمز السري والرقم التعريفي (PIN Code / Passcode)</option>
                <option value="voice">🎙️ بصمة الصوت الحيوية (Voice Recognition)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                طريقة التوصيل والبروتوكول (Connection):
              </label>
              <select
                value={formData.connectionType || 'tcp_ip'}
                onChange={(e) =>
                  setFormData({ ...formData, connectionType: e.target.value as BiometricConnectionType })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-bold"
              >
                <option value="tcp_ip">🌐 شبكة سلكية LAN (TCP/IP Standalone Port 4370)</option>
                <option value="wifi">📶 شبكة لاسلكية (Wi-Fi TCP/IP)</option>
                <option value="usb_direct">💻 كابل USB مباشر بالحاسبة (WebUSB / WebSerial)</option>
                <option value="cloud_adms">☁️ بروتوكول السحابة ADMS Push / Cloud Server</option>
                <option value="http_api">🔌 واجهة برمجية HTTP / REST API (هيكفيجن / داهوا)</option>
                <option value="rs485">📟 منفذ تسلسلي (RS485 / COM Serial Port)</option>
                <option value="usb_flash_import">💾 استيراد فلاش ميموري USB (.dat, .csv, .xlsx, .txt)</option>
              </select>
            </div>
          </div>

          {/* 4. IP ADDRESS & PORT SETTINGS (EDITABLE FOR REAL NETWORK) */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-950 dark:text-indigo-200 text-xs flex items-center gap-1.5">
                <Network className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>إعدادات الآي بي الحقيقي (IP Address) والمنفذ وفحص البينغ</span>
              </span>

              <button
                type="button"
                onClick={handleTestPing}
                disabled={isPinging || !formData.ipAddress}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="فحص الاتصال الحقيقي بدون أي محاكاة"
              >
                <Activity className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                <span>{isPinging ? 'جارٍ الفحص الحقيقي...' : 'فحص البينغ الفعلي (Ping Test)'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* IP Address Input */}
              <div className="sm:col-span-8">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان الآي بي الفعلي (Device IP): <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.ipAddress || ''}
                  onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  placeholder="أدخل عنوان الآي بي الحقيقي للجهاز (مثال: 192.168.1.201)"
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs font-bold"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  يمكنك تعديل الآي بي إلى الآي بي الحقيقي المخصص للجهاز في شبكتك المحلية
                </span>
              </div>

              {/* Port Input */}
              <div className="sm:col-span-4">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم المنفذ (Port):
                </label>
                <input
                  type="number"
                  required
                  value={formData.port || 4370}
                  onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                  placeholder="4370"
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs font-bold"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  الافتراضي: 4370 للـ ZKTeco
                </span>
              </div>
            </div>

            {/* Ping Result Live Alert */}
            {pingResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                  pingResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {pingResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{pingResult.message}</span>
                </div>
                {pingResult.success && (
                  <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-emerald-200/60 dark:bg-emerald-900/60">
                    {pingResult.latency} ms
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 5. Subnet & Gateway & CommKey & Serial Number */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                قناع الشبكة (Subnet):
              </label>
              <input
                type="text"
                value={formData.subnetMask || '255.255.255.0'}
                onChange={(e) => setFormData({ ...formData, subnetMask: e.target.value })}
                placeholder="255.255.255.0"
                dir="ltr"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                البوابة (Gateway):
              </label>
              <input
                type="text"
                value={formData.gateway || '192.168.1.1'}
                onChange={(e) => setFormData({ ...formData, gateway: e.target.value })}
                placeholder="192.168.1.1"
                dir="ltr"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                رمز الاتصال (CommKey):
              </label>
              <input
                type="text"
                value={formData.commKey || '0'}
                onChange={(e) => setFormData({ ...formData, commKey: e.target.value })}
                placeholder="افتراضي: 0"
                dir="ltr"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                الرقم التسلسلي (Serial):
              </label>
              <input
                type="text"
                value={formData.serialNumber || ''}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                placeholder="ZK-XXXXX"
                dir="ltr"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs"
              />
            </div>
          </div>

          {/* 6. Department & Location Integration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                القسم / التشكيل الإداري المرتبط:
              </label>
              <select
                value={formData.departmentName || ''}
                onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
              >
                <option value="المدخل العام والمصاعد">المدخل العام والمصاعد (شامل لكل الموظفين)</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                موقع التثبيت الميداني للجهاز:
              </label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="مثال: الاستقبال المركزي - الطابق الأرضي"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
              />
            </div>
          </div>

          {/* 7. Notes */}
          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
              ملاحظات إضافية عن الجهاز:
            </label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="مثال: متصل بباب الكتروني Access Control، مخصص لتسجيل دوام وجبات الصباح والمساء..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none text-xs"
            />
          </div>

          {/* FORM FOOTER */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              إلغاء التراجع
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{deviceToEdit ? 'حفظ تعديلات الجهاز والآي بي' : 'حفظ وإضافة جهاز البصمة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
