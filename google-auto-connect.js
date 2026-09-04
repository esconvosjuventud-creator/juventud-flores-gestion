(function installSorayaGoogleAutoConnect(){
  'use strict';
  if(window.__SORAYA_GOOGLE_AUTO_CONNECT__)return;
  window.__SORAYA_GOOGLE_AUTO_CONNECT__=true;

  const C=window.JF_CONFIG;
  if(!C||!window.supabase)return;
  const db=window.JF_DB||window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const actionFn=C.googleFunctions?.action||'google-action';
  const startFn=C.googleFunctions?.start||'google-oauth-start';
  const CHECK_EVERY=10*60*1000;
  const RETRY_GUARD=30*60*1000;
  let running=false,timer=null,lastStatus=null;

  const $=id=>document.getElementById(id);
  function appVisible(){const app=$('app');return !!app&&!app.classList.contains('hidden')}
  function toast(msg){const n=$('toast');if(!n)return;n.textContent=msg;n.classList.add('show');clearTimeout(window.__sorayaGoogleAutoToast);window.__sorayaGoogleAutoToast=setTimeout(()=>n.classList.remove('show'),2600)}
  function normalize(data){return data?.result??data??{}}
  async function session(){const {data}=await db.auth.getSession();return data?.session||null}
  function attemptKey(uid){return `soraya_google_auto_oauth_${uid||'anon'}`}
  function recentAttempt(uid){const t=Number(sessionStorage.getItem(attemptKey(uid))||0);return t&&Date.now()-t<RETRY_GUARD}
  function markAttempt(uid){sessionStorage.setItem(attemptKey(uid),String(Date.now()))}
  function clearAttempt(uid){sessionStorage.removeItem(attemptKey(uid))}
  function updateUi(st){
    const label=$('googleStatus'),btn=$('googleConnectBtn');
    if(label){
      if(st?.connected)label.textContent='Google conectado automáticamente.';
      else if(st?.configured)label.textContent='Google listo para autorizar. Soraya conectará la cuenta automáticamente.';
      else label.textContent='Google todavía no está configurado en Soraya.';
    }
    if(btn&&st?.configured){btn.disabled=false;btn.textContent=st?.connected?'Reconectar Google':'Conectar Google';}
    document.documentElement.classList.toggle('soraya-google-connected',!!st?.connected);
  }
  async function getStatus(){
    const {data,error}=await db.functions.invoke(actionFn,{body:{action:'status'}});
    if(error)throw error;
    const st=normalize(data);
    lastStatus=st;updateUi(st);return st;
  }
  async function startOAuth(uid){
    if(recentAttempt(uid))return false;
    markAttempt(uid);
    const redirectTo=`${location.origin}${location.pathname}#/dashboard?google=connected`;
    toast('Conectando Soraya con Google…');
    const {data,error}=await db.functions.invoke(startFn,{body:{redirectTo}});
    if(error){sessionStorage.removeItem(attemptKey(uid));throw error}
    const payload=normalize(data),url=payload?.url||data?.url;
    if(!url){sessionStorage.removeItem(attemptKey(uid));throw new Error('Google no devolvió una URL de autorización')}
    location.assign(url);
    return true;
  }
  async function syncConnected(){
    try{
      if(window.SorayaGoogleSync?.sync)await window.SorayaGoogleSync.sync(false,false);
    }catch(e){console.warn('[Soraya Google] sincronización automática',e)}
  }
  async function ensureConnected({allowRedirect=true}={}){
    if(running||!appVisible())return lastStatus;
    running=true;
    try{
      const s=await session();
      if(!s?.user)return null;
      const uid=s.user.id;
      const st=await getStatus();
      if(st?.connected){
        clearAttempt(uid);
        await syncConnected();
        return st;
      }
      if(st?.configured&&allowRedirect){
        await startOAuth(uid);
      }
      return st;
    }catch(e){
      console.warn('[Soraya Google] conexión automática',e);
      const label=$('googleStatus');if(label)label.textContent='No se pudo comprobar Google automáticamente. Podés reconectar desde Configuración.';
      return null;
    }finally{running=false}
  }
  function schedule(){clearInterval(timer);timer=setInterval(()=>ensureConnected({allowRedirect:false}),CHECK_EVERY)}
  async function boot(){
    for(let i=0;i<20&&!appVisible();i++)await new Promise(r=>setTimeout(r,300));
    if(!appVisible())return;
    await ensureConnected({allowRedirect:true});
    schedule();
  }

  document.addEventListener('visibilitychange',()=>{if(!document.hidden)ensureConnected({allowRedirect:false})});
  window.addEventListener('online',()=>ensureConnected({allowRedirect:false}));
  window.addEventListener('hashchange',()=>{if(appVisible())setTimeout(()=>ensureConnected({allowRedirect:false}),300)});
  setTimeout(boot,700);
  window.SorayaGoogleAutoConnect={check:()=>ensureConnected({allowRedirect:false}),connect:()=>ensureConnected({allowRedirect:true}),get status(){return lastStatus}};
})();
