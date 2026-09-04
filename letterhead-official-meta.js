(()=>{
  const META={filename:'Hoja_membretada_Juventud(1).docx',sha256:'73a681ffa066d67ccc891c7f9b921d9cdcb593d8ee9962b53f57c9674d8e770f',version:'2026-09-03-oficial-v3'};
  function apply(){
    if(window.SORAYA_LETTERHEAD){
      window.SORAYA_LETTERHEAD.source={...(window.SORAYA_LETTERHEAD.source||{}),filename:META.filename,sha256:META.sha256,exact:true,version:META.version};
    }
    const card=document.getElementById('letterheadSettings');
    if(card){
      const p=[...card.querySelectorAll('p')].find(x=>x.textContent.includes('Archivo de origen:'));
      if(p)p.textContent=`Archivo de origen: ${META.filename}. Plantilla oficial vigente para notas, trámites, comunicaciones, actas, proyectos, eventos, informes, memorias y documentos oficiales.`;
      let badge=card.querySelector('.soraya-official-letterhead-badge');
      if(!badge){badge=document.createElement('p');badge.className='soraya-official-letterhead-badge';badge.innerHTML='<strong>✓ Membrete oficial vigente</strong>';card.insertBefore(badge,card.querySelector('.actions'));}
    }
  }
  window.SORAYA_OFFICIAL_LETTERHEAD_META=META;
  setTimeout(apply,500);setTimeout(apply,1400);document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="settings"]'))setTimeout(apply,100)});
})();