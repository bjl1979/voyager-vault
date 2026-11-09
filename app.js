/* Voyager Vault – offline travel document folders (all data stays on this device) */
'use strict';
const APP_VERSION = '2.2.2';

const CATS = [
  { id: 'passport',  label: 'Passport / ID',  short: 'Passport',  folder: 'Passport_ID',  ic: 'book-user', c1: '#818CF8', c2: '#6366F1' },
  { id: 'visa',      label: 'Visa',           short: 'Visa',      folder: 'Visa',         ic: 'stamp', c1: '#2DD4BF', c2: '#0D9488' },
  { id: 'flight',    label: 'Flights',        short: 'Flights',   folder: 'Flights',      ic: 'plane', c1: '#60A5FA', c2: '#2563EB' },
  { id: 'hotel',     label: 'Hotels',         short: 'Hotels',    folder: 'Hotels',       ic: 'bed-double', c1: '#C084FC', c2: '#9333EA' },
  { id: 'insurance', label: 'Insurance',      short: 'Insurance', folder: 'Insurance',    ic: 'shield-check', c1: '#4ADE80', c2: '#16A34A' },
  { id: 'transport', label: 'Transport',      short: 'Transport', folder: 'Transport',    ic: 'car-front', c1: '#FB923C', c2: '#EA580C' },
  { id: 'itinerary', label: 'Itinerary',      short: 'Itinerary', folder: 'Itinerary',    ic: 'map', c1: '#F472B6', c2: '#DB2777' },
  { id: 'work',      label: 'Work / Permits', short: 'Work',      folder: 'Work_Permits', ic: 'briefcase', c1: '#94A3B8', c2: '#475569' },
  { id: 'other',     label: 'Other',          short: 'Other',     folder: 'Other',        ic: 'paperclip', c1: '#CBD5E1', c2: '#64748B' },
];
const cat = id => CATS.find(c => c.id === id) || CATS[CATS.length - 1];
/** coloured rounded-square icon for a document type */
const catChip = (c, size = 36, isz = 18) => `<span class="chip-ic" style="width:${size}px;height:${size}px;background:linear-gradient(145deg,${c.c1},${c.c2})">${icon(c.ic, isz, 2.2)}</span>`;
const PURPOSES = ['Business', 'Leisure', 'Family', 'Photography', 'Other'];
const NOTE_TOPICS = [
  { k: 'SIM / eSIM', ic: 'smartphone', col: '#3B82F6', hint: 'e.g. Singtel tourist eSIM, buy at Changi T3 arrivals, 100 GB for S$15' },
  { k: 'Money',      ic: 'banknote', col: '#16A34A', hint: 'e.g. Currency SGD. Best exchange: Mustafa Centre. Cards accepted almost everywhere' },
  { k: 'Transport',  ic: 'car-taxi-front', col: '#EA580C', hint: 'e.g. Use Grab for taxis. EZ-Link card for the MRT' },
  { k: 'Emergency',  ic: 'siren', col: '#E5233A', hint: 'e.g. Police 999 · Ambulance 995 · Nearest hospital…' },
  { k: 'Embassy',    ic: 'landmark', col: '#6366F1', hint: 'e.g. High Commission of India, 31 Grange Rd · +65 6737 6777' },
  { k: 'Power plug', ic: 'plug-zap', col: '#CA8A04', hint: 'e.g. Type G (UK 3-pin), 230 V. Pack an adapter' },
  { k: 'Contacts',   ic: 'contact', col: '#0D9488', hint: 'e.g. Site contact / host name and phone, hotel front desk' },
  { k: 'To do',      ic: 'circle-check', col: '#2563EB', hint: 'e.g. Check in online 24 h before, print hotel voucher' },
];
const topicOf = k => NOTE_TOPICS.find(n => n.k === k) || { ic: 'notebook-text', col: '#8DC5FF' };
const packText = t => ((t.carry && t.carry.sections) || []).map(s => s.name + ' ' + s.items.map(i => i.text).join(' ')).join(' ');
const noteText = t => packText(t) + ' ' + (t.noteItems || []).map(n => `${n.topic || ''} ${n.text}`).join(' ') + ' ' + (t.todos || []).map(x => `${x.title} ${x.details || ''}`).join(' ');
const PRIO = { urgent: { label: 'Urgent', ic: 'siren' }, normal: { label: 'Normal', ic: 'bell' }, delayed: { label: 'Delayed', ic: 'circle-pause' } };
const openUrgent = t => (t.todos || []).filter(x => !x.done && x.priority === 'urgent').length;
const collapsed = (() => { try { return JSON.parse(localStorage.getItem('vv-collapse') || '{}'); } catch { return {}; } })();
function toggleCollapsed(k) { collapsed[k] = !collapsed[k]; store.set('vv-collapse', JSON.stringify(collapsed)); }

const COUNTRIES = {
  Qatar:'QA', India:'IN', 'United Arab Emirates':'AE', 'Saudi Arabia':'SA', Oman:'OM', Bahrain:'BH', Kuwait:'KW',
  Singapore:'SG', Malaysia:'MY', Thailand:'TH', Indonesia:'ID', 'Sri Lanka':'LK', Maldives:'MV', Nepal:'NP', Bhutan:'BT',
  Vietnam:'VN', Cambodia:'KH', Laos:'LA', Myanmar:'MM', Bangladesh:'BD', Pakistan:'PK', Japan:'JP', China:'CN',
  'South Korea':'KR', 'Hong Kong':'HK', Taiwan:'TW', Philippines:'PH', Australia:'AU', 'New Zealand':'NZ',
  'United Kingdom':'GB', Ireland:'IE', France:'FR', Germany:'DE', Italy:'IT', Spain:'ES', Portugal:'PT',
  Netherlands:'NL', Belgium:'BE', Switzerland:'CH', Austria:'AT', Greece:'GR', Turkey:'TR', Cyprus:'CY', Malta:'MT',
  Iceland:'IS', Norway:'NO', Sweden:'SE', Finland:'FI', Denmark:'DK', Poland:'PL', Czechia:'CZ', Hungary:'HU',
  Croatia:'HR', Russia:'RU', Azerbaijan:'AZ', Georgia:'GE', Armenia:'AM', Kazakhstan:'KZ', Uzbekistan:'UZ',
  Egypt:'EG', Morocco:'MA', Jordan:'JO', Lebanon:'LB', Iraq:'IQ', Iran:'IR', Kenya:'KE', Tanzania:'TZ', Uganda:'UG',
  Rwanda:'RW', 'South Africa':'ZA', Botswana:'BW', Namibia:'NA', Zambia:'ZM', Zimbabwe:'ZW', Mauritius:'MU',
  Seychelles:'SC', 'United States':'US', Canada:'CA', Mexico:'MX', Brazil:'BR', Argentina:'AR', Peru:'PE',
  Chile:'CL', Colombia:'CO', 'Costa Rica':'CR', Ecuador:'EC',
};
const ALIASES = { uae:'AE', usa:'US', us:'US', uk:'GB', england:'GB', ksa:'SA', korea:'KR', 'czech republic':'CZ', turkiye:'TR' };

/* ---------------- helpers ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const app = $('#app'), layer = $('#layer');

function isoFor(country) {
  if (!country) return '';
  const k = country.trim().toLowerCase();
  if (ALIASES[k]) return ALIASES[k];
  const hit = Object.keys(COUNTRIES).find(n => n.toLowerCase() === k);
  return hit ? COUNTRIES[hit] : '';
}
function flag(country) {
  const iso = isoFor(country);
  if (!iso) return '🌍';
  return String.fromCodePoint(...[...iso].map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65));
}
const dayNum = s => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
const todayStr = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; };
const today = () => dayNum(todayStr());
const WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(s, opts = { weekday: 1, year: 1 }) {
  if (!s) return '';
  const d = new Date(dayNum(s) * 864e5);
  return `${opts.weekday ? WD[d.getUTCDay()] + ' ' : ''}${d.getUTCDate()} ${MO[d.getUTCMonth()]}${opts.year ? ' ' + d.getUTCFullYear() : ''}`;
}
function dateRange(t) {
  if (!t.start) return 'Dates not set';
  if (!t.end || t.end === t.start) return fmtDate(t.start);
  const sameYear = t.start.slice(0, 4) === t.end.slice(0, 4);
  const a = fmtDate(t.start, { weekday: 1, year: !sameYear });
  const days = dayNum(t.end) - dayNum(t.start) + 1;
  return `${a} – ${fmtDate(t.end)} · ${days} days`;
}
function shortRange(t) {
  if (!t.start) return 'Dates not set';
  return t.end && t.end !== t.start ? `${fmtDate(t.start, {})} – ${fmtDate(t.end, { year: 1 })}` : fmtDate(t.start, { year: 1 });
}
function status(t) {
  const now = today(), s = dayNum(t.start), e = dayNum(t.end || t.start);
  if (s == null) return { key: 'upcoming', text: 'No dates yet', tag: '<span class="tag grey">No dates yet</span>' };
  if (now < s) {
    const d = s - now, text = d === 1 ? 'Tomorrow' : `in ${d} days`;
    return { key: 'upcoming', text, tag: `<span class="tag amber">${text}</span>` };
  }
  if (now <= e) {
    const text = `Day ${now - s + 1} of ${e - s + 1}`;
    return { key: 'ongoing', text, tag: `<span class="tag green">● ${text}</span>` };
  }
  return { key: 'done', text: 'Completed', tag: '<span class="tag grey">✓ Completed</span>' };
}
const fmtSize = b => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : b < 1073741824 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1073741824).toFixed(2)} GB`;
function guessCat(name) {
  const n = (name || '').toLowerCase();
  if (/passport|\bid\b|emirates.?id|qid|aadhaar/.test(n)) return 'passport';
  if (/visa|evisa|e-visa|entry.?permit/.test(n)) return 'visa';
  if (/ticket|boarding|flight|e-?ticket|pnr|airline|qatar.?airways|emirates/.test(n)) return 'flight';
  if (/hotel|booking|reservation|airbnb|agoda|resort|stay/.test(n)) return 'hotel';
  if (/insurance|policy|medical/.test(n)) return 'insurance';
  if (/car|rental|taxi|train|bus|transfer|uber/.test(n)) return 'transport';
  if (/itinerary|plan|schedule/.test(n)) return 'itinerary';
  if (/invitation|letter|work|permit|noc|gate.?pass/.test(n)) return 'work';
  return null;
}
const stripExt = n => (n || 'Document').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim();

let toastTimer;
function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

/* ---------------- theme ---------------- */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  $('meta[name="theme-color"]').setAttribute('content', t === 'light' ? '#1E6FD9' : '#0B2545');
}
applyTheme(store.get('vv-theme', 'dark'));

/* ---------------- routing & overlays ---------------- */
const overlays = [];
function navigate(path, replace) {
  history[replace ? 'replaceState' : 'pushState']({ p: path }, '', '#' + path);
  render();
}
window.addEventListener('popstate', () => {
  if (overlays.length) { overlays.pop().close(); return; }
  render();
});
function pushOverlay(close) { history.pushState({ ov: 1 }, '', location.hash || '#/'); overlays.push({ close }); }
function back() {
  return new Promise(res => {
    const h = () => { window.removeEventListener('popstate', h); setTimeout(res, 0); };
    window.addEventListener('popstate', h);
    history.back();
  });
}

function openSheet(html, mount) {
  const scrim = document.createElement('div'); scrim.className = 'scrim';
  const sheet = document.createElement('div'); sheet.className = 'sheet'; sheet.setAttribute('role', 'dialog');
  sheet.innerHTML = '<div class="grab"></div>' + html;
  layer.append(scrim, sheet);
  const cleanups = [];
  pushOverlay(() => { scrim.remove(); sheet.remove(); cleanups.forEach(f => f()); });
  scrim.addEventListener('click', () => back());
  mount && mount(sheet, f => cleanups.push(f));
  return sheet;
}

/* ---------------- pdf.js (local, offline) ---------------- */
let pdfjsP;
function loadPdfJs() {
  if (!pdfjsP) pdfjsP = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'vendor/pdf.min.js';
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; res(window.pdfjsLib); };
    s.onerror = () => { pdfjsP = null; rej(new Error('PDF viewer failed to load')); };
    document.head.append(s);
  });
  return pdfjsP;
}

async function makeThumb(blob, type) {
  try {
    const W = 260; let canvas;
    if ((type || '').startsWith('image/')) {
      const url = URL.createObjectURL(blob);
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const s = Math.min(1, W / img.naturalWidth);
      canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * s); canvas.height = Math.round(img.naturalHeight * s);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
    } else if (type === 'application/pdf') {
      const pdfjs = await loadPdfJs();
      const pdf = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise;
      const page = await pdf.getPage(1);
      const vp0 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: W / vp0.width });
      canvas = document.createElement('canvas'); canvas.width = vp.width; canvas.height = vp.height;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      pdf.destroy();
    } else return null;
    return canvas.toDataURL('image/jpeg', 0.72);
  } catch (e) { console.warn('thumb failed', e); return null; }
}
const thumbHTML = d => d.thumb ? `<img src="${d.thumb}" alt="">` : (d.type === 'application/pdf' ? 'PDF' : 'FILE');

