/* Voyager Vault – offline travel document folders (all data stays on this device) */
'use strict';
const APP_VERSION = '1.0.5';

const CATS = [
  { id: 'passport',  label: 'Passport / ID',  short: 'Passport',  folder: 'Passport_ID',  icon: '🛂' },
  { id: 'visa',      label: 'Visa',           short: 'Visa',      folder: 'Visa',         icon: '📄' },
  { id: 'flight',    label: 'Flights',        short: 'Flights',   folder: 'Flights',      icon: '✈️' },
  { id: 'hotel',     label: 'Hotels',         short: 'Hotels',    folder: 'Hotels',       icon: '🏨' },
  { id: 'insurance', label: 'Insurance',      short: 'Insurance', folder: 'Insurance',    icon: '🛡️' },
  { id: 'transport', label: 'Transport',      short: 'Transport', folder: 'Transport',    icon: '🚗' },
  { id: 'itinerary', label: 'Itinerary',      short: 'Itinerary', folder: 'Itinerary',    icon: '🗺️' },
  { id: 'work',      label: 'Work / Permits', short: 'Work',      folder: 'Work_Permits', icon: '💼' },
  { id: 'other',     label: 'Other',          short: 'Other',     folder: 'Other',        icon: '📎' },
];
const cat = id => CATS.find(c => c.id === id) || CATS[CATS.length - 1];
const PURPOSES = ['Business', 'Leisure', 'Family', 'Photography', 'Other'];
const NOTE_TOPICS = [
  { k: 'SIM / eSIM', i: '📶', hint: 'e.g. Singtel tourist eSIM, buy at Changi T3 arrivals, 100 GB for S$15' },
  { k: 'Money',      i: '💱', hint: 'e.g. Currency SGD. Best exchange: Mustafa Centre. Cards accepted almost everywhere' },
  { k: 'Transport',  i: '🚕', hint: 'e.g. Use Grab for taxis. EZ-Link card for the MRT' },
  { k: 'Emergency',  i: '🆘', hint: 'e.g. Police 999 · Ambulance 995 · Nearest hospital…' },
  { k: 'Embassy',    i: '🏛️', hint: 'e.g. High Commission of India, 31 Grange Rd · +65 6737 6777' },
  { k: 'Power plug', i: '🔌', hint: 'e.g. Type G (UK 3-pin), 230 V. Pack an adapter' },
  { k: 'Contacts',   i: '👤', hint: 'e.g. Site contact / host name and phone, hotel front desk' },
  { k: 'To do',      i: '✅', hint: 'e.g. Check in online 24 h before, print hotel voucher' },
];
const topicIcon = k => (NOTE_TOPICS.find(n => n.k === k) || { i: '📝' }).i;
const noteText = t => (t.noteItems || []).map(n => `${n.topic || ''} ${n.text}`).join(' ');

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
const OFFLINE_FILES = 15;
async function offlineStatus() {
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
  const m = (location.hash || '#/').slice(1).match(/^\/trip\/([\w-]+)/);
  if (m) return renderTrip(m[1]);
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
        <div style="display:flex;gap:8px;align-items:center"><button id="btnInstall" class="pill ok hidden" style="background:#fff;color:#1E6FD9;border-color:#fff">⬇ INSTALL APP</button><span id="offpill" class="pill wait">…</span>
          <button class="icon-btn" id="btnSettings" aria-label="Settings">${GEAR}</button></div>
      </div>
      <div class="flight" aria-hidden="true">
        <div class="cloud" style="width:64px;height:16px;left:6px;top:4px"></div>
        <div class="cloud" style="width:46px;height:12px;right:34px;top:26px"></div>
        <svg viewBox="0 0 300 40" preserveAspectRatio="none"><path d="M10 34 Q150 -8 288 26" fill="none" stroke="#D9ECFF" stroke-width="2" stroke-dasharray="5 6" opacity=".85"/>
          <circle cx="10" cy="34" r="4" fill="#fff"/><circle cx="288" cy="26" r="4" fill="#FFB547"/></svg>
        <div style="position:absolute;left:52%;top:5px;transform:rotate(8deg);color:#fff;font-size:18px">✈</div>
      </div>
      <label class="search">🔍<input id="q" type="search" placeholder="Search trips, PNR, hotel…" value="${esc(homeQuery)}" autocomplete="off"></label>
    </header>
    <div class="wrap" id="list"></div>
    <button class="fab" id="btnNewTrip">＋ New Trip</button>`;
  $('#btnSettings').onclick = openSettings;
  paintInstall();
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
      <div class="tags">${st.tag}${t.purpose ? `<span class="tag blue">${esc(t.purpose)}</span>` : ''}</div></div>
    <div class="stub"><div class="n">${n}</div><div class="l">DOCS</div></div></button>`;
}

