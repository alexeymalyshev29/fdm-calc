// ============================================================
// script.js — 3D Print Calculator
// Step 4: All logic extracted from index.html
// Architecture: DOMContentLoaded wrapper, smart splash (no timeout)
// ============================================================

// ── PWA: MANIFEST — статический manifest.json рядом с index.html (Шаг 2) ──

// ── PWA: INSTALL PROMPT ────────────────────────────────────
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('install-pwa-btn');
  if (btn) btn.style.display = 'flex';
});
window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('install-pwa-btn');
  if (btn) btn.style.display = 'none';
  deferredPrompt = null;
});
function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
}

// ── SERVICE WORKER REGISTRATION ─────────────────────────────
// SW вынесен в sw.js рядом с index.html (Шаг 3).
// Blob URL убран — SW теперь работает как корневой scope на Safari iOS.
(function initSW() {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
  navigator.serviceWorker.register('./sw.js', { scope: './' })
    .then(() => console.log('[PWA] SW registered (sw.js)'))
    .catch(err => console.warn('[PWA] SW registration failed:', err.message));
})();

// ── SPLASH SCREEN ────────────────────────────────────────────
// Smart splash: запускается немедленно (до DOMContentLoaded),
// скрывается по animationend CSS fadeOut — без жёсткого таймаута.
(function initSplash() {
  function resetAnim(el, anim) {
    if (!el) return;
    el.style.animation = 'none';
    el.style.webkitAnimation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = anim;
    el.style.webkitAnimation = anim;
  }

  function hideSplash(splashEl) {
    splashEl.style.display = 'none';
    document.body.classList.add('app-ready');
  }

  var splashRan = false;
  function runSplash() {
    var o = document.getElementById('splash-overlay');
    if (!o) return;
    var lw = o.querySelector('.logo-wrapper');
    var tx = o.querySelector('.splash-text');
    var pl = o.querySelector('.print-layer');

    // On the first run, CSS handles the animation — don't reset (causes flicker).
    // Reset only on bfcache restore so the animation replays.
    if (splashRan) {
      resetAnim(pl, 'cssPrint 1.0s cubic-bezier(0.4,0,0.2,1) both');
      resetAnim(lw, 'logoGrow 0.8s cubic-bezier(0.4,0,0.2,1) 1.0s forwards');
      resetAnim(tx, 'textCollapse 0.8s cubic-bezier(0.4,0,0.2,1) 1.0s forwards');
      resetAnim(o,  'fadeOut 0.4s ease 1.9s forwards');
      if (pl) {
        pl.style.clipPath = 'inset(100% 0% 0% 0%)';
        pl.style.webkitClipPath = 'inset(100% 0% 0% 0%)';
      }
      o.style.display = 'flex';
      o.style.opacity = '1';
      document.body.classList.remove('app-ready');
    }
    splashRan = true;

    // ── УМНЫЙ СПЛЕШ: скрываем по концу CSS-анимации fadeOut ──
    // Без жёсткого таймаута. Fallback — только если анимация
    // не сработала (reduced-motion, старый браузер).
    o.addEventListener('animationend', function handler(e) {
      if (e.animationName === 'fadeOut') {
        hideSplash(o);
        o.removeEventListener('animationend', handler);
      }
    });
    // Fallback: проверяем opacity через 2500мс
    setTimeout(function() {
      if (parseFloat(getComputedStyle(o).opacity) < 0.1) hideSplash(o);
    }, 2500);
  }

  // Запускаем немедленно — splash виден до загрузки приложения
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runSplash, { once: true });
  } else {
    runSplash();
  }

  // bfcache: Safari PWA при повторном открытии
  window.addEventListener('pageshow', function(e) {
    if (e.persisted) runSplash();
  });
})();

// ── THEME MODE (light / auto / dark) ───────────────────
// Reads localStorage on startup, listens to clicks on [data-set-mode]
// buttons, persists choice, and keeps the visible label in sync.
(function initThemeMode() {
  var html = document.documentElement;
  var labels = { light: 'Светлая', auto: 'Как в системе', dark: 'Тёмная' };

  // Apply saved mode immediately (before paint) to avoid flicker.
  try {
    var saved = localStorage.getItem('3dp_mode') || 'auto';
    html.setAttribute('data-mode', saved);
  } catch (e) {}

  function syncUI() {
    var m = html.getAttribute('data-mode') || 'auto';
    document.querySelectorAll('[data-set-mode]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-set-mode') === m);
    });
    var lbl = document.getElementById('tm-label');
    if (lbl) lbl.textContent = labels[m] || labels.auto;
  }

  function setup() {
    syncUI();
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-set-mode]');
      if (!b) return;
      var v = b.getAttribute('data-set-mode');
      html.setAttribute('data-mode', v);
      try { localStorage.setItem('3dp_mode', v); } catch (e2) {}
      syncUI();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
})();

