(function installSorayaInstitutionFilter(){
  if(window.__SORAYA_INSTITUTION_FILTER__)return;window.__SORAYA_INSTITUTION_FILTER__=true;
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const escHtml=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  let installed=false,originalRenderCards=null;

  function getInstitutions(){try{return Array.isArray(state?.institutions)?state.institutions:[]}catch{return[]}}
  function unique(list,key){return [...new Set(list.map(x=>String(x?.[key]||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}))}
  function ensureUI(){
    const view=document.getElementById('view-institutions'),head=view?.querySelector('.page-head');
    if(!view||!head)return false;
    let bar=document.getElementById('sorayaInstitutionFilter');
    if(!bar){
      bar=document.createElement('section');bar.id='sorayaInstitutionFilter';bar.className='soraya-inst-filter';bar.setAttribute('aria-label','Buscar y filtrar instituciones');
      bar.innerHTML=`<input id="institutionSearchFilter" class="soraya-inst-search" type="search" placeholder="Buscar por nombre, área, localidad, dirección, teléfono o email…" aria-label="Buscar instituciones"><select id="institutionAreaFilter" aria-label="Filtrar por área"><option value="">Todas las áreas</option></select><select id="institutionLocalityFilter" aria-label="Filtrar por localidad"><option value="">Todas las localidades</option></select><button id="institutionClearFilter" type="button" class="secondary-btn">Limpiar</button><div class="soraya-inst-filter-meta"><span id="institutionFilterCount"></span><span id="institutionFilterActive" class="soraya-inst-filter-active"></span></div>`;
      head.insertAdjacentElement('afterend',bar);
      document.getElementById('institutionSearchFilter').addEventListener('input',()=>applyFilters());
      document.getElementById('institutionAreaFilter').addEventListener('change',()=>applyFilters());
      document.getElementById('institutionLocalityFilter').addEventListener('change',()=>applyFilters());
      document.getElementById('institutionClearFilter').addEventListener('click',()=>{document.getElementById('institutionSearchFilter').value='';document.getElementById('institutionAreaFilter').value='';document.getElementById('institutionLocalityFilter').value='';applyFilters()});
    }
    refreshOptions();installed=true;return true;
  }
  function refreshOptions(){
    const list=getInstitutions(),area=document.getElementById('institutionAreaFilter'),loc=document.getElementById('institutionLocalityFilter');if(!area||!loc)return;
    const av=area.value,lv=loc.value;
    area.innerHTML='<option value="">Todas las áreas</option>'+unique(list,'area').map(v=>`<option value="${escHtml(v)}">${escHtml(v)}</option>`).join('');
    loc.innerHTML='<option value="">Todas las localidades</option>'+unique(list,'locality').map(v=>`<option value="${escHtml(v)}">${escHtml(v)}</option>`).join('');
    if([...area.options].some(o=>o.value===av))area.value=av;if([...loc.options].some(o=>o.value===lv))loc.value=lv;
  }
  function renderFiltered(list){
    const el=document.getElementById('institutionsList');if(!el)return;
    if(!list.length){el.innerHTML='<div class="soraya-inst-empty">No encontramos instituciones con los filtros seleccionados.</div>';return}
    try{cardList('institutions',list,x=>x.name,x=>`${x.area||'Sin área'} · ${x.locality||'Flores'}`)}catch(e){console.warn('[Soraya Instituciones] render',e)}
  }
  function applyFilters(){
    if(!ensureUI())return;
    const all=getInstitutions(),q=norm(document.getElementById('institutionSearchFilter')?.value),area=document.getElementById('institutionAreaFilter')?.value||'',loc=document.getElementById('institutionLocalityFilter')?.value||'';
    const filtered=all.filter(x=>{
      if(area&&String(x.area||'')!==area)return false;if(loc&&String(x.locality||'')!==loc)return false;
      if(!q)return true;
      const hay=norm([x.name,x.area,x.locality,x.address,x.phone,x.email,x.website,x.notes].join(' '));return hay.includes(q);
    }).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'es',{sensitivity:'base'}));
    renderFiltered(filtered);
    const count=document.getElementById('institutionFilterCount'),active=document.getElementById('institutionFilterActive');
    if(count)count.innerHTML=`Mostrando <strong>${filtered.length}</strong> de <strong>${all.length}</strong> instituciones`;
    if(active){const chips=[];if(q)chips.push(`Búsqueda: ${document.getElementById('institutionSearchFilter').value.trim()}`);if(area)chips.push(`Área: ${area}`);if(loc)chips.push(`Localidad: ${loc}`);active.innerHTML=chips.map(x=>`<span class="soraya-inst-chip">${escHtml(x)}</span>`).join('')}
  }
  function hookCore(){
    try{
      if(typeof renderCards==='function'&&!originalRenderCards){originalRenderCards=renderCards;renderCards=function(){originalRenderCards();setTimeout(()=>{refreshOptions();applyFilters()},0)}}
    }catch(e){console.warn('[Soraya Instituciones] no se pudo envolver renderCards',e)}
  }
  function boot(){ensureUI();hookCore();applyFilters()}
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="institutions"]'))setTimeout(boot,80)});
  window.addEventListener('jf:data-changed',()=>setTimeout(()=>{refreshOptions();applyFilters()},80));
  setTimeout(boot,900);setTimeout(boot,2200);
  window.SorayaInstitutionFilter={refresh:applyFilters,clear:()=>document.getElementById('institutionClearFilter')?.click()};
})();