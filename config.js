window.JF_CONFIG = Object.freeze({
  appName: "JUVENTUD FLORES – GESTIÓN",
  version: "6.0.1",
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
