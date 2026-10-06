(function () {
  'use strict';
  const C = window.JF_CONFIG;
  if (!C || !window.supabase) return;
  const db = window.supabase.createClient(C.supabaseUrl, C.supabasePublishableKey);
  const PROJECT = 'ab362c96-0799-4b51-8bc9-1c881ddc4e63';
  const TABLE = 'rural_women_logo_submissions';
  const BUCKET = 'rural-women-contest-2026';
  const columns = 'id,submission_code,created_at,updated_at,full_name,birth_date,age,city,department,phone,email,proposal_name,proposal_description,palette,tools_used,ai_used,ai_details,is_minor,guardian_name,guardian_document,guardian_phone,guardian_email,guardian_accepted,terms_accepted,authorship_accepted,rights_accepted,institutional_use_accepted,terms_version,submission_method,main_file_url,complementary_file_url,external_main_url,external_complementary_url,status,internal_notes';
  const statuses = { received: 'Recibida', under_review: 'En revisión', valid: 'Válida', needs_review: 'Requiere revisión', excluded: 'Excluida', evaluated: 'Evaluada', winner: 'Ganadora', special_mention: 'Mención especial' };
  const criteria = [['Representación de las Mujeres Rurales',20],['Originalidad y creatividad',15],['Identidad territorial y vínculo con Flores',15],['Pertinencia',10],['Calidad conceptual',10],['Impacto y calidad visual',10],['Legibilidad',5],['Simplicidad',5],['Versatilidad',5],['Aplicación institucional',5]];
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = v => new Intl.DateTimeFormat('es-UY',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Montevideo'}).format(new Date(v));
  const line = (label,v) => `<div><strong>${esc(label)}</strong><p>${esc(Array.isArray(v)?v.join(', '):typeof v==='boolean'?(v?'Sí':'No'):v??'Sin indicar')}</p></div>`;
  const safeUrl = v => { try { const u=new URL(v); return ['http:','https:'].includes(u.protocol)?u.href:''; } catch { return ''; } };
  let user=null, rows=[], generation=0, selected=null, search='', filter='', ascending=false;
  let detailVersion=0;
  function clear() {
    user=null; rows=[]; selected=null; generation++; detailVersion++;
    document.querySelectorAll('.mr-summary').forEach(n=>n.remove());
    $('mrPanel')?.remove();
  }
  async function access() {
    const {data,error}=await db.auth.getUser();
    if(error||!data.user) return null;
    const p=await db.from('profiles').select('role,active').eq('id',data.user.id).maybeSingle();
    return !p.error&&p.data?.active&&['admin','equipo'].includes(p.data.role)?data.user:null;
  }
  function summary(host) {
    if(!user||host.querySelector('.mr-summary')) return;
    const s=document.createElement('section'); s.className='card mr-summary';
    s.innerHTML='<h3>Inscriptos</h3><p class="mr-count muted">Consultando propuestas…</p><button class="secondary-btn" type="button">👩‍🌾 Ver inscripciones</button>';
    s.querySelector('button').onclick=()=>open();host.appendChild(s);
    const g=generation;
    db.from(TABLE).select('id',{count:'exact',head:true}).then(r=>{if(g===generation&&s.isConnected)s.querySelector('.mr-count').textContent=r.error?'No se pudo consultar el total.':`${r.count} propuestas recibidas`;});
  }
  function decorate() {
    if(!user)return;
    document.querySelectorAll('#projectsList .card').forEach(card=>{
      if([...card.querySelectorAll('[onclick]')].some(b=>(b.getAttribute('onclick')||'').includes(`'projects','${PROJECT}'`))) summary(card);
    });
  }
  function shell() {
    if($('mrPanel'))return;
    const panel=document.createElement('section');panel.id='mrPanel';panel.className='card mr-panel';
    panel.innerHTML=`<div class="page-head"><div><p class="eyebrow">CONCURSO MUJERES RURALES 2026</p><h2>👩‍🌾 Inscriptos del concurso</h2></div><button id="mrClose" class="secondary-btn" type="button">Volver al proyecto</button></div><div id="mrStats" class="mr-stats"></div><div class="mr-filters"><label>Buscar por nombre, código o propuesta<input id="mrSearch" type="search" maxlength="150"></label><label>Estado<select id="mrFilter"><option value="">Todos</option>${Object.entries(statuses).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label><label>Orden por fecha<select id="mrOrder"><option value="desc">Más recientes primero</option><option value="asc">Más antiguas primero</option></select></label><button id="mrRefresh" type="button" class="secondary-btn">Actualizar</button><button id="mrExport" type="button" class="secondary-btn" disabled>⬇ Exportar listado</button></div><p id="mrMessage" role="status" aria-live="polite"></p><div id="mrList" class="mr-list"></div><section id="mrDetail" class="card hidden"></section>`;
    $('detailContent').appendChild(panel);
    $('mrClose').onclick=()=>{generation++;detailVersion++;rows=[];selected=null;panel.remove();};
    $('mrSearch').oninput=e=>{search=e.target.value;render();};
    $('mrFilter').onchange=e=>{filter=e.target.value;render();};
    $('mrOrder').onchange=e=>{ascending=e.target.value==='asc';render();};
    $('mrRefresh').onclick=load;
    $('mrExport').onclick=exportCsv;
    $('mrSearch').value=search;$('mrFilter').value=filter;$('mrOrder').value=ascending?'asc':'desc';
  }
  async function open() {
    const g=generation;const u=await access();if(g!==generation)return;
    if(!u){clear();return;}user=u;
    await window.openDetails('projects',PROJECT);
    if(!user||$('detailTitle').textContent!== 'Concurso de Diseño de Logo e Identidad Visual – Día Internacional de las Mujeres Rurales 2026')return;
    shell();await load();
  }
  async function load() {
    const g=++generation;
    rows=[];selected=null;detailVersion++;
    $('mrList').replaceChildren();$('mrStats').replaceChildren();$('mrDetail').replaceChildren();$('mrDetail').classList.add('hidden');
    $('mrExport').disabled=true;$('mrMessage').textContent='Cargando inscripciones…';
    const u=await access();if(g!==generation)return;
    if(!u){clear();return;}user=u;
    try {
      const all=[];let offset=0;
      while(true){const r=await db.from(TABLE).select(columns).order('created_at').order('id').range(offset,offset+199);if(r.error)throw r.error;if(g!==generation||!$('mrPanel'))return;all.push(...r.data);if(r.data.length<200)break;offset+=200;}
      rows=all;render();$('mrExport').disabled=false;
      document.querySelectorAll('.mr-count').forEach(n=>n.textContent=`${rows.length} propuestas recibidas`);
    }catch{if(g===generation&&$('mrMessage'))$('mrMessage').textContent='No se pudieron cargar las inscripciones. Verificá tu acceso y volvé a actualizar.';}
  }
  function visible() {
    const q=search.trim().toLocaleLowerCase('es');
    return rows.filter(r=>(!filter||r.status===filter)&&[r.full_name,r.submission_code,r.proposal_name].some(v=>String(v||'').toLocaleLowerCase('es').includes(q))).sort((a,b)=>(ascending?1:-1)*(new Date(a.created_at)-new Date(b.created_at)));
  }
  function render() {
    if(!$('mrPanel')||!user)return;
    $('mrStats').innerHTML=[['Total de inscripciones',rows.length],...['received','under_review','valid','needs_review','evaluated','winner'].map(k=>[statuses[k],rows.filter(r=>r.status===k).length])].map(([l,n])=>`<div class="stat"><span>${l}</span><strong>${n}</strong></div>`).join('');
    const list=visible();$('mrMessage').textContent=`${list.length} resultados de ${rows.length} inscripciones`;
    $('mrList').innerHTML=list.map(r=>`<article class="card"><p class="eyebrow">${esc(r.submission_code)} · ${esc(statuses[r.status])}</p><h3>${esc(r.proposal_name)}</h3><div class="mr-grid">${line('Nombre y apellido',r.full_name)}${line('Edad',r.age)}${line('Localidad',r.city)}${line('Departamento',r.department)}${line('Teléfono',r.phone)}${line('Email',r.email)}${line('Fecha y hora',date(r.created_at))}${line('Modalidad',r.submission_method==='file'?'Archivo':'Enlace')}</div><button class="secondary-btn" type="button" data-mr-open="${esc(r.id)}">Ver inscripción</button></article>`).join('')||'<div class="empty">No hay inscripciones para estos filtros.</div>';
    $('mrList').querySelectorAll('[data-mr-open]').forEach(b=>b.onclick=()=>detail(b.dataset.mrOpen));
  }
  async function detail(id) {
    const r=rows.find(x=>x.id===id);if(!r||!user)return;
    selected=r;const d=++detailVersion,g=generation;
    const panel=$('mrDetail');panel.classList.remove('hidden');
    panel.innerHTML=`<div class="page-head"><h3>${esc(r.submission_code)} · ${esc(r.proposal_name)}</h3><button class="secondary-btn" id="mrDetailClose" type="button">Cerrar inscripción</button></div><h3>Datos personales</h3><div class="mr-grid">${[['Nombre completo',r.full_name],['Fecha de nacimiento',r.birth_date],['Edad al inscribirse',r.age],['Localidad',r.city],['Departamento',r.department],['Teléfono',r.phone],['Email',r.email]].map(x=>line(...x)).join('')}</div><h3>Propuesta</h3><div class="mr-grid">${[['Fundamentación / descripción',r.proposal_description],['Paleta de colores',r.palette],['Herramientas utilizadas',r.tools_used],['Uso de inteligencia artificial',r.ai_used],['Detalle de IA',r.ai_details]].map(x=>line(...x)).join('')}</div><h3>Autorizaciones</h3><div class="mr-grid">${[['Aceptación de bases',r.terms_accepted],['Declaración de autoría',r.authorship_accepted],['Derechos',r.rights_accepted],['Uso institucional',r.institutional_use_accepted],['Versión de bases',r.terms_version]].map(x=>line(...x)).join('')}${r.is_minor?[['Autorización del adulto responsable',r.guardian_accepted],['Adulto responsable',r.guardian_name],['Documento del adulto',r.guardian_document],['Teléfono del adulto',r.guardian_phone],['Email del adulto',r.guardian_email]].map(x=>line(...x)).join(''):''}</div><h3>📎 Archivos de la propuesta</h3><p class="muted small">Los enlaces de archivos se generan al abrirlos y vencen a los 5 minutos.</p><div id="mrFiles"></div><h3>📝 Observaciones internas</h3><form id="mrEdit" class="stack"><label>Estado<select name="status">${Object.entries(statuses).map(([v,l])=>`<option value="${v}" ${r.status===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Observaciones internas<textarea name="internal_notes" maxlength="5000" rows="5" placeholder="Documentación, archivos, bases, contacto, evaluación o incidencias">${esc(r.internal_notes)}</textarea></label><button class="primary-btn" type="submit">Guardar cambios</button><p id="mrSaveMessage" role="status"></p></form><h3>⭐ Evaluación</h3><p class="muted small">Solo se muestran las evaluaciones permitidas por el concurso.</p><div id="mrEvaluations">Cargando evaluación…</div>`;
    $('mrDetailClose').onclick=()=>{selected=null;detailVersion++;panel.replaceChildren();panel.classList.add('hidden');};
    $('mrEdit').onsubmit=save;
    files(r,g,d);evaluations(r,g,d);panel.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function current(g,d){return user&&g===generation&&d===detailVersion&&$('mrDetail')?.isConnected;}
  async function files(r,g,d) {
    const host=$('mrFiles');
    for(const [label,path] of [['Principal',r.main_file_url],['Complementario',r.complementary_file_url]]) {
      if(!path)continue;
      const part=document.createElement('div');part.className='mr-file';
      part.innerHTML=`<strong>${label} · ${esc(path.split('/').pop())}</strong><p class="muted">Formato: ${esc(path.split('.').pop().toUpperCase())}</p><span class="mr-size"></span><div class="actions"><button type="button" class="secondary-btn">Ver archivo</button><button type="button" class="secondary-btn">Descargar</button></div><p role="status"></p>`;host.appendChild(part);
      [...part.querySelectorAll('button')].forEach((button,i)=>button.onclick=async()=>{
        if(!current(g,d))return;button.disabled=true;
        const win=i===0?window.open('about:blank','_blank'):null;if(win)win.opener=null;
        try{
          if(!await access()||!current(g,d))throw new Error();
          const result=await db.storage.from(BUCKET).createSignedUrl(path,300,i===1?{download:true}:{});
          if(result.error||!current(g,d))throw new Error();
          if(win)win.location.replace(result.data.signedUrl);
          else {const a=document.createElement('a');a.href=result.data.signedUrl;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';a.click();}
          part.querySelector('[role="status"]').textContent='Enlace temporal generado. Vence en 5 minutos.';
        }catch{win?.close();if(current(g,d))part.querySelector('[role="status"]').textContent='No se pudo abrir el archivo. Verificá tu acceso.';}
        finally{button.disabled=false;}
      });
      const slash=path.lastIndexOf('/');
      const meta=await db.storage.from(BUCKET).list(path.slice(0,slash),{search:path.slice(slash+1),limit:100});
      if(!current(g,d))return;
      const m=meta.data?.find(f=>f.name===path.slice(slash+1))?.metadata;
      if(m?.size!=null)part.querySelector('.mr-size').textContent=`${(m.size/1024).toFixed(1)} KB · ${m.mimetype||''}`;
    }
    if(!current(g,d))return;
    for(const [label,url] of [['🔗 Abrir propuesta',r.external_main_url],['Enlace complementario',r.external_complementary_url]]){
      const u=safeUrl(url);if(u)host.insertAdjacentHTML('beforeend',`<p><a class="secondary-btn" href="${esc(u)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${label}</a></p>`);
    }
    if(!host.children.length)host.textContent='Sin archivos ni enlaces registrados.';
  }
  async function save(e) {
    e.preventDefault();const r=selected;if(!r)return;
    const g=generation,d=detailVersion,form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
    try{
      if(!await access()||!current(g,d))throw new Error();
      const result=await db.from(TABLE).update({status:form.elements.status.value,internal_notes:form.elements.internal_notes.value}).eq('id',r.id).eq('updated_at',r.updated_at).select(columns).maybeSingle();
      if(!current(g,d))return;
      if(result.error||!result.data){$('mrSaveMessage').textContent='No se guardó: revisá el acceso o actualizá para recuperar cambios de otra persona.';return;}
      rows=rows.map(x=>x.id===r.id?result.data:x);selected=result.data;render();$('mrSaveMessage').textContent='Cambios guardados.';
    }catch{if(current(g,d))$('mrSaveMessage').textContent='No se pudieron guardar los cambios.';}
    finally{button.disabled=false;}
  }
  async function evaluations(r,g,d) {
    const result=await db.from('rural_women_evaluations').select('juror_id,scores,notes,updated_at').eq('submission_id',r.id);
    if(!current(g,d))return;
    const host=$('mrEvaluations');
    if(result.error){host.textContent='No se pudo consultar la evaluación.';return;}
    const own=result.data.find(x=>x.juror_id===user.id);
    host.innerHTML=`${result.data.filter(x=>x.juror_id!==user.id).map(x=>`<div class="card"><h4>Evaluación liberada · ${x.scores.reduce((a,b)=>a+b,0)}/100</h4>${criteria.map(([l,m],i)=>line(`${l} (${m})`,x.scores[i])).join('')}${line('Observaciones',x.notes)}</div>`).join('')}<form id="mrScoreForm" class="stack"><h4>Mi evaluación</h4><div class="mr-grid">${criteria.map(([l,m],i)=>`<label>${esc(l)} (${m})<input name="score${i}" type="number" required min="0" max="${m}" step="1" value="${own?own.scores[i]:''}"></label>`).join('')}</div><label>Observaciones de evaluación<textarea name="notes" maxlength="5000">${esc(own?.notes)}</textarea></label><p id="mrScoreTotal">Total: ${own?own.scores.reduce((a,b)=>a+b,0):0}/100</p><button type="submit" class="primary-btn">Guardar mi evaluación</button><p id="mrScoreMessage" role="status"></p></form>`;
    const form=$('mrScoreForm');
    form.oninput=()=>{$('mrScoreTotal').textContent=`Total: ${criteria.reduce((a,_,i)=>a+Number(form.elements['score'+i].value||0),0)}/100`;};
    form.onsubmit=async e=>{
      e.preventDefault();const button=form.querySelector('button');button.disabled=true;
      try{
        const u=await access();if(!u||u.id!==user.id||!current(g,d))throw new Error();
        const scores=criteria.map((_,i)=>Number(form.elements['score'+i].value));
        if(scores.some((v,i)=>!Number.isInteger(v)||v<0||v>criteria[i][1]))throw new Error();
        const body={submission_id:r.id,juror_id:u.id,scores,notes:form.elements.notes.value};
        const q=own?db.from('rural_women_evaluations').update(body).eq('submission_id',r.id).eq('juror_id',u.id).eq('updated_at',own.updated_at):db.from('rural_women_evaluations').insert(body);
        const saved=await q.select('submission_id').maybeSingle();if(saved.error||!saved.data)throw new Error();
        if(current(g,d)){await evaluations(r,g,d);$('mrScoreMessage').textContent='Evaluación guardada.';}
      }catch{if(current(g,d))$('mrScoreMessage').textContent='No se guardó. Verificá los puntajes, permisos o actualizá la inscripción.';}
      finally{button.disabled=false;}
    };
  }
  async function exportCsv() {
    const g=generation;if(!await access()||g!==generation||!user)return;
    const csvCell=v=>{let s=String(v??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
    const values=[['Código','Nombre y apellido','Edad','Localidad','Departamento','Teléfono','Email','Propuesta','Fecha y hora (Montevideo)','Modalidad','Estado'],...visible().map(r=>[r.submission_code,r.full_name,r.age,r.city,r.department,r.phone,r.email,r.proposal_name,date(r.created_at),r.submission_method==='file'?'Archivo':'Enlace',statuses[r.status]])];
    const url=URL.createObjectURL(new Blob(['\uFEFF'+values.map(row=>row.map(csvCell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='inscriptos-mujeres-rurales-2026.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  // Preserve all existing project detail extensions. Observe render changes for cards.
  const base=window.openDetails;
  window.openDetails=async function(resource,id){
    generation++;detailVersion++;rows=[];selected=null;
    const g=generation;const result=await base.apply(this,arguments);
    if(resource==='projects'&&id===PROJECT){const u=await access();if(g===generation&&u){user=u;summary($('detailContent'));}}
    return result;
  };
  const observer=new MutationObserver(decorate);
  observer.observe($('projectsList'),{childList:true,subtree:true});
  for(const id of ['closeDetail','detailBackdrop']) $(id)?.addEventListener('click',()=>{generation++;detailVersion++;rows=[];selected=null;$('mrPanel')?.remove();});
  db.auth.onAuthStateChange(()=>{clear();setTimeout(async()=>{const g=generation,u=await access();if(g===generation&&u){user=u;decorate();}},0);});
  window.addEventListener('focus',async()=>{const g=generation;const u=await access();if(g!==generation)return;if(!u)clear();else{user=u;decorate();if($('mrPanel'))load();}});
  access().then(u=>{if(u){user=u;decorate();}});
})();