/* ---------------- trip folder ---------------- */
let currentTrip = null;

async function renderTrip(id) {
  const t = await DB.getTrip(id);
  if (!t) return navigate('/', true);
  if (t.notes && !t.noteItems) {   // move the old single notes box into the new Notes section
    t.noteItems = [{ id: DB.uid(), topic: '', text: t.notes, done: false, created: Date.now() }];
    delete t.notes; await DB.saveTrip(t);
  }
  currentTrip = t;
  document.title = `${t.destination} · Voyager Vault`;
  const docs = (await DB.docsFor(id)).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || a.created - b.created);
  const st = status(t);
  const pinned = docs.filter(d => d.pinned);
  const byCat = {}; docs.forEach(d => (byCat[d.category] = byCat[d.category] || []).push(d));
  if (!expanded[id]) { expanded[id] = new Set(docs.length <= 8 ? Object.keys(byCat) : []); }
  const exp = expanded[id];
  const subline = st.key === 'done' ? `${shortRange(t)} · completed` : `${shortRange(t)}${t.start ? ' · ' + st.text : ''}`;

  let body = '';
  if (st.key === 'done') body += `<div class="banner">🏁 <span>Trip finished. Back up this folder and free up space.</span><button data-act="end">End trip ›</button></div>`;
  if (pinned.length) {
    body += `<div class="section" style="color:var(--amber)">★ ESSENTIALS <b>tap to show</b></div><div class="ess">` +
      pinned.map(d => `<button class="tile" data-view="${d.id}"><div class="th">${d.thumb ? `<img src="${d.thumb}" alt="">` : cat(d.category).icon}</div><span>${esc(d.title)}</span></button>`).join('') + `</div>`;
  }
  const notes = (t.noteItems || []).slice().sort((x, y) => (x.done - y.done) || (x.created - y.created));
  body += `<div class="section">📝 NOTES <button class="addlink" data-act="note">＋ Add note</button></div>`;
  body += notes.length
    ? `<div class="notes-card">${notes.map(noteRow).join('')}</div>`
    : `<button class="empty-note" data-act="note"><b>Things to remember for this trip</b><span>SIM card to buy, currency, taxi app, emergency numbers, embassy…</span></button>`;
  if (!docs.length) {
    body += `<div class="empty"><div class="big">📂</div><h3>This trip folder is empty</h3>
      <p>Tap <b>📷 Scan</b> to photograph a document, or <b>＋ Add files</b> to pick PDFs and photos. Your passport, visa, tickets and hotel bookings all go here.</p></div>`;
  } else {
    body += `<div class="section">FOLDERS <b>${docs.length} document${docs.length > 1 ? 's' : ''}</b></div>`;
    const full = CATS.filter(c => byCat[c.id]), emptyC = CATS.filter(c => !byCat[c.id]);
    body += full.map(c => {
      const open = exp.has(c.id);
      return `<div class="folder"><button class="fh" data-fold="${c.id}"><div class="fi">${c.icon}</div><div class="nm">${c.label}</div><span class="ct">${byCat[c.id].length}</span><span class="ch">${open ? '▾' : '▸'}</span></button>` +
        (open ? byCat[c.id].map(docRow).join('') : '') + `</div>`;
    }).join('');
    if (emptyC.length) {
      body += `<div class="section" style="margin-top:14px">EMPTY FOLDERS <b>tap to add</b></div>` +
        emptyC.map(c => `<div class="folder zero"><button class="fh" data-addto="${c.id}"><div class="fi">${c.icon}</div><div class="nm">${c.label}</div><span class="ch">＋</span></button></div>`).join('');
    }
  }

  app.innerHTML = `<div class="tripview">
    <div class="appbar">
      <button class="icon-btn" data-act="home" aria-label="Back">←</button>
      <div class="t"><h2>${flag(t.country)} ${esc(t.destination)}</h2><p>${esc(subline)}</p></div>
      <button class="icon-btn" data-act="edit" aria-label="Edit trip">✎</button>
      <button class="endbtn" data-act="end">End trip</button>
    </div>
    <div class="wrap">${body}</div></div>
    <div class="bar"><button class="btn ghost" data-act="scan">📷 Scan</button><button class="btn primary" data-act="add">＋ Add files</button></div>`;

  app.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.act === 'home') navigate('/');
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
  };
}

