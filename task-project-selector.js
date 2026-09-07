(function installTaskProjectSelector(){
  'use strict';
  if(window.__SORAYA_TASK_PROJECT_SELECTOR__)return;
  window.__SORAYA_TASK_PROJECT_SELECTOR__=true;

  const form=document.getElementById('entityForm');
  if(!form)return;

  const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));

  function getProjects(){
    try{
      if(typeof state==='undefined'||!Array.isArray(state.projects))return [];
      return [...state.projects]
        .filter(p=>p&&p.name)
        .sort((a,b)=>String(a.name).localeCompare(String(b.name),'es',{sensitivity:'base'}));
    }catch(_){return []}
  }

  function projectLabel(control){return control?.closest?.('label')||null}

  function removeHelper(label){
    label?.querySelector?.('.soraya-project-helper')?.remove();
  }

  function addHelper(label,text,kind='normal'){
    removeHelper(label);
    const small=document.createElement('small');
    small.className='soraya-project-helper';
    small.textContent=text;
    small.style.cssText=`display:block;margin-top:5px;font-size:11px;line-height:1.35;color:${kind==='warn'?'#9b4b12':'#6e7585'}`;
    label?.appendChild(small);
  }

  function makeProjectSelect(currentValue=''){
    const projects=getProjects();
    const select=document.createElement('select');
    select.name='project_name';
    select.required=true;
    select.dataset.sorayaProjectPicker='1';
    select.setAttribute('aria-label','Proyecto asociado');

    const empty=document.createElement('option');
    empty.value='';
    empty.textContent=projects.length?'Seleccionar proyecto…':'No hay proyectos cargados';
    select.appendChild(empty);

    let found=false;
    projects.forEach(p=>{
      const option=document.createElement('option');
      option.value=String(p.name);
      option.textContent=p.status?`${p.name} · ${p.status}`:String(p.name);
      if(String(p.name)===String(currentValue)){option.selected=true;found=true}
      select.appendChild(option);
    });

    if(currentValue&&!found){
      const legacy=document.createElement('option');
      legacy.value=String(currentValue);
      legacy.textContent=`${currentValue} · proyecto asignado anteriormente`;
      legacy.selected=true;
      select.appendChild(legacy);
    }
    return {control:select,count:projects.length};
  }

  function makeTextInput(currentValue=''){
    const input=document.createElement('input');
    input.name='project_name';
    input.type='text';
    input.value=currentValue||'';
    input.dataset.sorayaProjectText='1';
    return input;
  }

  function syncProjectControl(){
    if(form.dataset.resource!=='tasks')return;
    const category=form.elements.category;
    let project=form.elements.project_name;
    if(!category||!project)return;

    if(!category.dataset.sorayaProjectBound){
      category.dataset.sorayaProjectBound='1';
      category.addEventListener('change',()=>setTimeout(syncProjectControl,0));
    }

    const isProject=String(category.value||'').trim().toLowerCase()==='proyecto';
    const current=String(project.value||'');
    const label=projectLabel(project);

    if(isProject){
      if(project.tagName!=='SELECT'||project.dataset.sorayaProjectPicker!=='1'){
        const built=makeProjectSelect(current);
        project.replaceWith(built.control);
        project=built.control;
        if(label){
          if(built.count)addHelper(label,'Elegí uno de los proyectos cargados en Soraya. La tarea quedará asignada a ese proyecto.');
          else addHelper(label,'No hay proyectos cargados. Primero creá un proyecto en la sección Proyectos para poder asignar esta tarea.','warn');
        }
      }else{
        const count=getProjects().length;
        if(label){
          if(count)addHelper(label,'Elegí uno de los proyectos cargados en Soraya. La tarea quedará asignada a ese proyecto.');
          else addHelper(label,'No hay proyectos cargados. Primero creá un proyecto en la sección Proyectos para poder asignar esta tarea.','warn');
        }
      }
    }else{
      if(project.tagName==='SELECT'&&project.dataset.sorayaProjectPicker==='1'){
        const input=makeTextInput(current);
        project.replaceWith(input);
        project=input;
      }
      const currentLabel=projectLabel(project)||label;
      removeHelper(currentLabel);
      project.required=false;
    }
  }

  const observer=new MutationObserver(()=>setTimeout(syncProjectControl,0));
  observer.observe(form,{childList:true,subtree:true});

  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-add="tasks"],button[onclick*="editEntity(\'tasks\'"]'))setTimeout(syncProjectControl,20);
  });
  window.addEventListener('jf:data-changed',()=>setTimeout(syncProjectControl,40));

  setTimeout(syncProjectControl,400);
  window.SorayaTaskProjectSelector={refresh:syncProjectControl};
})();