// ── FAB: SCROLL TO SALES (mobile only) ───────────────────────
(function initFab() {
  function setup() {
    var fab = document.getElementById('fab-sales');
    if (!fab) return;
    var salesEl = document.querySelector('.sales');
    if (!salesEl) return;
    function isMobile() { return window.innerWidth <= 768; }
    function updateFab() {
      if (!isMobile()) { fab.style.display = 'none'; return; }
      var rect = salesEl.getBoundingClientRect();
      var visible = rect.top < window.innerHeight - 80 && rect.bottom > 80;
      fab.style.display = visible ? 'none' : 'flex';
    }
    window.scrollToSales = function() {
      salesEl.scrollIntoView({behavior: 'smooth', block: 'start'});
    };
    window.addEventListener('scroll', updateFab, {passive: true});
    window.addEventListener('resize', updateFab, {passive: true});
    setTimeout(updateFab, 300);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
})();

// ============================================================
// ── MAIN APP LOGIC — запускается через DOMContentLoaded ──────
// ============================================================
document.addEventListener('DOMContentLoaded', function() {

// ── XLSX download helper ──────────────────────────────────

// ── КОНСТАНТЫ ─────────────────────────────────────────────────
const AUTOSAVE_KEY  = '3dp_autosave';
const AUTOSAVE_TTL  = 24 * 60 * 60 * 1000; // 24ч в мс
const STORAGE_WARN  = 4_500_000;
const PRICE_MULT    = { wholesale: 2, retailLight: 3, retailFull: 4 };

// ── УТИЛИТЫ ────────────────────────────────────────────────
function xlsDL(wb, fn) {
  const out = XLSX.write(wb, {bookType: 'xlsx', type: 'array'});
  const blob = new Blob([out], {type: 'application/octet-stream'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fn;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// ── INPUT HELPER ───────────────────────────────────────────
// parseNum(str) — читает строку с запятой или точкой как число
function parseNum(str) {
  return parseFloat(String(str).replace(',', '.')) || 0;
}

// numInput(el, opts) — вызывается из oninput.
// opts: { decimals: N, max: N }
// • заменяет '.' → ',' на лету
// • блокирует всё кроме цифр и одной ','
// • кламп < 0 → 0
// • если opts.max — кламп > max → max (применяется только на blur, не при вводе)
// • обрезает дробную часть до opts.decimals знаков
function numInput(el, opts) {
  opts = opts || {};
  var raw = el.value;

  // Заменяем точку на запятую
  raw = raw.replace('.', ',');

  // Удаляем всё кроме цифр и первой запятой
  var parts = raw.split(',');
  var intPart = parts[0].replace(/[^0-9]/g, '');
  var hasDec  = parts.length > 1;
  var decPart = hasDec ? parts.slice(1).join('').replace(/[^0-9]/g, '') : '';

  // Обрезаем дробную часть до decimals знаков
  if (hasDec && opts.decimals != null) {
    decPart = decPart.slice(0, opts.decimals);
  }

  // Если запятая есть, но целая часть пустая — подставляем 0
  if (hasDec && intPart === '') intPart = '0';

  var clean = hasDec ? intPart + ',' + decPart : intPart;

  // Обновляем поле только если значение изменилось (сохраняем позицию курсора)
  if (el.value !== clean) {
    var pos = el.selectionStart + (clean.length - el.value.length);
    el.value = clean;
    try { el.setSelectionRange(pos, pos); } catch(e) {}
  }

  // Кламп < 0 (на случай вставки через буфер)
  var num = parseNum(clean);
  if (num < 0) {
    el.value = '0';
  }
}

// numBlur(el, opts) — вызывается из onblur, применяет max-кламп
// (не делаем это при вводе, чтобы не мешать набирать "100" посимвольно)
function numBlur(el, opts) {
  opts = opts || {};
  var num = parseNum(el.value);
  if (opts.max != null && num > opts.max) {
    el.value = String(opts.max).replace('.', ',');
  }
}

// ── STATE ──────────────────────────────────────────────────
const LSC = '3dp_cfg_v3', LSR = '3dp_reg_v1';

// ── КОНФИГУРАЦИЯ ───────────────────────────────────────────
function defCfg() {
  const C = (typeof CONFIG !== 'undefined') ? CONFIG : {};
  const D = C.defaults || {};
  return {
    electricity:       D.electricity       ?? 7.08,
    operatorRate:      D.operatorRate      ?? 250,
    depreciationHours: D.depreciationHours ?? 1500,
    maintenance:       D.maintenance       ?? 5,
    defect:            D.defect            ?? 0,
    currency:          (C.brand && C.brand.currency) || '₽',
    dryers:   (C.dryers   && C.dryers.length)   ? C.dryers   : [
      {id: 'd1',     name: 'Без сушки',        kw: 0},
      {id: 'd3',     name: 'CRLTY PI',         kw: 0.145},
      {id: 'yiwqev', name: 'CRLTY PI PLUS',    kw: 0.16},
      {id: '08gv07', name: 'CRLTY PI PLUS х2', kw: 0.32},
      {id: 'jnlpbu', name: 'CRLTY PI X4',      kw: 0.36},
    ],
    printers: (C.printers && C.printers.length) ? C.printers : [
      {id: 'bambu',   name: 'Bambu A1C', cost: 37000, kw: 0.13, dryerId: 'jnlpbu', maintenance: 5},
      {id: 'ff_ad5m', name: 'FF AD5M',  cost: 24500, kw: 0.15, dryerId: 'd3',     maintenance: 5},
      {id: 'ff_ad5x', name: 'FF AD5X',  cost: 33000, kw: 0.20, dryerId: '08gv07', maintenance: 5},
    ],
    filaments: (C.filaments && C.filaments.length) ? C.filaments : [
      {id: 'petg',   name: 'PETG', pricePerKg: 900,  color: '#27ae60'},
      {id: 'pla',    name: 'PLA',  pricePerKg: 1000, color: '#2980b9'},
      {id: 'g0kzdf', name: 'TPU',  pricePerKg: 1100, color: '#8e44ad'},
    ],
    taxes:    (C.taxes    && C.taxes.length)    ? C.taxes    : [
      {id: 'none', name: 'Без налога',              rate: 0},
      {id: 'phys', name: 'Физ. лица (самозанятый)', rate: 4},
      {id: 'jur',  name: 'Юр. лица / ИП',           rate: 6},
    ],
  };
}

let cfg, reg;
try {
  const _c = JSON.parse(localStorage.getItem(LSC));
  cfg = (_c && typeof _c === 'object' && _c.electricity) ? _c : defCfg();
  // ── Миграция: plastics → filaments ──────────────────────────────────────
  if (cfg.plastics && !cfg.filaments) { cfg.filaments = cfg.plastics; delete cfg.plastics; }
  if (!cfg.filaments || !cfg.filaments.length) cfg.filaments = defCfg().filaments;
} catch { cfg = defCfg(); }
// ── Миграция: добавляем color к филаментам без цвета ────────
cfg.filaments.forEach(f => { if (!f.color) f.color = '#000000'; });
try {
  const _r = JSON.parse(localStorage.getItem(LSR));
  reg = Array.isArray(_r)
    ? _r.filter(x => x && x.id && x.name)
        .map(x => ({...x, id: String(x.id).replace(/[^a-z0-9_-]/gi, ''), name: String(x.name).slice(0, 200)}))
    : [];
  // ── Миграция: plasticId/plasticName → filamentId/filamentName в реестре ─
  reg.forEach(r => {
    if (r.plasticName && !r.filamentName) { r.filamentName = r.plasticName; delete r.plasticName; }
    if (r.params) {
      if (r.params.plasticId && !r.params.filamentId) { r.params.filamentId = r.params.plasticId; delete r.params.plasticId; }
    }
  });
} catch { reg = []; }
['maintenance', 'defect'].forEach(k => { if (cfg[k] === undefined) cfg[k] = k === 'maintenance' ? 5 : 0; });
if (!cfg.depreciationHours) cfg.depreciationHours = 1500;
// ── Миграция: maintenance переехал из глобального cfg в каждый принтер ────
cfg.printers.forEach(p => { if (p.maintenance === undefined) p.maintenance = cfg.defaults?.maintenance ?? cfg.maintenance ?? 5; });

function svC() { try { localStorage.setItem(LSC, JSON.stringify(cfg)); } catch(e) { console.warn('cfg save failed', e); } }
function svR() {
  try {
    const data = JSON.stringify(reg);
    if (data.length > STORAGE_WARN) {
      const b = document.getElementById('autosave-badge');
      if (b) { b.textContent = '⚠️ Реестр почти заполнен (' + Math.round(data.length / 1024) + 'KB из ~5MB)'; b.classList.add('show'); setTimeout(() => b.classList.remove('show'), 5000); }
    }
    localStorage.setItem(LSR, data);
  } catch(e) {
    // QuotaExceededError — тихий badge вместо alert (Safari iOS в приватном режиме)
    const b = document.getElementById('autosave-badge');
    if (b) { b.textContent = '⚠️ Хранилище переполнено — экспортируйте реестр'; b.classList.add('show'); setTimeout(() => b.classList.remove('show'), 6000); }
    else { console.warn('svR: storage quota exceeded', e); }
  }
}

let selP = 'retail_light', selT = 'none', comp = {}, pendRep = null;
let hoursCalcTableId = null; // id стола, для которого открыт калькулятор времени

// ── МУЛЬТИСТОЛИК ──────────────────────────────────────────────
// tables — массив столов. Каждый: {id, printerId, filamentId, grams, hours, drying}
let tables = [];

function tableDefaults() {
  const p = cfg.printers[0] || {};
  return {
    id: uid(),
    printerId: p.id || '',
    filaments: [{ id: uid(), filamentId: (cfg.filaments[0] || {}).id || '', grams: '90', color: (cfg.filaments[0] || {}).color || '#000000' }],
    hours: '6.6',
    drying: 'no',
    defect: (CONFIG?.defaults?.defect ?? 0),
  };
}

function addTable(data) {
  const t = data ? {...data} : tableDefaults();
  if (!t.id) t.id = uid();
  tables.push(t);
  renderTables();
  calc();
  checkAllFields();
}

function removeTable(id) {
  if (tables.length <= 1) return; // минимум 1 стол
  tables = tables.filter(t => t.id !== id);
  renderTables();
  calc();
  checkAllFields();
}

function renderTables() {
  const container = document.getElementById('tables-container');
  if (!container) return;
  container.innerHTML = tables.map((t, idx) => renderTableHTML(t, idx)).join('');
}

function renderTableHTML(t, idx) {
  const printerOpts = cfg.printers.map(p =>
    `<option value="${escH(p.id)}"${p.id === t.printerId ? ' selected' : ''}>${escH(p.name)}</option>`
  ).join('');
  function filamentOpts(f) {
    return cfg.filaments.map(p =>
      `<option value="${escH(p.id)}"${p.id === f.filamentId ? ' selected' : ''}>${escH(p.name)} — ${escH((_PALETTE.find(e=>e.c===p.color)||{n:p.color||'?'}).n)} — ${p.pricePerKg}\u00a0${cfg.currency || '₽'}/кг</option>`
    ).join('');
  }

  // Сушилка для этого стола
  const printer = cfg.printers.find(p => p.id === t.printerId) || cfg.printers[0];
  const dryer = printer ? cfg.dryers.find(d => d.id === printer.dryerId) : null;
  const dryerOpt = (dryer && dryer.kw > 0)
    ? `<option value="yes"${t.drying === 'yes' ? ' selected' : ''}>${escH(dryer.name)} (${dryer.kw} кВт)</option>`
    : '';

  const canDelete = tables.length > 1;
  const num = tables.length > 1
    ? `<span class="table-num table-card-num">Стол ${idx + 1}</span>`
    : `<span class="table-num table-card-num">Стол</span>`;

  // Иконки для полей карточки стола (Phosphor Icons, inline SVG)
  // Тип филамента — иконка катушки с филаментом
  const iconPlastic = `<svg width="15" height="15" style="display:inline;vertical-align:-2px;flex-shrink:0;margin-right:3px" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><ellipse cx="173" cy="128" rx="12.61" ry="31.52"/><ellipse cx="172" cy="128" rx="52" ry="96"/><path d="M120.19,52.05c-9.63-15.33-30.1-23.04-46.34-13.58-17.94,10.45-26.79,32.65-31.27,51.82-5.15,22.05-5.71,45.14-1.66,67.42,3.72,20.44,11.11,42.57,27.77,56.21,7.24,5.93,16.62,9.51,26.01,7.85,9.23-1.63,17.29-7.5,23.24-14.53,1.49-1.76,2.86-3.62,4.11-5.55"/><path d="M93.59,55.98c-15.91,0-28.81,32.25-28.81,72.02s12.9,72.02,28.81,72.02"/><path d="M95.75,55.98h38.51"/><path d="M93.52,200.02h40.74"/><path d="M122.23,55.98c-15.91,0-28.81,32.25-28.81,72.02s12.9,72.02,28.81,72.02"/></svg>`;
  // Принтер — иконка принтера (та же что в настройках)
  const iconPrinter = `<svg width="15" height="15" style="display:inline;vertical-align:-2px;flex-shrink:0;margin-right:3px" viewBox="32 48 192 160" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><line x1="40" y1="200" x2="216" y2="200"/><line x1="56" y1="56" x2="56" y2="200"/><line x1="200" y1="56" x2="200" y2="200"/><line x1="56" y1="88" x2="96" y2="88"/><line x1="160" y1="88" x2="200" y2="88"/><rect x="96" y="64" width="64" height="48" rx="6"/><polyline points="116 112 116 124 128 140 140 124 140 112"/><polyline points="128 140 128 160 80 160 80 180 176 180"/></svg>`;
  // Граммов филамента — иконка «пакет» (куб / коробка)
  const iconGrams = `<svg width="15" height="15" style="display:inline;vertical-align:-2px;flex-shrink:0;margin-right:3px" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><line x1="128" y1="40" x2="128" y2="216"/><line x1="104" y1="216" x2="152" y2="216"/><line x1="56" y1="88" x2="200" y2="56"/><path d="M24,168c0,17.67,20,24,32,24s32-6.33,32-24L56,88Z"/><path d="M168,136c0,17.67,20,24,32,24s32-6.33,32-24L200,56Z"/></svg>`;
  // Часов печати — иконка часов (та же что в модальном окне)
  const iconHours = `<svg width="15" height="15" style="display:inline;vertical-align:-2px;flex-shrink:0;margin-right:3px" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="128" cy="136" r="88"/><line x1="128" y1="136" x2="168" y2="96"/><line x1="104" y1="16" x2="152" y2="16"/></svg>`;
  // Сушка — иконка сушилки (та же что в настройках)
  const iconDryer = `<svg width="15" height="15" style="display:inline;vertical-align:-2px;flex-shrink:0;margin-right:3px" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M152,208v8a32,32,0,0,0,32,32h16"/><circle cx="168" cy="88" r="24"/><path d="M24,113.22V62.78a8,8,0,0,1,6.68-7.89L168,32a56,56,0,0,1,0,112L30.68,121.11A8,8,0,0,1,24,113.22Z"/><path d="M202.49,132.12l-32.36,71.19a8,8,0,0,1-7.28,4.69H144a8,8,0,0,1-8-8V138.67"/></svg>`;
  const iconDefect = `<svg width="15" height="15" style="display:inline;vertical-align:-2px;flex-shrink:0;margin-right:3px" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M104,208H40a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8H216a8,8,0,0,1,8,8V88l-48,16-16,40-40,16Z"/><path d="M137.73,208l7.94-23.8,39-15.58,15.58-39,23.8-7.94V200a8,8,0,0,1-8,8Z"/><path d="M32,168.69l54.34-54.35a8,8,0,0,1,11.32,0l39,39"/></svg>`

  const filaments = t.filaments || [];

  return `<div class="table-card" data-id="${escH(t.id)}">
  <div class="table-card-hdr">
    ${num}
    ${canDelete ? `<button class="table-del-btn" onclick="removeTable('${escH(t.id)}')" title="Удалить стол">×</button>` : ''}
  </div>

  <div class="g2">
    <div class="fld">
      <label>${iconPrinter}Принтер</label>
      <select onchange="onTableChange('${escH(t.id)}','printerId',this.value);refreshTableDryer('${escH(t.id)}')">${printerOpts}</select>
    </div>
    <div class="fld">
      <label>${iconHours}Часов печати
        <span class="hours-help" onclick="openHoursCalc('${escH(t.id)}')" title="Калькулятор времени">?</span>
      </label>
      <input type="number" value="${escH(t.hours)}" min="0.1" step="0.1"
        oninput="if(+this.value<0)this.value=0;onTableChange('${escH(t.id)}','hours',this.value);checkTableField(this,'warn-h-${escH(t.id)}')">
      <span id="warn-h-${escH(t.id)}" class="zero-warn" style="display:none">⚠ введите значение</span>
    </div>
  </div>

  ${filaments.map((f, fi) => {
    const filNum = filaments.length > 1
      ? `<span class="table-num">Филамент ${fi + 1}</span>`
      : `<span class="table-num">Филамент</span>`;
    return `<div class="filament-card">
    <div class="filament-card-hdr">
      ${filNum}
      ${filaments.length > 1 ? `<button class="table-del-btn" onclick="removeFilament('${escH(t.id)}',${fi})" title="Удалить филамент">×</button>` : ''}
    </div>
    <div class="g2">
      <div class="fld">
        <label>${iconPlastic}Тип филамента</label>
        <div class="fil-sel-wrap">
          <span id="fcs-${escH(t.id)}-${fi}" class="fil-sel-dot" style="background:${escH(cfg.filaments.find(p=>p.id===f.filamentId)?.color||'#000000')}"></span>
          <select class="fil-sel-inner" onchange="(function(v){var fp=App.cfg.filaments.find(function(p){return p.id===v;});var nc=fp?fp.color||'#000000':'#000000';var sw=document.getElementById('fcs-${escH(t.id)}-${fi}');if(sw)sw.style.background=nc;onFilamentChange('${escH(t.id)}',${fi},'filamentId',v);})(this.value)">${filamentOpts(f)}</select>
        </div>
      </div>
      <div class="fld">
        <label>${iconGrams}Граммов филамента</label>
        <input type="number" value="${escH(f.grams)}" min="1" step="1"
          oninput="numInput(this,{decimals:2});onFilamentChange('${escH(t.id)}',${fi},'grams',this.value);checkTableField(this,'warn-g-${escH(t.id)}-${fi}')">
        <span id="warn-g-${escH(t.id)}-${fi}" class="zero-warn" style="display:none">⚠ введите значение</span>
      </div>
    </div>
  </div>`;
  }).join('')}

  <button class="add-filament-btn" onclick="addTableFilament('${escH(t.id)}')">＋ Добавить филамент</button>

  <div class="g2" style="margin-top:10px">
    <div class="fld">
      <label>${iconDryer}Сушка филамента во время печати</label>
      <select id="dry-${escH(t.id)}" onchange="onTableChange('${escH(t.id)}','drying',this.value)">
        <option value="no">Нет</option>
        ${dryerOpt}
      </select>
    </div>
    <div class="fld">
      <label>${iconDefect}Ожидаемый брак (%)</label>
      <input type="number" value="${+t.defect || 0}" min="0" max="100" step="0.5" oninput="numInput(this,{decimals:1});onTableChange('${escH(t.id)}','defect',parseNum(this.value))" onblur="numBlur(this,{max:100});onTableChange('${escH(t.id)}','defect',parseNum(this.value))">
    </div>
  </div>
</div>`;
}

function onTableChange(id, field, value) {
  const t = tables.find(t => t.id === id);
  if (!t) return;
  t[field] = value;
  calc();
  triggerAutosave();
}

function addTableFilament(tableId) {
  const t = tables.find(t => t.id === tableId);
  if (!t) return;
  if (!t.filaments) t.filaments = [];
  t.filaments.push({ id: uid(), filamentId: (cfg.filaments[0] || {}).id || '', grams: '0', color: (cfg.filaments[0] || {}).color || '#000000' });
  renderTables();
  calc();
  checkAllFields();
  triggerAutosave();
}

function removeFilament(tableId, fi) {
  const t = tables.find(t => t.id === tableId);
  if (!t || !t.filaments || t.filaments.length <= 1) return;
  t.filaments.splice(fi, 1);
  renderTables();
  calc();
  checkAllFields();
  triggerAutosave();
}

function onFilamentChange(tableId, fi, field, value) {
  const t = tables.find(t => t.id === tableId);
  if (!t || !t.filaments || !t.filaments[fi]) return;
  t.filaments[fi][field] = value;
  // При смене типа — автоматически подтягиваем цвет из настроек
  if (field === 'filamentId') {
    var fp = cfg.filaments.find(function(p){ return p.id === value; });
    if (fp) t.filaments[fi].color = fp.color || '#000000';
  }
  calc();
  triggerAutosave();
}

function refreshTableDryer(id) {
  const t = tables.find(t => t.id === id);
  if (!t) return;
  const printer = cfg.printers.find(p => p.id === t.printerId) || cfg.printers[0];
  const dryer = printer ? cfg.dryers.find(d => d.id === printer.dryerId) : null;
  const sel = document.getElementById('dry-' + id);
  if (!sel) return;
  sel.innerHTML = '<option value="no">Нет</option>';
  if (dryer && dryer.kw > 0) {
    const opt = document.createElement('option');
    opt.value = 'yes';
    opt.textContent = dryer.name + ' (' + dryer.kw + ' кВт)';
    sel.appendChild(opt);
  }
  t.drying = 'no';
  sel.value = 'no';
}

function checkTableField(input, warnId) {
  const w = document.getElementById(warnId);
  if (!w) return;
  const v = input.value;
  const n = +v;
  if (v === '' || v === null || v === undefined) {
    w.textContent = '⚠ введите значение';
    w.style.display = 'block';
  } else if (n <= 0) {
    w.textContent = '⚠';
    w.style.display = 'block';
  } else {
    w.style.display = 'none';
  }
}

const App = {
  get cfg() { return cfg; },
  set cfg(v) { cfg = v; },
  get reg() { return reg; },
  set reg(v) { reg = v; },
  LSC, LSR,
  get uid() { return uid; },
  get fmt() { return fmt; },
};

const fmt = n => new Intl.NumberFormat('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n) + '\u00a0' + (cfg.currency || '₽');
const uid = () => Math.random().toString(36).slice(2, 8);
// Генерирует читаемый ID из названия, дедуплицирует цифрой
// name      — исходная строка (название объекта)
// existingIds — массив уже занятых id
// extra     — доп. строка (напр. цвет), добавляется через '_' если base не уникален
function slugId(name, existingIds, extra) {
  // Транслит кириллицы → латиница
  const tr = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',
    к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',
    ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
  const slug = s => String(s).toLowerCase()
    .split('').map(c => tr[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 16) || 'item';
  const ids = existingIds || [];
  let base = slug(name);
  // Если base не уникален и есть extra — пробуем base + '_' + extra
  if (ids.includes(base) && extra) {
    const withExtra = (base + '_' + slug(extra)).slice(0, 18);
    if (!ids.includes(withExtra)) return withExtra;
  }
  // Дедупликация цифрой
  if (!ids.includes(base)) return base;
  let n = 2;
  while (ids.includes(base + n)) n++;
  return base + n;
}
const gv = id => { const e = document.getElementById(id); return e ? e.value : ''; };
const sv = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };

// ── UI: DRAWERS / MODALS ───────────────────────────────────
// При blur на поле названия — обновляем id объекта и перебиваем ссылки
// type: 'filament' | 'printer' | 'dryer' | 'tax'
function renameItemId(type, oldId, newName) {
  if (type === 'dryer' && oldId === 'd1') return;
  if (type === 'tax' && oldId === 'none') return;
  const existingIds = {
    filament: cfg.filaments.map(f => f.id),
    printer:  cfg.printers.map(p => p.id),
    dryer:    cfg.dryers.map(d => d.id),
    tax:      cfg.taxes.map(t => t.id),
  }[type] || [];
  // Новый id из нового названия (исключаем сам объект из списка занятых)
  const withoutSelf = existingIds.filter(id => id !== oldId);
  const extra = type === 'filament' ? (cfg.filaments.find(f => f.id === oldId)?.color || '').replace('#','') : undefined;
  const newId = slugId(newName, withoutSelf, extra);
  if (newId === oldId) return; // id не изменился — ничего не делаем
  // Обновляем сам объект
  if (type === 'filament') {
    const f = cfg.filaments.find(f => f.id === oldId); if (f) f.id = newId;
    // Обновляем ссылки в tables
    tables.forEach(t => (t.filaments || []).forEach(tf => { if (tf.filamentId === oldId) tf.filamentId = newId; }));
    // Обновляем ссылки в reg.params.tables
    reg.forEach(r => (r.params?.tables || []).forEach(t => (t.filaments || []).forEach(tf => { if (tf.filamentId === oldId) tf.filamentId = newId; })));
    renderTables(); renderFilaments();
  } else if (type === 'printer') {
    const p = cfg.printers.find(p => p.id === oldId); if (p) p.id = newId;
    // Обновляем ссылки в tables
    tables.forEach(t => { if (t.printerId === oldId) t.printerId = newId; });
    // Обновляем ссылки в reg.params.tables
    reg.forEach(r => (r.params?.tables || []).forEach(t => { if (t.printerId === oldId) t.printerId = newId; }));
    renderTables(); renderPrinters();
  } else if (type === 'dryer') {
    const d = cfg.dryers.find(d => d.id === oldId); if (d) d.id = newId;
    // Обновляем ссылки в принтерах
    cfg.printers.forEach(p => { if (p.dryerId === oldId) p.dryerId = newId; });
    renderDryers(); renderPrinters();
  } else if (type === 'tax') {
    const t = cfg.taxes.find(t => t.id === oldId); if (t) t.id = newId;
    // selT — если выбранный налог совпадает
    if (selT === oldId) selT = newId;
    renderTaxes(); renderTaxOps();
  }
  svC(); svR();
}

function openS() { syncS(); tog('dr-s', 'ov-s', true); }
function closeS() { tog('dr-s', 'ov-s', false); }
function openR() { renderReg(); tog('dr-r', 'ov-r', true); }
function closeR() { tog('dr-r', 'ov-r', false); }
function tog(d, o, on) { document.getElementById(d).classList.toggle('open', on); document.getElementById(o).classList.toggle('open', on); }
function openM(id) { document.getElementById(id).classList.add('open'); }
function closeM(id) { document.getElementById(id).classList.remove('open'); }

// ── КАЛЬКУЛЯТОР ────────────────────────────────────────────
function checkField(id, warnId, opts) {
  const el = document.getElementById(id);
  const w = document.getElementById(warnId);
  if (!el || !w) return;
  const v = el.value;
  const n = +v;
  if (v === '' || v === null) {
    w.textContent = '⚠ введите значение'; w.style.display = 'block';
  } else if (n <= 0) {
    w.textContent = '⚠'; w.style.display = 'block';
  } else if (opts && opts.int && !Number.isInteger(n)) {
    w.textContent = '⚠'; w.style.display = 'block';
  } else {
    w.style.display = 'none';
  }
  if (id === 'qty') {
    const qhEl = document.getElementById('qhint');
    if (qhEl) {
      // Красный, если пусто, либо ≤ 0, либо не целое > 0.
      // Не трогаем в остальных случаях (calc() сам выставит правильный цвет).
      if (v === '' || n <= 0 || (n > 0 && !Number.isInteger(n))) {
        qhEl.style.color = 'var(--red)';
      } else {
        qhEl.style.color = '';
      }
    }
  }
}
function checkAllFields() {
  // qty — глобальное поле, проверяем как раньше
  checkField('qty', 'warn-qty', {int: true});
  // hours и grams (per-filament) внутри карточек столов — проверяем все
  tables.forEach(t => {
    const hInput = document.querySelector(`.table-card[data-id="${t.id}"] input[oninput*="hours"]`);
    if (hInput) checkTableField(hInput, 'warn-h-' + t.id);
    (t.filaments || []).forEach((f, fi) => {
      const warnId = 'warn-g-' + t.id + '-' + fi;
      const warnEl = document.getElementById(warnId);
      if (!warnEl) return;
      // Находим input по соседству со span варнинга
      const gInput = warnEl.previousElementSibling;
      if (gInput && gInput.tagName === 'INPUT') checkTableField(gInput, warnId);
    });
  });
}

function calcHours() {
  const d = +gv('hc-d') || 0, h = +gv('hc-h') || 0, m = +gv('hc-m') || 0;
  const total = d * 24 + h + m / 60;
  document.getElementById('hc-val').textContent = total > 0 ? total.toFixed(2) : '0';
}
function openHoursCalc(tableId) {
  hoursCalcTableId = tableId;
  // Сбросить поля
  sv('hc-d', ''); sv('hc-h', ''); sv('hc-m', '');
  document.getElementById('hc-val').textContent = '0';
  // Показать подпись для какого стола (если столов > 1)
  const labelEl = document.getElementById('hc-table-label');
  if (labelEl) {
    if (tables.length > 1) {
      const idx = tables.findIndex(t => t.id === tableId);
      labelEl.textContent = 'для Стол ' + (idx + 1);
      labelEl.style.display = 'block';
    } else {
      labelEl.style.display = 'none';
    }
  }
  openM('mo-hours');
}
window.openHoursCalc = openHoursCalc;
function copyHours() {
  const v = document.getElementById('hc-val').textContent;
  if (hoursCalcTableId) {
    onTableChange(hoursCalcTableId, 'hours', v);
    // Обновить input в DOM
    const hInput = document.querySelector(`.table-card[data-id="${hoursCalcTableId}"] input[oninput*="hours"]`);
    if (hInput) {
      hInput.value = v;
      checkTableField(hInput, 'warn-h-' + hoursCalcTableId);
    }
  } else {
    // fallback: если tableId не задан — вставляем в первый стол
    if (tables.length > 0) {
      const t = tables[0];
      onTableChange(t.id, 'hours', v);
    }
  }
  // checkField('hours', 'warn-hours'); // удалено: hours теперь внутри карточек столов
  const c = document.getElementById('hc-copied'); c.classList.add('show');
  setTimeout(() => c.classList.remove('show'), 1500);
  closeM('mo-hours');
}

// ── WAGE CALC ──────────────────────────────────────────────
function updateWageCalc() {
  const rate = +document.getElementById('s_op').value || 0;
  const monthly = rate * 22 * 8;
  const el = document.getElementById('wage-calc');
  el.textContent = rate > 0 ? `22 дня × 8 ч = ${new Intl.NumberFormat('ru-RU').format(monthly)}\u00a0${cfg.currency || '₽'}/мес` : '';
}

// ── СОХРАНЕНИЕ РАСЧЁТОВ ─────────────────────────────────────
function openSaveMo() {
  const orderName = gv('order-name').trim();
  sv('proj-name', orderName);
  document.getElementById('dup-warn').style.display = 'none';
  const btn = document.getElementById('mo-save-btn');
  btn.textContent = 'Сохранить';
  btn.onclick = confirmSave;
  openM('mo-save');
  setTimeout(() => document.getElementById('proj-name').focus(), 100);
}
document.getElementById('proj-name').addEventListener('input', function() {
  const name = this.value.trim(), dup = reg.find(r => r.name === name), w = document.getElementById('dup-warn');
  if (dup && name) { w.style.display = 'block'; w.textContent = `Расчёт "${name}" уже существует — при сохранении будет заменён.`; document.getElementById('mo-save-btn').textContent = 'Заменить'; }
  else { w.style.display = 'none'; document.getElementById('mo-save-btn').textContent = 'Сохранить'; }
});
function confirmSave() {
  const name = document.getElementById('proj-name').value.trim() || 'Без названия';
  if (reg.find(r => r.name === name)) { pendRep = name; document.getElementById('replace-txt').textContent = `Расчёт "${name}" уже есть. Заменить?`; closeM('mo-save'); openM('mo-replace'); return; }
  doSave(name);
}
function confirmReplace() {
  if (pendRep) {
    doSave(pendRep, true);
    if (window._pendingDownload) {
      exportOne(reg.find(r => r.name === pendRep)?.id);
      window._pendingDownload = false;
    }
    pendRep = null;
  }
  closeM('mo-replace');
}
function doSave(name, replace = false) {
  // Синхронизируем #order-name с именем расчёта из модалки
  const onEl = document.getElementById('order-name');
  if (onEl && name && name !== 'Без названия') onEl.value = name;
  const snap = buildSnap(name);
  if (replace) { const i = reg.findIndex(r => r.name === name); if (i >= 0) reg[i] = snap; }
  else reg.unshift(snap);
  svR(); closeM('mo-save');
}
function buildSnap(name) {
  const t0 = tables[0] || {};
  // Принтеры: уникальные имена по всем столам (для сортировки — первый стол первый)
  const printerNames = [];
  tables.forEach(t => {
    const pr = cfg.printers.find(p => p.id === t.printerId) || {};
    const n = pr.name || '—';
    if (!printerNames.includes(n)) printerNames.push(n);
  });
  const printerName = printerNames.join(', ') || '—';
  // Первый принтер отдельно для сортировки по принтеру
  const pr0 = cfg.printers.find(p => p.id === t0.printerId) || cfg.printers[0] || {};
  // Филаменты: уникальные имена по всем столам
  const filamentNames = [];
  tables.forEach(t => {
    (t.filaments || []).forEach(f => {
      const n = (cfg.filaments.find(p => p.id === f.filamentId) || {}).name || '—';
      if (!filamentNames.includes(n)) filamentNames.push(n);
    });
  });
  const filamentName = filamentNames.join(', ') || '—';
  // Суммарные граммы и часы по всем столам
  const gramsTotal = tables.reduce((s, t) =>
    s + (t.filaments || []).reduce((fs, f) => fs + (parseFloat(f.grams) || 0), 0), 0);
  const hoursTotal = tables.reduce((s, t) => s + (parseFloat(t.hours) || 0), 0);
  const t0filaments = t0.filaments || [];
  return {
    id: uid(), name, date: new Date().toLocaleDateString('ru-RU'),
    printerName,
    printerName0: pr0.name || '—',
    filamentName,
    hours: String(hoursTotal),
    grams: String(gramsTotal),
    cost1: comp.cost1 ?? null,
    orderName: gv('order-name').trim(),
    params: {
      tables: JSON.parse(JSON.stringify(tables)),
      qty: gv('qty'),
      extraFixed: gv('extraFixed'), extraParts: gv('extraParts'), packaging: gv('packaging'),
      prepTime: gv('prepTime'), postTime: gv('postTime'), logTime: gv('logTime'),
      commission: gv('commission'), commFixed: gv('commFixed'),
      customPrice: gv('custom-price'), selP, selT,
      // legacy-совместимость для старых снапов
      filamentId: (t0filaments[0] || {}).filamentId || t0.filamentId,
      printerId: t0.printerId,
      grams: String(gramsTotal), hours: String(hoursTotal), drying: t0.drying,
    }
  };
}

// ── РЕЕСТР ──────────────────────────────────────────────────
function renderReg() {
  const q = document.getElementById('reg-q').value.trim().toLowerCase();
  const base = q ? reg.filter(r => r.name.toLowerCase().includes(q) || (r.orderName || '').toLowerCase().includes(q) || r.date.includes(q) || (r.printerName || '').toLowerCase().includes(q)) : reg;
  const list = sortedReg(base);
  const el = document.getElementById('reg-list');
  if (!list.length) { el.innerHTML = `<div class="reg-empty">${q ? 'Ничего не найдено' : 'Нет сохранённых расчётов'}</div>`; return; }
  el.innerHTML = list.map(r => `
    <div class="ri">
      <button class="ri-load" title="Загрузить в калькулятор" onclick="loadSnap('${r.id}')"><svg width="15" height="15" style="display:inline;vertical-align:-2px;flex-shrink:0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><line x1="128" y1="144" x2="128" y2="32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><polyline points="216 144 216 208 40 208 40 144" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><polyline points="88 72 128 32 168 72" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/></svg></button>
      <div class="ri-info">
        <div class="ri-title">${escH(r.orderName || r.name)}</div>
        <div class="ri-meta"><span class="ri-seg">${escH(r.date)}</span>${r.cost1 ? '<span class="ri-sep"> · </span><span class="ri-seg">' + fmt(r.cost1) + '/шт</span>' : ''}</div>
        <div class="ri-meta" style="margin-top:1px"><span class="ri-seg">${escH(String(r.hours))} ч</span><span class="ri-sep"> · </span><span class="ri-seg">${escH(r.printerName)}</span></div>
        <div class="ri-sub"><span class="ri-seg">${escH(String(r.grams))} г</span><span class="ri-sep"> · </span><span class="ri-seg">${escH(r.filamentName)}</span></div>
      </div>
      <div class="ri-btns">
        <button class="ri-edit" title="Переименовать" onclick="startRename('${r.id}')"><svg width="15" height="15" style="display:inline;vertical-align:-2px;flex-shrink:0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="M92.69,216H48a8,8,0,0,1-8-8V163.31a8,8,0,0,1,2.34-5.65L165.66,34.34a8,8,0,0,1,11.31,0L221.66,79a8,8,0,0,1,0,11.31L98.34,213.66A8,8,0,0,1,92.69,216Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="136" y1="64" x2="192" y2="120" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="164" y1="92" x2="68" y2="188" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="95.49" y1="215.49" x2="40.51" y2="160.51" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/></svg></button>
        <button class="ri-xls" title="Экспорт в Excel" onclick="exportOne('${r.id}')"><svg width="15" height="15" style="display:inline;vertical-align:-2px;flex-shrink:0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><line x1="152" y1="96" x2="208" y2="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="152" y1="160" x2="208" y2="160" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><path d="M64,72V40a8,8,0,0,1,8-8H200a8,8,0,0,1,8,8V216a8,8,0,0,1-8,8H72a8,8,0,0,1-8-8V184" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="136" y1="184" x2="136" y2="224" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="136" y1="32" x2="136" y2="72" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><rect x="32" y="72" width="120" height="112" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="72" y1="104" x2="112" y2="152" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="112" y1="104" x2="72" y2="152" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/></svg></button>
        <button class="ri-del" title="Удалить" onclick="confirmDelSnap('${r.id}','${escH(r.name)}')"><svg width="15" height="15" style="display:inline;vertical-align:-2px;flex-shrink:0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><line x1="216" y1="56" x2="40" y2="56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="104" y1="104" x2="104" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="152" y1="104" x2="152" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><path d="M200,56V208a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><path d="M168,56V40a16,16,0,0,0-16-16H104A16,16,0,0,0,88,40V56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/></svg></button>
      </div>
    </div>`).join('');
}
function loadSnap(id) {
  const r = reg.find(x => x.id === id); if (!r) { console.warn('loadSnap: id not found', id); return; }
  const p = r.params || r;
  if (!p) { console.warn('loadSnap: no params in record', r); return; }

  // Восстанавливаем столи (новый формат) или создаём один из legacy-данных
  tables = [];
  if (Array.isArray(p.tables) && p.tables.length > 0) {
    p.tables.forEach(t => tables.push({...t, id: t.id || uid()}));
    // Обратная совместимость: старые снапы без поля defect
    tables.forEach(t => { if (t.defect === undefined) t.defect = cfg.defaults?.defect ?? 0; });
    // Обратная совместимость: старые снапы без filaments (plasticId + grams → filaments[])
    tables.forEach(t => {
      if (!t.filaments && t.plasticId) {
        t.filaments = [{ id: uid(), filamentId: t.plasticId, grams: t.grams || '0' }];
      } else if (!t.filaments && t.filamentId) {
        t.filaments = [{ id: uid(), filamentId: t.filamentId, grams: t.grams || '0' }];
      } else if (!t.filaments) {
        t.filaments = [{ id: uid(), filamentId: (cfg.filaments[0] || {}).id || '', grams: t.grams || '90' }];
      }
    });
    // Миграция color в филаментах снапа
    tables.forEach(t => {
      (t.filaments || []).forEach(f => {
        if (!f.color) f.color = cfg.filaments.find(p => p.id === f.filamentId)?.color || '#000000';
      });
    });
  } else {
    // legacy: один стол из старого снапа
    tables.push({
      id: uid(),
      printerId: p.printerId || (cfg.printers[0] || {}).id || '',
      filamentId: p.filamentId || (cfg.filaments[0] || {}).id || '',
      grams: p.grams || '90',
      hours: p.hours || '6.6',
      drying: p.drying || 'no',
    });
  }
  renderTables();

  // Восстанавливаем название заказа (после renderTables — DOM уже готов)
  const onVal = r.orderName || p.orderName || '';
  const onEl = document.getElementById('order-name');
  if (onEl) onEl.value = onVal;
  sv('order-name', onVal);

  sv('qty', p.qty || '');
  sv('extraFixed', p.extraFixed || ''); sv('extraParts', p.extraParts || ''); sv('packaging', p.packaging || '');
  sv('prepTime', p.prepTime || ''); sv('postTime', p.postTime || ''); sv('logTime', p.logTime || p.logisticsTime || '');
  sv('commission', p.commission || ''); sv('commFixed', p.commFixed || p.commissionFixed || '');
  sv('custom-price', p.customPrice || '');
  selP = p.selP || p.selectedPrice || 'retail_light'; selT = p.selT || p.selectedTax || 'none';
  Object.keys(PCS).forEach(k => { const e = document.getElementById(PCS[k].id); if (e) e.classList.toggle('sel', k === selP); });
  renderTaxOps(); calc(); checkAllFields();
  const b = document.getElementById('autosave-badge');
  if (b) { b.textContent = '✓ Расчёт загружен'; b.classList.add('show'); setTimeout(() => { b.classList.remove('show'); b.textContent = '✓ Автосохранено'; }, 2000); }
  closeR();
}
function delSnap(id) { reg = reg.filter(x => x.id !== id); svR(); renderReg(); }

// ── ЭКСПОРТ / ИМПОРТ ────────────────────────────────────────
function snapToRows(r) {
  const p = r.params || {};
  // Хелперы: резолвим ID → объект и поля
  const prName  = id => (cfg.printers.find(x => x.id === id) || {}).name || id || '—';
  const filObj  = id => cfg.filaments.find(x => x.id === id) || null;
  const filLabel = id => {
    const f = filObj(id);
    if (!f) return id || '—';
    const colorName = (typeof _PALETTE !== 'undefined' ? (_PALETTE.find(e => e.c === f.color) || {}).n : null) || f.color || '';
    return [f.name, colorName, f.pricePerKg ? f.pricePerKg + '\u00a0' + (cfg.currency || '₽') + '/кг' : ''].filter(Boolean).join(' — ');
  };
  const cur = cfg.currency || '₽';
  const rows = [
    ['Название расчёта', r.name],
    ['Дата', r.date],
    [`Себестоимость 1 шт, ${cur}`, r.cost1 != null ? +r.cost1.toFixed(2) : ''],
    ['— ОБЩИЕ ПАРАМЕТРЫ —', ''],
    ['Количество штук', +(p.qty || 0)],
    ['Время подготовки (мин)', +(p.prepTime || 0)],
    ['Время постобработки (мин)', +(p.postTime || 0)],
    ['Время упаковки/лог. (мин)', +(p.logTime || 0)],
    [`Доп. затраты фикс. (${cur})`, +(p.extraFixed || 0)],
    [`Доп. детали на 1 шт (${cur})`, +(p.extraParts || 0)],
    [`Упаковка на 1 шт (${cur})`, +(p.packaging || 0)],
    ['Комиссия площадки %', +(p.commission || 0)],
    [`Фикс. комиссия (${cur})`, +(p.commFixed || 0)],
    ['Своя цена', +(p.customPrice || 0)],
    ['Выбранная цена продажи', p.selP || 'retail_light'],
    ['Выбранный налог', p.selT || 'none'],
  ];
  // Столы
  const tables = p.tables || [];
  if (tables.length > 0) {
    tables.forEach((t, ti) => {
      const tLabel = tables.length > 1 ? `— СТОЛ ${ti + 1} —` : '— СТОЛ —';
      rows.push([tLabel, '']);
      rows.push(['Принтер', prName(t.printerId)]);
      rows.push(['Часов печати', +(t.hours || 0)]);
      rows.push(['Сушка', t.drying === 'yes' ? 'Да' : 'Нет']);
      rows.push(['Брак (%)', +(t.defect || 0)]);
      const fils = t.filaments || [];
      if (fils.length > 0) {
        fils.forEach((f, fi) => {
          const fLabel = fils.length > 1 ? `Филамент ${fi + 1}` : 'Филамент';
          rows.push([fLabel, filLabel(f.filamentId)]);
          rows.push([`${fLabel} id`, f.filamentId || '—']);
          rows.push([`${fLabel} граммов`, +(f.grams || 0)]);
        });
      }
    });
  } else {
    // legacy
    rows.push(['— СТОЛ —', '']);
    rows.push(['Принтер', r.printerName || '—']);
    rows.push(['Филамент', r.filamentName || '—']);
    rows.push(['Часов печати', +(r.hours || 0)]);
    rows.push(['Граммов филамента', +(r.grams || 0)]);
  }
  return rows;
}
// ── XLSX EXPORT (ExcelJS) ───────────────────────────────────
// Общая функция стилизации листа с двумя колонками (Параметр / Значение)
function _exjsSnapSheet(ws, dataRows) {
  const BLUE  = 'FF0052DB', WHITE = 'FFFFFFFF', DARK  = 'FF0A0A0A';
  const GREY  = 'FF525252', BGALT = 'FFF2F6FF', BGROW = 'FFF8F8F8', BORDER = 'FFD0D8E8';
  const thin  = s => ({ style: 'thin', color: { argb: BORDER } });
  const thinBorder = { top: thin(), bottom: thin(), left: thin(), right: thin() };

  ws.columns = [{ width: 32 }, { width: 28 }];

  dataRows.forEach((row, ri) => {
    const isHeader  = ri === 0;
    const isSection = !isHeader && typeof row[0] === 'string' && row[0].startsWith('—');
    const isAlt     = !isHeader && !isSection && ri % 2 === 0;

    const fgColor = isHeader  ? { argb: BLUE  }
                  : isSection ? { argb: BGALT }
                  : isAlt     ? { argb: BGROW }
                  : { argb: WHITE };

    const wsRow = ws.getRow(ri + 1);
    wsRow.height = isHeader ? 24 : isSection ? 20 : 18;

    const cA = wsRow.getCell(1);
    const cB = wsRow.getCell(2);
    cA.value = row[0] ?? '';
    cB.value = row[1] ?? '';

    [cA, cB].forEach((c, ci) => {
      c.fill   = { type: 'pattern', pattern: 'solid', fgColor };
      c.border = thinBorder;
      c.font   = {
        name: 'Calibri',
        size: isHeader ? 11 : 10,
        bold: isHeader || isSection,
        color: { argb: isHeader ? WHITE : isSection ? GREY : DARK },
      };
      c.alignment = {
        vertical: 'middle',
        horizontal: ci === 1 && !isHeader && !isSection && typeof row[1] === 'number' ? 'right' : 'left',
        indent: 1,
      };
    });
    // Числовой формат для себестоимости и числовых строк
    if (!isHeader && !isSection && typeof row[1] === 'number') {
      const label = String(row[0] || '');
      if (label.includes('₽') || label.includes('$') || label.includes('€') || label.includes('₸') || label.includes('¥') || label.includes('комисс') || label.includes('цена') || label.includes('Своя')) {
        cB.numFmt = '#,##0.00';
      }
    }
  });
}

function exportOne(id) {
  if (typeof ExcelJS === 'undefined') { alert('ExcelJS не загружен'); return; }
  const r = reg.find(x => x.id === id); if (!r) return;
  const dataRows = [['Параметр', 'Значение'], ...snapToRows(r)];
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Расчёт');
  _exjsSnapSheet(ws, dataRows);
  const safeN = (r.orderName || r.name).replace(/[\s\/\\:*?"<>|]+/g, '_').slice(0, 40);
  wb.xlsx.writeBuffer().then(buf => {
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `3dprint_${safeN}.xlsx`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

function exportAllXlsx() {
  if (!reg.length) { alert('Реестр пуст'); return; }
  if (typeof ExcelJS === 'undefined') { alert('ExcelJS не загружен'); return; }
  const wb = new ExcelJS.Workbook();

  // ── Лист «Реестр» — сводная таблица ─────────────────────────
  const ws1 = wb.addWorksheet('Реестр');
  const BLUE='FF0052DB', WHITE='FFFFFFFF', DARK='FF0A0A0A', BGROW='FFF8F8F8', BORDER='FFD0D8E8';
  const thin = { style:'thin', color:{argb:BORDER} };
  const thinBorder = { top:thin, bottom:thin, left:thin, right:thin };

  const regCols = [
    { header:'Название расчёта', key:'orderName', width:30 },
    { header:'Расчёт',         key:'name',      width:24 },
    { header:'Дата',           key:'date',      width:12 },
    { header:'Принтер',        key:'printer',   width:22 },
    { header:'Филамент',       key:'filament',  width:22 },
    { header:'Часов',          key:'hours',     width: 9 },
    { header:'Граммов',        key:'grams',     width:10 },
    { header:`Себест. 1 шт, ${cfg.currency || '₽'}`, key:'cost1',   width:18 },
  ];
  ws1.columns = regCols.map(c => ({ header: c.header, width: c.width }));

  // Заголовок
  const hdrRow = ws1.getRow(1);
  hdrRow.height = 24;
  regCols.forEach((col, ci) => {
    const c = hdrRow.getCell(ci + 1);
    c.value  = col.header;
    c.font   = { name:'Calibri', size:11, bold:true, color:{argb:WHITE} };
    c.fill   = { type:'pattern', pattern:'solid', fgColor:{argb:BLUE} };
    c.border = thinBorder;
    c.alignment = { vertical:'middle', horizontal: ci >= 5 ? 'right' : 'left', indent:1 };
  });

  // Строки данных
  reg.forEach((r, ri) => {
    const isAlt = ri % 2 === 0;
    const wsRow = ws1.getRow(ri + 2);
    wsRow.height = 18;
    const vals = [
      r.orderName || r.name,
      r.name,
      r.date,
      r.printerName,
      r.filamentName,
      parseFloat(r.hours) || 0,
      parseFloat(r.grams) || 0,
      r.cost1 != null ? +r.cost1.toFixed(2) : '',
    ];
    vals.forEach((val, ci) => {
      const c = wsRow.getCell(ci + 1);
      c.value  = val;
      c.font   = { name:'Calibri', size:10, color:{argb:DARK} };
      c.fill   = { type:'pattern', pattern:'solid', fgColor:{argb: isAlt ? BGROW : WHITE} };
      c.border = thinBorder;
      c.alignment = { vertical:'middle', horizontal: ci >= 5 ? 'right' : 'left', indent:1 };
      if (ci === 7 && val !== '') c.numFmt = '#,##0.00';
    });
  });

  // ── Листы по каждому расчёту ──────────────────────────────────
  reg.forEach(r => {
    const dataRows = [['Параметр', 'Значение'], ...snapToRows(r)];
    let sname = (r.orderName || r.name || '').slice(0, 25).replace(/[\[\]\*\/\\?:]/g, '') || r.id.slice(0, 8) || 'Sheet';
    { const o = sname; let n = 2; while (wb.worksheets.some(w => w.name === sname)) { sname = o.slice(0, 22) + ' ' + n++; } }
    const ws = wb.addWorksheet(sname);
    _exjsSnapSheet(ws, dataRows);
  });

  wb.xlsx.writeBuffer().then(buf => {
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '3dprint_registry.xlsx';
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
    URL.revokeObjectURL(a.href);
  });
}
function exportAllJson() {
  const blob = new Blob([JSON.stringify({cfg, reg}, null, 2)], {type: 'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '3dprint_backup.json';
  a.target = '_blank'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// ── DATE HELPERS ────────────────────────────────────────────
function xlsxDateToStr(val) {
  if (!val) return new Date().toLocaleDateString('ru-RU');
  if (typeof val === 'string') { const d = new Date(val); if (!isNaN(d)) return d.toLocaleDateString('ru-RU'); return val; }
  if (typeof val === 'number') { const d = new Date(Math.round((val - 25569) * 86400 * 1000)); if (!isNaN(d)) return d.toLocaleDateString('ru-RU'); }
  if (val instanceof Date && !isNaN(val)) return val.toLocaleDateString('ru-RU');
  return new Date().toLocaleDateString('ru-RU');
}

// ── IMPORT XLSX TO REGISTRY ────────────────────────────────
function importRegXlsx() { document.getElementById('import-reg-file').click(); }

function sheetToSnap(ws, fallbackName) {
  const rows = XLSX.utils.sheet_to_json(ws, {header: 1});
  const map = {};
  rows.slice(1).forEach(r => { if (r[0] && r[1] !== undefined) map[String(r[0])] = r[1]; });

  // Поддержка нового формата (Название расчёта) и старого (Название)
  const nameRaw = map['Название расчёта'] || map['Название'] || fallbackName || 'Без названия';
  if (!nameRaw && !map['Часов печати']) return null;
  const name = String(nameRaw);
  const dup  = reg.find(r => r.name === name);

  // ── Восстанавливаем столы из новой структуры ──────────────
  // Ищем секции «— СТОЛ N —» или «— СТОЛ —» в строках
  const tableMap = {};   // ti → { printerId, hours, drying, defect, filaments[] }
  let curTable = null;
  let multiTable = false;

  rows.slice(1).forEach(r => {
    const key = String(r[0] || '').trim();
    const val = r[1];
    // Секция стола
    const mTable = key.match(/^—\s*СТОЛ\s*(\d+)?\s*—$/);
    if (mTable) {
      const ti = mTable[1] ? parseInt(mTable[1]) - 1 : 0;
      if (mTable[1]) multiTable = true;
      if (!tableMap[ti]) tableMap[ti] = { printerId: '', hours: '0', drying: 'no', defect: 0, filaments: [] };
      curTable = tableMap[ti];
      return;
    }
    if (!curTable) return;
    if (key === 'Принтер') {
      // Резолвим имя принтера → id
      const pr = cfg.printers.find(p => p.name === String(val)) || cfg.printers[0] || {};
      curTable.printerId = pr.id || '';
    } else if (key === 'Часов печати') {
      curTable.hours = String(val || 0);
    } else if (key === 'Сушка') {
      curTable.drying = val === 'Да' ? 'yes' : 'no';
    } else if (key === 'Брак (%)') {
      curTable.defect = +(val || 0);
    } else {
      // Филамент N id  →  filamentId
      const mFilId = key.match(/^Филамент\s*(\d+)?\s*id$/i);
      if (mFilId) {
        const fi = mFilId[1] ? parseInt(mFilId[1]) - 1 : 0;
        if (!curTable.filaments[fi]) curTable.filaments[fi] = { id: uid(), filamentId: '', grams: '0' };
        curTable.filaments[fi].filamentId = String(val || '');
        // Подтягиваем цвет из cfg
        const fp = cfg.filaments.find(f => f.id === String(val || ''));
        if (fp) curTable.filaments[fi].color = fp.color || '#000000';
        return;
      }
      // Филамент N граммов
      const mFilG = key.match(/^Филамент\s*(\d+)?\s*граммов$/i);
      if (mFilG) {
        const fi = mFilG[1] ? parseInt(mFilG[1]) - 1 : 0;
        if (!curTable.filaments[fi]) curTable.filaments[fi] = { id: uid(), filamentId: '', grams: '0' };
        curTable.filaments[fi].grams = String(val || 0);
      }
    }
  });

  // Строим массив столов
  const tableKeys = Object.keys(tableMap).map(Number).sort((a,b) => a-b);
  let tablesArr = tableKeys.map(ti => {
    const t = tableMap[ti];
    if (!t.filaments.length) t.filaments = [{ id: uid(), filamentId: (cfg.filaments[0]||{}).id||'', grams: '0', color: (cfg.filaments[0]||{}).color||'#000000' }];
    return { id: uid(), ...t };
  });

  // Если новых столов нет — пробуем legacy (единственный стол из плоских полей)
  if (!tablesArr.length) {
    tablesArr = [{
      id: uid(),
      printerId: (cfg.printers.find(p => p.name === String(map['Принтер']||'')) || cfg.printers[0] || {}).id || '',
      hours: String(map['Часов печати'] || 0),
      drying: map['Сушка'] === 'Да' ? 'yes' : 'no',
      defect: 0,
      filaments: [{ id: uid(), filamentId: (cfg.filaments[0]||{}).id||'', grams: String(map['Граммов филамента']||0), color: (cfg.filaments[0]||{}).color||'#000000' }],
    }];
  }

  // Сводные данные для карточки реестра
  const printerNames = [...new Set(tablesArr.map(t => (cfg.printers.find(p => p.id === t.printerId)||{}).name||'—'))].join(', ');
  const filamentNames = [...new Set(tablesArr.flatMap(t => t.filaments.map(f => (cfg.filaments.find(p => p.id === f.filamentId)||{}).name||'—')))].join(', ');
  const hoursTotal = tablesArr.reduce((s,t) => s + (parseFloat(t.hours)||0), 0);
  const gramsTotal = tablesArr.reduce((s,t) => s + t.filaments.reduce((fs,f) => fs + (parseFloat(f.grams)||0), 0), 0);

  return {
    id: uid(),
    orderName: String(map['Название расчёта'] || map['Название заказа'] || map['Название'] || fallbackName || ''),
    name: dup ? name + ' (' + new Date().toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'}) + ')' : name,
    date: xlsxDateToStr(map['Дата']),
    printerName: printerNames || String(map['Принтер'] || '—'),
    printerName0: tablesArr[0] ? (cfg.printers.find(p => p.id === tablesArr[0].printerId)||{}).name||'—' : '—',
    filamentName: filamentNames || String(map['Филамент'] || '—'),
    hours: String(hoursTotal || map['Часов печати'] || 0),
    grams: String(gramsTotal || map['Граммов филамента'] || 0),
    cost1: map[`Себестоимость 1 шт, ${cfg.currency || '₽'}`] ?? map['Себестоимость 1 шт, ₽'] ?? null,
    params: {
      tables: tablesArr,
      qty:         String(map['Количество штук'] || map['Количество штук (годных)'] || 1),
      extraFixed:  String(map[`Доп. затраты фикс. (${cfg.currency || '₽'})`]  ?? map['Доп. затраты фикс. (₽)']  ?? 0),
      extraParts:  String(map[`Доп. детали на 1 шт (${cfg.currency || '₽'})`] ?? map['Доп. детали на 1 шт (₽)'] ?? 0),
      packaging:   String(map[`Упаковка на 1 шт (${cfg.currency || '₽'})`]    ?? map['Упаковка на 1 шт (₽)']    ?? 0),
      prepTime:    String(map['Время подготовки (мин)']    || 0),
      postTime:    String(map['Время постобработки (мин)'] || 0),
      logTime:     String(map['Время упаковки/лог. (мин)'] || 0),
      commission:  String(map['Комиссия площадки %']       || 0),
      commFixed:   String(map[`Фикс. комиссия (${cfg.currency || '₽'})`] ?? map['Фикс. комиссия (₽)'] ?? 0),
      customPrice: String(map['Своя цена'] || ''),
      selP: map['Выбранная цена продажи'] || 'retail_light',
      selT: map['Выбранный налог']        || 'none',
    }
  };
}

function importXlsxToReg(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      if (typeof XLSX === 'undefined') { alert('XLSX не загружен'); return; }
      const wb = XLSX.read(ev.target.result, {type: 'array', cellDates: true, dateNF: 'dd.mm.yyyy'});
      const snaps = [];
      const sheets = wb.SheetNames.filter(n => n !== 'Реестр');
      const toProcess = sheets.length > 0 ? sheets : wb.SheetNames;
      toProcess.forEach(name => { const snap = sheetToSnap(wb.Sheets[name], name); if (snap) snaps.push(snap); });
      if (snaps.length === 0) { alert('Не удалось найти расчёты в файле. Убедитесь, что файл экспортирован из этого калькулятора.'); return; }
      snaps.forEach(s => reg.unshift(s));
      svR(); renderReg();
      if (snaps.length === 1) alert('Расчёт "' + snaps[0].name + '" добавлен в реестр.');
      else alert('Добавлено расчётов: ' + snaps.length + ' ' + snaps.map(s => '• ' + s.name).join(' '));
    } catch(err) { alert('Ошибка: ' + err.message); }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = '';
}

// ── IMPORT (JSON or XLSX) ──────────────────────────────────
const PCS = {
  wholesale:    {id: 'pc-w',  label: 'Оптовая'},
  retail_light: {id: 'pc-rl', label: 'Розница лайт'},
  retail:       {id: 'pc-r',  label: 'Розница полная'},
  custom:       {id: 'pc-c',  label: 'Своя цена'},
};
function applySnapToCalc(p, snapMeta) {
  if (!p) return;
  // Если есть tables — используем loadSnap-логику через временную запись
  if (Array.isArray(p.tables) && p.tables.length > 0) {
    const tmp = {
      id: '__tmp_import__',
      name: (snapMeta && snapMeta.name) || 'Импорт',
      orderName: (snapMeta && snapMeta.orderName) || '',
      date: (snapMeta && snapMeta.date) || '',
      printerName: (snapMeta && snapMeta.printerName) || '—',
      filamentName: (snapMeta && snapMeta.filamentName) || '—',
      hours: (snapMeta && snapMeta.hours) || '0',
      grams: (snapMeta && snapMeta.grams) || '0',
      cost1: (snapMeta && snapMeta.cost1) || null,
      params: p,
    };
    reg.unshift(tmp);
    loadSnap('__tmp_import__');
    reg.shift();
    return;
  }
  // Legacy: один стол, плоские поля
  ['qty', 'extraFixed', 'extraParts', 'packaging', 'prepTime', 'postTime', 'logTime', 'commission', 'commFixed'].forEach(k => sv(k, p[k] || ''));
  sv('custom-price', p.customPrice || '');
  if (p.selP) { selP = p.selP; Object.keys(PCS).forEach(k => { const e = document.getElementById(PCS[k].id); if (e) e.classList.toggle('sel', k === selP); }); }
  if (p.selT) { selT = p.selT; renderTaxOps(); }
  calc(); checkAllFields();
}
let pickerSnaps = [];
function pickSnap(i) {
  const s = pickerSnaps[i];
  if (s && s.params) { applySnapToCalc(s.params, s); }
  closeM('mo-picker');
}
function showPickerModal(snaps) {
  pickerSnaps = snaps;
  const list = document.getElementById('picker-list');
  list.innerHTML = snaps.map((s, i) => `
    <div class="ri" style="cursor:pointer" onclick="pickSnap(${i})">
      <div class="ri-info">
        <div class="ri-title">${escH(s.name)}</div>
        <div class="ri-meta">${s.date} · ${s.printerName}</div>
        <div class="ri-sub">${s.hours} ч · ${s.grams} г · ${s.filamentName}</div>
      </div>
      <div style="color:var(--blue);font-size:13px;font-weight:500;flex-shrink:0;padding-left:8px">Загрузить →</div>
    </div>`).join('');
  openM('mo-picker');
}
function importFile(e) {
  const file = e.target.files[0]; if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') {
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        if (typeof XLSX === 'undefined') { alert('XLSX не загружен — нужен интернет'); return; }
        const wb = XLSX.read(ev.target.result, {type: 'array', cellDates: true, dateNF: 'dd.mm.yyyy'});
        const sheets = wb.SheetNames.filter(n => n !== 'Реестр');
        const toProcess = sheets.length > 0 ? sheets : wb.SheetNames;
        const snaps = toProcess.map(n => sheetToSnap(wb.Sheets[n], n)).filter(Boolean);
        if (snaps.length === 0) {
          alert('Данные не найдены. Убедитесь, что файл экспортирован из этого калькулятора.');
        } else if (snaps.length === 1) {
          applySnapToCalc(snaps[0].params, snaps[0]);
          const b = document.getElementById('autosave-badge');
          b.textContent = '✓ Расчёт загружен'; b.classList.add('show');
          setTimeout(() => { b.classList.remove('show'); b.textContent = '✓ Автосохранено'; }, 2500);
        } else {
          showPickerModal(snaps);
        }
      } catch(err) { alert('Ошибка чтения Excel: ' + err.message); }
    };
    if (file.size > 20 * 1024 * 1024) { alert('Файл слишком большой (макс. 20 МБ)'); e.target.value = ''; return; }
    reader.readAsArrayBuffer(file);
  } else if (ext === 'json') {
    if (file.size > 5 * 1024 * 1024) { alert('JSON-файл слишком большой (макс. 5 МБ)'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data || typeof data !== 'object') { alert('Неверный формат JSON'); return; }
        let updated = [];
        if (data.cfg && typeof data.cfg === 'object') {
          cfg = Object.assign(defCfg(), data.cfg); svC(); rebuildSelects(); renderTaxOps();
          updated.push('конфигурация');
        }
        if (Array.isArray(data.reg)) {
          reg = data.reg
            .filter(x => x && x.id && x.name)
            .map(x => ({...x, id: String(x.id).replace(/[^a-z0-9_-]/gi, ''), name: String(x.name).slice(0, 200)}));
          svR();
          updated.push('реестр');
        }
        if (updated.length === 0) { alert('Данные не найдены в JSON файле'); return; }
        const b = document.getElementById('autosave-badge');
        b.textContent = '✓ Обновлено: ' + updated.join(' и '); b.classList.add('show');
        setTimeout(() => { b.classList.remove('show'); b.textContent = '✓ Автосохранено'; }, 3500);
      } catch(err) { alert('Ошибка чтения JSON: ' + err.message); }
    };
    reader.readAsText(file, 'utf-8');
  }
  e.target.value = '';
}

let sortField = 'date', sortDir = -1;
function setSort(field) {
  if (sortField === field) sortDir *= -1;
  else { sortField = field; sortDir = (field === 'date') ? -1 : 1; }
  sortField = field;
  const btns = {date: 'sort-date-btn', name: 'sort-name-btn', printer: 'sort-printer-btn'};
  Object.entries(btns).forEach(([f, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('active-sort', f === field);
    const labels = {date: 'По дате', name: 'По имени', printer: 'По принтеру'};
    el.textContent = labels[f] + (f === field ? (sortDir === -1 ? ' ↓' : ' ↑') : '');
  });
  renderReg();
}
function sortedReg(list) {
  return [...list].sort((a, b) => {
    if (sortField === 'name') return sortDir * a.name.localeCompare(b.name, 'ru');
    if (sortField === 'printer') return sortDir * (a.printerName0 || a.printerName || '').localeCompare(b.printerName0 || b.printerName || '', 'ru');
    const pd = s => { const p = (s || '01.01.2000').split('.'); return new Date(+p[2], +p[1] - 1, +p[0]); };
    return sortDir * (pd(a.date) - pd(b.date));
  });
}

let autosaveTimer = null, autosaveReady = false;

function triggerAutosave() {
  if (!autosaveReady) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    const snap = {
      ts: Date.now(),
      orderName: gv('order-name'),
      tables: JSON.parse(JSON.stringify(tables)),
      qty: gv('qty'),
      extraFixed: gv('extraFixed'), extraParts: gv('extraParts'), packaging: gv('packaging'),
      prepTime: gv('prepTime'), postTime: gv('postTime'), logTime: gv('logTime'),
      commission: gv('commission'), commFixed: gv('commFixed'),
      customPrice: gv('custom-price'), selP, selT,
    };
    try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snap)); } catch(e) { console.warn('autosave failed', e); }
    const b = document.getElementById('autosave-badge');
    if (b) { b.textContent = '✓ Автосохранено'; b.classList.add('show'); setTimeout(() => b.classList.remove('show'), 2000); }
  }, 1500);
}
function restoreAutosave() {
  try {
    const snap = JSON.parse(localStorage.getItem(AUTOSAVE_KEY));
    if (!snap || !snap.ts) return;
    if (Date.now() - snap.ts > 86400000) return;

    sv('order-name', snap.orderName || '');

    // Восстанавливаем столи
    if (Array.isArray(snap.tables) && snap.tables.length > 0) {
      tables = [];
      snap.tables.forEach(t => tables.push({...t, id: t.id || uid()}));
      // Обратная совместимость: старые автосохранения без поля defect
      tables.forEach(t => { if (t.defect === undefined) t.defect = cfg.defaults?.defect ?? 0; });
      // Обратная совместимость: старые автосохранения без filaments
      tables.forEach(t => {
        if (!t.filaments && t.plasticId) {
          t.filaments = [{ id: uid(), filamentId: t.plasticId, grams: t.grams || '0' }];
        } else if (!t.filaments && t.filamentId) {
          t.filaments = [{ id: uid(), filamentId: t.filamentId, grams: t.grams || '0' }];
        } else if (!t.filaments) {
          t.filaments = [{ id: uid(), filamentId: (cfg.filaments[0] || {}).id || '', grams: t.grams || '90' }];
        }
      });
      // Миграция color в автосохранённых филаментах
      tables.forEach(t => {
        (t.filaments || []).forEach(f => {
          if (!f.color) f.color = cfg.filaments.find(p => p.id === f.filamentId)?.color || '#000000';
        });
      });
      renderTables();
    } else if (snap.filamentId || snap.printerId) {
      // legacy autosave
      tables = [{
        id: uid(),
        printerId: snap.printerId || (cfg.printers[0] || {}).id || '',
        filamentId: snap.filamentId || (cfg.filaments[0] || {}).id || '',
        grams: snap.grams || '90',
        hours: snap.hours || '6.6',
        drying: snap.drying || 'no',
      }];
      renderTables();
    }

    ['qty', 'extraFixed', 'extraParts', 'packaging', 'prepTime', 'postTime', 'logTime', 'commission', 'commFixed'].forEach(k => sv(k, snap[k] || ''));
    sv('custom-price', snap.customPrice || '');
    if (snap.selP) { selP = snap.selP; Object.keys(PCS).forEach(k => { const e = document.getElementById(PCS[k].id); if (e) e.classList.toggle('sel', k === selP); }); }
    if (snap.selT) { selT = snap.selT; renderTaxOps(); }
  } catch {}
}

let renameId = null;
function startRename(id) {
  const r = reg.find(x => x.id === id); if (!r) return;
  renameId = id;
  document.getElementById('rename-input').value = r.name;
  openM('mo-rename');
  setTimeout(() => document.getElementById('rename-input').focus(), 100);
}
function confirmRename() {
  const newName = document.getElementById('rename-input').value.trim();
  if (!newName || !renameId) return;
  const r = reg.find(x => x.id === renameId);
  if (r) { r.name = newName; svR(); renderReg(); }
  closeM('mo-rename'); renameId = null;
}

// ── НАСТРОЙКИ ───────────────────────────────────────────────
function syncS() {
  document.getElementById('s_elec').value = cfg.electricity;
  document.getElementById('s_op').value = cfg.operatorRate;
  sv('s_currency', cfg.currency || '₽');
  _syncCurrencyLabels();
  updateWageCalc(); renderDryers(); renderPrinters(); renderFilaments(); renderTaxes();
  syncDryerSel();
}
function _syncCurrencyLabels() {
  const c = cfg.currency || '₽';
  ['lbl_cur_op','lbl_cur_elec','lbl_cur_ef','lbl_cur_ep','lbl_cur_pkg','lbl_cur_cf','lbl_cur_custom'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = c;
  });
  // Обновляем подпись с названием валюты (без записи в cfg)
  const lbl = document.getElementById('s_currency_name');
  if (lbl) lbl.textContent = _CURRENCY_NAMES[c] || '';
}
const _CURRENCY_NAMES = {
  '₽': 'Рубль',
  '₸': 'Казахстанский тенге',
  '₼': 'Азербайджанский манат',
  '֏': 'Армянский драм',
  '$': 'Доллар США',
  '€': 'Евро',
  '¥': 'Юань / иена',
};
// Вызывается при смене селекта валюты: сохраняет выбор и обновляет везде
function _syncCurrencyName() {
  const sel = document.getElementById('s_currency');
  if (!sel) return;
  cfg.currency = sel.value || '₽';
  _syncCurrencyLabels();
  try { updateWageCalc(); } catch(e) {}
  try { renderPrinters(); } catch(e) {}
  try { renderFilaments(); } catch(e) {}
  try { renderTables(); } catch(e) {}
  try { calc(); } catch(e) {}
  svC();
}
const dOpts = sel => cfg.dryers.map(d => `<option value="${escH(d.id)}"${d.id === sel ? ' selected' : ''}>${escH(d.name)} (${d.kw} кВт)</option>`).join('');
function renderDryers() { document.getElementById('dryers-list').innerHTML = cfg.dryers.map((d, i) => {
  if (d.id === 'd1') {
    return `<div class="si"><div class="si-h"><div class="si-h-left"><div class="si-name">${escH(d.name)}</div></div></div><div class="sg2"><div class="sf"><label>Название</label><input type="text" value="${escH(d.name)}" disabled style="opacity:.55;pointer-events:none"></div><div class="sf"><label>Мощность (кВт)</label><input type="number" value="${d.kw}" disabled style="opacity:.55;pointer-events:none"></div></div></div>`;
  }
  return `<div class="si"><div class="si-h"><div class="si-h-left"><div class="si-name">${escH(d.name)}</div></div><div class="si-h-right"><button class="move-btn" onclick="moveDryer('${d.id}',-1)" ${i===1?'disabled':''} title="Вверх">↑</button><button class="move-btn" onclick="moveDryer('${d.id}',1)" ${i===cfg.dryers.length-1?'disabled':''} title="Вниз">↓</button><button class="del-btn" onclick="confirmDelDryer('${d.id}','${escH(d.name)}')">Удалить</button></div></div><div class="sg2"><div class="sf"><label>Название</label><input type="text" value="${d.name}" oninput="cfg.dryers[${i}].name=this.value;this.closest('.si').querySelector('.si-name').textContent=this.value;renderPrinters();svC()" onblur="renameItemId('dryer','${d.id}',this.value.trim()||'сушилка')"></div><div class="sf"><label>Мощность (кВт)</label><input type="number" value="${d.kw}" min="0" step="0.001" oninput="numInput(this,{decimals:3});cfg.dryers[${i}].kw=Math.max(0,parseNum(this.value));svC()"></div></div></div>`;
}).join(''); }
function renderPrinters() { document.getElementById('printers-list').innerHTML = cfg.printers.map((p, i) => `<div class="si"><div class="si-h"><div class="si-h-left"><div class="si-name">${escH(p.name)}</div></div><div class="si-h-right"><button class="move-btn" onclick="movePrinter('${p.id}',-1)" ${i===0?'disabled':''} title="Вверх">↑</button><button class="move-btn" onclick="movePrinter('${p.id}',1)" ${i===cfg.printers.length-1?'disabled':''} title="Вниз">↓</button><button class="del-btn" onclick="confirmDelPrinter('${p.id}','${escH(p.name)}')">Удалить</button></div></div><div class="sg2"><div class="sf" style="grid-column:span 2"><label>Название</label><input type="text" value="${p.name}" oninput="cfg.printers[${i}].name=this.value;this.closest('.si').querySelector('.si-name').textContent=this.value;svC()" onblur="renameItemId('printer','${p.id}',this.value.trim()||'принтер')"></div><div class="sf"><label>Стоимость (${cfg.currency||'₽'})</label><input type="number" value="${p.cost}" min="0" step="1" oninput="numInput(this,{decimals:2});cfg.printers[${i}].cost=Math.max(0,parseNum(this.value));svC()"></div><div class="sf"><label>Часов амортизации</label><input type="number" value="${cfg.depreciationHours}" min="1" step="100" oninput="cfg.depreciationHours=Math.max(1,+this.value);this.value=cfg.depreciationHours;svC()"></div><div class="sf"><label>Мощность печати (кВт)</label><input type="number" value="${p.kw}" min="0" step="0.001" oninput="numInput(this,{decimals:3});cfg.printers[${i}].kw=Math.max(0,parseNum(this.value));svC()"></div><div class="sf"><label>Обслуживание (${cfg.currency||'₽'}/час)</label><input type="number" value="${p.maintenance ?? 5}" min="0" step="0.5" oninput="numInput(this,{decimals:2});cfg.printers[${i}].maintenance=Math.max(0,parseNum(this.value));svC()"></div><div class="sf" style="grid-column:span 2"><label>Сушилка</label><select onchange="cfg.printers[${i}].dryerId=this.value;svC()">${dOpts(p.dryerId)}</select></div></div></div>`).join(''); }
function renderFilaments() {
  document.getElementById('filaments-list').innerHTML = cfg.filaments.map((p, i) => {
    const color = p.color || '#000000';
    const colorName = (_PALETTE.find(function(e){return e.c===color;})||{n:color}).n;
    const colorNameHtml = colorName;
    return `<div class="si"><div class="si-h"><div class="si-h-left"><div id="cfg-fch-dot-${i}" class="si-color-dot" style="background:${color}"></div><div class="si-name">${escH(p.name)}</div></div><div class="si-h-right"><button class="move-btn" onclick="moveFilament('${p.id}',-1)" ${i===0?'disabled':''} title="Вверх">↑</button><button class="move-btn" onclick="moveFilament('${p.id}',1)" ${i===cfg.filaments.length-1?'disabled':''} title="Вниз">↓</button><button class="del-btn" onclick="confirmDelFilament('${p.id}')">Удалить</button></div></div><div class="sg2"><div class="sf" style="grid-column:span 2"><label>Название</label><input type="text" value="${escH(p.name)}" oninput="cfg.filaments[${i}].name=this.value;this.closest('.si').querySelector('.si-name').textContent=this.value;svC()" onblur="renameItemId('filament','${p.id}',this.value.trim()||'филамент')"></div><div class="sf"><label>Цвет</label><div class="cfg-color-field"><div id="cfg-fcs-${i}" class="cfg-color-swatch" style="background:${color}" onclick="toggleColorPalette(event,${i})"></div><span id="cfg-fcn-${i}" class="cfg-color-name">${colorNameHtml}</span></div></div><div class="sf"><label>Цена за кг (${cfg.currency||'₽'})</label><input type="number" value="${p.pricePerKg}" min="0" step="1" oninput="numInput(this,{decimals:2});cfg.filaments[${i}].pricePerKg=Math.max(0,parseNum(this.value));svC()"></div></div></div>`;
  }).join('');
  ensureGlobalPalette();
}
function renderTaxes() { document.getElementById('taxes-list').innerHTML = cfg.taxes.map((t, i) => {
  if (t.id === 'none') {
    return `<div class="tax-row"><div class="sf"><label>Название</label><input type="text" value="${escH(t.name)}" disabled style="opacity:.55;pointer-events:none"></div><div class="sf"><label>Ставка %</label><input type="number" value="${t.rate}" disabled style="opacity:.55;pointer-events:none"></div><button class="del-btn" disabled style="opacity:0;pointer-events:none">✕</button></div>`;
  }
  return `<div class="tax-row"><div class="sf"><label>Название</label><input type="text" value="${t.name}" oninput="cfg.taxes[${i}].name=this.value;svC()" onblur="renameItemId('tax','${t.id}',this.value.trim()||'налог')"></div><div class="sf"><label>Ставка %</label><input type="number" value="${t.rate}" min="0" max="100" step="0.1" oninput="numInput(this,{decimals:3});cfg.taxes[${i}].rate=Math.min(100,Math.max(0,parseNum(this.value)));svC()" onblur="numBlur(this,{max:100});cfg.taxes[${i}].rate=Math.min(100,Math.max(0,parseNum(this.value)));svC()"></div><button class="del-btn" onclick="confirmDelTax('${t.id}','${escH(t.name)}')">✕</button></div>`;
}).join(''); }
function addDryer() {
  const name = 'Новая сушилка';
  const id = slugId(name, cfg.dryers.map(d => d.id));
  cfg.dryers.push({id, name, kw: 0.3});
  renderDryers(); renderPrinters(); svC();
}
function delDryer(id) { if (id === 'd1') return; cfg.dryers = cfg.dryers.filter(d => d.id !== id); cfg.printers.forEach(p => { if (p.dryerId === id) p.dryerId = cfg.dryers[0]?.id || ''; }); renderDryers(); renderPrinters(); svC(); }
function addPrinter() {
  const name = 'Новый принтер';
  const id = slugId(name, cfg.printers.map(p => p.id));
  cfg.printers.push({id, name, cost: 30000, kw: 0.15, dryerId: cfg.dryers[0]?.id || '', maintenance: 5});
  renderPrinters(); svC();
}
function delPrinter(id) {
  cfg.printers = cfg.printers.filter(p => p.id !== id);
  const fallback = (cfg.printers[0] || {}).id || '';
  tables.forEach(t => { if (t.printerId === id) t.printerId = fallback; });
  renderTables(); renderPrinters(); calc(); svC();
}
function moveDryer(id, dir) {
  if (id === 'd1') return;
  var idx = cfg.dryers.findIndex(function(d){ return d.id === id; });
  if (idx < 0) return;
  var newIdx = idx + dir;
  if (newIdx <= 0 || newIdx >= cfg.dryers.length) return;
  var tmp = cfg.dryers[idx]; cfg.dryers[idx] = cfg.dryers[newIdx]; cfg.dryers[newIdx] = tmp;
  renderDryers(); renderPrinters(); svC();
}
function movePrinter(id, dir) {
  var idx = cfg.printers.findIndex(function(p){ return p.id === id; });
  if (idx < 0) return;
  var newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= cfg.printers.length) return;
  var tmp = cfg.printers[idx]; cfg.printers[idx] = cfg.printers[newIdx]; cfg.printers[newIdx] = tmp;
  renderPrinters(); svC();
}
function moveFilament(id, dir) {
  var idx = cfg.filaments.findIndex(function(p){ return p.id === id; });
  if (idx < 0) return;
  var newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= cfg.filaments.length) return;
  var tmp = cfg.filaments[idx];
  cfg.filaments[idx] = cfg.filaments[newIdx];
  cfg.filaments[newIdx] = tmp;
  renderFilaments();
  svC();
}
function addFilament() {
  const name = 'Новый филамент';
  const color = '#000000';
  const id = slugId(name, cfg.filaments.map(f => f.id), color.replace('#',''));
  cfg.filaments.push({id, name, pricePerKg: 1000, color});
  renderFilaments(); svC();
}
function delFilament(id) {
  cfg.filaments = cfg.filaments.filter(p => p.id !== id);
  const fallback = (cfg.filaments[0] || {}).id || '';
  // Подменяем удалённый филамент в активных столах
  tables.forEach(t => (t.filaments || []).forEach(f => { if (f.filamentId === id) { f.filamentId = fallback; f.color = (cfg.filaments[0] || {}).color || '#000000'; } }));
  renderTables(); renderFilaments(); calc(); svC();
}
function addTax() {
  const name = 'Новый режим';
  const id = slugId(name, cfg.taxes.map(t => t.id));
  cfg.taxes.push({id, name, rate: 0});
  renderTaxes(); svC();
}
function delTax(id) { if (id === 'none') return; cfg.taxes = cfg.taxes.filter(t => t.id !== id); if (selT === id) { selT = (cfg.taxes[0] || {}).id || 'none'; renderTaxOps(); } renderTaxes(); svC(); }
var _palActiveIdx = -1;
var _PALETTE = [
  {c:'#FFFFFF',n:'Белый'},{c:'#F7E6DE',n:'Бежевый'},{c:'#D1D3D5',n:'Светло-серый'},
  {c:'#A6A9AA',n:'Серебристый'},{c:'#8E9089',n:'Серый'},{c:'#5B6579',n:'Сине-серый'},{c:'#000000',n:'Чёрный'},
  {c:'#C12E1F',n:'Красный'},{c:'#BB3D43',n:'Тёмно-красный'},{c:'#950051',n:'Слива'},
  {c:'#D81B60',n:'Малиновый'},{c:'#EC008C',n:'Фуксия'},{c:'#F55A74',n:'Розовый'},{c:'#E8AFCF',n:'Сакура'},
  {c:'#FF6A13',n:'Оранжевый'},{c:'#FF9016',n:'Тыква'},{c:'#F99963',n:'Персиковый'},
  {c:'#F7D959',n:'Лимонный'},{c:'#F4EE2A',n:'Жёлтый'},{c:'#FEC600',n:'Янтарный'},{c:'#E4BD68',n:'Золотой'},
  {c:'#B15533',n:'Кирпичный'},{c:'#BECF00',n:'Лайм'},{c:'#C2E189',n:'Светло-зелёный'},
  {c:'#61C680',n:'Травяной зелёный'},{c:'#00AE42',n:'Зелёный'},{c:'#3F8E43',n:'Тёмно-зелёный'},{c:'#68724D',n:'Хаки'},
  {c:'#A3D8E1',n:'Ледяной голубой'},{c:'#00897B',n:'Тёмно-бирюзовый'},{c:'#00ACC1',n:'Бирюзовый'},
  {c:'#0086D6',n:'Голубой'},{c:'#56B7E6',n:'Небесно-голубой'},{c:'#0078BF',n:'Морской синий'},{c:'#042F56',n:'Тёмно-синий'},
  {c:'#0A2989',n:'Синий'},{c:'#AE96D4',n:'Сиреневый'},{c:'#5E35B1',n:'Фиолетовый'},
  {c:'#8E24AA',n:'Пурпурный'},{c:'#482960',n:'Индиго'},{c:'#9D432C',n:'Коричневый'},{c:'#4D3324',n:'Шоколад'},
];
function ensureGlobalPalette() {
  if (document.getElementById('global-fc-palette')) return;
  var pal = document.createElement('div');
  pal.id = 'global-fc-palette';
  pal.className = 'fc-palette';
  pal.style.cssText = 'position:fixed;display:none;z-index:99999;grid-template-columns:repeat(7,22px);gap:5px;';
  _PALETTE.forEach(function(item) {
    var btn = document.createElement('button');
    btn.className = 'fc-dot';
    btn.style.background = item.c;
    btn.title = item.n;
    btn.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopPropagation();
      pickFilamentColor(e, item.c, _palActiveIdx);
    });
    pal.appendChild(btn);
  });
  document.body.appendChild(pal);
  document.addEventListener('mousedown', function(e) {
    var pal2 = document.getElementById('global-fc-palette');
    if (pal2 && pal2.style.display !== 'none' && !pal2.contains(e.target)) {
      pal2.style.display = 'none';
      _palActiveIdx = -1;
    }
  });
}
function toggleColorPalette(e, i) {
  e.stopPropagation();
  ensureGlobalPalette();
  var pal = document.getElementById('global-fc-palette');
  if (!pal) return;
  if (pal.style.display !== 'none' && _palActiveIdx === i) {
    pal.style.display = 'none';
    _palActiveIdx = -1;
    return;
  }
  _palActiveIdx = i;
  var swatch = document.getElementById('cfg-fcs-' + i);
  if (!swatch) return;
  var rect = swatch.getBoundingClientRect();
  var palW = 223, palH = 200;
  var left = Math.min(rect.left, window.innerWidth - palW - 8);
  var top = (window.innerHeight - rect.bottom >= palH + 8) ? rect.bottom + 6 : rect.top - palH - 6;
  pal.style.left = left + 'px';
  pal.style.top  = top  + 'px';
  pal.style.display = 'grid';
}
function pickFilamentColor(e, color, i) {
  if (e) { e.stopPropagation(); }
  if (i < 0 || i >= cfg.filaments.length) return;
  cfg.filaments[i].color = color;
  var sw = document.getElementById('cfg-fcs-' + i);
  var nm = document.getElementById('cfg-fcn-' + i);
  var hd = document.getElementById('cfg-fch-dot-' + i);
  if (sw) sw.style.background = color;
  if (hd) hd.style.background = color;
  if (nm) nm.textContent = (_PALETTE.find(function(e){return e.c===color;})||{n:color}).n;
  var pal = document.getElementById('global-fc-palette');
  if (pal) pal.style.display = 'none';
  _palActiveIdx = -1;
  svC();
  renderTables();
}

