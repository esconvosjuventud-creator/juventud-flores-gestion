(function installHelpGuide(){
  if(window.__JF_HELP_GUIDE__) return;
  window.__JF_HELP_GUIDE__=true;

  const $=s=>document.querySelector(s);
  let modal=null;

  function go(view){
    close();
    const b=document.querySelector(`#mainNav button[data-view="${view}"]`);
    if(b)b.click();else location.hash='#/'+view;
  }
  function quickAdd(){close();document.getElementById('quickAddBtn')?.click()}
  function searchModules(){
    close();
    if(window.JFTeamUI?.openPalette)return window.JFTeamUI.openPalette('');
    const input=document.getElementById('globalSearch');
    if(input){input.focus();input.select()}
  }

  function buildModal(){
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='jfHelpGuide';
    modal.className='jf-help';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML=`
      <div class="jf-help-backdrop" data-help-close></div>
      <section class="jf-help-panel" role="dialog" aria-modal="true" aria-labelledby="jfHelpTitle">
        <header class="jf-help-head">
          <div><span class="jf-help-kicker">GUÍA RÁPIDA</span><h2 id="jfHelpTitle">¿Cómo usar el sistema?</h2><p>Con estas 5 ideas ya podés empezar.</p></div>
          <button type="button" class="jf-help-close" data-help-close aria-label="Cerrar">×</button>
        </header>
        <div class="jf-help-steps">
          <article><span>1</span><div><strong>Empezá por “Mi día”</strong><p>Ahí ves qué tenés hoy, qué está atrasado y qué conviene resolver primero.</p><button type="button" data-help-go="dashboard">Ir a Mi día →</button></div></article>
          <article><span>2</span><div><strong>Para registrar algo, usá “＋ Agregar”</strong><p>Creá una tarea, reunión, evento, nota, comunicación, expediente o recordatorio.</p><button type="button" data-help-add>Agregar algo →</button></div></article>
          <article><span>3</span><div><strong>Usá la Agenda para organizarte</strong><p>Reuniones, eventos y tareas con fecha aparecen juntas para no olvidarte de nada.</p><button type="button" data-help-go="teamagenda82">Ver agenda →</button></div></article>
          <article><span>4</span><div><strong>Cuando terminás algo, actualizalo</strong><p>Marcá tareas como realizadas y registrá decisiones o compromisos de las reuniones.</p><button type="button" data-help-go="tasks">Ver tareas →</button></div></article>
          <article><span>5</span><div><strong>¿No encontrás una función?</strong><p>Usá el buscador de arriba o <b>Ctrl/⌘ + K</b> y escribí lo que buscás.</p><button type="button" data-help-search>Buscar módulo →</button></div></article>
        </div>
        <footer class="jf-help-foot"><span>💡 Consejo: cargá lo importante en el momento. El sistema hace el seguimiento después.</span><button type="button" class="primary-btn" data-help-close>Entendido</button></footer>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-help-close]').forEach(b=>b.addEventListener('click',close));
    modal.querySelectorAll('[data-help-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.helpGo)));
    modal.querySelector('[data-help-add]')?.addEventListener('click',quickAdd);
    modal.querySelector('[data-help-search]')?.addEventListener('click',searchModules);
    return modal;
  }

  function open(){
    buildModal();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    setTimeout(()=>modal.querySelector('.jf-help-close')?.focus(),20);
  }
  function close(){
    if(!modal)return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
  }

  function installButtons(){
    const top=$('.topbar');
    if(top&&!$('#jfHelpBtn')){
      const b=document.createElement('button');
      b.id='jfHelpBtn';b.type='button';b.className='secondary-btn jf-help-button';
      b.innerHTML='<span aria-hidden="true">❔</span><span class="jf-help-button-text">Ayuda</span>';
      b.title='Guía rápida del sistema';b.setAttribute('aria-label','Abrir guía rápida del sistema');
      const notif=$('#notifBtn');top.insertBefore(b,notif||null);b.addEventListener('click',open);
    }
    const side=$('#sidebar .userbox');
    if(side&&!$('#jfHelpSidebarBtn')){
      const b=document.createElement('button');b.id='jfHelpSidebarBtn';b.type='button';b.className='jf-help-sidebar-btn';b.innerHTML='❔ <span>Ayuda rápida</span>';b.addEventListener('click',open);side.insertBefore(b,side.firstChild);
    }
  }

  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal?.classList.contains('open'))close()});
  installButtons();setTimeout(installButtons,500);
  window.JFHelp={open,close};
})();