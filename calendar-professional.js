(function installSorayaCalendarEnhanced(){
  'use strict';
  if(window.__SORAYA_CALENDAR_SAFE_LAYER__)return;
  window.__SORAYA_CALENDAR_SAFE_LAYER__=true;

  const C=window.JF_CONFIG||{};
  const TYPES={
    task:{label:'Tarea',icon:'✓'},activity:{label:'Actividad',icon:'●'},workshop:{label:'Taller',icon:'✦'},
    deadline:{label:'Vencimiento',icon:'!'},meeting:{label:'Reunión',icon:'◆'},event:{label:'Evento',icon:'●'},
    followup:{label:'Seguimiento',icon:'↗'},project:{label:'Proyecto',icon:'▣'},opportunity:{label:'Oportunidad',icon:'★'},
    'google-calendar':{label:'Google Calendar',icon:'G'},'google-task':{label:'Google Tasks',icon:'G✓'}
  };
  const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  let anchor=new Date();
  let mode=(window.matchMedia&&window.matchMedia('(max-width:760px)').matches)?'agenda':'month';
  let query='';
  let typeFilter='';
  let hideDone=false;
  let lastBaseTitle='';
  let entriesByKey=new Map();
  let renderTimer=null;

  try{const saved=localStorage.getItem('soraya_calendar_safe_mode');if(['month','week','agenda'].includes(saved))mode=saved}catch{}

  function appState(){try{return typeof state!=='undefined'?state:null}catch{return null}}
  function root(){return document.getElementById('view-calendar')}
  function baseGrid(){return document.getElementById('calendarGrid')}
  function byId(id){return document.getElementById(id)}
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]))}
  function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
  function pad(n){return String(n).padStart(2,'0')}
  function iso(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
  function parseIso(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||'')))return null;const [y,m,d]=String(v).split('-').map(Number);return new Date(y,m-1,d,12)}
  function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);x.setHours(12,0,0,0);return x}
  function startWeek(d){const x=new Date(d);x.setDate(x.getDate()-((x.getDay()+6)%7));x.setHours(12,0,0,0);return x}
  function fmtTime(v){return v?String(v).slice(0,5):''}
  function todayIso(){return new Intl.DateTimeFormat('en-CA',{timeZone:C.timezone||'America/Montevideo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
  function fmtDay(v){const d=typeof v==='string'?parseIso(v):v;return d?new Intl.DateTimeFormat('es-UY',{weekday:'long',day:'numeric',month:'long'}).format(d):''}
  function fmtShort(v){const d=typeof v==='string'?parseIso(v):v;return d?new Intl.DateTimeFormat('es-UY',{day:'2-digit',month:'short'}).format(d).replace('.',''):''}
  function titleForMonth(d){return new Intl.DateTimeFormat('es-UY',{month:'long',year:'numeric'}).format(d)}
  function baseMonth(){
    const s=appState();
    if(s?.month instanceof Date&&!Number.isNaN(s.month.getTime()))return new Date(s.month.getFullYear(),s.month.getMonth(),1,12);
    const txt=String(byId('monthTitle')?.textContent||'').toLowerCase();
    const y=Number(txt.match(/20\d{2}/)?.[0]||new Date().getFullYear());
    const mi=MONTHS.findIndex(m=>txt.includes(m));
    return new Date(y,mi>=0?mi:new Date().getMonth(),1,12);
  }
  function uniq(list){return [...new Set((list||[]).map(x=>String(x||'').trim()).filter(Boolean))]}
  function splitInst(v){return String(v||'').split(/[,;|]+/).map(x=>x.trim()).filter(Boolean)}
  function make(x){return{date:String(x.date||''),time:fmtTime(x.time),type:x.type||'task',title:String(x.title||'Sin título'),meta:String(x.meta||''),resource:x.resource||'',id:x.id||'',done:!!x.done,priority:String(x.priority||''),institutions:uniq(x.institutions),google:!!x.google,link:String(x.link||'')}}
  function taskType(t){const c=norm(t.category);if(c.includes('taller'))return'workshop';if(c.includes('actividad')||c.includes('capacitacion'))return'activity';return'task'}
  function taskDone(t){return['Realizada','Cancelada'].includes(String(t.status||''))}

  function allEntries(){
    const s=appState(),out=[];if(!s)return out;
    for(const t of s.tasks||[]){
      const done=taskDone(t),inst=splitInst(t.institution_name),type=taskType(t);
      if(t.task_date)out.push(make({date:t.task_date,time:t.task_time,type,title:t.title,meta:[t.status,t.priority,t.category,t.institution_name].filter(Boolean).join(' · '),resource:'tasks',id:t.id,done,priority:t.priority,institutions:inst}));
      if(t.deadline&&t.deadline!==t.task_date)out.push(make({date:t.deadline,type:'deadline',title:`Vence: ${t.title||'Tarea'}`,meta:[t.status,t.priority,t.institution_name].filter(Boolean).join(' · '),resource:'tasks',id:t.id,done,priority:t.priority,institutions:inst}));
    }
    for(const e of s.events||[]){if(e.event_date)out.push(make({date:e.event_date,time:e.start_time,type:'event',title:e.name||'Evento',meta:[e.place,e.organizer,e.responsible_name].filter(Boolean).join(' · '),resource:'events',id:e.id,institutions:uniq([...splitInst(e.organizer),...splitInst(e.collaborators)])}))}
    for(const m of s.meetings||[]){if(m.meeting_date)out.push(make({date:m.meeting_date,time:m.meeting_time,type:'meeting',title:m.subject||'Reunión',meta:[m.place,m.institutions].filter(Boolean).join(' · '),resource:'meetings',id:m.id,institutions:splitInst(m.institutions)}))}
    for(const n of s.notes||[]){if(n.followup_date)out.push(make({date:n.followup_date,type:'followup',title:`Seguimiento: ${n.subject||'Nota'}`,meta:[n.status,n.recipient,n.department].filter(Boolean).join(' · '),resource:'notes',id:n.id,institutions:uniq([...splitInst(n.recipient),...splitInst(n.department)])}))}
    for(const p of s.projects||[]){
      if(p.start_date)out.push(make({date:p.start_date,type:'project',title:`Inicio: ${p.name||'Proyecto'}`,meta:p.status||'',resource:'projects',id:p.id}));
      if(p.end_date&&p.end_date!==p.start_date)out.push(make({date:p.end_date,type:'project',title:`Fin previsto: ${p.name||'Proyecto'}`,meta:p.status||'',resource:'projects',id:p.id}));
    }
    for(const o of s.opportunities||[]){if(o.deadline)out.push(make({date:o.deadline,type:'opportunity',title:`Cierre: ${o.title||'Oportunidad'}`,meta:[o.category,o.organization,o.status].filter(Boolean).join(' · '),resource:'opportunities',id:o.id,institutions:splitInst(o.organization)}))}
    for(const g of window.SorayaGoogleSync?.items||[]){
      if(g.archived||!g.item_date||g.soraya_id)continue;
      const isTask=g.source==='tasks';
      out.push(make({date:g.item_date,time:g.start_time,type:isTask?'google-task':'google-calendar',title:g.title||'Google',meta:isTask?(g.metadata?.tasklist_title||'Google Tasks'):[g.metadata?.calendar_name,g.location].filter(Boolean).join(' · ')||'Google Calendar',done:!!g.completed,google:true,id:g.id||g.external_id,link:g.html_link}));
    }
    const seen=new Set();
    return out.filter(x=>{if(!x.date)return false;const k=[x.date,x.time,x.type,x.resource,x.id,x.title].join('|');if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99:99').localeCompare(b.time||'99:99')||a.title.localeCompare(b.title,'es'));
  }

  function visibleRange(){
    if(mode==='week'){const st=startWeek(anchor);return{start:iso(st),end:iso(addDays(st,6))}}
    const st=new Date(anchor.getFullYear(),anchor.getMonth(),1,12),en=new Date(anchor.getFullYear(),anchor.getMonth()+1,0,12);return{start:iso(st),end:iso(en)};
  }
  function matches(x){
    if(typeFilter&&x.type!==typeFilter)return false;
    if(hideDone&&x.done)return false;
    const q=norm(query);if(!q)return true;
    return norm([x.title,x.meta,x.priority,TYPES[x.type]?.label,...x.institutions].join(' ')).includes(q);
  }
  function filtered(){const r=visibleRange();return allEntries().filter(x=>x.date>=r.start&&x.date<=r.end&&matches(x))}
  function renderEntry(x,compact=false){
    const key=`${x.type}|${x.resource||'google'}|${x.id}|${x.date}|${x.time}|${x.title}`;entriesByKey.set(key,x);
    const icon=TYPES[x.type]?.icon||'•',label=TYPES[x.type]?.label||x.type;
    return `<button type="button" class="jf-cal-safe-entry ${esc(x.type)}${x.done?' done':''}${compact?' compact':''}" data-cal-safe-entry="${esc(key)}" title="${esc([label,x.title,x.meta].filter(Boolean).join(' · '))}">${x.time?`<small>${esc(x.time)}</small>`:''}<span><i>${esc(icon)}</i>${esc(x.title)}</span>${compact?'':`<em>${esc(label)}</em>`}</button>`;
  }

  function renderMonth(entries){
    const y=anchor.getFullYear(),m=anchor.getMonth(),first=new Date(y,m,1,12),start=(first.getDay()+6)%7;
    let html='<div class="jf-cal-safe-month-scroll"><div class="jf-cal-safe-grid">'+['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(x=>`<div class="jf-cal-safe-weekday">${x}</div>`).join('');
    for(let i=0;i<42;i++){
      const d=new Date(y,m,1-start+i,12),di=iso(d),rows=entries.filter(x=>x.date===di),other=d.getMonth()!==m,today=di===todayIso();
      html+=`<section class="jf-cal-safe-day${other?' other':''}${today?' today':''}"><header><strong>${d.getDate()}</strong>${rows.length?`<span>${rows.length}</span>`:''}</header><div class="jf-cal-safe-dayitems">${rows.length?rows.map(x=>renderEntry(x,true)).join(''):'<small class="jf-cal-safe-emptyday">Sin registros</small>'}</div></section>`;
    }
    return html+'</div></div>';
  }
  function renderWeek(entries){
    const st=startWeek(anchor);let html='<div class="jf-cal-safe-week">';
    for(let i=0;i<7;i++){const d=addDays(st,i),di=iso(d),rows=entries.filter(x=>x.date===di);html+=`<section class="jf-cal-safe-weekcol${di===todayIso()?' today':''}"><header><span>${new Intl.DateTimeFormat('es-UY',{weekday:'short'}).format(d)}</span><strong>${d.getDate()}</strong><small>${new Intl.DateTimeFormat('es-UY',{month:'short'}).format(d)}</small></header><div>${rows.length?rows.map(x=>renderEntry(x)).join(''):'<p class="jf-cal-safe-empty">Sin actividades</p>'}</div></section>`}return html+'</div>';
  }
  function renderAgenda(entries){
    const groups=new Map();for(const x of entries){if(!groups.has(x.date))groups.set(x.date,[]);groups.get(x.date).push(x)}
    if(!groups.size)return'<div class="jf-cal-safe-noresults">No hay actividades para mostrar con estos filtros.</div>';
    return `<div class="jf-cal-safe-agenda">${[...groups].map(([date,rows])=>{const d=parseIso(date);return `<section class="jf-cal-safe-agenda-day"><div class="jf-cal-safe-date"><span>${new Intl.DateTimeFormat('es-UY',{weekday:'short'}).format(d)}</span><strong>${d.getDate()}</strong><small>${new Intl.DateTimeFormat('es-UY',{month:'short'}).format(d)}</small></div><div class="jf-cal-safe-agenda-list">${rows.map(x=>renderEntry(x)).join('')}</div></section>`}).join('')}</div>`;
  }
  function rangeLabel(){if(mode==='week'){const st=startWeek(anchor),en=addDays(st,6);return `${fmtShort(st)} – ${fmtShort(en)} ${en.getFullYear()}`}return titleForMonth(anchor)}

  function ensureLayer(){
    const view=root(),grid=baseGrid();if(!view||!grid)return null;
    let layer=byId('sorayaCalendarEnhancedLayer');
    if(!layer){
      layer=document.createElement('section');layer.id='sorayaCalendarEnhancedLayer';layer.className='jf-cal-safe-layer';
      const googlePanel=byId('sorayaGoogleCalendarPanel');
      const insertBefore=googlePanel||grid;
      insertBefore.parentNode.insertBefore(layer,insertBefore);
      layer.innerHTML=`
        <div class="jf-cal-safe-head"><div><p>VISTA MEJORADA · CAPA INDEPENDIENTE</p><h2>Agenda completa</h2><span>Tareas, vencimientos, reuniones, eventos, seguimientos, proyectos y Google, sin modificar el calendario base.</span></div><button type="button" data-cal-safe-base>↓ Ir al calendario base estable</button></div>
        <div class="jf-cal-safe-controls"><div class="jf-cal-safe-nav"><button type="button" data-cal-safe-prev aria-label="Anterior">←</button><strong id="jfCalSafeRange"></strong><button type="button" data-cal-safe-next aria-label="Siguiente">→</button></div><button type="button" data-cal-safe-today>Hoy</button><div class="jf-cal-safe-modes"><button type="button" data-cal-safe-mode="month">Mes</button><button type="button" data-cal-safe-mode="week">Semana</button><button type="button" data-cal-safe-mode="agenda">Agenda</button></div></div>
        <div class="jf-cal-safe-filters"><input id="jfCalSafeSearch" type="search" placeholder="Buscar tareas, reuniones, eventos…"><select id="jfCalSafeType"><option value="">Todos los tipos</option>${Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${esc(v.label)}</option>`).join('')}</select><label><input id="jfCalSafeHideDone" type="checkbox"> Ocultar realizadas</label></div>
        <div id="jfCalSafeSummary" class="jf-cal-safe-summary"></div>
        <div id="jfCalSafeContent"></div>`;
      layer.addEventListener('click',handleLayerClick);
      byId('jfCalSafeSearch').addEventListener('input',e=>{query=e.target.value||'';scheduleRender()});
      byId('jfCalSafeType').addEventListener('change',e=>{typeFilter=e.target.value||'';render()});
      byId('jfCalSafeHideDone').addEventListener('change',e=>{hideDone=!!e.target.checked;render()});
    }
    if(!byId('sorayaCalendarBaseLabel')){
      const label=document.createElement('div');label.id='sorayaCalendarBaseLabel';label.className='jf-cal-safe-base-label';label.innerHTML='<div><strong>Calendario base estable</strong><span>Vista original de Soraya disponible permanentemente como respaldo.</span></div><span class="jf-cal-safe-ok">✓ Sin modificaciones</span>';
      grid.parentNode.insertBefore(label,grid);
    }
    return layer;
  }

  function handleLayerClick(e){
    const entryBtn=e.target.closest('[data-cal-safe-entry]');
    if(entryBtn){const x=entriesByKey.get(entryBtn.dataset.calSafeEntry);if(x)openEntry(x);return}
    const modeBtn=e.target.closest('[data-cal-safe-mode]');if(modeBtn){mode=modeBtn.dataset.calSafeMode;try{localStorage.setItem('soraya_calendar_safe_mode',mode)}catch{};render();return}
    if(e.target.closest('[data-cal-safe-prev]')){navigate(-1);return}
    if(e.target.closest('[data-cal-safe-next]')){navigate(1);return}
    if(e.target.closest('[data-cal-safe-today]')){anchor=parseIso(todayIso())||new Date();render();return}
    if(e.target.closest('[data-cal-safe-base]')){baseGrid()?.scrollIntoView({behavior:'smooth',block:'start'});return}
  }
  function navigate(delta){if(mode==='week')anchor=addDays(anchor,delta*7);else anchor=new Date(anchor.getFullYear(),anchor.getMonth()+delta,1,12);render()}
  function openEntry(x){
    if(x.google){if(/^https:\/\//i.test(x.link))window.open(x.link,'_blank','noopener');return}
    if(x.resource&&x.id&&typeof window.openDetails==='function')window.openDetails(x.resource,x.id);
  }
  function render(){
    const layer=ensureLayer();if(!layer)return;
    entriesByKey=new Map();
    const entries=filtered(),all=allEntries(),range=visibleRange(),today=todayIso();
    byId('jfCalSafeRange').textContent=rangeLabel();
    layer.querySelectorAll('[data-cal-safe-mode]').forEach(b=>b.classList.toggle('active',b.dataset.calSafeMode===mode));
    const urgent=entries.filter(x=>['Urgente','Alta'].includes(x.priority)&&!x.done).length,google=entries.filter(x=>x.google).length,todayCount=all.filter(x=>x.date===today&&!x.done).length;
    byId('jfCalSafeSummary').innerHTML=`<div><strong>${entries.length}</strong><span>registros en el período</span></div><div><strong>${todayCount}</strong><span>para hoy</span></div><div class="${urgent?'alert':''}"><strong>${urgent}</strong><span>prioridad alta/urgente</span></div><div><strong>${google}</strong><span>desde Google</span></div>`;
    const content=byId('jfCalSafeContent');content.innerHTML=mode==='month'?renderMonth(entries):mode==='week'?renderWeek(entries):renderAgenda(entries);
    layer.dataset.rangeStart=range.start;layer.dataset.rangeEnd=range.end;
  }
  function scheduleRender(){clearTimeout(renderTimer);renderTimer=setTimeout(render,120)}
  function syncFromBase(){
    const title=String(byId('monthTitle')?.textContent||'').trim();if(!title||title===lastBaseTitle)return;lastBaseTitle=title;
    const bm=baseMonth();if(mode!=='week'&&(anchor.getFullYear()!==bm.getFullYear()||anchor.getMonth()!==bm.getMonth())){anchor=bm;render()}
  }

  async function boot(){
    for(let i=0;i<30&&!root();i++)await new Promise(r=>setTimeout(r,200));
    if(!root())return;
    anchor=baseMonth();lastBaseTitle=String(byId('monthTitle')?.textContent||'').trim();
    ensureLayer();render();
    const title=byId('monthTitle');if(title)new MutationObserver(syncFromBase).observe(title,{childList:true,subtree:true,characterData:true});
    setInterval(()=>{if(root()?.classList.contains('active'))render()},30000);
  }

  window.addEventListener('jf:data-changed',scheduleRender);
  window.addEventListener('jf:google-sync-updated',scheduleRender);
  window.SorayaCalendarEnhanced={render,goToday(){anchor=parseIso(todayIso())||new Date();render()},get mode(){return mode},setMode(v){if(['month','week','agenda'].includes(v)){mode=v;render()}}};
  setTimeout(boot,600);
})();