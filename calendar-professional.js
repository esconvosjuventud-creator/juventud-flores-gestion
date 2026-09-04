(function installSorayaCalendarProfessional(){
  'use strict';
  if(window.__SORAYA_CALENDAR_PRO__)return;window.__SORAYA_CALENDAR_PRO__=true;
  const root=()=>document.getElementById('view-calendar'),grid=()=>document.getElementById('calendarGrid');
  const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  const monthNames=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  let mode=(matchMedia?.('(max-width:760px)')?.matches?'agenda':'month'),filter='all',query='',busy=false;
  try{mode=localStorage.getItem('soraya_calendar_mode_v1')||mode}catch{}
  function S(){try{return state}catch{return null}}
  function isoDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function todayIso(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Montevideo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
  function fmtDay(iso){const d=new Date(iso+'T12:00:00');return{day:String(d.getDate()),weekday:new Intl.DateTimeFormat('es-UY',{weekday:'short'}).format(d).replace('.',''),long:new Intl.DateTimeFormat('es-UY',{weekday:'long',day:'numeric',month:'long'}).format(d)}}
  function mstate(){const s=S();if(s?.month instanceof Date&&!Number.isNaN(s.month.getTime()))return{s,y:s.month.getFullYear(),m:s.month.getMonth(),date:s.month};const txt=String(document.getElementById('monthTitle')?.textContent||'').toLowerCase(),y=Number(txt.match(/20\d{2}/)?.[0]||new Date().getFullYear()),m=Math.max(0,monthNames.findIndex(x=>txt.includes(x)));return{s,y,m,date:new Date(y,m,1)}}
  function inMonth(date,y,m){return date&&date.startsWith(`${y}-${String(m+1).padStart(2,'0')}-`)}
  function add(list,e){if(e.date)list.push(e)}
  function entries(){
    const {s,y,m}=mstate(),out=[];if(!s)return out;
    for(const t of s.tasks||[]){
      if(t.task_date)add(out,{date:t.task_date,time:t.task_time||'',kind:'task',icon:'✓',title:t.title||'Tarea',meta:[t.status,t.priority].filter(Boolean).join(' · '),resource:'tasks',id:t.id,done:['Realizada','Cancelada'].includes(t.status)});
      if(t.deadline&&t.deadline!==t.task_date)add(out,{date:t.deadline,time:'',kind:'deadline',icon:'!',title:`Vence: ${t.title||'Tarea'}`,meta:[t.status,t.priority].filter(Boolean).join(' · '),resource:'tasks',id:t.id,done:['Realizada','Cancelada'].includes(t.status)});
    }
    for(const e of s.events||[])add(out,{date:e.event_date,time:e.start_time||'',kind:'event',icon:'●',title:e.name||'Evento',meta:[e.place,e.organizer].filter(Boolean).join(' · '),resource:'events',id:e.id});
    for(const x of s.meetings||[])add(out,{date:x.meeting_date,time:x.meeting_time||'',kind:'meeting',icon:'◆',title:x.subject||'Reunión',meta:[x.place,x.institutions].filter(Boolean).join(' · '),resource:'meetings',id:x.id});
    for(const n of s.notes||[])if(n.followup_date)add(out,{date:n.followup_date,time:'',kind:'followup',icon:'↗',title:`Seguimiento: ${n.subject||'Nota'}`,meta:[n.status,n.recipient].filter(Boolean).join(' · '),resource:'notes',id:n.id});
    const g=window.SorayaGoogleSync?.items||[];
    for(const x of g){if(x.archived||x.completed||x.soraya_id)continue;add(out,{date:x.item_date,time:x.start_time||'',kind:'google',icon:x.source==='tasks'?'G✓':'G',title:x.title||'Google',meta:x.source==='tasks'?(x.metadata?.tasklist_title||'Google Tasks'):(x.metadata?.calendar_name||'Google Calendar'),google:true,link:x.html_link||'',source:x.source})}
    return out.filter(x=>inMonth(x.date,y,m)).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99:99').localeCompare(b.time||'99:99')||a.title.localeCompare(b.title,'es'));
  }
  function filtered(all){const q=query.trim().toLowerCase();return all.filter(x=>{if(filter!=='all'&&x.kind!==filter&&!(filter==='task'&&x.kind==='deadline'))return false;if(q&&!`${x.title} ${x.meta}`.toLowerCase().includes(q))return false;return true})}
  function typeLabel(x){return x.kind==='task'?'Tarea':x.kind==='deadline'?'Vencimiento':x.kind==='event'?'Evento':x.kind==='meeting'?'Reunión':x.kind==='followup'?'Seguimiento':x.source==='tasks'?'Google Tasks':'Google Calendar'}
  function openEntry(x){if(!x)return;if(x.google){if(x.link&&String(x.link).startsWith('https://'))window.open(x.link,'_blank','noopener');return}if(x.resource&&x.id&&window.openDetails)window.openDetails(x.resource,x.id)}
  function ensureShell(){
    const v=root(),g=grid();if(!v||!g)return null;
    let tb=document.getElementById('jfCalToolbar');
    if(!tb){tb=document.createElement('div');tb.id='jfCalToolbar';tb.className='jf-cal-toolbar';tb.innerHTML=`<div class="jf-cal-toolbar-left"><div class="jf-cal-segment" aria-label="Vista del calendario"><button type="button" data-cal-mode="month">Mes</button><button type="button" data-cal-mode="agenda">Agenda</button></div><button type="button" class="jf-cal-today" data-cal-today>Hoy</button></div><div class="jf-cal-toolbar-right"><input class="jf-cal-search" id="jfCalSearch" placeholder="Buscar en este mes…"><div class="jf-cal-filters"><button class="jf-cal-filter" data-cal-filter="all">Todo</button><button class="jf-cal-filter" data-cal-filter="task">Tareas</button><button class="jf-cal-filter" data-cal-filter="event">Eventos</button><button class="jf-cal-filter" data-cal-filter="meeting">Reuniones</button><button class="jf-cal-filter" data-cal-filter="followup">Seguimientos</button><button class="jf-cal-filter" data-cal-filter="google">Google</button></div></div>`;g.insertAdjacentElement('beforebegin',tb);
      const note=document.createElement('p');note.className='jf-cal-mobile-note';note.id='jfCalMobileNote';note.textContent='En celular, la vista Agenda muestra todas las actividades. La vista Mes puede desplazarse horizontalmente.';tb.insertAdjacentElement('afterend',note);
      const sum=document.createElement('div');sum.id='jfCalSummary';sum.className='jf-cal-summary';note.insertAdjacentElement('afterend',sum);
      const wrap=document.createElement('div');wrap.className='jf-calendar-wrap';g.parentNode.insertBefore(wrap,g);wrap.appendChild(g);
      const ag=document.createElement('div');ag.id='jfCalAgenda';ag.className='jf-cal-agenda';wrap.insertAdjacentElement('afterend',ag);
      tb.addEventListener('click',e=>{const m=e.target.closest('[data-cal-mode]'),f=e.target.closest('[data-cal-filter]'),today=e.target.closest('[data-cal-today]');if(m){mode=m.dataset.calMode;try{localStorage.setItem('soraya_calendar_mode_v1',mode)}catch{};render()}if(f){filter=f.dataset.calFilter;render()}if(today){const st=S();if(st)st.month=new Date();try{window.renderCalendar?.()}catch{};setTimeout(render,20)}});
      tb.querySelector('#jfCalSearch').addEventListener('input',e=>{query=e.target.value;render()});
    }
    return tb;
  }
  function renderSummary(all){const f=filtered(all),el=document.getElementById('jfCalSummary');if(!el)return;const task=f.filter(x=>x.kind==='task'||x.kind==='deadline').length,event=f.filter(x=>x.kind==='event').length,meeting=f.filter(x=>x.kind==='meeting').length,google=f.filter(x=>x.kind==='google').length;el.innerHTML=`<div class="jf-cal-kpi"><strong>${f.length}</strong><span>elementos visibles</span></div><div class="jf-cal-kpi"><strong>${task}</strong><span>tareas / vencimientos</span></div><div class="jf-cal-kpi"><strong>${event}</strong><span>eventos</span></div><div class="jf-cal-kpi"><strong>${meeting}</strong><span>reuniones</span></div><div class="jf-cal-kpi"><strong>${google}</strong><span>Google</span></div>`}
  function itemButton(x){return `<button type="button" class="jf-cal-entry ${esc(x.kind)} ${x.done?'done':''}" data-cal-key="${esc(keyOf(x))}">${x.time?`<small>${esc(String(x.time).slice(0,5))}</small>`:''}${esc(x.title)}</button>`}
  function keyOf(x){return `${x.kind}|${x.resource||x.source||'g'}|${x.id||x.date+'|'+x.title+'|'+x.time}`}
  function renderMonth(all){
    const g=grid();if(!g)return;const {y,m}=mstate(),list=filtered(all),map=new Map();for(const x of list){if(!map.has(x.date))map.set(x.date,[]);map.get(x.date).push(x)}const first=new Date(y,m,1),start=(first.getDay()+6)%7,today=todayIso();let html=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(x=>`<div class="cal-head">${x}</div>`).join('');for(let i=0;i<42;i++){const d=new Date(y,m,1-start+i),iso=isoDate(d),rows=map.get(iso)||[];html+=`<div class="cal-day ${d.getMonth()!==m?'other':''}" data-cal-date="${iso}"><div class="jf-cal-dayhead"><div class="cal-num ${iso===today?'today':''}">${d.getDate()}</div>${rows.length?`<span class="jf-cal-count">${rows.length}</span>`:''}</div><div class="jf-cal-items">${rows.map(itemButton).join('')}</div></div>`}g.className='calendar jf-calendar-pro-grid';g.innerHTML=html;g.classList.toggle('jf-cal-month-hidden',mode!=='month')
  }
  function renderAgenda(all){const el=document.getElementById('jfCalAgenda');if(!el)return;const list=filtered(all),groups=new Map();for(const x of list){if(!groups.has(x.date))groups.set(x.date,[]);groups.get(x.date).push(x)}if(!list.length){el.innerHTML='<div class="jf-cal-empty">No hay actividades que coincidan con los filtros para este mes.</div>'}else el.innerHTML=[...groups.entries()].map(([date,rows])=>{const d=fmtDay(date);return `<section class="jf-cal-daygroup"><div class="jf-cal-datebox"><strong>${esc(d.day)}</strong><span>${esc(d.weekday)}</span></div><div class="jf-cal-agenda-items" aria-label="${esc(d.long)}">${rows.map(x=>`<button type="button" class="jf-cal-agenda-row" data-cal-key="${esc(keyOf(x))}"><span class="jf-cal-time">${x.time?esc(String(x.time).slice(0,5)):'Todo el día'}</span><span class="jf-cal-icon">${esc(x.icon)}</span><span class="jf-cal-copy"><strong>${esc(x.title)}</strong><small>${esc(x.meta||typeLabel(x))}</small></span><span class="jf-cal-type">${esc(typeLabel(x))}</span></button>`).join('')}</div></section>`}).join('');el.classList.toggle('active',mode==='agenda')}
  function syncControls(){document.querySelectorAll('[data-cal-mode]').forEach(b=>b.classList.toggle('active',b.dataset.calMode===mode));document.querySelectorAll('[data-cal-filter]').forEach(b=>b.classList.toggle('active',b.dataset.calFilter===filter));const g=grid();if(g)g.classList.toggle('jf-cal-month-hidden',mode!=='month');document.getElementById('jfCalAgenda')?.classList.toggle('active',mode==='agenda')}
  function bindRows(all){const map=new Map(all.map(x=>[keyOf(x),x]));root()?.querySelectorAll('[data-cal-key]').forEach(b=>b.addEventListener('click',()=>openEntry(map.get(b.dataset.calKey))))}
  function render(){if(busy)return;const v=root(),g=grid();if(!v||!g)return;busy=true;try{ensureShell();const all=entries();renderSummary(all);renderMonth(all);renderAgenda(all);syncControls();bindRows(all)}finally{busy=false}}
  const core=window.renderCalendar;if(typeof core==='function'){window.renderCalendar=function(){const r=core.apply(this,arguments);setTimeout(render,0);return r}}
  document.getElementById('prevMonth')?.addEventListener('click',()=>setTimeout(render,30));document.getElementById('nextMonth')?.addEventListener('click',()=>setTimeout(render,30));document.querySelector('#mainNav [data-view="calendar"]')?.addEventListener('click',()=>setTimeout(render,80));
  window.addEventListener('jf:state-updated',()=>setTimeout(render,60));window.addEventListener('jf:data-changed',()=>setTimeout(render,80));window.addEventListener('hashchange',()=>{if(location.hash.includes('/calendar'))setTimeout(render,80)});
  setInterval(()=>{if(root()?.classList.contains('active'))render()},30000);
  setTimeout(render,900);setTimeout(render,2200);
  window.SorayaCalendar={render,setMode:m=>{mode=m;render()},setFilter:f=>{filter=f;render()}};
})();