function noteRow(n) {
  return `<div class="note ${n.done ? 'done' : ''}"><button class="nchk" data-ntog="${n.id}" aria-label="${n.done ? 'Mark not done' : 'Mark done'}">${n.done ? '✓' : ''}</button>
    <button class="nbody" data-note="${n.id}">${n.topic ? `<b>${topicIcon(n.topic)} ${esc(n.topic)}</b>` : ''}<span>${esc(n.text)}</span></button></div>`;
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
    <div class="chips" id="topics">${NOTE_TOPICS.map(x => `<button type="button" class="chip ${x.k === topic0 ? 'on' : ''}" data-k="${esc(x.k)}">${x.i} ${esc(x.k)}</button>`).join('')}</div>
    <label class="lbl" for="nText">Note</label>
    <textarea class="input" id="nText" rows="6" maxlength="2000" placeholder="${esc((NOTE_TOPICS.find(x => x.k === topic0) || {}).hint || 'Anything you need to remember for this trip…')}">${esc(n ? n.text : '')}</textarea>
    <div class="actions">${n ? '<button class="btn danger" id="nDel">🗑 Delete</button>' : '<button class="btn ghost" id="nCancel">Cancel</button>'}<button class="btn primary" id="nSave">Save note</button></div>`,
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
    <div class="dn"><div class="tt">${esc(d.title)}</div><small>${meta}</small></div>${d.pinned ? '<span class="star">★</span>' : ''}</button>
    <button class="more" data-edit="${d.id}" aria-label="Edit document">⋯</button></div>`;
}

/* ---------------- add documents ---------------- */
let pickPreset = null;
function pick(sel, preset) { pickPreset = preset; const i = $(sel); i.value = ''; i.click(); }
function onPicked(e, cam) { const files = [...e.target.files]; e.target.value = ''; if (files.length) openAddSheet(files, pickPreset, cam); pickPreset = null; }
$('#pickFiles').addEventListener('change', e => onPicked(e, false));
$('#pickCam').addEventListener('change', e => onPicked(e, true));