/* ---------------- offline status ---------------- */
const OFFLINE_FILES = 18;
async function offlineStatus() {
  if (Native.isApp) return { supported: true, active: true, files: OFFLINE_FILES, shell: true, cache: 'built into the Android app', app: true };
  const st = { supported: 'serviceWorker' in navigator && 'caches' in window && location.protocol !== 'file:', active: false, files: 0, shell: false, cache: '' };
  if (!st.supported) return st;
  st.active = !!navigator.serviceWorker.controller;
  try {
    const name = (await caches.keys()).filter(k => k.startsWith('voyager-vault-')).sort().pop();
    if (name) {
      const c = await caches.open(name); st.cache = name;
      st.files = (await c.keys()).length;
      st.shell = !!(await c.match(new URL('index.html', location.href).href));
    }
  } catch {}
  return st;
}
const isOfflineReady = st => st.active && st.shell && st.files >= OFFLINE_FILES;
async function paintOfflinePill() {
  const el = $('#offpill'); if (!el) return;
  const st = await offlineStatus();
  if (isOfflineReady(st)) { el.className = 'pill ok'; el.textContent = navigator.onLine ? '● OFFLINE READY' : '✈ OFFLINE MODE'; }
  else { el.className = 'pill wait'; el.textContent = !st.supported ? 'INSTALL NEEDED' : navigator.onLine ? 'PREPARING OFFLINE…' : 'NOT SAVED OFFLINE'; }
}
window.addEventListener('online', paintOfflinePill);
window.addEventListener('offline', paintOfflinePill);

async function protectStorage() {
  try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch {}
}

/* ---------------- render ---------------- */
let homeQuery = '', showDone = false;
const expanded = {};

function render() {
  const m = (location.hash || '#/').slice(1).match(/^\/trip\/([\w-]+)(?:\/(\w+))?/);
  if (m) return renderTrip(m[1], m[2]);
  return renderHome();
}

const PLANE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#1E6FD9"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>';
const GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

async function renderHome() {
  document.title = 'Voyager Vault';
  app.innerHTML = `
    <header class="hero">
      <div class="top">
        <div class="brand"><div class="logo">${PLANE}</div><div>VOYAGER<br>VAULT</div></div>
        <div style="display:flex;gap:8px;align-items:center"><button id="btnInstall" class="pill ok hidden" style="background:#fff;color:#1E6FD9;border-color:#fff">⬇ INSTALL APP</button><button id="btnUpdate" class="pill ok hidden" style="background:#FFB547;color:#0B2545;border-color:#FFB547">⬆ UPDATE</button><span id="offpill" class="pill wait">…</span>
          <button class="icon-btn" id="btnSettings" aria-label="Settings">${GEAR}</button></div>
      </div>
      <div class="flight" aria-hidden="true">
        <div class="cloud" style="width:64px;height:16px;left:6px;top:4px"></div>
        <div class="cloud" style="width:46px;height:12px;right:34px;top:26px"></div>
        <svg viewBox="0 0 300 40" preserveAspectRatio="none"><path d="M10 34 Q150 -8 288 26" fill="none" stroke="#D9ECFF" stroke-width="2" stroke-dasharray="5 6" opacity=".85"/>
          <circle cx="10" cy="34" r="4" fill="#fff"/><circle cx="288" cy="26" r="4" fill="#FFB547"/></svg>
        <div style="position:absolute;left:52%;top:5px;transform:rotate(8deg);color:#fff;font-size:18px">✈</div>
      </div>
      <label class="search">${icon('search', 18)}<input id="q" type="search" placeholder="Search trips, PNR, hotel…" value="${esc(homeQuery)}" autocomplete="off"></label>
    </header>
    <div class="wrap" id="list"></div>
    <button class="fab" id="btnNewTrip">${icon('plus', 19, 2.4)}New Trip</button>`;
  $('#btnSettings').onclick = openSettings;
  paintInstall(); paintUpdate();
  $('#btnNewTrip').onclick = () => openTripSheet();
  $('#q').oninput = e => { homeQuery = e.target.value; renderList(); };
  paintOfflinePill();
  await renderList();
}

async function renderList() {
  const list = $('#list'); if (!list) return;
  const [trips, docs] = await Promise.all([DB.allTrips(), DB.allDocsMeta()]);
  const count = {}, text = {};
  docs.forEach(d => { count[d.tripId] = (count[d.tripId] || 0) + 1; text[d.tripId] = (text[d.tripId] || '') + ' ' + d.title + ' ' + (d.ref || ''); });
  if (!trips.length) {
    list.innerHTML = `<div class="empty"><div class="big">🧳</div><h3>No trips yet</h3>
      <p>Tap <b>＋ New Trip</b> to create a folder for your next journey. Keep your visa, tickets and hotel bookings in it, and they'll open even without signal.</p></div>`;
    return;
  }
  const q = homeQuery.trim().toLowerCase();
  const match = t => !q || [t.destination, t.country, t.from, t.to, t.purpose, noteText(t), text[t.id]].join(' ').toLowerCase().includes(q);
  const groups = { ongoing: [], upcoming: [], done: [] };
  trips.filter(match).forEach(t => groups[status(t).key].push(t));
  const byStart = (a, b) => (a.start || '9999').localeCompare(b.start || '9999');
  groups.upcoming.sort(byStart); groups.ongoing.sort(byStart);
  groups.done.sort((a, b) => (b.end || b.start || '').localeCompare(a.end || a.start || ''));
  const sec = (title, arr, extra = '') => arr.length ? `<div class="section">${title} <b>${extra || arr.length}</b></div>${arr.map(t => passCard(t, count[t.id] || 0)).join('')}` : '';
  let html = sec('ONGOING', groups.ongoing) + sec('UPCOMING', groups.upcoming);
  if (groups.done.length) {
    const open = showDone || q;
    html += `<div class="section">COMPLETED <button id="togDone">${groups.done.length} ${open ? '▾' : '▸'}</button></div>`;
    if (open) html += groups.done.map(t => passCard(t, count[t.id] || 0)).join('');
  }
  if (!html) html = `<div class="empty"><div class="big">🔎</div><p>No trips match “${esc(homeQuery)}”.</p></div>`;
  list.innerHTML = html;
  $$('.pass', list).forEach(b => b.onclick = () => navigate('/trip/' + b.dataset.trip));
  const tg = $('#togDone'); if (tg) tg.onclick = () => { showDone = !showDone; renderList(); };
}

function passCard(t, n) {
  const st = status(t);
  const route = (t.from || t.to)
    ? `<div class="route">${esc(t.from || '···')} <span class="ln"></span> ✈ <span class="ln"></span> ${esc(t.to || '···')}</div>`
    : `<div class="route" style="font-weight:700">${esc(t.country || 'Destination')}</div>`;
  return `<button class="pass ${st.key === 'done' ? 'done' : ''}" data-trip="${t.id}">
    <div class="main"><div class="dest">${flag(t.country)} ${esc(t.destination)}</div>${route}
      <div class="dates">${esc(dateRange(t))}</div>
      <div class="tags">${st.tag}${openUrgent(t) ? `<span class="tag red">🔴 ${openUrgent(t)} urgent</span>` : ''}${t.purpose ? `<span class="tag blue">${esc(t.purpose)}</span>` : ''}</div></div>
    <div class="stub"><div class="n">${n}</div><div class="l">DOCS</div></div></button>`;
}

/* ---------------- trip folder ---------------- */
let currentTrip = null;

const TABS = [
  { id: 'essentials', label: 'Essentials', ic: 'star' },
  { id: 'todo', label: 'To-Do', ic: 'list-checks' },
  { id: 'pack', label: 'Pack', ic: 'luggage' },
  { id: 'notes', label: 'Notes', ic: 'notebook-pen' },
  { id: 'folders', label: 'Folders', ic: 'folder-open' },
];
const tabKey = id => 'vv-tab-' + id;
function tabFor(id, fromUrl) {
  if (TABS.some(x => x.id === fromUrl)) return fromUrl;
  const saved = store.get(tabKey(id), '');
  return TABS.some(x => x.id === saved) ? saved : 'essentials';
}
function switchTab(id, tab) {
  store.set(tabKey(id), tab);
  history.replaceState(history.state, '', `#/trip/${id}/${tab}`);
  renderTrip(id, tab);
  window.scrollTo(0, 0);
}

