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
  const TASKS_SCOPE='https://www.googleapis.com/auth/tasks';
  const CALENDAR_SCOPE='https://www.googleapis.com/auth/calendar.events';
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
  function scopes(st){return String(st?.metadata?.scope||'').split(/\s+/).filter(Boolean)}
  function hasScope(st,scope){return scopes(st).includes(scope)}
  function hasTasks(st){return hasScope(st,TASKS_SCOPE)}
  function hasCalendar(st){return hasScope(st,CALENDAR_SCOPE)}
  function complete(st){return !!st?.connected&&hasTasks(st)&&hasCalendar(st)}
  function missingLabel(st){const missing=[];if(!hasCalendar(st))missing.push('Google Calendar');if(!hasTasks(st))missing.push('Google Tasks');return missing.join(' y ')}
  function updateUi(st){
    const label=$('googleStatus'),btn=$('googleConnectBtn'),ok=complete(st),missing=missingLabel(st);
    if(label){
      if(ok)label.textContent='Google conectado automáticamente · Calendar y Google Tasks sincronizados.';
      else if(st?.connected)label.textContent=`Google conectado. Soraya completará automáticamente la autorización de ${missing||'los servicios pendientes'}.`;
      else if(st?.configured)label.textContent='Google listo. Soraya conectará automáticamente Calendar y Google Tasks.';
      else label.textContent='Google todavía no está configurado en Soraya.';
    }
    if(btn&&st?.configured){btn.disabled=false;btn.textContent=ok?'Reconectar Google':st?.connected?'Autorizar Calendar + Tasks':'Conectar Calendar + Tasks';}
    document.documentElement.classList.toggle('soraya-google-connected',ok);
    document.documentElement.classList.toggle('soraya-google-permissions-pending',!!st?.connected&&!ok);
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
    toast('Conectando Google Calendar y Google Tasks…');
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
      if(complete(st)){
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
  window.SorayaGoogleAutoConnect={check:()=>ensureConnected({allowRedirect:false}),connect:()=>ensureConnected({allowRedirect:true}),get status(){return lastStatus},get tasksAuthorized(){return hasTasks(lastStatus)},get calendarAuthorized(){return hasCalendar(lastStatus)},get complete(){return complete(lastStatus)}};
})();