function chipsHTML(selected) {
  return `<div class="chips" id="cats">${CATS.map(c => `<button type="button" class="chip ${c.id === selected ? 'on' : ''}" data-cat="${c.id}">${c.icon} ${c.short}</button>`).join('')}</div>`;
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
        renderTrip(t.id);
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
    <div class="actions"><button class="btn danger" id="fDel">🗑 Delete</button><button class="btn primary" id="fSave">Save</button></div>`,
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
    <div class="actions">${isNew ? '<button class="btn ghost" id="tCancel">Cancel</button>' : '<button class="btn danger" id="tDel">🗑 Delete</button>'}<button class="btn primary" id="tSave">${isNew ? 'Create folder' : 'Save'}</button></div>`,
  sheet => {
    let purpose = t.purpose || '';
    $$('#purp .chip', sheet).forEach(c => c.onclick = () => {
      const on = c.classList.contains('on'); $$('#purp .chip', sheet).forEach(x => x.classList.remove('on'));
      if (!on) c.classList.add('on'); purpose = on ? '' : c.dataset.p;
    });
    $('#tStart', sheet).onchange = e => { const end = $('#tEnd', sheet); if (!end.value || end.value < e.target.value) end.value = e.target.value; };
    if (isNew) { $('#tCancel', sheet).onclick = () => back(); setTimeout(() => $('#tDest', sheet).focus(), 250); }
    else $('#tDel', sheet).onclick = async () => {
      const n = (await DB.docsFor(t.id)).length + ((await DB.getTrip(t.id)).noteItems || []).length;
      if (n) { alert(`This trip still has documents or notes.\n\nUse “End trip” to back them up as a zip first, then delete.`); return; }
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
      await DB.saveTrip(rec);
      await back();
      if (isNew) { toast(`📁 ${dest} folder created`); navigate('/trip/' + rec.id); }
      else { toast('Trip updated ✔'); renderTrip(rec.id); }
    };
  });
}

