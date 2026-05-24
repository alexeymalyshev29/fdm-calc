// ============================================================
// config.js — Настройки под конкретный бизнес
// Редактируйте этот файл под ваш бренд, оборудование и тарифы.
// Подключать ПЕРЕД script.js в index.html:
//   <script src="config.js"></script>
//   <script src="script.js"></script>
// ============================================================

var CONFIG = {

  // ── БРЕНД ────────────────────────────────────────────────────
  brand: {
    // Акцентный цвет (пробрасывается в CSS-переменную --blue)
    color: '#0052db',
    // Название приложения (используется в PWA-манифесте)
    appName:      'Калькулятор 3D печати',
    appShortName: '3D Калькулятор',
    appDesc:      'Калькулятор себестоимости FDM 3D печати — пластик, амортизация, электричество, оператор',
  },

  // ── ЗНАЧЕНИЯ ПО УМОЛЧАНИЮ ────────────────────────────────────
  defaults: {
    electricity:        7.08,   // ₽/кВт·ч — тариф на электроэнергию
    operatorRate:       250,    // ₽/ч   — ставка оператора
    depreciationHours:  1500,   // ч     — ресурс принтера для амортизации
    maintenance:        5,      // ₽/ч   — обслуживание (смазка, расходники)
    defect:             0,      // %     — процент брака
  },

  // ── СУШИЛКИ ──────────────────────────────────────────────────
  dryers: [
    { id: 'd1',     name: 'Без сушки',        kw: 0     },
    { id: 'd3',     name: 'CRLTY PI',         kw: 0.145 },
    { id: 'yiwqev', name: 'CRLTY PI PLUS',    kw: 0.16  },
    { id: '08gv07', name: 'CRLTY PI PLUS х2', kw: 0.32  },
    { id: 'jnlpbu', name: 'CRLTY PI X4',      kw: 0.36  },
  ],

  // ── ПРИНТЕРЫ ─────────────────────────────────────────────────
  // dryerId — id сушилки из списка выше, привязанной к принтеру
  printers: [
    { id: 'bambu',   name: 'Bambu A1C', cost: 37000, kw: 0.13, dryerId: 'jnlpbu', maintenance: 5 },
    { id: 'ff_ad5m', name: 'FF AD5M',  cost: 24500, kw: 0.15, dryerId: 'd3',     maintenance: 5 },
    { id: 'ff_ad5x', name: 'FF AD5X',  cost: 33000, kw: 0.20, dryerId: '08gv07', maintenance: 5 },
  ],

  // ── ПЛАСТИКИ ─────────────────────────────────────────────────
  plastics: [
    { id: 'petg',   name: 'PETG', pricePerKg: 900  },
    { id: 'pla',    name: 'PLA',  pricePerKg: 1000 },
    { id: 'g0kzdf', name: 'TPU',  pricePerKg: 1100 },
  ],

  // ── НАЛОГОВЫЕ РЕЖИМЫ ─────────────────────────────────────────
  taxes: [
    { id: 'none', name: 'Без налога',              rate: 0 },
    { id: 'phys', name: 'Физ. лица (самозанятый)', rate: 4 },
    { id: 'jur',  name: 'Юр. лица / ИП',           rate: 6 },
  ],

};

// ── Пробрасываем акцентный цвет в CSS-переменную --blue ──────
(function applyCSSVars() {
  var color = CONFIG && CONFIG.brand && CONFIG.brand.color;
  if (color) {
    document.documentElement.style.setProperty('--blue', color);
  }
})();
