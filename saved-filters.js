(function installSorayaSavedFilters(){
  'use strict';
  if(window.__SORAYA_SAVED_FILTERS__)return;
  window.__SORAYA_SAVED_FILTERS__=true;

  const C=window.JF_CONFIG;
  if(!C||!window.supabase)return;
  const db=window.JF_DB||window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  let rows=[],userId='',loaded=false,loading=false,hooked=false;

  function toast(msg){const n=$('#toast');if(!n)return;n.textContent=msg;n.classList.add('show');clearTimeout(window.__sorayaSavedToast);window.__sorayaSavedToast=setTimeout(()=>n.classList.remove('show'),2800)}
  function norm(v){return String(v||'').trim().toLocaleLowerCase('es')}
  function dateIso(d){return new Intl.DateTimeFormat('en-CA',{timeZone:C.timezone||'America/Montevideo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
  function addDaysIso(n){const d=new Date();d.setDate(d.getDate()+n);return dateIso(d)}
  function selected(scope){const id=scope==='search'?'#sorayaSavedSearchSelect':'#sorayaSavedCalendarSelect';return rows.find(x=>x.id===$(id)?.value)||null}

  async function session(){const {data}=await db.auth.getSession();userId=data?.session?.user?.id||'';return data?.session||null}
  async function load(force=false){
    if(loading)return rows;if(loaded&&!force)return rows;loading=true;
    try{
      const s=await session();if(!s?.user)return[];
      const {data,error}=await db.from('user_saved_filters').select('id,name,scope,config,is_default,created_at,updated_at').order('updated_at',{ascending:false});
      if(error)throw error;rows=data||[];loaded=true;renderSelectors();return rows;
    }catch(e){console.warn('[Soraya filtros guardados]',e);return[]}
    finally{loading=false}
  }

  function options(scope){return rows.filter(x=>x.scope===scope).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}
  function renderSelectors(){
    const s=$('#sorayaSavedSearchSelect'),c=$('#sorayaSavedCalendarSelect');
    if(s){const old=s.value;s.innerHTML='<option value="">Seleccionar filtro…</option>'+options('search');if(rows.some(x=>x.id===old))s.value=old}
    if(c){const old=c.value;c.innerHTML='<option value="">Seleccionar filtro…</option>'+options('calendar');if(rows.some(x=>x.id===old))c.value=old}
  }

  function captureSearch(){return{
    query:$('#sorayaSearchInput')?.value||'',
    type:$('#sorayaSearchType')?.value||'',
    status:$('#sorayaSearchStatus')?.value||'',
    priority:$('#sorayaSearchPriority')?.value||'',
    responsible:$('#sorayaSearchResponsible')?.value||'',
    from:$('#sorayaSearchFrom')?.value||'',
    to:$('#sorayaSearchTo')?.value||''
  }}
  function setValue(sel,value,event='change'){const el=$(sel);if(!el)return;el.value=value??'';el.dispatchEvent(new Event(event,{bubbles:true}))}
  function applySearch(cfg={}){
    setValue('#sorayaSearchInput',cfg.query||'','input');
    setValue('#sorayaSearchType',cfg.type||'');
    setValue('#sorayaSearchStatus',cfg.status||'');
    setValue('#sorayaSearchPriority',cfg.priority||'');
    setValue('#sorayaSearchResponsible',cfg.responsible||'');
    setValue('#sorayaSearchFrom',cfg.from||'');
    setValue('#sorayaSearchTo',cfg.to||'');
    setTimeout(()=>$('#sorayaSearchInput')?.focus(),30);
  }
  function applySearchPreset(key){
    const base={query:'',type:'',status:'',priority:'',responsible:'',from:'',to:''};
    if(key==='urgent')base.priority='Urgente';
    if(key==='week'){base.from=dateIso(new Date());base.to=addDaysIso(7)}
    if(key==='meetings')base.type='meetings';
    if(key==='tasks')base.type='tasks';
    applySearch(base);
  }

  function captureCalendar(){
    const mode=$('#jfCalToolbar [data-cal-mode].active')?.dataset.calMode||'';
    const groups=$$('#jfCalToolbar [data-cal-filter].active').map(x=>x.dataset.calFilter).filter(x=>x&&x!=='all');
    return{query:$('#jfCalSearch')?.value||'',groups,mode};
  }
  function applyCalendar(cfg={}){
    const all=$('#jfCalToolbar [data-cal-filter="all"]');if(all)all.click();
    for(const g of cfg.groups||[]){const b=$(`#jfCalToolbar [data-cal-filter="${CSS.escape(g)}"]`);if(b&&!b.classList.contains('active'))b.click()}
    const q=$('#jfCalSearch');if(q){q.value=cfg.query||'';q.dispatchEvent(new Event('input',{bubbles:true}))}
    if(cfg.mode){const m=$(`#jfCalToolbar [data-cal-mode="${CSS.escape(cfg.mode)}"]`);if(m&&!m.classList.contains('active'))m.click()}
  }
  function applyCalendarPreset(key){
    if(key==='google')applyCalendar({groups:['google']});
    if(key==='events')applyCalendar({groups:['event','meeting']});
    if(key==='followup')applyCalendar({groups:['deadline','reminder','followup']});
    if(key==='all')applyCalendar({groups:[]});
  }

  async function save(scope){
    const config=scope==='search'?captureSearch():captureCalendar();
    const suggested=scope==='search'?'Mi filtro':'Mi agenda';
    const name=String(window.prompt('Nombre para guardar este filtro:',suggested)||'').trim();
    if(!name)return;if(name.length>60)return toast('El nombre puede tener hasta 60 caracteres');
    const s=await session();if(!s?.user)return toast('Iniciá sesión para guardar filtros');
    const existing=rows.find(x=>x.scope===scope&&norm(x.name)===norm(name));
    let error;
    if(existing){({error}=await db.from('user_saved_filters').update({name,config}).eq('id',existing.id))}
    else{({error}=await db.from('user_saved_filters').insert({user_id:userId,name,scope,config}))}
    if(error)return toast('No se pudo guardar el filtro');
    await load(true);const sel=scope==='search'?'#sorayaSavedSearchSelect':'#sorayaSavedCalendarSelect';const row=rows.find(x=>x.scope===scope&&norm(x.name)===norm(name));if(row&&$(sel))$(sel).value=row.id;toast(existing?'Filtro actualizado':'Filtro guardado')
  }
  async function remove(scope){const row=selected(scope);if(!row)return toast('Seleccioná un filtro guardado');if(!window.confirm(`¿Eliminar el filtro “${row.name}”?`))return;const {error}=await db.from('user_saved_filters').delete().eq('id',row.id);if(error)return toast('No se pudo eliminar el filtro');await load(true);toast('Filtro eliminado')}
  function applySaved(scope){const row=selected(scope);if(!row)return toast('Seleccioná un filtro guardado');if(scope==='search')applySearch(row.config||{});else applyCalendar(row.config||{});toast(`Filtro aplicado: ${row.name}`)}

  function ensureSearchUI(){
    const aside=$('#sorayaUniversalSearch .soraya-search-filters');if(!aside||$('#sorayaSavedFiltersSearch'))return;
    const box=document.createElement('section');box.id='sorayaSavedFiltersSearch';box.className='jf-saved-filters';
    box.innerHTML=`<div class="jf-saved-title"><strong>⭐ Filtros guardados</strong><button type="button" data-sf-save="search">＋ Guardar actual</button></div><div class="jf-saved-control"><select id="sorayaSavedSearchSelect"><option value="">Seleccionar filtro…</option></select><button type="button" data-sf-apply="search">Aplicar</button><button type="button" class="jf-saved-delete" data-sf-delete="search" aria-label="Eliminar filtro">🗑</button></div><div class="jf-saved-quick"><span>Rápidos:</span><button type="button" data-sf-search-preset="urgent">Urgentes</button><button type="button" data-sf-search-preset="week">Próximos 7 días</button><button type="button" data-sf-search-preset="tasks">Tareas</button><button type="button" data-sf-search-preset="meetings">Reuniones</button></div>`;
    aside.prepend(box);bindBox(box);renderSelectors();
  }
  function ensureCalendarUI(){
    const tb=$('#jfCalToolbar');if(!tb||$('#sorayaSavedFiltersCalendar'))return;
    const box=document.createElement('section');box.id='sorayaSavedFiltersCalendar';box.className='jf-saved-filters jf-saved-calendar';
    box.innerHTML=`<div class="jf-saved-title"><strong>⭐ Filtros guardados</strong><button type="button" data-sf-save="calendar">＋ Guardar vista actual</button></div><div class="jf-saved-control"><select id="sorayaSavedCalendarSelect"><option value="">Seleccionar filtro…</option></select><button type="button" data-sf-apply="calendar">Aplicar</button><button type="button" class="jf-saved-delete" data-sf-delete="calendar" aria-label="Eliminar filtro">🗑</button></div><div class="jf-saved-quick"><span>Rápidos:</span><button type="button" data-sf-cal-preset="all">Todo</button><button type="button" data-sf-cal-preset="events">Eventos + reuniones</button><button type="button" data-sf-cal-preset="followup">Vencimientos + seguimientos</button><button type="button" data-sf-cal-preset="google">Solo Google</button></div>`;
    tb.insertAdjacentElement('afterend',box);bindBox(box);renderSelectors();
  }
  function bindBox(box){
    box.addEventListener('click',e=>{
      const saveBtn=e.target.closest('[data-sf-save]');if(saveBtn)return save(saveBtn.dataset.sfSave);
      const applyBtn=e.target.closest('[data-sf-apply]');if(applyBtn)return applySaved(applyBtn.dataset.sfApply);
      const delBtn=e.target.closest('[data-sf-delete]');if(delBtn)return remove(delBtn.dataset.sfDelete);
      const sp=e.target.closest('[data-sf-search-preset]');if(sp)return applySearchPreset(sp.dataset.sfSearchPreset);
      const cp=e.target.closest('[data-sf-cal-preset]');if(cp)return applyCalendarPreset(cp.dataset.sfCalPreset);
    })
  }

  function hookSearch(){
    if(hooked||!window.SorayaSearch?.open)return;
    hooked=true;const original=window.SorayaSearch.open.bind(window.SorayaSearch);
    window.SorayaSearch.open=(...args)=>{const out=original(...args);setTimeout(()=>{ensureSearchUI();load(false)},40);return out};
  }
  function scan(){hookSearch();ensureSearchUI();ensureCalendarUI()}
  document.addEventListener('click',e=>{if(e.target.closest('[data-view="calendar"],#globalSearch,[data-soraya-search-type]'))setTimeout(scan,80)});
  window.addEventListener('hashchange',()=>setTimeout(scan,100));
  window.addEventListener('jf:data-changed',()=>{loaded=false;setTimeout(()=>load(true),120)});
  setTimeout(async()=>{await load(false);scan()},900);
  setTimeout(scan,1800);setTimeout(scan,3200);
  window.SorayaSavedFilters={load:()=>load(true),saveSearch:()=>save('search'),saveCalendar:()=>save('calendar'),applySearch,applyCalendar};
})();
