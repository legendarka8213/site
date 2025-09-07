/*
  ИСП252П — расписание, переключатель недель (1/2), темы (светлая/тёмная),
  живая индикация текущей/следующей пары и адаптация под мобильные.
*/

// ---- Data ----
const TIMES = [
  { num: 1, start: "08:15", end: "09:45", break: 15 },
  { num: 2, start: "10:00", end: "11:30", break: 15 },
  { num: 3, start: "11:45", end: "13:15", break: 30 },
  { num: 4, start: "13:45", end: "15:15", break: 0 },
];

// Расписание по дням. Ключи: 1=Пн, 2=Вт, 3=Ср, 4=Чт, 5=Пт
// Для среды на 4-й паре — чередование по неделям (week 1 -> Физика, week 2 -> Информатика)
const SCHEDULE = {
  1: [ // Понедельник
    { time: "08:15", name: "История", teacher: "Сотникова Е.С.", room: "АУД. 11 ЛК2" },
    { time: "10:00", name: "Обществознание", teacher: "Сотникова Е.С.", room: "АУД. 11 ЛК2" },
    { time: "11:45", name: "Математика", teacher: "Кадина И.В.", room: "АУД. 241 А ГК" },
    { time: "13:45", name: "Математика", teacher: "Кадина И.В.", room: "АУД. 241 А ГК" },
  ],
  2: [ // Вторник
    { time: "08:15", name: "Основы безопасности и защиты Родины", teacher: "Шашко В.А.", room: "АУД. 12 ЛК2" },
    { time: "10:00", name: "Русский язык", teacher: "Уфимцева В.И", room: "АУД. 7 ЛК1" },
    { time: "11:45", name: "Индивидуальный проект", teacher: "Казарян О.В.", room: "АУД. 8 ЛК1" },
    { time: "13:45", name: "Математика", teacher: "Кадина И.В.", room: "АУД. 09" },
  ],
  3: [ // Среда
    { time: "08:15", name: "НЕТ ПАР", teacher: "", room: "" },
    { time: "10:00", name: "История", teacher: "Сотникова Е.С.", room: "АУД. 11 ЛК2" },
    { time: "11:45", name: "Физика", teacher: "Пазухина А.Ю.", room: "АУД. 342" },
    // 13:45 — чередование неделя 1/2
    { time: "13:45", alt: {
        1: { name: "Физика", teacher: "Пазухина А.Ю.", room: "АУД. 342" },
        2: { name: "Информатика", teacher: "Фролова Е.Н.", room: "АУД. 238" },
      }
    },
  ],
  4: [ // Четверг
    { time: "08:15", name: "Химия", teacher: "Шарапова Е.А.", room: "АУД. 306 ГК" },
    { time: "10:00", name: "Математика", teacher: "Кадина И.В.", room: "АУД. 241А ГК" },
    { time: "11:45", name: "Информатика", teacher: "Фролова Е.Н.", room: "АУД. 238" },
    { time: "13:45", name: "Биология", teacher: "Тибирькова Н.Н.", room: "АУД." },
  ],
  5: [ // Пятница
    { time: "08:15", name: "Классные часы «Разговоры о важном»", teacher: "", room: "" },
    { time: "10:00", name: "Иностранный язык", teacher: "Евстифеева М.С.", room: "АУД. 4 ЛК" },
    { time: "11:45", name: "Физическая культура", teacher: "", room: "АУД. Спорт зал кор. КГ" },
    { time: "13:45", name: "Русский язык", teacher: "Уфимцева В.И", room: "АУД. 7 ЛК1" },
  ],
};

const DAYS = [null, "Понедельник", "Вторник", "Среда", "Четверг", "Пятница"];

// ---- Helpers ----
function parseTimeToDate(timeStr) {
  // returns Date today with HH:MM set
  const [hh, mm] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
}

function getCurrentDayIndex() {
  // JS: 0=Sunday ... 6=Saturday; we need 1..5 for Mon..Fri
  const js = new Date().getDay();
  if (js === 0) return 7; // Sunday as 7, to sort after workdays
  return js; // 1..6
}

function getIsoWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // ISO week date weeks start on Monday, so correct the day number
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function guessWeekParity() {
  // Week 1: odd ISO week, Week 2: even ISO week
  const iso = getIsoWeekNumber();
  return iso % 2 ? 1 : 2;
}

function isNowBetween(startStr, endStr) {
  const now = new Date();
  const s = parseTimeToDate(startStr);
  const e = parseTimeToDate(endStr);
  return now >= s && now <= e;
}

function nextPairInfo() {
  const now = new Date();
  for (const t of TIMES) {
    const s = parseTimeToDate(t.start);
    const e = parseTimeToDate(t.end);
    if (now < s) return { type: "before", pair: t, start: s };
    if (now >= s && now <= e) return { type: "ongoing", pair: t, end: e };
  }
  return { type: "after" };
}

