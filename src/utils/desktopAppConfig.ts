/**
 * إعدادات وبروتوكول تحويل المنظومة إلى تطبيق سطح مكتب مستقل (.exe)
 * مخصص لنظام تشغيل Windows 10/11 باستخدام Electron أو Nativefier
 */

export const ELECTRON_DESKTOP_CONFIG = {
  appName: 'المنهج الرقمي للإدارة الحكومية',
  appId: 'iq.gov.personnel.system',
  version: '2.4.0',
  author: 'المهندس حسين عبد المنذر',
  phone: '07711145014',
  windowSettings: {
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    center: true,
    title: 'المنهج الرقمي للإدارة الحكومية - 2026',
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  },
  packagingCommands: {
    // 1. Nativefier method (أسرع وأسهل طريقة لإنتاج .exe مباشرة بدون تعديل كود)
    nativefier: `npx nativefier "https://ais-pre-4geoa3rrxp3yn3ckysjhkj-615803937025.europe-west2.run.app" --name "المنهج الرقمي للإدارة الحكومية" --platform "windows" --arch "x64" --single-instance --tray`,
    // 2. Electron-builder offline method
    buildOffline: `npm run build && npx electron-builder --win portable`,
  },
};
