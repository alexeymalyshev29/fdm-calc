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
  var labels = { light: 'Светлая', auto: 'По системе', dark: 'Тёмная' };

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
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
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
      {id: 'petg',   name: 'PETG', pricePerKg: 900},
      {id: 'pla',    name: 'PLA',  pricePerKg: 1000},
      {id: 'g0kzdf', name: 'TPU',  pricePerKg: 1100},
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
    filaments: [{ id: uid(), filamentId: (cfg.filaments[0] || {}).id || '', grams: '90' }],
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
      `<option value="${escH(p.id)}"${p.id === f.filamentId ? ' selected' : ''}>${escH(p.name)} — ${p.pricePerKg} ₽/кг</option>`
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
  // Тип филамента — иконка «два круга» (используется в настройках для Филаментов)
  const iconPlastic = `<svg width="15" height="15" style="display:inline;vertical-align:-2px;flex-shrink:0;margin-right:3px" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="128" cy="128" r="96"/><circle cx="128" cy="128" r="48"/></svg>`;
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
        oninput="onTableChange('${escH(t.id)}','hours',this.value);checkTableField(this,'warn-h-${escH(t.id)}')">
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
        <select onchange="onFilamentChange('${escH(t.id)}',${fi},'filamentId',this.value)">${filamentOpts(f)}</select>
      </div>
      <div class="fld">
        <label>${iconGrams}Граммов филамента</label>
        <input type="number" value="${escH(f.grams)}" min="1" step="1"
          oninput="onFilamentChange('${escH(t.id)}',${fi},'grams',this.value);checkTableField(this,'warn-g-${escH(t.id)}-${fi}')">
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
      <input type="number" value="${+t.defect || 0}" min="0" max="50" step="0.5" oninput="onTableChange('${escH(t.id)}','defect',+this.value)">
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
  t.filaments.push({ id: uid(), filamentId: (cfg.filaments[0] || {}).id || '', grams: '0' });
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

const fmt = n => new Intl.NumberFormat('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n) + ' ₽';
const uid = () => Math.random().toString(36).slice(2, 8);
const gv = id => { const e = document.getElementById(id); return e ? e.value : ''; };
const sv = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };

// ── UI: DRAWERS / MODALS ───────────────────────────────────
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
  el.textContent = rate > 0 ? `22 дня × 8 ч = ${new Intl.NumberFormat('ru-RU').format(monthly)} ₽/мес` : '';
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
  const snap = buildSnap(name);
  if (replace) { const i = reg.findIndex(r => r.name === name); if (i >= 0) reg[i] = snap; }
  else reg.unshift(snap);
  svR(); closeM('mo-save');
}
function buildSnap(name) {
  // Берём первый стол для совместимости с реестром (printerName, filamentName, hours, grams)
  const t0 = tables[0] || {};
  const pr = cfg.printers.find(p => p.id === t0.printerId) || cfg.printers[0] || {};
  // filamentName: join имён всех филаментов первого стола
  const t0filaments = t0.filaments || [];
  const filamentName = t0filaments.length
    ? t0filaments.map(f => (cfg.filaments.find(p => p.id === f.filamentId) || cfg.filaments[0] || {}).name || '—').join(', ')
    : '—';
  // grams: сумма всех граммов первого стола
  const gramsTotal = t0filaments.reduce((s, f) => s + (parseFloat(f.grams) || 0), 0);
  return {
    id: uid(), name, date: new Date().toLocaleDateString('ru-RU'),
    printerName: pr.name || '—', filamentName,
    hours: t0.hours || '0', grams: String(gramsTotal),
    cost1: comp.cost1,
    orderName: gv('order-name') || 'Новый заказ',
    params: {
      tables: tables.map(t => ({...t})),
      qty: gv('qty'),
      extraFixed: gv('extraFixed'), extraParts: gv('extraParts'), packaging: gv('packaging'),
      prepTime: gv('prepTime'), postTime: gv('postTime'), logTime: gv('logTime'),
      commission: gv('commission'), commFixed: gv('commFixed'),
      customPrice: gv('custom-price'), selP, selT,
      // legacy-совместимость для старых снапов
      filamentId: (t0filaments[0] || {}).filamentId || t0.filamentId,
      printerId: t0.printerId,
      grams: String(gramsTotal), hours: t0.hours, drying: t0.drying,
    }
  };
}

