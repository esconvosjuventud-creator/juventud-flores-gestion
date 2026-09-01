(function installProfessionalUI(){
  if(window.__JF_PRO_UI__) return;
  window.__JF_PRO_UI__=true;
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  document.body.classList.add('jf-pro-ui');

  function addNavLabel(beforeButton,text,key){
    const nav=$('#mainNav');
    if(!nav||nav.querySelector(`[data-jf-nav-label="${key}"]`)||!beforeButton||beforeButton.parentElement!==nav)return;
    const label=document.createElement('div');
    label.className='jf-nav-label';
    label.dataset.jfNavLabel=key;
    label.textContent=text;
    nav.insertBefore(label,beforeButton);
  }

  function decorateNavigation(){
    const nav=$('#mainNav');
    if(!nav)return;
    const directButtons=[...nav.children].filter(x=>x.matches?.('button[data-view]'));
    const byView=v=>directButtons.find(b=>b.dataset.view===v);
    addNavLabel(byView('dashboard'),'Inicio','home');
    addNavLabel(byView('tasks'),'Gestión diaria','daily');
    addNavLabel(byView('contacts'),'Red y territorio','network');
    addNavLabel(byView('notes'),'Gestión institucional','institutional');
    addNavLabel(byView('reports'),'Análisis y resultados','results');
    const reports=byView('reports'),settings=byView('settings');
    if(reports&&settings&&!nav.querySelector('[data-jf-nav-label="advanced"]')){
      let n=reports.nextElementSibling;
      while(n&&n!==settings&&(!n.matches||!n.matches('button[data-view]')))n=n.nextElementSibling;
      if(n&&n!==settings)addNavLabel(n,'Herramientas avanzadas','advanced');
    }
    addNavLabel(settings,'Sistema','system');
    directButtons.forEach(b=>{
      if(!b.title)b.title=b.textContent.trim();
      b.setAttribute('aria-label',b.textContent.trim());
    });
  }

  function buildMobileNav(){
    if(document.querySelector('.jf-mobile-nav'))return;
    const bar=document.createElement('nav');
    bar.className='jf-mobile-nav';
    bar.setAttribute('aria-label','Navegación rápida');
    const items=[
      ['dashboard','⌂','Inicio'],
      ['tasks','✓','Tareas'],
      ['calendar','▦','Agenda'],
      ['__add__','＋','Agregar'],
      ['__menu__','☰','Menú']
    ];
    bar.innerHTML=items.map(([v,icon,label])=>`<button type="button" data-jf-mobile="${v}" class="${v==='__add__'?'jf-mobile-add':''}"><span>${icon}</span><span>${label}</span></button>`).join('');
    document.body.appendChild(bar);
    bar.addEventListener('click',e=>{
      const b=e.target.closest('button[data-jf-mobile]');if(!b)return;
      const v=b.dataset.jfMobile;
      if(v==='__add__'){document.getElementById('quickAddBtn')?.click();return}
      if(v==='__menu__'){document.getElementById('sidebar')?.classList.toggle('open');return}
      const target=document.querySelector(`#mainNav button[data-view="${v}"]`);target?.click();
    });
  }

  function syncMobileNav(){
    const bar=document.querySelector('.jf-mobile-nav');
    const app=document.getElementById('app');
    if(bar)bar.style.display=app?.classList.contains('hidden')?'none':'';
    const active=document.querySelector('#mainNav button.active[data-view]')?.dataset.view||'';
    document.querySelectorAll('[data-jf-mobile]').forEach(b=>b.classList.toggle('active',b.dataset.jfMobile===active));
  }

  function enhanceForms(){
    $$('input,select,textarea').forEach(el=>{
      if(el.dataset.jfProEnhanced)return;
      el.dataset.jfProEnhanced='1';
      if(!el.getAttribute('autocomplete')&&el.tagName==='INPUT'&&['text','search'].includes(el.type))el.setAttribute('autocomplete','off');
    });
  }

  function enhanceModal(){
    const modal=$('#detailModal');
    if(modal&&!modal.getAttribute('role')){
      modal.setAttribute('role','dialog');
      modal.setAttribute('aria-modal','true');
    }
  }

  function scan(){
    document.body.classList.add('jf-pro-ui');
    decorateNavigation();
    buildMobileNav();
    syncMobileNav();
    enhanceForms();
    enhanceModal();
  }

  scan();
  setTimeout(scan,250);
  setTimeout(scan,900);
  const observer=new MutationObserver(()=>requestAnimationFrame(scan));
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();