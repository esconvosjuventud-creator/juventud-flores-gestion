(function installGoogleCalendarLink(){
  if(window.__JF_GOOGLE_LINK__)return;window.__JF_GOOGLE_LINK__=true;
  const C=window.JF_CONFIG;if(!C||!window.supabase)return;
  const db=window.JF_DB||window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[s]));
  const fn=C.googleFunctions?.action||'google-action';
  let candidates=[],linkedCount=0;

  function toast(msg){const n=$('toast');if(n){n.textContent=msg;n.classList.add('show');clearTimeout(window.__jfGoogleLinkToast);window.__jfGoogleLinkToast=setTimeout(()=>n.classList.remove('show'),2600)}else alert(msg)}
  function norm(s=''){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
  const stop=new Set(['reunion','evento','actividad','de','del','la','el','en','con','para','y','a','los','las','un','una','oficina','juventud']);
  function tokens(s){return new Set(norm(s).split(/\s+/).filter(x=>x.length>2&&!stop.has(x)))}
  function similarity(a,b){const A=tokens(a),B=tokens(b);if(!A.size||!B.size)return 0;let common=0;A.forEach(x=>{if(B.has(x))common++});return common/Math.max(A.size,B.size)}
  function dateOfGoogle(g){return String(g.start?.dateTime||g.start?.date||g.start||'').slice(0,10)}
  function timeOfGoogle(g){const s=String(g.start?.dateTime||g.start||'');const m=s.match(/T(\d{2}:\d{2})/);return m?m[1]:''}
  function time5(v){return v?String(v).slice(0,5):''}
  function localTitle(x){return x.__table==='events'?x.name:x.__table==='meetings'?x.subject:x.title}
  function localDate(x){return x.__table==='events'?x.event_date:x.__table==='meetings'?x.meeting_date:x.task_date}
  function localTime(x){return x.__table==='events'?x.start_time:x.__table==='meetings'?x.meeting_time:x.task_time}
  function labelTable(t){return t==='events'?'Evento':t==='meetings'?'Reunión':'Tarea'}
  function modal(title,html){$('detailEyebrow').textContent='GOOGLE CALENDAR';$('detailTitle').textContent=title;$('detailContent').innerHTML=html;$('detailBackdrop').classList.add('show');$('detailModal').classList.add('show')}

  async function loadInternal(){
    const [e,m,t]=await Promise.all([
      db.from('events').select('id,name,event_date,start_time,end_time,place,google_event_id,google_calendar_id').eq('archived',false),
      db.from('meetings').select('id,subject,meeting_date,meeting_time,place,google_event_id,google_calendar_id').eq('archived',false),
      db.from('tasks').select('id,title,task_date,task_time,institution_name,google_event_id,google_calendar_id,google_sync').eq('archived',false).not('task_date','is',null)
    ]);
    const err=e.error||m.error||t.error;if(err)throw err;
    return [...(e.data||[]).map(x=>({...x,__table:'events'})),...(m.data||[]).map(x=>({...x,__table:'meetings'})),...(t.data||[]).map(x=>({...x,__table:'tasks'}))];
  }
  async function loadGoogle(minDate,maxDate){
    const timeMin=minDate+'T00:00:00-03:00',timeMax=maxDate+'T23:59:59-03:00';
    const {data,error}=await db.functions.invoke(fn,{body:{action:'calendar_list',timeMin,timeMax}});
    if(error)throw error;if(data?.error)throw new Error(data.error);return data?.result?.items||[];
  }
  function scorePair(x,g){
    if(localDate(x)!==dateOfGoogle(g))return null;
    const lt=time5(localTime(x)),gt=timeOfGoogle(g),sim=similarity(localTitle(x),g.summary||'');
    let score=sim*55;
    if(lt&&gt&&lt===gt)score+=45;else if(!lt&&!gt)score+=15;else if(!lt||!gt)score+=5;else score-=20;
    return {score,sim,timeExact:!!lt&&lt===gt};
  }
  function buildMatches(internal,google){
    linkedCount=internal.filter(x=>x.google_event_id).length;
    const unlinked=internal.filter(x=>!x.google_event_id),used=new Set();const out=[];
    for(const x of unlinked){
      const scored=google.map(g=>({g,m:scorePair(x,g)})).filter(z=>z.m).sort((a,b)=>b.m.score-a.m.score);
      const best=scored[0];if(!best)continue;
      const safe=best.m.score>=62&&(best.m.timeExact||best.m.sim>=.72);
      const review=!safe&&best.m.score>=38;
      if(safe||review){out.push({x,g:best.g,score:best.m.score,safe,review});if(safe)used.add(best.g.id)}
    }
    return out.sort((a,b)=>Number(b.safe)-Number(a.safe)||b.score-a.score);
  }
  function render(){
    const safe=candidates.filter(x=>x.safe),review=candidates.filter(x=>!x.safe);
    modal('Vincular con Google Calendar',`<div class="jfgc-wrap">
      <div class="jfgc-intro"><div><strong>🔗 Vinculación sin duplicar</strong><p>Compara registros del sistema con Google Calendar por fecha, hora y nombre. Solo guarda el vínculo; no crea eventos nuevos.</p></div><span class="jfgc-linked">${linkedCount} ya vinculados</span></div>
      <div class="jfgc-stats"><div><strong>${safe.length}</strong><span>coincidencias seguras</span></div><div><strong>${review.length}</strong><span>para revisar</span></div></div>
      ${safe.length?`<div class="jfgc-section"><div class="jfgc-head"><div><h3>Coincidencias seguras</h3><p>Misma fecha y coincidencia clara de hora/nombre.</p></div><button id="jfgcLinkAll" class="primary-btn">Vincular todas (${safe.length})</button></div>${safe.map((r,i)=>row(r,i)).join('')}</div>`:''}
      ${review.length?`<div class="jfgc-section"><div class="jfgc-head"><div><h3>Revisar coincidencias</h3><p>El sistema encontró similitud, pero conviene confirmarla manualmente.</p></div></div>${review.map((r,i)=>row(r,safe.length+i)).join('')}</div>`:''}
      ${!candidates.length?'<div class="jfgc-empty">No hay nuevas coincidencias para vincular en el período analizado.</div>':''}
      <div class="jfgc-foot"><span>Esto no modifica el título, fecha ni hora en Google.</span><button id="jfgcClose" class="secondary-btn">Cerrar</button></div>
    </div>`);
    $('jfgcClose').onclick=()=>window.closeDetail?.();
    if($('jfgcLinkAll'))$('jfgcLinkAll').onclick=()=>linkMany(safe);
    document.querySelectorAll('[data-jfgc-link]').forEach(b=>b.onclick=()=>linkOne(candidates[Number(b.dataset.jfgcLink)]));
  }
  function row(r,i){const x=r.x,g=r.g;return `<div class="jfgc-row ${r.safe?'safe':'review'}"><div class="jfgc-pair"><div><span>${labelTable(x.__table)} en el sistema</span><strong>${esc(localTitle(x))}</strong><small>${esc(localDate(x))}${localTime(x)?' · '+esc(time5(localTime(x))):''}</small></div><b>↔</b><div><span>Google Calendar</span><strong>${esc(g.summary||'Sin título')}</strong><small>${esc(dateOfGoogle(g))}${timeOfGoogle(g)?' · '+esc(timeOfGoogle(g)):''}</small></div></div><button class="${r.safe?'primary-btn':'secondary-btn'}" data-jfgc-link="${i}">${r.safe?'Vincular':'Confirmar vínculo'}</button></div>`}
  async function linkOne(r,quiet=false){
    if(!r)return false;const patch={google_event_id:r.g.id,google_calendar_id:'primary'};if(r.x.__table==='tasks')patch.google_sync=true;
    const {error}=await db.from(r.x.__table).update(patch).eq('id',r.x.id);if(error){if(!quiet)toast(error.message);return false}
    r.x.google_event_id=r.g.id;linkedCount++;candidates=candidates.filter(z=>z!==r);window.JFPerf?.scheduleRefresh?.(r.x.__table,0);if(!quiet){toast('Vínculo guardado');render()}return true;
  }
  async function linkMany(rows){
    const btn=$('jfgcLinkAll');if(btn){btn.disabled=true;btn.textContent='Vinculando…'}let n=0;
    for(const r of [...rows])if(await linkOne(r,true))n++;
    toast(`${n} vínculo${n===1?'':'s'} guardado${n===1?'':'s'}`);render();
  }
  async function open(){
    modal('Vincular con Google Calendar','<div class="jfgc-loading"><span></span><strong>Comparando con Google Calendar…</strong><p>Esto puede demorar unos segundos.</p></div>');
    try{
      const status=await db.functions.invoke(fn,{body:{action:'status'}});if(status.error||!status.data?.connected)throw new Error('Primero conectá Google desde Configuración.');
      const internal=await loadInternal();if(!internal.length){candidates=[];linkedCount=0;return render()}
      const dates=internal.map(localDate).filter(Boolean).sort();let min=dates[0],max=dates[dates.length-1];
      const pad=(iso,n)=>{const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};min=pad(min,-2);max=pad(max,2);
      const google=await loadGoogle(min,max);candidates=buildMatches(internal,google);render();
    }catch(e){modal('Vincular con Google Calendar',`<div class="jfgc-empty"><strong>No se pudo comparar el calendario</strong><p>${esc(e?.message||e)}</p><button id="jfgcClose" class="secondary-btn">Cerrar</button></div>`);$('jfgcClose').onclick=()=>window.closeDetail?.()}
  }
  function inject(){
    if($('jfgcOpen'))return;const anchor=$('googleConnectBtn');if(!anchor)return;const b=document.createElement('button');b.id='jfgcOpen';b.type='button';b.className='secondary-btn';b.textContent='🔗 Vincular eventos existentes';b.onclick=open;anchor.parentElement?.appendChild(b);
  }
  inject();setTimeout(inject,700);setTimeout(inject,1800);window.addEventListener('hashchange',()=>{if((location.hash||'').includes('settings'))setTimeout(inject,120)});
  window.JFGoogleCalendarLink={open};
})();