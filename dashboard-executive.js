(function installExecutiveDashboard(){
  if(window.__JF_EXEC_DASHBOARD__) return;
  window.__JF_EXEC_DASHBOARD__=true;
  const C=window.JF_CONFIG;
  if(!window.supabase||!C) return;
  const db=window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:C.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const nowHour=()=>Number(new Intl.DateTimeFormat('en-GB',{timeZone:C.timezone,hour:'2-digit',hour12:false}).format(new Date()));
  const fmtDate=d=>{if(!d)return'';try{return new Intl.DateTimeFormat('es-UY',{day:'2-digit',month:'short'}).format(new Date(String(d).slice(0,10)+'T12:00:00'))}catch{return d}};
  const fullDate=()=>{let s=new Intl.DateTimeFormat('es-UY',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:C.timezone}).format(new Date());return s.charAt(0).toUpperCase()+s.slice(1)};
  const addDays=(iso,n)=>{const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(d)};
  const tm=t=>t?String(t).slice(0,5):'';
  const priorityRank={Urgente:4,Alta:3,Media:2,Baja:1};
  let profile=null,session=null,lastRefresh=0,refreshing=false,data=null;

  function greeting(){const h=nowHour();return h<12?'Buen día':h<19?'Buenas tardes':'Buenas noches'}
  function firstName(){return String(profile?.full_name||'').trim().split(/\s+/)[0]||'Equipo'}
  function canWrite(){return profile?.active&&['admin','equipo'].includes(profile.role)}
  function go(view){const b=document.querySelector(`#mainNav button[data-view="${view}"]`);if(b)b.click();else location.hash='#/'+view}
  function quickAdd(){document.getElementById('quickAddBtn')?.click()}
  function dateRef(t){return t.deadline||t.task_date||t.followup_date||''}
  function activeTask(t){return !['Realizada','Cancelada'].includes(t.status)}
  function activeCase(x){return !['Resuelto','Cerrado'].includes(x.status)}
  function activeMessage(x){return !['Respondida','Finalizada','Archivada'].includes(x.status)}
  function isOverdue(date){return !!date&&date<today()}
  function dueIn(date,n){return !!date&&date>=today()&&date<=addDays(today(),n)}
  function errorSafe(result,fallback=[]){if(result?.error){console.warn('[Mi día]',result.error);return fallback}return result?.data??fallback}

  function ensureShell(){
    const view=$('view-dashboard');if(!view||$('jfExecDashboard'))return;
    const wrap=document.createElement('div');wrap.id='jfExecDashboard';wrap.className='jfexec';
    wrap.innerHTML=`
      <section class="jfexec-hero">
        <div><p class="jfexec-kicker">Mi día · Oficina de la Juventud</p><h1 id="jfExecGreeting">${greeting()}</h1><p id="jfExecDate" class="jfexec-date">${fullDate()}</p></div>
        <div class="jfexec-hero-actions">${canWrite()?'<button id="jfExecQuickAdd" class="primary-btn">＋ Agregar</button>':''}<button id="jfExecCalendar" class="secondary-btn">Ver calendario</button><button id="jfExecRefresh" class="jfexec-refresh" title="Actualizar" aria-label="Actualizar">↻</button></div>
      </section>
      <section class="jfexec-attention"><div id="jfExecFocus" class="jfexec-focus"><div class="jfexec-skeleton"></div></div><div id="jfExecHealth" class="jfexec-health"><div class="jfexec-skeleton"></div></div></section>
      <section id="jfExecKpis" class="jfexec-kpis"><div class="jfexec-skeleton"></div><div class="jfexec-skeleton"></div><div class="jfexec-skeleton"></div></section>
      <section class="jfexec-main">
        <article class="jfexec-card"><div class="jfexec-card-head"><div><h2>Agenda de hoy</h2><p>Tareas, reuniones, eventos y agenda del equipo.</p></div><button class="jfexec-card-link" data-jf-go="calendar">Ver agenda →</button></div><div id="jfExecAgenda" class="jfexec-agenda"><div class="jfexec-skeleton"></div></div></article>
        <article class="jfexec-card"><div class="jfexec-card-head"><div><h2>Próximas 3 acciones</h2><p>Ordenadas por urgencia, plazo y responsabilidad.</p></div><button class="jfexec-card-link" data-jf-go="tasks">Ver tareas →</button></div><div id="jfExecActions" class="jfexec-actions-list"><div class="jfexec-skeleton"></div></div></article>
        <article class="jfexec-card"><div class="jfexec-card-head"><div><h2>Alertas</h2><p>Lo que puede requerir intervención.</p></div><button class="jfexec-card-link" data-jf-go="control85">Control →</button></div><div id="jfExecAlerts" class="jfexec-alerts"><div class="jfexec-skeleton"></div></div></article>
        <article class="jfexec-card"><div class="jfexec-card-head"><div><h2>Progreso del mes</h2><p id="jfExecMonthLabel"></p></div><button class="jfexec-card-link" data-jf-go="control85">Ver indicadores →</button></div><div id="jfExecMonth" class="jfexec-month"><div class="jfexec-skeleton"></div></div></article>
      </section>
      <article class="jfexec-card"><div class="jfexec-card-head"><div><h2>Accesos rápidos</h2><p>Las herramientas que más se usan durante la jornada.</p></div><span id="jfExecUpdated" class="meta"></span></div><div id="jfExecShortcuts" class="jfexec-shortcuts"></div></article>`;
    view.insertBefore(wrap,view.firstChild);view.classList.add('jf-exec-ready');
    $('jfExecQuickAdd')&&($('jfExecQuickAdd').onclick=quickAdd);$('jfExecCalendar').onclick=()=>go('calendar');$('jfExecRefresh').onclick=()=>refresh(true);
    wrap.addEventListener('click',e=>{const b=e.target.closest('[data-jf-go]');if(b)go(b.dataset.jfGo)});
    renderShortcuts();
  }

  function renderShortcuts(){const box=$('jfExecShortcuts');if(!box)return;const items=[
    ['tasks','✅','Tareas','Pendientes y seguimientos'],['calendar','📅','Calendario','Agenda general'],['inbox82','📥','Bandeja','Entradas y salidas'],['cases82','🗂️','Expedientes','Trámites y solicitudes'],['officialdocs84','📑','Documentos','Notas oficiales'],['control85','📈','Control','Indicadores y metas']
  ];box.innerHTML=items.map(([v,i,t,s])=>`<button class="jfexec-shortcut" data-jf-go="${v}"><b>${i}</b><strong>${t}</strong><span>${s}</span></button>`).join('')}

  async function load(){
    const{data:{session:s}}=await db.auth.getSession();session=s;if(!s?.user)return false;
    const p=await db.from('profiles').select('id,full_name,role,active').eq('id',s.user.id).maybeSingle();profile=p.data||null;if(!profile?.active)return false;
    ensureShell();
    const d=today(),year=Number(d.slice(0,4)),month=Number(d.slice(5,7));
    const [tasksR,meetingsR,eventsR,teamR,casesR,msgsR,assignR,docsR,metricsR,goalsR]=await Promise.all([
      db.from('tasks').select('id,title,status,priority,task_date,task_time,deadline,responsible_id,followup_date,next_action,institution_name,project_name').eq('archived',false).limit(1000),
      db.from('meetings').select('id,subject,meeting_date,meeting_time,place').gte('meeting_date',d).lte('meeting_date',addDays(d,14)).order('meeting_date'),
      db.from('events').select('id,name,event_date,start_time,end_time,place,responsible_id,responsible_name').eq('archived',false).gte('event_date',d).lte('event_date',addDays(d,14)).order('event_date'),
      db.from('team_agenda_items').select('id,title,item_type,item_date,start_time,end_time,location,responsible_id,responsible_name,status,participant_ids').eq('archived',false).gte('item_date',d).lte('item_date',addDays(d,7)).order('item_date'),
      db.from('institutional_cases').select('id,case_number,title,status,priority,due_date,assigned_to,assigned_name,workflow_stage').eq('archived',false).limit(600),
      db.from('institutional_messages').select('id,direction,subject,status,priority,response_due_date,assigned_to,assigned_name,institution_name').eq('archived',false).limit(600),
      db.from('task_assignments').select('task_id,user_id,assignment_role,status').eq('user_id',s.user.id).limit(600),
      db.from('generated_documents').select('id,title,official_number,official_status,current_reviewer_id,current_reviewer_name').eq('archived',false).limit(600),
      db.rpc('get_executive_dashboard',{p_year:year,p_month:month}),
      db.from('executive_goals').select('id,title,metric_key,target_value,current_value,status,month,year').eq('archived',false).eq('year',year).or(`month.eq.${month},month.is.null`).limit(100)
    ]);
    data={tasks:errorSafe(tasksR),meetings:errorSafe(meetingsR),events:errorSafe(eventsR),team:errorSafe(teamR),cases:errorSafe(casesR),messages:errorSafe(msgsR),assignments:errorSafe(assignR),documents:errorSafe(docsR),metrics:errorSafe(metricsR,{}),goals:errorSafe(goalsR)};
    return true;
  }

  function getPriorityCandidates(){
    const uid=session.user.id,assignedIds=new Set(data.assignments.filter(a=>!['Completada','Rechazada'].includes(a.status)).map(a=>a.task_id));const out=[];
    data.tasks.filter(activeTask).forEach(t=>{const ref=dateRef(t),mine=t.responsible_id===uid||assignedIds.has(t.id),over=isOverdue(ref),todayDue=ref===today(),soon=dueIn(ref,3);let score=(priorityRank[t.priority]||0)*8+(mine?22:0)+(over?55:0)+(todayDue?35:0)+(soon?12:0)+(t.status==='Esperando respuesta'?10:0)+(!t.responsible_id?4:0);let reason=over?`Vencida ${fmtDate(ref)}`:todayDue?'Vence hoy':soon?`Vence ${fmtDate(ref)}`:t.status==='Esperando respuesta'?'Esperando respuesta':t.next_action||t.status;out.push({kind:'Tarea',id:t.id,title:t.title,reason,priority:t.priority,score,view:'tasks',mine})});
    data.cases.filter(activeCase).forEach(x=>{const mine=x.assigned_to===uid,over=isOverdue(x.due_date),todayDue=x.due_date===today(),soon=dueIn(x.due_date,3);let score=(priorityRank[x.priority]||0)*8+(mine?22:0)+(over?58:0)+(todayDue?36:0)+(soon?13:0);let reason=over?`Expediente vencido · ${x.case_number}`:todayDue?`Vence hoy · ${x.case_number}`:x.due_date?`Vence ${fmtDate(x.due_date)} · ${x.case_number}`:`${x.case_number} · ${x.workflow_stage||x.status}`;out.push({kind:'Expediente',id:x.id,title:x.title,reason,priority:x.priority,score,view:'cases82',mine})});
    data.messages.filter(activeMessage).forEach(x=>{if(!x.response_due_date)return;const mine=x.assigned_to===uid,over=isOverdue(x.response_due_date),todayDue=x.response_due_date===today(),soon=dueIn(x.response_due_date,2);let score=(priorityRank[x.priority]||0)*7+(mine?20:0)+(over?52:0)+(todayDue?34:0)+(soon?11:0);let reason=over?'Respuesta fuera de plazo':todayDue?'Respuesta vence hoy':`Responder ${fmtDate(x.response_due_date)}`;out.push({kind:'Comunicación',id:x.id,title:x.subject,reason,priority:x.priority,score,view:'inbox82',mine})});
    return out.sort((a,b)=>b.score-a.score||Number(b.mine)-Number(a.mine));
  }

  function renderHero(){
    $('jfExecGreeting').textContent=`${greeting()}, ${firstName()} 👋`;$('jfExecDate').textContent=fullDate();
    const focus=getPriorityCandidates()[0],box=$('jfExecFocus');
    if(!focus){box.className='jfexec-focus empty';box.innerHTML=`<div><span class="jfexec-focus-label">Tu foco recomendado</span><h2>No hay urgencias críticas registradas</h2><p>Podés usar este momento para adelantar seguimientos, completar registros o revisar la planificación.</p></div><div class="jfexec-focus-bottom"><span class="jfexec-focus-chip">Jornada al día</span><button data-jf-go="tasks">Revisar tareas</button></div>`;return}
    box.className='jfexec-focus';box.innerHTML=`<div><span class="jfexec-focus-label">Tu foco recomendado</span><h2>${esc(focus.title)}</h2><p>${esc(focus.reason)} · ${esc(focus.kind)}${focus.mine?' · asignado a vos':''}</p></div><div class="jfexec-focus-bottom"><span class="jfexec-focus-chip">${esc(focus.priority||'Prioridad operativa')}</span><button data-jf-go="${focus.view}">Ir a resolver →</button></div>`;
  }

  function renderKpis(){
    const uid=session.user.id,assignedIds=new Set(data.assignments.filter(a=>!['Completada','Rechazada'].includes(a.status)).map(a=>a.task_id));const active=data.tasks.filter(activeTask),mine=active.filter(t=>t.responsible_id===uid||assignedIds.has(t.id));const overdue=active.filter(t=>isOverdue(dateRef(t))),waiting=active.filter(t=>t.status==='Esperando respuesta').length+data.messages.filter(m=>activeMessage(m)&&m.status==='Esperando respuesta').length;const agenda=todayAgenda();const next7=upcomingSeven().length;
    const rows=[['Agenda hoy',agenda.length,'elementos',''],['Mis pendientes',mine.length,'responsabilidades',''],['Atrasadas',overdue.length,'requieren atención',overdue.length?'danger':'good'],['Esperando',waiting,'respuestas','warn'],['Próximos 7 días',next7,'en agenda','']];$('jfExecKpis').innerHTML=rows.map(([l,n,s,c])=>`<div class="jfexec-kpi ${c}"><span>${l}</span><strong>${n}</strong><small>${s}</small></div>`).join('')}

  function todayAgenda(){const d=today(),rows=[];data.tasks.filter(t=>activeTask(t)&&(t.task_date===d||t.deadline===d)).forEach(t=>rows.push({type:'Tarea',time:t.task_time,title:t.title,meta:t.institution_name||t.project_name||t.status,status:t.priority||t.status,view:'tasks'}));data.meetings.filter(m=>m.meeting_date===d).forEach(m=>rows.push({type:'Reunión',time:m.meeting_time,title:m.subject,meta:m.place||'Lugar a confirmar',status:'Reunión',view:'meetings'}));data.events.filter(e=>e.event_date===d).forEach(e=>rows.push({type:'Evento',time:e.start_time,title:e.name,meta:e.place||'Lugar a confirmar',status:'Evento',view:'events'}));data.team.filter(x=>x.item_date===d).forEach(x=>rows.push({type:'Equipo',time:x.start_time,title:x.title,meta:[x.item_type,x.location,x.responsible_name].filter(Boolean).join(' · '),status:x.status,view:'teamagenda82'}));return rows.sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'))}
  function upcomingSeven(){const d=today(),to=addDays(d,7),rows=[];data.tasks.filter(t=>{const r=dateRef(t);return activeTask(t)&&r&&r>=d&&r<=to}).forEach(t=>rows.push(t));data.meetings.filter(x=>x.meeting_date>=d&&x.meeting_date<=to).forEach(x=>rows.push(x));data.events.filter(x=>x.event_date>=d&&x.event_date<=to).forEach(x=>rows.push(x));data.team.filter(x=>x.item_date>=d&&x.item_date<=to).forEach(x=>rows.push(x));return rows}
  function agendaIcon(type){return type==='Tarea'?'✓':type==='Evento'?'★':type==='Reunión'?'●':'◇'}
  function renderAgenda(){const rows=todayAgenda(),box=$('jfExecAgenda');box.innerHTML=rows.length?rows.slice(0,8).map(r=>`<div class="jfexec-agenda-row" data-type="${r.type}" data-jf-go="${r.view}"><span class="jfexec-time">${tm(r.time)||'—'}</span><span class="jfexec-type">${agendaIcon(r.type)}</span><div><strong>${esc(r.title)}</strong><small>${esc(r.meta||r.type)}</small></div><span class="jfexec-status">${esc(r.status||r.type)}</span></div>`).join(''):'<div class="jfexec-empty">No hay actividades registradas para hoy.</div>'}

  function renderActions(){const rows=getPriorityCandidates().slice(0,3),box=$('jfExecActions');box.innerHTML=rows.length?rows.map((r,i)=>`<div class="jfexec-action"><span class="jfexec-action-num">${i+1}</span><div><strong>${esc(r.title)}</strong><small>${esc(r.reason)} · ${esc(r.kind)}</small></div><button data-jf-go="${r.view}">Abrir</button></div>`).join(''):'<div class="jfexec-empty">No hay acciones urgentes pendientes.</div>'}

  function renderAlerts(){
    const uid=session.user.id,active=data.tasks.filter(activeTask),overTasks=active.filter(t=>isOverdue(dateRef(t))),overCases=data.cases.filter(x=>activeCase(x)&&isOverdue(x.due_date)),overMsgs=data.messages.filter(x=>activeMessage(x)&&isOverdue(x.response_due_date)),waitingDocs=data.documents.filter(x=>x.official_status==='Para firma'&&(!x.current_reviewer_id||x.current_reviewer_id===uid));const rows=[];
    if(overTasks.length)rows.push(['danger',`${overTasks.length} tarea${overTasks.length===1?'':'s'} vencida${overTasks.length===1?'':'s'}`,'Revisar plazos y reprogramar lo que corresponda.']);if(overCases.length)rows.push(['danger',`${overCases.length} expediente${overCases.length===1?'':'s'} fuera de plazo`,'Hay trámites abiertos cuya fecha límite ya pasó.']);if(overMsgs.length)rows.push(['danger',`${overMsgs.length} respuesta${overMsgs.length===1?'':'s'} vencida${overMsgs.length===1?'':'s'}`,'La Bandeja tiene comunicaciones sin respuesta dentro del plazo.']);if(waitingDocs.length)rows.push(['',`${waitingDocs.length} documento${waitingDocs.length===1?'':'s'} para firma/revisión`,'Conviene revisar el circuito documental pendiente.']);if(!rows.length)rows.push(['good','Sin alertas críticas','No se detectan vencimientos institucionales importantes en este momento.']);$('jfExecAlerts').innerHTML=rows.slice(0,4).map(([c,t,s])=>`<div class="jfexec-alert ${c}"><div><strong>${esc(t)}</strong><span>${esc(s)}</span></div></div>`).join('')}

  function metricValue(key){return Number(data.metrics?.[key]||0)}
  function goalsAverage(){const active=data.goals.filter(g=>g.status==='Activa'&&Number(g.target_value)>0);if(!active.length)return null;const vals=active.map(g=>{const current=g.metric_key==='custom'?Number(g.current_value||0):metricValue(g.metric_key);return Math.min(100,current/Number(g.target_value)*100)});return vals.reduce((a,b)=>a+b,0)/vals.length}
  function monthName(){return new Intl.DateTimeFormat('es-UY',{month:'long',year:'numeric',timeZone:C.timezone}).format(new Date())}
  function renderMonth(){const rate=Math.max(0,Math.min(100,metricValue('task_completion_rate'))),ga=goalsAverage(),events=metricValue('events_count'),people=metricValue('participation_total'),docs=metricValue('documents_sent');$('jfExecMonthLabel').textContent=`Indicadores de ${monthName()}`;const items=[['Cumplimiento',`${Math.round(rate)}%`,rate],['Metas',ga===null?'Sin metas':`${Math.round(ga)}%`,ga??0],['Eventos',String(events),events?100:0],['Participación',String(people),people?100:0]];$('jfExecMonth').innerHTML=items.map(([l,v,p])=>`<div class="jfexec-month-item"><span>${l}</span><strong>${v}</strong><div class="jfexec-progress"><i style="width:${Math.min(100,p)}%"></i></div></div>`).join('');
    const health=$('jfExecHealth');const alertPenalty=Math.min(45,data.tasks.filter(t=>activeTask(t)&&isOverdue(dateRef(t))).length*5+data.cases.filter(x=>activeCase(x)&&isOverdue(x.due_date)).length*7);const score=Math.max(0,Math.round(rate*.7+(ga??rate)*.3-alertPenalty));health.innerHTML=`<div class="jfexec-health-head"><div><span>Estado operativo</span><div class="jfexec-health-score"><strong>${score}</strong><small>/100</small></div></div><span>${docs} docs. enviados</span></div><div class="jfexec-progress"><i style="width:${score}%"></i></div><p>${score>=80?'Buen nivel de cumplimiento y control.':score>=60?'Hay puntos que conviene regularizar durante la jornada.':'La gestión requiere atención prioritaria en vencimientos y cumplimiento.'}</p>`;
  }

  function renderUpdated(){$('jfExecUpdated').textContent='Actualizado '+new Intl.DateTimeFormat('es-UY',{hour:'2-digit',minute:'2-digit',timeZone:C.timezone}).format(new Date())}
  function render(){renderHero();renderKpis();renderAgenda();renderActions();renderAlerts();renderMonth();renderUpdated()}

  async function refresh(force=false){if(refreshing)return;if(!force&&Date.now()-lastRefresh<30000)return;refreshing=true;const btn=$('jfExecRefresh');if(btn)btn.textContent='…';try{const ok=await load();if(ok){render();lastRefresh=Date.now()}}catch(e){console.error('Dashboard ejecutivo',e);const box=$('jfExecFocus');if(box)box.innerHTML='<div><span class="jfexec-focus-label">Mi día</span><h2>No se pudo actualizar el resumen</h2><p>Los demás módulos siguen disponibles. Probá nuevamente en unos segundos.</p></div>'}finally{refreshing=false;if(btn)btn.textContent='↻'}}

  function dashboardVisible(){return $('view-dashboard')?.classList.contains('active')&&!$('app')?.classList.contains('hidden')}
  function scan(){if($('view-dashboard'))ensureShell();if(dashboardVisible())refresh(false)}
  setTimeout(scan,350);setTimeout(()=>refresh(true),950);window.addEventListener('hashchange',()=>setTimeout(scan,100));document.addEventListener('visibilitychange',()=>{if(!document.hidden&&dashboardVisible())refresh(false)});
  const obs=new MutationObserver(()=>{if(dashboardVisible())setTimeout(scan,60)});const target=$('view-dashboard');if(target)obs.observe(target,{attributes:true,attributeFilter:['class']});
  window.JFExecutiveDashboard={refresh:()=>refresh(true)};
})();