function saveSettings() {
  cfg.electricity = Math.max(0, +document.getElementById('s_elec').value || cfg.electricity);
  cfg.operatorRate = Math.max(0, +document.getElementById('s_op').value || cfg.operatorRate);
  cfg.currency = document.getElementById('s_currency')?.value.trim() || '₽';
  _syncCurrencyLabels();
  svC(); renderTables(); renderTaxOps(); calc();
  const n = document.getElementById('sn-s'); n.classList.add('show'); setTimeout(() => n.classList.remove('show'), 2500);
}

// ── CALC SELECTS ───────────────────────────────────────────
function rebuildSelects() {
  // После перехода на мультистол #plastic/#printer убраны из HTML.
  // Вызывается при импорте JSON — обновляем столи вместо старых selects.
  renderTables();
}
function rebuildDrying() {
  // Сушилка теперь в каждом столе — см. refreshTableDryer().
  // Оставлена для обратной совместимости с importFile/importXlsxToReg.
}
function onPrinterChange() { calc(); }

// ── PRICE CARDS ────────────────────────────────────────────
function renderTaxOps() {
  if (!cfg.taxes.find(t => t.id === selT)) selT = cfg.taxes[0]?.id || 'none';
  document.getElementById('taxops').innerHTML = cfg.taxes.map(t =>
    `<div class="to${selT === t.id ? ' active' : ''}" onclick="selTax('${escH(t.id)}')"><div class="tdot"><div class="tdi"></div></div><span class="tn">${escH(t.name)}</span><span class="tp">${+t.rate || 0}%</span></div>`
  ).join('');
}
function selTax(id) { selT = id; document.querySelectorAll('.to').forEach(el => el.classList.toggle('active', el.getAttribute('onclick')?.includes(`'${id}'`))); updateSales(); }
function selPrice(key) { selP = key; Object.keys(PCS).forEach(k => { const e = document.getElementById(PCS[k].id); if (e) e.classList.toggle('sel', k === key); }); if (key === 'custom') document.getElementById('custom-price').focus(); updateSales(); }

