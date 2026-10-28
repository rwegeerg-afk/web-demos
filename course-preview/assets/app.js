// Northlight Courses demo: product page + course-contents preview (modal with a file tree).
// Data comes from assets/course.json, the public, cached copy of a folder listing (names, nesting, sizes only).
(() => {
  'use strict';

  const TYPES = {
    video:    { label: 'Videos',       icon: 'i-video',    color: '#4f3df5' },
    pdf:      { label: 'PDFs',         icon: 'i-pdf',      color: '#d9461f' },
    design:   { label: 'Design files', icon: 'i-design',   color: '#0e8a65' },
    archive:  { label: 'Archives',     icon: 'i-archive',  color: '#a86a00' },
    subtitle: { label: 'Subtitles',    icon: 'i-subtitle', color: '#6b6a82' },
    other:    { label: 'Other',        icon: 'i-file',     color: '#8a889f' },
  };

  const $ = (s, r = document) => r.querySelector(s);
  const svg = (id, cls = 'ic') => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', cls); s.setAttribute('aria-hidden', 'true');
    const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    u.setAttribute('href', '#' + id); s.appendChild(u);
    return s;
  };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const fmtSize = (b) => {
    const f = (n, d) => n.toFixed(d).replace(/\.0$/, '');
    if (b >= 1024 ** 3) return f(b / 1024 ** 3, 1) + ' GB';
    if (b >= 1024 ** 2) return f(b / 1024 ** 2, b >= 100 * 1024 ** 2 ? 0 : 1) + ' MB';
    if (b >= 1024) return Math.round(b / 1024) + ' KB';
    return b + ' B';
  };
  const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

  // ---------- toast + cart ----------
  const toast = $('#toast');
  let toastTimer;
  const say = (msg) => {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  };
  let cart = 0;
  $('#add').addEventListener('click', () => {
    cart += 1;
    $('#cart-count').textContent = String(cart);
    $('#cart').setAttribute('aria-label', `Cart, ${plural(cart, 'item')}`);
    say('Added to cart. Demo shop: nothing is charged.');
  });

  // ---------- tabs ----------
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const selectTab = (t, focus) => {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) t.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); selectTab(tabs[(i + k + tabs.length) % tabs.length], true); }
      if (e.key === 'Home') { e.preventDefault(); selectTab(tabs[0], true); }
      if (e.key === 'End') { e.preventDefault(); selectTab(tabs[tabs.length - 1], true); }
    });
  });

  // ---------- preview modal ----------
  const dlg = $('#preview');
  const tree = $('#pv-tree');
  const search = $('#pv-search');
  const live = $('#pv-live');
  const empty = $('#pv-empty');
  const openBtn = $('#open-preview');

  let data = null;
  let loadError = false;
  const open = new Set();       // paths of expanded folders
  let query = '';
  let focusPath = null;         // path of the roving-tabindex item
  let uid = 0;

  const dataReady = fetch('assets/course.json')
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => { data = d; hydrate(); })
    .catch(() => { loadError = true; });

  function hydrate() {
    const s = data.stats;
    $('#chip-modules').textContent = plural(s.modules, 'module');
    $('#chip-files').textContent = plural(s.files, 'file');
    $('#chip-size').textContent = fmtSize(s.bytes);
    $('#hint').textContent = `${plural(s.files, 'file')} in ${plural(s.folders, 'folder')}, ${fmtSize(s.bytes)} in total. See exactly what is inside before you buy.`;

    const cards = [
      ['Folders', s.folders],
      ['Files', s.files],
      ['Total size', fmtSize(s.bytes)],
      ['Videos', s.types.video.count],
      ['PDFs', s.types.pdf.count],
      ['Other files', s.files - s.types.video.count - s.types.pdf.count],
    ];
    const stats = $('#pv-stats');
    stats.replaceChildren(...cards.map(([k, v]) => {
      const d = el('div', 'stat');
      d.append(el('div', 'v', String(v)), el('div', 'k', k));
      return d;
    }));

    const order = Object.keys(TYPES).filter((t) => s.types[t].count > 0);
    const bar = $('#pv-bar');
    bar.replaceChildren(...order.map((t) => {
      const i = document.createElement('i');
      i.style.flex = `${s.types[t].count} 1 0`; i.style.background = TYPES[t].color;
      return i;
    }));
    bar.setAttribute('aria-label', 'File types: ' + order.map((t) => `${s.types[t].count} ${TYPES[t].label}`).join(', '));
    $('#pv-legend').replaceChildren(...order.map((t) => {
      const li = el('li');
      const sw = document.createElement('i'); sw.style.background = TYPES[t].color;
      const b = el('b', null, String(s.types[t].count));
      li.append(sw, b, document.createTextNode(` ${TYPES[t].label} · ${fmtSize(s.types[t].bytes)}`));
      return li;
    }));
    $('#pv-title').textContent = data.title;

    const d = new Date(data.generatedAt);
    const when = d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    $('#pv-synced').textContent = `Synced ${when} UTC (cached copy).`;

    // First module open by default so the preview never looks empty.
    const first = data.children.find((c) => c.kind === 'folder');
    if (first) open.add(first.name);
    focusPath = data.children[0] ? data.children[0].name : null;
  }

  // does a node, or anything below it, match the query?
  const matches = (n, q) => !q || n.name.toLowerCase().includes(q) || (n.kind === 'folder' && n.children.some((c) => matches(c, q)));

  function highlight(target, text, q) {
    if (!q) { target.textContent = text; return; }
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) { target.textContent = text; return; }
    target.append(document.createTextNode(text.slice(0, i)), Object.assign(document.createElement('mark'), { textContent: text.slice(i, i + q.length) }), document.createTextNode(text.slice(i + q.length)));
  }

  function build(nodes, level, parentPath, q, showAll) {
    const ul = document.createElement('ul');
    if (level > 1) ul.setAttribute('role', 'group');
    for (const n of nodes) {
      if (!showAll && !matches(n, q)) continue;
      const path = parentPath ? parentPath + '/' + n.name : n.name;
      const li = document.createElement('li');
      const nameId = 'pvn-' + (++uid);
      li.setAttribute('role', 'treeitem');
      li.setAttribute('aria-level', String(level));
      li.setAttribute('aria-labelledby', nameId);
      li.dataset.path = path;
      li.tabIndex = path === focusPath ? 0 : -1;
      const row = el('div', 'row');
      const nameEl = el('span', 'name'); nameEl.id = nameId;

      if (n.kind === 'folder') {
        li.classList.add('folder');
        const nameMatches = q && n.name.toLowerCase().includes(q);
        const isOpen = q ? true : open.has(path);
        li.setAttribute('aria-expanded', String(isOpen));
        const badge = el('span', 'badge-ic'); badge.style.setProperty('--c', '#a86a00'); badge.append(svg('i-folder'));
        row.append(svg('i-chevron', 'ic chev'), badge);
        highlight(nameEl, n.name, q);
        nameEl.append(el('span', 'cnt', plural(n.files, 'file')));
        row.append(nameEl, el('span', 'size', fmtSize(n.bytes)));
        li.append(row);
        if (isOpen) li.append(build(n.children, level + 1, path, q, showAll || nameMatches));
      } else {
        const t = TYPES[n.type] ?? TYPES.other;
        const badge = el('span', 'badge-ic'); badge.style.setProperty('--c', t.color); badge.append(svg(t.icon));
        const sp = el('span', 'spacer');
        row.append(sp, badge);
        highlight(nameEl, n.name, q);
        row.append(nameEl, el('span', 'size', fmtSize(n.bytes)));
        li.append(row);
      }
      ul.append(li);
    }
    return ul;
  }

  function countFiles(nodes, q) {
    let c = 0;
    for (const n of nodes) {
      if (n.kind === 'file') { if (n.name.toLowerCase().includes(q)) c++; }
      else c += countFiles(n.children, q);
    }
    return c;
  }

  function render(restoreFocus = false) {
    if (!data) return;
    uid = 0;
    const q = query;
    const list = build(data.children, 1, '', q, false);
    tree.replaceChildren(...list.children);
    const none = q && !tree.children.length;
    empty.hidden = !none;
    if (none) empty.textContent = `No files or folders match "${search.value.trim()}".`;
    if (q) {
      const n = countFiles(data.children, q);
      live.textContent = none ? 'No matches.' : `${plural(n, 'matching file')}.`;
    }
    // make sure exactly one item is tabbable
    if (!tree.querySelector('[tabindex="0"]') && tree.firstElementChild) tree.firstElementChild.tabIndex = 0;
    if (restoreFocus) {
      const target = [...tree.querySelectorAll('[role="treeitem"]')].find((x) => x.dataset.path === focusPath) ?? tree.firstElementChild;
      target?.focus({ preventScroll: false });
    }
  }

  const items = () => [...tree.querySelectorAll('[role="treeitem"]')];
  const folderPaths = (nodes, base = '') => nodes.flatMap((n) => n.kind === 'folder' ? [base + n.name, ...folderPaths(n.children, base + n.name + '/')] : []);

  function toggle(path, force) {
    const isOpen = open.has(path);
    const next = force ?? !isOpen;
    if (next === isOpen) return;
    next ? open.add(path) : open.delete(path);
    focusPath = path;
    render(true);
  }

  function moveFocus(li) {
    if (!li) return;
    const cur = tree.querySelector('[tabindex="0"]'); if (cur) cur.tabIndex = -1;
    li.tabIndex = 0; focusPath = li.dataset.path; li.focus();
  }

  tree.addEventListener('click', (e) => {
    const row = e.target.closest('.row'); if (!row) return;
    const li = row.parentElement;
    moveFocus(li);
    if (li.hasAttribute('aria-expanded') && !query) toggle(li.dataset.path);
  });

  tree.addEventListener('keydown', (e) => {
    const li = e.target.closest('[role="treeitem"]'); if (!li) return;
    const all = items(); const i = all.indexOf(li);
    const isFolder = li.hasAttribute('aria-expanded');
    const expanded = li.getAttribute('aria-expanded') === 'true';
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); moveFocus(all[Math.min(i + 1, all.length - 1)]); break;
      case 'ArrowUp': e.preventDefault(); moveFocus(all[Math.max(i - 1, 0)]); break;
      case 'Home': e.preventDefault(); moveFocus(all[0]); break;
      case 'End': e.preventDefault(); moveFocus(all[all.length - 1]); break;
      case 'ArrowRight':
        e.preventDefault();
        if (isFolder && !expanded && !query) toggle(li.dataset.path, true);
        else if (isFolder && expanded) moveFocus(li.querySelector('[role="treeitem"]'));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (isFolder && expanded && !query) toggle(li.dataset.path, false);
        else moveFocus(li.parentElement.closest('[role="treeitem"]'));
        break;
      case 'Enter': case ' ':
        if (isFolder && !query) { e.preventDefault(); toggle(li.dataset.path); }
        break;
      default:
    }
  });

  let searchTimer;
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { query = search.value.trim().toLowerCase(); render(); }, 120);
  });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { const f = tree.querySelector('[role="treeitem"]'); if (f) { e.preventDefault(); moveFocus(f); } }
  });
  $('#pv-expand').addEventListener('click', () => { if (!data) return; folderPaths(data.children).forEach((p) => open.add(p)); render(); live.textContent = 'All folders expanded.'; });
  $('#pv-collapse').addEventListener('click', () => { open.clear(); render(); live.textContent = 'All folders collapsed.'; });

  async function openPreview() {
    if (!data && !loadError) await dataReady;
    if (loadError) { say('The course contents could not be loaded. Please try again.'); return; }
    query = ''; search.value = '';
    render();
    document.documentElement.classList.add('modal-open');
    dlg.showModal();
    dlg.querySelector('.pv-body').scrollTop = 0;
  }
  openBtn.addEventListener('click', openPreview);
  $('#pv-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });   // click on the backdrop
  dlg.addEventListener('close', () => { document.documentElement.classList.remove('modal-open'); openBtn.focus(); });
})();
