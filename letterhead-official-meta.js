(()=>{
  const META={filename:'Hoja_membretada_Juventud.pdf',sha256:'5a14778159dd8b1e1d726355d93605355e7a32a4db0b5af7972aff69d8785d30',version:'2026-09-04-oficial-pdf-a4-v4',format:'PDF A4',quality:'Plantilla original sin rasterizar'};
  function apply(){
    if(window.SORAYA_LETTERHEAD){
      window.SORAYA_LETTERHEAD.source={...(window.SORAYA_LETTERHEAD.source||{}),filename:META.filename,sha256:META.sha256,exact:true,version:META.version,format:META.format,quality:META.quality};
    }
    const card=document.getElementById('letterheadSettings');
    if(card){
      const p=[...card.querySelectorAll('p')].find(x=>x.textContent.includes('Archivo de origen:'));
      if(p)p.textContent=`Archivo de origen: ${META.filename} · ${META.format}. Se conserva el encabezado y el pie del PDF original sin convertir la página completa a imagen.`;
      let badge=card.querySelector('.soraya-official-letterhead-badge');
      if(!badge){badge=document.createElement('p');badge.className='soraya-official-letterhead-badge';card.insertBefore(badge,card.querySelector('.actions'));}
      badge.innerHTML='<strong>✓ Membrete oficial A4 vigente · calidad original</strong>';
    }
  }
  window.SORAYA_OFFICIAL_LETTERHEAD_META=META;
  setTimeout(apply,500);setTimeout(apply,1400);document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="settings"]'))setTimeout(apply,100)});
})();