async function renderTrip(id, tabArg) {
  const t = await DB.getTrip(id);
  if (!t) return navigate('/', true);
  if (t.notes && !t.noteItems) {   // move the old single notes box into the new Notes section
    t.noteItems = [{ id: DB.uid(), topic: '', text: t.notes, done: false, created: Date.now() }];
    delete t.notes; await DB.saveTrip(t);
  }
  const fromHash = ((location.hash || '').match(/^#\/trip\/[\w-]+\/(\w+)/) || [])[1];
  const tab = tabFor(id, tabArg || fromHash);
  currentTrip = t;
  document.title = `${t.destination} · Voyager Vault`;
  const docs = (await DB.docsFor(id)).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || a.created - b.created);
  const st = status(t);
  const pinned = docs.filter(d => d.pinned);
  const byCat = {}; docs.forEach(d => (byCat[d.category] = byCat[d.category] || []).push(d));
  if (!expanded[id]) { expanded[id] = new Set(docs.length <= 8 ? Object.keys(byCat) : []); }
  const exp = expanded[id];
  const subline = st.key === 'done' ? `${shortRange(t)} · completed` : `${shortRange(t)}${t.start ? ' · ' + st.text : ''}`;
  const todos = t.todos || [], openT = todos.filter(x => !x.done), nU = openT.filter(x => x.priority === 'urgent').length;
  const notes = (t.noteItems || []).slice().sort((x, y) => (x.done - y.done) || (x.created - y.created));

  const badge = { essentials: pinned.length ? `<span class="bdg">${pinned.length}</span>` : '',
    todo: nU ? `<span class="bdg red">${nU}</span>` : openT.length ? `<span class="bdg">${openT.length}</span>` : '',
    notes: notes.length ? `<span class="bdg">${notes.length}</span>` : '',
    pack: (() => { const c = packStats(t); return c.total ? (c.left ? `<span class="bdg">${c.left}</span>` : `<span class="bdg ok">${icon('check', 10, 3.5)}</span>`) : ''; })(),
    folders: docs.length ? `<span class="bdg">${docs.length}</span>` : '' };
  const tabsHTML = `<nav class="tabs" role="tablist">${TABS.map(x => `<button class="tab ${x.id === tab ? 'on' : ''}" role="tab" aria-selected="${x.id === tab}" data-tab="${x.id}">
      <span class="pill">${icon(x.ic, 20, x.id === tab ? 2.2 : 1.9)}${badge[x.id]}</span>${x.label}</button>`).join('')}</nav>`;

  let body = '';
  if (tab === 'essentials') {
    const days = st.key === 'upcoming' && t.start ? dayNum(t.start) - today() : null;
    const third = days != null ? { v: days, l: days === 1 ? 'DAY LEFT' : 'DAYS LEFT' } : st.key === 'ongoing' ? { v: today() - dayNum(t.start) + 1, l: 'TRIP DAY' } : { v: '✓', l: st.key === 'done' ? 'COMPLETED' : 'NO DATES' };
    body += `<div class="glance">
      <button data-tab="todo"><span class="gi red">${icon('alarm-clock', 17)}</span><span class="gt"><b class="${nU ? 'r' : ''}">${nU}</b><span>URGENT</span></span></button>
      <button data-tab="folders"><span class="gi blue">${icon('file-text', 17)}</span><span class="gt"><b>${docs.length}</b><span>DOCS</span></span></button>
      <div><span class="gi amber">${icon('calendar-days', 17)}</span><span class="gt"><b>${third.v}</b><span>${third.l}</span></span></div></div>`;
    const nextU = openT.filter(x => x.priority === 'urgent').map(x => ({ x, at: Reminders.times(t, x, Date.now(), { quiet: Native.quiet() })[0] })).sort((p, q) => (p.at || 9e15) - (q.at || 9e15))[0];
    if (nextU) body += `<button class="nextalarm" data-tab="todo">${icon('siren', 16, 2.3)}<span><b>${esc(nextU.x.title)}</b>${nextU.at ? `Next alarm ${Reminders.fmt(nextU.at)}` : 'Urgent · no alarm time'}</span>${icon('chevron-right', 16)}</button>`;
    if (pinned.length) {
      body += `<div class="ess2">${pinned.map(d => `<button class="t" data-view="${d.id}"><div class="th">${d.thumb ? `<img src="${d.thumb}" alt="">` : `<span class="noth">${icon(cat(d.category).ic, 40, 1.6)}</span>`}</div>
        <span class="tchip">${catChip(cat(d.category), 30, 15)}</span><b>${esc(d.title)}</b><small>${icon('star', 11, 2.5, 'starf')}Tap to show</small></button>`).join('')}</div>`;
      body += `<p class="hintpin">${icon('pin', 13)}Pin more: ⋯ on any document › Pin to Essentials</p>`;
    } else {
      body += `<div class="pinhelp"><span class="pinic">${icon('star', 26, 1.8)}</span><h3>Your one-tap documents</h3>
        <p>Pin your passport, visa and boarding pass here, ready to show at the counter. In <b>Folders</b>, tap ⋯ on a document › <b>Pin to Essentials</b>.</p>
        <button class="btn ghost" data-tab="folders">${icon('folder-open', 17)}Go to Folders</button></div>`;
    }
  } else if (tab === 'todo') {
    body += todos.length ? todoListHTML(t) : `<div class="empty"><div class="bigic">${icon('list-checks', 44, 1.6)}</div><h3>Things to do before you go</h3>
      <p>Buy a SIM, print a visa copy, exchange money… Mark a task <b>Urgent</b> for red alarms that repeat every 6 hours until done.</p></div>`;
  } else if (tab === 'pack') {
    body += await packHTML(t);
  } else if (tab === 'notes') {
    body += notes.length ? `<div class="notes-card">${notes.map(noteRow).join('')}</div>`
      : `<div class="empty"><div class="bigic">${icon('notebook-pen', 44, 1.6)}</div><h3>Things to remember</h3><p>Which SIM to buy, the currency, taxi apps, emergency numbers, the embassy address…</p></div>`;
  } else {
    if (!docs.length) {
      body += `<div class="empty"><div class="bigic">${icon('folder-open', 44, 1.6)}</div><h3>This trip folder is empty</h3>
        <p>Tap <b>Scan</b> to photograph a document, or <b>Add files</b> to pick PDFs and photos. Your passport, visa, tickets and hotel bookings all go here.</p></div>`;
    } else {
      const full = CATS.filter(c => byCat[c.id]);
      body += '<div style="height:4px"></div>' + full.map(c => {
        const open = exp.has(c.id);
        return `<div class="folder"><button class="fh" data-fold="${c.id}">${catChip(c)}<div class="nm">${c.label}</div><span class="ct">${byCat[c.id].length}</span><span class="ch">${icon(open ? 'chevron-left' : 'chevron-right', 16, 2.2, open ? 'rot-down' : '')}</span></button>` +
          (open ? byCat[c.id].map(docRow).join('') : '') + `</div>`;
      }).join('');
    }
    const emptyC = CATS.filter(c => !byCat[c.id]);
    if (emptyC.length && docs.length) {
      body += `<div class="section" style="margin-top:14px">EMPTY FOLDERS <b>tap to add</b></div>` +
        emptyC.map(c => `<div class="folder zero"><button class="fh" data-addto="${c.id}">${catChip(c, 28, 14)}<div class="nm">${c.label}</div><span class="ch">${icon('plus', 16, 2.2)}</span></button></div>`).join('');
    }
  }

  const bars = {
    todo: `<button class="btn primary" data-act="todo">${icon('plus', 19, 2.4)}Add task</button>`,
    notes: `<button class="btn primary" data-act="note">${icon('plus', 19, 2.4)}Add note</button>`,
    pack: packMode(t) === 'home' && packStats(t).total
      ? `<button class="btn ghost" data-act="packreset">${icon('rotate-ccw', 18)}Reset return check</button>`
      : `<button class="btn primary" data-act="newsec">${icon('plus', 19, 2.4)}New section</button>`,
  };
  const bar = bars[tab] || `<button class="btn ghost" data-act="scan">${icon('camera', 19)}Scan</button><button class="btn primary" data-act="add">${icon('plus', 19, 2.4)}Add files</button>`;

  app.innerHTML = `<div class="tripview">
    <div class="appbar">
      <button class="icon-btn" data-act="home" aria-label="Back">${icon('arrow-left', 20)}</button>
      <div class="t"><h2>${flag(t.country)} ${esc(t.destination)}</h2><p>${esc(subline)}</p></div>
      <button class="icon-btn" data-act="edit" aria-label="Edit trip">${icon('pencil', 18)}</button>
      <button class="endbtn" data-act="end" aria-label="End trip">${icon('flag-triangle-right', 15)}<span class="lbl-end">End trip</span></button>
    </div>
    ${st.key === 'done' ? `<div class="wrap"><div class="banner">${icon('flag-triangle-right', 18)}<span>Trip finished. Back up this folder and free up space.</span><button data-act="end">End trip ›</button></div></div>` : ''}
    ${tabsHTML}
    <div class="wrap tabbody" data-tabpane="${tab}">${body}</div></div>
    <div class="bar">${bar}</div>`;

  app.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.tab) { if (d.tab !== tab) switchTab(id, d.tab); }
    else if (d.act === 'home') navigate('/');
    else if (d.act === 'edit') openTripSheet(t);
    else if (d.act === 'end') openEndTrip(t);
    else if (d.act === 'scan') pick('#pickCam', null);
    else if (d.act === 'add') pick('#pickFiles', null);
    else if (d.view) openViewer(d.view);
    else if (d.edit) openDocEdit(d.edit);
    else if (d.addto) pick('#pickFiles', d.addto);
    else if (d.fold) { exp.has(d.fold) ? exp.delete(d.fold) : exp.add(d.fold); renderTrip(id); }
    else if (d.act === 'note') openNoteSheet(t);
    else if (d.note) openNoteSheet(t, d.note);
    else if (d.ntog) toggleNote(t, d.ntog);
    else if (d.act === 'todo') openTodoSheet(t);
    else if (d.todo) openTodoSheet(t, d.todo);
    else if (d.ttog) toggleTodo(t, d.ttog);
    else if (d.act === 'tdone') { showDoneTodos[t.id] = !showDoneTodos[t.id]; renderTrip(id); }
    else if (d.act === 'newsec') openSectionSheet(t);
    else if (d.act === 'packcopy') openCopyPackSheet(t);
    else if (d.act === 'packreset') resetReturn(t);
    else if (d.pmode) setPackMode(t, d.pmode);
    else if (d.sec) toggleSection(t, d.sec);
    else if (d.secmenu) openSectionSheet(t, d.secmenu);
    else if (d.item) { if (Date.now() - lastLongPress > 600) togglePackItem(t, d.item); }
  };
  wirePackInputs(t);

  // swipe left / right to change tab
  const pane = $('.tabbody', app);
  let sx = null, sy = 0;
  pane.addEventListener('touchstart', e => { if (e.touches.length !== 1 || overlays.length) { sx = null; return; } sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  pane.addEventListener('touchend', e => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
    const i = TABS.findIndex(x => x.id === tab) + (dx < 0 ? 1 : -1);
    if (i >= 0 && i < TABS.length) switchTab(id, TABS[i].id);
  }, { passive: true });
}

/* ---------------- things to carry (Pack tab) ---------------- */
const PACK_PRESETS = [
  { k: 'camera', name: 'Camera gear', ic: 'camera', c1: '#60A5FA', c2: '#2563EB', re: /camera|lens|photo|tripod|drone/i },
  { k: 'clothes', name: 'Clothes', ic: 'shirt', c1: '#C084FC', c2: '#9333EA', re: /cloth|dress|shirt|wear|jacket|shoe/i },
  { k: 'toilet', name: 'Toiletries', ic: 'bath', c1: '#2DD4BF', c2: '#0D9488', re: /toilet|bath|wash|groom|cosmetic|skin/i },
  { k: 'elec', name: 'Electronics', ic: 'battery-charging', c1: '#FBBF24', c2: '#D97706', re: /electr|charg|cable|adapter|power|laptop|gadget/i },
  { k: 'meds', name: 'Medicines', ic: 'pill', c1: '#F87171', c2: '#DC2626', re: /medic|pill|first.?aid|health|drug/i },
  { k: 'acc', name: 'Accessories', ic: 'glasses', c1: '#F472B6', c2: '#DB2777', re: /access|jewel|watch|glass|sun/i },
  { k: 'docs', name: 'Documents', ic: 'book-open', c1: '#818CF8', c2: '#6366F1', re: /doc|passport|paper|money|wallet|card/i },
  { k: 'outdoor', name: 'Trekking gear', ic: 'mountain-snow', c1: '#4ADE80', c2: '#16A34A', re: /trek|hik|outdoor|camp|safari|binocular/i },
  { k: 'other', name: 'Other', ic: 'package', c1: '#CBD5E1', c2: '#64748B', re: /$^/ },
];
const presetOf = k => PACK_PRESETS.find(p => p.k === k) || PACK_PRESETS[PACK_PRESETS.length - 1];
const guessPreset = name => (PACK_PRESETS.find(p => p.re.test(name || '')) || PACK_PRESETS[PACK_PRESETS.length - 1]).k;
const packOf = t => (t.carry = t.carry || { mode: 'going', sections: [] });
const packMode = t => (t.carry && t.carry.mode) || 'going';
function packStats(t) {
  const items = ((t.carry && t.carry.sections) || []).flatMap(s => s.items);
  const home = packMode(t) === 'home';
  const done = items.filter(i => home ? i.home : i.packed).length;
  return { total: items.length, done, left: items.length - done, packed: items.filter(i => i.packed).length };
}
/** "Batteries x4" → { text: 'Batteries', qty: 4 } */
function parseItem(s) {
  const m = s.trim().match(/^(.*?)\s*[x×]\s*(\d{1,3})$/i);
  return m && m[1] ? { text: m[1].trim(), qty: +m[2] } : { text: s.trim(), qty: 0 };
}
const savePack = async t => { await DB.saveTrip(t); protectStorage(); };
let lastLongPress = 0;

async function packHTML(t) {
  const c = packOf(t), st = packStats(t), home = c.mode === 'home';
  const others = (await DB.allTrips()).filter(x => x.id !== t.id && x.carry && x.carry.sections && x.carry.sections.length);
  if (!c.sections.length) {
    return `<div class="empty"><div class="bigic">${icon('luggage', 44, 1.6)}</div><h3>Things to carry</h3>
      <p>Make sections like <b>Camera gear</b>, <b>Clothes</b> and <b>Toiletries</b>, add the items, then tick them off as you pack.</p>
      <button class="btn primary" style="display:inline-flex;margin-top:14px" data-act="newsec">${icon('plus', 18, 2.4)}Create first section</button>
      ${others.length ? `<button class="btn ghost" style="display:inline-flex;margin-top:10px" data-act="packcopy">${icon('copy', 18)}Copy from another trip</button>` : ''}</div>`;
  }
  const pct = st.total ? Math.round(st.done * 100 / st.total) : 0;
  let h = `<div class="seg2" role="tablist"><button data-pmode="going" class="${home ? '' : 'on'}">${icon('luggage', 14, 2.3)}Going</button><button data-pmode="home" class="${home ? 'on' : ''}">${icon('rotate-ccw', 14, 2.3)}Coming home</button></div>`;
  if (home) {
    h += `<div class="ret">${icon('rotate-ccw', 20, 2.2)}<div><b>Return check · ${st.done} of ${st.total} back in the bag</b>Struck through = packed on the way out. Tick each item as it goes back in.</div></div>`;
  } else {
    h += `<div class="prog"><div class="top"><span class="chip-ic" style="width:38px;height:38px;background:linear-gradient(145deg,#4ADE80,#16A34A)">${icon('luggage', 19, 2.2)}</span>
      <div class="big">${st.done} <small>of ${st.total} packed</small></div><span class="pct ${st.left ? '' : 'all'}">${st.left ? pct + '%' : 'All packed ✓'}</span></div>
      <div class="bar2"><i style="width:${pct}%"></i></div></div>`;
  }
  for (const s of c.sections) {
    const p = presetOf(s.key);
    const sd = s.items.filter(i => home ? i.home : i.packed).length, stot = s.items.length;
    const spct = stot ? Math.round(sd * 100 / stot) : 0;
    const state = !stot ? 'No items yet' : sd === stot ? `<span class="done-tag">${icon('check', 12, 3)}${home ? 'All back in the bag' : 'All packed'}</span>`
      : `${sd}/${stot} ${home ? 'back in bag' : 'packed'} <span class="mini"><i style="width:${spct}%;${home ? 'background:#FFB547' : ''}"></i></span>`;
    h += `<div class="sec" data-secid="${s.id}"><div class="sh2"><button class="secbtn" data-sec="${s.id}" aria-expanded="${!s.collapsed}">
        <span class="chip-ic" style="width:34px;height:34px;background:linear-gradient(145deg,${p.c1},${p.c2})">${icon(p.ic, 17, 2.2)}</span>
        <span class="nm"><b>${esc(s.name)}</b><small>${state}</small></span>${icon(s.collapsed ? 'chevron-right' : 'chevron-down', 18, 2.2, 'chev')}</button>
        <button class="more" data-secmenu="${s.id}" aria-label="Section options">${icon('ellipsis', 18)}</button></div>`;
    if (!s.collapsed) {
      for (const i of s.items) {
        const cls = home ? (i.home ? 'home' : i.packed ? 'out' : '') : (i.packed ? 'on' : '');
        const ticked = home ? i.home : i.packed;
        h += `<button class="it ${cls}" data-item="${s.id}:${i.id}"><span class="cb">${ticked ? icon('check', 14, 3) : ''}</span><span class="tx">${esc(i.text)}</span>
          ${i.qty ? `<span class="qty">×${i.qty}</span>` : ''}${home && i.home ? `<span class="back">${icon('rotate-ccw', 11, 2.6)}BACK</span>` : ''}</button>`;
      }
      h += `<form class="addit" data-addto-sec="${s.id}">${icon('plus', 16, 2.4)}<input enterkeyhint="done" maxlength="80" placeholder="Add item (e.g. Batteries x4)" aria-label="Add item to ${esc(s.name)}"></form>`;
    }
    h += '</div>';
  }
  h += `<p class="hintpin">${icon('pin', 13)}Tap an item to tick it · long-press to edit</p>`;
  return h;
}

