// Реактивка — мини-лаборатория, таблица возможностей, лента экранов и меню.
(function () {
  "use strict";

  document.documentElement.classList.add("js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Меню на телефоне ----------
  var toggle = document.querySelector(".menu-toggle");
  var menu = document.querySelector(".menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", function (event) {
      if (event.target.tagName === "A") {
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // ---------- Появление блоков ----------
  var blocks = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    blocks.forEach(function (block) { observer.observe(block); });
  } else {
    blocks.forEach(function (block) { block.classList.add("visible"); });
  }

  // ---------- Таблица возможностей ----------
  var specimens = {
    table: ["118 элементов", "Таблица Менделеева", "Все элементы и шесть режимов раскраски: категории, состояние, блоки, электроотрицательность, радиус, год открытия. У каждого элемента — карточка со схемой электронных оболочек и сравнение с другим элементом.", "app-01-table.jpg"],
    lab: ["71 опыт", "Виртуальная лаборатория", "Стакан, пробирка или колба, полка реактивов и спиртовка. Осадки выпадают, газ пузырится, индикатор меняет цвет — а внизу уравнение реакции и объяснение, почему так.", "app-03-lab.jpg"],
    lessons: ["26 уроков", "Уроки по учебнику", "Курс химии 7 класса по параграфам учебника Беларуси: коротко, понятно, с примерами. Урок можно послушать — кнопка «Прочитать вслух».", "app-06-lessons.jpg"],
    quiz: ["171 вопрос", "Тренажёр и самопроверка", "Вопросы после каждого урока с объяснением ответа, викторины по элементам и формулам и работа над ошибками.", "app-08-quiz.jpg"],
    molecule: ["3D-модели", "Вещества и молекулы", "Справочник веществ лаборатории: формула, молярная масса, опыты с веществом и объёмная модель молекулы, которую можно вращать.", "app-05-molecule.jpg"],
    scan: ["камера", "Сфоткай формулу", "Наведи камеру на учебник — приложение найдёт формулы, посчитает молярную массу и уравняет реакцию. А на этикетке узнает соду, уксус и коды E.", "app-11-scan.jpg"],
    speak: ["микрофон", "Скажи элемент", "На экране символ, ты говоришь, как он читается: «купрум», «аш», «эн». Приложение слушает и проверяет. А в лаборатории можно сказать: «добавь соляную кислоту».", "app-09-speak.jpg"],
    indicator: ["камера", "Индикатор по фото", "Сделай индикатор из краснокочанной капусты, сфотографируй раствор — и узнай, кислая среда, нейтральная или щелочная.", "app-12-indicator.jpg"],
    map: ["14 предприятий", "Химическая карта Беларуси", "Предприятия химической промышленности из учебника: что производят и какое ближе всего к тебе.", "app-13-map.jpg"],
    air: ["рядом с тобой", "Воздух вокруг меня", "Оксиды серы и азота, озон и пыль в воздухе рядом — с понятной шкалой и связью с уроком о кислотных дождях.", "app-14-air.jpg"]
  };
  var cells = document.querySelectorAll(".cell");
  var specImage = document.getElementById("spec-img");
  cells.forEach(function (cell) {
    cell.addEventListener("click", function () {
      var data = specimens[cell.dataset.key];
      if (!data) return;
      cells.forEach(function (other) { other.setAttribute("aria-pressed", other === cell ? "true" : "false"); });
      document.getElementById("spec-stat").textContent = data[0];
      document.getElementById("spec-title").textContent = data[1];
      document.getElementById("spec-text").textContent = data[2];
      specImage.src = "images/" + data[3];
      specImage.alt = "Экран приложения: " + data[1];
    });
  });

  // ---------- Лента экранов: тянуть мышью ----------
  var strip = document.querySelector(".samples");
  if (strip) {
    var dragging = false, startX = 0, startScroll = 0;
    strip.addEventListener("pointerdown", function (event) {
      if (event.pointerType !== "mouse") return;
      dragging = true; startX = event.clientX; startScroll = strip.scrollLeft;
      strip.classList.add("dragging");
      strip.setPointerCapture(event.pointerId);
    });
    strip.addEventListener("pointermove", function (event) {
      if (dragging) strip.scrollLeft = startScroll - (event.clientX - startX);
    });
    ["pointerup", "pointercancel"].forEach(function (name) {
      strip.addEventListener(name, function () { dragging = false; strip.classList.remove("dragging"); });
    });
  }

  // ---------- Мини-лаборатория ----------
  var canvas = document.getElementById("flask");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var W = canvas.width, H = canvas.height;
  var contents = [];
  var state = { liquid: null, precipitate: null, bubbles: false, zinc: false };
  var shown = { r: 255, g: 255, b: 255, a: 0 };
  var particles = [], bubbles = [], settled = 0, time = 0;
  var equation = document.getElementById("equation");
  var observation = document.getElementById("observation");

  function formula(text) {
    // Коэффициенты (цифры в начале слагаемого) — обычные, индексы — подстрочные.
    return text.split(" ").map(function (part) {
      var match = part.match(/^(\d*)(.*)$/);
      return match[1] + match[2].replace(/(\d+)/g, "<sub>$1</sub>");
    }).join(" ");
  }
  function has() { for (var i = 0; i < arguments.length; i++) if (contents.indexOf(arguments[i]) < 0) return false; return true; }
  function hex(color) { return { r: parseInt(color.slice(1, 3), 16), g: parseInt(color.slice(3, 5), 16), b: parseInt(color.slice(5, 7), 16) }; }

  // Опыты взяты из базы приложения (там же — источники).
  function react() {
    var liquids = contents.filter(function (id) { return id !== "Zn"; }).length;
    var result = { liquid: liquids ? "#e9f3fb" : null, precipitate: null, bubbles: false, zinc: has("Zn"), eq: "", text: "" };
    if (has("AgNO3", "NaCl")) {
      result.precipitate = "#f7f7f2"; result.eq = formula("AgNO3 + NaCl → AgCl↓ + NaNO3"); result.text = "Сразу выпадает белый осадок хлорида серебра.";
    } else if (has("CuSO4", "NaOH")) {
      result.precipitate = "#4ea3e8"; result.liquid = "#dcecf8"; result.eq = formula("CuSO4 + 2NaOH → Cu(OH)2↓ + Na2SO4"); result.text = "Выпадает голубой осадок гидроксида меди(II).";
    } else if (has("Zn", "HCl")) {
      result.bubbles = true; result.eq = formula("Zn + 2HCl → ZnCl2 + H2↑"); result.text = "Цинк растворяется, бегут пузырьки водорода.";
    } else if (has("NaOH", "HCl", "php")) {
      result.eq = formula("NaOH + HCl → NaCl + H2O"); result.text = "Кислота нейтрализовала щёлочь — малиновая окраска исчезла.";
    } else if (has("NaOH", "HCl")) {
      result.eq = formula("NaOH + HCl → NaCl + H2O"); result.text = "Нейтрализация: получились соль и вода. Капни фенолфталеин — он покажет среду.";
    } else if (has("NaOH", "php")) {
      result.liquid = "#d81b6a"; result.eq = "Фенолфталеин + щёлочь"; result.text = "Индикатор стал малиновым — среда щелочная. Теперь добавь HCl.";
    } else if (has("HCl", "php")) {
      result.eq = "Фенолфталеин + кислота"; result.text = "В кислоте фенолфталеин остаётся бесцветным.";
    } else if (has("CuSO4") && contents.length === 1) {
      result.liquid = "#3f8fd9"; result.eq = "Раствор " + formula("CuSO4"); result.text = "Медный купорос в растворе голубой. Добавь NaOH.";
    } else if (contents.length === 1) {
      result.eq = contents[0] === "php" ? "Фенолфталеин" : formula(contents[0]); result.text = "Добавь второй реактив.";
    } else if (contents.length === 0) {
      result.eq = "Колба пуста"; result.text = "Например, смешай CuSO<sub>4</sub> и NaOH — или капни фенолфталеин в щёлочь.";
    } else {
      result.eq = "Такой реакции здесь нет"; result.text = "В мини-колбе всего несколько опытов, а в приложении их больше семидесяти.";
    }
    if (result.precipitate !== state.precipitate) { particles = []; settled = 0; }
    state = result;
    equation.innerHTML = result.eq;
    observation.innerHTML = result.text;
  }

  document.querySelectorAll(".reagent").forEach(function (button) {
    button.addEventListener("click", function () {
      if (button.hasAttribute("data-reset")) {
        contents = [];
        document.querySelectorAll(".reagent[data-id]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        react();
        return;
      }
      var id = button.dataset.id;
      if (contents.indexOf(id) >= 0) return;
      if (contents.length >= 3) {
        observation.textContent = "Колба полна — вылей и начни заново.";
        return;
      }
      contents.push(id);
      button.setAttribute("aria-pressed", "true");
      react();
    });
  });

  // Геометрия колбы.
  var neckL = 300, neckR = 420, top = 36, shoulder = 210, baseY = 560, baseL = 92, baseR = 628, corner = 34;
  var level = 330;
  function flaskPath() {
    ctx.beginPath();
    ctx.moveTo(neckL, top);
    ctx.lineTo(neckL, shoulder);
    ctx.lineTo(baseL + corner * 0.5, baseY - corner);
    ctx.quadraticCurveTo(baseL, baseY, baseL + corner, baseY);
    ctx.lineTo(baseR - corner, baseY);
    ctx.quadraticCurveTo(baseR, baseY, baseR - corner * 0.5, baseY - corner);
    ctx.lineTo(neckR, shoulder);
    ctx.lineTo(neckR, top);
  }
  function widthAt(y) {
    // Полуширина внутренней части колбы на высоте y — чтобы пузырьки и осадок не вылезали за стекло.
    if (y <= shoulder) return (neckR - neckL) / 2 - 8;
    var t = (y - shoulder) / (baseY - shoulder);
    return ((neckR - neckL) / 2) + t * ((baseR - baseL) / 2 - (neckR - neckL) / 2) - 18;
  }
  var cx = (neckL + neckR) / 2;

  function ink() { return getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#15130f"; }

  function step() {
    time += 1;
    var target = state.liquid ? hex(state.liquid) : { r: 255, g: 255, b: 255 };
    var targetAlpha = state.liquid ? 1 : 0;
    var k = reduceMotion ? 1 : 0.08;
    shown.r += (target.r - shown.r) * k; shown.g += (target.g - shown.g) * k; shown.b += (target.b - shown.b) * k;
    shown.a += (targetAlpha - shown.a) * k;

    if (state.precipitate && settled < 34) {
      var count = reduceMotion ? 60 : 4;
      for (var i = 0; i < count && particles.length < 220; i++) {
        var y = level + 10 + Math.random() * 60;
        particles.push({ x: cx + (Math.random() * 2 - 1) * widthAt(y), y: y, v: 0.6 + Math.random() * 1.2, r: 3 + Math.random() * 4 });
      }
    }
    particles.forEach(function (p) {
      var floor = baseY - 6 - settled;
      if (p.y < floor) { p.y = Math.min(floor, p.y + (reduceMotion ? 999 : p.v)); if (p.y >= floor) settled = Math.min(34, settled + 0.3); }
    });
    if (state.bubbles && !reduceMotion && Math.random() < 0.5) {
      bubbles.push({ x: cx + (Math.random() * 2 - 1) * 120, y: baseY - 30, r: 3 + Math.random() * 6, v: 1.2 + Math.random() * 2 });
    }
    bubbles.forEach(function (b) { b.y -= b.v; b.x += Math.sin((b.y + b.r * 10) / 18) * 0.6; });
    bubbles = bubbles.filter(function (b) { return b.y > level && state.bubbles; });
    draw();
    if (!reduceMotion) requestAnimationFrame(step);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var color = ink();
    ctx.save();
    flaskPath();
    ctx.closePath();
    ctx.clip();
    if (shown.a > 0.01) {
      var fill = "rgba(" + Math.round(shown.r) + "," + Math.round(shown.g) + "," + Math.round(shown.b) + "," + shown.a.toFixed(3) + ")";
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(0, level);
      for (var x = 0; x <= W; x += 12) {
        ctx.lineTo(x, level + (reduceMotion ? 0 : Math.sin(x / 40 + time / 14) * 4));
      }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    }
    if (state.zinc) {
      ctx.fillStyle = "#9aa3ad";
      for (var g = 0; g < 5; g++) {
        ctx.beginPath();
        ctx.ellipse(cx - 90 + g * 45, baseY - 16, 20, 12, g, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (state.precipitate) {
      ctx.fillStyle = state.precipitate;
      particles.forEach(function (p) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillRect(0, baseY - settled, W, settled + 4);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 3;
    bubbles.forEach(function (b) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke(); });
    ctx.restore();

    // Стекло: толстый контур тушью, ободок и блик.
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.strokeStyle = color; ctx.lineWidth = 9;
    flaskPath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(neckL - 26, top); ctx.lineTo(neckR + 26, top); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(neckL + 22, top + 30); ctx.lineTo(neckL + 22, shoulder - 10); ctx.stroke();
    // Риски объёма.
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    [400, 450, 500].forEach(function (y, i) { ctx.beginPath(); ctx.moveTo(cx + widthAt(y) - 40 + i * 4, y); ctx.lineTo(cx + widthAt(y) - 4, y); ctx.stroke(); });
  }

  react();
  // Смесь можно передать ссылкой: index.html?mix=CuSO4,NaOH — так опытом легко поделиться.
  var mix = new URLSearchParams(location.search).get("mix");
  if (mix) {
    mix.split(",").forEach(function (id) {
      var button = document.querySelector('.reagent[data-id="' + id + '"]');
      if (button) button.click();
    });
  }
  step();
})();