/* ---------------- end trip: back up, then delete ---------------- */
function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a'); a.href = url; a.download = file.name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function openEndTrip(t) {
  const docs = await DB.docsFor(t.id);
  const size = docs.reduce((s, d) => s + (d.size || 0), 0);
  const used = CATS.filter(c => docs.some(d => d.category === c.id));
  const name = ZipIO.backupName(t) + '.zip';
  const nNotes = (t.noteItems || []).length;
  const keep = docs.length + nNotes > 0;
  const tree = keep ? used.map(c => `  ├ ${c.folder}/  (${docs.filter(d => d.category === c.id).length})`).join('\n') + (nNotes ? `\n  ├ Notes.txt  (${nNotes})` : '') + '\n  └ trip.json' : '';
  openSheet(`
    <h3>End trip · ${esc(t.destination)} ${flag(t.country)}</h3>
    <div class="summary"><div><b>${docs.length}</b><span>DOCS</span></div><div><b>${nNotes}</b><span>NOTES</span></div><div><b>${fmtSize(size)}</b><span>SIZE</span></div></div>
    ${keep ? `
    <div class="step" id="s1">
      <div class="sh"><div class="num" id="n1">1</div><b>Back up trip folder</b></div>
      <div class="zipline mono">📦 ${esc(name)}\n${esc(tree)}</div>
      <div class="check hidden" id="ok1"></div>
      <button class="btn primary" id="bBackup">⤓ Back up &amp; save zip</button>
      <div style="margin-left:36px;margin-top:6px"><button class="linkbtn" id="bDl">or save straight to Downloads</button></div>
    </div>` : '<p class="sub">This trip has no documents or notes, so there is nothing to back up.</p>'}
    <div class="step ${keep ? 'locked' : ''}" id="s2">
      <div class="sh"><div class="num" id="n2">${keep ? 2 : 1}</div><b>Delete from phone</b></div>
      <p>${keep ? `Frees ${fmtSize(size)}. You can restore it any time from the zip (Settings › Restore).` : 'Removes this empty trip folder.'}</p>
      <button class="btn danger" id="bDelete" ${keep ? 'disabled' : ''}>🗑 Delete trip from phone</button>
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
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: `${t.destination} trip backup` }); unlock('Backup handed to your phone. Check it is saved in Files / Drive.'); }
          catch (err) { if (err.name === 'AbortError') toast('Backup not saved. Nothing was deleted.'); else { downloadFile(file); unlock(`Saved to Downloads as ${file.name}`); } }
        } else { downloadFile(file); unlock(`Saved to Downloads as ${file.name}`); }
      };
      $('#bDl', sheet).onclick = async () => {
        try { const file = await build($('#bBackup', sheet)); downloadFile(file); unlock(`Saved to Downloads as ${file.name}`); }
        catch (err) { toast('Backup failed: ' + err.message, 4000); }
      };
    }
    $('#bDelete', sheet).onclick = async () => {
      if (keep && !confirm(`Delete “${t.destination}” with its ${docs.length} document${docs.length === 1 ? '' : 's'} and ${nNotes} note${nNotes === 1 ? '' : 's'} from this phone?\n\nMake sure the backup zip is saved first.`)) return;
      await DB.deleteTrip(t.id);
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
    <div class="vtop"><button class="x" id="vx" aria-label="Close">✕</button><b>${esc(d.title)} · ${esc(currentTrip ? currentTrip.destination : '')}</b><span class="awake hidden" id="vawake">🔆 SCREEN ON</span></div>
    ${d.ref ? `<div class="vref">${esc(cat(d.category).short === 'Flights' ? 'PNR' : 'Ref')}<span>${esc(d.ref)}</span></div>` : ''}
    <div class="vbody" id="vb"><div class="msg"><span class="spin"></span></div></div>
    <div class="vbot"><div class="g">${isPdf ? '<button id="vprev" aria-label="Previous page">◀</button><span id="vpage">1 / 1</span><button id="vnext" aria-label="Next page">▶</button>' : `<span>${fmtSize(d.size || 0)}</span>`}</div>
      <div class="g">${isImg || isPdf ? '<button id="vrot" aria-label="Rotate 90 degrees" title="Rotate">⟳</button>' : ''}<button id="vout" aria-label="Zoom out">−</button><button id="vin" aria-label="Zoom in">＋</button>${navigator.share ? '<button id="vshare" aria-label="Share">⇪</button>' : ''}</div></div>`;
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
  const ZOOMS = [1, 1.5, 2, 3, 4];
  const setZoom = dir => { const i = Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + dir)); zoom = ZOOMS[i]; draw(); };
  $('#vin', v).onclick = () => setZoom(1); $('#vout', v).onclick = () => setZoom(-1);
  const rb = $('#vrot', v);
  if (rb) rb.onclick = async () => {
    rot = (rot + 90) % 360; vb.scrollTop = 0; vb.scrollLeft = 0; draw();
    // remember it, and turn the thumbnail too
    d.rotation = rot;
    if (d.thumb) d.thumb = await rotateDataURL(d.thumb).catch(() => d.thumb);
    await DB.saveDoc(d).catch(() => {});
    rotatedIn = d.tripId;
  };
  const sh = $('#vshare', v);
  if (sh) sh.onclick = async () => {
    try { await navigator.share({ files: [new File([d.blob], d.fileName || d.title, { type: d.type })], title: d.title }); }
    catch (e) { if (e.name !== 'AbortError') toast('Sharing not available for this file'); }
  };

  let img;
  async function draw() {
    const my = ++token;
    const cw = vb.clientWidth, ch = vb.clientHeight;
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
      vb.innerHTML = ''; vb.append(c);
    } else if (isPdf) {
      try {
        if (!pdf) { const pdfjs = await loadPdfJs(); pdf = await pdfjs.getDocument({ data: await d.blob.arrayBuffer() }).promise; }
        const pg = await pdf.getPage(page);
        if (my !== token) return;
        const rotation = ((pg.rotate || 0) + rot) % 360;
        const vp0 = pg.getViewport({ scale: 1, rotation });
        const cssW = Math.max(200, (cw - 16) * zoom);
        let scale = cssW / vp0.width;
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        let px = scale * dpr;
        const maxPx = 16e6; if (vp0.width * vp0.height * px * px > maxPx) px = Math.sqrt(maxPx / (vp0.width * vp0.height));
        const vp = pg.getViewport({ scale: px, rotation });
        const c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
        c.style.width = Math.round(cssW) + 'px'; c.style.margin = '8px auto';
        await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        if (my !== token) return;
        vb.innerHTML = ''; vb.append(c);
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
  openSheet(`
    <h3>Settings</h3>
    <div class="setrow"><h4>📱 Storage on this phone</h4>
      <p style="color:var(--text);font-size:14px"><b>Your documents: ${fmtSize(docBytes)}</b> · ${allDocs.length} file${allDocs.length === 1 ? '' : 's'} in ${trips.length} trip${trips.length === 1 ? '' : 's'}</p>
      <div class="meter" style="margin-top:8px"><i style="width:${pct}%"></i></div>
      ${est.quota ? `<p style="margin-top:6px;font-size:11.5px">Space the phone allows this app: up to ${fmtSize(est.quota)}. The browser's own estimate for this website is ${fmtSize(est.usage || 0)}${parts ? ` (${parts})` : ''}. This includes browser overhead, and is not your files.</p>` : ''}
      <p style="margin-top:8px">${persisted ? '🔒 Protected: the phone will not clear your documents to free space.' : '⚠️ Not yet protected. Install the app to your home screen, then tap below.'}</p>
      ${persisted ? '' : '<button class="btn ghost block" id="sPersist">Protect my documents</button>'}
    </div>
    <div class="setrow"><h4>✈️ Offline check</h4>
      <p>${tick(off.active)} Offline engine running in this app<br>${tick(off.shell)} App page saved<br>${tick(off.files >= OFFLINE_FILES)} App files saved (${off.files}/${OFFLINE_FILES})<br>
      ${isOfflineReady(off) ? '<b style="color:var(--green)">Ready: this app opens in airplane mode.</b>' : '<b style="color:var(--amber)">Not ready yet. Keep internet on, close the app fully and reopen it, then check again.</b>'}</p>
      <p style="font-size:11px;margin-top:6px">${esc(off.cache || 'no cache')} · ${esc(location.pathname + location.search)} · ${standalone ? 'installed app' : 'browser tab'}</p></div>
    <div class="setrow"><h4>♻️ Restore a trip backup</h4><p>Pick a Voyager Vault .zip (made with “End trip”) to bring that trip folder back.</p>
      <button class="btn primary block" id="sRestore">Choose backup zip</button></div>
    <div class="setrow"><h4>🎨 Theme</h4><div class="seg"><button data-th="dark" class="${theme === 'dark' ? 'on' : ''}">Ocean night</button><button data-th="light" class="${theme === 'light' ? 'on' : ''}">Sky day</button></div></div>
    ${standalone ? '' : `<div class="setrow"><h4>⬇️ Install on this phone</h4>${installEvt ? '<button class="btn primary block" id="sInstall" style="margin:4px 0 10px">⬇ Install Voyager Vault</button>' : ''}<p>${ios
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
    const { trip, docs } = await ZipIO.readBackup(f);
    const clash = await DB.getTrip(trip.id);
    const newTripId = clash ? DB.uid() : trip.id;
    const existingIds = new Set((await DB.allDocsMeta()).map(d => d.id));
    await DB.saveTrip({ ...trip, id: newTripId });
    for (const d of docs) await DB.saveDoc({ ...d, id: existingIds.has(d.id) || clash ? DB.uid() : d.id, tripId: newTripId });
    protectStorage();
    while (overlays.length) await back();
    toast(`✔ ${trip.destination} restored · ${docs.length} documents`, 3500);
    navigate('/trip/' + newTripId);
  } catch (err) { console.error(err); toast(err.message || 'Could not read this backup', 4500); }
});

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

/* ---------------- boot ---------------- */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then(reg => {
    const done = () => setTimeout(paintOfflinePill, 300);
    navigator.serviceWorker.ready.then(done);
    navigator.serviceWorker.addEventListener('controllerchange', done);
    reg.addEventListener('updatefound', () => { const w = reg.installing; w && w.addEventListener('statechange', () => w.state === 'activated' && done()); });
  }).catch(err => console.warn('SW registration failed', err));
}
DB.allDocsMeta().then(d => { if (d.length) protectStorage(); }).catch(() => {});
render();
