(function installSorayaGoogleUnifiedSync(){
  if(window.__SORAYA_GOOGLE_UNIFIED_SYNC__)return;window.__SORAYA_GOOGLE_UNIFIED_SYNC__=true;
  const C=window.JF_CONFIG;if(!C||!window.supabase)return;
  const db=window.JF_DB||window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const fn=C.googleFunctions?.action||'google-action';
  const LS_LAST='soraya_google_sync_last_v1',LS_FULL='soraya_google_full_sync_v1';
  const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  let items=[],syncing=false,lastResult=null,timer=null;
  const monthMap={enero:0,febrero:1,marzo:2,abril:3,mayo:4,junio:5,julio:6,agosto:7,septiembre:8,setiembre:8,octubre:9,noviembre:10,diciembre:11};
  function appVisible(){return !$('#app')?.classList.contains('hidden')}
  function toast(msg){const n=$('#toast');if(n){n.textContent=msg;n.classList.add('show');clearTimeout(window.__sorayaGSyncToast);window.__sorayaGSyncToast=setTimeout(()=>n.classList.remove('show'),2800)}}
  function iso(d){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Montevideo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
  function addDays(base,n){const d=new Date(base);d.setDate(d.getDate()+n);return d}
  function time5(v){return v?String(v).slice(0,5):''}
  function fmtDate(v){if(!v)return'Sin fecha';return new Intl.DateTimeFormat('es-UY',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v+'T12:00:00'))}
  function dedupe(list){const m=new Map();for(const x of list){const k=`${x.source}|${x.external_id}`;const prev=m.get(k);if(!prev||x.container_id==='primary')m.set(k,x)}return[...m.values()]}
  async function invoke(action,body={}){const {data,error}=await db.functions.invoke(fn,{body:{action,...body}});if(error)throw error;if(data?.error)throw new Error(data.error);return data?.result??data}
  async function loadItems(){const {data,error}=await db.from('google_sync_items').select('*').eq('archived',false).order('item_date',{ascending:true,nullsFirst:false}).limit(5000);if(error)throw error;items=dedupe(data||[]);renderAll();return items}
  async function status(){try{return await invoke('status')}catch{return{connected:false}}}
  function period(full){if(full)return{timeMin:'2020-01-01T00:00:00Z',timeMax:'2035-01-01T00:00:00Z'};const now=new Date();return{timeMin:addDays(now,-180).toISOString(),timeMax:addDays(now,730).toISOString()}}
  async function sync(force=false,full=false){
    if(syncing||!appVisible())return;
    const last=Number(localStorage.getItem(LS_LAST)||0);if(!force&&Date.now()-last<10*60*1000){await loadItems().catch(()=>{});return}
    const st=await status();if(!st?.connected){await loadItems().catch(()=>{});renderSettings(st);return}
    syncing=true;renderAll();
    try{
      const doFull=full||!localStorage.getItem(LS_FULL),p=period(doFull);lastResult=await invoke('sync_to_soraya',p);localStorage.setItem(LS_LAST,String(Date.now()));if(doFull)localStorage.setItem(LS_FULL,'1');await loadItems();
      if(lastResult?.needs_reconnect)toast('Calendar sincronizado. Falta autorizar Google Tasks.');else if(force)toast('Google sincronizado con Soraya');
    }catch(e){lastResult={error:e?.message||String(e)};renderAll();if(force)toast('No se pudo sincronizar Google')}
    finally{syncing=false;renderAll()}
  }
  function icon(x){return x.source==='tasks'?'☑️':'📅'}
  function sourceLabel(x){if(x.source==='tasks')return x.completed?'Tarea Google completada':'Tarea / recordatorio Google';return x.metadata?.calendar_name||'Google Calendar'}
  function openItem(x){
    const title=$('#detailTitle'),ey=$('#detailEyebrow'),content=$('#detailContent'),modal=$('#detailModal'),back=$('#detailBackdrop');if(!title||!content||!modal||!back)return;
    ey.textContent=x.source==='tasks'?'GOOGLE TASKS':'GOOGLE CALENDAR';title.textContent=x.title||'Elemento de Google';
    const safeLink=String(x.html_link||'').startsWith('https://')?x.html_link:'';
    content.innerHTML=`<div class="stack"><p><strong>Fecha:</strong> ${esc(fmtDate(x.item_date))}${x.start_time?' · '+esc(time5(x.start_time)):''}</p>${x.location?`<p><strong>Lugar:</strong> ${esc(x.location)}</p>`:''}${x.description?`<p>${esc(x.description)}</p>`:''}<p><span class="soraya-gsync-badge ${x.soraya_id?'ok':''}">${x.soraya_id?'✓ Vinculado con Soraya':'Google sincronizado'}</span></p>${safeLink?`<p><a class="secondary-btn" href="${esc(safeLink)}" target="_blank" rel="noopener">Abrir en Google ↗</a></p>`:''}</div>`;
    back.classList.add('show');modal.classList.add('show');
  }
  function ensureCalendarPanel(){
    const view=$('#view-calendar'),grid=$('#calendarGrid');if(!view||!grid)return null;let box=$('#sorayaGoogleCalendarPanel');if(!box){box=document.createElement('section');box.id='sorayaGoogleCalendarPanel';box.className='soraya-gsync-card';grid.insertAdjacentElement('beforebegin',box)}return box
  }
  function renderCalendarPanel(){
    const box=ensureCalendarPanel();if(!box)return;const today=iso(new Date()),until=iso(addDays(new Date(),30));const future=items.filter(x=>x.item_date&&x.item_date>=today&&x.item_date<=until&&!x.completed).slice(0,8),nodate=items.filter(x=>x.source==='tasks'&&!x.item_date&&!x.completed).slice(0,5);const cal=items.filter(x=>x.source==='calendar').length,tsk=items.filter(x=>x.source==='tasks'&&!x.completed).length,linked=items.filter(x=>x.soraya_id).length;
    box.innerHTML=`<div class="soraya-gsync-head"><div><span class="soraya-gsync-badge ${lastResult?.error?'warn':'ok'}">${syncing?'<span class="soraya-gsync-spin"></span> Sincronizando':'G · Google sincronizado'}</span><h3>Google dentro de Soraya</h3><p>Eventos, tareas y recordatorios aparecen acá sin alterar tus estadísticas de gestión.</p></div><div class="soraya-gsync-actions"><button type="button" class="secondary-btn" data-gsync-now>${syncing?'Sincronizando…':'Sincronizar ahora'}</button></div></div><div class="soraya-gsync-summary"><div><strong>${cal}</strong><span>eventos Calendar</span></div><div><strong>${tsk}</strong><span>tareas pendientes</span></div><div><strong>${linked}</strong><span>vinculados a registros</span></div></div>${lastResult?.needs_reconnect?`<div class="soraya-gsync-reconnect"><p><strong>Falta un permiso.</strong> Reconectá Google una sola vez para traer también Google Tasks y recordatorios.</p><button type="button" class="primary-btn" data-gsync-reconnect>Reconectar Google</button></div>`:''}${lastResult?.error?`<div class="soraya-gsync-status warn">${esc(lastResult.error)}</div>`:''}<div class="soraya-gsync-list">${[...future,...nodate].map(x=>`<div class="soraya-gsync-row" data-gsync-id="${esc(x.id)}"><span class="soraya-gsync-row-icon">${icon(x)}</span><span class="soraya-gsync-row-copy"><strong>${esc(x.title)}</strong><small>${x.item_date?esc(fmtDate(x.item_date))+(x.start_time?' · '+esc(time5(x.start_time)):''):'Sin fecha'} · ${esc(sourceLabel(x))}</small></span>${x.soraya_id?'<span class="soraya-gsync-badge ok">Vinculado</span>':''}</div>`).join('')||'<div class="soraya-gsync-status">No hay elementos próximos de Google para mostrar.</div>'}</div>`;
    box.querySelector('[data-gsync-now]')?.addEventListener('click',()=>sync(true,true));box.querySelector('[data-gsync-reconnect]')?.addEventListener('click',()=>$('#googleConnectBtn')?.click());box.querySelectorAll('[data-gsync-id]').forEach(n=>n.addEventListener('click',()=>openItem(items.find(x=>x.id===n.dataset.gsyncId))));
  }
  function parseMonth(){const txt=String($('#monthTitle')?.textContent||'').toLowerCase(),yr=txt.match(/(20\d{2})/)?.[1],mo=Object.keys(monthMap).find(k=>txt.includes(k));return yr&&mo?{y:Number(yr),m:monthMap[mo]}:null}
  function renderCalendarCells(){
    const grid=$('#calendarGrid'),p=parseMonth();if(!grid||!p)return;grid.querySelectorAll('.soraya-google-item,.soraya-google-more').forEach(n=>n.remove());const days=[...grid.querySelectorAll('.cal-day')];if(days.length<28)return;const first=new Date(p.y,p.m,1),start=(first.getDay()+6)%7;
    days.forEach((cell,i)=>{const d=new Date(p.y,p.m,1-start+i),dayIso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const rows=items.filter(x=>x.item_date===dayIso&&!x.completed&&!(x.soraya_id&&['tasks','events'].includes(x.soraya_table))).slice(0,3);for(const x of rows){const n=document.createElement('div');n.className=`soraya-google-item ${x.source==='tasks'?'task':''}`;n.textContent=`G · ${x.title}`;n.title=`${sourceLabel(x)}${x.start_time?' · '+time5(x.start_time):''}`;n.addEventListener('click',e=>{e.stopPropagation();openItem(x)});cell.appendChild(n)}const total=items.filter(x=>x.item_date===dayIso&&!x.completed&&!(x.soraya_id&&['tasks','events'].includes(x.soraya_table))).length;if(total>3){const more=document.createElement('div');more.className='soraya-google-more';more.textContent=`+${total-3} de Google`;cell.appendChild(more)}})
  }
  function renderToday(){
    const view=$('#view-dashboard');if(!view)return;const today=iso(new Date()),rows=items.filter(x=>x.item_date===today&&!x.completed&&!x.soraya_id).slice(0,6);let box=$('#sorayaGoogleToday');if(!rows){box?.remove();return}if(!box){box=document.createElement('section');box.id='sorayaGoogleToday';box.className='soraya-gsync-today';const hero=view.querySelector('.jf-exec-hero,.hero');hero?.insertAdjacentElement('afterend',box)||view.prepend(box)}box.innerHTML=`<div class="soraya-gsync-today-head"><strong>G · También en tu Google hoy</strong><span class="soraya-gsync-badge">${rows.length}</span></div><div class="soraya-gsync-mini">${rows.map(x=>`<button type="button" data-gsync-today="${esc(x.id)}"><b>${esc(x.title)}</b><span>${x.start_time?esc(time5(x.start_time))+' · ':''}${esc(sourceLabel(x))}</span></button>`).join('')}</div>`;box.querySelectorAll('[data-gsync-today]').forEach(n=>n.onclick=()=>openItem(items.find(x=>x.id===n.dataset.gsyncToday))
  }
  function renderSettings(st=null){
    const anchor=$('#googleConnectBtn'),card=anchor?.closest('.card');if(!card)return;let box=$('#sorayaGoogleSyncSettings');if(!box){box=document.createElement('div');box.id='sorayaGoogleSyncSettings';box.className='soraya-gsync-status';anchor.parentElement?.insertAdjacentElement('afterend',box)}const stamp=Number(localStorage.getItem(LS_LAST)||0);box.innerHTML=`<strong>Sincronización Soraya</strong><br>${stamp?'Última actualización: '+new Intl.DateTimeFormat('es-UY',{dateStyle:'short',timeStyle:'short'}).format(new Date(stamp)):'Todavía no sincronizado.'}<br><span class="soraya-gsync-link">Calendar + Google Tasks</span>${lastResult?.needs_reconnect?'<br>⚠️ Reconectá Google para autorizar Tasks.':''}`;
  }
  function renderAll(){renderCalendarPanel();setTimeout(renderCalendarCells,20);setTimeout(renderToday,20);renderSettings()}
  function schedule(){clearInterval(timer);timer=setInterval(()=>sync(false,false),15*60*1000)}
  document.addEventListener('click',e=>{if(e.target.closest('#prevMonth,#nextMonth,#mainNav button[data-view="calendar"]'))setTimeout(()=>{renderCalendarPanel();renderCalendarCells()},80)});
  window.addEventListener('jf:state-updated',()=>setTimeout(renderAll,40));document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync(false,false)});
  setTimeout(async()=>{if(!appVisible())return;await loadItems().catch(()=>{});await sync(false,false);schedule()},2200);
  window.SorayaGoogleSync={sync,loadItems,get items(){return items}};
})();
