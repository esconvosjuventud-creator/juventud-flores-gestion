window.JF_CONFIG = Object.freeze({
  appName: "JUVENTUD FLORES – GESTIÓN",
  version: "8.0.1",
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

(function installQrRenderer(){
  let loadingPromise=null;
  function loadQRious(){
    if(window.QRious) return Promise.resolve(window.QRious);
    if(loadingPromise) return loadingPromise;
    loadingPromise=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js';
      s.onload=()=>window.QRious?resolve(window.QRious):reject(new Error('QRious no quedó disponible'));
      s.onerror=()=>reject(new Error('No se pudo cargar el generador QR'));
      document.head.appendChild(s);
    });
    return loadingPromise;
  }
  async function toCanvas(canvas,value,options={}){
    if(!canvas) throw new Error('No se encontró el canvas del QR');
    const QRious=await loadQRious();
    new QRious({element:canvas,value:String(value||''),size:Number(options.width||280),padding:Number(options.margin||2)*4,level:'M'});
    return canvas;
  }
  const existing=window.QRCode||{};
  existing.toCanvas=toCanvas;
  window.QRCode=existing;
})();

(function installBarcodeDetectorFallback(){
  if('BarcodeDetector' in window) return;
  let jsQrPromise=null,canvas=null,ctx=null;
  function loadJsQR(){
    if(window.jsQR) return Promise.resolve(window.jsQR);
    if(jsQrPromise) return jsQrPromise;
    jsQrPromise=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
      s.async=true;
      s.onload=()=>window.jsQR?resolve(window.jsQR):reject(new Error('jsQR no quedó disponible'));
      s.onerror=()=>reject(new Error('No se pudo cargar el lector QR'));
      document.head.appendChild(s);
    });
    return jsQrPromise;
  }
  class BarcodeDetectorFallback{
    constructor(){loadJsQR().catch(()=>{});}
    static getSupportedFormats(){return Promise.resolve(['qr_code']);}
    async detect(source){
      const jsQR=await loadJsQR();
      const width=source?.videoWidth||source?.naturalWidth||source?.width||0;
      const height=source?.videoHeight||source?.naturalHeight||source?.height||0;
      if(!width||!height||(source?.readyState!==undefined&&source.readyState<2)) return [];
      if(!canvas){canvas=document.createElement('canvas');ctx=canvas.getContext('2d',{willReadFrequently:true});}
      if(!ctx) return [];
      const scale=Math.min(1,960/width);
      canvas.width=Math.max(1,Math.round(width*scale));
      canvas.height=Math.max(1,Math.round(height*scale));
      ctx.drawImage(source,0,0,canvas.width,canvas.height);
      const image=ctx.getImageData(0,0,canvas.width,canvas.height);
      const result=jsQR(image.data,image.width,image.height,{inversionAttempts:'attemptBoth'});
      return result?.data?[{rawValue:result.data}]:[];
    }
  }
  window.BarcodeDetector=BarcodeDetectorFallback;
  loadJsQR().catch(()=>{});
})();

