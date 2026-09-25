(function initRinconPanel() {
  'use strict';
  const config = window.JF_CONFIG;
  if (!window.supabase || !config) return;
  const db = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const $ = id => document.getElementById(id);
  const labels = { new: 'Nueva', reviewing: 'En revisión', considered: 'Considerada', implemented: 'Implementada', archived: 'Archivada' };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const dateLabel = value => new Intl.DateTimeFormat('es-UY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Montevideo' }).format(new Date(value));
  const PAGE_SIZE = 50;
  let authorized = false;
  let proposals = [];
  let selectedId = null;
  let total = 0;
  let requestId = 0;
  let accessCheckId = 0;
  let searchTimer;

  function message(text) { $('rinconMessage').textContent = text; }
  function clearPrivateData() {
    authorized = false;
    proposals = [];
    selectedId = null;
    total = 0;
    requestId++;
    $('rinconNav').classList.add('hidden');
    $('rinconList').replaceChildren();
    $('rinconDetail').replaceChildren();
    $('rinconDetail').classList.add('hidden');
    $('rinconStats').replaceChildren();
    $('rinconMore').classList.add('hidden');
    message('');
  }

  async function checkAccess() {
    const current = ++accessCheckId;
    const { data: { session } } = await db.auth.getSession();
    if (current !== accessCheckId) return;
    if (!session?.user) { clearPrivateData(); return; }
    const { data, error } = await db.from('profiles').select('role,active').eq('id', session.user.id).maybeSingle();
    if (current !== accessCheckId) return;
    if (error || !data?.active || !['admin', 'equipo'].includes(data.role)) {
      clearPrivateData();
      if (location.hash === '#/rincon' && !document.getElementById('app').classList.contains('hidden')) window.setView('dashboard');
      return;
    }
    authorized = true;
    $('rinconNav').classList.remove('hidden');
    if (location.hash === '#/rincon') void load(true);
  }

  function renderStats(newCount) {
    $('rinconStats').innerHTML = `<div class="stat"><span>Total de propuestas</span><strong>${total}</strong></div><div class="stat"><span>Nuevas</span><strong>${newCount}</strong></div>`;
  }

  function renderList() {
    $('rinconList').innerHTML = proposals.map(item => `
      <article class="rincon-row">
        <div><span class="rincon-pill">${escapeHtml(item.category)}</span><h3>${escapeHtml(item.proposal)}</h3>
          <p class="muted">${escapeHtml(item.location || 'Localidad sin indicar')} · ${escapeHtml(item.age_range || 'Edad sin indicar')} · ${escapeHtml(dateLabel(item.created_at))}</p></div>
        <div class="rincon-row-end"><span class="rincon-status">${escapeHtml(labels[item.status] || item.status)}</span><button class="secondary-btn" data-rincon-open="${escapeHtml(item.id)}" type="button">Ver propuesta</button></div>
      </article>`).join('') || '<div class="empty">No hay propuestas para estos filtros.</div>';
    $('rinconMore').classList.toggle('hidden', proposals.length >= total);
  }

  function detailLine(label, value) {
    return value ? `<div><strong>${label}</strong><p>${escapeHtml(value)}</p></div>` : '';
  }

  function renderDetail() {
    const item = proposals.find(row => row.id === selectedId);
    const panel = $('rinconDetail');
    if (!item) { panel.classList.add('hidden'); panel.replaceChildren(); return; }
    panel.classList.remove('hidden');
    panel.innerHTML = `
      <div class="rincon-detail-head"><div><p class="eyebrow">${escapeHtml(item.category)} · ${escapeHtml(dateLabel(item.created_at))}</p><h2>Detalle de la propuesta</h2></div><button id="rinconClose" class="secondary-btn" type="button">Cerrar</button></div>
      <div class="rincon-detail-grid">
        ${detailLine('Edad', item.age_range || 'Sin indicar')}
        ${detailLine('Localidad', item.location || 'Sin indicar')}
        ${detailLine('Participaría', item.wants_to_participate || 'Sin indicar')}
      </div>
      <div class="rincon-text">${detailLine('Idea o propuesta', item.proposal)}${detailLine('Por qué es importante', item.importance)}${detailLine('Cómo podría hacerse', item.implementation_idea)}</div>
      ${item.contact_requested ? `<div class="rincon-contact"><strong>Solicitó contacto</strong>${detailLine('Nombre', item.name || 'Sin indicar')}${detailLine('Email', item.email || 'Sin indicar')}${detailLine('Celular', item.phone || 'Sin indicar')}</div>` : '<p class="muted">Participación anónima. No solicitó contacto.</p>'}
      <form id="rinconEdit" class="rincon-edit">
        <label>Estado<select name="status">${Object.entries(labels).map(([value, label]) => `<option value="${value}" ${item.status === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
        <label>Notas internas<textarea name="admin_notes" rows="5" maxlength="3000" placeholder="Seguimiento reservado del equipo">${escapeHtml(item.admin_notes || '')}</textarea></label>
        <div class="rincon-edit-actions"><span id="rinconSaveMessage" role="status"></span><button class="primary-btn" type="submit">Guardar cambios</button></div>
      </form>`;
    $('rinconClose').onclick = () => { selectedId = null; renderDetail(); };
    $('rinconEdit').onsubmit = save;
  }

  async function load(reset = true) {
    if (!authorized) return;
    const current = ++requestId;
    message('Cargando propuestas…');
    $('rinconRefresh').disabled = true;
    const status = $('rinconStatusFilter').value;
    const category = $('rinconCategoryFilter').value;
    const search = $('rinconSearch').value.trim().slice(0, 100);
    let query = db.from('youth_proposals').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    if (search) query = query.ilike('proposal', `%${search}%`);
    const offset = reset ? 0 : proposals.length;
    const { data, count, error } = await query.range(offset, offset + PAGE_SIZE - 1);
    if (current !== requestId || !authorized) return;
    $('rinconRefresh').disabled = false;
    if (error) { message('No se pudieron cargar las propuestas. Revisá tu acceso e intentá de nuevo.'); return; }
    proposals = reset ? (data || []) : proposals.concat(data || []);
    total = count || 0;
    message(`${total} propuesta${total === 1 ? '' : 's'} para estos filtros.`);
    renderList();
    renderDetail();
    const [all, fresh] = await Promise.all([
      db.from('youth_proposals').select('id', { count: 'exact', head: true }),
      db.from('youth_proposals').select('id', { count: 'exact', head: true }).eq('status', 'new')
    ]);
    if (current === requestId && !all.error && !fresh.error) {
      const filteredCount = total;
      total = all.count || 0;
      renderStats(fresh.count || 0);
      total = filteredCount;
    }
  }

  function loadCategories() {
    // These values match the public proposal form and its database constraint.
    const categories = ['Educación', 'Trabajo', 'Emprendimientos', 'Deportes', 'Cultura', 'Música', 'Arte', 'Tecnología', 'Salud y bienestar', 'Medio ambiente', 'Espacios públicos', 'Recreación', 'Vivienda', 'Movilidad', 'Actividades juveniles', 'Otro'];
    $('rinconCategoryFilter').insertAdjacentHTML('beforeend', categories.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join(''));
  }

  async function save(event) {
    event.preventDefault();
    if (!authorized || !selectedId) return;
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const notice = $('rinconSaveMessage');
    const status = form.elements.status.value;
    const admin_notes = form.elements.admin_notes.value.trim() || null;
    button.disabled = true;
    notice.textContent = 'Guardando…';
    const { data, error } = await db.from('youth_proposals').update({ status, admin_notes, is_archived: status === 'archived' }).eq('id', selectedId).select('id');
    button.disabled = false;
    if (error || !data?.length) { notice.textContent = 'No se pudieron guardar los cambios.'; return; }
    notice.textContent = 'Cambios guardados.';
    const item = proposals.find(row => row.id === selectedId);
    if (item) { item.status = status; item.admin_notes = admin_notes; item.is_archived = status === 'archived'; }
    renderList();
    void load(true);
  }

  $('rinconList').addEventListener('click', event => {
    const button = event.target.closest('[data-rincon-open]');
    if (!button || !authorized) return;
    selectedId = button.dataset.rinconOpen;
    renderDetail();
    $('rinconDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('rinconNav').addEventListener('click', () => { if (authorized) void load(true); });
  $('rinconRefresh').onclick = () => void load(true);
  $('rinconMore').onclick = () => void load(false);
  $('rinconStatusFilter').onchange = () => void load(true);
  $('rinconCategoryFilter').onchange = () => void load(true);
  $('rinconSearch').oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => void load(true), 350); };
  window.addEventListener('hashchange', () => { if (location.hash === '#/rincon' && authorized) void load(true); });
  db.auth.onAuthStateChange(() => setTimeout(() => void checkAccess(), 0));
  loadCategories();
  void checkAccess();
})();
