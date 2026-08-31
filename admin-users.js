(function installAdminUserManagement(){
  if (window.__JF_ADMIN_USERS__) return;
  window.__JF_ADMIN_USERS__ = true;

  const C = window.JF_CONFIG;
  if (!window.supabase || !C) return;
  const client = window.supabase.createClient(C.supabaseUrl, C.supabasePublishableKey, {
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));

  function translateAuthMessage(){
    const node = $('authMessage');
    if (!node) return;
    const raw = (node.textContent || '').trim().toLowerCase();
    if (!raw) return;
    if (raw.includes('email rate limit exceeded') || raw.includes('over_email_send_rate_limit')) {
      node.textContent = 'Se alcanzó el límite temporal de correos de Supabase. Si sos Administrador, ingresá al sistema y creá el usuario desde Configuración → Usuarios y roles.';
    } else if (raw.includes('email not confirmed')) {
      node.textContent = 'El correo todavía no está confirmado. Contactá a un Administrador para revisar o habilitar la cuenta.';
    } else if (raw.includes('invalid login credentials')) {
      node.textContent = 'Correo o contraseña incorrectos.';
    }
  }

  function watchAuthMessages(){
    const node = $('authMessage');
    if (!node || node.dataset.jfTranslated) return;
    node.dataset.jfTranslated = '1';
    new MutationObserver(translateAuthMessage).observe(node,{childList:true,subtree:true,characterData:true});
    translateAuthMessage();
  }

  async function getAdminProfile(){
    const {data:{session}} = await client.auth.getSession();
    if (!session?.user) return null;
    const {data} = await client.from('profiles').select('id,role,active,full_name').eq('id',session.user.id).maybeSingle();
    return data?.active && data?.role === 'admin' ? data : null;
  }

  function ensureStyles(){
    if ($('jfAdminUsersStyle')) return;
    const style = document.createElement('style');
    style.id = 'jfAdminUsersStyle';
    style.textContent = `
      .jf-admin-create{border:1px solid rgba(116,16,92,.14);border-radius:16px;padding:16px;margin:14px 0 20px;background:rgba(116,16,92,.035)}
      .jf-admin-create-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .jf-admin-user-form{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
      .jf-admin-user-form label{display:flex;flex-direction:column;gap:6px;font-weight:600;font-size:.92rem}
      .jf-admin-user-form input,.jf-admin-user-form select{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #d8d8df;border-radius:10px;background:#fff;font:inherit}
      .jf-admin-user-form .full{grid-column:1/-1}
      .jf-admin-user-actions{grid-column:1/-1;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .jf-admin-user-message{grid-column:1/-1;margin:0;font-size:.9rem}
      @media(max-width:700px){.jf-admin-user-form{grid-template-columns:1fr}.jf-admin-user-form .full,.jf-admin-user-actions,.jf-admin-user-message{grid-column:1}}
    `;
    document.head.appendChild(style);
  }

  async function injectAdminCreator(){
    const card = $('usersCard');
    if (!card || $('jfAdminCreateBox')) return;
    const profile = await getAdminProfile();
    if (!profile) return;
    ensureStyles();

    const box = document.createElement('div');
    box.id = 'jfAdminCreateBox';
    box.className = 'jf-admin-create';
    box.innerHTML = `
      <div class="jf-admin-create-head">
        <div><p class="eyebrow">ALTA INTERNA</p><h3 style="margin:0">Crear usuario</h3><p class="muted small" style="margin:.35rem 0 0">Creación directa por Administrador, sin correo de confirmación.</p></div>
        <button id="jfToggleCreateUser" class="primary-btn" type="button">＋ Crear usuario</button>
      </div>
      <form id="jfAdminUserForm" class="jf-admin-user-form hidden" autocomplete="off">
        <label class="full">Nombre y apellido<input id="jfNewUserName" required minlength="3" autocomplete="off"></label>
        <label>Correo<input id="jfNewUserEmail" type="email" required autocomplete="off"></label>
        <label>Rol<select id="jfNewUserRole"><option value="equipo">Equipo</option><option value="consulta">Consulta</option></select></label>
        <label class="full">Contraseña inicial<input id="jfNewUserPassword" type="password" required minlength="8" autocomplete="new-password"><span class="muted small">Mínimo 8 caracteres. No se guarda ni se muestra luego.</span></label>
        <div class="jf-admin-user-actions"><button id="jfCreateUserSubmit" class="primary-btn" type="submit">Crear y habilitar</button><button id="jfCancelCreateUser" class="secondary-btn" type="button">Cancelar</button></div>
        <p id="jfAdminUserMessage" class="jf-admin-user-message"></p>
      </form>`;

    const usersList = $('usersList');
    card.insertBefore(box, usersList || null);

    const form = $('jfAdminUserForm');
    const toggle = $('jfToggleCreateUser');
    const cancel = $('jfCancelCreateUser');
    const msg = $('jfAdminUserMessage');
    const submit = $('jfCreateUserSubmit');
    const show = on => { form.classList.toggle('hidden', !on); toggle.classList.toggle('hidden', on); if(on) $('jfNewUserName')?.focus(); };
    toggle.onclick = () => show(true);
    cancel.onclick = () => { form.reset(); msg.textContent=''; show(false); };

    form.onsubmit = async event => {
      event.preventDefault();
      msg.style.color='';
      msg.textContent='Creando usuario…';
      submit.disabled = true;
      try {
        const body = {
          full_name: $('jfNewUserName').value.trim(),
          email: $('jfNewUserEmail').value.trim(),
          password: $('jfNewUserPassword').value,
          role: $('jfNewUserRole').value
        };
        const {data,error} = await client.functions.invoke('admin-create-user',{body});
        if (error) {
          let detail = error.message || 'No se pudo crear el usuario';
          try {
            const context = error.context;
            if (context && typeof context.json === 'function') {
              const payload = await context.json();
              if (payload?.error) detail = payload.error;
            }
          } catch (_) {}
          throw new Error(detail);
        }
        if (!data?.ok) throw new Error(data?.error || 'No se pudo crear el usuario');
        form.reset();
        msg.style.color='#19703a';
        msg.innerHTML = `<strong>${esc(data.user.full_name)}</strong> fue creado y habilitado como ${data.user.role === 'equipo' ? 'Equipo' : 'Consulta'}. Ya puede iniciar sesión.`;
        if (typeof window.renderUsers === 'function') await window.renderUsers();
        setTimeout(() => show(false), 2200);
      } catch (error) {
        msg.style.color='#a61b1b';
        msg.textContent = error?.message || 'No se pudo crear el usuario';
      } finally {
        submit.disabled = false;
      }
    };
  }

  function scan(){
    watchAuthMessages();
    injectAdminCreator().catch(console.error);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan, {once:true});
  else scan();
  window.addEventListener('hashchange', () => setTimeout(scan,120));
  setInterval(scan,1500);
})();
