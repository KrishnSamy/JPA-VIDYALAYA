(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ───────── API ───────── */
  async function api(method, url, body) {
    const r = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
      body: body === undefined ? undefined : JSON.stringify(body), credentials: 'same-origin',
    });
    let j = {}; try { j = await r.json(); } catch { /* non-json */ }
    if (r.status === 401 && url !== '/api/login') { showLogin(); throw new Error(j.error || 'Please sign in.'); }
    if (!r.ok) throw new Error(j.error || 'Request failed (' + r.status + ')');
    return j;
  }
  let toastT;
  function toast(msg, bad) {
    const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (bad ? ' bad' : '');
    clearTimeout(toastT); toastT = setTimeout(() => (t.className = 'toast'), 3200);
  }
  const fail = (e) => toast(e.message, true);

  /* ───────── Schema ───────── */
  const T = { text: 'text', area: 'area', image: 'image', date: 'date', num: 'num', check: 'check', sel: 'sel' };
  const SECTIONS = {
    slides: { label: 'Hero Slides', icon: '🖼️', single: 'slide', help: 'Large banner images shown at the top of the home page.',
      cols: ['image', 'title', 'sort', 'active'],
      fields: [{ k: 'image', l: 'Image', t: T.image, req: 1, wide: 1 }, { k: 'title', l: 'Heading' }, { k: 'subtitle', l: 'Sub-heading' },
        { k: 'link', l: 'Button link', help: 'e.g. /about or /gallery' }, { k: 'sort', l: 'Order (1 = first)', t: T.num }, { k: 'active', l: 'Show on website', t: T.check }],
      blank: { sort: 10, active: 1 } },
    notices: { label: 'Notices', icon: '📢', single: 'notice', help: 'Announcements for the Notice Board. Pinned notices appear first.',
      cols: ['title', 'date', 'important', 'active'],
      fields: [{ k: 'title', l: 'Title', req: 1, wide: 1 }, { k: 'body', l: 'Details', t: T.area, wide: 1 }, { k: 'date', l: 'Date', t: T.date, req: 1 },
        { k: 'important', l: 'Pin as important', t: T.check }, { k: 'active', l: 'Show on website', t: T.check }],
      blank: () => ({ date: today(), important: 0, active: 1 }) },
    events: { label: 'Events', icon: '🗓️', single: 'event', help: 'Upcoming events are shown first; events with a past date move to “Past Events” automatically.',
      cols: ['image', 'title', 'date', 'active'],
      fields: [{ k: 'title', l: 'Event name', req: 1, wide: 1 }, { k: 'date', l: 'Date', t: T.date, req: 1 }, { k: 'location', l: 'Venue' },
        { k: 'description', l: 'Description', t: T.area, wide: 1 }, { k: 'image', l: 'Photo', t: T.image, wide: 1 }, { k: 'active', l: 'Show on website', t: T.check }],
      blank: () => ({ date: today(), active: 1 }) },
    gallery: { label: 'Gallery', icon: '📷', single: 'photo', help: 'Photos shown on the Gallery page. Use the same category name to group photos under one filter.',
      cols: ['image', 'title', 'category', 'active'], bulk: true,
      fields: [{ k: 'image', l: 'Photo', t: T.image, req: 1, wide: 1 }, { k: 'title', l: 'Caption', wide: 1 }, { k: 'category', l: 'Category', help: 'e.g. Graduation Day, Sports Day', list: 'gallery.category' },
        { k: 'sort', l: 'Order', t: T.num }, { k: 'active', l: 'Show on website', t: T.check }],
      blank: { category: 'General', sort: 0, active: 1 } },
    staff: { label: 'Management & Staff', icon: '👥', single: 'person', help: 'People shown on the Management Team page. Choose the group “Management” for the leadership section.',
      cols: ['photo', 'name', 'role', 'grp', 'active'],
      fields: [{ k: 'name', l: 'Full name', req: 1 }, { k: 'role', l: 'Designation', help: 'e.g. Correspondent, Principal' },
        { k: 'grp', l: 'Group', help: 'Management, Teaching Staff, …', list: 'staff.grp' }, { k: 'sort', l: 'Order', t: T.num },
        { k: 'photo', l: 'Photo', t: T.image, wide: 1 }, { k: 'bio', l: 'Short bio', t: T.area, wide: 1 }, { k: 'active', l: 'Show on website', t: T.check }],
      blank: { grp: 'Management', sort: 10, active: 1 } },
    activities: { label: 'Co-Curricular', icon: '🏅', single: 'activity', help: 'Cards on the Co-Curricular Activities page.',
      cols: ['image', 'title', 'sort', 'active'],
      fields: [{ k: 'title', l: 'Title', req: 1, wide: 1 }, { k: 'description', l: 'Description', t: T.area, wide: 1 }, { k: 'image', l: 'Photo', t: T.image, wide: 1 },
        { k: 'sort', l: 'Order', t: T.num }, { k: 'active', l: 'Show on website', t: T.check }],
      blank: { sort: 10, active: 1 } },
    features: { label: 'Features', icon: '⭐', single: 'feature', help: 'Highlights shown on the Features page and home page.',
      cols: ['icon', 'title', 'sort', 'active'],
      fields: [{ k: 'icon', l: 'Icon (emoji)', help: 'Paste any emoji, e.g. 🎓' }, { k: 'title', l: 'Title', req: 1 }, { k: 'description', l: 'Description', t: T.area, wide: 1 },
        { k: 'sort', l: 'Order', t: T.num }, { k: 'active', l: 'Show on website', t: T.check }],
      blank: { icon: '⭐', sort: 10, active: 1 } },
    testimonials: { label: 'Testimonials', icon: '💬', single: 'testimonial', help: 'Parent feedback shown on the home page. Add only genuine feedback with the parent’s permission.',
      cols: ['name', 'role', 'message', 'active'],
      fields: [{ k: 'name', l: 'Name', req: 1 }, { k: 'role', l: 'Relation', help: 'e.g. Parent of a UKG student' }, { k: 'message', l: 'Feedback', t: T.area, req: 1, wide: 1 }, { k: 'active', l: 'Show on website', t: T.check }],
      blank: { role: 'Parent', active: 1 } },
  };
  const COL_LABEL = { image: 'Image', photo: 'Photo', title: 'Title', name: 'Name', role: 'Role', grp: 'Group', date: 'Date', category: 'Category', sort: 'Order', active: 'Status', important: 'Pinned', icon: 'Icon', message: 'Feedback' };

  const SETTINGS = [
    ['School details', [['school_name', 'School name'], ['tagline', 'Tagline'], ['logo', 'Logo', 'image'], ['address', 'Address', 'area'], ['phone', 'Phone'], ['email', 'Email'], ['whatsapp', 'WhatsApp number', 'text', 'Digits only, e.g. 8300620179. Leave blank to hide the WhatsApp button.'], ['working_hours', 'Office hours']]],
    ['Admissions', [['admission_open', 'Admissions are open (show banner & “Apply Now” button)', 'check'], ['admission_text', 'Admission message', 'area']]],
    ['Welcome message', [['welcome_title', 'Heading'], ['welcome_message', 'Message', 'area'], ['welcome_by', 'Signed by']]],
    ['About page', [['about_text', 'About the school', 'area'], ['vision', 'Vision', 'area'], ['mission', 'Mission', 'area']]],
    ['Management', [['management_photo', 'Management photo', 'image'], ['management_text', 'Introduction text', 'area']]],
    ['Highlights (optional counters on home page)', [['stat1_value', 'Number 1', 'text', 'e.g. 500+'], ['stat1_label', 'Label 1'], ['stat2_value', 'Number 2'], ['stat2_label', 'Label 2'], ['stat3_value', 'Number 3'], ['stat3_label', 'Label 3'], ['stat4_value', 'Number 4'], ['stat4_label', 'Label 4']]],
    ['Social links & map', [['facebook', 'Facebook link', 'text', 'https://…'], ['instagram', 'Instagram link', 'text', 'https://…'], ['youtube', 'YouTube link', 'text', 'https://…'],
      ['map_url', 'Google Maps embed link', 'text', 'Optional. In Google Maps: Share → Embed a map → copy the src="…" link. Blank = uses the address.'], ['footer_note', 'Footer note']]],
  ];

  const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const fmtDate = (s) => { if (!s) return ''; const d = new Date(s + 'T00:00:00'); return isNaN(d) ? s : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const fmtTime = (s) => { const d = new Date(String(s).replace(' ', 'T') + 'Z'); return isNaN(d) ? s : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };

  /* ───────── Login / shell ───────── */
  let me = null, stats = null;
  function showLogin() { $('#app').hidden = true; $('#login').hidden = false; $('#login-form').elements.password.value = ''; }
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault(); $('#login-err').textContent = '';
    const f = e.target;
    try { await api('POST', '/api/login', { username: f.username.value, password: f.password.value }); await boot(); }
    catch (err) { $('#login-err').textContent = err.message; }
  });
  $('#logout').addEventListener('click', async () => { try { await api('POST', '/api/logout'); } catch { /* ignore */ } showLogin(); });
  $('#menu-btn').addEventListener('click', () => $('#side').classList.toggle('open'));
  $('#side').addEventListener('click', (e) => { if (e.target.closest('#nav a')) $('#side').classList.remove('open'); });

  async function boot() {
    try { me = await api('GET', '/api/admin/me'); } catch { showLogin(); return; }
    $('#login').hidden = true; $('#app').hidden = false; $('#who').textContent = '👤 ' + me.username;
    renderAlert(); route();
  }
  function renderAlert() {
    const a = $('#alert');
    if (me && me.must_change) { a.hidden = false; a.innerHTML = '⚠️ You are using the default password. <a href="#/password">Change it now</a> to secure your website.'; }
    else a.hidden = true;
  }
  async function renderNav(active) {
    try { stats = await api('GET', '/api/admin/stats'); } catch { /* ignore */ }
    const unread = stats ? stats.new_admissions + stats.new_messages : 0;
    const link = (h, i, l, b) => `<a href="#/${h}"${active === h ? ' class="on"' : ''}><span>${i}</span>${l}${b ? `<span class="badge">${b}</span>` : ''}</a>`;
    $('#nav').innerHTML = link('dashboard', '🏠', 'Dashboard') + '<div class="grp">Inbox</div>' + link('inbox', '📨', 'Enquiries', unread) +
      '<div class="grp">Website content</div>' + Object.entries(SECTIONS).map(([k, s]) => link(k, s.icon, s.label)).join('') +
      '<div class="grp">Site</div>' + link('settings', '⚙️', 'School Settings') + link('media', '🗂️', 'Media Library') + link('password', '🔒', 'Change Password');
  }

  /* ───────── Router ───────── */
  const view = $('#view');
  async function route() {
    if (!me) return;
    const h = (location.hash.replace(/^#\//, '') || 'dashboard').split('?')[0];
    $('#title').textContent = '';
    try {
      await renderNav(h);
      if (h === 'dashboard') await vDashboard();
      else if (SECTIONS[h]) await vList(h);
      else if (h === 'settings') await vSettings();
      else if (h === 'inbox') await vInbox();
      else if (h === 'media') await vMedia();
      else if (h === 'password') vPassword();
      else { location.hash = '#/dashboard'; return; }
    } catch (e) { if (me) { view.innerHTML = `<div class="panel err">${esc(e.message)}</div>`; } }
    view.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', route);
  const setTitle = (t) => { $('#title').textContent = t; document.title = t + ' | Admin'; };

  /* ───────── Dashboard ───────── */
  async function vDashboard() {
    setTitle('Dashboard');
    const s = stats || (await api('GET', '/api/admin/stats'));
    const tile = (h, n, l, hot) => `<a class="stat${hot ? ' hot' : ''}" href="#/${h}"><b>${n}</b><span>${l}</span></a>`;
    view.innerHTML = `<div class="cards">
      ${tile('inbox', s.new_admissions, 'New admission enquiries', s.new_admissions)}${tile('inbox', s.new_messages, 'New messages', s.new_messages)}
      ${tile('gallery', s.gallery, 'Gallery photos')}${tile('events', s.events, 'Events')}${tile('notices', s.notices, 'Notices')}
      ${tile('staff', s.staff, 'Staff listed')}${tile('activities', s.activities, 'Activities')}${tile('features', s.features, 'Features')}</div>
    <div class="panel"><h2>Recent enquiries</h2>${s.recent.length ? `<div class="tablewrap" style="border:0"><table><thead><tr><th>Name</th><th>Type</th><th>Phone</th><th>Received</th><th>Status</th></tr></thead><tbody>
      ${s.recent.map((r) => `<tr><td>${esc(r.name)}</td><td>${r.type === 'admission' ? 'Admission' : 'Message'}</td><td>${esc(r.phone)}</td><td>${fmtTime(r.created_at)}</td><td><span class="pill ${r.status}">${r.status}</span></td></tr>`).join('')}
      </tbody></table></div><p><a href="#/inbox">Open inbox →</a></p>` : '<p class="empty">No enquiries yet. They will appear here when parents use the website forms.</p>'}</div>
    <div class="panel"><h2>Quick actions</h2><div class="toolbar">
      <a class="btn primary" href="#/notices">+ Post a notice</a><a class="btn" href="#/events">+ Add an event</a><a class="btn" href="#/gallery">+ Upload photos</a><a class="btn" href="#/settings">Edit school details</a><a class="btn" href="/" target="_blank" rel="noopener">View website ↗</a></div></div>`;
  }

  /* ───────── Generic list + form ───────── */
  const cell = (k, v, row) => {
    if (k === 'image' || k === 'photo') return v ? `<img class="thumb" src="${esc(v)}" alt="">` : '<span class="pill off">none</span>';
    if (k === 'active') return `<span class="pill ${v ? 'on' : 'off'}">${v ? 'Visible' : 'Hidden'}</span>`;
    if (k === 'important') return v ? '📌' : '';
    if (k === 'date') return esc(fmtDate(v));
    if (k === 'message') return `<div class="trunc">${esc(v)}</div>`;
    return esc(v);
  };
  async function vList(key) {
    const S = SECTIONS[key]; setTitle(S.label);
    const rows = await api('GET', '/api/admin/' + key);
    view.innerHTML = `<p class="help" style="margin-top:0">${esc(S.help)}</p>
    <div class="toolbar"><button class="btn primary" id="add">+ Add ${esc(S.single)}</button>${S.bulk ? '<button class="btn" id="bulk">⬆ Upload many photos</button>' : ''}<span class="sp"></span><span class="help">${rows.length} item${rows.length === 1 ? '' : 's'}</span></div>
    ${rows.length ? `<div class="tablewrap"><table><thead><tr>${S.cols.map((c) => `<th>${COL_LABEL[c] || c}</th>`).join('')}<th></th></tr></thead><tbody>
    ${rows.map((r) => `<tr>${S.cols.map((c) => `<td>${cell(c, r[c], r)}</td>`).join('')}<td class="act">
      <button class="btn sm" data-edit="${r.id}">Edit</button><button class="btn sm danger" data-del="${r.id}">Delete</button></td></tr>`).join('')}</tbody></table></div>`
      : `<div class="panel empty">Nothing here yet. Click “Add ${esc(S.single)}” to create the first one.</div>`}`;
    const blank = () => (typeof S.blank === 'function' ? S.blank() : { ...S.blank });
    $('#add').onclick = () => openForm(key, blank(), null, rows);
    if (S.bulk) $('#bulk').onclick = () => bulkUpload(key);
    view.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => openForm(key, rows.find((r) => r.id == b.dataset.edit), b.dataset.edit, rows)));
    view.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
      if (!confirm('Delete this item permanently?')) return;
      try { await api('DELETE', `/api/admin/${key}/${b.dataset.del}`); toast('Deleted'); route(); } catch (e) { fail(e); }
    }));
  }
  function fieldHtml(f, v, rows) {
    const id = 'f_' + f.k, val = v ?? '';
    let input;
    if (f.t === T.area) input = `<textarea id="${id}" name="${f.k}">${esc(val)}</textarea>`;
    else if (f.t === T.date) input = `<input id="${id}" name="${f.k}" type="date" value="${esc(val)}">`;
    else if (f.t === T.num) input = `<input id="${id}" name="${f.k}" type="number" step="1" value="${esc(val)}">`;
    else if (f.t === T.check) return `<label class="chk"><input type="checkbox" name="${f.k}" ${+val ? 'checked' : ''}> ${esc(f.l)}</label>`;
    else if (f.t === T.image) return `<div class="fld imgfld ${f.wide ? 'wide' : ''}"><span>${esc(f.l)}${f.req ? ' *' : ''}</span><div class="prev" data-img="${f.k}">
        ${val ? `<img src="${esc(val)}" alt="">` : '<div class="none">No image</div>'}
        <div class="btns"><button type="button" class="btn sm" data-up>Upload</button><button type="button" class="btn sm" data-pick>Choose from library</button>${val ? '<button type="button" class="btn sm danger" data-clear>Remove</button>' : ''}</div></div>
        <input type="hidden" name="${f.k}" value="${esc(val)}"><input type="file" accept="image/jpeg,image/png,image/webp" hidden></div>`;
    else {
      let dl = '';
      if (f.list) { const [, col] = f.list.split('.'); const opts = [...new Set((rows || []).map((r) => r[col]).filter(Boolean))]; dl = `<datalist id="dl_${f.k}">${opts.map((o) => `<option value="${esc(o)}">`).join('')}</datalist>`; }
      input = `<input id="${id}" name="${f.k}" value="${esc(val)}" ${f.list ? `list="dl_${f.k}"` : ''} maxlength="500">${dl}`;
    }
    return `<label class="fld ${f.wide ? 'wide' : ''}"><span>${esc(f.l)}${f.req ? ' *' : ''}${f.help ? ` <span class="help">— ${esc(f.help)}</span>` : ''}</span>${input}</label>`;
  }
  function openForm(key, data, id, rows) {
    const S = SECTIONS[key];
    openModal((id ? 'Edit ' : 'Add ') + S.single, `<form id="rec" class="form-grid">${S.fields.map((f) => fieldHtml(f, data[f.k], rows)).join('')}
      <div class="modal-foot wide"><button type="button" class="btn" data-cancel>Cancel</button><button class="btn primary" type="submit">${id ? 'Save changes' : 'Add'}</button></div></form>`);
    const form = $('#rec'); wireImages(form);
    form.querySelector('[data-cancel]').onclick = closeModal;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const body = {};
      for (const f of S.fields) {
        const el = form.elements[f.k];
        if (f.t === T.check) body[f.k] = el.checked ? 1 : 0;
        else if (f.t === T.num) body[f.k] = el.value === '' ? 0 : Number(el.value);
        else body[f.k] = el.value.trim();
        if (f.req && !body[f.k]) { toast(`Please fill in “${f.l}”.`, true); return; }
      }
      const btn = form.querySelector('[type=submit]'); btn.disabled = true;
      try { await api(id ? 'PUT' : 'POST', `/api/admin/${key}${id ? '/' + id : ''}`, body); closeModal(); toast('Saved'); route(); }
      catch (err) { fail(err); btn.disabled = false; }
    };
  }

  /* ───────── Images ───────── */
  function fileToDataUrl(file, max = 1800) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('Please choose a JPG, PNG or WebP image.'));
      // Read as a data: URL (allowed by the site's Content-Security-Policy). blob: URLs are blocked by img-src.
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('Could not read that file.'));
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const sc = Math.min(1, max / Math.max(img.width, img.height));
          if (sc === 1 && file.size < 1.5e6) return resolve(fr.result);
          const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
          const x = c.getContext('2d'); if (file.type !== 'image/png') { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
          x.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.86));
        };
        img.onerror = () => reject(new Error('Could not read that image.'));
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  async function uploadFile(file) {
    const data = await fileToDataUrl(file);
    return (await api('POST', '/api/admin/upload', { name: file.name, data })).url;
  }
  function wireImages(scope) {
    scope.querySelectorAll('.imgfld').forEach((box) => {
      const hidden = box.querySelector('input[type=hidden]'), file = box.querySelector('input[type=file]'), prev = box.querySelector('.prev');
      const set = (url) => {
        hidden.value = url;
        prev.querySelector('img,.none').outerHTML = url ? `<img src="${esc(url)}" alt="">` : '<div class="none">No image</div>';
        const btns = prev.querySelector('.btns'); btns.querySelector('[data-clear]')?.remove();
        if (url) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm danger'; b.dataset.clear = ''; b.textContent = 'Remove'; b.onclick = () => set(''); btns.appendChild(b); }
      };
      box.querySelector('[data-up]').onclick = () => file.click();
      file.onchange = async () => {
        if (!file.files[0]) return;
        const b = box.querySelector('[data-up]'); b.disabled = true; b.textContent = 'Uploading…';
        try { set(await uploadFile(file.files[0])); } catch (e) { fail(e); } finally { b.disabled = false; b.textContent = 'Upload'; file.value = ''; }
      };
      box.querySelector('[data-pick]').onclick = () => pickMedia(set);
      box.querySelector('[data-clear]')?.addEventListener('click', () => set(''));
    });
  }
  async function pickMedia(cb) {
    const files = await api('GET', '/api/admin/uploads').catch((e) => { fail(e); return null; });
    if (!files) return;
    const ov = document.createElement('div');
    ov.className = 'modal'; ov.style.zIndex = 150;
    ov.innerHTML = `<div class="modal-box"><div class="modal-head"><h2>Choose an image</h2><button class="icon-btn" aria-label="Close">×</button></div>
      <div class="mgrid">${files.map((f) => `<button type="button" class="mitem" data-url="${esc(f.url)}"><img src="${esc(f.url)}" alt="" loading="lazy"><div>${esc(f.name)}</div></button>`).join('') || '<p class="empty">No images uploaded yet.</p>'}</div></div>`;
    const close = () => ov.remove();
    ov.querySelector('.icon-btn').onclick = close;
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
    ov.querySelectorAll('.mitem').forEach((b) => (b.onclick = () => { cb(b.dataset.url); close(); }));
    document.body.appendChild(ov);
  }

  async function bulkUpload(key) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = 'image/jpeg,image/png,image/webp';
    inp.onchange = async () => {
      const files = [...inp.files]; if (!files.length) return;
      const cat = prompt('Category for these photos (e.g. Sports Day):', 'General'); if (cat === null) return;
      let ok = 0;
      for (const [i, f] of files.entries()) {
        toast(`Uploading ${i + 1} of ${files.length}…`);
        try { const url = await uploadFile(f); await api('POST', '/api/admin/' + key, { image: url, title: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), category: cat.trim() || 'General', sort: 0, active: 1 }); ok++; }
        catch (e) { fail(new Error(`${f.name}: ${e.message}`)); }
      }
      toast(`${ok} photo${ok === 1 ? '' : 's'} added — edit captions as needed`); route();
    };
    inp.click();
  }

  /* ───────── Settings ───────── */
  async function vSettings() {
    setTitle('School Settings');
    const s = await api('GET', '/api/admin/settings');
    view.innerHTML = `<form id="sf">${SETTINGS.map(([title, fields]) => `<div class="panel"><h2>${esc(title)}</h2><div class="form-grid">
      ${fields.map(([k, l, t, help]) => fieldHtml({ k, l, t: t === 'area' ? T.area : t === 'image' ? T.image : t === 'check' ? T.check : T.text, help, wide: t === 'area' || t === 'image' }, s[k])).join('')}</div></div>`).join('')}
      <div class="toolbar"><button class="btn primary" type="submit">Save all settings</button><span class="help">Changes appear on the website immediately.</span></div></form>`;
    const f = $('#sf'); wireImages(f);
    f.onsubmit = async (e) => {
      e.preventDefault(); const body = {};
      for (const [, fields] of SETTINGS) for (const [k, , t] of fields) { const el = f.elements[k]; if (!el) continue; body[k] = t === 'check' ? (el.checked ? '1' : '0') : el.value.trim(); }
      try { await api('PUT', '/api/admin/settings', body); toast('Settings saved'); } catch (err) { fail(err); }
    };
  }

  /* ───────── Inbox ───────── */
  let inboxTab = 'all';
  async function vInbox() {
    setTitle('Enquiries');
    const rows = await api('GET', '/api/admin/inquiries' + (inboxTab === 'all' ? '' : '?type=' + inboxTab));
    view.innerHTML = `<div class="tabs">${[['all', 'All'], ['admission', 'Admission'], ['contact', 'Messages']].map(([k, l]) => `<button class="tab${inboxTab === k ? ' on' : ''}" data-tab="${k}">${l}</button>`).join('')}<span class="sp" style="flex:1"></span><a class="btn sm" href="/api/admin/inquiries/export.csv">⬇ Export CSV</a></div>
    ${rows.length ? `<div class="tablewrap"><table><thead><tr><th>Received</th><th>Name</th><th>Type</th><th>Phone</th><th>Class</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${fmtTime(r.created_at)}</td><td><b>${esc(r.name)}</b></td><td>${r.type === 'admission' ? 'Admission' : 'Message'}</td><td>${esc(r.phone)}</td><td>${esc(r.class_applying)}</td><td><span class="pill ${r.status}">${r.status}</span></td>
      <td class="act"><button class="btn sm" data-open="${r.id}">Open</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="panel empty">No enquiries yet.</div>'}`;
    view.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { inboxTab = b.dataset.tab; vInbox(); }));
    view.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => openInquiry(rows.find((r) => r.id == b.dataset.open))));
  }
  async function setStatus(r, status) { await api('PUT', '/api/admin/inquiries/' + r.id, { status }); r.status = status; }
  function openInquiry(r) {
    openModal(r.type === 'admission' ? 'Admission enquiry' : 'Message', `<dl class="kv"><dt>Name</dt><dd>${esc(r.name)}</dd><dt>Phone</dt><dd><a href="tel:${esc(r.phone)}">${esc(r.phone)}</a></dd>
      ${r.email ? `<dt>Email</dt><dd><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></dd>` : ''}${r.class_applying ? `<dt>Class</dt><dd>${esc(r.class_applying)}</dd>` : ''}<dt>Received</dt><dd>${fmtTime(r.created_at)}</dd></dl>
      ${r.message ? `<div class="msgbody">${esc(r.message)}</div>` : ''}
      <div class="modal-foot"><button class="btn danger" data-del>Delete</button><span style="flex:1"></span><button class="btn" data-st="new">Mark new</button><button class="btn" data-st="read">Mark read</button><button class="btn primary" data-st="done">Mark done</button></div>`);
    if (r.status === 'new') setStatus(r, 'read').then(() => { renderNav('inbox'); }).catch(() => {});
    $('#modal-body').querySelectorAll('[data-st]').forEach((b) => (b.onclick = async () => { try { await setStatus(r, b.dataset.st); closeModal(); toast('Updated'); route(); } catch (e) { fail(e); } }));
    $('#modal-body').querySelector('[data-del]').onclick = async () => { if (!confirm('Delete this enquiry permanently?')) return; try { await api('DELETE', '/api/admin/inquiries/' + r.id); closeModal(); toast('Deleted'); route(); } catch (e) { fail(e); } };
    $('#modal-x').onclick = () => { closeModal(); route(); };
  }

  /* ───────── Media library ───────── */
  async function vMedia() {
    setTitle('Media Library');
    const files = await api('GET', '/api/admin/uploads');
    view.innerHTML = `<div class="toolbar"><button class="btn primary" id="mup">⬆ Upload images</button><span class="sp"></span><span class="help">${files.length} file${files.length === 1 ? '' : 's'} · images in use cannot be deleted</span></div>
    <div class="mgrid">${files.map((f) => `<div class="mcard"><img src="${esc(f.url)}" alt="" loading="lazy"><div><span>${esc(f.name)}<br>${(f.size / 1024).toFixed(0)} KB · ${f.used ? '<b>in use</b>' : 'unused'}</span>
      <span><button class="btn sm" data-copy="${esc(f.url)}">Copy link</button> <button class="btn sm danger" data-rm="${esc(f.name)}" ${f.used ? 'disabled' : ''}>Delete</button></span></div></div>`).join('')}</div>`;
    $('#mup').onclick = () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = 'image/jpeg,image/png,image/webp';
      inp.onchange = async () => { for (const f of inp.files) { try { await uploadFile(f); } catch (e) { fail(e); } } toast('Upload finished'); route(); };
      inp.click();
    };
    view.querySelectorAll('[data-copy]').forEach((b) => (b.onclick = () => { navigator.clipboard?.writeText(location.origin + b.dataset.copy); toast('Link copied'); }));
    view.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = async () => { if (!confirm('Delete this file?')) return; try { await api('DELETE', '/api/admin/uploads/' + encodeURIComponent(b.dataset.rm)); toast('Deleted'); route(); } catch (e) { fail(e); } }));
  }

  /* ───────── Password ───────── */
  function vPassword() {
    setTitle('Change Password');
    view.innerHTML = `<form class="panel" id="pw" style="max-width:460px"><div class="form-grid" style="grid-template-columns:1fr">
      <label class="fld"><span>Current password</span><input type="password" name="current" autocomplete="current-password" required></label>
      <label class="fld"><span>New password <span class="help">— at least 8 characters</span></span><input type="password" name="next" autocomplete="new-password" minlength="8" required></label>
      <label class="fld"><span>Repeat new password</span><input type="password" name="again" autocomplete="new-password" required></label></div>
      <div class="toolbar" style="margin:1rem 0 0"><button class="btn primary" type="submit">Update password</button></div></form>`;
    $('#pw').onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      if (f.next.value !== f.again.value) return toast('New passwords do not match.', true);
      try { await api('POST', '/api/admin/password', { current: f.current.value, next: f.next.value }); me.must_change = false; renderAlert(); f.reset(); toast('Password updated'); } catch (err) { fail(err); }
    };
  }

  /* ───────── Modal ───────── */
  function openModal(title, html) { $('#modal-title').textContent = title; $('#modal-body').innerHTML = html; $('#modal').hidden = false; $('#modal-x').onclick = closeModal; }
  function closeModal() { $('#modal').hidden = true; $('#modal-body').innerHTML = ''; }
  $('#modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

  boot();
})();