function findItem(t, ref) {
  const [sid, iid] = ref.split(':');
  const s = packOf(t).sections.find(x => x.id === sid);
  return { s, i: s && s.items.find(x => x.id === iid) };
}
async function togglePackItem(t, ref) {
  const { i } = findItem(t, ref); if (!i) return;
  if (packMode(t) === 'home') i.home = !i.home; else { i.packed = !i.packed; if (!i.packed) i.home = false; }
  await savePack(t); renderTrip(t.id);
}
async function toggleSection(t, sid) {
  const s = packOf(t).sections.find(x => x.id === sid); if (!s) return;
  s.collapsed = !s.collapsed; await savePack(t); renderTrip(t.id);
}
async function setPackMode(t, m) {
  if (packMode(t) === m) return;
  packOf(t).mode = m; await savePack(t); renderTrip(t.id);
  if (m === 'home') toast('Return check: tick items as they go back in the bag');
}
async function resetReturn(t) {
  if (!confirm('Clear all “back in the bag” ticks?')) return;
  packOf(t).sections.forEach(s => s.items.forEach(i => { i.home = false; }));
  await savePack(t); renderTrip(t.id);
}
function wirePackInputs(t) {
  $$('form[data-addto-sec]', app).forEach(f => {
    f.onsubmit = async e => {
      e.preventDefault();
      const inp = $('input', f), v = inp.value.trim(); if (!v) return;
      const s = packOf(t).sections.find(x => x.id === f.dataset.addtoSec); if (!s) return;
      s.items.push({ id: DB.uid(), ...parseItem(v), packed: false, home: false });
      await savePack(t);
      const sid = s.id;
      await renderTrip(t.id);
      const again = $(`form[data-addto-sec="${sid}"] input`, app); if (again) again.focus();   // keep typing the next item
    };
  });
  // long-press an item to edit it
  $$('.it[data-item]', app).forEach(b => {
    let timer;
    const start = () => { timer = setTimeout(() => { lastLongPress = Date.now(); openPackItemSheet(t, b.dataset.item); }, 550); };
    const stop = () => clearTimeout(timer);
    b.addEventListener('touchstart', start, { passive: true }); b.addEventListener('touchend', stop); b.addEventListener('touchmove', stop, { passive: true });
    b.addEventListener('contextmenu', e => { e.preventDefault(); lastLongPress = Date.now(); openPackItemSheet(t, b.dataset.item); });
  });
}
function openPackItemSheet(t, ref) {
  const { s, i } = findItem(t, ref); if (!i) return;
  openSheet(`<h3>Edit item · ${esc(s.name)}</h3>
    <div class="two"><div style="flex:2"><label class="lbl" for="iText">Item</label><input class="input" id="iText" maxlength="80" value="${esc(i.text)}"></div>
    <div><label class="lbl" for="iQty">Quantity</label><input class="input" id="iQty" type="number" min="0" max="999" inputmode="numeric" value="${i.qty || ''}" placeholder="–"></div></div>
    <div class="actions"><button class="btn danger" id="iDel">${icon('trash-2', 17)}Delete</button><button class="btn primary" id="iSave">Save</button></div>`,
  sheet => {
    $('#iSave', sheet).onclick = async () => {
      const v = $('#iText', sheet).value.trim(); if (!v) { toast('Type the item name'); return; }
      i.text = v; i.qty = Math.max(0, parseInt($('#iQty', sheet).value, 10) || 0);
      await savePack(t); await back(); renderTrip(t.id);
    };
    $('#iDel', sheet).onclick = async () => {
      s.items = s.items.filter(x => x.id !== i.id); await savePack(t); await back(); toast('Item deleted'); renderTrip(t.id);
    };
  });
}
function openSectionSheet(t, sid) {
  const c = packOf(t), s = sid ? c.sections.find(x => x.id === sid) : null;
  if (sid && !s) return;
  const idx = s ? c.sections.indexOf(s) : -1;
  let key = s ? s.key : 'camera';
  openSheet(`<h3>${s ? 'Section' : 'New section'} · ${esc(t.destination)}</h3>
    <label class="lbl" for="sName">Section name</label><input class="input" id="sName" maxlength="40" placeholder="e.g. Camera gear" value="${esc(s ? s.name : '')}">
    <span class="lbl">${s ? 'Icon' : 'Quick pick'}</span>
    <div class="qp" id="sPick">${PACK_PRESETS.filter(p => p.k !== 'other' || s).map(p => `<button type="button" class="${p.k === key ? 'on' : ''}" data-k="${p.k}"><span class="dot" style="background:${p.c2}">${icon(p.ic, 12, 2.4)}</span>${p.name}</button>`).join('')}</div>
    ${s ? `<div class="secacts"><button class="btn ghost" id="sUp" ${idx === 0 ? 'disabled' : ''}>↑ Move up</button><button class="btn ghost" id="sDown" ${idx === c.sections.length - 1 ? 'disabled' : ''}>↓ Move down</button></div>
      <button class="btn ghost block" id="sUntick" style="margin-top:8px">${icon('rotate-ccw', 17)}Untick all items in this section</button>`
      : `<button class="copyrow" id="sCopy">${icon('copy', 20)}<span><b>Copy sections from another trip</b>Re-use a packing list you made before</span></button>`}
    <div class="actions">${s ? `<button class="btn danger" id="sDel">${icon('trash-2', 17)}Delete</button>` : '<button class="btn ghost" id="sCancel">Cancel</button>'}<button class="btn primary" id="sSave">${s ? 'Save' : 'Create section'}</button></div>`,
  sheet => {
    const name = $('#sName', sheet);
    let typed = !!s;
    $$('#sPick button', sheet).forEach(b => b.onclick = () => {
      key = b.dataset.k; $$('#sPick button', sheet).forEach(x => x.classList.toggle('on', x === b));
      if (!typed || !name.value.trim()) { name.value = presetOf(key).name; typed = false; }
    });
    name.oninput = () => { typed = true; if (!s) { const g = guessPreset(name.value); if (g !== 'other') { key = g; $$('#sPick button', sheet).forEach(x => x.classList.toggle('on', x.dataset.k === key)); } } };
    if (!s) setTimeout(() => name.focus(), 250);
    const cancel = $('#sCancel', sheet); if (cancel) cancel.onclick = () => back();
    const cp = $('#sCopy', sheet); if (cp) cp.onclick = async () => { await back(); openCopyPackSheet(t); };
    const mv = async dir => { const arr = c.sections; const j = idx + dir; [arr[idx], arr[j]] = [arr[j], arr[idx]]; await savePack(t); await back(); renderTrip(t.id); };
    const up = $('#sUp', sheet); if (up) up.onclick = () => mv(-1);
    const dn = $('#sDown', sheet); if (dn) dn.onclick = () => mv(1);
    const un = $('#sUntick', sheet); if (un) un.onclick = async () => { s.items.forEach(i => { i.packed = false; i.home = false; }); await savePack(t); await back(); toast('Section unticked'); renderTrip(t.id); };
    const del = $('#sDel', sheet);
    if (del) del.onclick = async () => {
      if (s.items.length && !confirm(`Delete “${s.name}” and its ${s.items.length} item${s.items.length > 1 ? 's' : ''}?`)) return;
      c.sections = c.sections.filter(x => x.id !== s.id); await savePack(t); await back(); toast('Section deleted'); renderTrip(t.id);
    };
    $('#sSave', sheet).onclick = async () => {
      const v = name.value.trim() || presetOf(key).name;
      if (s) Object.assign(s, { name: v, key });
      else c.sections.push({ id: DB.uid(), name: v, key, collapsed: false, items: [] });
      await savePack(t); await back(); renderTrip(t.id);
      if (!s) setTimeout(() => { const f = $$('form[data-addto-sec] input', app).pop(); if (f) f.focus(); }, 150);
    };
  });
}
async function openCopyPackSheet(t) {
  const others = (await DB.allTrips()).filter(x => x.id !== t.id && x.carry && x.carry.sections && x.carry.sections.length)
    .sort((x, y) => (y.start || '').localeCompare(x.start || ''));
  if (!others.length) { toast('No other trip has a packing list yet'); return; }
  openSheet(`<h3>Copy packing list</h3><p class="sub">Sections and items are copied unticked into ${esc(t.destination)}. Sections with the same name are merged.</p>
    <div class="copylist">${others.map(o => { const n = o.carry.sections.reduce((a, s) => a + s.items.length, 0);
      return `<button class="copypick" data-from="${o.id}"><span class="fl">${flag(o.country)}</span><span><b>${esc(o.destination)}</b><small>${o.carry.sections.length} sections · ${n} items · ${esc(shortRange(o))}</small></span>${icon('copy', 18)}</button>`; }).join('')}</div>`,
  sheet => {
    $$('.copypick', sheet).forEach(b => b.onclick = async () => {
      const src = others.find(o => o.id === b.dataset.from); const c = packOf(t); let added = 0;
      for (const ss of src.carry.sections) {
        let dst = c.sections.find(x => x.name.toLowerCase() === ss.name.toLowerCase());
        if (!dst) { dst = { id: DB.uid(), name: ss.name, key: ss.key, collapsed: false, items: [] }; c.sections.push(dst); }
        for (const it of ss.items) {
          if (dst.items.some(x => x.text.toLowerCase() === it.text.toLowerCase())) continue;
          dst.items.push({ id: DB.uid(), text: it.text, qty: it.qty || 0, packed: false, home: false }); added++;
        }
      }
      c.mode = 'going';
      await savePack(t); await back(); toast(`✔ Copied ${added} items from ${src.destination}`); renderTrip(t.id);
    });
  });
}

