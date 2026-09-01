(function installQuickScheduleHook(){
  if(window.__JF_QUICK_SCHEDULE_HOOK__)return;
  window.__JF_QUICK_SCHEDULE_HOOK__=true;
  let opening=false;
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('#jfQuickAddMenu [data-jfqa="meeting"],#jfQuickAddMenu [data-jfqa="event"]');
    if(!b||!window.JFQuickSchedule?.open)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if(opening)return;
    opening=true;
    window.JFQuickAdd?.close?.();
    Promise.resolve(window.JFQuickSchedule.open(b.dataset.jfqa)).finally(()=>setTimeout(()=>{opening=false},250));
  },true);
})();