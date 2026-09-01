(function installTeamUIV3(){
  if(window.__JF_TEAM_UI_V3__) return;
  window.__JF_TEAM_UI_V3__=true;

  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const RECENT_KEY='jf_team_recent_views_v3';
  const COUNT_KEY='jf_team_view_counts_v3';
  const COLLAPSE_KEY='jf_team_sidebar_collapsed_v3';
  let palette=null,scanQueued=false;

  const VIEW_HINTS={
    dashboard:'Inicio y prioridades del día',tasks:'Pendientes y seguimientos',calendar:'Agenda general',events:'Actividades y eventos',meetings:'Coordinaciones y reuniones',projects:'Proyectos de la Oficina',contacts:'Personas de contacto',institutions:'Red institucional',notes:'Notas y solicitudes',participation:'Alcance y participación',opportunities:'Becas, cursos y oportunidades',checkin:'Asistencia mediante QR',reports:'Informes y exportaciones',settings:'Usuarios e integraciones',
    operations81:'Centro operativo',inbox82:'Entrada y salida institucional',cases82:'Expedientes y solicitudes',teamagenda82:'Agenda compartida',assignments82:'Responsabilidades del equipo',workflow83:'Trámites y derivaciones',approvals83:'Revisión y visto bueno',mywork83:'Trabajo personal',audit83:'Trazabilidad institucional',documents84:'Documentos oficiales',documentbook84:'Libro y archivo',management85:'Indicadores de gestión',goals85:'Metas institucionales',monthlyreport85:'Informe mensual',poa86:'Plan Operativo Anual',assistant:'Asistente Juventud'
  };

  function esc(v=''){return String(v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]))}
  function appVisible(){const a=$('#app');return a&&!a.classList.contains('hidden')}
  function navButtons(){return $$('#mainNav button[data-view]')}
  function originalLabel(b){return b?.dataset.jfTeamLabel||b?.textContent?.trim()||''}
  function splitLabel(label){const m=String(label).trim().match(/^(\S+)\s+(.+)$/);return m?{icon:m[1],text:m[2]}:{icon:'•',text:label}}
  function viewLabel(view){const b=navButtons().find(x=>x.dataset.view===view);return b?splitLabel(originalLabel(b)).text:view}

  function decorateButton(b){
    if(!b||b.dataset.jfTeamDecorated==='1')return;
    b.dataset.jfTeamDecorated='1';
    b.dataset.jfTeamLabel=b.textContent.trim();
    const parts=splitLabel(b.dataset.jfTeamLabel);
    b.innerHTML=`<span class="jf-team-nav-icon" aria-hidden="true">${esc(parts.icon)}</span><span class="jf-team-nav-text">${esc(parts.text)}</span>`;
    b.title=parts.text;
    b.setAttribute('aria-label',parts.text);
    b.addEventListener('click',()=>recordView(b.dataset.view));
  }

  function ensureSidebarTools(){
    const sidebar=$('#sidebar'),brand=sidebar?.querySelector('.brand'),nav=$('#mainNav');
    if(!sidebar||!brand||!nav)return;
    if(!$('#jfTeamSidebarTop')){
      const tools=document.createElement('div');
      tools.id='jfTeamSidebarTop';tools.className='jf-team-sidebar-top';
      tools.innerHTML=`<button id="jfTeamCollapse" class="jf-team-collapse" type="button" aria-label="Contraer menú" title="Contraer menú"><span>⇤</span></button><button id="jfTeamNavSearchBtn" class="jf-team-nav-search" type="button"><span>⌕</span><span class="jf-team-nav-search-copy">Buscar módulo</span><kbd>⌘K</kbd></button>`;
      brand.insertAdjacentElement('afterend',tools);
      $('#jfTeamCollapse').onclick=toggleCollapse;
      $('#jfTeamNavSearchBtn').onclick=()=>openPalette('');
    }
    if(!$('#jfTeamRecents')){
      const recent=document.createElement('div');recent.id='jfTeamRecents';recent.className='jf-team-recents';nav.insertAdjacentElement('beforebegin',recent);
    }
    applyCollapsedState();renderRecents();
  }

  function toggleCollapse(){
    if(matchMedia('(max-width:980px)').matches)return;
    const next=!document.body.classList.contains('jf-team-sidebar-collapsed');
    document.body.classList.toggle('jf-team-sidebar-collapsed',next);
    localStorage.setItem(COLLAPSE_KEY,next?'1':'0');
    const b=$('#jfTeamCollapse');if(b){b.title=next?'Expandir menú':'Contraer menú';b.setAttribute('aria-label',b.title)}
  }
  function applyCollapsedState(){
    if(matchMedia('(max-width:980px)').matches){document.body.classList.remove('jf-team-sidebar-collapsed');return}
    document.body.classList.toggle('jf-team-sidebar-collapsed',localStorage.getItem(COLLAPSE_KEY)==='1');
  }

  function loadJSON(k,fallback){try{return JSON.parse(localStorage.getItem(k)||'')||fallback}catch{return fallback}}
  function recordView(view){
    if(!view)return;
    const rec=loadJSON(RECENT_KEY,[]).filter(x=>x!==view);rec.unshift(view);localStorage.setItem(RECENT_KEY,JSON.stringify(rec.slice(0,5)));
    const counts=loadJSON(COUNT_KEY,{});counts[view]=(counts[view]||0)+1;localStorage.setItem(COUNT_KEY,JSON.stringify(counts));
    renderRecents();setTimeout(syncContext,40);
  }
  function renderRecents(){
    const box=$('#jfTeamRecents');if(!box)return;
    const rec=loadJSON(RECENT_KEY,[]).filter(v=>navButtons().some(b=>b.dataset.view===v)).slice(0,4);
    if(!rec.length){box.innerHTML='';box.classList.add('hidden');return}
    box.classList.remove('hidden');
    box.innerHTML=`<div class="jf-team-recent-label">Recientes</div><div class="jf-team-recent-list">${rec.map(v=>{const b=navButtons().find(x=>x.dataset.view===v),p=splitLabel(originalLabel(b));return `<button type="button" data-jf-team-recent="${esc(v)}" title="${esc(p.text)}"><span>${esc(p.icon)}</span><span>${esc(p.text)}</span></button>`}).join('')}</div>`;
    box.querySelectorAll('[data-jf-team-recent]').forEach(b=>b.onclick=()=>navButtons().find(x=>x.dataset.view===b.dataset.jfTeamRecent)?.click());
  }

  function ensureContext(){
    const top=$('.topbar');if(!top)return;
    if(!$('#jfTeamContext')){
      const c=document.createElement('div');c.id='jfTeamContext';c.className='jf-team-context';c.innerHTML='<span class="jf-team-context-kicker">JUVENTUD FLORES</span><strong id="jfTeamContextTitle">Mi día</strong>';
      const search=top.querySelector('.search');top.insertBefore(c,search||top.firstChild);
    }
    const search=$('.topbar .search');
    if(search&&!search.dataset.jfTeamSearch){
      search.dataset.jfTeamSearch='1';search.classList.add('jf-team-command-search');
      const input=search.querySelector('input');if(input){input.placeholder='Buscar módulo, acción o contenido…';input.setAttribute('aria-label','Buscar en Juventud Flores');input.addEventListener('focus',()=>openPalette(input.value));input.addEventListener('input',()=>{if(appVisible())openPalette(input.value,{keepFocus:true})});input.addEventListener('keydown',e=>{if(e.key==='Escape'){closePalette();input.blur()}})}
      const hint=document.createElement('kbd');hint.className='jf-team-search-kbd';hint.textContent='⌘K';search.appendChild(hint);
    }
  }

  function activeView(){return navButtons().find(b=>b.classList.contains('active'))?.dataset.view||(location.hash||'#/dashboard').replace('#/','').split('?')[0]}
  function syncContext(){
    const view=activeView(),title=viewLabel(view);const node=$('#jfTeamContextTitle');if(node)node.textContent=title||'Juventud Flores';
    document.body.dataset.jfTeamView=view||'';
  }

  function buildPalette(){
    if(palette)return palette;
    palette=document.createElement('div');palette.id='jfTeamPalette';palette.className='jf-team-palette';palette.setAttribute('aria-hidden','true');
    palette.innerHTML=`<div class="jf-team-palette-backdrop" data-jf-palette-close></div><section class="jf-team-palette-panel" role="dialog" aria-modal="true" aria-label="Buscar en Juventud Flores"><div class="jf-team-palette-input"><span>⌕</span><input id="jfTeamPaletteInput" placeholder="Escribí: tareas, expediente, reunión…"><kbd>ESC</kbd></div><div id="jfTeamPaletteResults" class="jf-team-palette-results"></div><footer><span>↑↓ navegar</span><span>Enter abrir</span><span>⌘K buscar</span></footer></section>`;
    document.body.appendChild(palette);
    palette.querySelectorAll('[data-jf-palette-close]').forEach(x=>x.onclick=closePalette);
    const input=$('#jfTeamPaletteInput');input.addEventListener('input',()=>renderPalette(input.value));input.addEventListener('keydown',paletteKeys);
    return palette;
  }

  function commands(){
    const modules=navButtons().map(b=>{const p=splitLabel(originalLabel(b));return{kind:'module',view:b.dataset.view,icon:p.icon,title:p.text,subtitle:VIEW_HINTS[b.dataset.view]||'Abrir módulo',keywords:`${p.text} ${VIEW_HINTS[b.dataset.view]||''}`}});
    const actions=[
      {kind:'action',id:'new-task',icon:'✅',title:'Nueva tarea rápida',subtitle:'Crear desde una frase',keywords:'tarea agregar pendiente seguimiento'},
      {kind:'action',id:'new-reminder',icon:'⏰',title:'Nuevo recordatorio',subtitle:'Crear recordatorio rápido',keywords:'recordatorio aviso alarma'},
      {kind:'action',id:'new-meeting',icon:'🤝',title:'Nueva reunión',subtitle:'Crear desde una frase',keywords:'reunion coordinación encuentro'},
      {kind:'action',id:'new-event',icon:'🎪',title:'Nuevo evento',subtitle:'Crear desde una frase',keywords:'evento actividad jornada taller'},
      {kind:'action',id:'quick-add',icon:'＋',title:'Agregar otro registro',subtitle:'Abrir carga ultrarrápida',keywords:'agregar nota comunicacion expediente'}
    ];
    return [...actions,...modules];
  }
  function searchScore(item,q){
    if(!q)return item.kind==='action'?20:10;
    const n=(`${item.title} ${item.subtitle} ${item.keywords||''}`).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const terms=q.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().split(/\s+/).filter(Boolean);
    if(!terms.every(t=>n.includes(t)))return-1;
    let score=terms.reduce((s,t)=>s+(n.startsWith(t)?8:3),0);if(item.title.toLowerCase().includes(q.toLowerCase()))score+=8;return score;
  }
  function renderPalette(q=''){
    const box=$('#jfTeamPaletteResults');if(!box)return;
    const counts=loadJSON(COUNT_KEY,{}),rows=commands().map(x=>({...x,score:searchScore(x,q)+(x.view?Math.min(8,counts[x.view]||0):0)})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score).slice(0,12);
    box.innerHTML=rows.length?rows.map((x,i)=>`<button type="button" class="jf-team-command ${i===0?'selected':''}" data-jf-command-kind="${x.kind}" data-jf-command-id="${esc(x.view||x.id)}"><span class="jf-team-command-icon">${esc(x.icon)}</span><span><strong>${esc(x.title)}</strong><small>${esc(x.subtitle)}</small></span><span class="jf-team-command-enter">↵</span></button>`).join(''):'<div class="jf-team-command-empty">No encontré un módulo o acción con ese nombre.</div>';
    box.querySelectorAll('.jf-team-command').forEach(b=>b.onclick=()=>runCommand(b));
  }
  function openPalette(query='',opts={}){
    if(!appVisible())return;buildPalette();palette.classList.add('open');palette.setAttribute('aria-hidden','false');
    const input=$('#jfTeamPaletteInput');input.value=query||'';renderPalette(input.value);if(!opts.keepFocus)setTimeout(()=>input.focus(),10);
  }
  function closePalette(){if(!palette)return;palette.classList.remove('open');palette.setAttribute('aria-hidden','true')}
  function paletteKeys(e){
    const rows=$$('#jfTeamPaletteResults .jf-team-command');if(!rows.length)return;let i=Math.max(0,rows.findIndex(x=>x.classList.contains('selected')));
    if(e.key==='ArrowDown'){e.preventDefault();rows[i].classList.remove('selected');i=(i+1)%rows.length;rows[i].classList.add('selected');rows[i].scrollIntoView({block:'nearest'})}
    else if(e.key==='ArrowUp'){e.preventDefault();rows[i].classList.remove('selected');i=(i-1+rows.length)%rows.length;rows[i].classList.add('selected');rows[i].scrollIntoView({block:'nearest'})}
    else if(e.key==='Enter'){e.preventDefault();runCommand(rows[i])}
    else if(e.key==='Escape'){e.preventDefault();closePalette()}
  }
  function runCommand(el){
    const kind=el.dataset.jfCommandKind,id=el.dataset.jfCommandId;closePalette();
    if(kind==='module'){navButtons().find(b=>b.dataset.view===id)?.click();return}
    if(id==='new-task'&&window.JFQuickTask?.open)return window.JFQuickTask.open('task');
    if(id==='new-reminder'&&window.JFQuickTask?.open)return window.JFQuickTask.open('reminder');
    if(id==='new-meeting'&&window.JFQuickSchedule?.open)return window.JFQuickSchedule.open('meeting');
    if(id==='new-event'&&window.JFQuickSchedule?.open)return window.JFQuickSchedule.open('event');
    document.getElementById('quickAddBtn')?.click();
  }

  function ensureMobileScrim(){
    if($('#jfTeamSidebarScrim'))return;const s=document.createElement('div');s.id='jfTeamSidebarScrim';s.className='jf-team-sidebar-scrim';s.onclick=()=>$('#sidebar')?.classList.remove('open');document.body.appendChild(s)
  }
  function syncScrim(){const s=$('#jfTeamSidebarScrim'),side=$('#sidebar');if(s&&side)s.classList.toggle('show',matchMedia('(max-width:980px)').matches&&side.classList.contains('open')&&appVisible())}

  function improvePageHeads(){
    $$('.view .page-head').forEach(h=>{if(h.dataset.jfTeamHead)return;h.dataset.jfTeamHead='1';const div=h.querySelector(':scope > div');if(div&&!div.querySelector('.jf-team-page-subtitle')){const eyebrow=div.querySelector('.eyebrow'),title=div.querySelector('h1');const view=h.closest('.view')?.id?.replace('view-','');const hint=VIEW_HINTS[view];if(hint&&title){const p=document.createElement('p');p.className='jf-team-page-subtitle';p.textContent=hint;title.insertAdjacentElement('afterend',p)}}});
  }

  function keyboard(e){
    const target=e.target;if(target&&['INPUT','TEXTAREA','SELECT'].includes(target.tagName)&&!(e.metaKey||e.ctrlKey))return;
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openPalette('')}
    if((e.metaKey||e.ctrlKey)&&e.key==='Enter'&&appVisible()){e.preventDefault();document.getElementById('quickAddBtn')?.click()}
  }

  function scan(){
    if(scanQueued)return;scanQueued=true;requestAnimationFrame(()=>{scanQueued=false;if(!appVisible())return;document.body.classList.add('jf-team-ui-v3');navButtons().forEach(decorateButton);ensureSidebarTools();ensureContext();ensureMobileScrim();improvePageHeads();syncContext();syncScrim()})
  }

  document.addEventListener('keydown',keyboard);
  window.addEventListener('resize',()=>{applyCollapsedState();syncScrim()});
  window.addEventListener('hashchange',()=>setTimeout(()=>{syncContext();scan()},60));
  new MutationObserver(scan).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  scan();setTimeout(scan,300);setTimeout(scan,1200);
})();
