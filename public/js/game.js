// XP, levels, the daily streak and little celebrations for the Lessons tab. Loaded after app.js
// and uses its helpers. Everything is saved in this browser only (like the test scores).

/* ---------------------------------------------------------------- State */

const DAILY_GOAL = 30;
const RANKS = [
  [1, "見習い", "Apprentice"],
  [3, "学生", "Student"],
  [6, "先輩", "Senpai"],
  [10, "達人", "Expert"],
  [15, "先生", "Sensei"],
];

// xp: total ever. day: the last day any XP was earned, dayXp: XP earned on that day,
// streak: days in a row (ending on `day`) with XP earned.
const game = Object.assign({ xp: 0, day: null, dayXp: 0, streak: 0 }, store.get("game", {}));

const dayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayStr(d); };

// Each level needs a little more XP than the one before: 100, 140, 180…
const levelNeed = (lv) => 60 + 40 * lv;
function levelOf(xp) {
  let lv = 1;
  while (xp >= levelNeed(lv)) { xp -= levelNeed(lv); lv++; }
  return { lv, into: xp, need: levelNeed(lv) };
}
const rankOf = (lv) => RANKS.filter((r) => lv >= r[0]).pop();

// A streak only counts while it reaches today or yesterday.
const liveStreak = () => (game.day === dayStr() || game.day === yesterday() ? game.streak : 0);
const todayXp = () => (game.day === dayStr() ? game.dayXp : 0);

function addXP(n, from) {
  const before = levelOf(game.xp).lv;
  const today = dayStr();
  if (game.day !== today) {
    game.streak = game.day === yesterday() ? game.streak + 1 : 1;
    game.day = today;
    game.dayXp = 0;
  }
  const hadGoal = game.dayXp >= DAILY_GOAL;
  game.xp += n;
  game.dayXp += n;
  store.set("game", game);

  if (from) floatXP(from, n);
  renderHud();
  const after = levelOf(game.xp).lv;
  if (after > before) {
    const [, jp, en] = rankOf(after);
    toast(`<b>Level up!</b> Level ${after} · <span lang="ja">${jp}</span> ${en}`);
    burst($(".hud-level .hud-badge"));
  } else if (!hadGoal && game.dayXp >= DAILY_GOAL) {
    toast(`<b>Daily goal reached!</b> 🔥 ${game.streak} day${game.streak === 1 ? "" : "s"} in a row`);
  }
}

/* ---------------------------------------------------------------- Top-of-page stats */

const hudHTML = () => `
  <div class="hud" id="gameHud">
    <div class="hud-tile hud-level">
      <span class="hud-badge"></span>
      <div class="hud-body">
        <div class="hud-title"></div>
        <div class="hud-bar"><span></span></div>
        <div class="hud-sub"></div>
      </div>
    </div>
    <div class="hud-tile hud-streak">
      <span class="hud-icon" aria-hidden="true">🔥</span>
      <div class="hud-body"><div class="hud-big"></div><div class="hud-sub">day streak</div></div>
    </div>
    <div class="hud-tile hud-goal">
      <span class="hud-ring"><span></span></span>
      <div class="hud-body"><div class="hud-big"></div><div class="hud-sub">daily goal</div></div>
    </div>
    <div class="hud-tile hud-lessons">
      <div class="hud-body">
        <div class="hud-big"><span id="lProgressText"></span></div>
        <div class="hud-bar good"><span id="lProgressBar"></span></div>
        <div class="hud-sub">lessons finished</div>
      </div>
    </div>
  </div>`;

function renderHud() {
  const box = $("#gameHud");
  if (!box) return;
  const { lv, into, need } = levelOf(game.xp);
  const [, jp, en] = rankOf(lv);
  $(".hud-level .hud-badge", box).textContent = lv;
  $(".hud-level .hud-title", box).innerHTML = `Level ${lv} · <span lang="ja">${jp}</span> ${en}`;
  $(".hud-level .hud-bar span", box).style.width = `${(into / need) * 100}%`;
  $(".hud-level .hud-sub", box).textContent = `${into} / ${need} XP to level ${lv + 1}`;

  const streak = liveStreak();
  $(".hud-streak", box).classList.toggle("off", todayXp() === 0);
  $(".hud-streak .hud-big", box).textContent = streak;

  const t = todayXp();
  $(".hud-goal", box).classList.toggle("met", t >= DAILY_GOAL);
  $(".hud-goal .hud-ring", box).style.setProperty("--p", `${Math.min(t / DAILY_GOAL, 1) * 100}%`);
  $(".hud-goal .hud-ring span", box).textContent = t >= DAILY_GOAL ? "✓" : "";
  $(".hud-goal .hud-big", box).textContent = `${Math.min(t, DAILY_GOAL)} / ${DAILY_GOAL} XP`;
}

/* ---------------------------------------------------------------- Celebrations */

const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// "+5 XP" rising from the button that earned it.
function floatXP(el, n) {
  const r = el.getBoundingClientRect();
  const f = document.createElement("span");
  f.className = "xp-float";
  f.textContent = `+${n} XP`;
  f.style.left = `${r.left + r.width / 2}px`;
  f.style.top = `${r.top}px`;
  document.body.append(f);
  setTimeout(() => f.remove(), 1000);
}

function toast(html) {
  let box = $("#toasts");
  if (!box) {
    box = document.createElement("div");
    box.id = "toasts";
    box.setAttribute("role", "status");
    document.body.append(box);
  }
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = html;
  box.append(t);
  setTimeout(() => t.classList.add("out"), 3200);
  setTimeout(() => t.remove(), 3700);
}

// A small burst of coloured confetti from the middle of `el`.
function burst(el) {
  if (!el || calm()) return;
  const r = el.getBoundingClientRect();
  const colours = ["topic", "subject", "object", "point", "time", "with", "also"];
  for (let i = 0; i < 26; i++) {
    const c = document.createElement("span");
    c.className = "confetti";
    const a = Math.random() * Math.PI * 2;
    const d = 60 + Math.random() * 90;
    c.style.left = `${r.left + r.width / 2}px`;
    c.style.top = `${r.top + r.height / 2}px`;
    c.style.background = `var(--c-${colours[i % colours.length]})`;
    c.style.setProperty("--x", `${Math.cos(a) * d}px`);
    c.style.setProperty("--y", `${Math.sin(a) * d - 40}px`);
    c.style.setProperty("--r", `${Math.random() * 720 - 360}deg`);
    document.body.append(c);
    setTimeout(() => c.remove(), 1100);
  }
}

const starsHTML = (n, label = true) =>
  `<span class="stars"${label ? ` aria-label="${n} of 3 stars"` : ""}>${[1, 2, 3].map((s) => `<span class="star${s <= n ? " on" : ""}">★</span>`).join("")}</span>`;

/* ---------------------------------------------------------------- Keyboard: 1–4 answers */

// The quiz most recently drawn by askIn() answers to the number keys.
let keyQuiz = null;
document.addEventListener("keydown", (e) => {
  if (!keyQuiz || !keyQuiz.isConnected || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest("input, textarea, select")) return;
  const b = $$(".q-opt", keyQuiz)[+e.key - 1];
  if (b && !b.disabled) { e.preventDefault(); b.click(); }
});