// ── CALC LOGIC ─────────────────────────────────────────────
function updateSales() {
  triggerAutosave();
  const {wholesale, retailLight, retail, cost1, qty, commPct} = comp;
  const customV = +gv('custom-price') || 0, cf = +gv('commFixed') || 0;
  const prices = {wholesale, retail_light: retailLight, retail, custom: customV};
  const price = prices[selP] || 0;
  const taxObj = cfg.taxes.find(t => t.id === selT);
  const tax = price * (taxObj?.rate || 0) / 100;
  const comm = price * commPct;
  const net = price - tax - comm - cf;
  const profit = net - cost1;
  const bk = net > 0 ? Math.ceil((cost1 * qty) / net) : null;
  document.getElementById('sel-lbl').textContent = PCS[selP].label;
  document.getElementById('s_price').textContent = fmt(price);
  document.getElementById('s_tax').textContent = fmt(tax);
  document.getElementById('s_comm').textContent = fmt(comm);
  document.getElementById('s_cf').textContent = fmt(cf);
  document.getElementById('s_net').textContent = fmt(net);
  const pe = document.getElementById('s_prof');
  pe.textContent = fmt(Math.abs(profit) < 0.005 ? 0 : profit);
  pe.className = 'profval ' + (profit > 0.005 ? 'pos' : 'neg');
  document.getElementById('s_net').style.color = net > 0.005 ? 'var(--green)' : 'var(--red)';
  const be = document.getElementById('s_bk');
  if (comp.qtyIsZero) { be.textContent = '0 шт'; be.className = 'over'; }
  else if (bk === null) { be.textContent = '—'; be.className = 'over'; }
  else { be.textContent = bk + ' шт'; be.className = bk > qty ? 'over' : ''; }
}

function calcTable(t) {
  // Считает себестоимость одного стола за всю партию (не делённую на qty)
  const printer = cfg.printers.find(p => p.id === t.printerId) || cfg.printers[0];
  if (!printer) return { filamentCost: 0, printerTot: 0, elecTot: 0, maintTot: 0, defectAdd: 0 };
  const dryer = cfg.dryers.find(d => d.id === printer.dryerId);
  const hourIn = safeNum(t.hours, 0, 0, 10000);
  const drying = t.drying === 'yes';
  const hourRate = printer.cost / Math.max(1, cfg.depreciationHours);
  const kwh = printer.kw + (drying ? (dryer?.kw || 0) : 0);
  const plasticTot = (t.filaments || []).reduce((sum, f) => {
    const mat = cfg.filaments.find(p => p.id === f.filamentId) || cfg.filaments[0];
    return sum + (parseFloat(f.grams) || 0) / 1000 * (mat?.pricePerKg || 0);
  }, 0);
  const printerTot  = hourRate * hourIn;
  const elecTot     = kwh * hourIn * cfg.electricity;
  const maintTot    = (printer.maintenance ?? cfg.defaults?.maintenance ?? 5) * hourIn;
  const baseCost    = plasticTot + printerTot + elecTot + maintTot;
  const defectAdd   = baseCost * ((+t.defect || 0) / 100);
  return { filamentCost: plasticTot, printerTot, elecTot, maintTot, defectAdd };
}

function calc() {
  if (!tables.length) return;
  const qtyRaw = gv('qty'), qtyNum = +qtyRaw, qty = qtyNum || 1,
        qtyIsZero = (qtyRaw === '' || qtyNum <= 0),
        qtyNonInt = (qtyRaw !== '' && qtyNum > 0 && !Number.isInteger(qtyNum));
  const prepM = +gv('prepTime') || 0, postM = +gv('postTime') || 0, logM = +gv('logTime') || 0;
  const xParts = +gv('extraParts') || 0, xPack = +gv('packaging') || 0, xFixed = +gv('extraFixed') || 0;
  const commPct = (+gv('commission') || 0) / 100;

  // Суммируем по всем столам
  let filamentCost = 0, printerTot = 0, elecTot = 0, maintTot = 0, defectTot = 0;
  tables.forEach(t => {
    const r = calcTable(t);
    filamentCost += r.filamentCost;
    printerTot += r.printerTot;
    elecTot    += r.elecTot;
    maintTot   += r.maintTot;
    defectTot  += r.defectAdd;
  });

  const opTot = ((prepM + postM + logM) / 60) * cfg.operatorRate;
  const pl1 = filamentCost / qty;
  const pr1 = printerTot / qty, el1 = elecTot / qty, ma1 = maintTot / qty, op1 = opTot / qty, ex1 = xFixed / qty;
  const baseCost1 = pl1 + pr1 + el1 + ma1 + op1 + ex1 + xParts + xPack;
  const defAdd1 = defectTot / qty;
  const cost1 = baseCost1 + defAdd1;
  const costAll = cost1 * qty;
  const defAddAll = defAdd1 * qty;
  comp = {cost1, qty, qtyIsZero, commPct, wholesale: cost1 * PRICE_MULT.wholesale, retailLight: cost1 * PRICE_MULT.retailLight, retail: cost1 * PRICE_MULT.retailFull};
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = fmt(v); };
  document.getElementById('r_w').textContent = fmt(comp.wholesale);
  document.getElementById('r_rl').textContent = fmt(comp.retailLight);
  document.getElementById('r_r').textContent = fmt(comp.retail);
  set('b_tot', cost1); set('b_pl', pl1); set('b_pr', pr1); set('b_el', el1);
  set('b_ma', ma1); set('b_op', op1); set('b_pt', xParts); set('b_pk', xPack); set('b_ex', ex1);
  const dl = document.getElementById('b_defL'), dv = document.getElementById('b_def');
  if (defAdd1 > 0) { dl.style.display = ''; dv.style.display = ''; document.getElementById('b_defP').textContent = ''; set('b_def', defAdd1); }
  else { dl.style.display = 'none'; dv.style.display = 'none'; }
  const qhintEl = document.getElementById('qhint');
  const batchTotEl = document.getElementById('bb_tot');
  if (qtyIsZero) { qhintEl.textContent = '(0 шт)'; qhintEl.style.color = 'var(--red)'; }
  else if (qtyNonInt) { qhintEl.textContent = '(' + qty + ' шт)'; qhintEl.style.color = 'var(--red)'; }
  else { qhintEl.textContent = '(' + qty + ' шт)'; qhintEl.style.color = ''; }
  if (batchTotEl) { batchTotEl.style.color = ''; }
  set('bb_tot', costAll);
  set('bb_pl', filamentCost); set('bb_pr', printerTot); set('bb_el', elecTot);
  set('bb_ma', maintTot); set('bb_op', opTot);
  set('bb_ex', xFixed + (xParts + xPack) * qty);
  const dbl = document.getElementById('bb_defL'), dbv = document.getElementById('bb_def');
  if (defAddAll > 0) { dbl.style.display = ''; dbv.style.display = ''; document.getElementById('bb_defP').textContent = ''; set('bb_def', defAddAll); }
  else { dbl.style.display = 'none'; dbv.style.display = 'none'; }
  updateSales();
  triggerAutosave();
}

// ── SECURITY HELPERS ─────────────────────────────────────────
function escH(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function safeNum(v, def = 0, min = -Infinity, max = Infinity) {
  const n = +v;
  if (!isFinite(n) || isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

// ── ЭКСПОРТ ТОЛЬКО НАСТРОЕК ─────────────────────────────────
function exportCfgOnly() {
  const blob = new Blob([JSON.stringify({cfg}, null, 2)], {type: 'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = '3dprint_settings.json'; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// ── КАЛЬКУЛЯТОР СТОИМОСТИ СУШКИ ──────────────────────────────
function syncDryerSel() {
  const sel = document.getElementById('dryer-cost-sel'); if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = cfg.dryers.map(d => `<option value="${d.id}">${escH(d.name)}</option>`).join('');
  if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
  updateDryerCost();
}
function adjDryHours(d) {
  const el = document.getElementById('dryer-hours'); if (!el) return;
  el.value = Math.min(48, Math.max(1, (+el.value || 8) + d));
  updateDryerCost();
}
function updateDryerCost() {
  const sel = document.getElementById('dryer-cost-sel');
  const hEl = document.getElementById('dryer-hours');
  const res = document.getElementById('dryer-cost-result');
  const hint = document.getElementById('dryer-cost-hint');
  if (!sel || !hEl || !res) return;
  const dryer = cfg.dryers.find(d => d.id === sel.value);
  const h = safeNum(hEl.value, 8, 1, 48);
  if (!dryer || dryer.kw === 0) { res.textContent = ''; res.style.display = 'none'; if (hint) hint.style.display = 'none'; return; }
  res.style.display = '';
  const cost = dryer.kw * h * cfg.electricity;
  res.innerHTML = escH(dryer.name) + ' × ' + h + ' ч × ' + cfg.electricity + '\u00a0' + (cfg.currency || '₽') + '/кВт·ч = <b>' + fmt(cost) + '</b>';
  if (hint) hint.style.display = 'none';
}

// ── СОХРАНЕНИЕ И СКАЧИВАНИЕ EXCEL ────────────────────────────
function openSaveAndDownloadMo() {
  const orderName = gv('order-name').trim();
  document.getElementById('proj-name').value = orderName;
  document.getElementById('dup-warn').style.display = 'none';
  document.getElementById('mo-save-btn').textContent = 'Сохранить и скачать';
  document.getElementById('mo-save-btn').onclick = confirmSaveAndDownload;
  openM('mo-save');
  setTimeout(() => document.getElementById('proj-name').focus(), 100);
}
function confirmSaveAndDownload() {
  const name = document.getElementById('proj-name').value.trim() || 'Без названия';
  const dup = reg.find(r => r.name === name);
  if (dup) {
    pendRep = name;
    document.getElementById('replace-txt').textContent = 'Расчёт "' + name + '" уже есть. Заменить?';
    closeM('mo-save'); openM('mo-replace');
    window._pendingDownload = true;
    return;
  }
  doSave(name);
  exportOne(reg.find(r => r.name === name)?.id);
}

// ── ОЧИСТКА ПОИСКА ───────────────────────────────────────────
function clearRegSearch() {
  const q = document.getElementById('reg-q'); if (q) { q.value = ''; renderReg(); }
}

// ── УДАЛЕНИЕ С ПОДТВЕРЖДЕНИЕМ ────────────────────────────────
let _pendDelCb = null;
function _openDelConfirm(title, name, hint, cb, color) {
  _pendDelCb = cb;
  document.getElementById('del-confirm-title-text').textContent = title;
  const textEl = document.getElementById('del-confirm-text');
  if (color) {
    textEl.innerHTML = '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + color + ';margin-right:6px;flex-shrink:0;vertical-align:-1px"></span>' + escH(name);
  } else {
    textEl.textContent = '«' + name + '»';
  }
  const hintEl = document.getElementById('del-confirm-hint');
  if (hint) { hintEl.textContent = hint; hintEl.style.display = ''; }
  else       { hintEl.style.display = 'none'; }
  openM('mo-del-confirm');
}
function execDelConfirm() {
  if (_pendDelCb) { _pendDelCb(); _pendDelCb = null; }
  closeM('mo-del-confirm');
}
// Реестр
function confirmDelSnap(id, name) {
  _openDelConfirm('Удалить расчёт?', name, '⚠ Расчёт будет полностью удалён из кэш-памяти браузера.', () => {
    reg = reg.filter(x => x.id !== id); svR(); renderReg();
  });
}
function execDelSnap() { execDelConfirm(); } // обратная совместимость
// Настройки — Сушилки
function confirmDelDryer(id, name) {
  if (id === 'd1') return;
  _openDelConfirm('Удалить сушилку?', name, '', () => {
    cfg.dryers = cfg.dryers.filter(d => d.id !== id);
    cfg.printers.forEach(p => { if (p.dryerId === id) p.dryerId = cfg.dryers[0]?.id || ''; });
    renderDryers(); renderPrinters(); svC();
  });
}
// Настройки — Принтеры
function confirmDelPrinter(id, name) {
  _openDelConfirm('Удалить принтер?', name, '', () => {
    cfg.printers = cfg.printers.filter(p => p.id !== id); renderPrinters(); svC();
  });
}
// Настройки — Филаменты
function confirmDelFilament(id) {
  const f = cfg.filaments.find(p => p.id === id);
  if (!f) return;
  const colorName = (_PALETTE.find(e => e.c === f.color) || {n: f.color || '?'}).n;
  const price = f.pricePerKg != null ? f.pricePerKg + ' ' + (cfg.currency || '₽') + '/кг' : '';
  const detail = [f.name, colorName, price].filter(Boolean).join(' — ');
  _openDelConfirm('Удалить филамент?', detail, '', () => {
    cfg.filaments = cfg.filaments.filter(p => p.id !== id); renderFilaments(); svC();
  }, f.color);
}
// Настройки — Налоги
function confirmDelTax(id, name) {
  if (id === 'none') return;
  _openDelConfirm('Удалить налоговый режим?', name, '', () => {
    cfg.taxes = cfg.taxes.filter(t => t.id !== id); renderTaxes(); svC();
  });
}

// ── ИНИЦИАЛИЗАЦИЯ ─────────────────────────────────────────────
// Все функции готовы — теперь запускаем приложение.
// Сплеш будет скрыт по окончании CSS-анимации fadeOut (см. initSplash выше).
// Инициализация столов
if (tables.length === 0) addTable(); else renderTables();
renderTaxOps();
_syncCurrencyLabels();
restoreAutosave();
calc();
autosaveReady = true;

// ── СОХРАНЕНИЕ ПРИ УХОДЕ СО СТРАНИЦЫ ────────────────────────
// Защита от закрытия вкладки до истечения debounce (1500мс).
// visibilitychange — iOS Safari выгружает вкладку в фоне.
// pagehide — универсальный аналог beforeunload для мобильных.
function flushAutosave() {
  if (!autosaveReady) return;
  clearTimeout(autosaveTimer);
  const snap = {
    ts: Date.now(),
    orderName: gv('order-name'),
    tables: tables.map(t => ({...t})),
    qty: gv('qty'),
    extraFixed: gv('extraFixed'), extraParts: gv('extraParts'), packaging: gv('packaging'),
    prepTime: gv('prepTime'), postTime: gv('postTime'), logTime: gv('logTime'),
    commission: gv('commission'), commFixed: gv('commFixed'),
    customPrice: gv('custom-price'), selP, selT,
  };
  try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snap)); } catch(e) { console.warn('flushAutosave failed', e); }
}
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'hidden') flushAutosave();
});
window.addEventListener('pagehide', flushAutosave);

