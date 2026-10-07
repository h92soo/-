import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  RotateCw,
  Sun,
  Contrast,
  Sparkles,
  Zap,
  Eye,
  Layers,
  BookOpen,
  Book,
  Timer,
  ZoomIn,
  ZoomOut,
  FolderOpen,
  ShieldCheck,
  Tag,
  Hash,
  Calendar,
  Grid,
  SunMedium,
  Check,
  Layers as LayersIcon,
  HelpCircle,
} from 'lucide-react';
import {
  Employee,
  ArchivedDocument,
  ArchivedDocumentCategory,
  ARCHIVE_DOCUMENT_CATEGORIES,
} from '../types';
import { archiveService } from '../services/archiveService';
import { soundEffects } from '../utils/soundEffects';
import { toast } from './ToastNotification';

export type BookPresetMode =
  | 'book_dual_page' // وضع تصوير الكتاب (صفحتين مفتوحتين مع خط منتصف)
  | 'single_page' // وثيقة رسمية A4
  | 'vintage_whitening' // كتب قديمة وورق أصفر (تبييض الخلفية وإبراز الحبر)
  | 'preserve_stamps' // إبراز النص وحفظ الأختام الملونة بالأحمر والأزرق
  | 'handwritten_notes' // مخطوطات وهوامش وتهميشات القلم
  | 'bw_document' // وثائقي أبيض وأسود عالي التباين
  | 'color_enhanced'; // ألوان معززة للشهادات والباجات

interface DocumentScannerCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureCompleted: (
    fileDataUrl: string,
    fileName: string,
    fileType: string,
    source: 'scanner' | 'camera' | 'file_upload'
  ) => void;
  initialEmployeeName?: string;
  initialEmployeeId?: string;
  employees?: Employee[];
  onDirectArchiveSaved?: (savedDoc?: ArchivedDocument) => void;
}