/* ---------------- trip to-do list ---------------- */
const showDoneTodos = {};
function todoListHTML(t) {
  const todos = t.todos || [];
  const by = p => todos.filter(x => !x.done && x.priority === p).sort((a, b) => (a.remindAt || '9999').localeCompare(b.remindAt || '9999') || a.created - b.created);
  const done = todos.filter(x => x.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const grp = (p, cls) => { const arr = by(p); return arr.length ? `<div class="grp ${cls}">${icon(PRIO[p].ic, 14, 2.4)}${PRIO[p].label.toUpperCase()} · ${arr.length}</div>` + arr.map(x => todoRow(t, x)).join('') : ''; };
  let h = grp('urgent', 'u') + grp('normal', 'n') + grp('delayed', 'd');
  if (done.length) {
    h += `<button class="grp c" data-act="tdone">${icon('circle-check', 14, 2.4)}COMPLETED · ${done.length} ${showDoneTodos[t.id] ? '▾' : '▸'}</button>`;
    if (showDoneTodos[t.id]) h += done.map(x => todoRow(t, x)).join('');
  }
  return `<div class="todo-list">${h}</div>`;
}
function todoRow(t, x) {
  const desc = Reminders.describe(t, x, Date.now(), { quiet: Native.quiet() });
  const late = !x.done && /overdue|ended/.test(desc);
  return `<div class="task ${x.priority} ${x.done ? 'done' : ''}"><button class="tchk" data-ttog="${x.id}" aria-label="${x.done ? 'Mark not done' : 'Mark done'}">${x.done ? '✓' : ''}</button>
    <button class="tbody" data-todo="${x.id}"><b>${esc(x.title)}</b>${x.details ? `<i>${esc(x.details)}</i>` : ''}<small class="${late ? 'late' : ''}">${/^⏰/.test(desc) ? icon('alarm-clock', 12, 2.3) : ''}${esc(desc.replace(/^⏰ /, ''))}</small></button>
    ${x.priority === 'urgent' && !x.done ? '<span class="flag">URGENT</span>' : ''}</div>`;
}
async function toggleTodo(t, id) {
  const x = (t.todos || []).find(y => y.id === id); if (!x) return;
  x.done = !x.done; x.doneAt = x.done ? Date.now() : null;
  await DB.saveTrip(t); await Native.syncTrip(t);
  if (x.done) toast(x.priority === 'urgent' ? '✓ Done · alarms stopped' : '✓ Done');
  renderTrip(t.id);
}
function todoHint(t, prio, date, time) {
  if (prio === 'delayed') return '⏸ Not important right now, so no reminders. It stays at the bottom of the list.';
  const at = date ? Reminders.parseLocal(`${date}T${time || '09:00'}`) : null;
  if (prio === 'normal') return at ? `🔵 One reminder on ${Reminders.fmt(at)}.` : '🔵 Pick a date and time to get a reminder, or leave it empty for no reminder.';
  const lead = Reminders.leadStart(t);
  const parts = [];
  if (at) parts.push(`at ${Reminders.fmt(at)}`);
  if (lead) parts.push(`from ${Reminders.fmt(lead)} (2 days before travel)`);
  if (!parts.length) return '🔴 Urgent needs a time or trip dates. Add a reminder time so the alarm knows when to ring.';
  return `🔴 Full-screen red alarm ${parts.join(' and ')}, repeating every 6 h until you tick it off.${Native.quiet() ? ' Night repeats (11 pm–6 am) wait until 6 am.' : ''}`;
}
function openTodoSheet(t, todoId) {
  const x = todoId ? (t.todos || []).find(y => y.id === todoId) : null;
  if (todoId && !x) return;
  const p0 = x ? x.priority : 'normal';
  const [d0, tm0] = x && x.remindAt ? x.remindAt.split('T') : ['', '09:00'];
  openSheet(`
    <h3>${x ? 'Edit task' : 'New task'} · ${esc(t.destination)}</h3>
    <label class="lbl" for="kTitle">Task</label>
    <input class="input" id="kTitle" maxlength="120" placeholder="e.g. Buy Singtel eSIM" value="${esc(x ? x.title : '')}">
    <span class="lbl">Priority</span>
    <div class="prio" id="kPrio">${Object.keys(PRIO).map(k => `<button type="button" class="${k} ${k === p0 ? 'on' : ''}" data-p="${k}">${icon(PRIO[k].ic, 16, 2.3)}${PRIO[k].label}</button>`).join('')}</div>
    <div id="kWhen"><span class="lbl">Remind me</span>
      <div class="two"><input class="input" id="kDate" type="date" value="${esc(d0)}"><input class="input" id="kTime" type="time" value="${esc(tm0 || '09:00')}"></div></div>
    <div class="hintbox" id="kHint"></div>
    ${Native.isApp ? '' : '<p class="sub" style="margin-top:8px">🔔 Alarms ring only in the Voyager Vault <b>Android app</b>. Here the task is saved without alarms.</p>'}
    <label class="lbl" for="kDetails">Details (optional)</label>
    <textarea class="input" id="kDetails" rows="2" maxlength="1000" placeholder="Where, how much, anything to remember">${esc(x ? x.details || '' : '')}</textarea>
    <div class="actions">${x ? `<button class="btn danger" id="kDel">${icon('trash-2', 17)}Delete</button>` : '<button class="btn ghost" id="kCancel">Cancel</button>'}<button class="btn primary" id="kSave">Save task</button></div>`,
  sheet => {
    let prio = p0;
    const paint = () => {
      $$('#kPrio button', sheet).forEach(b => b.classList.toggle('on', b.dataset.p === prio));
      $('#kWhen', sheet).classList.toggle('hidden', prio === 'delayed');
      const h = $('#kHint', sheet); h.className = 'hintbox ' + prio;
      h.textContent = todoHint(t, prio, $('#kDate', sheet).value, $('#kTime', sheet).value);
    };
    $$('#kPrio button', sheet).forEach(b => b.onclick = () => { prio = b.dataset.p; paint(); });
    $('#kDate', sheet).oninput = paint; $('#kTime', sheet).oninput = paint;
    paint();
    if (!x) setTimeout(() => $('#kTitle', sheet).focus(), 250);
    const c = $('#kCancel', sheet); if (c) c.onclick = () => back();
    const del = $('#kDel', sheet);
    if (del) del.onclick = async () => {
      if (!confirm('Delete this task?')) return;
      t.todos = t.todos.filter(y => y.id !== x.id);
      await DB.saveTrip(t); await Native.syncTrip(t); await back(); toast('Task deleted'); renderTrip(t.id);
    };
    $('#kSave', sheet).onclick = async () => {
      const title = $('#kTitle', sheet).value.trim();
      if (!title) { $('#kTitle', sheet).focus(); toast('Type the task first'); return; }
      const date = $('#kDate', sheet).value, time = $('#kTime', sheet).value || '09:00';
      const remindAt = prio !== 'delayed' && date ? `${date}T${time}` : '';
      if (prio === 'urgent' && !remindAt && !t.start) { toast('Urgent needs a reminder time (this trip has no dates)', 4000); return; }
      const rec = { title, priority: prio, remindAt, details: $('#kDetails', sheet).value.trim() };
      t.todos = t.todos || [];
      if (x) Object.assign(x, rec, { edited: Date.now() });
      else t.todos.push({ id: DB.uid(), ...rec, done: false, doneAt: null, created: Date.now() });
      collapsed.todo = false; store.set('vv-collapse', JSON.stringify(collapsed));
      await DB.saveTrip(t); protectStorage(); await Native.syncTrip(t);
      await back(); toast(Native.isApp && prio !== 'delayed' && (remindAt || prio === 'urgent') ? 'Task saved · reminder set ✔' : 'Task saved'); renderTrip(t.id);
      if (Native.isApp && prio !== 'delayed' && (remindAt || prio === 'urgent')) maybeReminderSetup();
    };
  });
}

function noteRow(n) {
  return `<div class="note ${n.done ? 'done' : ''}"><button class="nchk" data-ntog="${n.id}" aria-label="${n.done ? 'Mark not done' : 'Mark done'}">${n.done ? '✓' : ''}</button>
    <button class="nbody" data-note="${n.id}">${n.topic ? `<b style="color:${topicOf(n.topic).col}">${icon(topicOf(n.topic).ic, 13, 2.4)}${esc(n.topic)}</b>` : ''}<span>${esc(n.text)}</span></button></div>`;
}
async function toggleNote(t, id) {
  const n = (t.noteItems || []).find(x => x.id === id); if (!n) return;
  n.done = !n.done; await DB.saveTrip(t); renderTrip(t.id);
}
function openNoteSheet(t, noteId) {
  const n = noteId ? (t.noteItems || []).find(x => x.id === noteId) : null;
  if (noteId && !n) return;
  const topic0 = n ? n.topic : '';
  openSheet(`
    <h3>${n ? 'Edit note' : 'New note'} · ${esc(t.destination)}</h3>
    <span class="lbl">Topic (optional)</span>
    <div class="chips" id="topics">${NOTE_TOPICS.map(x => `<button type="button" class="chip ${x.k === topic0 ? 'on' : ''}" data-k="${esc(x.k)}">${icon(x.ic, 15, 2.2)}${esc(x.k)}</button>`).join('')}</div>
    <label class="lbl" for="nText">Note</label>
    <textarea class="input" id="nText" rows="6" maxlength="2000" placeholder="${esc((NOTE_TOPICS.find(x => x.k === topic0) || {}).hint || 'Anything you need to remember for this trip…')}">${esc(n ? n.text : '')}</textarea>
    <div class="actions">${n ? `<button class="btn danger" id="nDel">${icon('trash-2', 17)}Delete</button>` : '<button class="btn ghost" id="nCancel">Cancel</button>'}<button class="btn primary" id="nSave">Save note</button></div>`,
  sheet => {
    let topic = topic0;
    const ta = $('#nText', sheet);
    $$('#topics .chip', sheet).forEach(c => c.onclick = () => {
      const on = c.classList.contains('on');
      $$('#topics .chip', sheet).forEach(x => x.classList.remove('on'));
      topic = on ? '' : c.dataset.k;
      if (!on) c.classList.add('on');
      ta.placeholder = (NOTE_TOPICS.find(x => x.k === topic) || {}).hint || 'Anything you need to remember for this trip…';
      ta.focus();
    });
    if (!n) setTimeout(() => ta.focus(), 250);
    const c = $('#nCancel', sheet); if (c) c.onclick = () => back();
    const del = $('#nDel', sheet);
    if (del) del.onclick = async () => {
      if (!confirm('Delete this note?')) return;
      t.noteItems = t.noteItems.filter(x => x.id !== n.id);
      await DB.saveTrip(t); await back(); toast('Note deleted'); renderTrip(t.id);
    };
    $('#nSave', sheet).onclick = async () => {
      const text = ta.value.trim();
      if (!text) { ta.focus(); toast('Write something first'); return; }
      t.noteItems = t.noteItems || [];
      if (n) Object.assign(n, { topic, text, edited: Date.now() });
      else t.noteItems.push({ id: DB.uid(), topic, text, done: false, created: Date.now() });
      await DB.saveTrip(t); protectStorage(); await back(); toast('Note saved ✔'); renderTrip(t.id);
    };
  });
}

function docRow(d) {
  const meta = [d.ref ? `<span class="mono">${esc(d.ref)}</span>` : '', d.date ? fmtDate(d.date, {}) : '', fmtSize(d.size || 0)].filter(Boolean).join(' · ');
  return `<div class="doc"><button class="open" data-view="${d.id}"><div class="dt">${thumbHTML(d)}</div>
    <div class="dn"><div class="tt">${esc(d.title)}</div><small>${meta}</small></div>${d.pinned ? `<span class="star">${icon('star', 16, 0, 'starfill')}</span>` : ''}</button>
    <button class="more" data-edit="${d.id}" aria-label="Edit document">${icon('ellipsis', 20)}</button></div>`;
}

/* ---------------- add documents ---------------- */
let pickPreset = null;
function pick(sel, preset) { pickPreset = preset; const i = $(sel); i.value = ''; i.click(); }
function onPicked(e, cam) { const files = [...e.target.files]; e.target.value = ''; if (files.length) openAddSheet(files, pickPreset, cam); pickPreset = null; }
$('#pickFiles').addEventListener('change', e => onPicked(e, false));
$('#pickCam').addEventListener('change', e => onPicked(e, true));

function chipsHTML(selected) {
  return `<div class="chips" id="cats">${CATS.map(c => `<button type="button" class="chip ${c.id === selected ? 'on' : ''}" data-cat="${c.id}"><span class="cdot" style="background:${c.c2}">${icon(c.ic, 12, 2.4)}</span>${c.short}</button>`).join('')}</div>`;
}
function wireChips(sheet, onPick) {
  $$('#cats .chip', sheet).forEach(ch => ch.onclick = () => { $$('#cats .chip', sheet).forEach(x => x.classList.remove('on')); ch.classList.add('on'); onPick && onPick(ch.dataset.cat); });
}
function wireToggle(btn) { btn.onclick = () => btn.classList.toggle('on'); }

function openAddSheet(files, preset, fromCamera) {
  const t = currentTrip; if (!t) return;
  const single = files.length === 1;
  const guessed = preset || guessCat(files.map(f => f.name).join(' ')) || (fromCamera ? 'passport' : 'other');
  const defTitle = fromCamera ? `${cat(guessed).short} scan` : stripExt(files[0].name);
  const total = files.reduce((s, f) => s + f.size, 0);
  openSheet(`
    <h3>Add to ${esc(t.destination)} folder</h3>
    <div class="preview" id="pv"><span class="spin"></span></div>
    ${single ? '' : `<div class="filelist">${files.length} files · ${fmtSize(total)}<br>${files.map(f => esc(f.name)).join('<br>')}</div>`}
    ${single ? `<label class="lbl" for="fTitle">Title</label><input class="input" id="fTitle" value="${esc(defTitle)}" maxlength="80">` : ''}
    <span class="lbl">Folder</span>${chipsHTML(guessed)}
    <div class="two"><div><label class="lbl" for="fRef">PNR / Booking ref</label><input class="input mono" id="fRef" placeholder="e.g. X7K2LM" autocapitalize="characters" maxlength="40"></div>
      <div><label class="lbl" for="fDate">Date</label><input class="input" id="fDate" type="date" value="${esc(t.start || '')}"></div></div>
    <button type="button" class="toggle ${['passport', 'visa'].includes(guessed) ? 'on' : ''}" id="fPin"><span class="sw"></span>★ Pin to Essentials</button>
    <div class="actions"><button class="btn ghost" id="fCancel">Cancel</button><button class="btn primary" id="fSave">Save ${single ? '' : files.length + ' files'}</button></div>`,
  (sheet, onClose) => {
    let category = guessed, url;
    wireChips(sheet, c => {
      category = c;
      const ti = $('#fTitle', sheet);
      if (fromCamera && ti && / scan$/.test(ti.value)) ti.value = `${cat(c).short} scan`;
      if (['passport', 'visa'].includes(c)) $('#fPin', sheet).classList.add('on');
    });
    wireToggle($('#fPin', sheet));
    const f0 = files[0], pv = $('#pv', sheet);
    if (f0.type.startsWith('image/')) { url = URL.createObjectURL(f0); pv.innerHTML = `<img src="${url}" alt="">`; onClose(() => URL.revokeObjectURL(url)); }
    else makeThumb(f0, f0.type).then(th => { pv.innerHTML = th ? `<img src="${th}" alt="">` : `📄 ${esc(f0.name)}`; });
    $('#fCancel', sheet).onclick = () => back();
    $('#fSave', sheet).onclick = async e => {
      const btn = e.currentTarget; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Saving…';
      try {
        const ref = $('#fRef', sheet).value.trim(), date = $('#fDate', sheet).value, pinned = $('#fPin', sheet).classList.contains('on');
        for (const f of files) {
          const type = f.type || (/\.pdf$/i.test(f.name) ? 'application/pdf' : 'application/octet-stream');
          const blob = new Blob([await f.arrayBuffer()], { type });
          const title = single ? ($('#fTitle', sheet).value.trim() || stripExt(f.name)) : stripExt(f.name);
          await DB.saveDoc({ id: DB.uid(), tripId: t.id, category, title, ref, date, pinned, fileName: f.name || `${title}.jpg`, type, size: blob.size, blob, thumb: await makeThumb(blob, type), created: Date.now() });
        }
        protectStorage();
        (expanded[t.id] = expanded[t.id] || new Set()).add(category);
        await back();
        toast(`Saved to ${cat(category).label} ✔`);
        if (tabFor(t.id) === 'essentials' && !pinned) switchTab(t.id, 'folders'); else renderTrip(t.id);
      } catch (err) {
        console.error(err); btn.disabled = false; btn.textContent = 'Save';
        toast(err.name === 'QuotaExceededError' ? 'Phone storage is full. Free up space and try again.' : 'Could not save: ' + err.message, 4000);
      }
    };
  });
}

async function openDocEdit(docId) {
  const d = await DB.getDoc(docId); if (!d) return;
  openSheet(`
    <h3>Edit document</h3>
    <p class="sub">${esc(d.fileName || '')} · ${fmtSize(d.size || 0)}</p>
    <label class="lbl" for="fTitle">Title</label><input class="input" id="fTitle" value="${esc(d.title)}" maxlength="80">
    <span class="lbl">Folder</span>${chipsHTML(d.category)}
    <div class="two"><div><label class="lbl" for="fRef">PNR / Booking ref</label><input class="input mono" id="fRef" value="${esc(d.ref || '')}" maxlength="40"></div>
      <div><label class="lbl" for="fDate">Date</label><input class="input" id="fDate" type="date" value="${esc(d.date || '')}"></div></div>
    <button type="button" class="toggle ${d.pinned ? 'on' : ''}" id="fPin"><span class="sw"></span>★ Pin to Essentials</button>
    <div class="actions"><button class="btn danger" id="fDel">${icon('trash-2', 17)}Delete</button><button class="btn primary" id="fSave">Save</button></div>`,
  sheet => {
    let category = d.category;
    wireChips(sheet, c => category = c);
    wireToggle($('#fPin', sheet));
    $('#fSave', sheet).onclick = async () => {
      Object.assign(d, { title: $('#fTitle', sheet).value.trim() || d.title, category, ref: $('#fRef', sheet).value.trim(), date: $('#fDate', sheet).value, pinned: $('#fPin', sheet).classList.contains('on') });
      await DB.saveDoc(d); (expanded[d.tripId] = expanded[d.tripId] || new Set()).add(category);
      await back(); toast('Saved ✔'); renderTrip(d.tripId);
    };
    $('#fDel', sheet).onclick = async () => {
      if (!confirm(`Delete “${d.title}” from this phone? This can't be undone.`)) return;
      await DB.deleteDoc(d.id); await back(); toast('Document deleted'); renderTrip(d.tripId);
    };
  });
}

/* ---------------- trip create / edit ---------------- */
function openTripSheet(trip) {
  const t = trip || { purpose: '' };
  const isNew = !trip;
  openSheet(`
    <h3>${isNew ? 'New trip folder' : 'Edit trip'}</h3>
    ${isNew ? '<p class="sub">Each trip gets its own folder for all its documents.</p>' : ''}
    <label class="lbl" for="tDest">Destination *</label><input class="input" id="tDest" value="${esc(t.destination || '')}" placeholder="e.g. Singapore, Maasai Mara" maxlength="40">
    <label class="lbl" for="tCountry">Country</label><input class="input" id="tCountry" list="countries" value="${esc(t.country || '')}" placeholder="Pick or type a country" maxlength="40">
    <datalist id="countries">${Object.keys(COUNTRIES).sort().map(c => `<option value="${c}">`).join('')}</datalist>
    <div class="two"><div><label class="lbl" for="tFrom">From (airport)</label><input class="input mono" id="tFrom" value="${esc(t.from ?? (isNew ? 'DOH' : ''))}" placeholder="DOH" maxlength="4" autocapitalize="characters"></div>
      <div><label class="lbl" for="tTo">To (airport)</label><input class="input mono" id="tTo" value="${esc(t.to || '')}" placeholder="SIN" maxlength="4" autocapitalize="characters"></div></div>
    <div class="two"><div><label class="lbl" for="tStart">Start date</label><input class="input" id="tStart" type="date" value="${esc(t.start || '')}"></div>
      <div><label class="lbl" for="tEnd">End date</label><input class="input" id="tEnd" type="date" value="${esc(t.end || '')}"></div></div>
    <span class="lbl">Purpose</span><div class="chips" id="purp">${PURPOSES.map(p => `<button type="button" class="chip ${t.purpose === p ? 'on' : ''}" data-p="${p}">${p}</button>`).join('')}</div>
    <div class="actions">${isNew ? '<button class="btn ghost" id="tCancel">Cancel</button>' : `<button class="btn danger" id="tDel">${icon('trash-2', 17)}Delete</button>`}<button class="btn primary" id="tSave">${isNew ? 'Create folder' : 'Save'}</button></div>`,
  sheet => {
    let purpose = t.purpose || '';
    $$('#purp .chip', sheet).forEach(c => c.onclick = () => {
      const on = c.classList.contains('on'); $$('#purp .chip', sheet).forEach(x => x.classList.remove('on'));
      if (!on) c.classList.add('on'); purpose = on ? '' : c.dataset.p;
    });
    $('#tStart', sheet).onchange = e => { const end = $('#tEnd', sheet); if (!end.value || end.value < e.target.value) end.value = e.target.value; };
    if (isNew) { $('#tCancel', sheet).onclick = () => back(); setTimeout(() => $('#tDest', sheet).focus(), 250); }
    else $('#tDel', sheet).onclick = async () => {
      const cur = await DB.getTrip(t.id);
      const n = (await DB.docsFor(t.id)).length + (cur.noteItems || []).length + (cur.todos || []).length + packStats(cur).total;
      if (n) { alert(`This trip still has documents, notes or tasks.\n\nUse “End trip” to back them up as a zip first, then delete.`); return; }
      if (!confirm(`Delete the empty trip “${t.destination}”?`)) return;
      await DB.deleteTrip(t.id); await back(); toast('Trip deleted'); navigate('/', true);
    };
    $('#tSave', sheet).onclick = async () => {
      const dest = $('#tDest', sheet).value.trim();
      if (!dest) { $('#tDest', sheet).focus(); toast('Please enter a destination'); return; }
      const start = $('#tStart', sheet).value, end = $('#tEnd', sheet).value;
      if (start && end && end < start) { toast('End date is before the start date'); return; }
      const rec = { ...t, id: t.id || DB.uid(), created: t.created || Date.now(), destination: dest, country: $('#tCountry', sheet).value.trim(),
        from: $('#tFrom', sheet).value.trim().toUpperCase(), to: $('#tTo', sheet).value.trim().toUpperCase(), start, end: end || start, purpose };
      await DB.saveTrip(rec); await Native.syncTrip(rec);
      await back();
      if (isNew) { toast(`📁 ${dest} folder created`); navigate('/trip/' + rec.id); }
      else { toast('Trip updated ✔'); renderTrip(rec.id); }
    };
  });
}

/* ---------------- end trip: back up, then delete ---------------- */
async function downloadFile(file) {
  if (Native.isApp) return Native.saveFile(file);
  const url = URL.createObjectURL(file);
  const a = document.createElement('a'); a.href = url; a.download = file.name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function openEndTrip(t) {
  const docs = await DB.docsFor(t.id);
  const size = docs.reduce((s, d) => s + (d.size || 0), 0);
  const used = CATS.filter(c => docs.some(d => d.category === c.id));
  const name = ZipIO.backupName(t) + '.zip';
  const nNotes = (t.noteItems || []).length, nTodo = (t.todos || []).length, nPack = packStats(t).total;
  const keep = docs.length + nNotes + nTodo + nPack > 0;
  const tree = keep ? used.map(c => `  ├ ${c.folder}/  (${docs.filter(d => d.category === c.id).length})`).join('\n') + (nTodo ? `\n  ├ ToDo.txt  (${nTodo})` : '') + (nPack ? `\n  ├ Packing.txt  (${nPack})` : '') + (nNotes ? `\n  ├ Notes.txt  (${nNotes})` : '') + '\n  └ trip.json' : '';
  openSheet(`
    <h3>End trip · ${esc(t.destination)} ${flag(t.country)}</h3>
    <div class="summary"><div><b>${docs.length}</b><span>DOCS</span></div><div><b>${nTodo}</b><span>TASKS</span></div><div><b>${nNotes}</b><span>NOTES</span></div><div><b>${fmtSize(size)}</b><span>SIZE</span></div></div>
    ${keep ? `
    <div class="step" id="s1">
      <div class="sh"><div class="num" id="n1">1</div><b>Back up trip folder</b></div>
      <div class="zipline mono">📦 ${esc(name)}\n${esc(tree)}</div>
      <div class="check hidden" id="ok1"></div>
      <button class="btn primary" id="bBackup">⤓ Back up &amp; save zip</button>
      <div style="margin-left:36px;margin-top:6px"><button class="linkbtn" id="bDl">${Native.isApp ? 'or share it (WhatsApp, Gmail, Drive…)' : 'or save straight to Downloads'}</button></div>
    </div>` : '<p class="sub">This trip has no documents, tasks or notes, so there is nothing to back up.</p>'}
    <div class="step ${keep ? 'locked' : ''}" id="s2">
      <div class="sh"><div class="num" id="n2">${keep ? 2 : 1}</div><b>Delete from phone</b></div>
      <p>${keep ? `Frees ${fmtSize(size)}. You can restore it any time from the zip (Settings › Restore).` : 'Removes this empty trip folder.'}</p>
      <button class="btn danger" id="bDelete" ${keep ? 'disabled' : ''}>${icon('trash-2', 17)}Delete trip from phone</button>
    </div>
    <button class="btn ghost block" id="bKeep">Cancel · keep trip</button>`,
  sheet => {
    const unlock = msg => {
      $('#n1', sheet).className = 'num ok'; $('#n1', sheet).textContent = '✓';
      const ok = $('#ok1', sheet); ok.textContent = '✔ ' + msg; ok.classList.remove('hidden');
      $('#s2', sheet).classList.remove('locked'); $('#bDelete', sheet).disabled = false;
      $('#bBackup', sheet).innerHTML = '⤓ Save another copy'; $('#bBackup', sheet).className = 'btn ghost';
    };
    const build = async btn => {
      const label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Packing folder…';
      try { return await ZipIO.buildBackup(t, docs, CATS); }
      finally { btn.disabled = false; btn.innerHTML = label; }
    };
    if (keep) {
      $('#bBackup', sheet).onclick = async e => {
        let file;
        try { file = await build(e.currentTarget); } catch (err) { toast('Backup failed: ' + err.message, 4000); return; }
        if (Native.isApp) {
          try { if (await Native.saveFile(file)) unlock(`Saved as ${file.name}`); else toast('Backup not saved. Nothing was deleted.'); }
          catch (err) { toast('Could not save: ' + err.message, 4000); }
          return;
        }
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: `${t.destination} trip backup` }); unlock('Backup handed to your phone. Check it is saved in Files / Drive.'); }
          catch (err) { if (err.name === 'AbortError') toast('Backup not saved. Nothing was deleted.'); else { downloadFile(file); unlock(`Saved to Downloads as ${file.name}`); } }
        } else { downloadFile(file); unlock(`Saved to Downloads as ${file.name}`); }
      };
      $('#bDl', sheet).onclick = async () => {
        try {
          const file = await build($('#bBackup', sheet));
          if (Native.isApp) { await Native.shareFile(file, `${t.destination} trip backup`); unlock('Backup shared. Check it arrived (WhatsApp / Drive / email).'); }
          else { downloadFile(file); unlock(`Saved to Downloads as ${file.name}`); }
        }
        catch (err) { toast('Backup failed: ' + err.message, 4000); }
      };
    }
    $('#bDelete', sheet).onclick = async () => {
      if (keep && !confirm(`Delete “${t.destination}” with its ${docs.length} document${docs.length === 1 ? '' : 's'}, ${nTodo} task${nTodo === 1 ? '' : 's'} and ${nNotes} note${nNotes === 1 ? '' : 's'} from this phone?\n\nMake sure the backup zip is saved first.`)) return;
      await DB.deleteTrip(t.id); await Native.clearTrip(t.id);
      delete expanded[t.id];
      await back(); navigate('/', true);
      toast(`${t.destination} removed from phone${keep ? ' · backup zip keeps everything' : ''}`, 3500);
    };
    $('#bKeep', sheet).onclick = () => back();
  });
}

