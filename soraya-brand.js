(function installSorayaBrand(){
  if(window.__SORAYA_BRAND__)return;
  window.__SORAYA_BRAND__=true;
  document.body.classList.add('jf-soraya');
  document.title='Soraya · Gestión de Juventud';

  const $=s=>document.querySelector(s);
  function text(el,value){if(el&&el.textContent!==value)el.textContent=value}

  function apply(){
    document.title='Soraya · Gestión de Juventud';
    text($('#loading p'),'Iniciando Soraya…');
    text($('#authScreen .eyebrow'),'SISTEMA DE GESTIÓN');
    text($('#authScreen h1'),'SORAYA');

    const brand=$('#sidebar .brand');
    if(brand){
      text(brand.querySelector('strong'),'SORAYA');
      text(brand.querySelector('span'),'Sistema de gestión juvenil');
      brand.setAttribute('aria-label','Soraya · Sistema de gestión de la Oficina de la Juventud');
    }

    text($('#jfTeamContext .jf-team-context-kicker'),'SORAYA');
    const help=$('#jfHelpTitle');
    if(help)text(help,'¿Cómo usar Soraya?');
    const helpBtn=$('#jfHelpBtn');
    if(helpBtn){helpBtn.title='Guía rápida de Soraya';helpBtn.setAttribute('aria-label','Abrir guía rápida de Soraya')}

    const status=$('#supabaseStatus')?.closest('.card');
    if(status){
      const p=[...status.querySelectorAll('p')].find(x=>x.querySelector('strong')?.textContent?.trim()==='Proyecto:');
      if(p&&!p.dataset.soraya){
        p.dataset.soraya='1';
        p.innerHTML='<strong>Sistema:</strong> Soraya<br><span class="muted small">Base técnica: JUVENTUD FLORES – GESTIÓN</span>';
      }
    }
  }

  apply();
  setTimeout(apply,250);
  setTimeout(apply,800);
  setTimeout(apply,1800);
  window.addEventListener('hashchange',()=>requestAnimationFrame(apply));
  window.addEventListener('jf:state-updated',()=>requestAnimationFrame(apply));
  document.addEventListener('click',e=>{if(e.target.closest?.('#jfHelpBtn,#jfHelpSidebarBtn'))setTimeout(apply,0)},true);
  window.Soraya={name:'Soraya',applyBrand:apply};
})();