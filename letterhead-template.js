/* Soraya · plantilla institucional de documentos
   Oficina de la Juventud – Intendencia Departamental de Flores */
(() => {
  'use strict';
  const BRAND_LOGO = './assets/logo-juventud-flores.png';
  const SUPPORTED = new Set(['notes','meetings','projects','events']);
  const mm = { left: 18, right: 192, top: 49, bottom: 269 };
  let logoData = null;

  async function dataUrl(url) {
    const r = await fetch(url, {cache:'force-cache'});
    if (!r.ok) throw new Error('No se pudo cargar la identidad institucional');
    const b = await r.blob();
    return await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(b)});
  }
  async function brandLogo(){ return logoData || (logoData = await dataUrl(BRAND_LOGO)); }
  function pdf(){ return new window.jspdf.jsPDF({unit:'mm',format:'a4',orientation:'portrait'}); }
  async function paint(doc){
    doc.setFillColor(255,255,255); doc.rect(0,0,210,297,'F');
    doc.setDrawColor(43,83,99); doc.setLineWidth(.6); doc.roundedRect(10,8.5,11,14,1.4,1.4,'S');
    doc.setFont('helvetica','bold'); doc.setTextColor(43,83,99); doc.setFontSize(10); doc.text('F',15.5,18,{align:'center'});
    doc.setFontSize(20); doc.text('Flores',25,17.7);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.6); doc.text('Intendencia',51,13.5); doc.text('Departamental',51,17.4);
    try{ doc.addImage(await brandLogo(),'PNG',139,7.2,58,20,undefined,'FAST'); }catch(e){ console.warn(e); }
    doc.setDrawColor(16,83,119); doc.setLineWidth(.7); doc.line(14,31,91,31);
    doc.setDrawColor(116,16,92); doc.line(91,31,151,31);
    doc.setDrawColor(224,55,0); doc.line(151,31,196,31);
    doc.setDrawColor(16,83,119); doc.line(14,279,91,279);
    doc.setDrawColor(116,16,92); doc.line(91,279,151,279);
    doc.setDrawColor(224,55,0); doc.line(151,279,196,279);
    doc.setTextColor(54,62,69); doc.setFont('helvetica','bold'); doc.setFontSize(7.2); doc.text('OFICINA DE LA JUVENTUD',14,285);
    doc.setFont('helvetica','normal'); doc.setFontSize(6.7); doc.text('Intendencia Departamental de Flores',14,289);
    doc.setTextColor(16,83,119); doc.setFontSize(7.2); doc.text('juventud@flores.gub.uy',196,287,{align:'right'});
  }
  function normal(doc,size=10){ doc.setFont('helvetica','normal'); doc.setFontSize(size); doc.setTextColor(38,45,53); }
  function bold(doc,size=10){ doc.setFont('helvetica','bold'); doc.setFontSize(size); doc.setTextColor(26,57,76); }
  function humanDate(v){
    if(!v) return '';
    const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v+'T12:00:00') : new Date(v);
    if(Number.isNaN(d.getTime())) return String(v);
    return new Intl.DateTimeFormat('es-UY',{day:'numeric',month:'long',year:'numeric'}).format(d);
  }
  function safe(v){ return v===null||v===undefined ? '' : String(v); }
  function fileSafe(v){ return safe(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,70)||'Documento'; }
  async function newDoc(){ const doc=pdf(); await paint(doc); return doc; }
  async function page(doc){ doc.addPage(); await paint(doc); return mm.top; }
  async function ensure(doc,y,need=12){ return y+need>mm.bottom ? await page(doc) : y; }
  async function paragraph(doc,text,y,{size=10,boldText=false,gap=4,indent=0,align='left'}={}){
    if(!safe(text).trim()) return y;
    y=await ensure(doc,y,12);
    (boldText?bold:normal)(doc,size);
    const width=mm.right-mm.left-indent;
    const lines=doc.splitTextToSize(safe(text),width);
    const lineH=size*0.42+1.15;
    for(const line of lines){
      y=await ensure(doc,y,lineH+2);
      if(align==='right') doc.text(line,mm.right,y,{align:'right'}); else doc.text(line,mm.left+indent,y);
      y+=lineH;
    }
    return y+gap;
  }
  async function labelValue(doc,label,value,y){
    if(!safe(value).trim()) return y;
    y=await ensure(doc,y,10);
    bold(doc,9.4); doc.text(label.toUpperCase(),mm.left,y); y+=5;
    return paragraph(doc,value,y,{size:10,gap:4});
  }
  async function heading(doc,title,subtitle=''){
    let y=mm.top;
    bold(doc,16); doc.text(safe(title).toUpperCase(),mm.left,y); y+=7;
    if(subtitle){ normal(doc,9.5); doc.text(subtitle,mm.left,y); y+=7; }
    doc.setDrawColor(116,16,92); doc.setLineWidth(.35); doc.line(mm.left,y-2,mm.right,y-2);
    return y+3;
  }
  function getItem(resource,id){ return (state?.[resource]||[]).find(x=>String(x.id)===String(id)); }

  async function notePdf(item){
    const doc=await newDoc(); let y=mm.top;
    normal(doc,10);
    doc.text(`Trinidad, ${humanDate(item.note_date)||humanDate(new Date().toISOString())}`,mm.right,y,{align:'right'}); y+=11;
    if(item.number){ bold(doc,10); doc.text(`NOTA N.º ${safe(item.number)}`,mm.left,y); y+=8; }
    if(item.recipient){ normal(doc,10); doc.text('A:',mm.left,y); bold(doc,10); doc.text(safe(item.recipient),mm.left+8,y); y+=5.5; }
    if(item.department){ normal(doc,10); doc.text(safe(item.department),mm.left+8,y); y+=5.5; }
    if(item.recipient||item.department){ normal(doc,10); doc.text('Presente',mm.left+8,y); y+=11; }
    if(item.subject){ bold(doc,10.5); doc.text('ASUNTO:',mm.left,y); y=await paragraph(doc,item.subject,y,{size:10.5,boldText:true,indent:22,gap:8}); }
    y=await paragraph(doc,item.reason,y,{size:10.5,gap:7});
    if(item.response){ y=await labelValue(doc,'Respuesta / resultado',item.response,y); }
    if(item.followup_date){ y=await labelValue(doc,'Seguimiento',humanDate(item.followup_date),y); }
    y=await ensure(doc,y,32);
    if(y<235) y=235;
    if(item.responsible_name){
      bold(doc,10); doc.text(safe(item.responsible_name),105,y,{align:'center'}); y+=5;
      normal(doc,9); doc.text('Oficina de la Juventud',105,y,{align:'center'}); y+=4.5;
      doc.text('Intendencia Departamental de Flores',105,y,{align:'center'});
    }
    doc.save(`Nota_${fileSafe(item.number||item.subject)}.pdf`);
  }

  const genericFields={
    meetings:[['Fecha',x=>humanDate(x.meeting_date)],['Hora',x=>x.meeting_time],['Lugar',x=>x.place],['Instituciones',x=>x.institutions],['Participantes',x=>x.participants],['Orden del día',x=>x.agenda],['Temas tratados',x=>x.discussed],['Decisiones',x=>x.decisions],['Compromisos',x=>x.commitments],['Próximos pasos',x=>x.next_steps]],
    projects:[['Estado',x=>x.status],['Inicio',x=>humanDate(x.start_date)],['Fin',x=>humanDate(x.end_date)],['Objetivo',x=>x.objective],['Descripción',x=>x.description],['Presupuesto',x=>x.budget?`$ ${x.budget}`:''],['Resultados',x=>x.results]],
    events:[['Fecha',x=>humanDate(x.event_date)],['Horario',x=>[x.start_time,x.end_time].filter(Boolean).join(' a ')],['Lugar',x=>x.place],['Dirección',x=>x.address],['Organiza',x=>x.organizer],['Instituciones colaboradoras',x=>x.collaborators],['Público objetivo',x=>x.target_audience],['Participantes estimados',x=>x.expected_participants],['Participantes reales',x=>x.actual_participants],['Descripción',x=>x.description],['Objetivos',x=>x.objectives],['Responsable',x=>x.responsible_name],['Presupuesto',x=>x.budget?`$ ${x.budget}`:''],['Logística / necesidades',x=>x.logistics],['Evaluación',x=>x.evaluation]]
  };
  function titleFor(resource,item){ return resource==='meetings'?item.subject:resource==='projects'?item.name:resource==='events'?item.name:item.subject; }
  function eyebrowFor(resource){ return resource==='meetings'?'ACTA / REGISTRO DE REUNIÓN':resource==='projects'?'PROYECTO':resource==='events'?'EVENTO / ACTIVIDAD':'DOCUMENTO'; }
  async function genericPdf(resource,item){
    const doc=await newDoc(); let y=await heading(doc,titleFor(resource,item),eyebrowFor(resource));
    for(const [label,fn] of genericFields[resource]||[]) y=await labelValue(doc,label,fn(item),y);
    doc.save(`${resource}_${fileSafe(titleFor(resource,item))}.pdf`);
  }
  async function entityPdf(resource,id){
    const item=getItem(resource,id); if(!item) return toast('No se encontró el registro');
    try { if(resource==='notes') await notePdf(item); else await genericPdf(resource,item); }
    catch(e){ console.error(e); toast('No se pudo generar el PDF membretado'); }
  }

  async function managementPdf(){
    try{
      const doc=await newDoc(); let y=await heading(doc,'Informe de gestión',`Generado: ${fullDate()}`);
      const active=state.tasks.filter(t=>!['Realizada','Cancelada'].includes(t.status));
      const rows=[
        ['Tareas realizadas',state.tasks.filter(t=>t.status==='Realizada').length],
        ['Tareas pendientes',active.length],['Esperando respuesta',active.filter(t=>t.status==='Esperando respuesta').length],
        ['Eventos registrados',state.events.length],['Reuniones',state.meetings.length],
        ['Proyectos activos',state.projects.filter(p=>!['Finalizado','Cancelado'].includes(p.status)).length],
        ['Participación registrada',state.participation_records.reduce((a,x)=>a+Number(x.total||0),0)]
      ];
      for(const [l,v] of rows){ y=await ensure(doc,y,9); bold(doc,10); doc.text(l,mm.left,y); normal(doc,10); doc.text(String(v),mm.right,y,{align:'right'}); doc.setDrawColor(224,226,230); doc.line(mm.left,y+2,mm.right,y+2); y+=9; }
      doc.save(`Informe_Juventud_Flores_${isoToday()}.pdf`);
    }catch(e){console.error(e);toast('No se pudo generar el informe membretado')}
  }
  async function annualPdf(){
    try{
      const y0=Number($('memoryYear').value),doc=await newDoc(); let y=await heading(doc,`Memoria de gestión ${y0}`,'OFICINA DE LA JUVENTUD');
      const sections=[['Introducción',$('memoryIntro').value],['Principales logros',$('memoryHighlights').value],['Desafíos',$('memoryChallenges').value],['Prioridades '+(y0+1),$('memoryPriorities').value]];
      for(const [t,x] of sections){ if(!x) continue; y=await ensure(doc,y,18); bold(doc,12); doc.text(t,mm.left,y); y+=7; y=await paragraph(doc,x,y,{size:10,gap:7}); }
      doc.save(`Memoria_Juventud_Flores_${y0}.pdf`);
    }catch(e){console.error(e);toast('No se pudo generar la memoria membretada')}
  }
  async function blankPdf(){ try{const doc=await newDoc();doc.save('Hoja_membretada_Juventud.pdf')}catch(e){toast('No se pudo generar la plantilla')} }

  function addDetailButton(resource,id){
    if(!SUPPORTED.has(resource)) return;
    const c=$('detailContent'); if(!c||c.querySelector('.letterhead-pdf-btn')) return;
    const box=document.createElement('div'); box.className='actions space-top';
    box.innerHTML='<button class="primary-btn letterhead-pdf-btn" type="button">📄 Descargar PDF membretado</button>';
    box.querySelector('button').onclick=()=>entityPdf(resource,id);
    c.prepend(box);
  }
  const originalOpenDetails=window.openDetails;
  if(typeof originalOpenDetails==='function') window.openDetails=async function(resource,id){ await originalOpenDetails(resource,id); addDetailButton(resource,id); };

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('#exportPdfBtn,#memoryPdf'); if(!b) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if(b.id==='exportPdfBtn') managementPdf(); else annualPdf();
  },true);

  function settingsCard(){
    const grid=document.querySelector('#view-settings .grid.two'); if(!grid||grid.querySelector('#letterheadSettings')) return;
    const a=document.createElement('article'); a.className='card span2'; a.id='letterheadSettings';
    a.innerHTML='<p class="eyebrow">DOCUMENTOS INSTITUCIONALES</p><h2>Hoja membretada de Juventud</h2><p><strong>Plantilla institucional predeterminada: activa</strong></p><p class="muted">Las notas, trámites, actas, proyectos, eventos, informes y memorias generados desde Soraya utilizan el membrete oficial de la Oficina de la Juventud.</p><div class="actions"><button id="blankLetterheadPdf" class="secondary-btn" type="button">Descargar hoja en blanco</button></div>';
    grid.appendChild(a); a.querySelector('#blankLetterheadPdf').onclick=blankPdf;
  }
  settingsCard();
  new MutationObserver(settingsCard).observe(document.body,{childList:true,subtree:true});
  window.SORAYA_LETTERHEAD={active:true,version:'2026-09-03',entityPdf,blankPdf};
})();
