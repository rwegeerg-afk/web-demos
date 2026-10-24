// Studio Alder demo: navigation, scroll reveal, form validation, projects filter and dialog.
// No form data is sent anywhere (see README, "Connecting the contact form").

document.documentElement.classList.remove('no-js');

// ---- mobile navigation ----
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('site-nav');
if (toggle && nav) {
  const setNav = (open) => { toggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); };
  toggle.addEventListener('click', () => setNav(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setNav(false); toggle.focus(); } });
  window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => { if (e.matches) setNav(false); });
}

// ---- scroll reveal (content stays visible if IntersectionObserver is missing) ----
const reveals = [...document.querySelectorAll('.reveal')];
const show = (el) => el.classList.add('in');
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  reveals.forEach((el) => io.observe(el));
  // Safety net: the observer can miss blocks during fast scrolling or anchor jumps, so anything
  // whose top is already above the bottom of the viewport is shown on the next frame.
  let queued = false;
  const sweep = () => {
    queued = false;
    reveals.forEach((el) => { if (!el.classList.contains('in') && el.getBoundingClientRect().top < innerHeight) { show(el); io.unobserve(el); } });
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(sweep); } }, { passive: true });
  addEventListener('beforeprint', () => reveals.forEach(show));
} else reveals.forEach(show);

// ---- contact form ----
const form = document.getElementById('contact-form');
if (form) {
  const rules = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Please enter your name.'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.'),
    type: (v) => (v ? '' : 'Please choose a project type.'),
    message: (v) => (v.trim().length >= 20 ? '' : 'Please tell us a little more (at least 20 characters).'),
  };
  const status = document.getElementById('form-status');
  const check = (name) => {
    const el = form.elements[name];
    const msg = rules[name](el.value);
    const err = document.getElementById(`e-${name}`);
    err.textContent = msg; err.hidden = !msg;
    el.closest('.field').classList.toggle('invalid', Boolean(msg));
    el.setAttribute('aria-invalid', String(Boolean(msg)));
    if (msg) el.setAttribute('aria-describedby', err.id); else el.removeAttribute('aria-describedby');
    return !msg;
  };
  Object.keys(rules).forEach((n) => {
    form.elements[n].addEventListener('blur', () => check(n));
    form.elements[n].addEventListener('input', () => { if (form.elements[n].closest('.field').classList.contains('invalid')) check(n); });
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.hidden = true;
    const names = Object.keys(rules);
    const ok = names.map(check);
    const bad = names.find((_, i) => !ok[i]);
    if (bad) { form.elements[bad].focus(); return; }
    // Demo only: nothing is sent. A real site would POST to the studio's backend or a form service
    // and show this message only after a successful response.
    status.textContent = 'Thank you. Your enquiry looks complete. This is a demo studio, so nothing was sent.';
    status.hidden = false; status.focus();
  });
}

// ---- projects: filter + detail dialog ----
const grid = document.getElementById('project-grid');
if (grid) {
  const chips = [...document.querySelectorAll('.chip')];
  const count = document.getElementById('project-count');
  const empty = document.getElementById('project-empty');
  const dialog = document.getElementById('project-dialog');
  const labels = { house: 'New house', extension: 'Extension', interior: 'Interior', renovation: 'Renovation' };
  let projects = [];
  let lastTrigger = null;

  const render = (type) => {
    const list = type === 'all' ? projects : projects.filter((p) => p.type === type);
    grid.innerHTML = '';
    list.forEach((p) => {
      const li = document.createElement('li');
      li.innerHTML = `<button class="pbtn" type="button" data-id="${p.id}" aria-haspopup="dialog">
        <img src="${p.image}" alt="Floor plan drawing of ${p.name}" width="400" height="300" loading="lazy">
        <span class="pcard-body"><span class="tag">${labels[p.type]} · ${p.year}</span><span class="card-title">${p.name}</span><span>${p.area} m² · ${p.place}</span></span></button>`;
      grid.append(li);
    });
    grid.removeAttribute('aria-busy');
    count.textContent = `${list.length} of ${projects.length} projects`;
    empty.hidden = list.length > 0;
  };

  const open = (id, trigger) => {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    lastTrigger = trigger ?? null;
    document.getElementById('d-img').src = p.image;
    document.getElementById('d-img').alt = `Floor plan drawing of ${p.name}`;
    document.getElementById('d-title').textContent = p.name;
    document.getElementById('d-tag').textContent = `${labels[p.type]} · ${p.year}`;
    document.getElementById('d-blurb').textContent = p.blurb;
    document.getElementById('d-brief').textContent = p.brief;
    document.getElementById('d-area').textContent = `${p.area} m²`;
    document.getElementById('d-place').textContent = p.place;
    document.getElementById('d-rooms').textContent = p.rooms.map((r) => r.label + (r.existing ? ' (existing)' : '')).join(', ');
    if (!dialog.open) dialog.showModal();
    history.replaceState(null, '', `#${id}`);
  };

  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { history.replaceState(null, '', location.pathname); lastTrigger?.focus(); });

  grid.addEventListener('click', (e) => { const b = e.target.closest('.pbtn'); if (b) open(b.dataset.id, b); });
  chips.forEach((c) => c.addEventListener('click', () => {
    chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
    render(c.dataset.type);
  }));

  window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (id && projects.some((p) => p.id === id)) open(id); });

  fetch('assets/projects.json')
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((data) => {
      projects = data;
      render('all');
      if (location.hash.length > 1) open(location.hash.slice(1));
    })
    .catch(() => {
      grid.innerHTML = '';
      grid.removeAttribute('aria-busy');
      count.textContent = '';
      empty.textContent = 'The project list could not be loaded. Please reload the page.';
      empty.hidden = false;
    });
}
