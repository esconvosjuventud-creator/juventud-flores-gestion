(function installAgendaStability(){
  if(window.__JF_AGENDA_STABILITY__)return;
  window.__JF_AGENDA_STABILITY__=true;

  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  const observed=new WeakSet();

  function dedupeAgendaTeam(){
    const box=document.getElementById('jf82Agenda');
    if(!box)return;
    box.querySelectorAll('.jf82-day').forEach(day=>{
      const seen=new Set();
      day.querySelectorAll('.jf82-agenda-item').forEach(item=>{
        const time=norm(item.querySelector('.jf82-time')?.textContent);
        const title=norm(item.querySelector('strong')?.textContent);
        const detail=norm(item.querySelector('p')?.textContent);
        const key=[time,title,detail].join('|');
        if(seen.has(key))item.remove();else seen.add(key);
      });
    });
  }

  function dedupeExecutive(){
    const box=document.getElementById('jfExecAgenda');
    if(!box)return;
    const seen=new Set();
    box.querySelectorAll('.jfexec-agenda-row').forEach(item=>{
      const time=norm(item.querySelector('.jfexec-time')?.textContent);
      const title=norm(item.querySelector('strong')?.textContent);
      const detail=norm(item.querySelector('small')?.textContent);
      const type=norm(item.dataset.type);
      const key=[time,title,detail,type].join('|');
      if(seen.has(key))item.remove();else seen.add(key);
    });
  }

  function attach(id,fn){
    const box=document.getElementById(id);
    if(!box||observed.has(box))return;
    observed.add(box);
    let queued=false;
    const run=()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;fn()});
    };
    new MutationObserver(run).observe(box,{childList:true,subtree:true});
    run();
  }

  function scan(){
    attach('jf82Agenda',dedupeAgendaTeam);
    attach('jfExecAgenda',dedupeExecutive);
    dedupeAgendaTeam();
    dedupeExecutive();
  }

  scan();
  setTimeout(scan,400);
  setTimeout(scan,1200);
  window.addEventListener('hashchange',()=>setTimeout(scan,80));
  window.addEventListener('jf:state-updated',()=>setTimeout(scan,40));
  window.addEventListener('jf:data-changed',()=>setTimeout(scan,40));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)scan()});
})();