// ── EVENT LISTENERS ───────────────────────────────────────────
// Числовые инпуты и select'ы (кроме кастомных) — пересчёт при изменении
document.querySelectorAll('input[type=number]:not(#custom-price):not([id^="hc"]):not([id^="s_"]),select').forEach(el => el.addEventListener('input', function(){ calc(); checkAllFields(); }));
document.getElementById('commFixed').addEventListener('input', updateSales);
document.getElementById('custom-price').addEventListener('input', function() {
  if (selP === 'custom') updateSales();
});
// #printer убран в мультистол — onPrinterChange вызывается через onTableChange
document.getElementById('proj-name').addEventListener('keydown', e => { if (e.key === 'Enter') confirmSave(); if (e.key === 'Escape') closeM('mo-save'); });

const ri = document.getElementById('rename-input');
if (ri) ri.addEventListener('keydown', e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') closeM('mo-rename'); });

// ── ESTIMATE MODAL (smeta) ──────────────────────────────────
let estSel = 'unit';

function getCurrentUnitPrice() {
  const customV = +gv('custom-price') || 0;
  const prices = {
    wholesale: comp.wholesale || 0,
    retail_light: comp.retailLight || 0,
    retail: comp.retail || 0,
    custom: customV
  };
  return prices[selP] || 0;
}

function openEstimateMo() {
  estSel = 'unit';
  document.querySelectorAll('.est-opt').forEach(o => o.classList.toggle('on', o.getAttribute('data-est') === 'unit'));
  document.getElementById('est-qty-row').style.display = 'none';
  sv('est-custom-qty', '');
  sv('est-order-name', gv('order-name'));
  updateEstPrices();
  openM('mo-estimate');
}

document.getElementById('est-order-name').addEventListener('input', function() {
  sv('order-name', this.value);
});

function selectEst(which) {
  estSel = which;
  document.querySelectorAll('.est-opt').forEach(o => o.classList.toggle('on', o.getAttribute('data-est') === which));
  const qtyRow = document.getElementById('est-qty-row');
  qtyRow.style.display = (which === 'custom') ? 'flex' : 'none';
  if (which === 'custom') {
    setTimeout(() => document.getElementById('est-custom-qty').focus(), 50);
  }
  updateEstPrices();
}

function updateEstPrices() {
  const unitPrice = getCurrentUnitPrice();
  const batchQty = +gv('qty') || 1;
  const customQty = +gv('est-custom-qty') || 0;
  document.getElementById('est-p-unit').textContent = fmt(unitPrice);
  document.getElementById('est-batch-qty').textContent = '(' + batchQty + ' шт)';
  document.getElementById('est-batch-sub').textContent = fmt(unitPrice) + ' / шт × ' + batchQty + ' шт';
  document.getElementById('est-p-batch').textContent = fmt(unitPrice * batchQty);
  if (customQty > 0) {
    document.getElementById('est-custom-sub').textContent = fmt(unitPrice) + ' / шт × ' + customQty + ' шт';
    document.getElementById('est-p-custom').textContent = fmt(unitPrice * customQty);
  } else {
    document.getElementById('est-custom-sub').textContent = 'Введите количество штук';
    document.getElementById('est-p-custom').textContent = '—';
  }
}

function updateEstCustom() {
  updateEstPrices();
  if ((+gv('est-custom-qty') || 0) > 0 && estSel !== 'custom') {
    selectEst('custom');
  }
}

// ── Inter TTF subset (base64) — кириллица + латиница, OFL лицензия ─────────
const _INTER_REGULAR_B64 = 'AAEAAAAPAIAAAwBwR0RFRjulPC0AAK8QAAABKkdQT1O31EiWAACwPAAAZfBHU1VCVpcmiQABFiwAACNsT1MvMnP9FH8AAKd8AAAAYFNUQVRWp0HzAAE5mAAAAF5jbWFwUcVfgAAAp9wAAATKZ2FzcAAAABAAAK8IAAAACGdseWYc3XieAAAA/AAAljRoZWFkMrpasQAAnJgAAAA2aGhlYRZ2FfEAAKdYAAAAJGhtdHjelgp9AACc0AAACohsb2NhoZ978gAAl1AAAAVGbWF4cAK9APYAAJcwAAAAIG5hbWU4EVeLAACsqAAAAj5wb3N0/sYAjAAArugAAAAgAAIALQAABUcF0gANABEAAHMBMwEjASYmJzMGBgcBEzUhFS0CH9gCI8b+xR5NNyc3Txv+ykwC9QXS+i4Dd1Txvb71T/yJAaClpQD//wAtAAAFRwd6BiYAAQAAAAcCiwBnAYL//wAtAAAFRwdqBiYAAQAAAAcB7wC+AYL//wAtAAAFRweJBiYAAQAAAAcB7AEvAYL//wAtAAAFRweJBiYAAQAAAAcB6wHWAYL//wAtAAAFRweJBiYAAQAAAAcCjQEZAYL//wAtAAAFRwf6BiYAAQAAAAcCkQGNAAD//wAtAAAFRwXSBgYAAQAA//8ALQAABUcHiQYmAAEAAAAHAo4BMwGC//8ALQAABUcHegYmAAEAAAAHAosAZwGCAAIALQAAB28F0gAPABMAAHMBIRUhESEVIREhFSERIwETNSEVLQLDBHf9IwKs/VQC5fxmaP2MiAKuBdKm/hKm/g6mBU/6sQGnn5///wAtAAAHbwXSBgYACwAAAAMArQAABMkF0gATAB0AJwAAcxEhMhYWFRQGBgcVHgIVFAYGIyUhMjY1NCYmIyE1ITI2NjU0JiMhrQISm81nQm5ESopbauCx/psBYa2bTY5j/pUBUFOCS4yP/qsF0mmycF59TBQMBlefcnS1aaaFZ0x9SaA+ck1lhgD//wCtAAAEyQXSBgYADQAAAAEAc//rBWoF5wAlAABFIiQCNTQSJDMyHgIXIy4DIyIGAhUUEhYzMj4CNzMOAwMOwv7Sq6sBLsJyyqFrFL0QTXCHS4vbfX7bikuHb04RvBNsoMoVvAFY6esBV71DgLZ0TnZSKYz+97y7/veLKlF2TXK1gUT//wBz/lUFagXnBiYADwAAAAcCkAIE//cAAgCtAAAFRAXSABUAGQAAYSE1ITI2EjU0AiYjITUhMgQSFRQCBAERIxECff6YAVy28HZ1567+igGD2gE1pab+wv4JvKaMAQW1swECi6ay/rPn6f6xtAXS+i4F0gABAK0AAARNBdIACwAAcxEhFSERIRUhESEVrQOZ/SMCqv1WAuQF0qb+Gqf+B6b//wCtAAAETQeJBiYAEgAAAAcB7ADyAYL//wCtAAAETQeJBiYAEgAAAAcB6wGZAYL//wCtAAAETQeJBiYAEgAAAAcCjQDcAYL//wCtAAAETQd6BiYAEgAAAAcCiwAqAYL//wCtAAAETQXSBgYAEgAA//8ArQAABE0HiQYmABIAAAAHAewA8gGC//8ArQAABE0HegYmABIAAAAHAosAKgGC//8ArQAABE0HiQYmABIAAAAHAo4A9gGCAAEArQAABDoF0gAJAABzESEVIREhFSERrQON/S8Cj/1xBdKm/gem/XMAAAEAc//rBXgF5wAnAABFIiQCNTQSJDMyHgIXIy4DIyIGAhUUEhYzMjY2NRchNSEVFAIEAxHH/tOqqQErwXbOomwTwBZNa4dQh9h+f9uMfsJvOf5EAjug/usVvQFX6esBV71Hg7RtSHVTLYv+9727/viMbMaGCqWit/7vlwABAK0AAAU1BdIACwAAcxEzESERMxEjESERrbwDELy8/PAF0v17AoX6LgKn/VkAAgCt/lcFNQXSAA8AGwAAQTUWFjMyNjURMxEUBiMiJgERMxEhETMRIxEhEQOqESgLTzy8k44hOPzyvAMQvLz88P5engICMTQBI/7Ve4MEAaUF0v17AoX6LgKn/VkA//8Arf7ABcUF0gQmAB0AAAAHApYElgAA//8Arf7ABfcF0gYmAB0AAAAHApUEFQAAAAIArQAAB3kF0gADAA8AAEEVIScBETMRIREzESMRIREHef2GgPwuvAMQvLz88AXSoKD6LgXS/XsChfouAqf9Wf//AK0AAAU1BdIGBgAdAAAAAQCtAAABaQXSAAMAAEERIxEBabwF0vouBdIA////wwAAAlMHegYmACMAAAAHAov+uAGC//8ABAAAAWkHiQYmACMAAAAHAez/fwGC//8ArQAAAhAHiQYmACMAAAAHAesAJgGC////ywAAAkoHiQYmACMAAAAHAo3/aQGC//8ArQAAAWkF0gYGACMAAP//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BV4ALQUBAHIEagBYBGoAWARqAFgEagBYBGoAWARqAFgEagBYBGoAWARqAFgEagBYB0IAWAdCAFgE0QCXBNEAlwR8AGEEfABhBHwAYQTRAGEE0QBhBJUAYQSVAGEElQBhBJUAYQSVAGEElQBhBJUAYQSVAGEElQBhBJUAXQLZABME0gBhBKcAlwSnAAIEpwACBKcAlwHgAHYB4ACXAeD/qAHg/+kB4ACXAeD/sQHg/98B4AB2AeD/qAHg/98B4P/fBFEAlwHgAJcC0gCXAeAAlwbxAJcEpgCXBKYAlwS1AGEEtQBhBLUAYQS1AEsEtQBhBLUAYQS1AGEEtQBhBLUAYQS1AGEI9QBhBNEAlwTSAJcE0QCXBNEAYQLqAJcEIQBlBCEAZQTcAK0ClwATBKcAlwSnAJcEoQCXBKcAlwSnAJcEpwCXBGgAMQZuAD0ETAA5BEwAOQRoADEEaAAxBGgAMQRoADEEaAAxBGgAMQRoADEEaAAxBPYALQT2AC0E9gAtBEkAdwUGAKEF4gCtBvoArQUbAK0EjgCtBLIAFQZ2AFcHmwAyB8AAMgToAHcFTwCtBUQArQVlAK0F6QBXBhcAcwW3AK0E9gAtBpgAcwW2AK0HRgBXBYoAlwWmAJcFigCXBYoArQcDAFcHmACtB7QArQZ4AFcG8gCtBSQArQjYAFcI8gCtBdQAaggXAK0FIQBABSgArQjOAK0F1ABzB9IAcwayABMF8AB5BOkAdwWUAC0GrABXBJkAYQRoADEGJwCXBKsAYQRzAJcDdwCXA3cAlwN3AAIE3wAkBmkAOQaRADkD5wBZBKoAlwSqAJcERQCXBKIAlwRyAJcEngCXBPkAEwSQABMEkAATBhYAlwYWAJcEpACXBMAAlwVmAJcEpACXBKQAlwSkAJcDtgATBW0AYQQYADkEeQA5BLkAlwSkAJcEjwCXBKsAlwSPAJcGgwCXBp8AlwRoAJcFHAATBcsAlwTdABME3QATB1gAKwcgAJcEfABcBqMAlwRhACoERwCXB1AAlwR8AGEGLgBhBT4AEwWnABME6QB3BLAAMQUWAGwEfABhBFcAFwTWAGcEsQBbBYkARQVGAC0ERgAzBRoAWweHAK0FRAA/BZ4ALQeSACUE1gBnBXQALQT/AGcGGgAnBfEAcwXUAHMF1ABzBcgAcwUaAFcLAABhBs4AlwZ2AK0FwACRCN8ArQW+AJEEzf/wBTUArQUEAHMDLQBVBMsAiwToAHcFHgBpBLcAdQTmAHMEcABXBOIAcwTmAHME6QB3BRcAYQN3AFcCLgCTBFwAkwIxAJMGSwCTBB0ATgg6AE4GSwBOBB0AYwQHAE4CzQDKAs0AVwLNANMCzQDTAs0AcQLNAHEDVgCJA1YAcQe+AHMCzQDKAs0AVwLNANMCzQBxA1YAiQNWAHEHvgBzBQIAGwW9AHEC0gAnApgA/wIZALkC0gAnA6AAiQQAAAAFLgBgCAAAAAgAAAAEZADyBGQBJgRkAVcErQCLBK0AlQOgAIkEAAAABS4AYAgAAAAEZADyBGQBJgRkAVcErQCLBK0AlQH2AI4B9gCOAlEAygOeAMoDWACOA1gAjgMyAGgB0ABoAfYARwNYAEcBuABfA2wAXwUgAF8G1ABfAbgAXwNsAF8FIABfAi8AcAIvAJMGjQCTBF4AkwIvAJMCLwCTAkYAcAIvAJMC+ABbAvgARwSOAFsEjgBHBTwAqQU8AOQFPADbBTwAvAU8AMsFPADLBTwAxwU8AJ8FPACpBTwA5AU8ANsFPAC8BTwAywU8AMsFPADHBTwAnwU8ANwDpQAAA94AawPeAGsDtgBLA/MAawUaALwFRABcB0IAoQOWAHsDkwBBA8sASQGKAFEDYQBZBMAAZATAAK0EfgBzAlsAWQNvAGgDfQBiAWv+YAMQAEwCEQBGAusAXQMIAF4DHwBUAvMAaAMFAEwCvgBDAv8ATAMFAEwDGQB4AxoAhQHdAH0B3QA7AbIAbwG8AFQDEABMAhEARgLrAF0DCABeAx8AVALzAGgDBQBMAr4AQwL/AEwDBQBMAxkAeAMaAIUB3QB9Ad0AOwGyAG8BvABUBp0ARgZHAEYG6wBeB5wA0ApnANANMQDQAnAAlgPKAJgCcACEBKYBCwOyAMQCFgCWAAAAlgAAAIQAAACEAAAAxAAAANsCMgAAAjIAAAFmAAACMgAABF4AAAi6AAAEAAAACAAAAAKsAAACAAAAAVQAAAUuAAACLwAAAWYAAACsAAAAAAAACK0ArQeUAMMKrADDFWYAwwqsAMMHlAD5CqwA+RVmAPkHlAD5CqwA+QqsAMMN8gDDCqwAww3yAMMHlADDCqwAwxVmAMMKrADDB5QA+QqsAPkVZgD5B5QA+QqsAPkKrADDDfIAwwqsAMMN8gDDBdwAFQRyAK0EpACXBhYAlwO2ABMEjgCtBI4ArQSOAK0Ejv/wBU8ArQXiAK0FEACtBdQAcwUaAFcE9gAtBWQAMgcZAK0FewAWB5YArQV0AC0HcQCtBsIAlwkbAK0ESwB3BvoArQWUAC0KfwBzBOgAdwXUAHMFGgBXBV4ALQVeAC0GsgATAhYArQebADIF6QBXBaYAlwXwAHkHmwAyBOgAdwXUAGoFigCXBvIArQVkADIFqQBzBXsAFgN3AJcDdwCXA3cAAgSqAJcEqgCXBEUAlwZiAJcGLwCXBIUAMQYpAJcFjABgB58AlwQaAFMGJwCXBLAAMQPnAFkEfABhA7YAEwRoADEEaAAxBacAEwZpADkEqwCXBJUAXQSVAF0GaQA5A+cAWQSqAJcEqgCXBLUAYQS1AGEEfABcBI8AlwXLAJcETAA5BHMAYQW6AIEDkwBXA44AUQZ5AEUCLwCTAi8AkwREAFIFDABhAkYAkwZ5AEUD8wBrBnIANwREANMFvgB/BnkARQRTAIEDxAD/AtAAIQLQACEDkf/3BP8AbQXEAJsFtAByAAD6EAAA+iUAAPxRAAD8ZQAA/VsAAP2bAAD8KwAAAQsAAAB0AAAAYgAAAGcAAAArAAAAlgAAACsEwgACAs4AKAGiAIACLgChAWEAMgGzAIACCgAyBKsArQSzAEoEpACXAVwAUwQ6AEAFtwCtA5cAiQOMADIDZgAyAAEAAAfA/hIAABVm+hD31xSjCAAAAAAAAAAAAAAAAAAAAAKiAAQFDwGQAAUAAAUzBM0AAACaBTMEzQAAAs0AjAKXAAACAAUDAAAAAgAEgAACAwAAAAoAAAAAAAAAAFJTTVMAwAAgIRYHwP4SAAAI3QKUAAABBQAAAAAEUAXSAAAAIAAMAAAAAgAAAAMAAAAUAAMAAQAAABQABAS2AAAAJgAgAAQABgAvADkAfgCsAP8EeQSdBP8gCyAnIFUgVyBfIK8gtSC6IL8hFv//AAAAIAAwADoAoACuBAAEgASgIAAgECAvIFcgXyCgILEguCC8IRb//wAAAQ4AAAAAAAAAAAAAAADh9AAAAADhM+GUAAAAAAAAAADg6gABACYAAABCAMoA4gGEAnYCsAAAA2wDmgAAAAAD4gQABAgEDAAAAAAB8AFLAYABZAEgAeIBSQF/AVQBVQGvAZ0BjgFqAY8BZgGSAZQBmgGcAZsBTwFcAAEADQAPABEAEgAbABwAHQAjACoALAAvADAAMwA7AEcASQBKAEsATQBOAFMAVABVAFgAWgFWAWkBWAGuAasB5wBbAGcAaQBsAG4AeAB5AHoAfgCHAIkAigCNAI4AkACbAJ4AnwCgAKMApACqAKsArACuALkBWgFnAVsBoQHxAU0BIQEjAWUBIgFoAboB6AGyAbQBmAGqAbEB6QGzAaABvAG9AeUApgG4AZUB6gG7AbUBmQHgAd8B4QFSAAQABQAGAAMAAgAHAAsAEAATABQAFQAWACUAJgAnACQCGwA0AD8AQABBAD0APAGeAD4ATwBQAFEAUgBZALoAogBfAFwAXQBhAF4AYABlAGoAcABxAHIAbwCBAIIAgwCAAOYAjwCUAJUAlgCSAJEBnwCTAKcAqACpAKUAsABoAK8AGAAZAOUCIQDfAEwAKAApACsA2ADZANICJAA2AikAyQAIAL0ADgIgAMAAFwDBAMMANQA3AMQAxwAyACIAQwIlAiYCJwIoAMoAywIqAMwAzgDTANQA1QDWANcA2gDbANwAYgDpAOoA6wDuAHMA7wDxAPICTAD0APkA+wD9AJgBAgCdAGsBAwCxAQQArQEHAQkBDAENAQ8BEAEOARUBFgEXAHQAdQB8AkkBGgChAIUAhgCIARMBFAB7Ak4CTQCyAQgCKwJPAiwBEgItAlACLgJRAi8CUgIwAlMCMQJUAjICVQIzAlYAyACXAOQBHwI0AlcCNQCaAkcCbAKBAoYChwKIAokCigKEAoUAOgDzAkgBEQBIAJwAvgDsAiMCSwDdARgAwgDwAjYCWAAuAPYAxQD3AC0A+AAfAP4AIQD/AN4BGQDgARsCNwJZAjgCWgI5AlsCOgJcAFYBBgDNARwAzwEKANABCwDRAH0A4QEdAjsCXQI8Aj0CXgDGAPUCPgD6AB4BAAAgAQECPwJfADEA/ACMAAkAYwAKAGQADABmABoAdgDiAmACQAJhAkECYgJCAmMA4wEeADgCZAA5AmUARACZAEUCZgBGAmcCQwJoALYAswC3ALQAuAC1AkQCaQIiAkoCRQJqAL8A7QBXAQUCRgJrAn4CfwFsAWsBbQFuAn0CgAF9AX4BhAGFAYEBggGDAYYBrAGtAW8BcQJyAZEBkAJxAfIB4wHkAYcBiAGJAYsBjAGNAm4BlgGXAnQBTAFTAnMCdgJwAm8CbQFwAb4BVwFZAVABUQFOAUoBuQFyAXMCdwJ1AngCeQKDAnoCewJ8AoIBMgE0ATwBLQE3ATABKQE6ASwBOABtASYBKwE1ATYBKgExAS4BLwEzASgBJwEkATkBJQE7AT0AAAAAAAwAlgADAAEECQAAAJAAAAADAAEECQABABQAkAADAAEECQACAA4ApAADAAEECQADADgAsgADAAEECQAEACQA6gADAAEECQAFADYBDgADAAEECQAGACIBRAADAAEECQEBAAwBZgADAAEECQE4ABgBcgADAAEECQE8AAgBigADAAEECQFAAAwBkgADAAEECQFBAAoBngBDAG8AcAB5AHIAaQBnAGgAdAAgADIAMAAxADYAIABUAGgAZQAgAEkAbgB0AGUAcgAgAFAAcgBvAGoAZQBjAHQAIABBAHUAdABoAG8AcgBzACAAKABoAHQAdABwAHMAOgAvAC8AZwBpAHQAaAB1AGIALgBjAG8AbQAvAHIAcwBtAHMALwBpAG4AdABlAHIAKQBJAG4AdABlAHIAIAAxADgAcAB0AFIAZQBnAHUAbABhAHIANAAuADAAMAAxADsAUgBTAE0AUwA7AEkAbgB0AGUAcgAxADgAcAB0AC0AUgBlAGcAdQBsAGEAcgBJAG4AdABlAHIAIAAxADgAcAB0ACAAUgBlAGcAdQBsAGEAcgBWAGUAcgBzAGkAbwBuACAANAAuADAAMAAxADsAZwBpAHQALQA2ADYANgA0ADcAYwAwAGIAYgBJAG4AdABlAHIAMQA4AHAAdAAtAFIAZQBnAHUAbABhAHIAVwBlAGkAZwBoAHQATwBwAHQAaQBjAGEAbAAgAFMAaQB6AGUAMQA4AHAAdABJAHQAYQBsAGkAYwBSAG8AbQBhAG4AAAADAAAAAAAA/sMAjAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAf//AA8AAQAAAAwAAAAAAAAAAgAvAAEAQQABAEMAZwABAGkAdgABAHgAhgABAIkAoQABAKMApQABAKcAuQABAL4AvwABAMEAxAABAMcAygABAMwA3QABAN8A3wABAOEA5QABAOsA7QABAO8A9AABAPYA9gABAPgBAwABAQYBDQABARABEAABARMBEwABARUBFgABARgBGgABARwBIQABASkBKQABAS4BLgABATABMwABATUBNQABAToBOgAB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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/6QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/7sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/iAAAAAAAAAAAAAAAAAAD/swAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+zAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/uwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/S/5gAAAAAAAAAAP/bAAAAAAAAAAAAAAAAAAAAAP+7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/M/5gAAAAA/6MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/lAAAAAAAAAAAAAAAgAAAAAP/YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+7AAAAAAAAAAAAAP/NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+w/88AAAAAAAD/9QAAAAAAAAAAAAAAAAAAAAAAAP/3AAAAAP/uAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/9QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/1IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/68AAAAAAAAAAP+jAAAAAP+AAAAAAP+7AAAAAAAAAAAAAP+YAAAAAP+YAAAAAAAAAAAAAAAAAAAAAAAAAAD/uwAA/4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP9XAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/9QAAAAAAAAAAAAD/xgAAAAAAAAAAAAAAAAAA/5sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/z//q/6MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/68AAAAAAAD/7wAAAAAAAP+YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8j/t4AAAAAAAAAAAAAAAAAAAAAAAAAAAAA/4wAAP+7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/dgAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+vAAAAAAAAAAAAAAAAAAAAHQAA/68AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAXQAAAAAAAAAAAAD/uwAAAAAAAP+jAAAAAAAAAAAAAP+v/t4AAAAAAAD/6gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/YAAAAAP/pAAAAAAAAAAAADQAA/6//7AAAAAAAAAAAAAAAAAAA/+MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/sAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+kAAP/z/5gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/7wAAAAAAAP+jAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/7sAAP8A/t4AAAAAAAD/mAAJAAAAAAAAAAD/4AAA/4kAAP+AAAAAAAAAAAAAAAAAAAAAAP/eAAAAAAAA/5gAAP/jAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/rgAAAAAAAP/uAAD/vwAAAAAAAAAAAAAAAAAAAAAAAAAA/+0AAAAAAAAAAAAA//AAAAAAAAAAAAAAABYAAAAAAAAAAAAAAAAAAAAAAAAAAP+vAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/7gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQBrAKYBIAEhASkBMQEyATMBNgE6AT0BPgE/AUABQQFCAUUBRgFHAU8BUgFTAVQBVQFWAVgBWgFbAVwBXQFfAWEBZgFnAWkBagFvAXABcQFyAXMBdAF4AX0BfgF/AYABgQGCAYMBhAGJAY4BjwGQAZIBlAGVAZYBlwGYAZkBnAGdAZ4BnwGgAaEBpAGlAaYBpwGoAakBrAGtAa4BrwGwAbEBsgGzAbgBuQG7AbwBvQG+Ab8BwQHDAcYByAHNAc4B0AHXAd0B3gIBAgICAwIEAg4CDwIQAhECdQACAFEApgCmACgBIAEgACQBIQEhAA4BKQEpACoBMQExACcBMgEzABoBNgE2AA4BOgE6ACsBPQE9ABkBPgE+ABcBPwE/AAMBQAFAAC8BQQFBABUBQgFCABsBRQFFACwBRgFGABUBRwFHABcBTwFPABYBUgFSAB8BUwFTABYBVAFUABABVQFVABEBVgFWABABWAFYABEBWgFaABABWwFbABEBXAFcAAwBXQFdAAgBXwFfAAgBYQFhAAgBZgFmAC4BZwFnAAMBaQFpAAcBbwFxAAIBcgFyACMBcwFzAAIBeAF4AAIBfQF9AA0BfgF+AAoBfwGAAAsBgQGBAA0BggGCAAoBgwGEAAkBiQGJAAoBjgGQAAYBkgGSAAQBlAGUAAQBlgGWAB0BlwGXAB4BmAGYAB0BmQGZAB4BnAGcAAEBngGeAAIBoAGgAAEBpAGkAAEBpgGmAAIBqAGoAAEBrAGtABQBrgGvAA8BsAGwAAIBsQGxACIBsgGyAAwBswGzAA8BuAG4AAMBuQG5ACkBuwG7ACEBvAG8ADEBvQG9AAUBvgG+ACYBvwG/ABgBwQHBADABwwHDABwBxgHGAC0ByAHIABgBzQHOABIB0AHQACAB1wHXACUB3QHeABMCBAIEAAECEQIRAAECdQJ1AAQAAgBUAG0AbQAMAKYApgAqASABIAAkASEBIQAMASkBKQADATEBMwAGAToBOgADAT0BPQADAT4BPgASAT8BPwAaAUABQAAuAUEBQQAfAUIBQgAUAUQBRAASAUUBRQArAUYBRgAlAUoBSgAoAU8BTwARAVIBUgAYAVMBUwARAVUBVQAOAVgBWAAOAVsBWwAOAVwBXAAGAWYBZgAtAWcBZwADAWkBaQAiAWoBagABAW8BcgAEAXMBcwAjAXQBdAABAXgBeAAEAX0BfQALAX4BfgAJAX8BgAAKAYEBgQALAYIBggAJAYMBhAAIAYkBiQAJAY4BkAAHAZIBlAAFAZUBlQABAZYBlgAWAZcBlwAXAZgBmAAWAZkBmQAXAZwBnAACAZ0BnQABAZ4BngAEAZ8BnwABAaABoAACAaEBoQABAaQBpAACAaUBpQABAaYBpgAEAacBpwABAagBqAACAakBqgABAawBrQAQAa4BrwANAbABsAAEAbEBsQAeAbIBsgAGAbMBswANAbgBuAAZAbkBuQADAbsBuwAdAbwBvAAvAb0BvQAhAb4BvgApAb8BvwATAcABwAAbAcIBwgAgAcMBwwAVAcUBxQATAcYBxgAsAccBxwAmAc0BzgAPAdAB0AAcAdcB1wAnAgACAAADAgUCBwABAggCCQACAnUCdQAFAAEBVgAEAAAApghuCG4IbghuCG4IbghuCG4IbghuCEQIRAhEAqYEQARAB/QC2gLaB7YHtge2ArQIRAhECEQIRAhECEQIRAhECEQIRAhEB8QHxAhEB/QC2gLaAtoC2gLaB9IC4AhKCEoIKggqAuoDFAL0AvQIZAMOBnwGfAZ8AxQDGgRABDIEMgQyBDIEMgh0AyQIdAh0CHQIdAh0CHQIdAh0AyoH9Af0A+gDwAe2B7YIRAgqA9oD6APoCEQIRAfSBEAIZAhkCGQIZARABEAEQARAA+4D+AQyBEAIdARGBNQFFgeYB5gHmAeYB5gFbAWEBWwFhAV2BXYFhAiCCIIFkgXUBdoF1AXaBeQGWgeYBnwGngeYB54HngeeB54IRAekB/QH9Af0B/QHtgfECEQH9AhKCEQIbghuB9IIRAf0CCoIKghKCEQISghKCGQIbgh0CHQIdAiCAAEApgABAAIAAwAEAAUABgAHAAgACQAKAA8AEAARABsAHwAgACEAKgArACwALQAuAC8AOwA8AD0APgA/AEAAQQBDAEQARQBGAEcASABJAE0ATgBPAFAAUQBSAFMAVABVAFcAWABZAFoAeACAAIYAiQCLAI8AkQCSAJoAogCjAKQApQCnAKgAqQCqAKsArgCvALAAsQCyALMAtAC1ALoAvgC/AMAAwQDEAMUAyADKAMsAzADUANoA2wDkAPMA9AD2APcA+AD6APwA/gEBAQMBBwEIAQoBHwFJAU0BaQFvAXABcQFzAXgBfQF+AYEBggGDAYQBiQGSAZQBlQGWAZcBmAGZAZsBngGmAaoBqwGwAbQBtQG2AbcCGwIcAiACIQIiAiMCJAImAicCKAIqAi0CLgIvAjQCNwI4AjkCOgI9AkACQQJGAk4CUQJXAlsCXAJ1AAMBj/+7AZD/UgGr/7sACQFq/5gBhf+jAYb/owGJ/3UBlf+AAaH/rwGq/vUBr/+vAbP/owABAav/mAACAUn/mAGa/2kAAgGV/7sBmv+AAAYAHgCXADUAlwA6AJcAgQBFAIMARQIAAJcAAQIbAEUAAQGr/+MAAgF9/3UBgf91AAEBSf+7ACUAAf+vAAL/rwAD/68ABP+vAAX/rwAG/68AB/+vAAj/rwAJ/68ACv+vAAv/rwAM/68AKv+vACv/rwAt/4wATf+MAFP/mABa/68Ayv+YAM3/jADS/4wA1f+MAOT/mADl/4wBaf+YAX3/jAGB/4wBg/8AAYT/AAGO/y8Bj/8vAZD/LwIo/4wCLv+vAjT/mAI4/4wCUf+vAAYAzv+7AQP/gAEv/7sBlv+YAZj/mAGa/5gAAwGD/5gBhP+YAav/rwABAasAgAACAYP/aQGE/2kADgBbAAAAXAAAAF0AAABeAAAAXwAAAGAAAABhAAAAYgAAAGMAAABkAAAAZQAAAGYAAAEKAAABCwAAAAMBmv+vAar/uwGr/7sAAQGa/8YAIwAt/4wATf+MAFP/gABU/68AWP9pAFn/aQCq/7sAq/+7AK7/uwCv/7sAsP+7ALH/uwCy/7sAs/+7ALT/uwC1/7sAyv+AAM3/jADS/4wA1f+MAOT/gADl/4wBH/+7AbT/rwG1/68Btv+vAbf/rwIo/4wCNP+AAjj/jAI5/2kCOv9pAlf/uwJb/7sCXP+7ABAALf91AE3/dQBT/7sAWP91AFn/dQDK/7sAzf91ANL/dQDV/3UA5P+7AOX/dQIo/3UCNP+7Ajj/dQI5/3UCOv91ABUALf+vAE3/rwCq/5gArv+YAK//mACw/5gAsf+YALL/mACz/5gAtP+YALX/mADN/68A0v+vANX/rwDl/68BH/+YAij/rwI4/68CV/+YAlv/mAJc/5gAAgDA/5gA7v+MAAMAzv+AANX/mAED/5gAAwDA/68A7v+MARf/uwAQAFP/rwBV/6MAVv+jAFf/owBY/5gAWf+YAMH/owDK/68A5P+vAir/owI0/68COf+YAjr/mAI9/6MCQf+jAkb/owABANX/dQACAMH/mADV/3UAHQAt/14ATf9eAFP/aQBU/2kAVf+MAFb/jABX/4wAWP9GAFn/RgBa/4AAwP+7AMH/mADH/7sAyv9pAM3/XgDS/14A1f9pANj/uwDk/2kA5f9eAij/XgIq/4wCNP9pAjj/XgI5/0YCOv9GAj3/jAJB/4wCRv+MAAgALf+MAE3/jADN/4wA0v+MANX/jADl/4wCKP+MAjj/jAAIAC3/mABN/5gAzf+YANL/mADV/5gA5f+YAij/mAI4/5gAPgAP/68AEP+vABz/rwAt/4wAO/+vADz/rwA9/68APv+vAD//rwBA/68AQf+vAEP/rwBE/68ARf+vAEb/rwBJ/68ATf+MAE7/rwBP/68AUP+vAFH/rwBS/68AU/9eAIQAxQCHAMUAiADFAKr/XgCu/14Ar/9eALD/XgCx/14Asv9eALP/XgC0/14Atf9eAMAAdADD/6MAxwB0AMj/rwDK/14Ay/+vAM3/jADO/yMA0v+MANX/mADYAHQA2v+vAN//rwDk/14A5f+MAOn/owEf/14CJ/+vAij/jAI0/14CNf+vAjf/rwI4/4wCQP+vAlf/XgJb/14CXP9eAAEA1f9pAAEBSf+vAAQAWP+7AFn/uwI5/7sCOv+7AAMBlf+jAZr/dQGq/5gAAwFJ/7sBj/+7AZD/OwAIAF7/rwCS/6MBSf+YAVz/uwGV/68Bmv9pAar/gAGr/14ADQBe/68AYf+vAG//mACR/5gAkv+YAKb/LwCv/7sBSf+7AWb/mAGQ/1IBk/+vAZr/XgGr/4wABgFJ/4ABkP87AZX/mAGa/y8Bnv+jAar/mAABAav/rwAGAM7/uwED/4ABL/+7AZX/owGa/4wBqv+YAAIBmv9SAar/dQABASj/mAADAZD/aQGa/7sBq/9eAAEA1f+YAAEBhAAEAAAAvQeCB4IHggeCB4IHggeCB4IHggeCB24HaAdoBp4HaAdoB2gHaAdoB2gHaAdoB2gHaAdoB2gHaAdoB2gHaAduB24HbgduB24HbgduB24HbgduB24HbgaeAwIHeAd4BqgGqAeSB5IHkgeSB5IHaAeSB5IHkgeSB5IHkgeSB5IHkgNuA24DbgNuAwgDbgNuA24DbgdoB2gHaAeSB5IHkgeSB5IHkgeSB5IHkgeSB5IHkgeSB4gGngaeAx4HaAduB2gGqAduB2gHaAeSB2gHkgeSB5IHbgeSB5IHkgeIB4gHiAOCB4gDWAeSA4IDggN8A3wDbgeSB5IDfAN8B5IHkgN8B5IDggeSB5IDiAOmB5IDrAduA94GkAaQA/QEGgaQBpAEVAaQBpAGkAR+B24GkAaQBpAGkAaQBpAHbgaeBp4GngaeB2gGngd4B2gHkgeCB4IGngaoBrYHaAd4B24HeAd4B5IHiAeIB4gHkgeCB5IHiAeSB5IHkgeSB5IHkgABAL0AAQACAAMABAAFAAYABwAIAAkACgARAB0AHgAhACIAIwAlACYAKAAwADEAMgAzADQANQA2ADcAOAA5ADoAOwA8AD0APgA/AEAAQQBDAEQARQBGAEkATQBUAFUAVwBYAFkAZwBo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AAAAAP+jAAAAAP/8AAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAD/uwAAAAAAAAAA//wAAP9e/2kAAAAAAAAAAP+zAAAAAAAAAAAAAAAA/5j/0gAAAAD/mAAAAAAAAAAAAAD/owAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/6QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/mAAAAAAAAAAA/68AAP87/6MAAAAAAAAAAP+YAAAAAAAAAAAAAAAA/3X/uwAAAAD/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//IAAAAAAAAAAP/qAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABdAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFAAAAAAAAAAAAAAAAAAAAAAAAAAD/nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4gAAAAAAAAAAAAAAAAAAAAAAAAAA/7sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/iAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4AAAAAAAAAAA//QAAAAAAAAAAP/P//cAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/94AAAAAAAAAAABdAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/eAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/rwAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+0v9SAAAAAAAAAAAAAAAA/4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/0gAA/5gAAAAAAAAAAAAAAAAAAAAAAAD/2wAAAAAAAAAAAAAAAP+7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/7oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/wQAAABIAAAAA/9gAAP9M/0oAAAAAAAAAAP/GAAAAAAAAAAD/4gAA/5D/zwAA/9v/mAAAAAAAAAAAAAAAAAAAAAAAAAAA/7sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+7/XgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/OwAAAAAAAAAAAAAAAAAA/7sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/6QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/uwAAAAD/aQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/aQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/9QAgAAAAAAAAAAAAAP+7AAAAAAAAAAAAAP+6AAAAAAAAAAAAAAAA/+UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/2gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/uwAAAAAAAAAAAAAAAP+A/5gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/uwAAAAAAAAAA/7sAAP9G/vUAAAAAAAAAAP+vAAAAAAAA/7sAAAAA/4D/uwAA/7v/jAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/7sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/owAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/3UAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/1cAAAAAAAD/bAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xgAA//X/bwAA/+kAAAAAAAD/6f/vAAAAAAAAAAAAAP/yAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/bwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/owAA/7sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/owAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/94AAP9p/2cAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5gAAAAAAAD/mAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//IAAAAAAAAAAP/qAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABdAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/RgBFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/0gAAAAAAAAAAAAAAAP/S/8MAAAAAAAAAAP/1AAAAAAAAAAAAAAAA/9IAAAAAAAAAAABFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+M/5gAAAAAAAAAAAAAAAAAAAAA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CFYIYAhqCHQIfgiICJIInAimCLAIugjECM4I2AjiCOwI9gkACQoJFAkeCSgJMgk8CUYJUAlaCWQJbgl4CYIJjAmWCaAJqgm0Cb4JyAnSCdwJ5gnwCfoKBAoOChgKIgosCjYKQApKClQKXgpoCnIKegqCCooKkgqaCqIKqgqyCroKwgrKCtIK2griCuoK8gr6CwILCgsSCxoLIgsqCzILOgtCC0oLUgtaC2ILagtyC3oLgguKC5ILmAueC6QCEAAEAWoBagFqAhAABAFqAWoBawIQAAQBagFqAW0CEAAEAWoBagF0AhAABAFqAWoBdQIQAAQBagFqAXcCEAAEAWoBawFqAhAABAFqAWsBawIQAAQBagFrAW0CEAAEAWoBawF0AhAABAFqAWsBdQIQAAQBagFrAXcCEAAEAWoBbQFqAhAABAFqAW0BawIQAAQBagFtAW0CEAAEAWoBbQF0AhAABAFqAW0BdQIQAAQBagFtAXcCEAAEAWoBdAFqAhAABAFqAXQBawIQAAQBagF0AW0CEAAEAWoBdAF0AhAABAFqAXQBdQIQAAQBagF0AXcCEAAEAWoBdQFqAhAABAFqAXUBawIQAAQBagF1AW0CEAAEAWoBdQF0AhAABAFqAXUBdQIQAAQBagF1AXcCEAAEAWoBdwFqAhAABAFqAXcBawIQAAQBagF3AW0CEAAEAWoBdwF0AhAABAFqAXcBdQIQAAQBagF3AXcCEAAEAWsBagFqAhAABAFrAWoBawIQAAQBawFqAW0CEAAEAWsBagF0AhAABAFrAWoBdQIQAAQBawFqAXcCEAAEAWsBawFqAhAABAFrAWsBawIQAAQBawFrAW0CEAAEAWsBawF0AhAABAFrAWsBdQIQAAQBawFrAXcCEAAEAWsBbQFqAhAABAFrAW0BawIQAAQBawFtAW0CEAAEAWsBbQF0AhAABAFrAW0BdQIQAAQBawFtAXcCEAAEAWsBdAFqAhAABAFrAXQBawIQAAQBawF0AW0CEAAEAWsBdAF0AhAABAFrAXQBdQIQAAQBawF0AXcCEAAEAWsBdQFqAhAABAFrAXUBawIQAAQBawF1AW0CEAAEAWsBdQF0AhAABAFrAXUBdQIQAAQBawF1AXcCEAAEAWsBdwFqAhAABAFrAXcBawIQAAQBawF3AW0CEAAEAWsBdwF0AhAABAFrAXcBdQIQAAQBawF3AXcCEAAEAW0BagFqAhAABAFtAWoBawIQAAQBbQFqAW0CEAAEAW0BagF0AhAABAFtAWoBdQIQAAQBbQFqAXcCEAAEAW0BawFqAhAABAFtAWsBawIQAAQBbQFrAW0CEAAEAW0BawF0AhAABAFtAWsBdQIQAAQBbQFrAXcCEAAEAW0BbQFqAhAABAFtAW0BawIQAAQBbQFtAW0CEAAEAW0BbQF0AhAABAFtAW0BdQIQAAQBbQFtAXcCEAAEAW0BdAFqAhAABAFtAXQBawIQAAQBbQF0AW0CEAAEAW0BdAF0AhAABAFtAXQBdQIQAAQBbQF0AXcCEAAEAW0BdQFqAhAABAFtAXUBawIQAAQBbQF1AW0CEAAEAW0BdQF0AhAABAFtAXUBdQIQAAQBbQF1AXcCEAAEAW0BdwFqAhAABAFtAXcBawIQAAQBbQF3AW0CEAAEAW0BdwF0AhAABAFtAXcBdQIQAAQBbQF3AXcCEAAEAXQBagFqAhAABAF0AWoBawIQAAQBdAFqAW0CEAAEAXQBagF0AhAABAF0AWoBdQIQAAQBdAFqAXcCEAAEAXQBawFqAhAABAF0AWsBawIQAAQBdAFrAW0CEAAEAXQBawF0AhAABAF0AWsBdQIQAAQBdAFrAXcCEAAEAXQBbQFqAhAABAF0AW0BawIQAAQBdAFtAW0CEAAEAXQBbQF0AhAABAF0AW0BdQIQAAQBdAFtAXcCEAAEAXQBdAFqAhAABAF0AXQBawIQAAQBdAF0AW0CEAAEAXQBdAF0AhAABAF0AXQBdQIQAAQBdAF0AXcCEAAEAXQBdQFqAhAABAF0AXUBawIQAAQBdAF1AW0CEAAEAXQBdQF0AhAABAF0AXUBdQIQAAQBdAF1AXcCEAAEAXQBdwFqAhAABAF0AXcBawIQAAQBdAF3AW0CEAAEAXQBdwF0AhAABAF0AXcBdQIQAAQBdAF3AXcCEAAEAXUBagFqAhAABAF1AWoBawIQAAQBdQFqAW0CEAAEAXUBagF0AhAABAF1AWoBdQIQAAQBdQFqAXcCEAAEAXUBawFqAhAABAF1AWsBawIQAAQBdQFrAW0CEAAEAXUBawF0AhAABAF1AWsBdQIQAAQBdQFrAXcCEAAEAXUBbQFqAhAABAF1AW0BawIQAAQBdQFtAW0CEAAEAXUBbQF0AhAABAF1AW0BdQIQAAQBdQFtAXcCEAAEAXUBdAFqAhAABAF1AXQBawIQAAQBdQF0AW0CEAAEAXUBdAF0AhAABAF1AXQBdQIQAAQBdQF0AXcCEAAEAXUBdQFqAhAABAF1AXUBawIQAAQBdQF1AW0CEAAEAXUBdQF0AhAABAF1AXUBdQIQAAQBdQF1AXcCEAAEAXUBdwFqAhAABAF1AXcBawIQAAQBdQF3AW0CEAAEAXUBdwF0AhAABAF1AXcBdQIQAAQBdQF3AXcCEAAEAXcBagFqAhAABAF3AWoBawIQAAQBdwFqAW0CEAAEAXcBagF0AhAABAF3AWoBdQIQAAQBdwFqAXcCEAAEAXcBawFqAhAABAF3AWsBawIQAAQBdwFrAW0CEAAEAXcBawF0AhAABAF3AWsBdQIQAAQBdwFrAXcCEAAEAXcBbQFqAhAABAF3AW0BawIQAAQBdwFtAW0CEAAEAXcBbQF0AhAABAF3AW0BdQIQAAQBdwFtAXcCEAAEAXcBdAFqAhAABAF3AXQBawIQAAQBdwF0AW0CEAAEAXcBdAF0AhAABAF3AXQBdQIQAAQBdwF0AXcCEAAEAXcBdQFqAhAABAF3AXUBawIQAAQBdwF1AW0CEAAEAXcBdQF0AhAABAF3AXUBdQIQAAQBdwF1AXcCEAAEAXcBdwFqAhAABAF3AXcBawIQAAQBdwF3AW0CEAAEAXcBdwF0AhAABAF3AXcBdQIQAAQBdwF3AXcCDwADAWoBagIPAAMBagFrAg8AAwFqAW0CDwADAWoBdAIPAAMBagF1Ag8AAwFqAXcCDwADAWsBagIPAAMBawFrAg8AAwFrAW0CDwADAWsBdAIPAAMBawF1Ag8AAwFrAXcCDwADAW0BagIPAAMBbQFrAg8AAwFtAW0CDwADAW0BdAIPAAMBbQF1Ag8AAwFtAXcCDwADAXQBagIPAAMBdAFrAg8AAwF0AW0CDwADAXQBdAIPAAMBdAF1Ag8AAwF0AXcCDwADAXUBagIPAAMBdQFrAg8AAwF1AW0CDwADAXUBdAIPAAMBdQF1Ag8AAwF1AXcCDwADAXcBagIPAAMBdwFrAg8AAwF3AW0CDwADAXcBdAIPAAMBdwF1Ag8AAwF3AXcCDwACAWsCDwACAW0CDwACAXUCDwACAXcAAQAIAWoBawFtAXQBdQF3AZoBogAGAAAABAAOAB4ALgBAAAMAAAAC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';
const _INTER_BOLD_B64    = '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AAMIAAAAAADidoeQAAAAAOJ2h535rf1TFKUI6wABAAMAAgAAAAAAAAVAAUgF6gAoBeoAKAXqACgF6gAoBeoAKAXqACgF6gAoBeoAKAXqACgF6gAoCCwAKAgsACgFQwCBBUMAgQXlAFcF5QBXBb0AgQTcAIEE3ACBBNwAgQTcAIEE3ACBBNwAgQTcAIEE3ACBBNwAgQSwAIEF+gBXBewAgQXsAIEGJACBBewAgQf9AIEF7ACBAjUAgQI1/6UCNf/eAjUAgQI1/5ECNQCBAjX/pQSiAEIEogBCBbEAgQcHAEQGCgCBBIIAgQdjAIEHYwCBB2MAgQYIAIEGCACBBggAgQYIAIEGCACBBggAgQYIAIEGCACBBh8AVwYfAFcGHwBXBh8AVwYfAFcGHwBXBh8AVwYfAFcGHwBXBh8AVwYfAFcGHwBXBSgAgQU6AIgGKQBXBT4AgQU8AFIFPABSBUkARAXOAIEFzgCBBc4AgQXOAIEFzgCBBeYAKAg6ACgF1QAqBh0AKgZCACoFxgAoBcYAKAVDAGUEmABDBJgAQwSYAEMEmABDBJgAQwSYAEMEmABDBJgAQwSYAEMEmABDBz0AQwc9AEME/AB7BPwAewSmAEwEpgBMBKYATAT8AEwE/ABMBLQATAS0AEwEtABMBLQATAS0AEwEtABMBLQATAS0AEwEtABMBLQASAMjABME/gBMBOoAewTq//EE6v/xBOoAewIgAGoCIAB7AiD/mgIg/9MCIAB7AiD/hQIg/8kCIABqAiD/mgIg/8kCIP/JBJYAewIgAHsDiQB7AiAAewc/AHsE6gB7BOoAewTZAEwE2QBMBNkATATZAEsE2QBMBNkATATZAEwE2QBMBNkATATZAEwJbwBMBPwAewTaAIEE/AB7BPwATAMzAHsEaQBJBGkASQU2AIEC7wATBOoAewTqAHsE+AB7BOoAewTqAHsE6gB7BLcAGwa+ABsEkQAkBJEAJAS7ABsEuwAbBLsAGwS7ABsEuwAbBLsAGwS7ABsEuwAbBXsAKAV7ACgFewAoBH4AcgVPAH0F7ACBBx0AgQUiAIEEnACBBO4AFAbXAEQIbwAqCLYAKgUeAFwFsQCBBbEAgQWDAIEF8wBEBh8AVwXHAIEFewAoBqkAVwYcAIEHlgBEBZ0AewXVAHsFnQB7BZ0AgQcbAEQH3gCBCBYAgQaYAEQHRQCBBUEAgQjjAEQI9gCBBeUAUQhNAIEFPgArBUcAgQj0AIEF5QBXCFcAVwccABMF9QBeBR0AXAX+ACgG0gBEBMAATAS3ABsGmwB7BNMATASMAHsDmwB7A5sAewOb/+4FQAAkBtsAJAceACQEHABFBPAAewTwAHsEnwB7BO4AewTkAHsFBwB7BVkAEwTOABMEzgATBm8AewZvAHsE7QB7BSUAewWsAHsE7QB7BO0AewTcAHsEEwATBigATARKACQE1wAkBTcAewTcAHsExAB7BPwAewTEAHsG1QB7Bw0AewShAHsFWwATBlUAewUUABMFFAATB3kAJgdUAHsEpwBKBt8AewSVAB0EigB7B38AewSnAEwGrgBMBasAEwX9ABMFHQBcBOIAGwU8AFIEpgBMBIUAGQUPAFcFHQBpBeMAWAVwADUEhwBDBU0ARwf5AIEFqgBOBl0AOQhGAEYFDwBXBeoAKAXeAK0GBQAdBfoAVwXlAFcF5QBXBcMAVwVJAEQLmABMBt4AeAdUAI4GDAB/CVEAgQYLAIkE6P/xBUMAgQVaAFcDYABRBPsAZgUeAFwFYABbBPAAVgUkAFcEmABEBSUAVwUkAFcFHQBcBVQATAOvAEQCiwCWBRUAlgKMAJYHCACWBH0ASwj7AEsHCABLBH0AXgRwAEsC8ACeAvAAPgLwAKsC8ACrAvAAXwLwAF8DswCHA7MAXwgcAFcC8ACeAvAAPgLwAKsC8ABfA7MAhwOzAF8IHABXBSYAEQYNAIIDEAAWAu4A6QKrAM8DEAAWA7QAhwQAAAAFKwBECAAAAAgAAAADtgCbA7YAvAO2APcE1ACNBNQAngO0AIcEAAAABSsARAgAAAADtgCbA7YAvAO2APcE1ACNBNQAngJWAJECVgCRApcAvQRGAL0EIQCRBBEAkQPmAGUCKwBlAlYASAQRAEgCJwBwBEwAcAZwAHAIlQBwAicAcARMAHAGcABwAoMAZwKDAJUHigCVBQcAlQKDAJUCgwCVApIAZwKDAJUDYABTA2AAQwU0AFMFNABDBWMAogVjAMcFYwDABWMAsQVjAKUFYwC4BWMAtAVjAJQFYwCiBWMAxwVjAMAFYwCxBWMApQVjALgFYwC0BWMAlAVjANYDzwAABKQAmwSkAJsD2gBABG4AmwVYALIFQQBbB0YAowOiAG4DrAA2A+AAPQG5AEIDkQBK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ACAAQgBvAGwAZABWAGUAcgBzAGkAbwBuACAANAAuADAAMAAxADsAZwBpAHQALQA2ADYANgA0ADcAYwAwAGIAYgBJAG4AdABlAHIAMQA4AHAAdAAtAEIAbwBsAGQAVwBlAGkAZwBoAHQATwBwAHQAaQBjAGEAbAAgAFMAaQB6AGUAMQA4AHAAdABJAHQAYQBsAGkAYwBSAG8AbQBhAG4AAAADAAAAAAAA/uUAwQAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAf//AA8AAQAAAAwAAAAAAAAAAgAvAAEAQQABAEMAZwABAGkAdgABAHgAhgABAIkAoQABAKMApQABAKcAuQABAL4AvwABAMEAxAABAMcAygABAMwA3QABAN8A3wABAOEA5QABAOsA7QABAO8A9AABAPYA9gABAPgBAwABAQYBDQABARABEAABARMBEwABARUBFgABARgBGgABARwBIQABASkBKQABAS4BLgABATABMwABATUBNQABAToBOgABATwBPgABAUABQQABAVYBWQABAV8BYAABAbQBtQABAbwBvQABAb8BvwABAcEBwgABAc8BzwABAdEB0gABAd8B3wABAeEB4QABAhsCHAABAiACJAABAiYCKgABAiwCLAABAjQCTgABAlcCawABAoYCigADAAAAAQAAAAoAPABeAARERkxUABpjeXJsACZncmVrACZsYXRuACYABAAAAAD//wABAAEABAAAAAD//wABAAAAAmtlcm4ADmtlcm4AFgAAAAIAAQAAAAAABAABAAAAAQAAAAIABgAqAAkACAADAAwAFAAcAAEAAgAAG1QAAQACAAAj1AABAAIAACtkAAIACAADAAwCoAOsAAEAcgAEAAAANADeAPQBCgJKAkoBPgEQARYBJAE+AUQBagJKAXgCPgI+Aj4CPgI+AZIBmAJEAkQBkgGYAZgBsgGyAbwBxgHMAo4CPgKOAo4CPgKOAeICOAI4AlACUAI+AkQCSgJQAloCaAJyAngCjgKOAAEANACmASUBKQEyATMBPgFDAUQBRQFHAUkBTQFcAWkBbwFwAXEBcwF4AX0BfgF/AYABgQGCAYkBjgGPAZABlQGbAZwBngGgAaQBpgGoAasBrAGtAa4BrwGwAbEBsgGzAbkBxgHSAeICBAIRAAUBff+YAYH/mAGa/68Bqv+7Aav/uwAFAWb/rwGO/3UBj/91AZD/dQGr/5gAAQGa/8YAAQGx//UAAwGD/6MBhP+jAav/owAGAUP/7AFH/+wBSf+jAWT/jAGa/0YBq/67AAEBq/+jAAkBaf+AAX3/RgF//7sBgP+7AYH/RgGs/68Brf+vAbH/0gHX/6MAAwFp/7sBff+7AYH/uwAGASj/mAF9/6kBfv+MAYH/qQGC/4wBif+MAAEBSf+AAAYApv+jAUn/dQFk/wABmv87AaH/owGr/68AAgGF/ukBhv7pAAIBhf7pAYb+jAABAWn/rwAFASj/aQFF/2kBaf9pAX3/OwGB/zsAFQEo/5gBMf+vATL/rwEz/68BPv+jAT//IwFB/6MBQv+MAUP/owFE/6MBRv+jAUf/owFc/68Baf9eAX3/rwGB/68Brv91Aa//dQGy/68Bs/91Abj/owABAUn/rwABASj/uwABAUn/uwABAav/rwACAUn/uwGr/3UAAwFJ/7sBj/+7AZD/OwACAcT/9QHI//UAAQG+/+MABQF9/4ABfv91AYH/gAGC/3UBif91AAEBKP+vAAEALgAEAAAAEgBWANAAYACCAJAA0ACWAKAAoACgALIA0ADWANwA5gDsAP4A/gABABIBJgE/AUMBRAFFAWcBaQGOAY8BkAGrAbgBvgHPAdEB1gHdAd4AAgE+//ABRP/wAAgBP//3AUr/+QGO/9IBj//SAZD/0gGu/+8Br//vAbP/7wADAY7/xQGP/8UBkP/FAAEB4gAHAAIBaf+PAZr/sgAEAUP/8wFH/+YBS//nAfD/wQAHASkANgE6ADYBPQA2AWcANgFzAD4BuQA2AgAANgABAasAHQABAcQAGAACAd3/1wHe/9cAAQG+ADgABAG+/1IB0//NAd3/ogHe/6IAAwHP/9cB0wAAAdb/4wACEtAABAAAE6oVlAAyADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAP/1AAAAAP+kAAAAAAAAAAAAAAAAAAAAAP/GAAAAAP/UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/4wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP91AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+vAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIQAaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/6MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/pgAAAAD/Pv81AAAAAAAAAAAAAAAA/zH/xAAAAAAAAAAAAAAAAP+H/z8AAAAAAAAAAP/VAAAAAAAAAAAAAP/OAAAAAAAAAAAAAP/KAAAAAAABAAAAAP+7/5gAAP+7AAD/qwAAAAD/L/9e/vX/0f8+AAAAAP9p/4D/8QAAAAAAAP+7/7sAAP+T/4QAAAAAAAD/bwAAAAAAAP9RAAD/4QAAAAD/Rv/D/+QAAAAAAAAAGQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/OwAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/3UAAAAAAAAAAAAAAAAAAP9GAAAAAAAAAAD/OwAAAAAAAAAAAAAAAAAAAAAAAP+T/4wAAAAA/4z/jP73AAAAAAAAAAD/gAAAAAAAAAAAAAD/owAA/zsAAP9SAAD/df/pAAAAAAAAAAAAAAAAAAAAAAAA/8UAAP+vAAAAAAATAAD/r/+AAAD+3gAAAAAAAAAAAAAAAAAAAAAAAP9IAAAAAAAAAAD/0QAAAAAAAAAAAAAAAAAA/4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+m/68AAAAA/7sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/9QAAAAAAAP+sAAAAAAAAAAAAAAAAAAAAAAAAAAD/rwAAAAAAAAAAAAAAAAAAAAAAAP8m/zsAAAAAAAD/rQAAAAAAAAAAAAAAAAAA/4AAAAAAAAD/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/OwAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/1P/P/4AAAAAA/+YAAP+7AAAAAAAAAAAAAAAAAAAAAAAA/7sAAAAAAAD/6wAAAAAAAP97AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/5P7pAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/6MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHQAAAAAAAAAAAAAAAAAAAAD/9QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/7sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/XAAAAAAAAAAAAAAAAAAD/rAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/uwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/Y/5gAAAAAAAAAAP/sAAAAAAAAAAAAAAAAAAAAAP+7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/E/5gAAAAA/6MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/FAAAAAAAAAAAAAAAkAAAAAP/YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/1wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/4wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+7AAAAAAAAAAAAAP+uAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+i/6wAAAAAAAD/9QAAAAAAAAAAAAAAAAAAAAAAAP/xAAAAAP/pAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/9QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/1IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/68AAAAAAAAAAP+jAAAAAP+AAAAAAP+7AAAAAAAAAAAAAP+YAAAAAP+YAAAAAAAAAAAAAAAAAAAAAAAAAAD/uwAA/4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/9QAAAAAAAAAAAAD/xgAAAAAAAAAAAAAAAAAA/5sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/yv/N/6MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/68AAAAAAAD/7wAAAAAAAP+YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/8AAAAAAAAAAAAAAAAAAAAMgAAAAAAAP8j/t4AAAAAAAAAAAAAAAAAAAAAAAAAAAAA/4wAAP+7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/fwAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+1AAAAAAAAAAAAAAAAAAAAHQAA/68AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAXQAAAAAAAAAAAAD/uwAAAAAAAP/VAAAAAAAAAAAAAP+v/t4AAAAAAAD/5gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/eAAAABP/1AAAAAAAAAAAAHQAA/6//7QAAAAAAAAAAAAAAAAAA//MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/3AAAAAAAAAAAAAP/cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//UAAP/o/5gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/7wAAAAAAAP+jAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/7sAAP8A/t4AAAAAAAD/mAAIAAAAAAAAAAD/4AAA/4kAAP+AAAAAAAAAAAAAAAAAAAAAAP/eAAAAAAAA/5gAAP/jAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/ogAAAAAAAP/uAAD/vwAAAAAAAAAAAAAAAAAAAAAAAAAA/+0AAAAAAAAAAAAA//AAAAAAAAAAAAAAABYAAAAAAAAAAAAAAAAAAAAAAAAAAP+vAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/7gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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/5gA7v+MAAMAzv+AANX/mAED/5gAAwDA/68A7v+MARf/uwAQAFP/rwBV/6MAVv+jAFf/owBY/5gAWf+YAMH/owDK/68A5P+vAir/owI0/68COf+YAjr/mAI9/6MCQf+jAkb/owABANX/dQACAMH/mADV/3UAHQAt/14ATf9eAFP/aQBU/2kAVf+MAFb/jABX/4wAWP9GAFn/RgBa/4AAwP+7AMH/mADH/7sAyv9pAM3/XgDS/14A1f9pANj/uwDk/2kA5f9eAij/XgIq/4wCNP9pAjj/XgI5/0YCOv9GAj3/jAJB/4wCRv+MAAgALf+MAE3/jADN/4wA0v+MANX/jADl/4wCKP+MAjj/jAAIAC3/mABN/5gAzf+YANL/mADV/5gA5f+YAij/mAI4/5gAPgAP/68AEP+vABz/rwAt/4wAO/+vADz/rwA9/68APv+vAD//rwBA/68AQf+vAEP/rwBE/68ARf+vAEb/rwBJ/68ATf+MAE7/rwBP/68AUP+vAFH/rwBS/68AU/9eAIQAxQCHAMUAiADFAKr/XgCu/14Ar/9eALD/XgCx/14Asv9eALP/XgC0/14Atf9eAMAAdADD/6MAxwB0AMj/rwDK/14Ay/+vAM3/jADO/yMA0v+MANX/mADYAHQA2v+vAN//rwDk/14A5f+MAOn/owEf/14CJ/+vAij/jAI0/14CNf+vAjf/rwI4/4wCQP+vAlf/XgJb/14CXP9eAAEA1f9pAAEBSf+vAAQAWP+7AFn/uwI5/7sCOv+7AAMBlf+jAZr/dQGq/5gAAwFJ/7sBj/+7AZD/OwAIAF7/rwCS/6MBSf+YAVz/uwGV/68Bmv9pAar/gAGr/14ADQBe/68AYf+vAG//mACR/5gAkv+YAKb/LwCv/7sBSf+7AWb/mAGQ/1IBk/+vAZr/XgGr/4wABgFJ/4ABkP87AZX/mAGa/y8Bnv+jAar/mAABAav/rwAGAM7/uwED/4ABL/+7AZX/owGa/4wBqv+YAAIBmv9SAar/dQABASj/mAADAZD/aQGa/7sBq/9eAAEA1f+YAAEBhAAEAAAAvQeCB4IHggeCB4IHggeCB4IHggeCB24HaAdoBp4HaAdoB2gHaAdoB2gHaAdoB2gHaAdoB2gHaAdoB2gHaAduB24HbgduB24HbgduB24HbgduB24HbgaeAwIHeAd4BqgGqAeSB5IHkgeSB5IHaAeSB5IHkgeSB5IHkgeSB5IHkgNuA24DbgNuAwgDbgNuA24DbgdoB2gHaAeSB5IHkgeSB5IHkgeSB5IHkgeSB5IHkgeSB4gGngaeAx4HaAduB2gGqAduB2gHaAeSB2gHkgeSB5IHbgeSB5IHkgeIB4gHiAOCB4gDWAeSA4IDggN8A3wDbgeSB5IDfAN8B5IHkgN8B5IDggeSB5IDiAOmB5IDrAduA94GkAaQA/QEGgaQBpAEVAaQBpAGkAR+B24GkAaQBpAGkAaQBpAHbgaeBp4GngaeB2gGngd4B2gHkgeCB4IGngaoBrYHaAd4B24HeAd4B5IHiAeIB4gHkgeCB5IHiAeSB5IHkgeSB5IHkgABAL0AAQACAAMABAAFAAYABwAIAAkACgARAB0AHgAhACIAIwAlACYAKAAwADEAMgAzADQANQA2ADcAOAA5ADoAOwA8AD0APgA/AEAAQQBDAEQARQBGAEkATQBUAFUAVwBYAFkAZwBoAGkAagBrAGwAbgBvAHAAcQByAHMAdAB1AHYAfgB/AIEAggCDAIQAhQCHAIgAigCLAIwAkACRAJIAkwCUAJUAlgCXAJgAmQCbAJwAnQCfAL4AvwDBAMcAyADJAMoAywDOANMA1QDWANcA2ADZANoA3gDlAOYA6wDsAO0A7gD/AQMBBAEHAQ0BDgEPARABEQESARMBFAEVARYBGQEaARwBHQEhASIBJgE2AUMBXAFpAWoBdAGVAZsBnQGfAaEBpQGnAakBqwGyAgECAgIDAg4CDwIQAhsCIAIhAiICIwIlAigCKgIrAiwCLgIvAjgCOQI6AjwCPQJAAkECRgJIAkkCSgJLAlACUQJZAloCYAJhAmYCZwJoAmwAAQGV/7sABQCAAE4AhgBOASIABwEsAAcBqwAAAA4Ay/+YAWr/aAF0/2gBlf9oAZ3/aAGf/2gBof9oAaX/aAGn/2gBqf9oAar/aAIF/2gCBv9oAgf/aAAFAY7/fwGP/38BkP9/AZr/tgGq/8IAAwEiAAcBLAAHAasAAAABAQ//UAABAUf//AAHAH4APQB/AD0AgQA9AIIAPQCDAD0AhQA9ARAAPQABAOn/8AAMAKP/+QDt//kA+P/5AQP/+QEP//kBEf/5ARL/+QEc//kBHf/5AR7/+QJL//kCWv/5AAUAU/+PAFT/igDK/48A5P+PAjT/jwAJAC3/XgBN/14Aw//QAM3/XgDS/14A1f9eAOX/XgIo/14COP9eAA4AAf+yAAL/sgAD/7IABP+yAAX/sgAG/7IAB/+yAAj/sgAJ/7IACv+yAAv/sgAM/7ICLv+yAlH/sgAKAFX/rgBW/64AV/+uAMH/rgDD/9AA1f9pAir/rgI9/64CQf+uAkb/rgCEAA0ANgAOADYAEQA2ABIANgATADYAFAA2ABUANgAWADYAFwA2ABgANgAZADYAGgA2ABsANgAdADYAHgA2AB8ANgAgADYAIQA2ACIANgAjADYAJQA2ACYANgAoADYALAA2AC4ANgAvADYAMAA2ADEANgAyADYAMwA2ADQANgA1ADYANgA2ADcANgA4ADYAOQA2ADoANgBHADYASAA2AEoANgBnADYAaAA2AHoANgB7ADYAfAA2AH0ANgB+ABkAfwAZAIEAGQCCABkAgwAZAIUAGQCJADYAigA2AIsANgCMADYAjQA+AI4APgCPAD4AmwA+AJwAPgCdAD4AnwA+AKIANgC6ADYAvQA2AL4ANgDEADYAxQA2AMYANgDJADYAzAA2ANEANgDTADYA1AA2ANYANgDXADYA2QA2ANsANgDdADYA3gA2AOoAPgDrAD4A7AA+AO4AUgDyAD4A8wA+APQAPgD1AD4A9gA+APcAPgD5AFIA+gBSAPsAPgD8AD4A/QA+AP4APgD/AD4BAAA+AQEAPgECAD4BBwA+AQn/6wEMAD4BDQA+AQ4APgEQABkBEwBSARQAPgEWAD4BGAA+ARkAPgIgADYCIQA2AiQANgIlADYCJgA2AisANgItADYCLwA2AjEANgIyADYCPAA2AkkAPgJKAD4CTAA+Ak0APgJOAD4CUAA+AmQAPgJlAD4CagA+AAMAwf91AMP/0ADV/2kAAgCl/4ABlf9eAAMAXv+aAGH/dwCC/7YALABe/5oAYf93AGn/JwBq/ycAa/8nAGz/JwBt/ycAbv8nAG//JwBw/ycAcf8nAHL/JwBz/ycAdP8nAHX/JwB2/ycAef8nAIL/tgCQ/ycAkf8nAJL/JwCT/ycAlP8nAJX/JwCW/ycAl/8nAJj/JwCZ/ycAmv8nAJ7/JwDm/ycA8f8nAQT/JwEV/ycBGv8nARv/JwEh/ycCWf8nAmD/JwJh/ycCZv8nAmf/JwJo/ycCbP8nAAEBqwAdAAIAwf+YANX/uwACAMv/mAGh/7sAAQGa/7IAAgGa/7YBqv/CAAECOv8hAAIuwAAEAAAwLDUcAFMASAAAAAAAAAAAAAAAAAAaAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEYAAAAAAAAAAAAAAAAAAAAhABoAAAAAAAAAAAAAAAAAAAAAAAD/vwAAABMAAAAA/9sAAP8V/00AAAAAAAAAAP/GAAAAAAAAAAD/1gAA/3v/1AAA/+T/lwAAAAAAAAAAAAAAAAAAAAD/1P/P/7v/gAAAAAAAAAAA/+b/uwAAAAAAAAAAAAAAAAAA/7v/6wAAAAAAAP97AAAAAP/mAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/9sAAP86/2IAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5gAAAAAAAD/mAAAAAAAAAAAAAAAAAAAAAD/yv/NAAD/owAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/6//7wAAAAAAAP+YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+M/5j/tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHQAAAAD/rwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAABdAAAAAAAAAAD/uwAAAAAAAAAAAAD/qwAAAAAAAAAAAAAAAP+k/7wAAAAAAAAAAP+PAAAAAAAAAAAAAAAA/6wAAAAAAAD/ywAAAAD/pgAA/68AAAAAAAAAAAAAAAD/uwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/9QAAAAAAAP+sAAAAAAAAAAAAAAAAAAAAAAAAAAD/rwAAAAD/0QAA/6sAHf/DAAAAAP/N/3X/6f9S/0b/uwAE/5j/4QAAAAAAAP+7AAAAAAAA/1EAAAAA/3X/ZgAA/6sAAAAAAAAAAAAA/+j/L/9e/2n+9f/RAAD/PgAAAAD/af+A//EAAP+7/7sAAP+T/4T/bwAAAAAAAP9R//EAAP92/+EAAP9G/8P/5AAAAAAAGQAAAAT/7QAAAAAAAP/cAAwAAAAAAC7/8f/x/7v/3gAAAAAAAAAAAAQAAP/1AAAAAAAN//cAAAAAACv/9wAAAAAAAAAAAAAAAAAA/7sAHQAAAAD/r//tAAAAAAAAAAAAAAAAAAD/8wAAAAAAAAAAAAAAAAAAAAAAAP/3AAAAAAAAAAAAAAAA/9wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/zQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/uwAA/14AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/jAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACFAAAAAABOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAABn/1wAPAAD/rwAo/+cAAAAAAB8AAAAA/4z/vQAKAAAAAAAAABkAAAAA/7sAAAAaAAAAHgAAABQAAAAZAAD/gAAA/17/jP/QACgAIQAAAAD/r//XAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAA9ACgAAAAAAAD/wQAAAAf/2wAAAAD/dQAj/+gAAAAAAAD//P+7/7v/uAAA/68AAAAAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAnAAD/ogAA/17/gP+mAB8ADgAAAAAAAP/bAAAAAAAAAAAAAAAAAAAAAP+vAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACMAAAAAAAD/jAAAAAD/G/+f/6T/UgAA/yj/rwAAAAD/dQAAAA7/ff/W/zsAAAAAAAAAAP+vAAAAAAAAAAAAAP+AAAAAAAAA/6T/fAAA/yP/uwAAAAAAAAAAAAAAAP8bAAAAAAAAAAAAAAAAAAD/df9G/4AAAAAAAAD/7wAAAAAAAAAAAAD/n/+KAAAAAAAAAAAAAP+vAAAAAAAAAAD/TP+E/7z/Rv9C/1v/XAAA/3b/YQAOAAD/igAA/7v/9AAAAAAAAP+7AAD/lwAAAAD/uP+7/3cAAAC6/7z/uwAA/wz/RgAA//0AAAAAAAAAAP9M/u4AAAAAAAAAAAAA/7v/df71/5gAAAAAAAAAAAAAAAAAAAAA/7v/hP+K//QAAAAA/0IAAP9c/17/XgAAAAAAAAAAAAAAAAAEAAAAAAAA//sAAP9p/2kAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/6MAAAAAAAD/uwAAAAAAAAAA//UAAAAAAAAAAP/oAAD/mAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/7wAAAAAAAP+jAAAAAP/8AAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAD/uwAAAAAAAAAA//cAAP99/2MAAAAAAAAAAP+rAAAAAAAAAAAAAAAA/6T/0gAAAAD/yAAAAAAAAAAAAAD/owAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/9QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/mAAAAAAAAAAA/68AAP87/6MAAAAAAAAAAP+YAAAAAAAAAAAAAAAA/3X/uwAAAAD/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAAAA/+wAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABdAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFAAAAAAAAAAAAAAAAAAAAAAAAAAD/jAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/1gAAAAAAAAAAAAAAAAAAAAAAAAAA/7sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/WAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4gAA//8AAAAA//MAAAAAAAAAAP/E//YAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/9gAAAAAAAAAAABd//8AAAAAAAAAAAAAAAAAAAAAAAAAAP/iAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/rwAA/6gAAAAAAAD/uwAA/68AAAAAAAD/YgAL/7v/4gAAAAAAAP+7AAAAAAAAAAAAAAAA/4AAAACu/6gAAAAAAAAAAAAAAAAAAAAAAAAAAP+vAAAAAAAAAAAAAAAAAAAAAP+YAAAAAAAAAAD/4gAAAAAAAAAAAAAAAP8e/+IAAAAAAAAAAP+7AAAAAAAAAAD/0gAAAAAAAAAAAAAAAAAAABAAAAAA/4z/igAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/SAAAAAAAAAAAAAAAAAAD/o/+YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xgAA/48AAAAA/4wAAAAAAAAAAAAA/8H/qwAA/5j/4QAAAAAAAP+jAAAAAAAAAAAAAAAAAAAAAAAA/48AAAAAAAAAAAAAAAAAAAAAAAAAAP/GAAAAAAAAAAAAAAAA/7L/r/+vAAAAAAAAAAD/8v/TAAD/0wAA/7IAAP9O/+H/0wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSAAAAAABpAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/yQAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAP/iAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8YAAP/SAAAAAAAA/3UAAP85/0X/eAAAAAAAAAAAAAAAAP+7AAAAAAAA/2IAAAAAAAD/tQAA/8YAAAAAAAAAAAAAAAD/Tv9G/zv/UgAAAAD+9QAAAAD/O//wAAAAAP+AAAAAAP9e/6P/WwAAAAAAAP9iAAAAAP7+AAAAAP7G/9IAAAAAAAAAAAAAAAAAAAAAAAD/uwAAAAAAAAAAAAAAAP+j/7sAAAAAAAAAAP+jAAAAAAAAAAAAAAAA/68AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5gAAAAAAAAAAAAAAAAAAAAAAAAAAAASAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/wAAAAAAAAAAAAAAAAP/G/8EAAAAAAAAAAP/iAAAAAAAAAAAAAAAA/9IAAAAAAAAAAABFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/7sAAAAAAAAAAAAAAAAAAAAAAAD/tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACu/7sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/J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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/qwAAAAAAAAAAAAAAAP+k/7wAAAAAAAAAAP+PAAAAAAAAAAAAAAAA/6wAAAAAAAD/ywAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/uwAAAAD/aQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/aQAAAAAAAAAAAAAAAP+7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/rQAAAAD/OwAAAAAAAAAAAAD/1gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+0v9SAAAAAAAAAAAAAAAA/4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/TAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/2AAA/5gAAAAAAAAAAAAAAAAAAAAAAAD/7AAAAAAAAAAAAAAAAP+7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/4sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/vwAAABMAAAAA/9sAAP8V/00AAAAAAAAAAP/GAAAAAAAAAAD/1gAA/3v/1AAA/+T/lwAAAAAAAAAAAAAAAAAAAAAAAAAA/7sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/mAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+T/PgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/OwAAAAAAAAAAAAAAAAAA/7sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB3/9QAdAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/uwAAAAD/aQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/aQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/TAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8QAkAAAAAAAAAAAAAP+7AAAAAAAAAAAAAP+yAAAAAAAAAAAAAAAA/8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/yQAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAP/iAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//v/xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/uwAAAAAAAAAAAAAAAP+A/5gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/uwAAAAAAAAAA/7sAAP9G/vUAAAAAAAAAAP+vAAAAAAAA/7sAAAAA/4D/uwAA/7v/jAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/7sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/owAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/3UAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wwAAAAAAAD/NQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/xgAA//X/bwAA/+kAAAAAAAD/6f/vAAAAAAAAAAAAAP/yAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/bwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/owAA/7sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/owAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/9sAAP86/2IAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/5gAAAAAAAD/mAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4QAAAAAAAAAAAAAAAAAA/+wAAAAAAAAAAP/hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABdAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIAAAAAAAD/RgBFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/wAAAAAAAAAAAAAAAAP/G/8EAAAAAAAAAAP/iAAAAAAAAAAAAAAAA/9IAAAAAAAAAAABFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+M/5gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/5v/+AAD/VgAA/+IAAAAAAAAAAAAA//0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/OwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAT/7QAAAAAAAP/cAAwAAAAAAC7/8f/x/7sAAAAAAAAAAAAAAAAAAAAAAAAAAAAN//cAAAAAACv/9wAAAAAAAAAAAAAAAAAA/7sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAA//sAAP9p/2kAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/6MAAAAAAAD/uwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/8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ACQAAAA1ABkADQAMAAwAAAAAABcAAAAAAAQAFwAAAAAAAAAAABcAAAABAAoACgAKAAIAAgAWAAAAAQAFAAAAAAAAAAAAAAALAAAAAQAKAAsACwAnAAAAAgABAAEAAAAAAAIAAgABAAEAAQACAAIAIAABAAAAAAAAAAAAAAAAAAAAAAAoAAEAAQJ1AAUABQAFAAUABQAFAAUABQAFAAUABQAFAAEAAQAEAAQAAQABAAEAAQABAAEAAQABAAEAAQABAAQAAQABAAEAAQABAAEAAQAUAAEAAQAUAAEAFAAjACMAAQANAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEABAAEAAQABAAEAAQABAAAAAQABAAEAAQAAQABAAQAAQARABEADQAJAAkACQAJAAkAGQAdABIAEgASAAwADAAWAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAEAAQACAAIAAgACACoAAgACAAIAAgACAAIAAgACAAIAAAAlAAIAAQABAAEAAQAPAA8AHgAPAA8ADwAYAA8AHgAYABgAAQABAAEAAQADAAMAAwACAAIAAgACAAIAAgACAAIAAgACAAIAAwADAAMAAgADAAsACwABAAYACAAIAEUACAAIAAgACgAcABoAGgAKAAoACgAKAAoACgAKAAoAAAAAAAAAFwABAAAAAAABAAEAAAArABIAAAA7AAEAAQABACsABAABABkABAABAA0AAAAAAAAAAQANAAEAAQANAAEAAQArAAEABAABAAAAAQABAAQAAAAAAAAAAAAZAA0AAgAAAAAAPQADAAMAAwAGACQAGgAaAAIAAwADAAMAAwADAAMABgAkACQAAwADAAMAAwADAAMAAwADAAYAAgAaABoAAwAIAD8ABwAHAAMAAwADAAYADwAGAAYAJAADAAIAAwALAAMAAwACAAIABgAGAAYACgBAACoAAAAAAAAAAAAAAAAAAAATAAAAAAAAAAAAAAAAAAAAHwAfAB8AAAAAAAAAAAAAAAAAEwAAAAAAEwAxADcAAAA5ADIAAAAxAEYAQQAAAAAAAABDAAAAAAAAAAAAMAAAAAAANQAwAC0ALgAtAAAALgAAAC0ALgAfAAAAIQAAACEAAAAhAAAAAAAAAEcAEwAAADwADgAAAAAAAAAAABUAFQAVABUAPgAOAAAAAAAAABUAAAAAAAAAAAAp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AAMBawFqAgIAAwFrAWsCAgADAWsBbQICAAMBbQFqAgIAAwFtAWsCAgADAW0BbQICAAIBawICAAIBbQEAAgICDAIWAiACKgI0Aj4CSAJSAlwCZgJwAnoChAKOApgCogKsArYCwALKAtQC3gLoAvIC/AMGAxADGgMkAy4DOANCA0wDVgNgA2oDdAN+A4gDkgOcA6YDsAO6A8QDzgPYA+ID7AP2BAAECgQUBB4EKAQyBDwERgRQBFoEZARuBHgEggSMBJYEoASqBLQEvgTIBNIE3ATmBPAE+gUEBQ4FGAUiBSwFNgVABUoFVAVeBWgFcgV8BYYFkAWaBaQFrgW4BcIFzAXWBeAF6gX0Bf4GCAYSBhwGJgYwBjoGRAZOBlgGYgZsBnYGgAaKBpQGngaoBrIGvAbGBtAG2gbkBu4G+AcCBwwHFgcgByoHNAc+B0gHUgdcB2YHcAd6B4QHjgeYB6IHrAe2B8AHygfUB94H6AfyB/wIBggQCBoIJAguCDgIQghMCFYIYAhqCHQIfgiICJIInAimCLAIugjECM4I2AjiCOwI9gkACQoJFAkeCSgJMgk8CUYJUAlaCWQJbgl4CYIJjAmWCaAJqgm0Cb4JyAnSCdwJ5gnwCfoKBAoOChgKIgosCjYKQApKClQKXgpoCnIKegqCCooKkgqaCqIKqgqyCroKwgrKCtIK2griCuoK8gr6CwILCgsSCxoLIgsqCzILOgtCC0oLUgtaC2ILagtyC3oLgguKC5ILmAueC6QCEAAEAWoBagFqAhAABAFqAWoBawIQAAQBagFqAW0CEAAEAWoBagF0AhAABAFqAWoBdQIQAAQBagFqAXcCEAAEAWoBawFqAhAABAFqAWsBawIQAAQBagFrAW0CEAAEAWoBawF0AhAABAFqAWsBdQIQAAQBagFrAXcCEAAEAWoBbQFqAhAABAFqAW0BawIQAAQBagFtAW0CEAAEAWoBbQF0AhAABAFqAW0BdQIQAAQBagFtAXcCEAAEAWoBdAFqAhAABAFqAXQBawIQAAQBagF0AW0CEAAEAWoBdAF0AhAABAFqAXQBdQIQAAQBagF0AXcCEAAEAWoBdQFqAhAABAFqAXUBawIQAAQBagF1AW0CEAAEAWoBdQF0AhAABAFqAXUBdQIQAAQBagF1AXcCEAAEAWoBdwFqAhAABAFqAXcBawIQAAQBagF3AW0CEAAEAWoBdwF0AhAABAFqAXcBdQIQAAQBagF3AXcCEAAEAWsBagFqAhAABAFrAWoBawIQAAQBawFqAW0CEAAEAWsBagF0AhAABAFrAWoBdQIQAAQBawFqAXcCEAAEAWsBawFqAhAABAFrAWsBawIQAAQBawFrAW0CEAAEAWsBawF0AhAABAFrAWsBdQIQAAQBawFrAXcCEAAEAWsBbQFqAhAABAFrAW0BawIQAAQBawFtAW0CEAAEAWsBbQF0AhAABAFrAW0BdQIQAAQBawFtAXcCEAAEAWsBdAFqAhAABAFrAXQBawIQAAQBawF0AW0CEAAEAWsBdAF0AhAABAFrAXQBdQIQAAQBawF0AXcCEAAEAWsBdQFqAhAABAFrAXUBawIQAAQBawF1AW0CEAAEAWsBdQF0AhAABAFrAXUBdQIQAAQBawF1AXcCEAAEAWsBdwFqAhAABAFrAXcBawIQAAQBawF3AW0CEAAEAWsBdwF0AhAABAFrAXcBdQIQAAQBawF3AXcCEAAEAW0BagFqAhAABAFtAWoBawIQAAQBbQFqAW0CEAAEAW0BagF0AhAABAFtAWoBdQIQAAQBbQFqAXcCEAAEAW0BawFqAhAABAFtAWsBawIQAAQBbQFrAW0CEAAEAW0BawF0AhAABAFtAWsBdQIQAAQBbQFrAXcCEAAEAW0BbQFqAhAABAFtAW0BawIQAAQBbQFtAW0CEAAEAW0BbQF0AhAABAFtAW0BdQIQAAQBbQFtAXcCEAAEAW0BdAFqAhAABAFtAXQBawIQAAQBbQF0AW0CEAAEAW0BdAF0AhAABAFtAXQBdQIQAAQBbQF0AXcCEAAEAW0BdQFqAhAABAFtAXUBawIQAAQBbQF1AW0CEAAEAW0BdQF0AhAABAFtAXUBdQIQAAQBbQF1AXcCEAAEAW0BdwFqAhAABAFtAXcBawIQAAQBbQF3AW0CEAAEAW0BdwF0AhAABAFtAXcBdQIQAAQBbQF3AXcCEAAEAXQBagFqAhAABAF0AWoBawIQAAQBdAFqAW0CEAAEAXQBagF0AhAABAF0AWoBdQIQAAQBdAFqAXcCEAAEAXQBawFqAhAABAF0AWsBawIQAAQBdAFrAW0CEAAEAXQBawF0AhAABAF0AWsBdQIQAAQBdAFrAXcCEAAEAXQBbQFqAhAABAF0AW0BawIQAAQBdAFtAW0CEAAEAXQBbQF0AhAABAF0AW0BdQIQAAQBdAFtAXcCEAAEAXQBdAFqAhAABAF0AXQBawIQAAQBdAF0AW0CEAAEAXQBdAF0AhAABAF0AXQBdQIQAAQBdAF0AXcCEAAEAXQBdQFqAhAABAF0AXUBawIQAAQBdAF1AW0CEAAEAXQBdQF0AhAABAF0AXUBdQIQAAQBdAF1AXcCEAAEAXQBdwFqAhAABAF0AXcBawIQAAQBdAF3AW0CEAAEAXQBdwF0AhAABAF0AXcBdQIQAAQBdAF3AXcCEAAEAXUBagFqAhAABAF1AWoBawIQAAQBdQFqAW0CEAAEAXUBagF0AhAABAF1AWoBdQIQAAQBdQFqAXcCEAAEAXUBawFqAhAABAF1AWsBawIQAAQBdQFrAW0CEAAEAXUBawF0AhAABAF1AWsBdQIQAAQBdQFrAXcCEAAEAXUBbQFqAhAABAF1AW0BawIQAAQBdQFtAW0CEAAEAXUBbQF0AhAABAF1AW0BdQIQAAQBdQFtAXcCEAAEAXUBdAFqAhAABAF1AXQBawIQAAQBdQF0AW0CEAAEAXUBdAF0AhAABAF1AXQBdQIQAAQBdQF0AXcCEAAEAXUBdQFqAhAABAF1AXUBawIQAAQBdQF1AW0CEAAEAXUBdQF0AhAABAF1AXUBdQIQAAQBdQF1AXcCEAAEAXUBdwFqAhAABAF1AXcBawIQAAQBdQF3AW0CEAAEAXUBdwF0AhAABAF1AXcBdQIQAAQBdQF3AXcCEAAEAXcBagFqAhAABAF3AWoBawIQAAQBdwFqAW0CEAAEAXcBagF0AhAABAF3AWoBdQIQAAQBdwFqAXcCEAAEAXcBawFqAhAABAF3AWsBawIQAAQBdwFrAW0CEAAEAXcBawF0AhAABAF3AWsBdQIQAAQBdwFrAXcCEAAEAXcBbQFqAhAABAF3AW0BawIQAAQBdwFtAW0CEAAEAXcBbQF0AhAABAF3AW0BdQIQAAQBdwFtAXcCEAAEAXcBdAFqAhAABAF3AXQBawIQAAQBdwF0AW0CEAAEAXcBdAF0AhAABAF3AXQBdQIQAAQBdwF0AXcCEAAEAXcBdQFqAhAABAF3AXUBawIQAAQBdwF1AW0CEAAEAXcBdQF0AhAABAF3AXUBdQIQAAQBdwF1AXcCEAAEAXcBdwFqAhAABAF3AXcBawIQAAQBdwF3AW0CEAAEAXcBdwF0AhAABAF3AXcBdQIQAAQBdwF3AXcCDwADAWoBagIPAAMBagFrAg8AAwFqAW0CDwADAWoBdAIPAAMBagF1Ag8AAwFqAXcCDwADAWsBagIPAAMBawFrAg8AAwFrAW0CDwADAWsBdAIPAAMBawF1Ag8AAwFrAXcCDwADAW0BagIPAAMBbQFrAg8AAwFtAW0CDwADAW0BdAIPAAMBbQF1Ag8AAwFtAXcCDwADAXQBagIPAAMBdAFrAg8AAwF0AW0CDwADAXQBdAIPAAMBdAF1Ag8AAwF0AXcCDwADAXUBagIPAAMBdQFrAg8AAwF1AW0CDwADAXUBdAIPAAMBdQF1Ag8AAwF1AXcCDwADAXcBagIPAAMBdwFrAg8AAwF3AW0CDwADAXcBdAIPAAMBdwF1Ag8AAwF3AXcCDwACAWsCDwACAW0CDwACAXUCDwACAXcAAQAIAWoBawFtAXQBdQF3AZoBogAGAAAABAAOAB4ALgBAAAMAAAACAFwC7AABCp4AAAADAAAAAgBsADQAAQqOAAAAAwAAAAIAPALMAAAAAQAAACMAAwAAAAIASgASAAAAAQAAACQAAQACAWoBdAAEAAAAAQAIAAEACAABAA4AAQABAZoAAQAEAgEAAgFqAAQAAAABAAgAAQAIAAEADgABAAEBogACAAYADAIOAAIBagIOAAIBdAAEAAAAAQAIAAEBfgAIABYATABmASgBRgFQAVoBbAAHABAAGgAiACoBBgAwAQwCDQAEAZwBnAGbAgwAAwGcAZsCBAADAZwBnAIKAAICBQILAAICBgAFAAwA5ADsABQA9AIJAAMBnAGbAggAAgGbABIAJgAwADoARABOAFgAYgBsAHYAfgCGAI4AlgCeAKYArgC2ALwCGgAEAZwBnAGbAhoABAGcAZwBowIaAAQBnAGkAZsCGgAEAZwBpAGjAhoABAGkAZwBmwIaAAQBpAGcAaMCGgAEAaQBpAGbAhoABAGkAaQBowIZAAMBnAGbAhkAAwGcAaMCGQADAaQBmwIZAAMBpAGjAhEAAwGcAZwCEQADAZwBpAIRAAMBpAGcAhEAAwGkAaQCFwACAhICGAACAhMAAwAIABAAGAIWAAMBnAGjAhYAAwGkAaMCFQACAaMAAQAEAgoAAgGbAAEABAILAAIBmwACAAYADAIXAAIBmwIXAAIBowAC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';

function exportEstimate(format) {
  const orderName = gv('est-order-name') || 'Новый заказ';
  const today     = new Date().toLocaleDateString('ru-RU');
  const safeN     = orderName.replace(/\s+/g, '_').replace(/[^\w\u0400-\u04FF]/g, '');

  // ── Количество ─────────────────────────────────────────────
  let qty = 1, qtyLabel = '1 шт';
  if (estSel === 'batch') {
    qty = parseInt(gv('qty')) || 1;
    qtyLabel = qty + ' шт (партия)';
  } else if (estSel === 'custom') {
    qty = parseInt(gv('est-custom-qty')) || 1;
    qtyLabel = qty + ' шт';
  }

  // ── Цена ───────────────────────────────────────────────────
  const unitPrice  = getCurrentUnitPrice();
  const totalPrice = unitPrice * qty;
  const slug       = today.replace(/\./g, '-');

  // ── Данные о печати ────────────────────────────────────────
  const printerName = [...new Set(
    tables.map(t => (cfg.printers.find(p => p.id === t.printerId) || cfg.printers[0] || {}).name || '—')
  )].join(', ') || '—';

  const qtyPerBatch  = parseInt(gv('qty')) || 1;   // штук за один прогон
  const totalGrams1  = tables.reduce((sum, t) =>    // граммы за 1 прогон
    sum + (t.filaments || []).reduce((s, f) => s + (parseFloat(f.grams) || 0), 0), 0);
  const totalHours1  = tables.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0); // часов за 1 прогон

  // Сколько прогонов нужно чтобы напечатать qty штук
  const batches    = Math.ceil(qty / qtyPerBatch);
  // Граммы пропорционально штукам (не по прогонам целиком)
  const totalGrams = Math.round(totalGrams1 * (qty / qtyPerBatch) * 10) / 10;
  // Время — целое число прогонов
  const totalHours = totalHours1 * batches;

  const hoursLabel = totalHours > 0
    ? (Number.isInteger(totalHours) ? totalHours + ' ч' : totalHours.toFixed(1) + ' ч')
    : '—';

  const filamentNames = [...new Set(
    tables.flatMap(t => (t.filaments || []).map(f => {
      const mat = cfg.filaments.find(p => p.id === f.filamentId) || cfg.filaments[0] || {};
      return mat.name || '—';
    }))
  )].join(', ') || '—';

  // ── XLSX через ExcelJS ─────────────────────────────────────
  if (format === 'xlsx') {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Смета');

    const BLUE = '0052DB', WHITE = 'FFFFFF', DARK = '0A0A0A';
    const GREY2 = '525252', BGALT = 'F5F5F5', BORDER = 'E8E8E8';

    const thinBorder = {
      top:    { style: 'thin', color: { argb: 'FF' + BORDER } },
      left:   { style: 'thin', color: { argb: 'FF' + BORDER } },
      bottom: { style: 'thin', color: { argb: 'FF' + BORDER } },
      right:  { style: 'thin', color: { argb: 'FF' + BORDER } },
    };

    ws.columns = [{ width: 26 }, { width: 30 }];

    // Шапка
    ws.mergeCells('A1:B1');
    const hdr = ws.getCell('A1');
    hdr.value = 'Смета';
    hdr.font  = { name: 'Inter', size: 14, bold: true, color: { argb: 'FF' + WHITE } };
    hdr.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BLUE } };
    hdr.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(1).height = 28;

    // Мета
    [['Заказ', orderName], ['Дата', today], ['Количество', qtyLabel]].forEach(([label, value], i) => {
      const row = ws.getRow(i + 2);
      row.height = 20;
      const cA = row.getCell(1), cB = row.getCell(2);
      cA.value = label; cB.value = value;
      cA.font = { name: 'Inter', size: 9,  color: { argb: 'FF' + GREY2 } };
      cB.font = { name: 'Inter', size: 10, color: { argb: 'FF' + DARK  } };
      if (i % 2 === 0) [cA, cB].forEach(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BGALT } }; });
      [cA, cB].forEach(c => { c.border = thinBorder; c.alignment = { vertical: 'middle', indent: 1 }; });
    });

    ws.getRow(5).height = 8;

    // Блок «Параметры печати»
    ws.mergeCells('A6:B6');
    const phdr = ws.getCell('A6');
    phdr.value = 'Параметры печати';
    phdr.font  = { name: 'Inter', size: 10, bold: true, color: { argb: 'FF' + WHITE } };
    phdr.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BLUE } };
    phdr.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(6).height = 22;

    [
      ['Принтер',      printerName],
      ['Филамент',     filamentNames],
      ['Масса печати', totalGrams > 0 ? totalGrams + ' г' : '—'],
      ['Время печати', hoursLabel],
    ].forEach(([label, value], i) => {
      const row = ws.getRow(7 + i);
      row.height = 20;
      const cA = row.getCell(1), cB = row.getCell(2);
      cA.value = label; cB.value = value;
      cA.font = { name: 'Inter', size: 9,  color: { argb: 'FF' + GREY2 } };
      cB.font = { name: 'Inter', size: 10, color: { argb: 'FF' + DARK  } };
      if (i % 2 === 0) [cA, cB].forEach(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BGALT } }; });
      [cA, cB].forEach(c => { c.border = thinBorder; c.alignment = { vertical: 'middle', indent: 1 }; });
    });

    ws.getRow(11).height = 8;

    // Таблица цен
    const phRow = ws.getRow(12);
    phRow.height = 22;
    ['Позиция', 'Сумма'].forEach((v, i) => {
      const c = phRow.getCell(i + 1);
      c.value = v;
      c.font  = { name: 'Inter', size: 10, bold: true, color: { argb: 'FF' + WHITE } };
      c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BLUE } };
      c.alignment = { vertical: 'middle', horizontal: i === 1 ? 'right' : 'left', indent: 1 };
      c.border = thinBorder;
    });

    const priceRows = [['Цена за штуку', unitPrice]];
    if (qty > 1) priceRows.push([`Итого (${qty} шт)`, totalPrice]);
    priceRows.forEach(([label, val], i) => {
      const row = ws.getRow(13 + i);
      row.height = 22;
      const cA = row.getCell(1), cB = row.getCell(2);
      cA.value = label; cB.value = val;
      cA.font  = { name: 'Inter', size: 10, color: { argb: 'FF' + DARK } };
      cB.font  = { name: 'Inter', size: 10, bold: true, color: { argb: 'FF' + DARK } };
      cB.numFmt = '#,##0.00';
      cB.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
      cA.alignment = { vertical: 'middle', indent: 1 };
      if (i % 2 === 1) [cA, cB].forEach(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BGALT } }; });
      [cA, cB].forEach(c => { c.border = thinBorder; });
    });

    wb.xlsx.writeBuffer().then(buf => {
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `smeta_${safeN}_${slug}.xlsx`;
      a.target = '_blank';
      a.rel = 'noopener';
      a.click();
      URL.revokeObjectURL(a.href);
    });

  // ── PDF через jsPDF + Inter ────────────────────────────────
  } else if (format === 'pdf') {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    doc.addFileToVFS('Inter-Regular.ttf', _INTER_REGULAR_B64);
    doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
    doc.addFileToVFS('Inter-Bold.ttf', _INTER_BOLD_B64);
    doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');

    const W = 210, ml = 20, mr = 20, cw = W - ml - mr;
    const hex2rgb = h => [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
    const setFill  = h => doc.setFillColor(...hex2rgb(h));
    const setColor = h => doc.setTextColor(...hex2rgb(h));
    const setDraw  = h => doc.setDrawColor(...hex2rgb(h));

    const BLUE = '0052DB', WHITE = 'FFFFFF', DARK = '0A0A0A';
    const GREY2 = '525252', BGALT = 'F5F5F5', BORDER = 'E8E8E8';

    let y = 0;
    const rowH = 10;

    // Шапка
    setFill(BLUE);
    doc.rect(0, 0, W, 26, 'F');
    doc.setFont('Inter', 'bold');
    doc.setFontSize(18); setColor(WHITE);
    doc.text('Смета', ml, 17);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(11);
    doc.text(today, W - mr, 17, { align: 'right' });
    y = 36;

    // Мета
    [['Заказ', orderName], ['Дата', today], ['Количество', qtyLabel]].forEach(([label, value], i) => {
      if (i % 2 === 0) { setFill(BGALT); doc.rect(ml, y - 7, cw, rowH, 'F'); }
      doc.setFont('Inter', 'normal');
      doc.setFontSize(9); setColor(GREY2);
      doc.text(label, ml + 2, y);
      doc.setFontSize(11); setColor(DARK);
      doc.text(String(value), ml + cw, y, { align: 'right' });
      y += rowH;
    });
    y += 8;

    // Параметры печати
    setFill(BLUE);
    doc.rect(ml, y - 7, cw, rowH, 'F');
    doc.setFont('Inter', 'bold');
    doc.setFontSize(11); setColor(WHITE);
    doc.text('Параметры печати', ml + 2, y);
    y += rowH;

    [
      ['Принтер',      printerName],
      ['Филамент',     filamentNames],
      ['Масса печати', totalGrams > 0 ? totalGrams + ' г' : '—'],
      ['Время печати', hoursLabel],
    ].forEach(([label, value], i) => {
      if (i % 2 === 0) { setFill(BGALT); doc.rect(ml, y - 7, cw, rowH, 'F'); }
      doc.setFont('Inter', 'normal');
      doc.setFontSize(9); setColor(GREY2);
      doc.text(label, ml + 2, y);
      doc.setFontSize(11); setColor(DARK);
      doc.text(String(value), ml + cw, y, { align: 'right' });
      y += rowH;
    });
    y += 8;

    // Разделитель
    setDraw(BORDER);
    doc.setLineWidth(0.3);
    doc.line(ml, y, ml + cw, y);
    y += 10;

    // Таблица цен
    setFill(BLUE);
    doc.rect(ml, y - 7, cw, rowH, 'F');
    doc.setFont('Inter', 'bold');
    doc.setFontSize(11); setColor(WHITE);
    doc.text('Позиция', ml + 2, y);
    doc.text('Сумма', ml + cw - 2, y, { align: 'right' });
    y += rowH;

    const priceRows = [['Цена за штуку', unitPrice]];
    if (qty > 1) priceRows.push([`Итого (${qty} шт)`, totalPrice]);
    priceRows.forEach(([label, val], i) => {
      if (i % 2 === 1) { setFill(BGALT); doc.rect(ml, y - 7, cw, rowH, 'F'); }
      doc.setFont('Inter', 'normal');
      doc.setFontSize(11); setColor(DARK);
      doc.text(label, ml + 2, y);
      doc.setFont('Inter', 'bold');
      doc.text(fmt(val), ml + cw - 2, y, { align: 'right' });
      y += rowH;
    });

    doc.save(`smeta_${safeN}_${slug}.pdf`);
  }

  closeM('mo-estimate');
}