export const DocumentScannerCameraModal: React.FC<DocumentScannerCameraModalProps> = ({
  isOpen,
  onClose,
  onCaptureCompleted,
  initialEmployeeName,
  initialEmployeeId,
  employees = [],
  onDirectArchiveSaved,
}) => {
  const [activeMode, setActiveMode] = useState<'camera' | 'scanner_file'>('camera');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // أنماط تصوير الكتب والمستندات (Book Photography Presets)
  const [bookPreset, setBookPreset] = useState<BookPresetMode>('book_dual_page');
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [isMirrored, setIsMirrored] = useState<boolean>(false);
  const [contrastLevel, setContrastLevel] = useState<number>(135); // 100-200%
  const [brightnessLevel, setBrightnessLevel] = useState<number>(105); // 80-150%
  const [whiteningStrength, setWhiteningStrength] = useState<number>(140); // 100-180
  const [isProcessingFilter, setIsProcessingFilter] = useState<boolean>(false);

  // خيارات التصوير والتحكم الذكي
  const [captureTimer, setCaptureTimer] = useState<0 | 3 | 5>(0);
  const [timerCountdown, setTimerCountdown] = useState<number | null>(null);
  const [digitalZoom, setDigitalZoom] = useState<1 | 1.25 | 1.5 | 2>(1);
  const [screenTorchActive, setScreenTorchActive] = useState<boolean>(false);
  const [showBookGrid, setShowBookGrid] = useState<boolean>(true);
  const [continuousBatchMode, setContinuousBatchMode] = useState<boolean>(false);
  const [batchPageCounter, setBatchPageCounter] = useState<number>(1);

  // أجهزة المسح المتصلة (USB Scanner / WebCam / Document Camera)
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedResolution, setSelectedResolution] = useState<'1080p' | '4k' | '720p'>('1080p');

  // بيانات الأرشفة المباشرة الفورية في الإضبارة
  const [selectedEmpId, setSelectedEmpId] = useState<string>(initialEmployeeId || '');
  const [archiveCategory, setArchiveCategory] = useState<ArchivedDocumentCategory>('administrative_order');
  const [archiveTitle, setArchiveTitle] = useState<string>('');
  const [archiveRefNumber, setArchiveRefNumber] = useState<string>('');
  const [isDirectArchiving, setIsDirectArchiving] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // Sync initial employee id
  useEffect(() => {
    if (initialEmployeeId) {
      setSelectedEmpId(initialEmployeeId);
    } else if (employees.length > 0 && !selectedEmpId) {
      setSelectedEmpId(employees[0].id);
    }
  }, [initialEmployeeId, employees, selectedEmpId]);

  // Set default document title
  useEffect(() => {
    if (!archiveTitle) {
      const todayStr = new Date().toLocaleDateString('ar-IQ', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });
      setArchiveTitle(`كتاب رسمي ممسوح ضوئياً (${todayStr})`);
    }
  }, [archiveTitle]);

  // Enumerate connected devices (scanners & cameras)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setVideoDevices(videoInputs);
          if (videoInputs.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(videoInputs[0].deviceId);
          }
        })
        .catch((e) => console.warn('Could not enumerate devices:', e));
    }
  }, [isOpen]);

  // Start / stop camera stream
  useEffect(() => {
    if (isOpen && activeMode === 'camera' && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isOpen, activeMode, capturedImage, selectedDeviceId, selectedResolution]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('متصفحك لا يدعم فتح الكاميرا المباشرة أو الأذونات غير ممنوحة.');
      }

      const resWidth = selectedResolution === '4k' ? 3840 : selectedResolution === '720p' ? 1280 : 1920;
      const resHeight = selectedResolution === '4k' ? 2160 : selectedResolution === '720p' ? 720 : 1080;

      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: resWidth },
        height: { ideal: resHeight },
      };

      if (selectedDeviceId) {
        videoConstraints.deviceId = { exact: selectedDeviceId };
      } else {
        videoConstraints.facingMode = 'environment';
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);

      // Refresh devices in case labels were previously unpopulated
      if (navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setIsCameraActive(false);
      setCameraError(
        'تعذر الاتصال المباشر بكاميرا الماسح المكتبي. يمكنك استخدام خيار "سحب من السكانر / رفع ملف" بدلاً من ذلك.'
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Perform snapshot from video feed (incorporating digital zoom)
  const executeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    soundEffects.playCameraShutter();

    const canvas = document.createElement('canvas');
    const vw = video.videoWidth || 1920;
    const vh = video.videoHeight || 1080;

    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (digitalZoom > 1) {
      // Zoom crop
      const cropW = vw / digitalZoom;
      const cropH = vh / digitalZoom;
      const startX = (vw - cropW) / 2;
      const startY = (vh - cropH) / 2;
      ctx.drawImage(video, startX, startY, cropW, cropH, 0, 0, vw, vh);
    } else {
      ctx.drawImage(video, 0, 0, vw, vh);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);
    stopCamera();
    setTimerCountdown(null);
  };

  // Trigger snapshot with timer handling
  const handleTakeSnapshotWithTimer = () => {
    if (!isCameraActive) return;
    if (captureTimer === 0) {
      executeSnapshot();
      return;
    }

    // Hands-free countdown timer
    let count = captureTimer;
    setTimerCountdown(count);
    soundEffects.playButtonClick();

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setTimerCountdown(count);
        soundEffects.playButtonClick();
      } else {
        clearInterval(timerIntervalRef.current);
        setTimerCountdown(null);
        executeSnapshot();
      }
    }, 1000);
  };

  // Handle uploaded scan / PDF image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundEffects.playScannerSweep();
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCapturedImage(result);
      setActiveMode('scanner_file');
    };
    reader.readAsDataURL(file);
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    setTimerCountdown(null);
    if (activeMode === 'camera') {
      startCamera();
    }
  };

  // Apply rich book-photography filters & corrections
  const applyFilterToCanvas = (sourceImgData: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;

        // Rotation
        if (rotationDegrees === 90 || rotationDegrees === 270) {
          canvas.width = h;
          canvas.height = w;
        } else {
          canvas.width = w;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(sourceImgData);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotationDegrees * Math.PI) / 180);
        if (isMirrored) {
          ctx.scale(-1, 1);
        }
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        const contrast = (contrastLevel - 100) / 100;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const brightnessOffset = (brightnessLevel - 100) * 1.5;

        // Pixel-by-pixel processing per Book Preset
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // 1. وضع الكتب القديمة وتبييض الورق الأصفر (Vintage Whitening)
          if (bookPreset === 'vintage_whitening') {
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            // تبييض خلفية الورق الأصفر والشوائب مع إبراز الحبر الأسود
            if (lum > whiteningStrength) {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
            } else {
              // زيادة سواد ووضوح الحبر
              const textDarkness = Math.max(0, lum * 0.45);
              data[i] = textDarkness;
              data[i + 1] = textDarkness;
              data[i + 2] = textDarkness;
            }
            continue;
          }

          // 2. وضع إبراز النص مع حفظ الأختام الملونة بالأحمر والأزرق (Preserve Official Stamps)
          if (bookPreset === 'preserve_stamps') {
            // كشف اللون الأحمر للختم الرسمي
            const isRedStamp = r > 115 && r > g * 1.35 && r > b * 1.35;
            // كشف اللون الأزرق للختم الرسمي أو توقيع الحبر الأزرق
            const isBlueStamp = b > 115 && b > r * 1.25 && b > g * 1.15;

            if (isRedStamp || isBlueStamp) {
              // المحافظة على لون الختم الأصلي مع تعزيز تشبعه
              data[i] = Math.min(255, r * 1.15);
              data[i + 1] = Math.min(255, g * 0.95);
              data[i + 2] = Math.min(255, b * 1.15);
            } else {
              // باقي الورقة والنصوص تحول إلى أبيض ناصع وأسود واضح
              let gray = 0.299 * r + 0.587 * g + 0.114 * b;
              gray += brightnessOffset;
              gray = factor * (gray - 128) + 128;
              gray = gray > 145 ? 255 : Math.max(0, gray * 0.4);
              data[i] = gray;
              data[i + 1] = gray;
              data[i + 2] = gray;
            }
            continue;
          }

          // 3. وضع تصوير الكتاب (صفحتين مفتوحتين) أو وثيقة فردية A4
          if (bookPreset === 'book_dual_page' || bookPreset === 'single_page' || bookPreset === 'bw_document') {
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;
            gray += brightnessOffset;
            gray = factor * (gray - 128) + 128;

            if (bookPreset === 'bw_document') {
              gray = gray > 140 ? 255 : Math.max(0, gray * 0.55);
            } else {
              // إبقاء تدرج رمادي ناعم مع تبييض ذكي لحواف الكتاب
              gray = gray > 175 ? 255 : gray;
            }

            gray = Math.max(0, Math.min(255, gray));
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
            continue;
          }

          // 4. وضع المخطوطات وتهميشات القلم
          if (bookPreset === 'handwritten_notes') {
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;
            gray += brightnessOffset * 0.8;
            gray = factor * (gray - 128) + 128;
            // تعزيز التباين الموضعي لحبر القلم الجاف والرصاص
            gray = gray > 160 ? 255 : Math.max(0, gray * 0.6);
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
            continue;
          }

          // 5. وضع الألوان المعززة
          if (bookPreset === 'color_enhanced') {
            data[i] = Math.min(255, Math.max(0, factor * (r - 128) + 128 + brightnessOffset));
            data[i + 1] = Math.min(255, Math.max(0, factor * (g - 128) + 128 + brightnessOffset));
            data[i + 2] = Math.min(255, Math.max(0, factor * (b - 128) + 128 + brightnessOffset));
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.93));
      };
      img.src = sourceImgData;
    });
  };

  // أرشفة الكتاب مباشرة في إضبارة الموظف فوراً وبسرعة فائقة (Fast 1-Click Direct Archive)
  const handleFastDirectArchive = async () => {
    if (!capturedImage) return;
    const targetEmp = employees.find((e) => e.id === selectedEmpId) || {
      id: selectedEmpId || 'EMP-GENERAL',
      fullName: initialEmployeeName || 'موظف عام',
      employeeNumber: '0000',
      department: 'الأرشيف العام',
    };

    setIsDirectArchiving(true);
    soundEffects.playScannerSweep();

    try {
      // معالجة الفلتر على الصورة
      const processedImage = await applyFilterToCanvas(capturedImage);
      const fileName = `كتاب_ممسوح_${Date.now().toString().slice(-6)}.jpg`;

      // توليد المصغرة الفورية
      const thumbnail = await archiveService.generateThumbnail(processedImage);

      // استخراج الـ OCR الذكي
      const ocrResult = await archiveService.processOcr(processedImage, {
        isHandwritten: bookPreset === 'handwritten_notes',
        documentTitle: archiveTitle,
        category: archiveCategory,
      });

      const todayStr = new Date().toISOString().slice(0, 10);
      const newDoc: ArchivedDocument = {
        id: `DOC-SCN-${Date.now().toString().slice(-6)}`,
        employeeId: targetEmp.id,
        employeeName: targetEmp.fullName,
        employeeNumber: (targetEmp as any).employeeNumber || '0000',
        department: (targetEmp as any).department || 'الأرشيف العام',
        documentTitle: archiveTitle || `كتاب رسمي ممسوح ضوئياً (${todayStr})`,
        category: archiveCategory,
        referenceNumber: archiveRefNumber || ocrResult.referenceNumber || `${Math.floor(1000 + Math.random() * 9000)}/أ/2026`,
        documentDate: ocrResult.documentDate || todayStr,
        issuingAuthority: ocrResult.issuingAuthority || 'دائرة الموارد المائية - قسم الأرشفة والكتب الرسمية',
        fileUrl: processedImage,
        thumbnailUrl: thumbnail,
        fileName,
        fileType: 'image/jpeg',
        source: activeMode === 'camera' ? 'camera' : 'scanner',
        isHandwritten: bookPreset === 'handwritten_notes',
        ocrExtractedText: ocrResult.extractedText,
        ocrConfidence: ocrResult.confidence,
        ocrStatus: 'completed',
        ocrProcessedAt: new Date().toISOString(),
        handwrittenNotes: ocrResult.handwrittenNotes,
        detectedKeywords: ocrResult.detectedKeywords,
        archiveCabinet: 'خزانة الكتب الرسمية A-1 / رف 2',
        archiveFolderCode: `DOS-${targetEmp.id}`,
        confidentiality: 'normal',
        archivedBy: 'مسؤول الأرشفة والماسح الضوئي',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // الحفظ الفوري المباشر في قاعدة الأرشيف
      await archiveService.save(newDoc);
      soundEffects.playSuccess();

      toast.success(
        `✅ تم أرشفة الكتاب فوراً في إضبارة [${targetEmp.fullName}] برقم (${newDoc.referenceNumber}) بدقة OCR ${ocrResult.confidence}% 📁`
      );

      if (onDirectArchiveSaved) {
        onDirectArchiveSaved(newDoc);
      }

      // إذا كان وضع الدفعات المتتالية مفعلاً (المسح المتتابع للكتب 📚)
      if (continuousBatchMode) {
        setBatchPageCounter((p) => p + 1);
        setCapturedImage(null);
        setArchiveTitle(`كتاب رسمي ممسوح ضوئياً - صفحة #${batchPageCounter + 1}`);
        startCamera();
        toast.info(`📖 المسح المتتابع جاهز: يمكنك مسح وتصوير الصفحة #${batchPageCounter + 1} الآن.`);
      } else {
        // إشعار اكتمال وإغلاق النافذة
        onCaptureCompleted(
          processedImage,
          fileName,
          'image/jpeg',
          activeMode === 'camera' ? 'camera' : 'scanner'
        );
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      toast.error('تعذر أرشفة الكتاب، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsDirectArchiving(false);
    }
  };

  // Submit standard scan without direct archive (for general upload form)
  const handleConfirmScanStandard = async () => {
    if (!capturedImage) return;
    setIsProcessingFilter(true);
    soundEffects.playScannerSweep();

    const finalFiltered = await applyFilterToCanvas(capturedImage);
    setIsProcessingFilter(false);

    const fileName = `مستند_ممسوح_${Date.now().toString().slice(-6)}.jpg`;
    onCaptureCompleted(
      finalFiltered,
      fileName,
      'image/jpeg',
      activeMode === 'camera' ? 'camera' : 'scanner'
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      {/* White Screen Torch Glow Frame (إضاءة الشاشة البيضاء لتصوير الكتب وإزالة الظلال) */}
      {screenTorchActive && (
        <div className="fixed inset-0 pointer-events-none z-40 bg-white/40 ring-[60px] ring-white ring-inset shadow-[0_0_120px_white]" />
      )}

      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] z-50">
        {/* Header Bar */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  الماسح الضوئي الذكي وتصوير الكتب (Smart Book & Document Scanner)
                </h3>
                {continuousBatchMode && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px] animate-pulse">
                    📚 مسح متتابع (صفحة #{batchPageCounter})
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                أرشفة الكتب والوثائق مباشرة في إضبارة الموظف مع معالجة التحدب والورق الأصفر والأختام
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* White Torch Light Toggle */}
            <button
              type="button"
              onClick={() => setScreenTorchActive(!screenTorchActive)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                screenTorchActive
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
              }`}
              title="إضاءة الشاشة البيضاء لإزالة الظلال من على أوراق الكتاب"
            >
              <SunMedium className="w-4 h-4" />
              <span className="hidden sm:inline">إضاءة بيضاء</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Source Selection, Hardware Scanners, Book Presets & Camera Tools */}
        <div className="px-6 py-2.5 bg-slate-100/90 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switcher */}
            <button
              type="button"
              onClick={() => {
                setActiveMode('camera');
                setCapturedImage(null);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMode === 'camera'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>الكاميرا / الماسح المكتبي المباشر</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode('scanner_file');
                fileInputRef.current?.click();
              }}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMode === 'scanner_file'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>سحب ملف ممسوح ضوئياً</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Hardware Scanner & Camera Device Selector */}
            {activeMode === 'camera' && !capturedImage && videoDevices.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-400 font-bold">الماسح المتصل:</span>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 border-none outline-none max-w-[160px] truncate"
                >
                  {videoDevices.map((dev, idx) => (
                    <option key={dev.deviceId || idx} value={dev.deviceId}>
                      {dev.label || `ماسح ضوئي / كاميرا #${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Resolution Switcher */}
            {activeMode === 'camera' && !capturedImage && (
              <select
                value={selectedResolution}
                onChange={(e) => setSelectedResolution(e.target.value as any)}
                className="bg-white dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px] outline-none"
              >
                <option value="4k">دقة 4K فائقة</option>
                <option value="1080p">دقة 1080p قياسية</option>
                <option value="720p">دقة 720p سريعة</option>
              </select>
            )}
          </div>

          {/* Camera Tools (Timer, Zoom, Grid, Continuous Batch) */}
          {activeMode === 'camera' && !capturedImage && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Hands-free timer */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-300 dark:border-slate-700 text-[11px]">
                <Timer className="w-3.5 h-3.5 text-amber-500" />
                <select
                  value={captureTimer}
                  onChange={(e) => setCaptureTimer(Number(e.target.value) as any)}
                  className="bg-transparent font-bold text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value={0}>مؤقت: فوري</option>
                  <option value={3}>مؤقت: 3 ثوانٍ</option>
                  <option value={5}>مؤقت: 5 ثوانٍ</option>
                </select>
              </div>

              {/* Digital Zoom */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-300 dark:border-slate-700 text-[11px]">
                <ZoomIn className="w-3.5 h-3.5 text-blue-500" />
                <select
                  value={digitalZoom}
                  onChange={(e) => setDigitalZoom(Number(e.target.value) as any)}
                  className="bg-transparent font-mono font-bold text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value={1}>تقريب: 1.0x</option>
                  <option value={1.25}>تقريب: 1.25x</option>
                  <option value={1.5}>تقريب: 1.5x</option>
                  <option value={2}>تقريب: 2.0x</option>
                </select>
              </div>

              {/* Grid Toggle */}
              <button
                type="button"
                onClick={() => setShowBookGrid(!showBookGrid)}
                className={`p-1.5 rounded-xl border transition-colors ${
                  showBookGrid
                    ? 'bg-amber-100 dark:bg-amber-950 border-amber-400 text-amber-700 dark:text-amber-300'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600'
                }`}
                title="إظهار / إخفاء شبكة محاذاة الكتب والوثائق"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>

              {/* Continuous Batch Mode */}
              <label className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-1 rounded-xl border border-purple-200 dark:border-purple-800/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={continuousBatchMode}
                  onChange={(e) => setContinuousBatchMode(e.target.checked)}
                  className="rounded accent-purple-600"
                />
                <span>مسح متتابع للكتب 📚</span>
              </label>
            </div>
          )}

          {/* Quick rotation & retake if image captured */}
          {capturedImage && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRotationDegrees((d) => (d + 90) % 360)}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1 hover:bg-slate-50 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-500" />
                <span>تدوير ({rotationDegrees}°)</span>
              </button>

              <button
                type="button"
                onClick={handleRetake}
                className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold flex items-center gap-1 hover:bg-rose-100 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة الالتقاط</span>
              </button>
            </div>
          )}
        </div>

        {/* Book Photography Presets Bar (أنماط تصوير الكتب المتعددة) */}
        <div className="px-6 py-2 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
          <span className="font-bold text-slate-500 shrink-0 text-[11px] flex items-center gap-1">
            <Book className="w-3.5 h-3.5 text-amber-500" />
            <span>نمط تصوير الكتاب:</span>
          </span>

          <button
            type="button"
            onClick={() => {
              setBookPreset('book_dual_page');
              setContrastLevel(135);
              setBrightnessLevel(105);
            }}
            className={`px-3 py-1 rounded-xl font-bold shrink-0 transition-colors flex items-center gap-1.5 border ${
              bookPreset === 'book_dual_page'
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>📖 كتاب مفتوح (صفحتين)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBookPreset('single_page');
              setContrastLevel(130);
              setBrightnessLevel(105);
            }}
            className={`px-3 py-1 rounded-xl font-bold shrink-0 transition-colors flex items-center gap-1.5 border ${
              bookPreset === 'single_page'
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>📄 وثيقة / كتاب صفحة واحدة</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBookPreset('vintage_whitening');
              setWhiteningStrength(145);
              setContrastLevel(150);
            }}
            className={`px-3 py-1 rounded-xl font-bold shrink-0 transition-colors flex items-center gap-1.5 border ${
              bookPreset === 'vintage_whitening'
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>📜 كتب قديمة (تبييض الورق الأصفر)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBookPreset('preserve_stamps');
              setContrastLevel(140);
              setBrightnessLevel(105);
            }}
            className={`px-3 py-1 rounded-xl font-bold shrink-0 transition-colors flex items-center gap-1.5 border ${
              bookPreset === 'preserve_stamps'
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>🔖 نص ناصع مع حفظ الأختام الملونة</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBookPreset('handwritten_notes');
              setContrastLevel(145);
              setBrightnessLevel(110);
            }}
            className={`px-3 py-1 rounded-xl font-bold shrink-0 transition-colors flex items-center gap-1.5 border ${
              bookPreset === 'handwritten_notes'
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>✍️ خط اليد وتهميشات القلم</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBookPreset('bw_document');
              setContrastLevel(140);
            }}
            className={`px-3 py-1 rounded-xl font-bold shrink-0 transition-colors flex items-center gap-1.5 border ${
              bookPreset === 'bw_document'
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>🔲 أبيض وأسود وثائقي</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBookPreset('color_enhanced');
              setContrastLevel(120);
            }}
            className={`px-3 py-1 rounded-xl font-bold shrink-0 transition-colors flex items-center gap-1.5 border ${
              bookPreset === 'color_enhanced'
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>🌈 ألوان معززة للشهادات</span>
          </button>
        </div>

        {/* Viewport / Live Scanner Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col items-center justify-center bg-slate-950 min-h-[360px] relative">
          {!capturedImage ? (
            /* Live Camera / Scanner View */
            <div className="relative w-full max-w-2xl aspect-[4/3] rounded-2xl overflow-hidden bg-black border-2 border-dashed border-amber-500/60 flex items-center justify-center shadow-2xl">
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      transform: `scale(${digitalZoom}) ${isMirrored ? 'scaleX(-1)' : ''}`,
                      transition: 'transform 0.2s ease',
                    }}
                    className="w-full h-full object-cover"
                  />

                  {/* Hands-free Countdown Timer Big Badge */}
                  {timerCountdown !== null && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center z-30 animate-pulse">
                      <div className="w-24 h-24 rounded-full bg-amber-500 text-white flex items-center justify-center font-mono font-black text-5xl shadow-2xl shadow-amber-500/50">
                        {timerCountdown}
                      </div>
                      <p className="mt-3 text-white font-bold text-sm bg-black/50 px-4 py-1 rounded-full">
                        ثبت صفحات الكتاب جيداً... جاري الالتقاط
                      </p>
                    </div>
                  )}

                  {/* Book & Document Alignment Overlays */}
                  {showBookGrid && (
                    <div className="absolute inset-4 pointer-events-none flex flex-col justify-between p-2 z-20">
                      {/* Top status */}
                      <div className="flex justify-between items-center text-[11px] font-mono font-bold text-amber-300 bg-black/70 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-amber-500/30">
                        <span>
                          {bookPreset === 'book_dual_page'
                            ? '📖 وضع الكتاب المفتوح (صفحتين)'
                            : '📄 إطار مسح المستند A4'}
                        </span>
                        <span className="text-emerald-400">
                          {selectedResolution} • {digitalZoom}x Zoom
                        </span>
                      </div>

                      {/* Book spine line (خط طية الكتاب الوسطي) */}
                      {bookPreset === 'book_dual_page' && (
                        <div className="absolute inset-y-6 left-1/2 -translate-x-1/2 w-0.5 border-r-2 border-dashed border-amber-400/90 flex flex-col justify-between items-center pointer-events-none">
                          <span className="text-[9px] bg-amber-500 text-slate-950 px-1 rounded font-bold -translate-y-2">
                            طية الكتاب الوسطى
                          </span>
                          <span className="text-[9px] bg-amber-500 text-slate-950 px-1 rounded font-bold translate-y-2">
                            محور التسطيح
                          </span>
                        </div>
                      )}

                      {/* Optical scanning laser beam */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse shadow-[0_0_12px_cyan]" />

                      {/* Bottom guide */}
                      <div className="flex justify-between text-[10px] text-amber-300/90 bg-black/70 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-amber-500/30">
                        <span>ضع صفحات الكتاب متوازية مع الإطار لإزالة الظلال</span>
                        <span>جاهز للأرشفة الفورية</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-6 text-center text-slate-400 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 mx-auto flex items-center justify-center text-amber-400">
                    <Camera className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    {cameraError || 'جاري تجهيز كاميرا الماسح الضوئي...'}
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    استعراض صورة من السكانر أو الذاكرة 📂
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Preview of Captured Document with Applied Presets */
            <div className="relative max-w-2xl max-h-[440px] rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-black flex items-center justify-center">
              <img
                src={capturedImage}
                alt="Captured Document"
                style={{
                  transform: `rotate(${rotationDegrees}deg) ${isMirrored ? 'scaleX(-1)' : ''}`,
                  filter:
                    bookPreset === 'bw_document'
                      ? `contrast(${contrastLevel}%) brightness(${brightnessLevel}%) grayscale(100%)`
                      : bookPreset === 'vintage_whitening'
                      ? `contrast(${contrastLevel}%) brightness(115%) grayscale(100%)`
                      : bookPreset === 'color_enhanced'
                      ? `contrast(125%) saturate(135%)`
                      : 'none',
                }}
                className="max-h-[420px] w-auto object-contain transition-all duration-200"
              />
              <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/80 text-white text-[11px] font-bold backdrop-blur-sm border border-white/20">
                معاينة كتاب ممسوح ({bookPreset})
              </span>
            </div>
          )}
        </div>

        {/* Adjustments Sliders Bar (Visible when image is captured) */}
        {capturedImage && (
          <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Contrast Slider */}
            <div className="space-y-1">
              <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <Contrast className="w-3.5 h-3.5 text-blue-500" />
                  <span>التباين (Contrast):</span>
                </span>
                <span className="font-mono text-amber-600 dark:text-amber-400">{contrastLevel}%</span>
              </div>
              <input
                type="range"
                min="100"
                max="190"
                value={contrastLevel}
                onChange={(e) => setContrastLevel(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Brightness Slider */}
            <div className="space-y-1">
              <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>السطوع (Brightness):</span>
                </span>
                <span className="font-mono text-amber-600 dark:text-amber-400">{brightnessLevel}%</span>
              </div>
              <input
                type="range"
                min="80"
                max="140"
                value={brightnessLevel}
                onChange={(e) => setBrightnessLevel(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Whitening Strength for vintage books */}
            <div className="space-y-1">
              <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span>تبييض خلفية الورق الأصفر:</span>
                </span>
                <span className="font-mono text-purple-600 dark:text-purple-400">{whiteningStrength}</span>
              </div>
              <input
                type="range"
                min="100"
                max="180"
                value={whiteningStrength}
                onChange={(e) => setWhiteningStrength(Number(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* DIRECT ARCHIVE FORM & BOTTOM ACTIONS BAR (أرشفة الكتاب مباشرة في الإضبارة) */}
        <div className="p-4 sm:px-6 sm:py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          {/* Fast Archive Metadata Inputs (تظهر دائماً لتمكين الحفظ المباشر بضغطة زر) */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
            {/* اختيار الموظف لربطه بالإضبارة فوراً */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>إضبارة الموظف:</span>
              </label>
              {employees.length > 0 ? (
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-200 outline-none"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeNumber})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  disabled
                  value={initialEmployeeName || 'الموظف المختار'}
                  className="w-full p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-semibold text-xs"
                />
              )}
            </div>

            {/* تصنيف الكتاب */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-500" />
                <span>تصنيف الكتاب:</span>
              </label>
              <select
                value={archiveCategory}
                onChange={(e) => setArchiveCategory(e.target.value as any)}
                className="w-full p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-200 outline-none"
              >
                {ARCHIVE_DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* عنوان الكتاب */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                <span>عنوان وموضوع الكتاب:</span>
              </label>
              <input
                type="text"
                value={archiveTitle}
                onChange={(e) => setArchiveTitle(e.target.value)}
                placeholder="عنوان أو موضوع الكتاب الرسمي..."
                className="w-full p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* رقم العدد الصادر / الوارد */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-purple-500" />
                <span>رقم العدد (صادر/وارد):</span>
              </label>
              <input
                type="text"
                value={archiveRefNumber}
                onChange={(e) => setArchiveRefNumber(e.target.value)}
                placeholder="مثال: 1429 / إ / 2026"
                className="w-full p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-semibold text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Buttons Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              إلغاء وإغلاق
            </button>

            <div className="flex items-center gap-2">
              {!capturedImage ? (
                <button
                  type="button"
                  disabled={!isCameraActive || timerCountdown !== null}
                  onClick={handleTakeSnapshotWithTimer}
                  className={`px-7 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
                    isCameraActive
                      ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shadow-amber-500/30'
                      : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>
                    {captureTimer > 0 ? `التقاط بمؤقت (${captureTimer} ثوانٍ) ⏱️` : 'التقاط صورة الكتاب الآن 📸'}
                  </span>
                </button>
              ) : (
                <>
                  {/* أرشفة الكتاب وحفظه مباشرة في الإضبارة بضغطة واحدة (المطلوب الرئيسي) */}
                  <button
                    type="button"
                    disabled={isDirectArchiving}
                    onClick={handleFastDirectArchive}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>
                      {isDirectArchiving
                        ? 'جاري المعالجة والأرشفة في الإضبارة...'
                        : '⚡ أرشفة الكتاب مباشرة في الإضبارة فوراً'}
                    </span>
                  </button>

                  {/* خيار الإرسال العادي لمركز الرفع */}
                  <button
                    type="button"
                    disabled={isProcessingFilter}
                    onClick={handleConfirmScanStandard}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="استخدام الصورة بدون الأرشفة المباشرة"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>تأكيد الصورة فقط</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