/* ---------------- Show to Officer viewer ---------------- */
let wakeLock = null, viewerOpen = false;
async function keepAwake(on) {
  try {
    if (Native.isApp) return await Native.keepAwake(on);
    if (on && 'wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); return true; }
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch {}
  return false;
}
document.addEventListener('visibilitychange', () => { if (viewerOpen && document.visibilityState === 'visible') keepAwake(true); });

let rotatedIn = null;
function rotateDataURL(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => {
      const c = document.createElement('canvas'); c.width = i.naturalHeight; c.height = i.naturalWidth;
      const ctx = c.getContext('2d'); ctx.translate(c.width / 2, c.height / 2); ctx.rotate(Math.PI / 2);
      ctx.drawImage(i, -i.naturalWidth / 2, -i.naturalHeight / 2);
      res(c.toDataURL('image/jpeg', 0.72));
    };
    i.onerror = rej; i.src = src;
  });
}

async function openViewer(docId) {
  const d = await DB.getDoc(docId); if (!d) return;
  const isPdf = d.type === 'application/pdf', isImg = (d.type || '').startsWith('image/');
  const v = document.createElement('div'); v.className = 'viewer'; v.setAttribute('role', 'dialog');
  v.innerHTML = `
    <div class="vtop"><button class="x" id="vx" aria-label="Close">${icon('x', 20, 2.4)}</button><b>${esc(d.title)} · ${esc(currentTrip ? currentTrip.destination : '')}</b><span class="awake hidden" id="vawake">🔆 SCREEN ON</span></div>
    ${d.ref ? `<div class="vref">${esc(cat(d.category).short === 'Flights' ? 'PNR' : 'Ref')}<span>${esc(d.ref)}</span></div>` : ''}
    <div class="vbody" id="vb"><div class="msg"><span class="spin"></span></div></div>
    <span class="vzoom hidden" id="vzoom" aria-live="polite"></span>
    <div class="vbot"><div class="g">${isPdf ? `<button id="vprev" aria-label="Previous page">${icon('chevron-left', 20, 2.4)}</button><span id="vpage">1 / 1</span><button id="vnext" aria-label="Next page">${icon('chevron-right', 20, 2.4)}</button>` : `<span>${fmtSize(d.size || 0)}</span>`}</div>
      <div class="g">${isImg || isPdf ? `<button id="vrot" aria-label="Rotate 90 degrees" title="Rotate">${icon('rotate-cw', 19, 2.3)}</button>` : ''}<button id="vout" aria-label="Zoom out">${icon('minus', 20, 2.4)}</button><button id="vin" aria-label="Zoom in">${icon('plus', 20, 2.4)}</button>${navigator.share || Native.isApp ? `<button id="vshare" aria-label="Share">${icon('share-2', 19, 2.3)}</button>` : ''}</div></div>`;
  layer.append(v);
  viewerOpen = true;
  let url, pdf, page = 1, zoom = 1, token = 0, rot = (d.rotation || 0) % 360;
  const vb = $('#vb', v);
  pushOverlay(() => {
    viewerOpen = false; keepAwake(false); url && URL.revokeObjectURL(url); pdf && pdf.destroy(); v.remove();
    if (rotatedIn) { const t = rotatedIn; rotatedIn = null; if (currentTrip && currentTrip.id === t && /trip\//.test(location.hash)) renderTrip(t); }
  });
  $('#vx', v).onclick = () => back();
  keepAwake(true).then(ok => ok && $('#vawake', v).classList.remove('hidden'));
  const ZMIN = 1, ZMAX = 6, clampZ = z => Math.min(ZMAX, Math.max(ZMIN, z));
  // keep the spot at (sx, sy) inside the viewer under the finger while the zoom changes
  const anchorAt = (sx, sy) => {
    const c = $('canvas', vb); if (!c) return null;
    const r = c.getBoundingClientRect(), vr = vb.getBoundingClientRect();
    return { fx: (vr.left + sx - r.left) / r.width, fy: (vr.top + sy - r.top) / r.height, sx, sy };
  };
  const zoomTo = (z, sx = vb.clientWidth / 2, sy = vb.clientHeight / 2) => {
    z = clampZ(z); if (Math.abs(z - zoom) < 0.01) return;
    const an = anchorAt(sx, sy); zoom = z; draw(an);
  };
  $('#vin', v).onclick = () => zoomTo(zoom * 1.5); $('#vout', v).onclick = () => zoomTo(zoom / 1.5);

  // pinch with two fingers, drag with one, double-tap to zoom in / back to fit
  let pinch = null, lastTap = 0, tapX = 0, tapY = 0, moved = false, touchDbl = 0;
  const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  vb.addEventListener('touchstart', e => {
    moved = false;
    if (e.touches.length === 2) {
      const c = $('canvas', vb); if (!c) return;
      const [p1, p2] = e.touches, vr = vb.getBoundingClientRect(), cr = c.getBoundingClientRect();
      const mx = (p1.clientX + p2.clientX) / 2, my = (p1.clientY + p2.clientY) / 2;
      pinch = { d0: dist(p1, p2), ratio: 1, c, sx: mx - vr.left, sy: my - vr.top, an: anchorAt(mx - vr.left, my - vr.top) };
      c.style.transformOrigin = `${mx - cr.left}px ${my - cr.top}px`;
      e.preventDefault();
    }
  }, { passive: false });
  vb.addEventListener('touchmove', e => {
    moved = true;
    if (pinch && e.touches.length === 2) {
      const r = dist(e.touches[0], e.touches[1]) / pinch.d0;
      pinch.ratio = clampZ(zoom * r) / zoom;
      pinch.c.style.transform = `scale(${pinch.ratio})`;
      e.preventDefault();
    }
  }, { passive: false });
  vb.addEventListener('touchend', e => {
    if (pinch && e.touches.length < 2) {
      const p = pinch; pinch = null;
      const z = clampZ(zoom * p.ratio);
      if (Math.abs(z - zoom) < 0.02) { p.c.style.transform = ''; return; }
      zoom = z; draw(p.an);
      return;
    }
    if (e.touches.length || e.changedTouches.length !== 1 || moved) return;
    const t = e.changedTouches[0], now = Date.now(), vr = vb.getBoundingClientRect();
    if (now - lastTap < 320 && Math.hypot(t.clientX - tapX, t.clientY - tapY) < 30) {
      zoomTo(zoom > 1.2 ? 1 : 2.5, t.clientX - vr.left, t.clientY - vr.top); lastTap = 0; touchDbl = now;
    } else { lastTap = now; tapX = t.clientX; tapY = t.clientY; }
  });
  vb.addEventListener('dblclick', e => { if (Date.now() - touchDbl < 700) return; const vr = vb.getBoundingClientRect(); zoomTo(zoom > 1.2 ? 1 : 2.5, e.clientX - vr.left, e.clientY - vr.top); });
  const rb = $('#vrot', v);
  if (rb) rb.onclick = async () => {
    rot = (rot + 90) % 360; zoom = 1; vb.scrollTop = 0; vb.scrollLeft = 0; draw();
    // remember it, and turn the thumbnail too
    d.rotation = rot;
    if (d.thumb) d.thumb = await rotateDataURL(d.thumb).catch(() => d.thumb);
    await DB.saveDoc(d).catch(() => {});
    rotatedIn = d.tripId;
  };
  const sh = $('#vshare', v);
  if (sh) sh.onclick = async () => {
    try {
      const f = new File([d.blob], d.fileName || d.title, { type: d.type });
      if (Native.isApp) await Native.shareFile(f, d.title); else await navigator.share({ files: [f], title: d.title });
    }
    catch (e) { if (e.name !== 'AbortError') toast('Sharing not available for this file'); }
  };

  let img;
  const show = (c, an) => {
    const w = document.createElement('div'); w.className = 'vwrap'; w.append(c);
    vb.innerHTML = ''; vb.append(w);
    if (an) {   // put the same spot of the document back under the finger
      const r = c.getBoundingClientRect(), vr = vb.getBoundingClientRect();
      vb.scrollLeft += (r.left - vr.left) + an.fx * r.width - an.sx;
      vb.scrollTop += (r.top - vr.top) + an.fy * r.height - an.sy;
    }
    const zi = $('#vzoom', v); zi.textContent = `×${zoom.toFixed(1)}`; zi.classList.toggle('hidden', zoom < 1.05);
  };
  async function draw(an) {
    const my = ++token;
    const cw = vb.clientWidth - 16, ch = vb.clientHeight - 16;
    if (isImg) {
      if (!img) {
        url = URL.createObjectURL(d.blob);
        img = new Image(); img.alt = d.title;
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; }).catch(() => { vb.innerHTML = '<div class="msg">This image could not be opened.</div>'; });
      }
      if (!img.naturalWidth) return;
      const swap = rot === 90 || rot === 270;
      const nw = swap ? img.naturalHeight : img.naturalWidth, nh = swap ? img.naturalWidth : img.naturalHeight;
      const fit = Math.min(cw / nw, ch / nh) * zoom;
      const cssW = nw * fit, cssH = nh * fit;
      let px = Math.min(window.devicePixelRatio || 1, 3);
      if (cssW * cssH * px * px > 16e6) px = Math.sqrt(16e6 / (cssW * cssH));
      const c = document.createElement('canvas');
      c.width = Math.round(cssW * px); c.height = Math.round(cssH * px);
      c.style.width = Math.round(cssW) + 'px'; c.style.height = Math.round(cssH) + 'px';
      c.setAttribute('role', 'img'); c.setAttribute('aria-label', d.title);
      const ctx = c.getContext('2d');
      ctx.translate(c.width / 2, c.height / 2); ctx.rotate(rot * Math.PI / 180);
      const w = img.naturalWidth * fit * px, h = img.naturalHeight * fit * px;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      show(c, an);
    } else if (isPdf) {
      try {
        if (!pdf) { const pdfjs = await loadPdfJs(); pdf = await pdfjs.getDocument({ data: await d.blob.arrayBuffer() }).promise; }
        const pg = await pdf.getPage(page);
        if (my !== token) return;
        const rotation = ((pg.rotate || 0) + rot) % 360;
        const vp0 = pg.getViewport({ scale: 1, rotation });
        const cssW = Math.max(200, cw * zoom);
        let scale = cssW / vp0.width;
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        let px = scale * dpr;
        const maxPx = 16e6; if (vp0.width * vp0.height * px * px > maxPx) px = Math.sqrt(maxPx / (vp0.width * vp0.height));
        const vp = pg.getViewport({ scale: px, rotation });
        const c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
        c.style.width = Math.round(cssW) + 'px'; c.style.height = Math.round(cssW * vp.height / vp.width) + 'px';
        await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        if (my !== token) return;
        show(c, an);
        $('#vpage', v).textContent = `${page} / ${pdf.numPages}`;
        $('#vprev', v).disabled = page <= 1; $('#vnext', v).disabled = page >= pdf.numPages;
      } catch (e) { console.error(e); vb.innerHTML = '<div class="msg">This PDF could not be displayed.<br>Try “Share” to open it in another app.</div>'; }
    } else {
      vb.innerHTML = `<div class="msg">📎 ${esc(d.fileName)}<br><br>This file type can't be previewed here.<br>Use “Share” to open it in another app.</div>`;
    }
  }
  if (isPdf) {
    $('#vprev', v).onclick = () => { if (page > 1) { page--; vb.scrollTop = 0; draw(); } };
    $('#vnext', v).onclick = () => { if (pdf && page < pdf.numPages) { page++; vb.scrollTop = 0; draw(); } };
  }
  requestAnimationFrame(draw);
}

