(function installSorayaDuplicateDetector(){
  if(window.__SORAYA_DUPLICATE_DETECTOR__)return;
  window.__SORAYA_DUPLICATE_DETECTOR__=true;
  const C=window.JF_CONFIG;
  if(!C||!window.supabase)return;
  const db=window.JF_DB||window.JFPerf?.db||window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  const fmt=d=>{if(!d)return'Sin fecha';try{return new Intl.DateTimeFormat('es-UY',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(String(d).slice(0,10)+'T12:00:00'))}catch{return String(d)}};
  const SOURCES={
    tasks:{label:'Tareas',table:'tasks',title:'title',date:'task_date',status:'status',priority:'priority',institution:'institution_name',responsible:'responsible_name',detail:'description',view:'tasks'},
    notes:{label:'Notas',table:'notes',title:'subject',date:'note_date',status:'status',priority:null,institution:'department',responsible:'responsible_name',detail:'reason',view:'notes'},
    meetings:{label:'Reuniones',table:'meetings',title:'subject',date:'meeting_date',status:null,priority:null,institution:'institutions',responsible:null,detail:'participants',view:'meetings'},
    events:{label:'Eventos',table:'events',title:'name',date:'event_date',status:null,priority:null,institution:'organizer',responsible:'responsible_name',detail:'description',view:'events'},
    projects:{label:'Proyectos',table:'projects',title:'name',date:'start_date',status:'status',priority:null,institution:null,responsible:null,detail:'objective',view:'projects'},
    messages:{label:'Comunicaciones',table:'institutional_messages',title:'subject',date:'registered_date',status:'status',priority:'priority',institution:'institution_name',responsible:'assigned_name',detail:'summary',view:'inbox82'},
    cases:{label:'Expedientes',table:'institutional_cases',title:'title',date:'opened_date',status:'status',priority:'priority',institution:'institution_name',responsible:'assigned_name',detail:'description',view:'cases82'},
    opportunities:{label:'Oportunidades',table:'opportunities',title:'title',date:'deadline',status:'status',priority:null,institution:'organization',responsible:null,detail:'summary',view:'opportunities'}
  };
  const STOP=new Set(['reunion','reuniones','evento','eventos','tarea','tareas','nota','notas','solicitud','solicitudes','expediente','expedientes','actividad','actividades','con','de','del','la','las','el','los','para','por','en','a','al','una','un','y']);
  let profile=null,session=null,pairs=[],ignored=new Set(),lastScan=0,scanning=false;

  function norm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
  function core(v){const n=norm(v),t=n.split(' ').filter(x=>x&&!STOP.has(x));return(t.length?t.join(' '):n)}
  function grams(s){const x=' '+s+' ',g=[];for(let i=0;i<x.length-1;i++)g.push(x.slice(i,i+2));return g}
  function dice(a,b){if(!a||!b)return 0;if(a===b)return 1;const ga=grams(a),gb=grams(b),m=new Map();ga.forEach(x=>m.set(x,(m.get(x)||0)+1));let hit=0;for(const x of gb){const n=m.get(x)||0;if(n){hit++;m.set(x,n-1)}}return (2*hit)/(ga.length+gb.length)}
  function jaccard(a,b){const A=new Set(a.split(' ').filter(Boolean)),B=new Set(b.split(' ').filter(Boolean));if(!A.size||!B.size)return 0;let i=0;A.forEach(x=>{if(B.has(x))i++});return i/(A.size+B.size-i)}
  function similarity(a,b){const x=core(a),y=core(b);if(!x||!y)return 0;if(x===y)return 1;return .55*dice(x,y)+.45*jaccard(x,y)}
  function dayDiff(a,b){if(!a||!b)return null;const x=new Date(String(a).slice(0,10)+'T12:00:00'),y=new Date(String(b).slice(0,10)+'T12:00:00');if(Number.isNaN(x)||Number.isNaN(y))return null;return Math.abs(Math.round((x-y)/86400000))}
  function minuteDiff(a,b){if(!a||!b)return null;const x=new Date(a),y=new Date(b);if(Number.isNaN(x)||Number.isNaN(y))return null;return Math.abs((x-y)/60000)}
  function pairKey(resource,a,b){return `${resource}:${[a.id,b.id].sort().join(':')}`}
  function recordText(spec,x){return [x?.[spec.title],x?.[spec.detail],x?.[spec.institution],x?.[spec.responsible]].filter(Boolean).join(' · ')}
  function scorePair(resource,spec,a,b){
    const ts=similarity(a[spec.title],b[spec.title]);if(ts<.68)return null;
    const dd=dayDiff(a[spec.date],b[spec.date]),cd=minuteDiff(a.created_at,b.created_at);
    const instA=norm(a[spec.institution]),instB=norm(b[spec.institution]),inst=!!instA&&instA===instB;
    if(dd!==null&&dd>14&&!(ts===1&&cd!==null&&cd<=30))return null;
    let score=ts*76;
    if(dd===0)score+=17;else if(dd!==null&&dd<=2)score+=12;else if(dd!==null&&dd<=7)score+=6;
    else if(dd===null)score+=resource==='projects'?10:3;
    if(inst)score+=7;
    if(cd!==null&&cd<=10)score+=7;else if(cd!==null&&cd<=30)score+=4;
    if(ts===1&&dd===0)score=Math.max(score,98);
    if(ts===1&&dd===null&&cd!==null&&cd<=30)score=Math.max(score,96);
    score=Math.min(100,Math.round(score));
    if(score<80)return null;
    return {resource,spec,a,b,score,level:score>=92?'Alta':'Media',key:pairKey(resource,a,b),titleSim:ts,dateDiff:dd,createdDiff:cd,institutionMatch:inst};
  }
  function findPairs(resource,rows){const spec=SOURCES[resource],out=[];for(let i=0;i<rows.length;i++){for(let j=i+1;j<rows.length;j++){const p=scorePair(resource,spec,rows[i],rows[j]);if(p&&!ignored.has(p.key))out.push(p)}}return out.sort((a,b)=>b.score-a.score)}
  async function auth(){const{data:{session:s}}=await db.auth.getSession();session=s;if(!s?.user){profile=null;return null}const{data}=await db.from('profiles').select('id,full_name,role,active').eq('id',s.user.id).maybeSingle();profile=data||null;return profile}
  const canWrite=()=>profile?.active&&['admin','equipo'].includes(profile.role);
  function notice(msg){const n=$('toast');if(n){n.textContent=msg;n.classList.add('show');clearTimeout(window.__dupToast);window.__dupToast=setTimeout(()=>n.classList.remove('show'),2600)}else console.log(msg)}

  function inject(){
    const main=document.querySelector('.main'),nav=$('mainNav');if(!main||!nav)return;
    if(!$('view-duplicates')){
      const s=document.createElement('section');s.id='view-duplicates';s.className='view';s.innerHTML=`<div class="page-head"><div><p class="eyebrow">CONTROL DE CALIDAD</p><h1>Duplicados</h1><p class="muted">Soraya compara registros similares para ayudarte a detectar cargas repetidas. Nunca borra nada automáticamente.</p></div><button id="dupScanBtn" class="primary-btn">🔎 Revisar duplicados</button></div><div class="soraya-dup-toolbar"><select id="dupType"><option value="">Todos los tipos</option>${Object.entries(SOURCES).map(([k,s])=>`<option value="${k}">${s.label}</option>`).join('')}</select><select id="dupLevel"><option value="">Todas las coincidencias</option><option value="Alta">Alta probabilidad</option><option value="Media">Probabilidad media</option></select><button id="dupClearFilters" class="secondary-btn">Limpiar filtros</button></div><div id="dupSummary" class="soraya-dup-summary"></div><div id="dupList" class="soraya-dup-list"><div class="soraya-dup-safe">Tocá <strong>Revisar duplicados</strong> para analizar los registros actuales.</div></div>`;
      const settings=$('view-settings');settings?main.insertBefore(s,settings):main.appendChild(s);
    }
    if(!$('dupNav')){const b=document.createElement('button');b.id='dupNav';b.dataset.view='duplicates';b.innerHTML='🧹 Duplicados <span id="dupNavBadge" class="soraya-dup-nav-badge" style="display:none">0</span>';const settings=nav.querySelector('[data-view="settings"]');settings?nav.insertBefore(b,settings):nav.appendChild(b);b.onclick=()=>openView()}
    if(!$('dupScanBtn').dataset.bound){$('dupScanBtn').dataset.bound='1';$('dupScanBtn').onclick=()=>scan(true);$('dupType').onchange=render;$('dupLevel').onchange=render;$('dupClearFilters').onclick=()=>{$('dupType').value='';$('dupLevel').value='';render()}}
  }
  function openView(){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$('view-duplicates')?.classList.add('active');document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='duplicates'));$('sidebar')?.classList.remove('open');history.replaceState(null,'','#/duplicates');if(!lastScan)scan(false);else render()}

  async function loadIgnored(){const{data}=await db.from('duplicate_reviews').select('pair_key');ignored=new Set((data||[]).map(x=>x.pair_key))}
  async function loadSource(key){const s=SOURCES[key];let q=db.from(s.table).select('*').eq('archived',false).limit(1000);const{data,error}=await q;if(error){console.warn('[Duplicados]',key,error);return[]}return data||[]}
  async function scan(userTriggered=false){
    if(scanning)return;scanning=true;const btn=$('dupScanBtn');if(btn){btn.disabled=true;btn.textContent='Revisando…'}
    try{await auth();if(!profile?.active)return;await loadIgnored();const entries=await Promise.all(Object.keys(SOURCES).map(async k=>[k,await loadSource(k)]));pairs=entries.flatMap(([k,rows])=>findPairs(k,rows));lastScan=Date.now();render();updateBadge();if(userTriggered)notice(pairs.length?`Soraya encontró ${pairs.length} posible${pairs.length===1?'':'s'} duplicado${pairs.length===1?'':'s'}`:'No se encontraron posibles duplicados')}
    finally{scanning=false;if(btn){btn.disabled=false;btn.textContent='🔎 Revisar duplicados'}}
  }
  function updateBadge(){const b=$('dupNavBadge');if(!b)return;b.textContent=String(pairs.length);b.style.display=pairs.length?'inline-flex':'none'}
  function why(p){const parts=[`${p.score}% de coincidencia`];if(p.dateDiff===0)parts.push('misma fecha');else if(p.dateDiff!==null&&p.dateDiff<=2)parts.push('fechas muy cercanas');if(p.institutionMatch)parts.push('misma institución');if(p.createdDiff!==null&&p.createdDiff<=30)parts.push('creados casi al mismo tiempo');return parts.join(' · ')}
  function recordCard(p,x,side){const s=p.spec,meta=[x[s.date]?fmt(x[s.date]):'',x[s.status]||'',x[s.priority]||'',x[s.institution]||'',x[s.responsible]||''].filter(Boolean).join(' · '),detail=String(x[s.detail]||'').trim();return `<div class="soraya-dup-record"><h4>${side} · ${esc(x[s.title]||'Sin título')}</h4><p class="soraya-dup-meta">${esc(meta||'Sin datos adicionales')}</p>${detail?`<p>${esc(detail.slice(0,260))}${detail.length>260?'…':''}</p>`:''}</div>`}
  function render(){
    const box=$('dupList'),summary=$('dupSummary');if(!box||!summary)return;const type=$('dupType')?.value||'',level=$('dupLevel')?.value||'';let rows=pairs.filter(p=>(!type||p.resource===type)&&(!level||p.level===level));const high=pairs.filter(p=>p.level==='Alta').length,medium=pairs.filter(p=>p.level==='Media').length;summary.innerHTML=`<div class="stat"><span>Posibles duplicados</span><strong>${pairs.length}</strong></div><div class="stat"><span>Alta probabilidad</span><strong>${high}</strong></div><div class="stat"><span>Revisar</span><strong>${medium}</strong></div>`;if(!rows.length){box.innerHTML=`<div class="soraya-dup-safe">${pairs.length?'No hay coincidencias con estos filtros.':'✅ No hay posibles duplicados pendientes de revisión.'}</div>`;return}box.innerHTML=rows.map(p=>`<article class="soraya-dup-pair ${p.level==='Alta'?'high':'medium'}"><div class="soraya-dup-head"><div><span class="badge">${esc(p.spec.label)}</span><h3>${p.level==='Alta'?'Alta probabilidad':'Posible duplicado'}</h3><div class="soraya-dup-note">${esc(why(p))}</div></div><span class="soraya-dup-score">${p.score}%</span></div><div class="soraya-dup-grid">${recordCard(p,p.a,'A')}${recordCard(p,p.b,'B')}</div><div class="soraya-dup-actions">${canWrite()?`<button class="secondary-btn" onclick="SorayaDuplicates.ignore('${p.key}')">No son duplicados</button><button class="secondary-btn" onclick="SorayaDuplicates.archive('${p.key}','a')">Conservar B · archivar A</button><button class="secondary-btn" onclick="SorayaDuplicates.archive('${p.key}','b')">Conservar A · archivar B</button>`:'<span class="muted">Tu rol es de consulta; podés revisar pero no resolver duplicados.</span>'}</div></article>`).join('')}
  async function saveDecision(p,decision,archivedRecord=null){const body={resource_type:p.resource,record_a:p.a.id,record_b:p.b.id,pair_key:p.key,decision,archived_record:archivedRecord,resolved_by:session?.user?.id||null,resolved_at:new Date().toISOString()};const{error}=await db.from('duplicate_reviews').upsert(body,{onConflict:'pair_key'});if(error)throw error;ignored.add(p.key);pairs=pairs.filter(x=>x.key!==p.key);render();updateBadge()}
  async function ignore(key){const p=pairs.find(x=>x.key===key);if(!p)return;try{await saveDecision(p,'Ignorado');notice('Soraya dejará de marcar esta pareja como duplicada')}catch(e){notice(e.message||'No se pudo guardar la decisión')}}
  async function archive(key,side){const p=pairs.find(x=>x.key===key);if(!p)return;const x=side==='a'?p.a:p.b,s=p.spec;if(!confirm(`¿Archivar “${x[s.title]}”? El otro registro se conservará.`))return;try{const{error}=await db.from(s.table).update({archived:true}).eq('id',x.id);if(error)throw error;await saveDecision(p,'Archivado',x.id);if(window.JFPerf?.removeRecord&&['tasks','notes','meetings','events','projects','opportunities'].includes(p.resource))window.JFPerf.removeRecord(p.resource,x.id);window.dispatchEvent(new CustomEvent('jf:data-changed',{detail:{resource:p.resource}}));notice('Registro duplicado archivado')}catch(e){notice(e.message||'No se pudo archivar el registro')}}

  function quickCheck(resource){const app=window.JF_APP_STATE;if(!app||!SOURCES[resource]||!Array.isArray(app[resource]))return;const found=findPairs(resource,app[resource]).filter(p=>p.level==='Alta');if(!found.length)return;const p=found[0],seen='dupwarn:'+p.key;if(sessionStorage.getItem(seen))return;sessionStorage.setItem(seen,'1');notice(`⚠️ Posible duplicado detectado en ${p.spec.label}. Revisalo en Duplicados.`);pairs=[...new Map([...found,...pairs].map(x=>[x.key,x])).values()].sort((a,b)=>b.score-a.score);updateBadge()}
  window.addEventListener('jf:state-updated',e=>{const r=e.detail?.resource;if(SOURCES[r])setTimeout(()=>quickCheck(r),250)});
  window.addEventListener('hashchange',()=>{if(location.hash.includes('/duplicates'))setTimeout(openView,60)});
  window.SorayaDuplicates={scan,ignore,archive,open:openView};
  async function start(){await auth();if(!profile?.active)return;inject();if(location.hash.includes('/duplicates'))openView()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,1000),{once:true});else setTimeout(start,1000);
})();