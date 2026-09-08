(function installSorayaCalendarDayPanel(){
  'use strict';
  if(window.__SORAYA_CALENDAR_DAY_PANEL__)return;window.__SORAYA_CALENDAR_DAY_PANEL__=true;
  const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const MONTH_SHORT={ene:0,feb:1,mar:2,abr:3,may:4,jun:5,jul:6,ago:7,sept:8,set:8,oct:9,nov:10,dic:11};
  const LABELS={task:'Tarea',deadline:'Vencimiento',meeting:'Reunión',event:'Evento',followup:'Seguimiento',project:'Proyecto',opportunity:'Oportunidad','google-calendar':'Google Calendar','google-task':'Google Tasks'};
  const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  const pad=n=>String(n).padStart(2,'0');
  const iso=(y,m,d)=>`${y}-${pad(m+1)}-${pad(d)}`;
  const fmtTime=v=>v?String(v).slice(0,5):'';
  const split=v=>String(v||'').split(/[,;|]+/).map(x=>x.trim()).filter(Boolean);
  function appState(){try{return typeof state!=='undefined'?state:null}catch{return null}}
  function parseIso(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||'')))return null;const [y,m,d]=String(v).split('-').map(Number);return new Date(y,m-1,d,12)}
  function fmtDate(v){const d=parseIso(v);return d?new Intl.DateTimeFormat('es-UY',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d):v}
  function taskDone(t){return['Realizada','Cancelada'].includes(String(t.status||''))}
  function push(out,x){out.push({date:x.date,time:fmtTime(x.time),type:x.type,title:String(x.title||'Sin título'),meta:String(x.meta||''),resource:x.resource||'',id:x.id||'',done:!!x.done,link:String(x.link||'')})}
  function collect(date){
    const s=appState(),out=[];if(!s)return out;
    for(const t of s.tasks||[]){const done=taskDone(t);if(t.task_date===date)push(out,{date,time:t.task_time,type:'task',title:t.title,meta:[t.status,t.priority,t.category,t.institution_name].filter(Boolean).join(' · '),resource:'tasks',id:t.id,done});if(t.deadline===date&&t.deadline!==t.task_date)push(out,{date,type:'deadline',title:`Vence: ${t.title||'Tarea'}`,meta:[t.status,t.priority,t.institution_name].filter(Boolean).join(' · '),resource:'tasks',id:t.id,done})}
    for(const e of s.events||[])if(e.event_date===date)push(out,{date,time:e.start_time,type:'event',title:e.name||'Evento',meta:[e.place,e.organizer,e.responsible_name].filter(Boolean).join(' · '),resource:'events',id:e.id});
    for(const m of s.meetings||[])if(m.meeting_date===date)push(out,{date,time:m.meeting_time,type:'meeting',title:m.subject||'Reunión',meta:[m.place,m.institutions].filter(Boolean).join(' · '),resource:'meetings',id:m.id});
    for(const n of s.notes||[])if(n.followup_date===date)push(out,{date,type:'followup',title:`Seguimiento: ${n.subject||'Nota'}`,meta:[n.status,n.recipient,n.department].filter(Boolean).join(' · '),resource:'notes',id:n.id});
    for(const p of s.projects||[]){if(p.start_date===date)push(out,{date,type:'project',title:`Inicio: ${p.name||'Proyecto'}`,meta:p.status||'',resource:'projects',id:p.id});if(p.end_date===date&&p.end_date!==p.start_date)push(out,{date,type:'project',title:`Fin previsto: ${p.name||'Proyecto'}`,meta:p.status||'',resource:'projects',id:p.id})}
    for(const o of s.opportunities||[])if(o.deadline===date)push(out,{date,type:'opportunity',title:`Cierre: ${o.title||'Oportunidad'}`,meta:[o.category,o.organization,o.status].filter(Boolean).join(' · '),resource:'opportunities',id:o.id});
    for(const g of window.SorayaGoogleSync?.items||[]){if(g.archived||g.soraya_id||g.item_date!==date)continue;const isTask=g.source==='tasks';push(out,{date,time:g.start_time,type:isTask?'google-task':'google-calendar',title:g.title||'Google',meta:isTask?(g.metadata?.tasklist_title||'Google Tasks'):[g.metadata?.calendar_name,g.location].filter(Boolean).join(' · ')||'Google Calendar',done:!!g.completed,id:g.id||g.external_id,link:g.html_link})}
    const seen=new Set();return out.filter(x=>{const k=[x.type,x.resource,x.id,x.title,x.time].join('|');if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99')||a.title.localeCompare(b.title,'es'));
  }
  function ensure(){
    if(document.getElementById('jfDayPanel'))return;
    const back=document.createElement('div');back.id='jfDayPanelBackdrop';back.setAttribute('aria-hidden','true');
    const panel=document.createElement('aside');panel.id='jfDayPanel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','jfDayPanelTitle');panel.innerHTML='<div class="jf-daypanel-head"><div><p>AGENDA DEL DÍA</p><h2 id="jfDayPanelTitle"></h2><span id="jfDayPanelSubtitle"></span></div><button type="button" class="jf-daypanel-close" aria-label="Cerrar">×</button></div><div id="jfDayPanelSummary" class="jf-daypanel-summary"></div><div id="jfDayPanelBody" class="jf-daypanel-body"></div>';
    document.body.append(back,panel);back.addEventListener('click',close);panel.querySelector('.jf-daypanel-close').addEventListener('click',close);panel.addEventListener('click',e=>{const b=e.target.closest('[data-jf-dayitem]');if(!b)return;openItem(b.dataset.jfDayitem)});
  }
  let currentItems=[];
  function renderItem(x,i){const label=LABELS[x.type]||x.type;return `<button type="button" class="jf-daypanel-item ${esc(x.type)}${x.done?' done':''}" data-jf-dayitem="${i}"><span class="jf-daypanel-time">${esc(x.time||'Todo el día')}</span><span class="jf-daypanel-copy"><strong>${esc(x.title)}</strong>${x.meta?`<small>${esc(x.meta)}</small>`:''}${x.link?'<span class="jf-daypanel-source">Abrir en Google ↗</span>':''}</span><span class="jf-daypanel-kind">${esc(label)}</span></button>`}
  function open(date){
    ensure();currentItems=collect(date);const pending=currentItems.filter(x=>!x.done).length,google=currentItems.filter(x=>x.type.startsWith('google-')).length;
    document.getElementById('jfDayPanelTitle').textContent=fmtDate(date);document.getElementById('jfDayPanelSubtitle').textContent=currentItems.length?`${currentItems.length} registro${currentItems.length===1?'':'s'} en esta fecha`:'Sin registros cargados para esta fecha';
    document.getElementById('jfDayPanelSummary').innerHTML=`<div><strong>${currentItems.length}</strong><span>Total</span></div><div><strong>${pending}</strong><span>Pendientes/activos</span></div><div><strong>${google}</strong><span>Desde Google</span></div>`;
    const groups=new Map();for(const x of currentItems){const k=LABELS[x.type]||x.type;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x)}
    document.getElementById('jfDayPanelBody').innerHTML=currentItems.length?[...groups].map(([label,rows])=>`<section class="jf-daypanel-group"><h3>${esc(label)}</h3>${rows.map(x=>renderItem(x,currentItems.indexOf(x))).join('')}</section>`).join(''):'<div class="jf-daypanel-empty"><strong>No hay actividades registradas</strong><br><small>Podés crear una tarea, reunión o evento desde ＋ Agregar.</small></div>';
    document.getElementById('jfDayPanelBackdrop').classList.add('show');document.getElementById('jfDayPanel').classList.add('show');document.body.style.overflow='hidden';setTimeout(()=>document.querySelector('.jf-daypanel-close')?.focus(),40);
  }
  function close(){document.getElementById('jfDayPanelBackdrop')?.classList.remove('show');document.getElementById('jfDayPanel')?.classList.remove('show');document.body.style.overflow=''}
  function openItem(index){const x=currentItems[Number(index)];if(!x)return;if(x.link&&/^https:\/\//.test(x.link)){window.open(x.link,'_blank','noopener');return}close();if(x.resource&&x.id&&typeof window.openDetails==='function')window.openDetails(x.resource,x.id)}
  function monthYear(){const txt=String(document.getElementById('jfCalSafeRange')?.textContent||document.getElementById('monthTitle')?.textContent||'').toLowerCase();const y=Number(txt.match(/20\d{2}/)?.[0]||new Date().getFullYear());const m=MONTHS.findIndex(x=>txt.includes(x));return{y,m:m>=0?m:new Date().getMonth()}}
  function dateFromMonthCell(cell){const cells=[...document.querySelectorAll('#sorayaCalendarEnhancedLayer .jf-cal-safe-day')],i=cells.indexOf(cell);if(i<0)return'';const {y,m}=monthYear(),first=new Date(y,m,1,12),start=(first.getDay()+6)%7,d=new Date(y,m,1-start+i,12);return iso(d.getFullYear(),d.getMonth(),d.getDate())}
  function dateFromAgenda(el){const num=Number(el.querySelector('.jf-cal-safe-date strong')?.textContent||el.querySelector('header strong')?.textContent||0);const monTxt=String(el.querySelector('.jf-cal-safe-date small')?.textContent||el.querySelector('header small')?.textContent||'').toLowerCase().replace('.','');const y=monthYear().y;const key=Object.keys(MONTH_SHORT).find(k=>monTxt.startsWith(k));if(!num||!key)return'';return iso(y,MONTH_SHORT[key],num)}
  function decorateDays(){document.querySelectorAll('.jf-cal-safe-day').forEach(el=>{if(!el.hasAttribute('tabindex'))el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label','Abrir agenda completa de este día')})}
  document.addEventListener('click',e=>{
    if(!document.getElementById('view-calendar')?.classList.contains('active'))return;
    const day=e.target.closest('.jf-cal-safe-day');if(day){if(e.target.closest('[data-cal-safe-entry]'))return;const date=dateFromMonthCell(day);if(date){e.preventDefault();e.stopPropagation();open(date)}return}
    const agenda=e.target.closest('.jf-cal-safe-agenda-day,.jf-cal-safe-weekcol');if(agenda&&!e.target.closest('[data-cal-safe-entry]')){const date=dateFromAgenda(agenda);if(date)open(date)}
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();if((e.key==='Enter'||e.key===' ')&&e.target.classList?.contains('jf-cal-safe-day')){e.preventDefault();const date=dateFromMonthCell(e.target);if(date)open(date)}});
  const observer=new MutationObserver(()=>decorateDays());setTimeout(()=>{ensure();decorateDays();const layer=document.getElementById('sorayaCalendarEnhancedLayer');if(layer)observer.observe(layer,{childList:true,subtree:true})},1200);
  window.SorayaCalendarDayPanel={open,close};
})();