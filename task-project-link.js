(function installTaskProjectLink(){
  'use strict';
  if(window.__SORAYA_TASK_PROJECT_LINK__)return;
  window.__SORAYA_TASK_PROJECT_LINK__=true;

  const C=window.JF_CONFIG;
  if(!C||!window.supabase)return;
  const db=window.JF_DB||window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[s]));
  let projects=[];
  let taskLinks=new Map();
  let loading=false;

  function toast(msg){const n=$('#toast');if(!n)return;n.textContent=msg;n.classList.add('show');clearTimeout(window.__sorayaProjectToast);window.__sorayaProjectToast=setTimeout(()=>n.classList.remove('show'),2600)}
  function canWrite(){try{return typeof window.canWrite==='function'?window.canWrite():true}catch{return true}}
  function isProjectCategory(form){return String(form?.elements?.category?.value||'').trim().toLowerCase()==='proyecto'}

  async function loadData(){
    if(loading)return;
    loading=true;
    try{
      const [pp,tp]=await Promise.all([
        db.from('projects').select('id,name,status,start_date,end_date').eq('archived',false).order('name'),
        db.from('tasks').select('id,project_id,project_name,status').eq('archived',false)
      ]);
      if(pp.error)throw pp.error;
      if(tp.error)throw tp.error;
      projects=pp.data||[];
      taskLinks=new Map((tp.data||[]).map(t=>[t.id,t]));
      decorateTaskForm();
      decorateTaskRows();
      decorateProjectCards();
    }catch(e){console.warn('[Soraya proyectos en tareas]',e)}
    finally{loading=false}
  }

  function projectOptions(currentName=''){
    const current=String(currentName||'').trim();
    const options=[`<option value="">${projects.length?'Seleccionar proyecto…':'No hay proyectos cargados'}</option>`];
    for(const p of projects){
      const selected=current&&p.name===current?' selected':'';
      const status=p.status?` · ${p.status}`:'';
      options.push(`<option value="${esc(p.name)}" data-project-id="${esc(p.id)}"${selected}>${esc(p.name)}${esc(status)}</option>`);
    }
    if(current&&!projects.some(p=>p.name===current))options.push(`<option value="${esc(current)}" selected data-legacy="1">${esc(current)} · vínculo anterior sin coincidencia</option>`);
    return options.join('');
  }

  function removeHelp(label){label?.querySelector('.soraya-project-help')?.remove()}
  function addHelp(label,text,warn=false){
    removeHelp(label);
    const help=document.createElement('span');
    help.className='muted small soraya-project-help';
    help.textContent=text;
    if(warn)help.style.color='#9b4b12';
    label.appendChild(help);
  }

  function makeTextProject(current=''){
    const input=document.createElement('input');
    input.name='project_name';
    input.type='text';
    input.value=current||'';
    input.dataset.sorayaProjectText='1';
    return input;
  }

  function decorateTaskForm(){
    const form=$('#entityForm');
    if(!form||form.dataset.resource!=='tasks')return;
    const category=form.elements.category;
    let field=form.querySelector('[name="project_name"]');
    if(!category||!field)return;

    if(category.dataset.sorayaProjectCategoryHook!=='1'){
      category.dataset.sorayaProjectCategoryHook='1';
      category.addEventListener('change',()=>setTimeout(decorateTaskForm,0));
    }

    const label=field.closest('label');
    if(!label)return;
    const current=String(field.value||'');

    if(isProjectCategory(form)){
      if(field.tagName!=='SELECT'||field.dataset.sorayaProjectSelect!=='1'){
        const select=document.createElement('select');
        select.name='project_name';
        select.required=true;
        select.dataset.sorayaProjectSelect='1';
        select.setAttribute('aria-label','Proyecto asociado a la tarea');
        select.innerHTML=projectOptions(current);
        field.replaceWith(select);
        field=select;
      }else{
        const selected=String(field.value||current);
        field.innerHTML=projectOptions(selected);
        field.value=selected;
        field.required=true;
      }
      if(projects.length)addHelp(label,'Elegí uno de los proyectos cargados en Soraya. La tarea quedará vinculada a ese proyecto.');
      else addHelp(label,'No hay proyectos cargados. Primero creá un proyecto en la sección Proyectos para poder asignar esta tarea.',true);
    }else{
      if(field.tagName==='SELECT'&&field.dataset.sorayaProjectSelect==='1'){
        const input=makeTextProject(current);
        field.replaceWith(input);
        field=input;
      }
      field.required=false;
      removeHelp(label);
    }
  }

  async function saveTask(e,originalSubmit){
    const form=e.currentTarget;
    if(form.dataset.resource!=='tasks')return originalSubmit?originalSubmit.call(form,e):undefined;
    e.preventDefault();
    if(!canWrite())return toast('Tu rol es solo de consulta');
    const submit=form.querySelector('button[type="submit"]');
    if(submit){submit.disabled=true;submit.textContent='Guardando…'}
    try{
      const fields=[
        ['title','text'],['description','text'],['category','text'],['status','text'],['priority','text'],['task_date','date'],['task_time','time'],['deadline','date'],
        ['institution_name','text'],['contact_name','text'],['project_name','text'],['reminder','text'],['notes','text'],['recurrence_type','text'],['recurrence_interval','number'],['recurrence_end_date','date'],['google_sync','checkbox']
      ];
      const body={};
      for(const [name,type] of fields){
        const el=form.elements[name];if(!el)continue;
        let v=type==='checkbox'?!!el.checked:el.value;
        if(type==='number')v=v===''?0:Number(v);
        if((type==='date'||type==='time')&&v==='')v=null;
        body[name]=v;
      }

      if(isProjectCategory(form)){
        const projectSelect=form.querySelector('select[data-soraya-project-select="1"]');
        if(!projectSelect?.value)throw new Error(projects.length?'Seleccioná un proyecto para esta tarea.':'No hay proyectos cargados para asignar.');
        const selected=projectSelect.selectedOptions?.[0];
        body.project_name=projectSelect.value;
        body.project_id=selected?.dataset?.projectId||null;
        if(selected?.dataset?.legacy==='1')body.project_id=null;
      }else{
        body.project_id=null;
      }

      const {data:{session}}=await db.auth.getSession();
      if(!session?.user)throw new Error('La sesión venció. Volvé a ingresar.');
      body.created_by=session.user.id;
      const id=form.dataset.id||'';
      const q=id?db.from('tasks').update(body).eq('id',id):db.from('tasks').insert(body);
      const {error}=await q;
      if(error)throw error;
      if(typeof window.closeModal==='function')window.closeModal();
      else {$('#backdrop')?.classList.remove('show');$('#modal')?.classList.remove('show')}
      try{if(typeof loadAll==='function')await loadAll()}catch{}
      await loadData();
      window.dispatchEvent(new CustomEvent('jf:data-changed',{detail:{resource:'tasks',project_id:body.project_id}}));
      toast(id?'Tarea actualizada':'Tarea creada');
    }catch(err){toast(err?.message||'No se pudo guardar la tarea')}
    finally{if(submit){submit.disabled=false;submit.textContent='Guardar'}}
  }

  function installSubmitHook(){
    const form=$('#entityForm');
    if(!form||form.dataset.sorayaProjectSubmit==='1')return;
    form.dataset.sorayaProjectSubmit='1';
    const originalSubmit=form.onsubmit;
    form.onsubmit=function(e){return saveTask(e,originalSubmit)};
  }

  function decorateTaskRows(){
    document.querySelectorAll('#tasksList [data-task-id]').forEach(row=>{
      const id=row.dataset.taskId,t=taskLinks.get(id);if(!t?.project_name)return;
      const tags=row.querySelector('.soraya-task-tags');if(!tags||tags.querySelector('.soraya-project-task-badge'))return;
      const span=document.createElement('span');span.className='badge soraya-project-task-badge';span.textContent=`📂 ${t.project_name}`;tags.appendChild(span);
    });
  }

  function projectIdFromCard(card){
    const b=[...card.querySelectorAll('button')].find(x=>String(x.getAttribute('onclick')||'').includes("openDetails('projects'"));
    const m=String(b?.getAttribute('onclick')||'').match(/openDetails\('projects','([^']+)'\)/);
    return m?.[1]||'';
  }
  function decorateProjectCards(){
    document.querySelectorAll('#projectsList .card').forEach(card=>{
      const id=projectIdFromCard(card);if(!id)return;
      const count=[...taskLinks.values()].filter(t=>t.project_id===id).length;
      let badge=card.querySelector('.soraya-project-count');
      if(!badge){badge=document.createElement('p');badge.className='soraya-project-count muted small';const actions=card.querySelector('.actions');card.insertBefore(badge,actions||null)}
      badge.textContent=`${count} actividad${count===1?'':'es'} vinculada${count===1?'':'s'}`;
    });
  }

  async function appendProjectActivities(projectId){
    const content=$('#detailContent');if(!content)return;
    content.querySelector('.soraya-project-activities')?.remove();
    const {data,error}=await db.from('tasks').select('id,title,status,priority,task_date,deadline').eq('project_id',projectId).eq('archived',false).order('updated_at',{ascending:false});
    if(error)return;
    const list=data||[];
    const section=document.createElement('section');section.className='soraya-project-activities card';
    section.style.marginTop='16px';
    section.innerHTML=`<p class="eyebrow">ACTIVIDADES VINCULADAS</p><h3 style="margin-top:0">Tareas del proyecto <span class="badge">${list.length}</span></h3>${list.length?`<div class="rows">${list.map(t=>`<button type="button" class="row soraya-project-task-link" data-project-task="${esc(t.id)}" style="width:100%;text-align:left;border:1px solid var(--line);cursor:pointer"><span><strong>${esc(t.title)}</strong><span class="meta" style="display:block">${esc(t.status||'Pendiente')} · ${esc(t.priority||'Media')}${t.deadline||t.task_date?' · '+esc(t.deadline||t.task_date):''}</span></span><span>→</span></button>`).join('')}</div>`:'<div class="empty">Todavía no hay tareas vinculadas a este proyecto.</div>'}`;
    const fileBox=content.querySelector('.file-box');
    if(fileBox)content.insertBefore(section,fileBox);else content.appendChild(section);
    section.querySelectorAll('[data-project-task]').forEach(b=>b.onclick=()=>window.openDetails?.('tasks',b.dataset.projectTask));
  }

  function installProjectDetailHook(){
    if(window.__SORAYA_TASK_PROJECT_DETAIL_HOOK__)return;
    window.__SORAYA_TASK_PROJECT_DETAIL_HOOK__=true;
    const base=window.openDetails;
    if(typeof base!=='function')return;
    window.openDetails=async function(resource,id){
      const result=await base.apply(this,arguments);
      if(resource==='projects')await appendProjectActivities(id);
      return result;
    };
  }

  function installObservers(){
    const form=$('#entityForm');if(form)new MutationObserver(()=>decorateTaskForm()).observe(form,{childList:true,subtree:true,attributes:true,attributeFilter:['data-resource']});
    const tasks=$('#tasksList');if(tasks)new MutationObserver(()=>decorateTaskRows()).observe(tasks,{childList:true,subtree:true});
    const projectsBox=$('#projectsList');if(projectsBox)new MutationObserver(()=>decorateProjectCards()).observe(projectsBox,{childList:true,subtree:true});
  }

  async function boot(){
    installSubmitHook();installObservers();installProjectDetailHook();
    await loadData();
    document.addEventListener('click',e=>{if(e.target.closest('[data-add="tasks"],#quickAddBtn,[data-task-edit]'))setTimeout(decorateTaskForm,30)});
    window.addEventListener('jf:data-changed',()=>setTimeout(()=>loadData(),100));
    window.addEventListener('hashchange',()=>setTimeout(()=>{decorateTaskRows();decorateProjectCards()},100));
  }
  setTimeout(boot,700);
  window.SorayaTaskProjects={refresh:loadData};
})();
