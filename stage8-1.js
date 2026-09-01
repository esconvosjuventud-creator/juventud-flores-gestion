(function installStage81(){
  if(window.__JF_STAGE81__) return;
  window.__JF_STAGE81__=true;
  const C=window.JF_CONFIG;
  if(!window.supabase||!C) return;
  const client=window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const todayIso=()=>new Intl.DateTimeFormat('en-CA',{timeZone:C.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const isoToDate=iso=>new Date(`${iso}T12:00:00-03:00`);
  const addDays=(iso,n)=>{const d=isoToDate(iso);d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const fmt=iso=>{if(!iso)return 'Sin fecha';try{return new Intl.DateTimeFormat('es-UY',{day:'2-digit',month:'2-digit',year:'numeric'}).format(isoToDate(iso))}catch{return iso}};
  const fmtTime=t=>t?String(t).slice(0,5):'Sin hora';
  const isDone=t=>['Realizada','Cancelada'].includes(t.status);
  let profile=null,session=null,lastBrief='',templates=[],institutions=[],projects=[],events=[],meetings=[];

  async function auth(){
    const {data:{session:s}}=await client.auth.getSession();session=s;
    if(!s?.user){profile=null;return null}
    const {data}=await client.from('profiles').select('id,full_name,role,active').eq('id',s.user.id).maybeSingle();
    profile=data||null;return profile;
  }
  const canWrite=()=>profile?.active&&['admin','equipo'].includes(profile.role);
  function notify(text){if(typeof window.toast==='function')window.toast(text);else{const n=$('toast');if(n){n.textContent=text;n.classList.add('show');setTimeout(()=>n.classList.remove('show'),2500)}}}

  function inject(){
    if(!$('view-operations81')){
      const main=document.querySelector('.main');
      if(!main)return;
      const section=document.createElement('section');
      section.id='view-operations81';section.className='view';
      section.innerHTML=`
        <div class="page-head"><div><p class="eyebrow">ETAPA 8.1 · SIN COSTO DE IA</p><h1>Centro Operativo</h1><p class="muted">Consultas, carga rápida, documentos y vista 360° usando directamente los datos de Supabase.</p></div><span class="jf81-offline-badge">IA externa pausada · funciones locales activas</span></div>
        <div class="jf81-grid">
          <article class="card jf81-command-card">
            <p class="eyebrow">CENTRO DE COMANDOS</p><h2>¿Qué necesita atención?</h2><p class="muted">No consume créditos de OpenAI.</p>
            <div class="jf81-chips">
              <button data-jf81-command="today">Hoy</button><button data-jf81-command="overdue">Atrasadas</button><button data-jf81-command="waiting">Esperando respuesta</button><button data-jf81-command="week">Próximos 7 días</button><button data-jf81-command="events">Eventos próximos</button><button data-jf81-command="agreements">Convenios</button><button data-jf81-command="summary">Resumen operativo</button>
            </div><div id="jf81CommandResult" class="jf81-result"><div class="empty">Elegí una consulta rápida.</div></div>
          </article>

          <article class="card jf81-quick-card">
            <p class="eyebrow">CARGA RÁPIDA</p><h2>Escribí como hablás</h2><p class="muted">Ejemplo: “Reunión con INJU mañana a las 14 en la Oficina de Juventud”. El análisis es local, sin IA externa.</p>
            <textarea id="jf81QuickText" rows="4" placeholder="Escribí una tarea, reunión o evento…"></textarea>
            <div class="actions"><button id="jf81Analyze" class="primary-btn" type="button">Interpretar</button><button id="jf81ClearQuick" class="secondary-btn" type="button">Limpiar</button></div>
            <div id="jf81QuickPreview" class="jf81-preview hidden"></div>
          </article>

          <article class="card span2 jf81-360-card">
            <p class="eyebrow">GESTIÓN 360°</p><h2>Proyecto o institución en una sola pantalla</h2>
            <div class="jf81-inline"><label>Tipo<select id="jf81ScopeType"><option value="project">Proyecto</option><option value="institution">Institución</option></select></label><label class="grow">Seleccionar<select id="jf81ScopeId"></select></label><button id="jf81Load360" class="primary-btn" type="button">Ver 360°</button></div>
            <div id="jf81360Result" class="jf81-result"><div class="empty">Seleccioná un proyecto o institución.</div></div>
          </article>

          <article class="card jf81-doc-card">
            <p class="eyebrow">DOCUMENTOS INTELIGENTES</p><h2>Autocompletar desde la gestión</h2>
            <div class="stack"><label>Plantilla<select id="jf81Template"></select></label><label>Fuente<select id="jf81DocSourceType"><option value="event">Evento</option><option value="meeting">Reunión</option><option value="project">Proyecto</option><option value="institution">Institución</option><option value="manual">Manual</option></select></label><label>Registro<select id="jf81DocSource"></select></label><label>Destinatario<input id="jf81DocRecipient" placeholder="Destinatario"></label><label>Dirección / área<input id="jf81DocDepartment" placeholder="Área o Dirección"></label></div>
            <div class="actions"><button id="jf81BuildDoc" class="primary-btn" type="button">Preparar documento</button></div>
            <div id="jf81DocPreview" class="jf81-preview hidden"></div>
          </article>

          <article class="card jf81-brief-card">
            <p class="eyebrow">RESUMEN OPERATIVO</p><h2>Parte de gestión</h2><p class="muted">Generado con reglas y datos reales. Ideal para reunión de equipo o cierre semanal.</p>
            <div class="actions"><button id="jf81GenerateBrief" class="primary-btn" type="button">Generar resumen</button><button id="jf81CopyBrief" class="secondary-btn" type="button">Copiar</button><button id="jf81SaveBrief" class="secondary-btn" type="button">Guardar como nota</button></div>
            <pre id="jf81Brief" class="jf81-brief">Todavía no se generó un resumen.</pre>
          </article>
        </div>`;
      const settings=$('view-settings');
      if(settings)main.insertBefore(section,settings);else main.appendChild(section);
    }
    if(!$('jf81Nav')){
      const nav=$('mainNav');if(!nav)return;
      const b=document.createElement('button');b.id='jf81Nav';b.dataset.view='operations81';b.innerHTML='🧭 Centro Operativo';
      const settingsBtn=nav.querySelector('[data-view="settings"]');if(settingsBtn)nav.insertBefore(b,settingsBtn);else nav.appendChild(b);
      b.onclick=()=>{if(typeof window.setView==='function')window.setView('operations81');else{document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$('view-operations81')?.classList.add('active');history.replaceState(null,'','#/operations81')}render().catch(console.error)};
    }
    const assistant=$('view-assistant');
    if(assistant&&!$('jf81AssistantNotice')){
      const note=document.createElement('div');note.id='jf81AssistantNotice';note.className='jf81-ai-note';note.innerHTML='<strong>IA externa en pausa por facturación.</strong> Podés seguir trabajando normalmente desde <button type="button" id="jf81GoOps">Centro Operativo</button>, que no consume créditos.';assistant.prepend(note);note.querySelector('button').onclick=()=>{$('jf81Nav')?.click()};
    }
    bind();
  }

  function bind(){
    document.querySelectorAll('[data-jf81-command]').forEach(b=>{if(b.dataset.bound)return;b.dataset.bound='1';b.onclick=()=>runCommand(b.dataset.jf81Command)});
    if($('jf81Analyze')&&!$('jf81Analyze').dataset.bound){$('jf81Analyze').dataset.bound='1';$('jf81Analyze').onclick=analyzeQuick;$('jf81ClearQuick').onclick=()=>{$('jf81QuickText').value='';$('jf81QuickPreview').classList.add('hidden');$('jf81QuickPreview').innerHTML=''};}
    if($('jf81ScopeType')&&!$('jf81ScopeType').dataset.bound){$('jf81ScopeType').dataset.bound='1';$('jf81ScopeType').onchange=refreshScopeOptions;$('jf81Load360').onclick=load360;}
    if($('jf81DocSourceType')&&!$('jf81DocSourceType').dataset.bound){$('jf81DocSourceType').dataset.bound='1';$('jf81DocSourceType').onchange=refreshDocSources;$('jf81BuildDoc').onclick=buildDocument;}
    if($('jf81GenerateBrief')&&!$('jf81GenerateBrief').dataset.bound){$('jf81GenerateBrief').dataset.bound='1';$('jf81GenerateBrief').onclick=generateBrief;$('jf81CopyBrief').onclick=async()=>{if(!lastBrief)return notify('Generá primero el resumen');await navigator.clipboard.writeText(lastBrief);notify('Resumen copiado')};$('jf81SaveBrief').onclick=saveBrief;}
  }

  async function render(){
    await auth();if(!profile?.active)return;
    const [ins,pro,ev,me,tpl]=await Promise.all([
      client.from('institutions').select('id,name,area,locality').eq('archived',false).order('name'),
      client.from('projects').select('id,name,status,start_date,end_date').eq('archived',false).order('updated_at',{ascending:false}),
      client.from('events').select('id,name,event_date,start_time,place,description,objectives,evaluation,final_report,expected_participants,actual_participants,project_id,organizer,collaborators,locality').eq('archived',false).order('event_date',{ascending:false}),
      client.from('meetings').select('id,subject,meeting_date,meeting_time,place,institutions,participants,agenda,discussed,decisions,commitments,next_steps,project_id').eq('archived',false).order('meeting_date',{ascending:false}),
      client.from('document_templates').select('*').eq('active',true).order('document_type').order('name')
    ]);
    institutions=ins.data||[];projects=pro.data||[];events=ev.data||[];meetings=me.data||[];templates=tpl.data||[];
    refreshScopeOptions();refreshTemplates();refreshDocSources();
  }

  function refreshScopeOptions(){
    const sel=$('jf81ScopeId');if(!sel)return;const type=$('jf81ScopeType')?.value||'project';const list=type==='project'?projects:institutions;sel.innerHTML=list.map(x=>`<option value="${x.id}">${esc(x.name)}${type==='project'&&x.status?' · '+esc(x.status):''}</option>`).join('')||'<option value="">Sin registros</option>';
  }
  function refreshTemplates(){const sel=$('jf81Template');if(sel)sel.innerHTML=templates.map(x=>`<option value="${x.id}">${esc(x.name)} · ${esc(x.document_type)}</option>`).join('')||'<option value="">Sin plantillas</option>'}
  function refreshDocSources(){
    const type=$('jf81DocSourceType')?.value||'event',sel=$('jf81DocSource');if(!sel)return;let list=[];
    if(type==='event')list=events.map(x=>[x.id,`${x.name} · ${fmt(x.event_date)}`]);
    if(type==='meeting')list=meetings.map(x=>[x.id,`${x.subject} · ${fmt(x.meeting_date)}`]);
    if(type==='project')list=projects.map(x=>[x.id,x.name]);
    if(type==='institution')list=institutions.map(x=>[x.id,x.name]);
    if(type==='manual')list=[['','Carga manual']];
    sel.innerHTML=list.map(([id,n])=>`<option value="${id}">${esc(n)}</option>`).join('')||'<option value="">Sin registros</option>';
  }

  async function loadCore(){
    const [tasks,fol,agr]=await Promise.all([
      client.from('tasks').select('id,title,status,priority,task_date,task_time,deadline,institution_id,institution_name,project_id,project_name,next_action,followup_date,created_by').eq('archived',false).order('updated_at',{ascending:false}).limit(600),
      client.from('followups').select('*').eq('archived',false).order('next_followup_date').limit(300),
      client.from('agreements').select('*').eq('archived',false).order('end_date',{ascending:true,nullsFirst:false}).limit(300)
    ]);return{tasks:tasks.data||[],followups:fol.data||[],agreements:agr.data||[]};
  }
  function listHtml(rows,titleFn,metaFn){return rows.length?`<div class="jf81-list">${rows.map(x=>`<div class="jf81-item"><strong>${esc(titleFn(x))}</strong><span>${esc(metaFn(x))}</span></div>`).join('')}</div>`:'<div class="empty">No hay registros para esta consulta.</div>'}
  async function runCommand(kind){
    const box=$('jf81CommandResult');box.innerHTML='<div class="empty">Consultando Supabase…</div>';const core=await loadCore(),today=todayIso(),week=addDays(today,7),active=core.tasks.filter(t=>!isDone(t)),ref=t=>t.deadline||t.task_date||'';let html='';
    if(kind==='today'){const rows=active.filter(t=>t.task_date===today||t.deadline===today);html=`<h3>Para hoy · ${fmt(today)}</h3>${listHtml(rows,x=>x.title,x=>`${x.priority} · ${x.status}${x.task_time?' · '+fmtTime(x.task_time):''}`)}`}
    if(kind==='overdue'){const rows=active.filter(t=>ref(t)&&ref(t)<today).sort((a,b)=>ref(a).localeCompare(ref(b)));html=`<h3>Atrasadas · ${rows.length}</h3>${listHtml(rows,x=>x.title,x=>`${x.priority} · vencía ${fmt(ref(x))} · ${x.status}`)}`}
    if(kind==='waiting'){const f=core.followups.filter(x=>x.status!=='Resuelto'&&x.status!=='Finalizado');const t=active.filter(x=>x.status==='Esperando respuesta');html=`<h3>Esperando respuesta</h3><p class="muted">${t.length} tareas · ${f.length} seguimientos abiertos</p>${listHtml(f.slice(0,20),x=>x.title,x=>`${x.institution_name||'Sin institución'} · próximo seguimiento ${fmt(x.next_followup_date)}`)}${t.length?'<h4>Tareas</h4>'+listHtml(t.slice(0,12),x=>x.title,x=>`${x.institution_name||''} ${x.followup_date?'· '+fmt(x.followup_date):''}`):''}`}
    if(kind==='week'){const rows=active.filter(t=>{const d=ref(t);return d&&d>=today&&d<=week}).sort((a,b)=>ref(a).localeCompare(ref(b)));html=`<h3>Próximos 7 días</h3>${listHtml(rows,x=>x.title,x=>`${fmt(ref(x))} · ${x.priority} · ${x.status}`)}`}
    if(kind==='events'){const rows=events.filter(e=>e.event_date>=today).sort((a,b)=>a.event_date.localeCompare(b.event_date)).slice(0,20);html=`<h3>Eventos próximos · ${rows.length}</h3>${listHtml(rows,x=>x.name,x=>`${fmt(x.event_date)} · ${fmtTime(x.start_time)} · ${x.place||'Lugar a confirmar'}`)}`}
    if(kind==='agreements'){const rows=core.agreements.filter(a=>a.status!=='Finalizado'&&a.status!=='Vencido');html=`<h3>Convenios y acuerdos</h3>${listHtml(rows.slice(0,20),x=>x.title,x=>`${x.institution_name||'Sin institución'} · ${x.status}${x.end_date?' · vence '+fmt(x.end_date):''}`)}`}
    if(kind==='summary'){await generateBrief();html=`<h3>Resumen operativo</h3><pre class="jf81-brief">${esc(lastBrief)}</pre>`}
    box.innerHTML=html||'<div class="empty">Sin resultado.</div>';
  }

  function nextWeekday(baseIso,target){const d=isoToDate(baseIso);let delta=(target-d.getDay()+7)%7;if(delta===0)delta=7;return addDays(baseIso,delta)}
  function parseDate(text){const n=norm(text),today=todayIso();if(/\bpasado manana\b/.test(n))return addDays(today,2);if(/\bmanana\b/.test(n))return addDays(today,1);if(/\bhoy\b/.test(n))return today;const m=text.match(/\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/);if(m){let y=m[3]?Number(m[3]):Number(today.slice(0,4));if(y<100)y+=2000;return `${y}-${String(Number(m[2])).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`};const days={domingo:0,lunes:1,martes:2,miercoles:3,jueves:4,viernes:5,sabado:6};for(const[k,v]of Object.entries(days))if(new RegExp(`\\b${k}\\b`).test(n))return nextWeekday(today,v);return today}
  function parseTime(text){let m=text.match(/\b(?:a\s+las\s+)?([01]?\d|2[0-3])[:.]([0-5]\d)\b/i);if(m)return `${String(Number(m[1])).padStart(2,'0')}:${m[2]}`;m=text.match(/\ba\s+las\s+([01]?\d|2[0-3])\b/i);return m?`${String(Number(m[1])).padStart(2,'0')}:00`:''}
  function parseQuickText(text){const n=norm(text);let type='task';if(/\breunion\b|\bentrevista\b/.test(n))type='meeting';else if(/\bevento\b|\bactividad\b|\btaller\b|\bcharla\b|\bconversatorio\b|\bjornada\b/.test(n))type='event';const date=parseDate(text),time=parseTime(text);let priority='Media';if(/\burgente\b|\bprioridad urgente\b/.test(n))priority='Urgente';else if(/\bprioridad alta\b|\bimportante\b/.test(n))priority='Alta';else if(/\bprioridad baja\b/.test(n))priority='Baja';const inst=institutions.find(i=>n.includes(norm(i.name)))||null;let place='';const pm=text.match(/\b(?:en|lugar)\s+(?:la\s+|el\s+)?([^,.]+)$/i);if(pm)place=pm[1].trim();return{type,title:text.trim(),date,time,priority,institution_id:inst?.id||'',institution_name:inst?.name||'',place}}
  function analyzeQuick(){const text=$('jf81QuickText').value.trim();if(!text)return notify('Escribí primero una gestión');const p=parseQuickText(text),box=$('jf81QuickPreview');box.classList.remove('hidden');box.innerHTML=`<h3>Vista previa</h3><div class="jf81-form"><label>Tipo<select id="jf81QType"><option value="task" ${p.type==='task'?'selected':''}>Tarea</option><option value="meeting" ${p.type==='meeting'?'selected':''}>Reunión</option><option value="event" ${p.type==='event'?'selected':''}>Evento</option></select></label><label class="full">Título / asunto<input id="jf81QTitle" value="${esc(p.title)}"></label><label>Fecha<input id="jf81QDate" type="date" value="${esc(p.date)}"></label><label>Hora<input id="jf81QTime" type="time" value="${esc(p.time)}"></label><label>Prioridad<select id="jf81QPriority"><option ${p.priority==='Urgente'?'selected':''}>Urgente</option><option ${p.priority==='Alta'?'selected':''}>Alta</option><option ${p.priority==='Media'?'selected':''}>Media</option><option ${p.priority==='Baja'?'selected':''}>Baja</option></select></label><label>Institución<select id="jf81QInstitution"><option value="">Sin institución</option>${institutions.map(i=>`<option value="${i.id}" ${i.id===p.institution_id?'selected':''}>${esc(i.name)}</option>`).join('')}</select></label><label class="full">Lugar<input id="jf81QPlace" value="${esc(p.place)}" placeholder="Opcional"></label></div><div class="actions"><button id="jf81QSave" class="primary-btn" type="button" ${canWrite()?'':'disabled'}>Guardar en la gestión</button></div>${canWrite()?'':'<p class="muted">Tu rol es de consulta; podés interpretar pero no crear registros.</p>'}`;$('jf81QSave').onclick=saveQuick}
  async function saveQuick(){if(!canWrite())return notify('Tu rol no permite crear registros');const type=$('jf81QType').value,title=$('jf81QTitle').value.trim(),date=$('jf81QDate').value,time=$('jf81QTime').value||null,priority=$('jf81QPriority').value,instId=$('jf81QInstitution').value,inst=institutions.find(x=>x.id===instId),place=$('jf81QPlace').value.trim();if(!title||!date)return notify('Completá título y fecha');let error;
    if(type==='task')({error}=await client.from('tasks').insert({title,category:'Coordinación institucional',status:'Pendiente',priority,task_date:date,task_time:time,institution_id:instId||null,institution_name:inst?.name||'',reminder:'1 día antes',created_by:session.user.id}));
    if(type==='meeting')({error}=await client.from('meetings').insert({subject:title,meeting_date:date,meeting_time:time,place:place||'Oficina de la Juventud',institutions:inst?.name||'',created_by:session.user.id}));
    if(type==='event')({error}=await client.from('events').insert({name:title,event_date:date,start_time:time,place,organizer:'Oficina de la Juventud',responsible_name:profile.full_name||'',locality:'Trinidad',created_by:session.user.id}));
    if(error)return notify(error.message);notify(type==='task'?'Tarea creada':type==='meeting'?'Reunión creada':'Evento creado');$('jf81QuickText').value='';$('jf81QuickPreview').classList.add('hidden');if(typeof window.loadAll==='function')await window.loadAll();
  }

  async function load360(){const type=$('jf81ScopeType').value,id=$('jf81ScopeId').value,box=$('jf81360Result');if(!id)return;box.innerHTML='<div class="empty">Armando vista 360°…</div>';const item=(type==='project'?projects:institutions).find(x=>x.id===id);if(!item)return;const name=item.name;const [ta,ev,me,ag,fo,no,co,gd,pa]=await Promise.all([
      client.from('tasks').select('*').eq('archived',false).limit(600),client.from('events').select('*').eq('archived',false).limit(400),client.from('meetings').select('*').eq('archived',false).limit(400),client.from('agreements').select('*').eq('archived',false).limit(300),client.from('followups').select('*').eq('archived',false).limit(300),client.from('notes').select('*').eq('archived',false).limit(400),client.from('contacts').select('*').eq('archived',false).limit(400),client.from('generated_documents').select('*').eq('archived',false).limit(400),client.from('participation_records').select('*').limit(500)
    ]);const all={tasks:ta.data||[],events:ev.data||[],meetings:me.data||[],agreements:ag.data||[],followups:fo.data||[],notes:no.data||[],contacts:co.data||[],docs:gd.data||[],participation:pa.data||[]};let related={};
    if(type==='project'){
      related.tasks=all.tasks.filter(x=>x.project_id===id||norm(x.project_name)===norm(name));related.events=all.events.filter(x=>x.project_id===id);related.meetings=all.meetings.filter(x=>x.project_id===id);related.agreements=all.agreements.filter(x=>x.project_id===id);related.docs=all.docs.filter(x=>x.related_entity_type==='project'&&x.related_entity_id===id);const eventIds=new Set(related.events.map(x=>x.id));related.participation=all.participation.filter(x=>eventIds.has(x.event_id));related.followups=all.followups.filter(x=>related.tasks.some(t=>t.id===x.source_task_id));related.notes=[];related.contacts=[];
    }else{
      const nn=norm(name);related.tasks=all.tasks.filter(x=>x.institution_id===id||norm(x.institution_name)===nn);related.events=all.events.filter(x=>norm(x.organizer).includes(nn)||norm(x.collaborators).includes(nn));related.meetings=all.meetings.filter(x=>norm(x.institutions).includes(nn));related.agreements=all.agreements.filter(x=>x.institution_id===id||norm(x.institution_name)===nn);related.followups=all.followups.filter(x=>norm(x.institution_name)===nn);related.notes=all.notes.filter(x=>norm(x.recipient).includes(nn)||norm(x.department).includes(nn));related.contacts=all.contacts.filter(x=>norm(x.organization)===nn||norm(x.organization).includes(nn));related.docs=all.docs.filter(x=>x.related_entity_type==='institution'&&x.related_entity_id===id);related.participation=all.participation.filter(x=>norm(x.educational_institution).includes(nn));
    }
    const counts=[['Tareas',related.tasks.length],['Eventos',related.events.length],['Reuniones',related.meetings.length],['Convenios',related.agreements.length],['Seguimientos',related.followups.length],['Documentos',related.docs.length],['Participación',related.participation.reduce((s,x)=>s+Number(x.total||0),0)]];const activeTasks=related.tasks.filter(x=>!isDone(x));box.innerHTML=`<div class="jf81-360-head"><div><p class="eyebrow">${type==='project'?'PROYECTO':'INSTITUCIÓN'}</p><h3>${esc(name)}</h3><p class="muted">${type==='project'?esc(item.status||''):esc([item.area,item.locality].filter(Boolean).join(' · '))}</p></div></div><div class="jf81-stats">${counts.map(([l,n])=>`<div><span>${l}</span><strong>${n}</strong></div>`).join('')}</div><div class="jf81-columns"><div><h4>Pendientes</h4>${listHtml(activeTasks.slice(0,15),x=>x.title,x=>`${x.priority} · ${x.status} · ${fmt(x.deadline||x.task_date)}`)}</div><div><h4>Reuniones / eventos</h4>${listHtml([...related.events.map(x=>({t:x.name,d:x.event_date,m:`Evento · ${x.place||''}`})),...related.meetings.map(x=>({t:x.subject,d:x.meeting_date,m:`Reunión · ${x.place||''}`}))].sort((a,b)=>(b.d||'').localeCompare(a.d||'')).slice(0,15),x=>x.t,x=>`${fmt(x.d)} · ${x.m}`)}</div><div><h4>Seguimientos / convenios</h4>${listHtml([...related.followups.map(x=>({t:x.title,m:`Seguimiento · ${fmt(x.next_followup_date)}`})),...related.agreements.map(x=>({t:x.title,m:`${x.status}${x.end_date?' · vence '+fmt(x.end_date):''}`}))].slice(0,15),x=>x.t,x=>x.m)}</div></div>`;
  }

  function contextFor(type,id){const blank={actividad:'',fecha:'',hora:'',lugar:'',participantes:'',motivo:'',compromisos:'',proximos_pasos:'',objetivo:'',resultados:''};if(type==='event'){const x=events.find(v=>v.id===id);if(!x)return blank;return{...blank,actividad:x.name,fecha:fmt(x.event_date),hora:fmtTime(x.start_time),lugar:x.place||'',participantes:String(x.actual_participants||x.expected_participants||''),motivo:x.description||'',objetivo:x.objectives||'',resultados:x.final_report||x.evaluation||''}}
    if(type==='meeting'){const x=meetings.find(v=>v.id===id);if(!x)return blank;return{...blank,actividad:x.subject,fecha:fmt(x.meeting_date),hora:fmtTime(x.meeting_time),lugar:x.place||'',participantes:x.participants||'',motivo:x.agenda||x.discussed||'',compromisos:x.commitments||'',proximos_pasos:x.next_steps||'',resultados:x.decisions||''}}
    if(type==='project'){const x=projects.find(v=>v.id===id);if(!x)return blank;return{...blank,actividad:x.name,fecha:fmt(x.start_date),lugar:'Flores',motivo:x.description||'',objetivo:x.objective||'',resultados:x.results||''}}
    if(type==='institution'){const x=institutions.find(v=>v.id===id);if(!x)return blank;return{...blank,actividad:x.name,lugar:x.locality||'Flores'}}return blank}
  function fillTpl(text,ctx){return String(text||'').replace(/\\n/g,'\n').replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g,(_,k)=>ctx[k]??'')}
  function buildDocument(){const tpl=templates.find(x=>x.id===$('jf81Template').value);if(!tpl)return notify('No hay plantilla seleccionada');const type=$('jf81DocSourceType').value,id=$('jf81DocSource').value,ctx=contextFor(type,id);const subject=fillTpl(tpl.subject_template,ctx),body=fillTpl(tpl.body_template,ctx),box=$('jf81DocPreview');box.classList.remove('hidden');box.innerHTML=`<h3>Documento preparado</h3><label>Asunto<input id="jf81DocTitle" value="${esc(subject)}"></label><label>Contenido<textarea id="jf81DocBody" rows="14">${esc(body)}</textarea></label><div class="actions"><button id="jf81SaveDoc" class="primary-btn" type="button" ${canWrite()?'':'disabled'}>Guardar documento</button><button id="jf81DocToNote" class="secondary-btn" type="button" ${canWrite()?'':'disabled'}>Guardar también como Nota</button></div>`;$('jf81SaveDoc').onclick=()=>saveDocument(false);$('jf81DocToNote').onclick=()=>saveDocument(true)}
  async function saveDocument(toNote){if(!canWrite())return notify('Tu rol no permite guardar documentos');const tpl=templates.find(x=>x.id===$('jf81Template').value),type=$('jf81DocSourceType').value,id=$('jf81DocSource').value||null,title=$('jf81DocTitle').value.trim(),body=$('jf81DocBody').value,recipient=$('jf81DocRecipient').value.trim(),department=$('jf81DocDepartment').value.trim();const {error}=await client.from('generated_documents').insert({template_id:tpl.id,document_type:tpl.document_type,title,recipient,department,body_text:body,status:'Borrador',related_entity_type:type==='manual'?null:type,related_entity_id:id,created_by:session.user.id});if(error)return notify(error.message);if(toNote){const {error:e2}=await client.from('notes').insert({note_date:todayIso(),recipient,department,subject:title,reason:body,responsible_name:profile.full_name||'',status:'Borrador',created_by:session.user.id});if(e2)return notify(`Documento guardado, pero la Nota falló: ${e2.message}`)}notify(toNote?'Documento y Nota guardados':'Documento guardado');}

  async function generateBrief(){await auth();const core=await loadCore(),today=todayIso(),week=addDays(today,7),active=core.tasks.filter(t=>!isDone(t)),ref=t=>t.deadline||t.task_date||'',todayT=active.filter(t=>t.task_date===today||t.deadline===today),over=active.filter(t=>ref(t)&&ref(t)<today),waiting=active.filter(t=>t.status==='Esperando respuesta'),follow=core.followups.filter(x=>x.status!=='Resuelto'&&x.next_followup_date&&x.next_followup_date<=today),upEvents=events.filter(e=>e.event_date>=today&&e.event_date<=week).sort((a,b)=>a.event_date.localeCompare(b.event_date)),agreements=core.agreements.filter(a=>a.end_date&&a.end_date>=today&&a.end_date<=addDays(today,45));const lines=[`JUVENTUD FLORES – RESUMEN OPERATIVO`,`Fecha: ${fmt(today)}`,'',`• Tareas para hoy: ${todayT.length}`,`• Tareas atrasadas: ${over.length}`,`• Esperando respuesta: ${waiting.length}`,`• Seguimientos que requieren atención: ${follow.length}`,`• Eventos en próximos 7 días: ${upEvents.length}`,`• Convenios con vencimiento en 45 días: ${agreements.length}`];if(over.length){lines.push('','PRIORIDAD – ATRASADAS');over.slice(0,8).forEach(x=>lines.push(`- ${x.title} · ${x.priority} · ${fmt(ref(x))}`))}if(follow.length){lines.push('','SEGUIMIENTOS');follow.slice(0,8).forEach(x=>lines.push(`- ${x.title} · ${x.institution_name||'Sin institución'} · ${fmt(x.next_followup_date)}`))}if(upEvents.length){lines.push('','PRÓXIMOS EVENTOS');upEvents.slice(0,8).forEach(x=>lines.push(`- ${fmt(x.event_date)} · ${x.name}${x.place?' · '+x.place:''}`))}lastBrief=lines.join('\n');if($('jf81Brief'))$('jf81Brief').textContent=lastBrief;return lastBrief}
  async function saveBrief(){if(!canWrite())return notify('Tu rol no permite guardar notas');if(!lastBrief)await generateBrief();const {error}=await client.from('notes').insert({note_date:todayIso(),subject:`Resumen operativo – ${fmt(todayIso())}`,reason:lastBrief,responsible_name:profile.full_name||'',status:'Borrador',created_by:session.user.id});if(error)return notify(error.message);notify('Resumen guardado en Notas y solicitudes')}

  function watch(){inject();const hash=(location.hash||'').replace(/^#\//,'');if(hash==='operations81')render().catch(console.error);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
  window.addEventListener('hashchange',()=>setTimeout(watch,80));
  setTimeout(()=>{inject();render().catch(()=>{})},1000);
})();
