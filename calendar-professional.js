(function installSorayaCalendarProfessional(){
  'use strict';
  if(window.__SORAYA_CALENDAR_PRO_V3__) return;
  window.__SORAYA_CALENDAR_PRO_V3__=true;

  const C=window.JF_CONFIG||{};
  const db=window.JF_DB||(window.supabase&&C.supabaseUrl&&C.supabasePublishableKey
    ? window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
    : null);

  const TYPE_ORDER=['task','activity','workshop','deadline','meeting','event','followup','reminder','google-calendar','google-task'];
  const TYPE_LABEL={
    task:'Tarea',activity:'Actividad',workshop:'Taller',deadline:'Vencimiento',meeting:'Reunión',event:'Evento',
    followup:'Seguimiento',reminder:'Recordatorio','google-calendar':'Google Calendar','google-task':'Google Tasks'
  };
  const TYPE_ICON={
    task:'✓',activity:'●',workshop:'✦',deadline:'!',meeting:'◆',event:'●',followup:'↗',reminder:'◷','google-calendar':'G','google-task':'G✓'
  };
  const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const PRIORITIES=['Urgente','Alta','Media','Baja'];

  let mode=window.matchMedia?.('(max-width:760px)')?.matches?'agenda':'month';
  let anchor=new Date();
  let query='';
  let selectedType='';
  let selectedResponsible='';
  let selectedPriority='';
  let selectedInstitution='';
  let profiles=new Map();
  let taskAssignments=new Map();
  let supplementalLoaded=false;
  let renderTimer=null;
  let selectedDay='';

  try{mode=localStorage.getItem('soraya_calendar_mode_v3')||mode}catch{}
  if(!['month','week','agenda'].includes(mode)) mode='month';

  function S(){try{return state}catch{return null}}
  function root(){return document.getElementById('view-calendar')}
  function grid(){return document.getElementById('calendarGrid')}
  function $(id){return document.getElementById(id)}
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]||s))}
  function pad(n){return String(n).padStart(2,'0')}
  function isoDate(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
  function parseIso(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||'')))return null;const [y,m,d]=String(v).split('-').map(Number);return new Date(y,m-1,d,12,0,0)}
  function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);x.setHours(12,0,0,0);return x}
  function startOfWeek(d){const x=new Date(d),delta=(x.getDay()+6)%7;x.setDate(x.getDate()-delta);x.setHours(12,0,0,0);return x}
  function todayIso(){return new Intl.DateTimeFormat('en-CA',{timeZone:C.timezone||'America/Montevideo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
  function fmtTime(v){return v?String(v).slice(0,5):''}
  function fmtDayLong(v){const d=typeof v==='string'?parseIso(v):v;return d?new Intl.DateTimeFormat('es-UY',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d):''}
  function fmtDayShort(v){const d=typeof v==='string'?parseIso(v):v;return d?new Intl.DateTimeFormat('es-UY',{day:'numeric',month:'short'}).format(d).replace('.',''):''}
  function monthState(){
    const s=S();
    if(s?.month instanceof Date&&!Number.isNaN(s.month.getTime())) return new Date(s.month.getFullYear(),s.month.getMonth(),1,12);
    const txt=String($('monthTitle')?.textContent||'').toLowerCase();
    const y=Number(txt.match(/20\d{2}/)?.[0]||new Date().getFullYear());
    const mi=MONTHS.findIndex(x=>txt.includes(x));
    return new Date(y,mi<0?new Date().getMonth():mi,1,12);
  }
  function setBaseMonth(d){const s=S();if(s)s.month=new Date(d.getFullYear(),d.getMonth(),1);const title=$('monthTitle');if(title)title.textContent=new Intl.DateTimeFormat('es-UY',{month:'long',year:'numeric'}).format(d)}
  function canWrite(){const p=S()?.profile;return !!p?.active&&['admin','equipo'].includes(p.role)}
  function toast(msg){const n=$('toast');if(!n)return;n.textContent=msg;n.classList.add('show');clearTimeout(window.__sorayaCalToast);window.__sorayaCalToast=setTimeout(()=>n.classList.remove('show'),2700)}

  function normalizeText(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
  function splitInstitutions(v){return String(v||'').split(/[,;|]+/).map(x=>x.trim()).filter(Boolean)}
  function nameForId(id){return id?profiles.get(String(id))||'':''}
  function assignmentNames(taskId){return taskAssignments.get(String(taskId))||[]}
  function uniq(xs){return [...new Set((xs||[]).map(x=>String(x||'').trim()).filter(Boolean))]}

  async function loadSupplemental(){
    if(!db||supplementalLoaded)return;
    supplementalLoaded=true;
    try{
      const [pr,ta]=await Promise.all([
        db.from('profiles').select('id,full_name,active').eq('active',true),
        db.from('task_assignments').select('task_id,user_id,status')
      ]);
      if(!pr.error) profiles=new Map((pr.data||[]).map(x=>[String(x.id),String(x.full_name||'')]));
      if(!ta.error){
        const m=new Map();
        for(const x of ta.data||[]){const k=String(x.task_id),n=nameForId(x.user_id);if(!n)continue;if(!m.has(k))m.set(k,[]);m.get(k).push(n)}
        taskAssignments=new Map([...m].map(([k,v])=>[k,uniq(v)]));
      }
    }catch(e){console.warn('[Soraya Calendar] datos complementarios',e)}
  }

  function groupForTask(t){
    const c=normalizeText(t.category);
    if(c.includes('taller'))return'workshop';
    if(c.includes('actividad')||c.includes('capacitacion'))return'activity';
    return'task';
  }
  function isTaskDone(t){return['Realizada','Cancelada'].includes(String(t.status||''))}
  function taskResponsibles(t){return uniq([nameForId(t.responsible_id),...assignmentNames(t.id)])}
  function reminderEntry(t){
    const label=String(t.reminder||'').trim();if(!label)return null;
    const base=t.task_date||t.deadline;if(!base)return null;
    let d=parseIso(base),time=fmtTime(t.task_time||'');if(!d)return null;
    const days=label.match(/^(\d+) día/i);
    if(days)d=addDays(d,-Number(days[1]));
    else if(/^2 horas antes$/i.test(label)&&time){let [h,m]=time.split(':').map(Number),mins=h*60+m-120;if(mins<0){d=addDays(d,-1);mins+=1440}time=`${pad(Math.floor(mins/60))}:${pad(mins%60)}`}
    return makeEntry({date:isoDate(d),time,type:'reminder',title:`Recordatorio: ${t.title||'Tarea'}`,meta:label,resource:'tasks',id:t.id,done:isTaskDone(t),priority:t.priority,responsibles:taskResponsibles(t),institutions:splitInstitutions(t.institution_name)});
  }
  function makeEntry(x){return{
    date:String(x.date||''),time:fmtTime(x.time||''),type:x.type||'task',icon:TYPE_ICON[x.type]||'•',title:String(x.title||'Sin título'),meta:String(x.meta||''),
    resource:x.resource||'',id:x.id||'',google:!!x.google,source:x.source||'',link:x.link||'',done:!!x.done,priority:String(x.priority||''),
    responsibles:uniq(x.responsibles),institutions:uniq(x.institutions),field:x.field||'',timeField:x.timeField||'',readOnlyDate:!!x.readOnlyDate
  }}

  function entriesAll(){
    const s=S(),out=[];if(!s)return out;
    for(const t of s.tasks||[]){
      const type=groupForTask(t),responsibles=taskResponsibles(t),institutions=splitInstitutions(t.institution_name),done=isTaskDone(t);
      if(t.task_date)out.push(makeEntry({date:t.task_date,time:t.task_time,type,title:t.title||'Tarea',meta:[t.category,t.status,t.priority,t.institution_name].filter(Boolean).join(' · '),resource:'tasks',id:t.id,done,priority:t.priority,responsibles,institutions,field:'task_date',timeField:'task_time'}));
      if(t.deadline&&t.deadline!==t.task_date)out.push(makeEntry({date:t.deadline,type:'deadline',title:`Vence: ${t.title||'Tarea'}`,meta:[t.status,t.priority,t.institution_name].filter(Boolean).join(' · '),resource:'tasks',id:t.id,done,priority:t.priority,responsibles,institutions,field:'deadline'}));
      if(t.followup_date&&t.followup_date!==t.task_date&&t.followup_date!==t.deadline)out.push(makeEntry({date:t.followup_date,type:'followup',title:`Seguimiento: ${t.title||'Tarea'}`,meta:[t.status,t.next_action,t.institution_name].filter(Boolean).join(' · '),resource:'tasks',id:t.id,done,priority:t.priority,responsibles,institutions,field:'followup_date'}));
      const r=reminderEntry(t);if(r)out.push(r);
    }
    for(const e of s.events||[]){
      if(!e.event_date)continue;
      const rn=uniq([e.responsible_name,nameForId(e.responsible_id)]),ins=uniq([...splitInstitutions(e.organizer),...splitInstitutions(e.collaborators)]);
      out.push(makeEntry({date:e.event_date,time:e.start_time,type:'event',title:e.name||'Evento',meta:[e.place,e.organizer,e.responsible_name].filter(Boolean).join(' · '),resource:'events',id:e.id,responsibles:rn,institutions:ins,field:'event_date',timeField:'start_time'}));
    }
    for(const m of s.meetings||[]){
      if(!m.meeting_date)continue;
      const rn=uniq([nameForId(m.created_by)]),ins=splitInstitutions(m.institutions);
      out.push(makeEntry({date:m.meeting_date,time:m.meeting_time,type:'meeting',title:m.subject||'Reunión',meta:[m.place,m.institutions].filter(Boolean).join(' · '),resource:'meetings',id:m.id,responsibles:rn,institutions:ins,field:'meeting_date',timeField:'meeting_time'}));
    }
    for(const n of s.notes||[]){
      if(!n.followup_date)continue;
      const rn=uniq([n.responsible_name,nameForId(n.responsible_id)]),ins=uniq([...splitInstitutions(n.recipient),...splitInstitutions(n.department)]);
      out.push(makeEntry({date:n.followup_date,type:'followup',title:`Seguimiento: ${n.subject||'Nota'}`,meta:[n.status,n.recipient,n.department].filter(Boolean).join(' · '),resource:'notes',id:n.id,responsibles:rn,institutions:ins,field:'followup_date'}));
    }
    for(const g of window.SorayaGoogleSync?.items||[]){
      if(g.archived||!g.item_date||g.soraya_id)continue;
      const isTask=g.source==='tasks';
      out.push(makeEntry({date:g.item_date,time:g.start_time,type:isTask?'google-task':'google-calendar',title:g.title||'Google',meta:isTask?(g.metadata?.tasklist_title||'Google Tasks'):[g.metadata?.calendar_name,g.location].filter(Boolean).join(' · ')||'Google Calendar',google:true,source:g.source,id:g.id||g.external_id,link:g.html_link,done:!!g.completed,readOnlyDate:true}));
    }
    return out.sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99:99').localeCompare(b.time||'99:99')||a.title.localeCompare(b.title,'es'));
  }

  function entryKey(x){return `${x.type}|${x.resource||x.source||'google'}|${x.id}|${x.date}|${x.field||''}`}
  function currentMonth(){
    if(mode==='month'||mode==='agenda'){
      const m=monthState();
      if(anchor.getFullYear()!==m.getFullYear()||anchor.getMonth()!==m.getMonth())anchor=new Date(m.getFullYear(),m.getMonth(),1,12);
    }
    return new Date(anchor.getFullYear(),anchor.getMonth(),1,12);
  }
  function visibleRange(){
    if(mode==='week'){
      const st=startOfWeek(anchor),en=addDays(st,6);return{start:isoDate(st),end:isoDate(en),days:Array.from({length:7},(_,i)=>addDays(st,i))};
    }
    const m=currentMonth(),en=new Date(m.getFullYear(),m.getMonth()+1,0,12);return{start:isoDate(m),end:isoDate(en),days:[]};
  }
  function matchesFilter(x){
    const q=normalizeText(query);
    if(selectedType&&x.type!==selectedType)return false;
    if(selectedPriority&&x.priority!==selectedPriority)return false;
    if(selectedResponsible&&!x.responsibles.some(r=>normalizeText(r)===normalizeText(selectedResponsible)))return false;
    if(selectedInstitution&&!x.institutions.some(i=>normalizeText(i)===normalizeText(selectedInstitution)))return false;
    if(q&&!normalizeText([x.title,x.meta,x.priority,...x.responsibles,...x.institutions,TYPE_LABEL[x.type]].join(' ')).includes(q))return false;
    return true;
  }
  function filteredEntries(all=entriesAll()){const r=visibleRange();return all.filter(x=>x.date>=r.start&&x.date<=r.end&&matchesFilter(x))}
  function entriesForDay(date,applyFilters=true){return entriesAll().filter(x=>x.date===date&&(!applyFilters||matchesFilter(x)))}

  function buildOptions(all){
    const responsible=uniq(all.flatMap(x=>x.responsibles)).sort((a,b)=>a.localeCompare(b,'es'));
    const institution=uniq(all.flatMap(x=>x.institutions)).sort((a,b)=>a.localeCompare(b,'es'));
    const rSel=$('jfCalResponsible'),iSel=$('jfCalInstitution');
    if(rSel){const current=selectedResponsible;rSel.innerHTML='<option value="">Todos los responsables</option>'+responsible.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');rSel.value=responsible.includes(current)?current:'';if(!rSel.value)selectedResponsible=''}
    if(iSel){const current=selectedInstitution;iSel.innerHTML='<option value="">Todas las instituciones</option>'+institution.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');iSel.value=institution.includes(current)?current:'';if(!iSel.value)selectedInstitution=''}
  }

  function ensureShell(){
    const v=root(),g=grid();if(!v||!g)return false;
    v.classList.add('jf-cal-v3-mounted');
    if(!$('jfCalToolbar')){
      const tb=document.createElement('section');tb.id='jfCalToolbar';tb.className='jf-cal3-toolbar';
      tb.innerHTML=`
        <div class="jf-cal3-top">
          <div class="jf-cal3-nav"><button type="button" data-cal-prev aria-label="Anterior">←</button><strong id="jfCalRangeLabel"></strong><button type="button" data-cal-next aria-label="Siguiente">→</button></div>
          <button type="button" class="jf-cal3-today" data-cal-today>Hoy</button>
          <div class="jf-cal3-segment" aria-label="Vista"><button data-cal-mode="month" type="button">Mes</button><button data-cal-mode="week" type="button">Semana</button><button data-cal-mode="agenda" type="button">Agenda</button></div>
        </div>
        <div class="jf-cal3-filters">
          <input id="jfCalSearch" type="search" placeholder="Buscar en calendario…" aria-label="Buscar en calendario">
          <select id="jfCalType" aria-label="Filtrar por tipo"><option value="">Todos los tipos</option>${TYPE_ORDER.map(t=>`<option value="${t}">${TYPE_LABEL[t]}</option>`).join('')}</select>
          <select id="jfCalResponsible" aria-label="Filtrar por responsable"><option value="">Todos los responsables</option></select>
          <select id="jfCalPriority" aria-label="Filtrar por prioridad"><option value="">Todas las prioridades</option>${PRIORITIES.map(p=>`<option>${p}</option>`).join('')}</select>
          <select id="jfCalInstitution" aria-label="Filtrar por institución"><option value="">Todas las instituciones</option></select>
          <button type="button" class="jf-cal3-clear" data-cal-clear>Limpiar</button>
        </div>`;
      g.insertAdjacentElement('beforebegin',tb);
      const summary=document.createElement('div');summary.id='jfCalSummary';summary.className='jf-cal3-summary';tb.insertAdjacentElement('afterend',summary);
      const legend=document.createElement('div');legend.id='jfCalLegend';legend.className='jf-cal3-legend';summary.insertAdjacentElement('afterend',legend);
      const wrap=document.createElement('div');wrap.className='jf-cal3-wrap';g.parentNode.insertBefore(wrap,g);wrap.appendChild(g);
      const alt=document.createElement('div');alt.id='jfCalAlt';alt.className='jf-cal3-alt';wrap.insertAdjacentElement('afterend',alt);

      tb.addEventListener('click',e=>{
        const m=e.target.closest('[data-cal-mode]');
        if(m){mode=m.dataset.calMode;try{localStorage.setItem('soraya_calendar_mode_v3',mode)}catch{};if(mode!=='week')setBaseMonth(anchor);render();return}
        if(e.target.closest('[data-cal-prev]'))navigate(-1);
        if(e.target.closest('[data-cal-next]'))navigate(1);
        if(e.target.closest('[data-cal-today]'))goToday();
        if(e.target.closest('[data-cal-clear]'))clearFilters();
      });
      $('jfCalSearch').addEventListener('input',e=>{query=e.target.value||'';scheduleRender()});
      $('jfCalType').addEventListener('change',e=>{selectedType=e.target.value;render()});
      $('jfCalResponsible').addEventListener('change',e=>{selectedResponsible=e.target.value;render()});
      $('jfCalPriority').addEventListener('change',e=>{selectedPriority=e.target.value;render()});
      $('jfCalInstitution').addEventListener('change',e=>{selectedInstitution=e.target.value;render()});
    }
    ensureDayPanel();
    return true;
  }

  function ensureDayPanel(){
    if($('jfCalDayBackdrop'))return;
    const back=document.createElement('div');back.id='jfCalDayBackdrop';back.className='jf-cal3-day-backdrop';
    back.innerHTML=`<aside class="jf-cal3-day-panel" role="dialog" aria-modal="true" aria-labelledby="jfCalDayTitle"><div class="jf-cal3-day-head"><div><p>AGENDA DEL DÍA</p><h2 id="jfCalDayTitle"></h2><span id="jfCalDayCount"></span></div><button type="button" data-cal-day-close aria-label="Cerrar">×</button></div><div id="jfCalDayItems" class="jf-cal3-day-items"></div></aside>`;
    document.body.appendChild(back);
    back.addEventListener('click',e=>{if(e.target===back||e.target.closest('[data-cal-day-close]'))closeDayPanel();const entry=e.target.closest('[data-cal-entry-key]');if(entry)openEntryByKey(entry.dataset.calEntryKey)});
  }
  function openDayPanel(date){
    selectedDay=date;const rows=entriesForDay(date,false),back=$('jfCalDayBackdrop');if(!back)return;
    $('jfCalDayTitle').textContent=fmtDayLong(date);$('jfCalDayCount').textContent=`${rows.length} ${rows.length===1?'actividad':'actividades'} en total`;
    $('jfCalDayItems').innerHTML=rows.length?rows.map(detailCard).join(''):'<div class="jf-cal3-empty">No hay actividades registradas para este día.</div>';
    back.classList.add('show');document.body.classList.add('jf-cal3-panel-open');
  }
  function closeDayPanel(){selectedDay='';$('jfCalDayBackdrop')?.classList.remove('show');document.body.classList.remove('jf-cal3-panel-open')}

  function openEntryByKey(key){const x=new Map(entriesAll().map(e=>[entryKey(e),e])).get(key);if(!x)return;if(x.google){if(x.link&&String(x.link).startsWith('https://'))window.open(x.link,'_blank','noopener');return}if(x.resource&&x.id)window.openDetails?.(x.resource,x.id)}
  function entryButton(x){return `<button type="button" class="jf-cal3-entry ${esc(x.type)} ${x.done?'done':''}" data-cal-entry-key="${esc(entryKey(x))}" title="${esc(x.title)}"><small>${x.time?esc(x.time):'Todo el día'} · ${esc(TYPE_LABEL[x.type]||x.type)}</small><span>${esc(x.title)}</span></button>`}
  function detailCard(x){
    const meta=[x.meta,x.responsibles.length?`Responsable: ${x.responsibles.join(', ')}`:'',x.institutions.length?`Institución: ${x.institutions.join(', ')}`:''].filter(Boolean).join(' · ');
    return `<button type="button" class="jf-cal3-detail ${esc(x.type)} ${x.done?'done':''}" data-cal-entry-key="${esc(entryKey(x))}"><span class="jf-cal3-detail-time">${x.time?esc(x.time):'—'}</span><span class="jf-cal3-detail-main"><b><i>${esc(x.icon)}</i>${esc(x.title)}</b><small>${esc(meta||TYPE_LABEL[x.type])}</small></span><span class="jf-cal3-type ${esc(x.type)}">${esc(TYPE_LABEL[x.type])}</span></button>`;
  }

  function renderSummary(rows){
    const el=$('jfCalSummary');if(!el)return;
    const soraya=rows.filter(x=>!x.google).length,google=rows.filter(x=>x.google).length,urgent=rows.filter(x=>x.priority==='Urgente'&&!x.done).length;
    el.innerHTML=`<div><strong>${rows.length}</strong><span>Total visible</span></div><div><strong>${soraya}</strong><span>Soraya</span></div><div><strong>${google}</strong><span>Google</span></div><div class="${urgent?'alert':''}"><strong>${urgent}</strong><span>Urgentes</span></div>`;
  }
  function renderLegend(){const el=$('jfCalLegend');if(el)el.innerHTML=TYPE_ORDER.map(t=>`<span class="${t}"><i></i>${TYPE_LABEL[t]}</span>`).join('')}
  function renderModeButtons(){document.querySelectorAll('[data-cal-mode]').forEach(b=>b.classList.toggle('active',b.dataset.calMode===mode))}
  function renderRangeLabel(){
    const el=$('jfCalRangeLabel');if(!el)return;
    if(mode==='week'){
      const st=startOfWeek(anchor),en=addDays(st,6);el.textContent=`${fmtDayShort(st)} – ${fmtDayShort(en)} ${en.getFullYear()}`;
    }else el.textContent=new Intl.DateTimeFormat('es-UY',{month:'long',year:'numeric'}).format(currentMonth());
  }

  function renderMonth(rows){
    const g=grid(),alt=$('jfCalAlt');if(!g)return;
    g.style.display='grid';alt.style.display='none';g.className='calendar jf-cal3-month';
    const m=currentMonth(),y=m.getFullYear(),mo=m.getMonth(),first=new Date(y,mo,1,12),start=(first.getDay()+6)%7;
    let html=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(x=>`<div class="cal-head">${x}</div>`).join('');
    const today=todayIso();
    for(let i=0;i<42;i++){
      const d=new Date(y,mo,1-start+i,12),iso=isoDate(d),dayRows=rows.filter(x=>x.date===iso);
      html+=`<div class="cal-day ${d.getMonth()!==mo?'other':''} ${iso===selectedDay?'selected':''}" data-cal-day="${iso}" tabindex="0" role="button" aria-label="${esc(fmtDayLong(d))}, ${dayRows.length} actividades"><div class="jf-cal3-dayhead"><span class="cal-num ${iso===today?'today':''}">${d.getDate()}</span><span class="jf-cal3-count">${dayRows.length}</span></div><div class="jf-cal3-items">${dayRows.map(entryButton).join('')||'<span class="jf-cal3-none">Sin actividades</span>'}</div></div>`;
    }
    g.innerHTML=html;
  }

  function renderWeek(rows){
    const g=grid(),alt=$('jfCalAlt');g.style.display='none';alt.style.display='grid';alt.className='jf-cal3-alt jf-cal3-week';
    const days=visibleRange().days,today=todayIso();
    alt.innerHTML=days.map(d=>{const iso=isoDate(d),dayRows=rows.filter(x=>x.date===iso);return `<section class="jf-cal3-week-day ${iso===today?'today':''}"><button type="button" class="jf-cal3-week-head" data-cal-day="${iso}"><span>${new Intl.DateTimeFormat('es-UY',{weekday:'short'}).format(d)}</span><strong>${d.getDate()}</strong><small>${dayRows.length} ${dayRows.length===1?'actividad':'actividades'}</small></button><div class="jf-cal3-week-list">${dayRows.map(detailCard).join('')||'<div class="jf-cal3-empty small">Sin actividades</div>'}</div></section>`}).join('');
  }

  function renderAgenda(rows){
    const g=grid(),alt=$('jfCalAlt');g.style.display='none';alt.style.display='grid';alt.className='jf-cal3-alt jf-cal3-agenda';
    const by=new Map();for(const x of rows){if(!by.has(x.date))by.set(x.date,[]);by.get(x.date).push(x)}
    alt.innerHTML=by.size?[...by].map(([date,list])=>{const d=parseIso(date);return `<section class="jf-cal3-daygroup"><button type="button" class="jf-cal3-datebox" data-cal-day="${date}"><span>${new Intl.DateTimeFormat('es-UY',{weekday:'short'}).format(d)}</span><strong>${d.getDate()}</strong><small>${new Intl.DateTimeFormat('es-UY',{month:'short'}).format(d).replace('.','')}</small></button><div class="jf-cal3-agenda-items">${list.map(detailCard).join('')}</div></section>`}).join(''):'<div class="jf-cal3-empty">No hay actividades para mostrar con estos filtros.</div>';
  }

  function bindRendered(){
    const v=root();if(!v)return;
    v.querySelectorAll('[data-cal-entry-key]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openEntryByKey(b.dataset.calEntryKey)}));
    v.querySelectorAll('[data-cal-day]').forEach(b=>{
      b.addEventListener('click',e=>{if(e.target.closest('[data-cal-entry-key]'))return;openDayPanel(b.dataset.calDay)});
      b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openDayPanel(b.dataset.calDay)}});
    });
  }

  function render(){
    if(!ensureShell())return;
    const all=entriesAll();buildOptions(all);
    const rows=filteredEntries(all);
    renderModeButtons();renderRangeLabel();renderSummary(rows);renderLegend();
    if(mode==='week')renderWeek(rows);else if(mode==='agenda')renderAgenda(rows);else renderMonth(rows);
    bindRendered();
  }
  function scheduleRender(){clearTimeout(renderTimer);renderTimer=setTimeout(render,120)}
  function navigate(dir){
    if(mode==='week')anchor=addDays(anchor,7*dir);else{anchor=new Date(anchor.getFullYear(),anchor.getMonth()+dir,1,12);setBaseMonth(anchor)}render();
  }
  function goToday(){const t=parseIso(todayIso())||new Date();anchor=t;if(mode!=='week')setBaseMonth(t);render()}
  function clearFilters(){query='';selectedType='';selectedResponsible='';selectedPriority='';selectedInstitution='';if($('jfCalSearch'))$('jfCalSearch').value='';if($('jfCalType'))$('jfCalType').value='';if($('jfCalPriority'))$('jfCalPriority').value='';render()}

  function patchLegacy(){
    if(window.__SORAYA_CALENDAR_LEGACY_PATCHED__)return;
    const legacy=window.renderCalendar;
    if(typeof legacy==='function'){
      window.__SORAYA_CALENDAR_LEGACY_PATCHED__=true;
      window.renderCalendar=function(){const r=legacy.apply(this,arguments);setTimeout(render,0);return r};
    }
  }

  async function boot(){
    for(let i=0;i<25&&!root();i++)await new Promise(r=>setTimeout(r,200));
    if(!root())return;
    anchor=monthState();
    await loadSupplemental();
    patchLegacy();
    render();
    setTimeout(render,1200);setTimeout(render,3500);
    setInterval(()=>{if(root()?.classList.contains('active'))render()},20000);
  }

  window.addEventListener('jf:data-changed',()=>{supplementalLoaded=false;loadSupplemental().finally(scheduleRender)});
  window.addEventListener('jf:google-sync-updated',scheduleRender);
  window.addEventListener('hashchange',()=>{if(location.hash.includes('/calendar'))setTimeout(render,80)});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&root()?.classList.contains('active'))scheduleRender()});
  window.addEventListener('resize',()=>{if(window.innerWidth<=760&&mode==='month'&&!localStorage.getItem('soraya_calendar_mode_v3')){mode='agenda';render()}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('jfCalDayBackdrop')?.classList.contains('show'))closeDayPanel()});

  window.SorayaCalendar={render,goToday,openDay:openDayPanel,get mode(){return mode},setMode(v){if(['month','week','agenda'].includes(v)){mode=v;render()}}};
  setTimeout(boot,500);
})();