// ---- Rendering ----
function renderWeek(weekNum) {
  const wrap = document.getElementById("week");
  wrap.innerHTML = "";
  const todayIdx = getCurrentDayIndex();

  for (let day = 1; day <= 5; day++) {
    const dayBox = document.createElement("div");
    dayBox.className = "day";

    const head = document.createElement("div");
    head.className = "day__header";
    const title = document.createElement("div");
    title.className = "day__title";
    title.textContent = DAYS[day];
    const todayBadge = document.createElement("div");
    if (day === todayIdx) {
      todayBadge.className = "day__today";
      todayBadge.textContent = "сегодня";
    }
    head.appendChild(title);
    head.appendChild(todayBadge);

    const list = document.createElement("div");
    list.className = "day__list";

    const items = SCHEDULE[day] || [];
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Нет занятий";
      list.appendChild(empty);
    } else {
      for (const item of items) {
        if (item.alt) {
          const data = item.alt[weekNum];
          const box = document.createElement("div");
          box.className = "lesson lesson--alt";
          box.innerHTML = `
            <div class="lesson__time">${item.time}</div>
            <div class="lesson__name">${data.name}</div>
            <div class="lesson__meta">${data.teacher ? data.teacher + " • " : ""}${data.room}</div>
            <div class="lesson__meta">Альтернирует каждую неделю</div>
          `;
          list.appendChild(box);
        } else {
          const box = document.createElement("div");
          box.className = "lesson";
          box.innerHTML = `
            <div class="lesson__time">${item.time}</div>
            <div class="lesson__name">${item.name}</div>
            <div class="lesson__meta">${item.teacher ? item.teacher + " • " : ""}${item.room}</div>
          `;
          list.appendChild(box);
        }
      }
    }

    dayBox.appendChild(head);
    dayBox.appendChild(list);
    // mark attributes for mobile collapsible behavior
    if (day === todayIdx) {
      dayBox.setAttribute('data-today', 'true');
    }
    wrap.appendChild(dayBox);
  }
}

function updateNowStatus(weekNum) {
  const statusEl = document.getElementById("nowStatus");
  const info = nextPairInfo();

  if (info.type === "before") {
    // Следующая пара через ...
    const mins = Math.round((info.start - new Date()) / 60000);
    statusEl.textContent = `Следующая пара (#${info.pair.num}) начнётся через ${mins} мин. (${info.pair.start})`;
  } else if (info.type === "ongoing") {
    const mins = Math.round((info.end - new Date()) / 60000);
    statusEl.textContent = `Идёт #${info.pair.num}-я пара, осталось ~${mins} мин. (до ${info.pair.end})`;
  } else {
    statusEl.textContent = "Сегодня пары закончились";
  }
}

function tickClock() {
  const now = new Date();
  const dateOpts = { weekday: "long", day: "2-digit", month: "long" };
  const timeOpts = { hour: "2-digit", minute: "2-digit" };
  document.getElementById("nowDate").textContent = now.toLocaleDateString("ru-RU", dateOpts);
  document.getElementById("nowClock").textContent = now.toLocaleTimeString("ru-RU", timeOpts);
}

// ---- Theme & Week persistence ----
const storage = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
};

function applyTheme(theme) {
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function init() {
  const weekBtn = document.getElementById("weekButton");
  const themeBtn = document.getElementById("themeToggle");
  const nowWeekEl = document.getElementById("nowWeek");
  const todayBtn = document.getElementById("todayButton");

  // Init week
  const storedWeek = storage.get("week", null);
  let currentWeek = storedWeek || guessWeekParity();

  // Init theme: follow stored or system preference
  const storedTheme = storage.get("theme", null);
  let theme = storedTheme;
  if (!theme) {
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    theme = prefersLight ? "light" : "dark";
  }
  applyTheme(theme);
  themeBtn.textContent = theme === "light" ? "Тёмная тема" : "Светлая тема";

  // Render
  const setWeekButtonText = () => {
    weekBtn.textContent = `Неделя ${currentWeek}`;
  };
  const setWeekLabel = () => {
    if (nowWeekEl) nowWeekEl.textContent = `Неделя ${currentWeek}`;
  };
  setWeekButtonText();
  setWeekLabel();
  renderWeek(Number(currentWeek));
  tickClock();
  updateNowStatus(Number(currentWeek));

  // ---- Mobile collapsible days ----
  const isMobile = () => window.matchMedia && window.matchMedia('(max-width: 680px)').matches;
  function applyCollapsible() {
    const wrap = document.getElementById('week');
    const days = Array.from(wrap.querySelectorAll('.day'));
    if (!isMobile()) {
      days.forEach(d => d.removeAttribute('data-collapsed'));
      return;
    }
    // collapse all except today by default
    days.forEach(d => {
      const isToday = d.getAttribute('data-today') === 'true';
      d.setAttribute('data-collapsed', isToday ? 'false' : 'true');
    });
    // attach toggles
    days.forEach(d => {
      const header = d.querySelector('.day__header');
      header.onclick = () => {
        const collapsed = d.getAttribute('data-collapsed') === 'true';
        // If mobile, close others when opening this one
        if (isMobile() && collapsed) {
          days.forEach(x => x.setAttribute('data-collapsed', x === d ? 'false' : 'true'));
        } else {
          d.setAttribute('data-collapsed', collapsed ? 'false' : 'true');
        }
      };
    });
  }
  applyCollapsible();

  // Events
  weekBtn.addEventListener("click", () => {
    currentWeek = currentWeek === 1 ? 2 : 1;
    storage.set("week", currentWeek);
    setWeekButtonText();
    setWeekLabel();
    renderWeek(currentWeek);
    updateNowStatus(currentWeek);
    applyCollapsible();
  });

  themeBtn.addEventListener("click", () => {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    const next = isLight ? "dark" : "light";
    applyTheme(next);
    storage.set("theme", next);
    themeBtn.textContent = next === "light" ? "Тёмная тема" : "Светлая тема";
  });

  // Live updates
  setInterval(() => {
    tickClock();
    updateNowStatus(Number(currentWeek));
  }, 1000 * 30); // обновляем каждые 30 сек
}

window.addEventListener("DOMContentLoaded", init);
