(function installSorayaCalendarToday(){
  'use strict';
  if(window.__SORAYA_CALENDAR_TODAY__)return;
  window.__SORAYA_CALENDAR_TODAY__=true;

  function goToday(){
    try{
      if(typeof state!=='undefined'&&state)state.month=new Date();
    }catch{}
    try{window.renderCalendar?.()}catch{}
    if(window.SorayaCalendarEnhanced?.goToday){
      window.SorayaCalendarEnhanced.goToday();
    }else if(window.SorayaCalendar?.render){
      window.SorayaCalendar.render();
    }
    setTimeout(()=>{
      const current=document.querySelector('.jf-cal-safe-day.today,.jf-cal-safe-weekcol.today');
      current?.scrollIntoView?.({behavior:'smooth',block:'nearest',inline:'center'});
    },120);
  }

  function install(){
    const existing=document.querySelector('[data-cal-safe-today]');
    if(existing){
      existing.classList.add('jf-cal-today-primary');
      existing.textContent='Hoy';
      existing.setAttribute('aria-label','Volver a hoy');
      return;
    }
    const controls=document.querySelector('.jf-cal-safe-controls');
    if(!controls)return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='jf-cal-today-primary';
    btn.textContent='Hoy';
    btn.setAttribute('aria-label','Volver a hoy');
    btn.addEventListener('click',goToday);
    const modes=controls.querySelector('.jf-cal-safe-modes');
    controls.insertBefore(btn,modes||null);
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('[data-cal-safe-today],.jf-cal-today-primary')){
      setTimeout(goToday,0);
    }
    if(e.target.closest('[data-view="calendar"],[data-jf-mobile="calendar"]'))setTimeout(install,120);
  });
  window.addEventListener('hashchange',()=>{if(location.hash.includes('/calendar'))setTimeout(install,120)});
  setTimeout(install,900);
  setTimeout(install,2200);
  window.SorayaCalendarToday={goToday,install};
})();