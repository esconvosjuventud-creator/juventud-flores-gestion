(function installProfessionalUI(){
  if(window.__JF_PRO_UI__)return;window.__JF_PRO_UI__=true;
  const $=s=>document.querySelector(s);
  document.body.classList.add('jf-pro-ui');

  function asset(tag,selector,attrs){if(document.querySelector(selector))return document.querySelector(selector);const el=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>{if(k==='dataset')Object.assign(el.dataset,v);else el[k]=v});(tag==='link'?document.head:document.body).appendChild(el);return el}
  function css(key,href){return asset('link',`link[data-${key}]`,{rel:'stylesheet',href,dataset:{[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]:'1'}})}
  function js(key,src){return asset('script',`script[data-${key}]`,{src,async:false,dataset:{[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]:'1'}})}

  function buildMobileNav(){if($('.jf-mobile-nav'))return;const bar=document.createElement('nav');bar.className='jf-mobile-nav';bar.setAttribute('aria-label','Navegación rápida');bar.innerHTML=[['dashboard','⌂','Inicio'],['tasks','✓','Tareas'],['calendar','▦','Agenda'],['__add__','＋','Agregar'],['__menu__','☰','Menú']].map(([v,i,l])=>`<button type="button" data-jf-mobile="${v}" class="${v==='__add__'?'jf-mobile-add':''}"><span>${i}</span><span>${l}</span></button>`).join('');document.body.appendChild(bar);bar.addEventListener('click',e=>{const b=e.target.closest('button[data-jf-mobile]');if(!b)return;const v=b.dataset.jfMobile;if(v==='__add__'){document.getElementById('quickAddBtn')?.click();return}if(v==='__menu__'){document.getElementById('sidebar')?.classList.toggle('open');return}document.querySelector(`#mainNav button[data-view="${v}"]`)?.click()})}
  function syncMobile(){const bar=$('.jf-mobile-nav'),app=$('#app');if(bar)bar.style.display=app?.classList.contains('hidden')?'none':'';const active=$('#mainNav button.active[data-view]')?.dataset.view||'';document.querySelectorAll('[data-jf-mobile]').forEach(b=>b.classList.toggle('active',b.dataset.jfMobile===active))}
  function modalA11y(){const m=$('#detailModal');if(m&&!m.getAttribute('role')){m.setAttribute('role','dialog');m.setAttribute('aria-modal','true')}}

  function loadAssets(){
    css('jf-exec-dashboard','./dashboard-executive.css?v=1.0.1');js('jf-exec-dashboard','./dashboard-executive.js?v=1.0.1');
    css('jf-quick-task','./quick-task.css?v=1.0.1');js('jf-quick-task','./quick-task.js?v=1.0.1');
    css('jf-quick-schedule','./quick-schedule.css?v=1.0.1');js('jf-quick-schedule','./quick-schedule.js?v=1.0.1');js('jf-quick-schedule-hook','./quick-schedule-hook.js?v=1.0.2');
    js('jf-agenda-stability','./agenda-stability.js?v=1.0.0');
    js('jf-performance-v2','./performance-v2.js?v=2.0.0');
    css('jf-quick-add','./quick-add.css?v=2.0.0');js('jf-quick-add-v2','./quick-add-v2.js?v=2.0.0');
    css('jf-team-ui-v3','./ui-team-v3.css?v=4.0.0');css('jf-team-ui-v3-brand','./ui-team-v3-brand.css?v=4.0.0');js('jf-team-ui-v4','./ui-team-v4.js?v=4.0.0');
    css('jf-help-guide','./help-guide.css?v=1.0.0');js('jf-help-guide','./help-guide.js?v=1.0.0');
    css('jf-google-calendar-link','./google-calendar-link.css?v=1.0.0');js('jf-google-calendar-link','./google-calendar-link.js?v=1.0.0');
    js('soraya-google-auto','./google-auto-connect.js?v=1.0.0');
    css('soraya-google-unified','./google-unified-sync.css?v=1.0.0');js('soraya-google-unified','./google-unified-sync.js?v=1.0.0');
    css('soraya-task-teamwork','./task-teamwork.css?v=1.0.0');js('soraya-task-teamwork','./task-teamwork.js?v=1.0.0');
    js('soraya-i18n','./soraya-i18n.js?v=1.0.0');
    js('soraya-letterhead-vector','./official-letterhead-vector.js?v=4.0.0');
    js('soraya-pdf-engine','./soraya-pdf-engine.js?v=4.0.0');
    js('soraya-letterhead','./letterhead-template.js?v=4.0.0');
    js('soraya-letterhead-meta','./letterhead-official-meta.js?v=4.0.0');
    css('soraya-universal-search','./universal-search.css?v=1.0.0');js('soraya-universal-search','./universal-search.js?v=1.0.0');
    css('soraya-duplicates','./duplicate-detector.css?v=1.0.0');js('soraya-duplicates','./duplicate-detector.js?v=1.0.0');
    css('soraya-brand','./soraya-brand.css?v=1.0.0');js('soraya-brand','./soraya-brand.js?v=1.0.0');
  }

  buildMobileNav();modalA11y();loadAssets();syncMobile();
  const nav=$('#mainNav');if(nav)nav.addEventListener('click',()=>requestAnimationFrame(syncMobile));
  const app=$('#app');if(app)new MutationObserver(syncMobile).observe(app,{attributes:true,attributeFilter:['class']});
  setTimeout(()=>{buildMobileNav();modalA11y();syncMobile()},700);
})();