(function installPasswordRecovery(){
  if(!window.supabase||!window.JF_CONFIG) return;
  const C=window.JF_CONFIG;
  const auth=window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let recoveryActive=/(?:^|[&#])type=recovery(?:&|$)/.test(location.hash);
  const el=id=>document.getElementById(id);
  function setMessage(id,text,ok=false){const n=el(id);if(!n)return;n.textContent=text||'';n.style.color=ok?'#19703a':'';}
  function ensureStyle(){
    if(el('jfRecoveryStyle')) return;
    const style=document.createElement('style');
    style.id='jfRecoveryStyle';
    style.textContent=`html.jf-password-recovery #loading,html.jf-password-recovery #pendingScreen,html.jf-password-recovery #app,html.jf-password-recovery #publicScreen,html.jf-password-recovery .auth-tabs,html.jf-password-recovery #loginForm,html.jf-password-recovery #signupForm,html.jf-password-recovery #recoveryRequestForm,html.jf-password-recovery .public-links{display:none!important}html.jf-password-recovery #authScreen{display:flex!important}html.jf-password-recovery #recoveryUpdateForm{display:flex!important}`;
    document.head.appendChild(style);
  }
  function forceRecoveryScreen(){if(!recoveryActive)return;ensureStyle();document.documentElement.classList.add('jf-password-recovery');setTimeout(()=>el('recoveryPassword')?.focus(),50);}
  function showLogin(){
    recoveryActive=false;document.documentElement.classList.remove('jf-password-recovery');
    document.querySelector('.auth-tabs')?.classList.remove('hidden');el('loginForm')?.classList.remove('hidden');el('signupForm')?.classList.add('hidden');el('recoveryRequestForm')?.classList.add('hidden');el('recoveryUpdateForm')?.classList.add('hidden');document.querySelector('.public-links')?.classList.remove('hidden');if(el('authMessage'))el('authMessage').textContent='';
  }
  function showRequest(){
    document.querySelector('.auth-tabs')?.classList.add('hidden');el('loginForm')?.classList.add('hidden');el('signupForm')?.classList.add('hidden');el('recoveryUpdateForm')?.classList.add('hidden');el('recoveryRequestForm')?.classList.remove('hidden');document.querySelector('.public-links')?.classList.add('hidden');
    const email=el('recoveryEmail');if(email&&el('loginEmail')?.value)email.value=el('loginEmail').value;setMessage('recoveryRequestMessage','');email?.focus();
  }
  function setup(){
    const loginForm=el('loginForm');const authCard=loginForm?.closest('.auth-card');if(!loginForm||!authCard)return;
    if(!el('forgotPasswordBtn')){
      const forgot=document.createElement('button');forgot.id='forgotPasswordBtn';forgot.type='button';forgot.className='link-btn';forgot.textContent='¿Olvidé mi contraseña?';forgot.style.marginTop='4px';forgot.onclick=showRequest;loginForm.appendChild(forgot);
      const request=document.createElement('form');request.id='recoveryRequestForm';request.className='stack hidden';request.innerHTML=`<p class="eyebrow">RECUPERAR ACCESO</p><h2>Restablecer contraseña</h2><p class="muted small">Ingresá el correo de tu cuenta. Te enviaremos un enlace para crear una contraseña nueva.</p><label>Correo<input id="recoveryEmail" type="email" autocomplete="email" required></label><button class="primary-btn" type="submit">Enviar enlace de recuperación</button><button id="recoveryCancelBtn" class="secondary-btn" type="button">Volver a ingresar</button><p id="recoveryRequestMessage" class="message"></p>`;
      loginForm.insertAdjacentElement('afterend',request);
      const update=document.createElement('form');update.id='recoveryUpdateForm';update.className='stack hidden';update.innerHTML=`<p class="eyebrow">NUEVA CONTRASEÑA</p><h2>Elegí una contraseña nueva</h2><p class="muted small">Debe tener al menos 8 caracteres.</p><label>Nueva contraseña<input id="recoveryPassword" type="password" minlength="8" autocomplete="new-password" required></label><label>Repetir contraseña<input id="recoveryPassword2" type="password" minlength="8" autocomplete="new-password" required></label><button class="primary-btn" type="submit">Guardar nueva contraseña</button><p id="recoveryUpdateMessage" class="message"></p>`;
      request.insertAdjacentElement('afterend',update);
      el('recoveryCancelBtn').onclick=showLogin;
      request.onsubmit=async e=>{
        e.preventDefault();const email=String(el('recoveryEmail')?.value||'').trim();if(!email)return;setMessage('recoveryRequestMessage','Enviando…');
        const redirectTo=`${location.origin}${location.pathname}`;const {error}=await auth.auth.resetPasswordForEmail(email,{redirectTo});
        if(error)return setMessage('recoveryRequestMessage',error.message);setMessage('recoveryRequestMessage','Si el correo pertenece a una cuenta, recibirás un enlace para restablecer la contraseña. Revisá también Spam.',true);
      };
      update.onsubmit=async e=>{
        e.preventDefault();const p1=String(el('recoveryPassword')?.value||''),p2=String(el('recoveryPassword2')?.value||'');
        if(p1.length<8)return setMessage('recoveryUpdateMessage','La contraseña debe tener al menos 8 caracteres.');if(p1!==p2)return setMessage('recoveryUpdateMessage','Las contraseñas no coinciden.');
        setMessage('recoveryUpdateMessage','Guardando…');const {data:{session}}=await auth.auth.getSession();if(!session)return setMessage('recoveryUpdateMessage','El enlace venció o ya fue utilizado. Solicitá uno nuevo.');
        const {error}=await auth.auth.updateUser({password:p1});if(error)return setMessage('recoveryUpdateMessage',error.message);setMessage('recoveryUpdateMessage','Contraseña actualizada correctamente. Ya podés volver a ingresar.',true);await auth.auth.signOut();recoveryActive=false;document.documentElement.classList.remove('jf-password-recovery');setTimeout(()=>location.replace(`${location.origin}${location.pathname}#/login`),1200);
      };
    }
    if(recoveryActive)forceRecoveryScreen();
  }
  auth.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY'){recoveryActive=true;setup();forceRecoveryScreen();}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();

(function loadStage7Extension(){
  if(window.__JF_STAGE7_LOADER__)return;window.__JF_STAGE7_LOADER__=true;
  const addScript=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
  window.addEventListener('load',async()=>{
    try{
      if(!document.querySelector('link[data-jf-stage7]')){const link=document.createElement('link');link.rel='stylesheet';link.href='./stage7.css?v=8.0.1';link.dataset.jfStage7='1';document.head.appendChild(link);}
      const response=await fetch('./stage7.js.gz.b64?v=8.0.1',{cache:'no-store'});if(!response.ok)throw new Error('No se pudo cargar Etapa 7');
      const b64=(await response.text()).trim();const compressed=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));let source;
      if('DecompressionStream'in window){const ds=new DecompressionStream('gzip');source=await new Response(new Blob([compressed]).stream().pipeThrough(ds)).text();}
      else{if(!window.pako)await addScript('https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js');source=new TextDecoder().decode(window.pako.ungzip(compressed));}
      const blobUrl=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));const script=document.createElement('script');script.src=blobUrl;script.dataset.jfStage7='1';script.onload=()=>URL.revokeObjectURL(blobUrl);document.body.appendChild(script);
    }catch(error){console.error('Etapa 7 no pudo cargarse',error);}
  },{once:true});
})();

(function loadAdminUsersExtension(){
  if(window.__JF_ADMIN_USERS_LOADER__)return;window.__JF_ADMIN_USERS_LOADER__=true;
  window.addEventListener('load',()=>{
    const s=document.createElement('script');s.src='./admin-users.js?v=8.0.1';s.async=true;s.onerror=()=>console.error('No se pudo cargar la gestión administrativa de usuarios');document.body.appendChild(s);
  },{once:true});
})();
