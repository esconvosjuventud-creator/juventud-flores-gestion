(function installSorayaWeekCalendarV2(){
  'use strict';
  if(window.__SORAYA_WEEK_CALENDAR_V2__)return;
  window.__SORAYA_WEEK_CALENDAR_V2__=true;

  const PREF='soraya_calendar_safe_mode';
  let firstActivation=true;

  function setWeek(){
    try{localStorage.setItem(PREF,'week')}catch{}
    if(window.SorayaCalendarEnhanced?.setMode){
      window.SorayaCalendarEnhanced.setMode('week');
    }
    const layer=document.getElementById('sorayaCalendarEnhancedLayer');
    if(layer){
      layer.classList.add('jf-week-v2-active');
      const subtitle=layer.querySelector('.jf-cal-safe-head span');
      if(subtitle)subtitle.textContent='Semana completa: tareas, reuniones, eventos, vencimientos y Google, sin ocultar registros.';
    }
  }

  function decorate(){
    const layer=document.getElementById('sorayaCalendarEnhancedLayer');
    if(!layer)return;
    layer.classList.add('jf-week-v2-active');
    const weekBtn=layer.querySelector('[data-cal-safe-mode="week"]');
    if(weekBtn){
      weekBtn.textContent='Semana';
      weekBtn.setAttribute('aria-label','Vista semanal completa');
    }
    const subtitle=layer.querySelector('.jf-cal-safe-head span');
    if(subtitle&&window.SorayaCalendarEnhanced?.mode==='week')subtitle.textContent='Semana completa: tareas, reuniones, eventos, vencimientos y Google, sin ocultar registros.';
  }

  function activateWeek(){
    if(firstActivation){
      firstActivation=false;
      setWeek();
    }
    setTimeout(decorate,80);
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('[data-view="calendar"],[data-jf-mobile="calendar"]'))setTimeout(activateWeek,140);
    const mode=e.target.closest('[data-cal-safe-mode]');
    if(mode)setTimeout(decorate,40);
  });
  window.addEventListener('hashchange',()=>{
    if(location.hash.startsWith('#/calendar'))setTimeout(activateWeek,140);
  });
  window.addEventListener('jf:data-changed',()=>setTimeout(decorate,100));
  window.addEventListener('jf:google-sync-updated',()=>setTimeout(decorate,100));

  setTimeout(()=>{
    if(document.getElementById('view-calendar')?.classList.contains('active'))activateWeek();
    else try{localStorage.setItem(PREF,'week')}catch{}
  },1100);
})();
