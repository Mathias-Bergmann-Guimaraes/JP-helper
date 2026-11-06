// The Home tab, where the site opens: today's stats, the lesson to carry on with, the spaced review,
// the daily roulettes and a way into every other page. The cards are drawn by game.js,
// lesson-review.js and lesson-roulette.js. Loaded after them and uses their helpers.

// Morning, afternoon or evening, in the Japanese a beginner meets first.
function greeting() {
  const h = new Date().getHours();
  return h >= 5 && h < 11 ? "おはよう" : h >= 11 && h < 18 ? "こんにちは" : "こんばんは";
}

const HOME_PAGES = [
  { tab: "structure", ja: "文", name: "Sentences", about: "See how a sentence fits together, block by block." },
  { tab: "particles", ja: "は", name: "Particles", about: "What each little word does, in pictures." },
  { tab: "verbs", ja: "動", name: "Verbs", about: "Verb groups and every form, for any verb." },
  { tab: "adjectives", ja: "形", name: "Adjectives", about: "い and な adjectives, side by side." },
  { tab: "patterns", ja: "型", name: "Patterns", about: "Common verb patterns and what they mean." },
  { tab: "practice", ja: "練", name: "Practice", about: "Roulettes, guided writing, block building and quick quizzes." },
  { tab: "listen", ja: "聴", name: "Listen", about: "Videos, podcasts and songs matched to the grammar you know." },
  { tab: "mistakes", ja: "直", name: "Mistakes", about: "Every sentence your chatbot corrected, in one place." },
];

function renderHome() {
  $("#home").innerHTML = `
    <div class="card hero home-hero">
      <h1 lang="ja" id="homeGreeting"></h1>
      <p>Pick up your lesson, clear what's due today, then spin a roulette.</p>
      ${hudHTML()}
    </div>
    <div class="home-duo">
      <div class="card home-continue" id="homeContinue"></div>
      <div class="card lquiz rl" id="review"></div>
    </div>
    <div id="homeRoulette"><div class="card lquiz rl" id="roulette"></div></div>
    <div class="card ps" id="stats"></div>
    <div class="card home-pages">
      <div class="rl-head"><span class="rl-kicker">🧭 Explore</span></div>
      <div class="home-tiles">
        ${HOME_PAGES.map((p) => `
          <button class="home-tile" data-page="${p.tab}">
            <span class="home-tile-ja" lang="ja" aria-hidden="true">${p.ja}</span>
            <span><b>${p.name}</b><span class="small muted">${p.about}</span></span>
          </button>`).join("")}
      </div>
    </div>`;
  $$("#home [data-page]").forEach((b) => (b.onclick = () => { track("home.explore"); showTab(b.dataset.page); window.scrollTo({ top: 0 }); }));
  renderHud();
  renderHomeDay();
  renderContinue();
  renderReview();
  renderRoulette();
}

function renderHomeDay() {
  $("#homeGreeting").textContent = greeting();
}

/* ---------------------------------------------------------------- Carry on with a lesson */

// The lesson open last, or once that's finished, the next one that isn't.
function lessonToContinue() {
  const open = LESSONS.find((l) => l.n === lessonState.n) || LESSONS[0];
  if (!lessonPassed(open.n)) return open;
  return LESSONS.find((l) => l.n > open.n && !lessonPassed(l.n)) || LESSONS.find((l) => !lessonPassed(l.n)) || open;
}

function renderContinue() {
  const box = $("#homeContinue");
  if (!box) return;
  const l = lessonToContinue();
  const stars = lessonStars(l);
  const max = l.points.length * 3;
  const next = lessonNextStep(l);
  box.innerHTML = `
    <div class="rl-head">
      <span class="rl-kicker">📖 Your lesson</span>
      <span class="rl-count small">Lesson <b>${l.n}</b> / ${LESSONS.length}</span>
    </div>
    <h2>${l.title}</h2>
    <div class="lesson-tags">
      ${l.points.map((p) => `<span class="ltag" style="--c:${ROLES[p.role].color}" lang="ja">${p.g}</span>`).join("")}
    </div>
    <div class="lmastery">
      <span class="lmastery-stars"><span class="star on">★</span> <b>${stars}</b> / ${max} stars</span>
      <span class="lmastery-bar"><span style="width:${(stars / max) * 100}%"></span></span>
    </div>
    <p class="small rv-text">${next ? next.text : "Every point at three stars."}</p>
    <div class="home-actions">
      <button class="btn primary" id="homeGo">${next ? "Continue →" : "Open lesson →"}</button>
      <button class="btn" id="homeAll">All lessons</button>
    </div>`;
  $("#homeGo").onclick = () => {
    track("home.continue");
    openLessonTab(l);
    if (next) goToNextStep(l, next);
    else scrollBelowBar($("#lessonDetail"));
  };
  $("#homeAll").onclick = () => { showTab("lessons"); window.scrollTo({ top: 0 }); };
}

// The page left open overnight says the right thing in the morning.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && $("#homeGreeting")) {
    renderHomeDay();
    renderStats();
  }
});
