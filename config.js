window.JF_CONFIG = Object.freeze({
  appName: "JUVENTUD FLORES – GESTIÓN",
  version: "6.0.2",
  timezone: "America/Montevideo",
  supabaseUrl: "https://yjpyszgxloerkmfgtuzd.supabase.co",
  supabasePublishableKey: "sb_publishable_ZyllPsNGdJhoCd7Vz82uSQ_C89X4p4k",
  storageBucket: "juventud-files",
  allowSignup: true,
  googleFunctions: {
    start: "google-oauth-start",
    callback: "google-oauth-callback",
    action: "google-action"
  }
});

// Adaptador QR robusto para GitHub Pages.
// La pantalla pública espera window.QRCode.toCanvas(...). Si el bundle "qrcode"
// no queda disponible en el navegador, cargamos QRious y mantenemos la misma API.
(function installQrRenderer(){
  let loadingPromise = null;

  function loadQRious(){
    if (window.QRious) return Promise.resolve(window.QRious);
    if (loadingPromise) return loadingPromise;

    loadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js';
      script.onload = () => window.QRious ? resolve(window.QRious) : reject(new Error('QRious no quedó disponible'));
      script.onerror = () => reject(new Error('No se pudo cargar el generador QR'));
      document.head.appendChild(script);
    });

    return loadingPromise;
  }

  async function toCanvas(canvas, value, options = {}){
    if (!canvas) throw new Error('No se encontró el canvas del QR');
    const QRious = await loadQRious();
    new QRious({
      element: canvas,
      value: String(value || ''),
      size: Number(options.width || 280),
      padding: Number(options.margin || 2) * 4,
      level: 'M'
    });
    return canvas;
  }

  const existing = window.QRCode || {};
  existing.toCanvas = toCanvas;
  window.QRCode = existing;
})();

// Compatibilidad del lector QR con Safari/iPhone.
// Safari puede no ofrecer BarcodeDetector aunque sí permita usar la cámara.
// Este polyfill conserva la API usada por app.js y decodifica con jsQR.
(function installBarcodeDetectorFallback(){
  if ('BarcodeDetector' in window) return;

  let jsQrPromise = null;
  let canvas = null;
  let ctx = null;

  function loadJsQR(){
    if (window.jsQR) return Promise.resolve(window.jsQR);
    if (jsQrPromise) return jsQrPromise;

    jsQrPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
      script.async = true;
      script.onload = () => window.jsQR ? resolve(window.jsQR) : reject(new Error('jsQR no quedó disponible'));
      script.onerror = () => reject(new Error('No se pudo cargar el lector QR'));
      document.head.appendChild(script);
    });

    return jsQrPromise;
  }

  class BarcodeDetectorFallback {
    constructor(){ loadJsQR().catch(() => {}); }
    static getSupportedFormats(){ return Promise.resolve(['qr_code']); }

    async detect(source){
      const jsQR = await loadJsQR();
      const width = source?.videoWidth || source?.naturalWidth || source?.width || 0;
      const height = source?.videoHeight || source?.naturalHeight || source?.height || 0;
      if (!width || !height || (source?.readyState !== undefined && source.readyState < 2)) return [];

      if (!canvas) {
        canvas = document.createElement('canvas');
        ctx = canvas.getContext('2d', { willReadFrequently: true });
      }
      if (!ctx) return [];

      const maxWidth = 960;
      const scale = Math.min(1, maxWidth / width);
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' });
      return result?.data ? [{ rawValue: result.data }] : [];
    }
  }

  window.BarcodeDetector = BarcodeDetectorFallback;
  loadJsQR().catch(() => {});
})();
