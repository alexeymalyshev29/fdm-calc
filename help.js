// ============================================================
// help.js — Справка 3D Print Calculator
// Открывается через openHelp() как drawer #dr-h / overlay #ov-h
// ============================================================

(function initHelp() {

  // ── Контент справки ────────────────────────────────────────
  var SECTIONS = [
    {
      id: 'qs',
      title: '🚀 Быстрый старт',
      body: `
        <ol class="help-ol">
          <li>Выберите <b>пластик</b> и <b>принтер</b> в верхней части формы.</li>
          <li>Введите <b>граммы</b> (вес модели со слайсера) и <b>часы печати</b>.</li>
          <li>Укажите <b>количество штук</b> в партии — калькулятор покажет себестоимость единицы и партии.</li>
          <li>Выберите <b>налоговый режим</b> и нажмите на карточку цены (опт / розница / своя).</li>
          <li>Нажмите <b>Смета</b> — получите красивый расчёт для клиента.</li>
        </ol>
      `
    },
    {
      id: 'params',
      title: '📋 Параметры расчёта',
      body: `
        <dl class="help-dl">
          <dt>Граммы</dt><dd>Вес модели из слайсера (Bambu Studio, Orca, Cura). Только пластик — без учёта поддержек, если они из другого материала.</dd>
          <dt>Часы печати</dt><dd>Время печати из слайсера. Используйте калькулятор <b>дн + ч + мин →</b> кнопка <b>?</b> рядом с полем.</dd>
          <dt>Сушка</dt><dd>Включает стоимость электричества сушилки за время печати. Сушилка привязана к принтеру в Настройках.</dd>
          <dt>Количество штук</dt><dd>Партия. Фиксированные затраты (оператор, подготовка) делятся на всю партию.</dd>
          <dt>Время оператора</dt><dd>Подготовка + постобработка + логистика — в минутах. Умножается на ставку оператора из Настроек.</dd>
          <dt>Доп. расходы</dt><dd>Расходники (шпатели, клей, абразивы) — за штуку. Упаковка — за штуку. Фиксированные — на всю партию.</dd>
          <dt>Комиссия площадки</dt><dd>% от цены продажи (Wildberries, Avito, Etsy и т.д.). Вычитается из выручки.</dd>
        </dl>
      `
    },
    {
      id: 'dryers',
      title: '🌬️ Сушилки',
      body: `
        <p>Каждый принтер имеет привязанную сушилку — она включается переключателем <b>Сушка</b> в форме расчёта.</p>
        <p>Стоимость сушки = мощность сушилки (кВт) × часы печати × тариф электричества.</p>
        <p>Добавить, удалить или изменить сушилки и их привязку к принтерам можно в <b>Настройках → Сушилки</b>.</p>
        <p>Отдельный <b>Калькулятор сушки</b> (вкладка Сушка) считает стоимость просушки пластика без печати.</p>
      `
    },
    {
      id: 'taxes',
      title: '🧾 Налоговые режимы',
      body: `
        <p>Выберите режим под карточками цен — налог вычитается из выручки при расчёте прибыли.</p>
        <dl class="help-dl">
          <dt>Без налога</dt><dd>Для расчётов «до налогов» или если налог уже учтён в наценке.</dd>
          <dt>Самозанятый (4%)</dt><dd>НПД при продаже физлицам. Если покупатель — ИП или юрлицо, ставка 6%.</dd>
          <dt>ИП / Юрлицо (6%)</dt><dd>УСН «Доходы». Подходит для большинства ИП на упрощёнке.</dd>
        </dl>
        <p>Добавить свой режим или изменить ставку — <b>Настройки → Налоговые режимы</b>.</p>
      `
    },
    {
      id: 'formula',
      title: '🔢 Формула расчёта',
      body: `
        <p>Себестоимость <b>1 штуки</b>:</p>
        <pre class="help-pre">
Пластик   = граммы / 1000 × цена за кг / qty
Принтер   = стоимость / часы_амортизации × часы
Эл-во     = (кВт_принтера + кВт_сушилки) × часы × тариф / qty
Обслуж.   = ставка_обслуж × часы / qty
Оператор  = (подг + пост + лог) мин / 60 × ставка / qty
Доп.расх. = расходники + упаковка + фикс / qty
─────────────────────────────────────────────
База      = сумма всех статей
+ Брак    = база × % / 100
= Итого   = база + брак</pre>
        <p>Цены продажи: опт ×2, розница лёгкая ×3, розница полная ×4 от себестоимости.</p>
      `
    },
    {
      id: 'smeta',
      title: '📄 Смета для клиента',
      body: `
        <p>Кнопка <b>Смета</b> открывает модальное окно с тремя вариантами количества:</p>
        <ul class="help-ul">
          <li><b>1 штука</b> — цена единицы.</li>
          <li><b>Партия</b> — текущее количество из формы.</li>
          <li><b>Своё количество</b> — введите любое число.</li>
        </ul>
        <p>В смете показывается только <b>цена продажи</b> — себестоимость клиенту не видна.</p>
        <p>Экспорт сметы в <b>Excel</b> или <b>PDF</b> — кнопки внутри модалки.</p>
      `
    },
    {
      id: 'export',
      title: '💾 Сохранение и экспорт',
      body: `
        <ul class="help-ul">
          <li><b>Сохранить</b> — записывает расчёт в реестр (хранится в браузере).</li>
          <li><b>Сохранить + Excel</b> — сохраняет в реестр и сразу скачивает .xlsx.</li>
          <li><b>Реестр</b> — все сохранённые расчёты. Можно искать, сортировать, переименовывать, удалять, экспортировать.</li>
          <li><b>Настройки → Экспорт настроек</b> — сохраняет все ваши пластики, принтеры и тарифы в JSON-файл для переноса на другое устройство.</li>
        </ul>
        <p>⚠️ Данные хранятся в браузере (localStorage). Очистка браузера удаляет реестр — делайте экспорт в Excel регулярно.</p>
      `
    },
    {
      id: 'config',
      title: '⚙️ Настройка под свой бизнес',
      body: `
        <p>Все параметры по умолчанию задаются в файле <b>config.js</b>:</p>
        <ul class="help-ul">
          <li>Бренд и цвет интерфейса</li>
          <li>Список принтеров, пластиков, сушилок</li>
          <li>Тариф электричества, ставка оператора, обслуживание</li>
          <li>Налоговые режимы</li>
        </ul>
        <p>Изменения в Настройках (внутри приложения) сохраняются поверх config.js в браузере и не затрагивают файл.</p>
      `
    }
  ];

  // ── Создаём DOM при первом вызове ──────────────────────────
  var helpReady = false;

  function buildHelp() {
    if (helpReady) return;
    helpReady = true;

    // Overlay
    var ov = document.createElement('div');
    ov.className = 'ov';
    ov.id = 'ov-h';
    ov.onclick = function() { closeHelp(); };
    document.querySelector('.page-wrap').appendChild(ov);

    // Drawer
    var dr = document.createElement('div');
    dr.className = 'drawer';
    dr.id = 'dr-h';
    dr.innerHTML =
      '<div class="dh">' +
        '<div class="dh-title">' +
          '<svg width="18" height="18" style="display:inline;vertical-align:-2px;flex-shrink:0" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"><circle cx="128" cy="128" r="96"/><path d="M120,120a8,8,0,0,1,8,8v40a8,8,0,0,0,8,8"/><circle cx="124" cy="84" r="10" fill="currentColor" stroke="none"/></svg>' +
          'Справка' +
        '</div>' +
        '<button class="dh-close" onclick="closeHelp()">×</button>' +
      '</div>' +
      '<div class="db" id="help-body">' +
        buildSections() +
      '</div>';
    document.querySelector('.page-wrap').appendChild(dr);

    // Стили специфичные для справки
    var style = document.createElement('style');
    style.textContent =
      '.help-section{margin-bottom:4px;border:1px solid var(--border);border-radius:10px;overflow:hidden}' +
      '.help-section-hdr{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;cursor:pointer;font-size:13px;font-weight:600;gap:8px;user-select:none}' +
      '.help-section-hdr:hover{background:rgba(255,255,255,.04)}' +
      '.help-section-arrow{font-size:16px;color:var(--text3);transition:transform .2s;flex-shrink:0}' +
      '.help-section.open .help-section-arrow{transform:rotate(90deg)}' +
      '.help-section-body{display:none;padding:0 14px 12px;font-size:12.5px;line-height:1.65;color:var(--text2)}' +
      '.help-section.open .help-section-body{display:block}' +
      '.help-dl dt{font-weight:600;color:var(--text);margin-top:8px}' +
      '.help-dl dd{margin:2px 0 0 0}' +
      '.help-ol,.help-ul{padding-left:18px;margin:6px 0}' +
      '.help-ol li,.help-ul li{margin-bottom:4px}' +
      '.help-pre{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:10px 12px;font-size:11px;line-height:1.7;overflow-x:auto;white-space:pre;margin:8px 0}' +
      '.help-section-body p{margin:6px 0}' +
      '.help-section-body b{color:var(--text)}';
    document.head.appendChild(style);

    // Аккордеон
    dr.querySelectorAll('.help-section-hdr').forEach(function(hdr) {
      hdr.addEventListener('click', function() {
        var sec = hdr.closest('.help-section');
        sec.classList.toggle('open');
      });
    });
  }

  function buildSections() {
    return SECTIONS.map(function(s) {
      return '<div class="help-section" id="help-' + s.id + '">' +
        '<div class="help-section-hdr">' +
          '<span>' + s.title + '</span>' +
          '<span class="help-section-arrow">›</span>' +
        '</div>' +
        '<div class="help-section-body">' + s.body + '</div>' +
      '</div>';
    }).join('');
  }

  // ── Публичные функции ───────────────────────────────────────
  window.openHelp = function() {
    buildHelp();
    document.getElementById('dr-h').classList.add('open');
    document.getElementById('ov-h').classList.add('open');
  };

  window.closeHelp = function() {
    var dr = document.getElementById('dr-h');
    var ov = document.getElementById('ov-h');
    if (dr) dr.classList.remove('open');
    if (ov) ov.classList.remove('open');
  };

})();