// ── HELP — реализован в help.js ──────────────────────────

// Expose functions globally (called from HTML onclick attributes)
window.numInput = numInput;
window.numBlur  = numBlur;
window.parseNum = parseNum;
window.xlsDL = xlsDL;
window.openS = openS; window.closeS = closeS;
window.openR = openR; window.closeR = closeR;
window.openM = openM; window.closeM = closeM;
window.calcHours = calcHours; window.copyHours = copyHours; window.openHoursCalc = openHoursCalc; window.calc = calc;
window.updateWageCalc = updateWageCalc;
window.openSaveMo = openSaveMo; window.confirmSave = confirmSave;
window.confirmReplace = confirmReplace;
window.renderReg = renderReg; window.loadSnap = loadSnap; window.delSnap = delSnap;
window.buildSnap = buildSnap; window.snapToRows = snapToRows; window.slugId = slugId; window.renameItemId = renameItemId;
window.exportOne = exportOne; window.exportAllXlsx = exportAllXlsx; window.exportAllJson = exportAllJson;
window.importRegXlsx = importRegXlsx; window.importXlsxToReg = importXlsxToReg;
window.importFile = importFile; window.pickSnap = pickSnap;
window.setSort = setSort;
window.startRename = startRename; window.confirmRename = confirmRename;
window.saveSettings = saveSettings; window.syncS = syncS; window._syncCurrencyLabels = _syncCurrencyLabels; window._syncCurrencyName = _syncCurrencyName;
window.renderDryers = renderDryers; window.renderPrinters = renderPrinters;
window.renderFilaments = renderFilaments; window.renderTaxes = renderTaxes;
window.addDryer = addDryer; window.delDryer = delDryer;
window.addPrinter = addPrinter; window.delPrinter = delPrinter;
window.addFilament = addFilament; window.delFilament = delFilament; window.moveFilament = moveFilament;
window.moveDryer = moveDryer; window.movePrinter = movePrinter;
window.addTax = addTax; window.delTax = delTax;
window.selTax = selTax; window.selPrice = selPrice;
window.onPrinterChange = onPrinterChange;
window.exportCfgOnly = exportCfgOnly;
window.syncDryerSel = syncDryerSel; window.adjDryHours = adjDryHours; window.updateDryerCost = updateDryerCost;
window.openSaveAndDownloadMo = openSaveAndDownloadMo;
window.clearRegSearch = clearRegSearch;
window.confirmDelSnap = confirmDelSnap; window.execDelSnap = execDelSnap; window.execDelConfirm = execDelConfirm;
window.confirmDelDryer = confirmDelDryer; window.confirmDelPrinter = confirmDelPrinter;
window.confirmDelFilament = confirmDelFilament; window.confirmDelTax = confirmDelTax;
// window.openHelp — задаётся в help.js
window.openEstimateMo = openEstimateMo;
window.selectEst = selectEst;
window.updateEstCustom = updateEstCustom;
window.exportEstimate = exportEstimate;
window.checkField = checkField;
window.checkAllFields = checkAllFields;
window.installPWA = installPWA;
window.App = App;
window.svC = svC;
Object.defineProperty(window, 'cfg', { get: function(){ return App.cfg; }, set: function(v){ App.cfg = v; } });
window.addTable = addTable; window.removeTable = removeTable;
window.onTableChange = onTableChange; window.refreshTableDryer = refreshTableDryer;
window.checkTableField = checkTableField;
window.addTableFilament = addTableFilament; window.removeFilament = removeFilament; window.onFilamentChange = onFilamentChange;
window.toggleColorPalette = toggleColorPalette;
window.pickFilamentColor = pickFilamentColor;
window.ensureGlobalPalette = ensureGlobalPalette;
// Закрытие палитры при клике вне — перенесено внутрь ensureGlobalPalette()
// Экспорт состояния для тест-раннера
Object.defineProperty(window, 'tables', { get: function(){ return tables; } });
Object.defineProperty(window, 'comp',   { get: function(){ return comp;   } });

}); // end DOMContentLoaded
