// Forma Studio demo: mobile menu, material tabs, price estimator, quote form validation.
// The form does NOT send data anywhere. See README, "Connecting the form".

// --- mobile navigation -------------------------------------------------
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('site-nav');

function setNav(open) {
  toggle.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('open', open);
}
toggle.addEventListener('click', () => setNav(toggle.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setNav(false); toggle.focus(); }
});
window.matchMedia('(min-width: 821px)').addEventListener('change', (e) => { if (e.matches) setNav(false); });

// --- material tabs (WAI-ARIA tabs pattern) -----------------------------
const tabs = [...document.querySelectorAll('[data-tabs] [role="tab"]')];

function selectTab(tab, focus = true) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  });
  if (focus) tab.focus();
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectTab(tab, false));
  tab.addEventListener('keydown', (e) => {
    const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    selectTab(tabs[(keys[e.key] + tabs.length) % tabs.length]);
  });
});

// --- price estimator (demo formula) ------------------------------------
const estMaterial = document.getElementById('est-material');
const estSize = document.getElementById('est-size');
const estQty = document.getElementById('est-qty');
const estResult = document.getElementById('est-result');

function estimate() {
  const size = Number(estSize.value);
  const qty = Number(estQty.value);
  if (!Number.isFinite(size) || !Number.isFinite(qty) || size < 10 || size > 250 || qty < 1 || qty > 200) {
    estResult.textContent = 'Enter a size of 10–250 mm and a quantity of 1–200.';
    return;
  }
  const factor = Number(estMaterial.value);
  const perPart = (4 + (size / 40) ** 2 * 1.6) * factor;
  const discount = qty >= 50 ? 0.7 : qty >= 10 ? 0.85 : 1;
  const total = perPart * qty * discount;
  const low = Math.max(12, Math.round(total * 0.9));
  const high = Math.max(14, Math.round(total * 1.15));
  estResult.textContent = `About $${low}–$${high} in total`;
}
[estMaterial, estSize, estQty].forEach((el) => el.addEventListener('input', estimate));
estimate();

// --- quote form ---------------------------------------------------------
const form = document.getElementById('quote-form');
const status = document.getElementById('form-status');
const rules = {
  name: (v) => (v.trim().length >= 2 ? '' : 'Please enter your name.'),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.'),
  type: (v) => (v ? '' : 'Please choose what you need.'),
};

function check(name) {
  const input = form.elements[name];
  const msg = rules[name](input.value);
  const err = document.getElementById(`e-${name}`);
  err.textContent = msg;
  err.hidden = !msg;
  input.closest('.field').classList.toggle('invalid', Boolean(msg));
  if (msg) input.setAttribute('aria-describedby', err.id); else input.removeAttribute('aria-describedby');
  input.setAttribute('aria-invalid', String(Boolean(msg)));
  return !msg;
}

Object.keys(rules).forEach((name) => {
  form.elements[name].addEventListener('blur', () => check(name));
  form.elements[name].addEventListener('input', () => { if (form.elements[name].closest('.field').classList.contains('invalid')) check(name); });
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  status.hidden = true;
  const results = Object.keys(rules).map(check);
  const firstBad = Object.keys(rules).find((_, i) => !results[i]);
  if (firstBad) { form.elements[firstBad].focus(); return; }
  // Demo only: no network request is made. A real site would POST to a form service
  // or the owner's backend here and show this message only after a successful response.
  status.textContent = 'Thanks, your request looks complete. This is a demo, so nothing was sent.';
  status.hidden = false;
  status.focus();
});