// ── РЕЕСТР ──────────────────────────────────────────────────
function renderReg() {
  const q = document.getElementById('reg-q').value.trim().toLowerCase();
  const base = q ? reg.filter(r => r.name.toLowerCase().includes(q) || r.date.includes(q) || (r.printerName || '').toLowerCase().includes(q)) : reg;
  const list = sortedReg(base);
  const el = document.getElementById('reg-list');
  if (!list.length) { el.innerHTML = `<div class="reg-empty">${q ? 'Ничего не найдено' : 'Нет сохранённых расчётов'}</div>`; return; }
  el.innerHTML = list.map(r => `
    <div class="ri">
      <button class="ri-load" title="Загрузить в калькулятор" onclick="loadSnap('${r.id}')"><svg width="15" height="15" style="display:inline;vertical-align:-2px;flex-shrink:0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><line x1="128" y1="144" x2="128" y2="32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><polyline points="216 144 216 208 40 208 40 144" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><polyline points="88 72 128 32 168 72" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/></svg></button>
      <div class="ri-info">
        <div class="ri-title">${escH(r.name)}</div>
        <div class="ri-meta"><span class="ri-seg">${escH(r.date)}</span><span class="ri-sep"> · </span><span class="ri-seg">${escH(r.printerName)}</span>${r.cost1 ? '<span class="ri-sep"> · </span><span class="ri-seg">' + fmt(r.cost1) + '/шт</span>' : ''}</div>
        <div class="ri-sub"><span class="ri-seg">${escH(String(r.hours))} ч</span><span class="ri-sep"> · </span><span class="ri-seg">${escH(String(r.grams))} г</span><span class="ri-sep"> · </span><span class="ri-seg">${escH(r.filamentName)}</span></div>
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

  // Восстанавливаем название заказа
  sv('order-name', r.orderName || p.orderName || '');

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
  return [
    ['Название', r.name], ['Дата', r.date], ['Принтер', r.printerName], ['Филамент', r.filamentName],
    ['Часов печати', +r.hours], ['Граммов филамента', +r.grams],
    ['Себестоимость 1 шт, ₽', r.cost1 ? +r.cost1.toFixed(2) : ''],
    ['— ПАРАМЕТРЫ —', ''],
    ['Количество штук (годных)', +(p.qty || 0)],
    ['Сушка', p.drying === 'yes' ? 'Да' : 'Нет'],
    ['Доп. затраты фикс. (₽)', +(p.extraFixed || 0)],
    ['Доп. детали на 1 шт (₽)', +(p.extraParts || 0)],
    ['Упаковка на 1 шт (₽)', +(p.packaging || 0)],
    ['Время подготовки (мин)', +(p.prepTime || 0)],
    ['Время постобработки (мин)', +(p.postTime || 0)],
    ['Время упаковки/лог. (мин)', +(p.logTime || 0)],
    ['Комиссия площадки %', +(p.commission || 0)],
    ['Фикс. комиссия (₽)', +(p.commFixed || 0)],
    ['Своя цена', +(p.customPrice || 0)],
    ['Выбранная цена продажи', p.selP || 'retail_light'],
    ['Выбранный налог', p.selT || 'none'],
  ];
}
function exportOne(id) {
  if (typeof XLSX === 'undefined') { alert('XLSX не загружен — нужен интернет'); return; }
  const r = reg.find(x => x.id === id); if (!r) return;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([['Параметр', 'Значение'], ...snapToRows(r)]);
  ws['!cols'] = [{wch: 30}, {wch: 22}];
  XLSX.utils.book_append_sheet(wb, ws, 'Расчёт');
  xlsDL(wb, `3dprint_${r.name.replace(/[\s\/\\:*?"<>|]+/g, '_')}.xlsx`);
}
function exportAllXlsx() {
  if (!reg.length) { alert('Реестр пуст'); return; }
  if (typeof XLSX === 'undefined') { alert('XLSX не загружен'); return; }
  const wb = XLSX.utils.book_new();
  const rows = [['Название', 'Дата', 'Принтер', 'Филамент', 'Часов', 'Граммов', 'Себест. 1шт, ₽']];
  reg.forEach(r => rows.push([r.name, r.date, r.printerName, r.filamentName, +r.hours, +r.grams, r.cost1 ? +r.cost1.toFixed(2) : '']));
  const ws1 = XLSX.utils.aoa_to_sheet(rows); ws1['!cols'] = [{wch: 28}, {wch: 12}, {wch: 16}, {wch: 10}, {wch: 8}, {wch: 10}, {wch: 16}];
  XLSX.utils.book_append_sheet(wb, ws1, 'Реестр');
  reg.forEach(r => {
    const ws = XLSX.utils.aoa_to_sheet([['Параметр', 'Значение'], ...snapToRows(r)]);
    ws['!cols'] = [{wch: 30}, {wch: 22}];
    let sname = (r.name || '').slice(0, 25).replace(/[\[\]\*\/\\?:]/g, '') || r.id.slice(0, 8) || 'Sheet';
    { const o = sname; let n = 2; while (wb.SheetNames.includes(sname)) { sname = o.slice(0, 22) + ' ' + n++; } }
    XLSX.utils.book_append_sheet(wb, ws, sname);
  });
  xlsDL(wb, '3dprint_registry.xlsx');
}
function exportAllJson() {
  const blob = new Blob([JSON.stringify({cfg, reg}, null, 2)], {type: 'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '3dprint_backup.json';
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
  rows.slice(1).forEach(r => { if (r[0] && r[1] !== undefined) map[r[0]] = r[1]; });
  if (!map['Название'] && !map['Часов печати']) return null;
  const name = String(map['Название'] || fallbackName || 'Без названия');
  const dup = reg.find(r => r.name === name);
  return {
    id: uid(),
    name: dup ? name + ' (' + new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}) + ')' : name,
    date: xlsxDateToStr(map['Дата']),
    printerName: String(map['Принтер'] || '—'),
    filamentName: String(map['Филамент'] || '—'),
    hours: String(map['Часов печати'] || 0),
    grams: String(map['Граммов филамента'] || 0),
    cost1: map['Себестоимость 1 шт, ₽'] || null,
    params: {
      filamentId: 'petg', printerId: 'bambu',
      grams: String(map['Граммов филамента'] || 0),
      hours: String(map['Часов печати'] || 0),
      drying: map['Сушка'] === 'Да' ? 'yes' : 'no',
      qty: String(map['Количество штук'] || map['Количество штук (годных)'] || 1),
      extraFixed: String(map['Доп. затраты фикс. (₽)'] || 0),
      extraParts: String(map['Доп. детали на 1 шт (₽)'] || 0),
      packaging: String(map['Упаковка на 1 шт (₽)'] || 0),
      prepTime: String(map['Время подготовки (мин)'] || 0),
      postTime: String(map['Время постобработки (мин)'] || 0),
      logTime: String(map['Время упаковки/лог. (мин)'] || 0),
      commission: String(map['Комиссия площадки %'] || 0),
      commFixed: String(map['Фикс. комиссия (₽)'] || 0),
      customPrice: String(map['Своя цена'] || ''),
      selP: map['Выбранная цена продажи'] || 'retail_light',
      selT: map['Выбранный налог'] || 'none',
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
function applySnapToCalc(p) {
  if (!p) return;
  ['grams', 'hours', 'qty', 'extraFixed', 'extraParts', 'packaging', 'prepTime', 'postTime', 'logTime', 'commission', 'commFixed'].forEach(k => sv(k, p[k] || ''));
  sv('custom-price', p.customPrice || '');
  // #plastic select removed (multitable) — filamentId restored via loadSnap→tables
  const pr = document.getElementById('printer'); if ([...pr.options].some(o => o.value === p.printerId)) pr.value = p.printerId;
  rebuildDrying(); sv('drying', p.drying || 'no');
  if (p.selP) { selP = p.selP; Object.keys(PCS).forEach(k => { const e = document.getElementById(PCS[k].id); if (e) e.classList.toggle('sel', k === selP); }); }
  if (p.selT) { selT = p.selT; renderTaxOps(); }
  calc(); checkAllFields();
}
let pickerSnaps = [];
function pickSnap(i) {
  const s = pickerSnaps[i];
  if (s && s.params) { applySnapToCalc(s.params); }
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
          applySnapToCalc(snaps[0].params);
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
    if (sortField === 'printer') return sortDir * (a.printerName || '').localeCompare(b.printerName || '', 'ru');
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
      tables: tables.map(t => ({...t})),
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
  updateWageCalc();
  renderDryers(); renderPrinters(); renderFilaments(); renderTaxes();
  syncDryerSel();
}
const dOpts = sel => cfg.dryers.map(d => `<option value="${escH(d.id)}"${d.id === sel ? ' selected' : ''}>${escH(d.name)} (${d.kw} кВт)</option>`).join('');
function renderDryers() { document.getElementById('dryers-list').innerHTML = cfg.dryers.map((d, i) => `<div class="si"><div class="si-h"><div class="si-name">${escH(d.name)}</div><button class="del-btn" onclick="delDryer('${d.id}')">Удалить</button></div><div class="sg2"><div class="sf"><label>Название</label><input type="text" value="${d.name}" oninput="cfg.dryers[${i}].name=this.value;this.closest('.si').querySelector('.si-name').textContent=this.value;renderPrinters()"></div><div class="sf"><label>Мощность (кВт)</label><input type="number" value="${d.kw}" min="0" step="0.01" oninput="cfg.dryers[${i}].kw=+this.value"></div></div></div>`).join(''); }
function renderPrinters() { document.getElementById('printers-list').innerHTML = cfg.printers.map((p, i) => `<div class="si"><div class="si-h"><div class="si-name">${escH(p.name)}</div><button class="del-btn" onclick="delPrinter('${p.id}')">Удалить</button></div><div class="sg2"><div class="sf" style="grid-column:span 2"><label>Название</label><input type="text" value="${p.name}" oninput="cfg.printers[${i}].name=this.value;this.closest('.si').querySelector('.si-name').textContent=this.value"></div><div class="sf"><label>Стоимость (₽)</label><input type="number" value="${p.cost}" min="0" step="100" oninput="cfg.printers[${i}].cost=+this.value"></div><div class="sf"><label>Часов амортизации</label><input type="number" value="${cfg.depreciationHours}" min="1" step="100" oninput="cfg.depreciationHours=+this.value"></div><div class="sf"><label>Мощность печати (кВт)</label><input type="number" value="${p.kw}" min="0" step="0.01" oninput="cfg.printers[${i}].kw=+this.value"></div><div class="sf"><label>Обслуживание (₽/час)</label><input type="number" value="${p.maintenance ?? 5}" min="0" step="0.5" oninput="cfg.printers[${i}].maintenance=+this.value"></div><div class="sf" style="grid-column:span 2"><label>Сушилка</label><select onchange="cfg.printers[${i}].dryerId=this.value">${dOpts(p.dryerId)}</select></div></div></div>`).join(''); }
function renderFilaments() { document.getElementById('filaments-list').innerHTML = cfg.filaments.map((p, i) => `<div class="si"><div class="si-h"><div class="si-name">${escH(p.name)}</div><button class="del-btn" onclick="delFilament('${p.id}')">Удалить</button></div><div class="sg2"><div class="sf"><label>Название</label><input type="text" value="${p.name}" oninput="cfg.filaments[${i}].name=this.value;this.closest('.si').querySelector('.si-name').textContent=this.value"></div><div class="sf"><label>Цена за кг (₽)</label><input type="number" value="${p.pricePerKg}" min="0" step="10" oninput="cfg.filaments[${i}].pricePerKg=+this.value"></div></div></div>`).join(''); }
function renderTaxes() { document.getElementById('taxes-list').innerHTML = cfg.taxes.map((t, i) => `<div class="tax-row"><div class="sf"><label>Название</label><input type="text" value="${t.name}" oninput="cfg.taxes[${i}].name=this.value"></div><div class="sf"><label>Ставка %</label><input type="number" value="${t.rate}" min="0" max="100" step="0.1" oninput="cfg.taxes[${i}].rate=+this.value"></div><button class="del-btn" onclick="delTax('${t.id}')">✕</button></div>`).join(''); }
function addDryer() { cfg.dryers.push({id: uid(), name: 'Новая сушилка', kw: 0.3}); renderDryers(); renderPrinters(); }
function delDryer(id) { cfg.dryers = cfg.dryers.filter(d => d.id !== id); cfg.printers.forEach(p => { if (p.dryerId === id) p.dryerId = cfg.dryers[0]?.id || ''; }); renderDryers(); renderPrinters(); }
function addPrinter() { cfg.printers.push({id: uid(), name: 'Новый принтер', cost: 30000, kw: 0.15, dryerId: cfg.dryers[0]?.id || '', maintenance: 5}); renderPrinters(); }
function delPrinter(id) { cfg.printers = cfg.printers.filter(p => p.id !== id); renderPrinters(); }
function addFilament() { cfg.filaments.push({id: uid(), name: 'Новый филамент', pricePerKg: 1000}); renderFilaments(); }
function delFilament(id) { cfg.filaments = cfg.filaments.filter(p => p.id !== id); renderFilaments(); }
function addTax() { cfg.taxes.push({id: uid(), name: 'Новый режим', rate: 0}); renderTaxes(); }
function delTax(id) { cfg.taxes = cfg.taxes.filter(t => t.id !== id); renderTaxes(); }
function saveSettings() {
  cfg.electricity = +document.getElementById('s_elec').value || cfg.electricity;
  cfg.operatorRate = +document.getElementById('s_op').value || cfg.operatorRate;
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
  a.download = '3dprint_settings.json'; document.body.appendChild(a); a.click();
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
  res.innerHTML = escH(dryer.name) + ' × ' + h + ' ч × ' + cfg.electricity + ' ₽/кВт·ч = <b>' + fmt(cost) + '</b>';
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
let pendDelId = null;
function confirmDelSnap(id, name) {
  pendDelId = id;
  document.getElementById('del-confirm-text').textContent = '«' + name + '»';
  openM('mo-del-confirm');
}
function execDelSnap() {
  if (pendDelId) { reg = reg.filter(x => x.id !== pendDelId); svR(); renderReg(); pendDelId = null; }
  closeM('mo-del-confirm');
}

// ── ИНИЦИАЛИЗАЦИЯ ─────────────────────────────────────────────
// Все функции готовы — теперь запускаем приложение.
// Сплеш будет скрыт по окончании CSS-анимации fadeOut (см. initSplash выше).
// Инициализация столов
if (tables.length === 0) addTable(); else renderTables();
renderTaxOps();
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

function exportEstimate(format) {
  const orderName = gv('est-order-name') || 'Новый заказ';
  // TODO: user will wire actual export. For now just close.
  console.log('Export estimate:', format, 'option:', estSel, 'orderName:', orderName);
  closeM('mo-estimate');
}

// ── HELP — реализован в help.js ──────────────────────────

// Expose functions globally (called from HTML onclick attributes)
window.xlsDL = xlsDL;
window.openS = openS; window.closeS = closeS;
window.openR = openR; window.closeR = closeR;
window.openM = openM; window.closeM = closeM;
window.calcHours = calcHours; window.copyHours = copyHours; window.openHoursCalc = openHoursCalc; window.calc = calc;
window.updateWageCalc = updateWageCalc;
window.openSaveMo = openSaveMo; window.confirmSave = confirmSave;
window.confirmReplace = confirmReplace;
window.renderReg = renderReg; window.loadSnap = loadSnap; window.delSnap = delSnap;
window.exportOne = exportOne; window.exportAllXlsx = exportAllXlsx; window.exportAllJson = exportAllJson;
window.importRegXlsx = importRegXlsx; window.importXlsxToReg = importXlsxToReg;
window.importFile = importFile; window.pickSnap = pickSnap;
window.setSort = setSort;
window.startRename = startRename; window.confirmRename = confirmRename;
window.saveSettings = saveSettings; window.syncS = syncS;
window.renderDryers = renderDryers; window.renderPrinters = renderPrinters;
window.renderFilaments = renderFilaments; window.renderTaxes = renderTaxes;
window.addDryer = addDryer; window.delDryer = delDryer;
window.addPrinter = addPrinter; window.delPrinter = delPrinter;
window.addFilament = addFilament; window.delFilament = delFilament;
window.addTax = addTax; window.delTax = delTax;
window.selTax = selTax; window.selPrice = selPrice;
window.onPrinterChange = onPrinterChange;
window.exportCfgOnly = exportCfgOnly;
window.syncDryerSel = syncDryerSel; window.adjDryHours = adjDryHours; window.updateDryerCost = updateDryerCost;
window.openSaveAndDownloadMo = openSaveAndDownloadMo;
window.clearRegSearch = clearRegSearch;
window.confirmDelSnap = confirmDelSnap; window.execDelSnap = execDelSnap;
// window.openHelp — задаётся в help.js
window.openEstimateMo = openEstimateMo;
window.selectEst = selectEst;
window.updateEstCustom = updateEstCustom;
window.exportEstimate = exportEstimate;
window.checkField = checkField;
window.checkAllFields = checkAllFields;
window.installPWA = installPWA;
window.App = App;
window.addTable = addTable; window.removeTable = removeTable;
window.onTableChange = onTableChange; window.refreshTableDryer = refreshTableDryer;
window.checkTableField = checkTableField;
window.addTableFilament = addTableFilament; window.removeFilament = removeFilament; window.onFilamentChange = onFilamentChange;
// Экспорт состояния для тест-раннера
Object.defineProperty(window, 'tables', { get: function(){ return tables; } });
Object.defineProperty(window, 'comp',   { get: function(){ return comp;   } });

}); // end DOMContentLoaded
