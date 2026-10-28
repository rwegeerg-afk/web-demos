// Admin prototype: replays the sync steps with the real public JSON. No server calls beyond loading course.json.
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const fmt = (b) => (b >= 1024 ** 3 ? (b / 1024 ** 3).toFixed(1) + ' GB' : (b / 1024 ** 2).toFixed(0) + ' MB');
  let data;

  const fill = () => {
    const s = data.stats;
    const set = (k, v) => { $(`[data-k="${k}"]`).textContent = v; };
    set('folders', s.folders); set('files', s.files); set('size', fmt(s.bytes));
    set('synced', new Date(data.generatedAt).toISOString().replace('T', ' ').slice(0, 16));
    $('#json').textContent = JSON.stringify(data, null, 1).split('\n').slice(0, 44).join('\n') + '\n  …';
  };

  fetch('assets/course.json').then((r) => r.json()).then((d) => { data = d; fill(); }).catch(() => { $('#json').textContent = 'Could not load course.json'; });

  $('#fetch').addEventListener('click', async (e) => {
    if (!data) return;
    const btn = e.currentTarget; btn.disabled = true;
    const log = $('#log'); log.textContent = '';
    const s = data.stats;
    const steps = [
      'Connecting with the read-only key…',
      `Listing folder: ${s.folders + s.files} entries returned`,
      'Removing IDs, links and checksums…',
      `Building tree: ${s.folders} folders, ${s.files} files, ${fmt(s.bytes)}`,
      'Leak check passed: no URLs or IDs in the public JSON',
    ];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const line of steps) {
      log.append(Object.assign(document.createElement('div'), { textContent: '› ' + line }));
      if (!reduce) await new Promise((r) => setTimeout(r, 450));
    }
    const ok = Object.assign(document.createElement('div'), { className: 'ok', textContent: '✓ Saved to cache. The product page now serves this copy.' });
    log.append(ok);
    $('#status').textContent = 'Cache refreshed just now (demo)';
    btn.disabled = false;
  });
})();
