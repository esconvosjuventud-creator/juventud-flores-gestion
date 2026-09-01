(function installJFPerformanceV2(){
  if(window.__JF_PERFORMANCE_V2__) return;
  window.__JF_PERFORMANCE_V2__=true;

  const $=id=>document.getElementById(id);
  const db=(typeof sb!=='undefined'&&sb)||window.JF_DB||null;
  const appState=(typeof state!=='undefined'&&state)||window.JF_APP_STATE||null;
  if(!db||!appState) return;
  window.JF_DB=db;
  window.JF_APP_STATE=appState;

  let refreshTimers=new Map();
  let wrappedQuickTask=false,wrappedQuickSchedule=false;

  function toastFast(msg){
    try{ if(typeof toast==='function') return toast(msg); }catch{}
    const el=$('toast');if(el){el.textContent=msg;el.classList.add('show');clearTimeout(window.__jfPerfToast);window.__jfPerfToast=setTimeout(()=>el.classList.remove('show'),2200)}
  }
  function sortResource(resource){
    const a=appState[resource];if(!Array.isArray(a))return;
    const cmp=(field,asc=true)=>(x,y)=>String(x?.[field]||'').localeCompare(String(y?.[field]||''))*(asc?1:-1);
    if(resource==='tasks')a.sort((x,y)=>String(y.updated_at||y.created_at||'').localeCompare(String(x.updated_at||x.created_at||'')));
    else if(resource==='events')a.sort(cmp('event_date',true));
    else if(resource==='meetings')a.sort(cmp('meeting_date',false));
    else if(resource==='projects')a.sort((x,y)=>String(y.updated_at||'').localeCompare(String(x.updated_at||'')));
    else if(resource==='contacts')a.sort(cmp('first_name',true));
    else if(resource==='institutions')a.sort(cmp('name',true));
    else if(resource==='notes')a.sort(cmp('note_date',false));
    else if(resource==='participation_records')a.sort(cmp('activity_date',false));
  }
  function renderAffected(resource){
    requestAnimationFrame(()=>{
      try{
        if(resource==='tasks'){
          if(typeof renderTasks==='function')renderTasks();
          if(typeof renderCalendar==='function')renderCalendar();
          if(typeof renderDashboard==='function')renderDashboard();
        }else if(resource==='events'){
          if(typeof renderCards==='function')renderCards();
          if(typeof renderCalendar==='function')renderCalendar();
          if(typeof renderDashboard==='function')renderDashboard();
        }else if(resource==='meetings'){
          if(typeof renderCards==='function')renderCards();
          if(typeof renderDashboard==='function')renderDashboard();
        }else if(resource==='notifications'){
          if(typeof renderNotifications==='function')renderNotifications();
        }else if(typeof renderCards==='function')renderCards();
      }catch(e){console.warn('[Rendimiento] render incremental',e)}
      window.dispatchEvent(new CustomEvent('jf:state-updated',{detail:{resource}}));
    });
  }
  function patchRecord(resource,row){
    if(!row||!Array.isArray(appState[resource]))return;
    const arr=appState[resource],i=arr.findIndex(x=>x.id===row.id);
    if(i>=0)arr[i]={...arr[i],...row};else arr.unshift(row);
    sortResource(resource);renderAffected(resource);
  }
  function removeRecord(resource,id){
    if(!Array.isArray(appState[resource]))return;
    const i=appState[resource].findIndex(x=>x.id===id);if(i>=0)appState[resource].splice(i,1);renderAffected(resource);
  }
  function queryFor(resource){
    let q=db.from(resource).select('*');
    if(!['participation_records'].includes(resource))q=q.eq('archived',false);
    if(resource==='tasks')q=q.order('updated_at',{ascending:false});
    else if(resource==='events')q=q.order('event_date');
    else if(resource==='meetings')q=q.order('meeting_date',{ascending:false});
    else if(resource==='projects')q=q.order('updated_at',{ascending:false});
    else if(resource==='contacts')q=q.order('first_name');
    else if(resource==='institutions')q=q.order('name');
    else if(resource==='notes')q=q.order('note_date',{ascending:false});
    else if(resource==='participation_records')q=q.order('activity_date',{ascending:false});
    else if(resource==='opportunities')q=q.order('featured',{ascending:false});
    return q;
  }
  async function refreshResource(resource){
    if(!resource||!Array.isArray(appState[resource]))return;
    const {data,error}=await queryFor(resource);if(error){console.warn('[Rendimiento] refresh',resource,error);return}
    appState[resource]=data||[];renderAffected(resource);
  }
  function scheduleRefresh(resource,delay=250){
    clearTimeout(refreshTimers.get(resource));
    const t=setTimeout(()=>{refreshTimers.delete(resource);refreshResource(resource)},delay);refreshTimers.set(resource,t);
  }

  async function fastEntitySave(e){
    e.preventDefault();
    const form=e.target,resource=form.dataset.resource,id=form.dataset.id;
    if(!resource||typeof schemas==='undefined'||!schemas[resource])return;
    const schema=schemas[resource],body={};
    for(const[name,,type]of schema.fields){const el=form.elements[name];if(!el)continue;let v=type==='checkbox'?el.checked:el.value;if(type==='number')v=v===''?0:Number(v);if((type==='date'||type==='time')&&v==='')v=null;body[name]=v}
    if(!id)body.created_by=appState.user?.id||null;
    const btn=form.querySelector('button[type="submit"]'),old=btn?.textContent;
    if(btn){btn.disabled=true;btn.textContent='Guardando…'}
    try{
      let q=id?db.from(resource).update(body).eq('id',id):db.from(resource).insert(body);
      const {data,error}=await q.select('*').single();
      if(error)throw error;
      if(typeof closeModal==='function')closeModal();else window.closeModal?.();
      patchRecord(resource,data);
      toastFast(id?'Registro actualizado':'Registro creado');
      if(resource==='meetings'&&String(body.commitments||'').trim())scheduleRefresh('tasks',700);
    }catch(err){toastFast(err?.message||'No se pudo guardar');if(btn){btn.disabled=false;btn.textContent=old||'Guardar'}}
  }

  function installEntityForm(){const f=$('entityForm');if(f&&f.onsubmit!==fastEntitySave)f.onsubmit=fastEntitySave}

  function wrapQuickSchedule(){
    if(wrappedQuickSchedule||!window.JFQuickSchedule?.open)return;
    wrappedQuickSchedule=true;const originalOpen=window.JFQuickSchedule.open.bind(window.JFQuickSchedule);
    window.JFQuickSchedule.open=async function(kind='meeting'){
      await originalOpen(kind);
      const saveBtn=$('jfqsSave');if(!saveBtn)return;
      saveBtn.onclick=async()=>{
        const title=$('jfqsTitle')?.value.trim(),date=$('jfqsDate')?.value,start=$('jfqsStart')?.value||null,place=$('jfqsPlace')?.value.trim()||'';
        if(!title)return toastFast(kind==='event'?'Ingresá el nombre del evento':'Ingresá el tema de la reunión');
        if(!date)return toastFast('Indicá la fecha antes de guardar');
        saveBtn.disabled=true;const old=saveBtn.textContent;saveBtn.textContent='Guardando…';
        const uid=appState.user?.id;
        const body=kind==='event'?{name:title,event_date:date,start_time:start,end_time:$('jfqsEnd')?.value||null,place,responsible_id:uid,responsible_name:appState.profile?.full_name||'',created_by:uid}:{subject:title,meeting_date:date,meeting_time:start,place,institutions:$('jfqsInstitutions')?.value.trim()||'',created_by:uid};
        try{
          const table=kind==='event'?'events':'meetings';const {data,error}=await db.from(table).insert(body).select('*').single();if(error)throw error;
          window.closeDetail?.();patchRecord(table,data);toastFast(kind==='event'?'Evento creado':'Reunión creada');
        }catch(err){saveBtn.disabled=false;saveBtn.textContent=old;toastFast(err?.message||'No se pudo guardar')}
      };
    };
  }

  function wrapQuickTask(){
    if(wrappedQuickTask||!window.JFQuickTask?.open)return;
    wrappedQuickTask=true;const originalOpen=window.JFQuickTask.open.bind(window.JFQuickTask);
    window.JFQuickTask.open=async function(kind='task'){
      await originalOpen(kind);
      const saveBtn=$('jfqtSave');if(!saveBtn)return;
      saveBtn.onclick=async()=>{
        const title=$('jfqtTitle')?.value.trim();if(!title)return toastFast('Escribí un título o una frase');
        saveBtn.disabled=true;const old=saveBtn.textContent;saveBtn.textContent='Guardando…';
        const uid=appState.user?.id,body={title,description:'',category:$('jfqtCategory')?.value||'Seguimiento',status:$('jfqtStatus')?.value||'Pendiente',priority:$('jfqtPriority')?.value||'Media',task_date:$('jfqtDate')?.value||null,task_time:$('jfqtTime')?.value||null,deadline:null,responsible_id:$('jfqtAssign')?.value==='self'?uid:null,reminder:$('jfqtReminder')?.value||'',notes:'',created_by:uid};
        try{const {data,error}=await db.from('tasks').insert(body).select('*').single();if(error)throw error;window.closeDetail?.();patchRecord('tasks',data);toastFast(kind==='reminder'?'Recordatorio creado':'Tarea creada')}catch(err){saveBtn.disabled=false;saveBtn.textContent=old;toastFast(err?.message||'No se pudo guardar')}
      };
    };
  }

  window.addEventListener('jf:data-changed',e=>{const r=e.detail?.resource;if(r)scheduleRefresh(r,180)});
  window.addEventListener('jf:resource-refresh',e=>{const r=e.detail?.resource;if(r)scheduleRefresh(r,0)});

  window.JFPerf={db,state:appState,patchRecord,removeRecord,refreshResource,scheduleRefresh,renderAffected};
  installEntityForm();
  let tries=0;const t=setInterval(()=>{installEntityForm();wrapQuickTask();wrapQuickSchedule();if(++tries>20||(wrappedQuickTask&&wrappedQuickSchedule))clearInterval(t)},120);
})();