/* ---------------- settings & restore ---------------- */
async function openSettings() {
  let est = { usage: 0, quota: 0 }, persisted = false;
  try { est = await navigator.storage.estimate(); persisted = await navigator.storage.persisted(); } catch {}
  const [trips, allDocs] = await Promise.all([DB.allTrips(), DB.allDocsMeta()]);
  const docBytes = allDocs.reduce((s, d) => s + (d.size || 0), 0);
  const pct = est.quota ? Math.min(100, Math.max(1, Math.round(docBytes / est.quota * 100))) : 0;
  const det = est.usageDetails || {};
  const parts = [det.indexedDB != null ? `database ${fmtSize(det.indexedDB)}` : '', det.caches != null ? `app cache ${fmtSize(det.caches)}` : '', det.serviceWorkerRegistrations != null ? `service worker ${fmtSize(det.serviceWorkerRegistrations)}` : ''].filter(Boolean).join(' · ');
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const theme = document.documentElement.dataset.theme;
  const off = await offlineStatus();
  const tick = b => b ? '✅' : '❌';
  const rs = await Native.status();
  const appInfo = await Native.appInfo();
  const nTasks = trips.reduce((s, t) => s + (t.todos || []).filter(x => !x.done && x.priority !== 'delayed').length, 0);
  openSheet(`
    <h3>Settings</h3>
    <div class="setrow"><h4>📱 Storage on this phone</h4>
      <p style="color:var(--text);font-size:14px"><b>Your documents: ${fmtSize(docBytes)}</b> · ${allDocs.length} file${allDocs.length === 1 ? '' : 's'} in ${trips.length} trip${trips.length === 1 ? '' : 's'}</p>
      <div class="meter" style="margin-top:8px"><i style="width:${pct}%"></i></div>
      ${est.quota ? `<p style="margin-top:6px;font-size:11.5px">Space the phone allows this app: up to ${fmtSize(est.quota)}. The browser's own estimate for this website is ${fmtSize(est.usage || 0)}${parts ? ` (${parts})` : ''}. This includes browser overhead, and is not your files.</p>` : ''}
      ${Native.isApp ? '<p style="margin-top:8px">🔒 Stored inside the Voyager Vault app. Only uninstalling the app or clearing its data removes them, so back up first.</p>'
        : `<p style="margin-top:8px">${persisted ? '🔒 Protected: the phone will not clear your documents to free space.' : '⚠️ Not yet protected. Install the app to your home screen, then tap below.'}</p>
      ${persisted ? '' : '<button class="btn ghost block" id="sPersist">Protect my documents</button>'}`}
    </div>
    <div class="setrow"><h4>🔔 Reminders &amp; alarms</h4>
      ${Native.isApp ? `<p>${nTasks} open task${nTasks === 1 ? '' : 's'} with reminders.</p>${reminderChecklist(rs)}
        <button type="button" class="toggle ${Native.quiet() ? 'on' : ''}" id="sQuiet"><span class="sw"></span>Quiet hours 11 pm–6 am (urgent repeats wait until 6 am)</button>
        <button class="btn ghost block" id="sTest">🔴 Test: ring an urgent alarm in 10 seconds</button>`
      : `<p>Alarms ring only in the Voyager Vault <b>Android app</b>. Tasks you add here are saved, but this website cannot ring alarms while it is closed.</p>
        <a class="btn primary block" style="margin-top:10px;text-decoration:none" href="downloads/VoyagerVault.apk" download>⬇ Get the Android app (APK)</a>
        <p style="margin-top:8px;font-size:11.5px">Before switching: tap <b>Back up all trips</b> below, then restore that zip inside the Android app.</p>`}
    </div>
    ${Native.isApp ? `<div class="setrow" id="updRow"><h4>⬆️ App updates</h4>
      <p>Installed: <b>v${esc(appInfo ? appInfo.versionName : APP_VERSION)}</b>. Updates keep all your trips, documents, tasks and notes.</p>
      <div id="updBox"></div>
      <button class="btn ghost block" id="sCheckUpd">🔄 Check for updates</button></div>` : ''}
    <div class="setrow"><h4>✈️ Offline check</h4>
      <p>${tick(off.active)} Offline engine running in this app<br>${tick(off.shell)} App page saved<br>${tick(off.files >= OFFLINE_FILES)} App files saved (${off.files}/${OFFLINE_FILES})<br>
      ${isOfflineReady(off) ? '<b style="color:var(--green)">Ready: this app opens in airplane mode.</b>' : '<b style="color:var(--amber)">Not ready yet. Keep internet on, close the app fully and reopen it, then check again.</b>'}</p>
      <p style="font-size:11px;margin-top:6px">${esc(off.cache || 'no cache')} · ${esc(location.pathname + location.search)} · ${off.app ? 'Android app' : standalone ? 'installed app' : 'browser tab'}</p></div>
    <div class="setrow"><h4>📦 Back up all trips</h4><p>One zip with every trip: documents, tasks and notes. Use it to move everything to a new phone or into the Android app.</p>
      <button class="btn ghost block" id="sBackupAll" ${trips.length ? '' : 'disabled'}>⤓ Back up all ${trips.length} trip${trips.length === 1 ? '' : 's'}</button></div>
    <div class="setrow"><h4>♻️ Restore a backup</h4><p>Pick a Voyager Vault .zip (from “End trip” or “Back up all trips”) to bring the trips back.</p>
      <button class="btn primary block" id="sRestore">Choose backup zip</button></div>
    <div class="setrow"><h4>🎨 Theme</h4><div class="seg"><button data-th="dark" class="${theme === 'dark' ? 'on' : ''}">Ocean night</button><button data-th="light" class="${theme === 'light' ? 'on' : ''}">Sky day</button></div></div>
    ${standalone || Native.isApp ? '' : `<div class="setrow"><h4>⬇️ Install on this phone</h4>${installEvt ? '<button class="btn primary block" id="sInstall" style="margin:4px 0 10px">⬇ Install Voyager Vault</button>' : ''}<p>${ios
      ? 'In Safari tap <b>Share</b> (square with arrow), then <b>Add to Home Screen</b>. Open Voyager Vault from the home screen icon from now on.'
      : 'In Chrome tap <b>⋮</b>, then <b>Add to Home screen</b> / <b>Install app</b>. Open Voyager Vault from the home screen icon from now on.'}</p></div>`}
    <div class="setrow"><h4>🛡️ Privacy</h4><p>Your documents are stored only on this phone. No account, no cloud and no tracking, and the app works in airplane mode. Back up a trip with “End trip” before deleting it or changing phones.</p></div>
    <p class="sub" style="text-align:center;margin-top:8px">Voyager Vault v${APP_VERSION}</p>`,
  sheet => {
    const p = $('#sPersist', sheet);
    if (p) p.onclick = async () => {
      let ok = false; try { ok = await navigator.storage.persist(); } catch {}
      toast(ok ? '🔒 Documents protected' : 'Your browser declined. Install the app to the home screen and try again.', 4000);
      if (ok) { await back(); openSettings(); }
    };
    const si = $('#sInstall', sheet); if (si) si.onclick = async () => { await back(); installApp(); };
    wireReminderChecklist(sheet, () => { back().then(openSettings); });
    const cu = $('#sCheckUpd', sheet);
    if (cu) {
      cu.onclick = () => runUpdateCheck(sheet, true);
      if (updateState && updateState.available) showUpdateBox(sheet, updateState);
    }
    const q = $('#sQuiet', sheet);
    if (q) q.onclick = async () => { q.classList.toggle('on'); Native.setQuiet(q.classList.contains('on')); await Native.syncAll(); toast(Native.quiet() ? 'Quiet hours on' : 'Quiet hours off: urgent alarms ring at night too'); };
    const ts = $('#sTest', sheet);
    if (ts) ts.onclick = async () => { await Native.testAlarm('urgent', 10); toast('Test alarm in 10 seconds. Lock the phone to see the full-screen alarm.', 6000); };
    $('#sBackupAll', sheet).onclick = async e => {
      const btn = e.currentTarget, label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Packing all trips…';
      try {
        const all = await DB.allTrips(), docsBy = {};
        for (const tr of all) docsBy[tr.id] = await DB.docsFor(tr.id);
        const file = await ZipIO.buildAll(all, docsBy, CATS);
        if (Native.isApp) { if (await Native.saveFile(file)) toast(`✔ Saved ${file.name}`, 4000); }
        else { await downloadFile(file); toast(`✔ Saved to Downloads as ${file.name}`, 4000); }
      } catch (err) { toast('Backup failed: ' + err.message, 4000); }
      finally { btn.disabled = false; btn.innerHTML = label; }
    };
    $('#sRestore', sheet).onclick = () => { const i = $('#pickZip'); i.value = ''; i.click(); };
    $$('.seg button', sheet).forEach(b => b.onclick = () => {
      applyTheme(b.dataset.th); store.set('vv-theme', b.dataset.th);
      $$('.seg button', sheet).forEach(x => x.classList.toggle('on', x === b));
    });
  });
}

$('#pickZip').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  toast('Restoring backup…', 10000);
  try {
    const items = await ZipIO.readBackup(f);
    const existingIds = new Set((await DB.allDocsMeta()).map(d => d.id));
    let lastId = null, nDocs = 0;
    for (const { trip, docs } of items) {
      const clash = await DB.getTrip(trip.id);
      const newTripId = clash ? DB.uid() : trip.id;
      const rec = { ...trip, id: newTripId };
      await DB.saveTrip(rec);
      for (const d of docs) await DB.saveDoc({ ...d, id: existingIds.has(d.id) || clash ? DB.uid() : d.id, tripId: newTripId });
      await Native.syncTrip(rec);
      lastId = newTripId; nDocs += docs.length;
    }
    protectStorage();
    while (overlays.length) await back();
    if (items.length === 1) { toast(`✔ ${items[0].trip.destination} restored · ${nDocs} documents`, 3500); navigate('/trip/' + lastId); }
    else { toast(`✔ ${items.length} trips restored · ${nDocs} documents`, 3500); navigate('/'); }
  } catch (err) { console.error(err); toast(err.message || 'Could not read this backup', 4500); }
});

/* ---------------- Android alarm permissions ---------------- */
const REM_STEPS = [
  { k: 'notifications', label: 'Notifications allowed', why: 'needed for every reminder' },
  { k: 'exact', label: 'Exact alarms allowed', why: 'so alarms ring on time' },
  { k: 'fullScreen', label: 'Full-screen alarms allowed', why: 'the red urgent screen' },
  { k: 'battery', label: 'Battery: Unrestricted', why: 'stops Samsung putting the app to sleep' },
  { k: 'overlay', label: 'Show over other apps (optional)', why: 'red alarm even while you use the phone' },
];
function reminderChecklist(rs) {
  if (!rs) return '';
  return `<div class="checklist">${REM_STEPS.map(s => `<div class="ck"><span>${rs[s.k] ? '✅' : s.k === 'overlay' ? '➖' : '❌'}</span><div><b>${s.label}</b><small>${s.why}</small></div>${rs[s.k] ? '' : `<button class="fixbtn" data-fix="${s.k}">Allow</button>`}</div>`).join('')}</div>`;
}
function wireReminderChecklist(sheet, refresh) {
  $$('[data-fix]', sheet).forEach(b => b.onclick = async () => {
    await Native.openSetting(b.dataset.fix);
    // settings screens return to the app; re-check when we come back
    const again = () => { document.removeEventListener('visibilitychange', again); if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', again);
    if (b.dataset.fix === 'notifications') setTimeout(refresh, 1500);
  });
}
let setupShown = false;
async function maybeReminderSetup() {
  if (setupShown) return;
  const rs = await Native.status(); if (!rs) return;
  if (rs.notifications && rs.exact && rs.fullScreen && rs.battery) return;
  setupShown = true;
  const show = async () => {
    const cur = await Native.status();
    openSheet(`<h3>🔔 Set up alarms</h3><p class="sub">Android needs a few permissions so reminders ring on time, even when Voyager Vault is closed and the phone is locked. Tap <b>Allow</b> on each red item.</p>
      ${reminderChecklist(cur)}<div class="actions"><button class="btn primary" id="rsDone">Done</button></div>`,
    sheet => { wireReminderChecklist(sheet, () => { back().then(show); }); $('#rsDone', sheet).onclick = () => back(); });
  };
  show();
}

/* ---------------- in-app updates (Android app) ---------------- */
let updateState = null;
function paintUpdate() {
  const b = $('#btnUpdate'); if (!b) return;
  const show = !!(updateState && updateState.available);
  b.classList.toggle('hidden', !show);
  if (show) { b.textContent = `⬆ UPDATE ${updateState.latest.versionName}`; b.onclick = () => openSettings().then(() => { const r = $('#updRow'); r && r.scrollIntoView({ block: 'center' }); }); }
}
async function backgroundUpdateCheck() {
  if (!Native.isApp || !navigator.onLine) return;
  const last = Number(store.get('vv-upd-checked', 0));
  if (Date.now() - last < 20 * 3600e3 && !(updateState && updateState.available)) return;
  try { updateState = await Native.checkUpdate(); store.set('vv-upd-checked', String(Date.now())); paintUpdate(); }
  catch (e) { /* offline or GitHub unreachable: try again next time */ }
}
function showUpdateBox(sheet, st) {
  const box = $('#updBox', sheet); if (!box) return;
  const l = st.latest;
  box.innerHTML = `<div class="hintbox normal" style="margin:8px 0 10px"><b>🎉 Version ${esc(l.versionName)} is available</b>${l.notes ? `<br>${esc(l.notes)}` : ''}${l.sizeMB ? `<br><small>${esc(l.sizeMB)} MB download</small>` : ''}</div>
    <button class="btn primary block" id="sDoUpd">⬇ Download &amp; install ${esc(l.versionName)}</button>
    <p style="font-size:11.5px;margin-top:8px">Android will ask <b>“Do you want to update this app?”</b>. Tap <b>Update</b>. If Samsung blocks it, switch <b>Auto Blocker</b> off for a moment (Settings › Security and privacy).</p>`;
  $('#sDoUpd', sheet).onclick = async e => {
    const btn = e.currentTarget;
    const info = await Native.appInfo();
    if (info && !info.canInstall) {
      toast('First allow Voyager Vault to install updates: switch on “Allow from this source”, then come back and tap again.', 7000);
      await Native.openSetting('installUpdates');
      return;
    }
    btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Downloading…';
    try {
      await Native.installUpdate(l.apk, pct => { if (pct >= 0) btn.innerHTML = `<span class="spin"></span> Downloading… ${pct}%`; });
      btn.innerHTML = 'Tap “Update” on the Android screen';
    } catch (err) {
      toast('Update failed: ' + (err.message || err) + '. Check your internet and try again.', 5000);
      btn.disabled = false; btn.innerHTML = `⬇ Download &amp; install ${esc(l.versionName)}`;
    }
  };
}
async function runUpdateCheck(sheet, manual) {
  const btn = $('#sCheckUpd', sheet); const box = $('#updBox', sheet);
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Checking…';
  try {
    updateState = await Native.checkUpdate(); store.set('vv-upd-checked', String(Date.now())); paintUpdate();
    if (updateState.available) showUpdateBox(sheet, updateState);
    else box.innerHTML = `<p style="margin:6px 0 10px;color:var(--green);font-weight:700">✔ You have the latest version (v${esc(updateState.current.versionName)}).</p>`;
  } catch (err) {
    box.innerHTML = `<p style="margin:6px 0 10px;color:var(--amber);font-weight:700">Couldn’t check: you need internet for updates. Everything else works offline.</p>`;
  } finally { btn.disabled = false; btn.innerHTML = '🔄 Check for updates'; }
}

/* ---------------- install prompt (Android Chrome / Samsung Internet) ---------------- */
let installEvt = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; paintInstall(); });
window.addEventListener('appinstalled', () => { installEvt = null; paintInstall(); toast('✔ Voyager Vault installed. Open it from your Apps screen or home screen.', 5000); });
function paintInstall() {
  const b = $('#btnInstall'); if (!b) return;
  b.classList.toggle('hidden', !installEvt || isStandalone());
  b.onclick = installApp;
}
async function installApp() {
  if (!installEvt) { toast('Use the browser menu: ⋮ › Add to Home screen › Install', 4000); return; }
  installEvt.prompt();
  const { outcome } = await installEvt.userChoice.catch(() => ({}));
  installEvt = null; paintInstall();
  if (outcome === 'accepted') toast('Installing… the icon appears in a few seconds', 4000);
}

/* ---------------- keep the text box you type in above the keyboard ---------------- */
function revealField(el) {
  if (!el || !el.isConnected) return;
  try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { el.scrollIntoView(); }
}
document.addEventListener('focusin', e => {
  const el = e.target;
  if (!el.matches || !el.matches('input:not([type=file]), textarea, select')) return;
  setTimeout(() => revealField(el), 320);
});
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const el = document.activeElement;
    if (el && el.matches && el.matches('input, textarea, select')) revealField(el);
  });
}

/* ---------------- boot ---------------- */
async function nativeRefresh() {
  const n = await Native.pullDone();
  await Native.syncAll();
  const goTo = await Native.launchTrip();
  if (goTo && (await DB.getTrip(goTo))) { while (overlays.length) await back(); navigate('/trip/' + goTo + '/todo'); }
  else if (n) render();
  if (n) toast(`✓ ${n} task${n > 1 ? 's' : ''} marked done from the alarm`);
}
if (Native.isApp) {
  document.documentElement.classList.add('native');
  Native.initBackButton(() => {
    if (overlays.length || (location.hash && location.hash !== '#/')) { history.back(); return true; }
    return false;
  });
  Native.onResume(() => { nativeRefresh(); backgroundUpdateCheck(); });
  setTimeout(backgroundUpdateCheck, 2500);
  Native.onChanged(nativeRefresh);
  nativeRefresh();
}
if (!Native.isApp && 'serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then(reg => {
    const done = () => setTimeout(paintOfflinePill, 300);
    navigator.serviceWorker.ready.then(done);
    navigator.serviceWorker.addEventListener('controllerchange', done);
    reg.addEventListener('updatefound', () => { const w = reg.installing; w && w.addEventListener('statechange', () => w.state === 'activated' && done()); });
  }).catch(err => console.warn('SW registration failed', err));
}
DB.allDocsMeta().then(d => { if (d.length) protectStorage(); }).catch(() => {});
render();
