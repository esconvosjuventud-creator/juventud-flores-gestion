(function installSorayaSpanishUI(){
  if(window.__SORAYA_I18N__)return;
  window.__SORAYA_I18N__=true;

  const LABELS={
    tasks:'TAREAS',events:'EVENTOS',meetings:'REUNIONES',projects:'PROYECTOS',contacts:'CONTACTOS',institutions:'INSTITUCIONES',notes:'NOTAS / SOLICITUDES',participation_records:'PARTICIPACIÓN',opportunities:'OPORTUNIDADES',attachments:'ADJUNTOS',institutional_cases:'EXPEDIENTES / TRÁMITES',institutional_messages:'COMUNICACIONES',team_agenda_items:'AGENDA DEL EQUIPO',task_assignments:'ASIGNACIONES',generated_documents:'DOCUMENTOS',document_approvals:'APROBACIONES',workflow_derivations:'DERIVACIONES',annual_operational_plans:'PLAN OPERATIVO ANUAL',poa_objectives:'OBJETIVOS POA',poa_actions:'ACCIONES POA',executive_goals:'METAS DE GESTIÓN',
    title:'Título',description:'Descripción',category:'Categoría',status:'Estado',priority:'Prioridad',task_date:'Fecha',task_time:'Hora',deadline:'Fecha límite',institution_id:'Institución',institution_name:'Institución',institution:'Institución',contact_id:'Contacto',contact_name:'Contacto',responsible_id:'Responsable',responsible_name:'Responsable',project_id:'Proyecto',project_name:'Proyecto',reminder:'Recordatorio',notes:'Observaciones',result:'Resultado',completed_at:'Completada el',recurrence_type:'Repetición',recurrence_interval:'Intervalo de repetición',recurrence_end_date:'Repetir hasta',recurrence_parent_id:'Tarea de origen',recurrence_occurrence:'Número de repetición',google_sync:'Sincronizar con Google',google_event_id:'Evento de Google',google_calendar_id:'Calendario de Google',followup_date:'Fecha de seguimiento',waiting_since:'En espera desde',next_action:'Próxima acción',event_id:'Evento relacionado',
    name:'Nombre',event_date:'Fecha',start_time:'Hora de inicio',end_time:'Hora de finalización',place:'Lugar',address:'Dirección',organizer:'Organiza',collaborators:'Instituciones colaboradoras',target_audience:'Público objetivo',expected_participants:'Participantes estimados',actual_participants:'Participantes reales',objectives:'Objetivos',budget:'Presupuesto',logistics:'Logística / necesidades',evaluation:'Evaluación',workflow_stage:'Etapa de gestión',workflow_initialized:'Flujo iniciado',final_report:'Informe final',locality:'Localidad',
    subject:'Tema / asunto',meeting_date:'Fecha',meeting_time:'Hora',institutions:'Instituciones',participants:'Participantes',agenda:'Orden del día',discussed:'Temas tratados',decisions:'Decisiones',commitments:'Compromisos',next_steps:'Próximos pasos',
    start_date:'Fecha de inicio',end_date:'Fecha de finalización',objective:'Objetivo',results:'Resultados',
    first_name:'Nombre',last_name:'Apellido',organization:'Organización',position:'Cargo',phone:'Teléfono',whatsapp:'WhatsApp',email:'Correo electrónico',area:'Área',website:'Sitio web',
    note_date:'Fecha',number:'Número',recipient:'Destinatario',department:'Dirección / área',reason:'Motivo',response:'Respuesta / resultado',
    activity_name:'Actividad',activity_date:'Fecha',total:'Total',under_14:'Menores de 14',age_14_17:'14–17 años',age_18_24:'18–24 años',age_25_29:'25–29 años',over_29:'30 años o más',rural:'Medio rural',educational_institution:'Institución educativa',
    summary:'Resumen',age_min:'Edad mínima',age_max:'Edad máxima',modality:'Modalidad',external_url:'Enlace externo',contact_email:'Correo de contacto',contact_phone:'Teléfono de contacto',public_enabled:'Publicar',featured:'Destacada',
    case_number:'Número de expediente',case_type:'Tipo de trámite',opened_date:'Fecha de apertura',due_date:'Fecha límite',assigned_to:'Asignado a',assigned_to_name:'Asignado a',assigned_name:'Asignado a',resolution:'Resolución',workflow_status:'Estado del trámite',
    direction:'Dirección',registered_date:'Fecha de registro',registered_time:'Hora de registro',channel:'Canal',sender:'Remitente',content:'Contenido',response_due_date:'Fecha límite de respuesta',external_reference:'Referencia externa',case_id:'Expediente relacionado',note_id:'Nota relacionada',document_id:'Documento relacionado',
    assignment_role:'Rol en la tarea',user_id:'Usuario',assigned_by:'Asignado por',assigned_at:'Asignada el',accepted_at:'Aceptada el',
    public_title:'Título público',public_description:'Descripción pública',registration_enabled:'Inscripción habilitada',capacity:'Cupos',registration_open_at:'Apertura de inscripciones',registration_close_at:'Cierre de inscripciones',require_email:'Correo obligatorio',require_phone:'Teléfono obligatorio',require_institution:'Institución obligatoria',require_locality:'Localidad obligatoria',consent_text:'Consentimiento',
    file_name:'Nombre del archivo',original_name:'Nombre del archivo',storage_path:'Ubicación del archivo',mime_type:'Tipo de archivo',size_bytes:'Tamaño',
    created_at:'Creado el',updated_at:'Actualizado el',created_by:'Creado por',archived:'Archivado',active:'Activo',role:'Rol',full_name:'Nombre completo',
    action:'Acción',type:'Tipo',date:'Fecha',time:'Hora',location:'Lugar',owner:'Responsable',assignee:'Asignado a',assignees:'Responsables',source:'Origen',message:'Mensaje',read_at:'Leída el',due_at:'Vence el'
  };

  const TOKENS={
    title:'Título',description:'Descripción',category:'Categoría',status:'Estado',priority:'Prioridad',task:'Tarea',tasks:'Tareas',event:'Evento',events:'Eventos',meeting:'Reunión',meetings:'Reuniones',project:'Proyecto',projects:'Proyectos',contact:'Contacto',contacts:'Contactos',institution:'Institución',institutions:'Instituciones',note:'Nota',notes:'Notas',activity:'Actividad',activities:'Actividades',name:'Nombre',date:'Fecha',time:'Hora',start:'Inicio',end:'Fin',due:'Límite',deadline:'Límite',created:'Creado',updated:'Actualizado',completed:'Completado',opened:'Apertura',closed:'Cierre',assigned:'Asignado',responsible:'Responsable',user:'Usuario',role:'Rol',type:'Tipo',number:'Número',summary:'Resumen',content:'Contenido',message:'Mensaje',response:'Respuesta',result:'Resultado',results:'Resultados',objective:'Objetivo',objectives:'Objetivos',location:'Lugar',place:'Lugar',address:'Dirección',phone:'Teléfono',email:'Correo',website:'Web',public:'Público',enabled:'Habilitado',external:'Externa',reference:'Referencia',followup:'Seguimiento',next:'Próxima',action:'Acción',waiting:'Espera',since:'desde',google:'Google',calendar:'Calendario',sync:'Sincronización',recurrence:'Repetición',interval:'Intervalo',parent:'Origen',occurrence:'Repetición',workflow:'Gestión',stage:'Etapa',final:'Final',report:'Informe',locality:'Localidad',organizer:'Organiza',collaborators:'Colaboradores',target:'Público',audience:'objetivo',expected:'Estimados',actual:'Reales',participants:'Participantes',budget:'Presupuesto',logistics:'Logística',evaluation:'Evaluación',subject:'Asunto',agenda:'Orden del día',discussed:'Temas tratados',decisions:'Decisiones',commitments:'Compromisos',steps:'Pasos',first:'Nombre',last:'Apellido',organization:'Organización',position:'Cargo',area:'Área',recipient:'Destinatario',department:'Área',reason:'Motivo',rural:'Rural',educational:'Educativa',modality:'Modalidad',featured:'Destacada',case:'Expediente',direction:'Dirección',registered:'Registrado',channel:'Canal',sender:'Remitente',assignment:'Asignación',accepted:'Aceptada',file:'Archivo',storage:'Almacenamiento',size:'Tamaño',active:'Activo',archived:'Archivado',read:'Leída',at:'el',by:'por',id:'ID'
  };

  function keyOf(text){return String(text||'').trim().toLowerCase().replace(/\s+/g,'_')}
  function humanize(raw){
    const key=keyOf(raw);
    if(LABELS[key])return LABELS[key];
    if(!/^[a-z0-9_]+$/.test(key))return raw;
    const words=key.split('_').filter(Boolean).map(w=>TOKENS[w]||w);
    const out=words.join(' ').trim();
    return out?out.charAt(0).toUpperCase()+out.slice(1):raw;
  }
  function translateNode(el){
    if(!el||el.nodeType!==1)return;
    const raw=String(el.textContent||'').trim();
    const key=keyOf(raw);
    if(LABELS[key])el.textContent=LABELS[key];
    else if((el.matches('strong,dt,th,.eyebrow,.field-label,.meta-label')||el.closest('#detailContent'))&&/^[a-z][a-z0-9_ ]{1,48}$/i.test(raw)&&raw===raw.toLowerCase()&&(raw.includes('_')||TOKENS[key]))el.textContent=humanize(raw);
  }
  function translateTree(root){
    if(!root)return;
    if(root.nodeType===1)translateNode(root);
    root.querySelectorAll?.('strong,dt,th,label,.eyebrow,.field-label,.meta-label').forEach(translateNode);
  }
  function translateDetail(){
    const eyebrow=document.getElementById('detailEyebrow');
    if(eyebrow){const k=keyOf(eyebrow.textContent);if(LABELS[k])eyebrow.textContent=LABELS[k]}
    translateTree(document.getElementById('detailContent'));
  }
  function install(){
    translateTree(document);
    translateDetail();
    const content=document.getElementById('detailContent');
    if(content)new MutationObserver(()=>queueMicrotask(translateDetail)).observe(content,{childList:true,subtree:true});
    const eyebrow=document.getElementById('detailEyebrow');
    if(eyebrow)new MutationObserver(()=>queueMicrotask(translateDetail)).observe(eyebrow,{childList:true,characterData:true,subtree:true});
    document.addEventListener('click',e=>{if(e.target.closest?.('[onclick*="openDetails"],[data-task-view],.secondary-btn'))setTimeout(translateDetail,40)},true);
    window.addEventListener('hashchange',()=>setTimeout(()=>translateTree(document),50));
  }

  window.SorayaI18n={label:humanize,translate:translateTree,translateDetail};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
