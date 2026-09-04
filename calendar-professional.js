(function installSorayaCalendarProfessional(){
  'use strict';
  if(window.__SORAYA_CALENDAR_PRO_V2__)return;
  window.__SORAYA_CALENDAR_PRO_V2__=true;

  const C=window.JF_CONFIG||{};
  const db=window.JF_DB||(window.supabase&&C.supabaseUrl&&C.supabasePublishableKey?window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null);
  const root=()=>document.getElementById('view-calendar');
  const grid=()=>document.getElementById('calendarGrid');
  const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[s]||s));
  const monthNames=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const GROUPS=['task','activity','workshop','event','meeting','deadline','reminder','followup','google'];
  const GROUP_LABEL={task:'Tareas',activity:'Actividades',workshop:'Talleres',event:'Eventos',meeting:'Reuniones',deadline:'Vencimientos',reminder:'Recordatorios',followup:'Seguimientos',google:'Google'};
  const GROUP_ICON={task:'✓',activity:'●',workshop:'✦',event:'●',meeting:'◆',deadline:'!',reminder:'◷',followup:'↗',google:'G'};

  let mode=window.matchMedia?.('(max-width:760px)')?.matches?'agenda':'month';
  let activeGroups=new Set();
  let query='';
  let anchor=new Date();
  let busy=false;
  let draggedKey='';
  try{mode=localStorage.getItem('soraya_calendar_mode_v2')||mode}catch{}

  function S(){try{return state}catch{return null}}
  function canWrite(){const p=S()?.profile;return !!p?.active&&['admin','equipo'].includes(p.role)}
  function toast(msg){const n=document.getElementById('toast');if(!n)return;n.textContent=msg;n.classList.add('show');clearTimeout(window.__sorayaCalToast);window.__sorayaCalToast=setTimeout(()=>n.classList.remove('show'),2800)}
  function pad(n){return String(n).padStart(2,'0')}
  function isoDate(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
  function parseIso(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||'')))return null;const [y,m,d]=String(v).split('-').map(Number);return new Date(y,m-1,d,12,0,0)}
  function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
  function startOfWeek(d){const x=new Date(d),monday=(x.getDay()+6)%7;x.setDate(x.getDate()-monday);x.setHours(12,0,0,0);return x}
  function todayIso(){return new Intl.DateTimeFormat('en-CA',{timeZone:C.timezone||'America/Montevideo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
  function fmtDateLong(d){return new Intl.DateTimeFormat('es-UY',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d)}
  function fmtShort(d){return new Intl.DateTimeFormat('es-UY',{day:'numeric',month:'short'}).format(d).replace('.','')}
  function fmtTime(v){return v?String(v).slice(0,5):''}
  function monthState(){const s=S();if(s?.month instanceof Date&&!Number.isNaN(s.month.getTime()))return s.month;const txt=String(document.getElementById('monthTitle')?.textContent||'').toLowerCase(),y=Number(txt.match(/20\d{2}/)?.[0]||new Date().getFullYear()),mi=monthNames.findIndex(x=>txt.includes(x));return new Date(y,mi<0?new Date().getMonth():mi,1)}
  function syncAnchorFromMonth(){const m=monthState();if(mode==='month'||mode==='agenda'){if(anchor.getFullYear()!==m.getFullYear()||anchor.getMonth()!==m.getMonth())anchor=new Date(m.getFullYear(),m.getMonth(),1,12)}}
  function groupForTask(t){const c=String(t.category||'').toLowerCase();if(c.includes('taller'))return'workshop';if(c.includes('actividad')||c.includes('capacitación')||c.includes('capacitacion'))return'activity';return'task'}
  function baseTaskDone(t){return['Realizada','Cancelada'].includes(t.status)}
  function reminderEntry(t){
    const label=String(t.reminder||'').trim();if(!label)return null;
    const base=t.task_date||t.deadline;if(!base)return null;
    let d=parseIso(base),time=fmtTime(t.task_time||'');if(!d)return null;
    const days=label.match(/^(\d+) día/);if(days)d=addDays(d,-Number(days[1]));
    else if(/^2 horas antes$/i.test(label)&&time){let [h,m]=time.split(':').map(Number),mins=h*60+m-120;if(mins<0){d=addDays(d,-1);mins+=1440}time=`${pad(Math.floor(mins/60))}:${pad(mins%60)}`}
    return{date:isoDate(d),time,group:'reminder',kind:'reminder',icon:GROUP_ICON.reminder,title:`Recordatorio: ${t.title||'Tarea'}`,meta:label,resource:'tasks',id:t.id,readOnlyDate:true,done:baseTaskDone(t)};
  }
  function entriesAll(){
    const s=S(),out=[];if(!s)return out;
    for(const t of s.tasks||[]){
      const group=groupForTask(t),done=baseTaskDone(t);
      if(t.task_date)out.push({date:t.task_date,time:t.task_time||'',group,kind:group,icon:GROUP_ICON[group],title:t.title||'Tarea',meta:[t.category,t.status,t.priority].filter(Boolean).join(' · '),resource:'tasks',id:t.id,done,field:'task_date',timeField:'task_time'});
      if(t.deadline&&t.deadline!==t.task_date)out.push({date:t.deadline,time:'',group:'deadline',kind:'deadline',icon:GROUP_ICON.deadline,title:`Vence: ${t.title||'Tarea'}`,meta:[t.status,t.priority].filter(Boolean).join(' · '),resource:'tasks',id:t.id,done,field:'deadline'});
      const r=reminderEntry(t);if(r)out.push(r);
    }
    for(const e of s.events||[])if(e.event_date)out.push({date:e.event_date,time:e.start_time||'',group:'event',kind:'event',icon:GROUP_ICON.event,title:e.name||'Evento',meta:[e.place,e.organizer].filter(Boolean).join(' · '),resource:'events',id:e.id,field:'event_date',timeField:'start_time'});
    for(const x of s.meetings||[])if(x.meeting_date)out.push({date:x.meeting_date,time:x.meeting_time||'',group:'meeting',kind:'meeting',icon:GROUP_ICON.meeting,title:x.subject||'Reunión',meta:[x.place,x.institutions].filter(Boolean).join(' · '),resource:'meetings',id:x.id,field:'meeting_date',timeField:'meeting_time'});
    for(const n of s.notes||[])if(n.followup_date)out.push({date:n.followup_date,time:'',group:'followup',kind:'followup',icon:GROUP_ICON.followup,title:`Seguimiento: ${n.subject||'Nota'}`,meta:[n.status,n.recipient].filter(Boolean).join(' · '),resource:'notes',id:n.id,field:'followup_date'});
    for(const x of window.SorayaGoogleSync?.items||[]){if(x.archived||x.completed||x.soraya_id||!x.item_date)continue;out.push({date:x.item_date,time:x.start_time||'',group:'google',kind:x.source==='tasks'?'google-task':'google-event',icon:x.source==='tasks'?'G✓':'G',title:x.title||'Google',meta:x.source==='tasks'?(x.metadata?.tasklist_title||'Google Tasks'):(x.metadata?.calendar_name||'Google Calendar'),google:true,link:x.html_link||'',source:x.source,id:x.id||x.external_id,readOnlyDate:true})}
    return out.sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99:99').localeCompare(b.time||'99:99')||a.title.localeCompare(b.title,'es'));
  }
  function keyOf(x){return `${x.group}|${x.resource||x.source||'google'}|${x.id||''}|${x.date}|${x.field||''}`}
  function visibleRange(){
    syncAnchorFromMonth();
    if(mode==='day'){const a=new Date(anchor);return{start:isoDate(a),end:isoDate(a),days:[a]}}
    if(mode==='week'){const st=startOfWeek(anchor),days=Array.from({length:7},(_,i)=>addDays(st,i));return{start:isoDate(days[0]),end:isoDate(days[6]),days}}
    const m=monthState(),y=m.getFullYear(),mo=m.getMonth(),start=new Date(y,mo,1,12),end=new Date(y,mo+1,0,12);return{start:isoDate(start),end:isoDate(end),days:[]}
  }
  function filtered(all){const r=visibleRange(),q=query.trim().toLocaleLowerCase('es');return all.filter(x=>x.date>=r.start&&x.date<=r.end&&(activeGroups.size===0||activeGroups.has(x.group))&&(!q||`${x.title} ${x.meta||''} ${GROUP_LABEL[x.group]||''}`.toLocaleLowerCase('es').includes(q)))}
  function typeLabel(x){return x.google?(x.source==='tasks'?'Google Tasks':'Google Calendar'):(GROUP_LABEL[x.group]||x.group)}
  function openEntry(x){if(!x)return;if(x.google){if(x.link&&String(x.link).startsWith('https://'))window.open(x.link,'_blank','noopener');return}if(x.resource&&x.id&&window.openDetails)window.openDetails(x.resource,x.id)}
  function editEntry(x){if(!x||x.google||!x.resource||!x.id)return;if(!canWrite())return toast('Tu usuario no tiene permisos de edición');window.editEntity?.(x.resource,x.id)}
  function mutableRecord(x){const s=S();if(!s||!x?.resource)return null;return(s[x.resource]||[]).find(r=>String(r.id)===String(x.id))||null}
  async function updateDate(x,newDate,newTime){
    if(!x||x.google||x.readOnlyDate||!x.field||!canWrite()||!db)return false;
    const patch={[x.field]:newDate};if(x.timeField&&newTime!==undefined)patch[x.timeField]=newTime||null;
    const {error}=await db.from(x.resource).update(patch).eq('id',x.id);if(error){toast(`No se pudo reprogramar: ${error.message}`);return false}
    const rec=mutableRecord(x);if(rec)Object.assign(rec,patch);
    toast('Actividad reprogramada');window.dispatchEvent(new CustomEvent('jf:data-changed',{detail:{resource:x.resource,id:x.id,action:'calendar-reschedule'}}));setTimeout(render,40);return true;
  }
  function ensureMoveDialog(){
    if(document.getElementById('jfCalMoveBackdrop'))return;
    const back=document.createElement('div');back.id='jfCalMoveBackdrop';back.className='jf-cal-move-backdrop';
    back.innerHTML=`<div class="jf-cal-move" role="dialog" aria-modal="true" aria-labelledby="jfCalMoveTitle"><div class="jf-cal-move-head"><div><p>REPROGRAMAR</p><h3 id="jfCalMoveTitle">Cambiar fecha</h3></div><button type="button" data-cal-move-close aria-label="Cerrar">×</button></div><p id="jfCalMoveName" class="jf-cal-move-name"></p><label>Nueva fecha<input type="date" id="jfCalMoveDate"></label><label id="jfCalMoveTimeWrap">Hora<input type="time" id="jfCalMoveTime"></label><div class="jf-cal-move-actions"><button type="button" class="secondary-btn" data-cal-move-close>Cancelar</button><button type="button" class="primary-btn" id="jfCalMoveSave">Guardar cambio</button></div></div>`;
    document.body.appendChild(back);back.addEventListener('click',e=>{if(e.target===back||e.target.closest('[data-cal-move-close]'))closeMove()});
    document.getElementById('jfCalMoveSave').addEventListener('click',async()=>{const key=back.dataset.key,x=currentMap().get(key),date=document.getElementById('jfCalMoveDate').value,time=document.getElementById('jfCalMoveTime').value;if(!x||!date)return toast('Elegí una fecha');const ok=await updateDate(x,date,x.timeField?time:undefined);if(ok)closeMove()});
  }
  function openMove(x){if(!x||x.google||x.readOnlyDate||!x.field)return toast('Este elemento no se puede reprogramar desde Soraya');if(!canWrite())return toast('Tu usuario no tiene permisos de edición');ensureMoveDialog();const back=document.getElementById('jfCalMoveBackdrop');back.dataset.key=keyOf(x);document.getElementById('jfCalMoveName').textContent=x.title;document.getElementById('jfCalMoveDate').value=x.date||'';document.getElementById('jfCalMoveTime').value=fmtTime(x.time);document.getElementById('jfCalMoveTimeWrap').style.display=x.timeField?'grid':'none';back.classList.add('show');setTimeout(()=>document.getElementById('jfCalMoveDate').focus(),20)}
  function closeMove(){document.getElementById('jfCalMoveBackdrop')?.classList.remove('show')}
  function currentMap(){return new Map(entriesAll().map(x=>[keyOf(x),x]))}

  function ensureShell(){
    const v=root(),g=grid();if(!v||!g)return null;v.classList.add('jf-cal-v2-mounted');
    let tb=document.getElementById('jfCalToolbar');
    if(!tb){
      tb=document.createElement('div');tb.id='jfCalToolbar';tb.className='jf-cal-toolbar';
      tb.innerHTML=`<div class="jf-cal-primary"><div class="jf-cal-nav"><button type="button" data-cal-prev aria-label="Anterior">←</button><strong id="jfCalRangeLabel"></strong><button type="button" data-cal-next aria-label="Siguiente">→</button></div><button type="button" class="jf-cal-today" data-cal-today>Hoy</button><div class="jf-cal-segment" aria-label="Vista del calendario"><button type="button" data-cal-mode="day">Día</button><button type="button" data-cal-mode="week">Semana</button><button type="button" data-cal-mode="month">Mes</button><button type="button" data-cal-mode="agenda">Agenda</button></div></div><div class="jf-cal-secondary"><input class="jf-cal-search" id="jfCalSearch" placeholder="Buscar tareas, reuniones, eventos…"><div class="jf-cal-filters"><button class="jf-cal-filter active" data-cal-filter="all">Todo</button>${GROUPS.map(g=>`<button class="jf-cal-filter" data-cal-filter="${g}">${GROUP_LABEL[g]}</button>`).join('')}</div></div>`;
      g.insertAdjacentElement('beforebegin',tb);
      const sum=document.createElement('div');sum.id='jfCalSummary';sum.className='jf-cal-summary';tb.insertAdjacentElement('afterend',sum);
      const legend=document.createElement('div');legend.id='jfCalLegend';legend.className='jf-cal-legend';sum.insertAdjacentElement('afterend',legend);
      const note=document.createElement('p');note.className='jf-cal-mobile-note';note.textContent='En celular se recomienda Agenda o Día. En Mes podés desplazarte horizontalmente.';legend.insertAdjacentElement('afterend',note);
      const wrap=document.createElement('div');wrap.className='jf-calendar-wrap';g.parentNode.insertBefore(wrap,g);wrap.appendChild(g);
      const extra=document.createElement('div');extra.id='jfCalExtra';extra.className='jf-cal-extra';wrap.insertAdjacentElement('afterend',extra);
      tb.addEventListener('click',e=>{const m=e.target.closest('[data-cal-mode]'),f=e.target.closest('[data-cal-filter]');if(m){mode=m.dataset.calMode;try{localStorage.setItem('soraya_calendar_mode_v2',mode)}catch{};if((mode==='month'||mode==='agenda')){const st=S();if(st)st.month=new Date(anchor.getFullYear(),anchor.getMonth(),1)}render();return}if(f){const g=f.dataset.calFilter;if(g==='all')activeGroups.clear();else{activeGroups.has(g)?activeGroups.delete(g):activeGroups.add(g)}render();return}if(e.target.closest('[data-cal-prev]'))navigate(-1);if(e.target.closest('[data-cal-next]'))navigate(1);if(e.target.closest('[data-cal-today]'))goToday()});
      tb.querySelector('#jfCalSearch').addEventListener('input',e=>{query=e.target.value;render()});
    }
    ensureMoveDialog();return tb;
  }
  function navigate(delta){const s=S();if(mode==='day')anchor=addDays(anchor,delta);else if(mode==='week')anchor=addDays(anchor,delta*7);else{const m=monthState();const n=new Date(m.getFullYear(),m.getMonth()+delta,1,12);anchor=new Date(n);if(s)s.month=n;try{window.renderCalendar?.()}catch{}}if(mode==='day'||mode==='week'){if(s)s.month=new Date(anchor.getFullYear(),anchor.getMonth(),1,12)}setTimeout(render,20)}
  function goToday(){anchor=parseIso(todayIso())||new Date();const s=S();if(s)s.month=new Date(anchor.getFullYear(),anchor.getMonth(),1,12);try{window.renderCalendar?.()}catch{};setTimeout(render,20)}
  function renderRangeLabel(){const el=document.getElementById('jfCalRangeLabel');if(!el)return;const r=visibleRange();if(mode==='day')el.textContent=fmtDateLong(parseIso(r.start));else if(mode==='week')el.textContent=`${fmtShort(parseIso(r.start))} – ${fmtShort(parseIso(r.end))} ${parseIso(r.end).getFullYear()}`;else{const m=monthState();el.textContent=new Intl.DateTimeFormat('es-UY',{month:'long',year:'numeric'}).format(m)}}
  function renderSummary(all){const f=filtered(all),el=document.getElementById('jfCalSummary');if(!el)return;const n=g=>f.filter(x=>x.group===g).length;el.innerHTML=`<div class="jf-cal-kpi main"><strong>${f.length}</strong><span>elementos visibles</span></div><div class="jf-cal-kpi"><strong>${n('task')+n('activity')+n('workshop')}</strong><span>tareas / actividades</span></div><div class="jf-cal-kpi"><strong>${n('event')}</strong><span>eventos</span></div><div class="jf-cal-kpi"><strong>${n('meeting')}</strong><span>reuniones</span></div><div class="jf-cal-kpi"><strong>${n('deadline')+n('reminder')}</strong><span>vencimientos / avisos</span></div><div class="jf-cal-kpi"><strong>${n('google')}</strong><span>Google</span></div>`}
  function renderLegend(){const el=document.getElementById('jfCalLegend');if(!el)return;el.innerHTML=GROUPS.map(g=>`<span class="jf-cal-legend-item ${g}"><i></i>${GROUP_LABEL[g]}</span>`).join('')}
  function monthItem(x){const drag=canWrite()&&!x.google&&!x.readOnlyDate&&x.field;return `<div class="jf-cal-entry-wrap" ${drag?'draggable="true"':''} data-cal-drag="${esc(keyOf(x))}"><button type="button" class="jf-cal-entry ${esc(x.group)} ${x.done?'done':''}" data-cal-open="${esc(keyOf(x))}">${x.time?`<small>${esc(fmtTime(x.time))}</small>`:''}<span>${esc(x.title)}</span></button></div>`}
  function actionButtons(x){if(x.google)return `<button type="button" data-cal-open="${esc(keyOf(x))}">Abrir en Google</button>`;const edit=canWrite()?`<button type="button" data-cal-edit="${esc(keyOf(x))}">Editar</button>${!x.readOnlyDate&&x.field?`<button type="button" data-cal-move="${esc(keyOf(x))}">Reprogramar</button>`:''}`:'';return `<button type="button" data-cal-open="${esc(keyOf(x))}">Ver</button>${edit}`}
  function detailCard(x){return `<article class="jf-cal-detail-card ${esc(x.group)}" data-cal-drag="${esc(keyOf(x))}" ${canWrite()&&!x.google&&!x.readOnlyDate&&x.field?'draggable="true"':''}><div class="jf-cal-detail-time">${x.time?esc(fmtTime(x.time)):'Todo el día'}</div><div class="jf-cal-detail-copy"><span class="jf-cal-type ${esc(x.group)}">${esc(typeLabel(x))}</span><strong>${esc(x.title)}</strong>${x.meta?`<small>${esc(x.meta)}</small>`:''}</div><div class="jf-cal-actions">${actionButtons(x)}</div></article>`}
  function renderMonth(all){const g=grid();if(!g)return;const m=monthState(),y=m.getFullYear(),mo=m.getMonth(),list=filtered(all),map=new Map();for(const x of list){if(!map.has(x.date))map.set(x.date,[]);map.get(x.date).push(x)}const first=new Date(y,mo,1,12),start=(first.getDay()+6)%7,today=todayIso();let html=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(x=>`<div class="cal-head">${x}</div>`).join('');for(let i=0;i<42;i++){const d=new Date(y,mo,1-start+i,12),iso=isoDate(d),rows=map.get(iso)||[];html+=`<div class="cal-day ${d.getMonth()!==mo?'other':''}" data-cal-date="${iso}"><div class="jf-cal-dayhead"><div class="cal-num ${iso===today?'today':''}">${d.getDate()}</div>${rows.length?`<span class="jf-cal-count">${rows.length}</span>`:''}</div><div class="jf-cal-items">${rows.map(monthItem).join('')}</div></div>`}g.className='calendar jf-calendar-pro-grid';g.innerHTML=html;g.style.display=mode==='month'?'grid':'none'}
  function renderDay(all){const extra=document.getElementById('jfCalExtra');if(!extra)return;const r=visibleRange(),rows=filtered(all),d=parseIso(r.start);extra.innerHTML=`<section class="jf-cal-day-view"><header><span>${new Intl.DateTimeFormat('es-UY',{weekday:'long'}).format(d)}</span><strong>${d.getDate()}</strong><small>${new Intl.DateTimeFormat('es-UY',{month:'long',year:'numeric'}).format(d)}</small></header><div class="jf-cal-day-list">${rows.map(detailCard).join('')||'<div class="jf-cal-empty">No hay actividades para este día.</div>'}</div></section>`;extra.style.display=mode==='day'?'block':'none'}
  function renderWeek(all){const extra=document.getElementById('jfCalExtra');if(!extra)return;const r=visibleRange(),list=filtered(all),map=new Map();for(const x of list){if(!map.has(x.date))map.set(x.date,[]);map.get(x.date).push(x)}extra.innerHTML=`<div class="jf-cal-week">${r.days.map(d=>{const iso=isoDate(d),rows=map.get(iso)||[];return `<section class="jf-cal-week-day" data-cal-date="${iso}"><header><span>${new Intl.DateTimeFormat('es-UY',{weekday:'short'}).format(d).replace('.','')}</span><strong class="${iso===todayIso()?'today':''}">${d.getDate()}</strong><small>${fmtShort(d)}</small></header><div class="jf-cal-week-list">${rows.map(detailCard).join('')||'<div class="jf-cal-week-empty">Sin actividades</div>'}</div></section>`}).join('')}</div>`;extra.style.display=mode==='week'?'block':'none'}
  function renderAgenda(all){const extra=document.getElementById('jfCalExtra');if(!extra)return;const list=filtered(all),groups=new Map();for(const x of list){if(!groups.has(x.date))groups.set(x.date,[]);groups.get(x.date).push(x)}extra.innerHTML=list.length?[...groups.entries()].map(([date,rows])=>{const d=parseIso(date);return `<section class="jf-cal-daygroup"><div class="jf-cal-datebox"><strong>${d.getDate()}</strong><span>${new Intl.DateTimeFormat('es-UY',{weekday:'short'}).format(d).replace('.','')}</span><small>${new Intl.DateTimeFormat('es-UY',{month:'short'}).format(d).replace('.','')}</small></div><div class="jf-cal-agenda-items">${rows.map(detailCard).join('')}</div></section>`}).join(''):'<div class="jf-cal-empty">No hay actividades que coincidan con los filtros para este mes.</div>';extra.style.display=mode==='agenda'?'grid':'none'}
  function syncControls(){document.querySelectorAll('[data-cal-mode]').forEach(b=>b.classList.toggle('active',b.dataset.calMode===mode));document.querySelectorAll('[data-cal-filter]').forEach(b=>{const g=b.dataset.calFilter;b.classList.toggle('active',g==='all'?activeGroups.size===0:activeGroups.has(g))});root()?.classList.toggle('jf-cal-month-mode',mode==='month');root()?.classList.toggle('jf-cal-agenda-mode',mode==='agenda');root()?.classList.toggle('jf-cal-week-mode',mode==='week');root()?.classList.toggle('jf-cal-day-mode',mode==='day')}
  function bindInteractions(all){
    const r=root(),map=new Map(all.map(x=>[keyOf(x),x]));if(!r)return;
    r.querySelectorAll('[data-cal-open]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openEntry(map.get(b.dataset.calOpen))}));
    r.querySelectorAll('[data-cal-edit]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();editEntry(map.get(b.dataset.calEdit))}));
    r.querySelectorAll('[data-cal-move]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openMove(map.get(b.dataset.calMove))}));
    r.querySelectorAll('[draggable="true"][data-cal-drag]').forEach(el=>el.addEventListener('dragstart',e=>{draggedKey=el.dataset.calDrag;e.dataTransfer?.setData('text/plain',draggedKey);if(e.dataTransfer)e.dataTransfer.effectAllowed='move';el.classList.add('dragging')}));
    r.querySelectorAll('[draggable="true"][data-cal-drag]').forEach(el=>el.addEventListener('dragend',()=>{draggedKey='';el.classList.remove('dragging');r.querySelectorAll('.jf-cal-drop-target').forEach(x=>x.classList.remove('jf-cal-drop-target'))}));
    r.querySelectorAll('[data-cal-date]').forEach(cell=>{cell.addEventListener('dragover',e=>{if(!draggedKey)return;e.preventDefault();cell.classList.add('jf-cal-drop-target')});cell.addEventListener('dragleave',()=>cell.classList.remove('jf-cal-drop-target'));cell.addEventListener('drop',async e=>{e.preventDefault();cell.classList.remove('jf-cal-drop-target');const key=e.dataTransfer?.getData('text/plain')||draggedKey,x=map.get(key),date=cell.dataset.calDate;if(x&&date&&date!==x.date)await updateDate(x,date,x.timeField?fmtTime(x.time):undefined)})});
  }
  function render(){if(busy)return;const v=root(),g=grid();if(!v||!g)return;busy=true;try{ensureShell();const all=entriesAll();renderRangeLabel();renderSummary(all);renderLegend();renderMonth(all);if(mode==='day')renderDay(all);else if(mode==='week')renderWeek(all);else if(mode==='agenda')renderAgenda(all);else{const ex=document.getElementById('jfCalExtra');if(ex)ex.style.display='none'}syncControls();bindInteractions(all)}finally{busy=false}}

  const core=window.renderCalendar;if(typeof core==='function'){window.renderCalendar=function(){const r=core.apply(this,arguments);setTimeout(render,0);return r}}
  document.querySelector('#mainNav [data-view="calendar"]')?.addEventListener('click',()=>setTimeout(render,80));
  window.addEventListener('jf:state-updated',()=>setTimeout(render,60));window.addEventListener('jf:data-changed',()=>setTimeout(render,80));window.addEventListener('hashchange',()=>{if(location.hash.includes('/calendar'))setTimeout(render,80)});
  window.addEventListener('resize',()=>{if(window.innerWidth<=760&&mode==='month'&&!localStorage.getItem('soraya_calendar_mode_v2')){mode='agenda';render()}});
  setInterval(()=>{if(root()?.classList.contains('active'))render()},30000);
  setTimeout(()=>{const m=monthState(),t=parseIso(todayIso());anchor=t&&t.getFullYear()===m.getFullYear()&&t.getMonth()===m.getMonth()?t:new Date(m.getFullYear(),m.getMonth(),1,12);render()},900);setTimeout(render,2200);
  window.SorayaCalendar={render,setMode:m=>{if(['day','week','month','agenda'].includes(m)){mode=m;render()}},setFilter:g=>{activeGroups=g&&g!=='all'?new Set([g]):new Set();render()},today:goToday};
})();