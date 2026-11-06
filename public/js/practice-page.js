// The Practice tab: one page with four ways to practise. Roulettes are the same card as on Home
// (lesson-roulette.js), Write is in practice-write.js, Build is a sentence builder of its own
// (lesson-build.js), and the quick quiz is here. Loaded after those and uses their helpers.

const PRACTICE_MODES = [
  { id: "roulette", ja: "運", name: "Roulettes", about: "Today's spins on what you've finished." },
  { id: "write", ja: "書", name: "Write", about: "Your own sentences, with as much guidance as you want." },
  { id: "build", ja: "組", name: "Build", about: "Colour blocks into Japanese order, or type it out." },
  { id: "quiz", ja: "速", name: "Quick quiz", about: "Particles, verbs, adjectives and patterns, non-stop." },
];

// mode: the part on screen. scope: the grammar Write and Build draw on. lesson: a lesson's number,
// or "" for the one you're on. part: "lesson" (just that lesson), "wide" (and all before it), or the
// number of one of its points. The last choices stay in this browser.
const practice = {
  mode: null,
  scope: { lesson: "", part: "lesson", ...store.get("practiceScope", {}) },
  buildKey: null, // the grammar the Build part was last set up for
  builder: null,
};

/* ---------------------------------------------------------------- Which grammar */

const scopeLesson = () => LESSONS.find((l) => l.n === +practice.scope.lesson) || LESSONS.find((l) => l.n === lessonState.n) || LESSONS[0];
const scopeLessons = () => {
  const l = scopeLesson();
  return practice.scope.part === "wide" ? LESSONS.filter((x) => x.n <= l.n) : [l];
};
const scopePoint = () => (/^\d+$/.test(practice.scope.part) && scopeLesson().points[+practice.scope.part] ? +practice.scope.part : null);
const scopeKey = () => `${scopeLesson().n}:${practice.scope.part}`;

// How a chatbot prompt puts it.
function scopeAbout() {
  const l = scopeLesson();
  const i = scopePoint();
  if (i !== null) return `the pattern ${plain(l.points[i].g)}, meaning "${l.points[i].m}"`;
  return practice.scope.part === "wide" && l.n > 1 ? `the grammar of lessons 1–${l.n}` : `the grammar of lesson ${l.n}`;
}

function scopeHTML() {
  const here = lessonState.n;
  const l = scopeLesson();
  const part = scopePoint() ?? (practice.scope.part === "wide" ? "wide" : "lesson");
  const opt = (value, label, on, lang) => `<option value="${value}"${on ? " selected" : ""}${lang ? ' lang="ja"' : ""}>${label}</option>`;
  return `
    <label class="ai-focus small">Lesson
      <select class="pr-lesson">
        ${opt("", `Yours: ${here}. ${lessonOf(here).title}`, !practice.scope.lesson)}
        ${LESSONS.map((x) => opt(x.n, `${x.n}. ${x.title}`, +practice.scope.lesson === x.n)).join("")}
      </select>
    </label>
    <label class="ai-focus small">Grammar
      <select class="pr-part">
        ${opt("lesson", "The whole lesson", part === "lesson")}
        ${l.n > 1 ? opt("wide", `Lessons 1 to ${l.n}`, part === "wide") : ""}
        ${l.points.map((p, i) => opt(i, `Only ${plain(p.g)}`, part === i, true)).join("")}
      </select>
    </label>`;
}

function setScope(change) {
  Object.assign(practice.scope, change);
  store.set("practiceScope", practice.scope);
  drawWrite();
  drawPracticeBuild();
}

function wireScope(box) {
  $(".pr-lesson", box).onchange = (e) => setScope({ lesson: e.target.value, part: /^\d+$/.test(practice.scope.part) ? "lesson" : practice.scope.part });
  $(".pr-part", box).onchange = (e) => setScope({ part: e.target.value });
}

/* ---------------------------------------------------------------- The page */

function renderPractice() {
  $("#practice").innerHTML = `
    <div class="card hero pr-hero">
      <div class="pr-title">
        <h1>Practice</h1>
        <span class="pr-today small" id="prToday"></span>
      </div>
      <p>Pick how you want to practise today. All of it earns XP towards your daily goal.</p>
      <div class="pr-tiles" role="tablist" aria-label="Ways to practise">
        ${PRACTICE_MODES.map((m) => `
          <button class="home-tile pr-tile" role="tab" data-mode-tile="${m.id}">
            <span class="home-tile-ja" lang="ja" aria-hidden="true">${m.ja}</span>
            <span>
              <b>${m.name}</b>
              <span class="small muted">${m.about}</span>
              <span class="small pr-status" data-status="${m.id}"></span>
            </span>
          </button>`).join("")}
      </div>
    </div>
    <div class="pr-panel" data-panel="roulette"><div id="pRoulette"></div></div>
    <div class="pr-panel" data-panel="write" id="pWrite"></div>
    <div class="pr-panel" data-panel="build" id="pBuild"></div>
    <div class="pr-panel" data-panel="quiz">${quizHTML()}</div>`;
  $$("[data-mode-tile]").forEach((b) => (b.onclick = () => {
    store.set("practiceMode", b.dataset.modeTile);
    showPracticeMode(b.dataset.modeTile);
    track("practice." + b.dataset.modeTile);
  }));
  wireQuiz();
}

function showPracticeMode(id) {
  practice.mode = id;
  $$("[data-mode-tile]").forEach((b) => {
    const on = b.dataset.modeTile === id;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on);
  });
  $$(".pr-panel").forEach((p) => p.classList.toggle("active", p.dataset.panel === id));
  if (id === "write") drawWrite();
  if (id === "build") drawPracticeBuild();
  if (id === "quiz" && !quiz.q) nextQuestion();
  renderPracticeTiles();
}

// Each time the tab opens: the roulette card comes over from Home, and "your lesson" may have moved on.
function showPractice() {
  placeRoulette($("#pRoulette"));
  // Never picked one? The roulettes, unless every one of them is still locked.
  showPracticeMode(store.get("practiceMode", null) || (openRoulettes().length ? "roulette" : "write"));
}

function renderPracticeTiles() {
  const today = $("#prToday");
  if (!today) return;
  today.innerHTML = `${liveStreak() ? `🔥 <b>${liveStreak()}</b> · ` : ""}<b>${Math.min(todayXp(), DAILY_GOAL)}</b> / ${DAILY_GOAL} XP today`;
  const open = openRoulettes();
  const b = practice.buildKey && practice.builder;
  const status = {
    roulette: open.length ? `<b>${open.filter((r) => runOf(r.id).clears).length}</b> / ${open.length} cleared today` : "🔒 Finish a grammar point first",
    write: writtenToday() ? `<b>${writtenToday()}</b> written today` : "",
    build: b && b.total ? `<b>${b.score}</b> / ${b.total} right first time` : "",
    quiz: quiz.best ? `Best streak <b>${quiz.best}</b>` : "",
  };
  $$("[data-status]").forEach((el) => { el.innerHTML = status[el.dataset.status]; });
}

/* ---------------------------------------------------------------- Build */

function practiceBuilds() {
  const list = scopeLessons().flatMap(lessonBuilds);
  const i = scopePoint();
  const mine = i === null ? list : list.filter((b) => b.i === i);
  return mine.length ? mine : list;
}

// Stays as it is while the same grammar is chosen, so coming back to it loses nothing.
function drawPracticeBuild() {
  const box = $("#pBuild");
  if (practice.buildKey === scopeKey()) {
    $(".pr-scope", box).innerHTML = scopeHTML();
    wireScope(box);
    return;
  }
  practice.buildKey = scopeKey();
  const i = scopePoint();
  const builds = practiceBuilds();
  const lessons = scopeLessons();
  box.innerHTML = `
    <div class="card pr-card pr-build-head">
      <div class="rl-head">
        <span class="rl-kicker">🧩 Build the sentence</span>
        <span class="rl-count small"><b>${builds.length}</b> sentence${builds.length === 1 ? "" : "s"} · ${XP.build} XP when right first time</span>
      </div>
      <div class="pr-controls pr-scope">${scopeHTML()}</div>
      ${i !== null && !builds.some((b) => b.i === i) ? `<p class="small muted">No block sentences for this point yet, so these are from the whole lesson.</p>` : ""}
    </div>
    <div class="card lquiz pr-run"></div>`;
  wireScope(box);
  practice.builder = newBuilder($(".pr-run", box), { l: lessons[lessons.length - 1], source: () => builds, promptAbout: scopeAbout() });
  nextBuild();
}

/* ---------------------------------------------------------------- Quick quiz */

// Each kind of question: its name, what it can focus on, and how to make one.
const QUIZ_KINDS = {
  particles: {
    name: "Particles", kind: "Pick the particle",
    focus: () => [...new Set(PARTICLE_QUIZ.map((q) => q.a))].map((a) => [a, a, true]),
    make: (f) => makeParticleQ(f),
  },
  verbs: {
    name: "Verb forms", kind: "Build the verb form",
    focus: () => FORMS.filter((f) => f.id !== "dict").map((f) => [f.id, f.label]),
    make: (f) => makeVerbQ(f || undefined),
  },
  adjectives: {
    name: "Adjectives", kind: "Change the adjective",
    focus: () => [["i", "い-adjectives", true], ["na", "な-adjectives", true]],
    make: (f) => makeAdjectiveQ(f),
  },
  patterns: {
    name: "Patterns", kind: "Build the pattern",
    focus: () => VERB_PATTERNS.map((p) => [p.id, patTitleText(p), true]),
    make: (f) => makePatternQ(f || undefined),
  },
  mixed: { name: "Mixed", kind: "", focus: () => [], make: () => null },
};

const quizHTML = () => `
  <div class="card lquiz pr-card pr-quiz">
    <div class="rl-head"><span class="rl-kicker">⚡ Quick quiz</span></div>
    <div class="pr-controls">
      <div class="seg pr-seg" id="quizMode">
        ${Object.entries(QUIZ_KINDS).map(([id, k]) => `<button data-m="${id}">${k.name}</button>`).join("")}
      </div>
      <label class="ai-focus small" id="quizFocusBox">Focus on <select id="quizFocus"></select></label>
    </div>
    <div class="scorebar">
      <span>Score <b id="qScore">0 / 0</b></span>
      <span>Streak <b id="qStreak">0</b></span>
      <span>Best streak <b id="qBest">${quiz.best}</b></span>
      <span class="combo" id="qCombo" hidden>🔥 Combo · double XP</span>
    </div>
    <div id="qBox"></div>
    <div class="q-actions"><button class="btn primary" id="qNext" hidden>Next question →</button></div>
  </div>`;

function wireQuiz() {
  $$("#quizMode button").forEach((b) => (b.onclick = () => {
    quiz.mode = b.dataset.m;
    quiz.focus = "";
    quiz.deck = null;
    drawQuizFocus();
    nextQuestion();
  }));
  $("#quizFocus").onchange = (e) => {
    quiz.focus = e.target.value;
    quiz.deck = null;
    nextQuestion();
  };
  $("#qNext").onclick = nextQuestion;
  drawQuizFocus();
}

function drawQuizFocus() {
  const options = QUIZ_KINDS[quiz.mode].focus();
  $("#quizFocusBox").hidden = !options.length;
  $("#quizFocus").innerHTML = `<option value="">Everything</option>${options.map(([v, label, ja]) => `<option value="${v}"${ja ? ' lang="ja"' : ""}>${label}</option>`).join("")}`;
  $$("#quizMode button").forEach((b) => b.classList.toggle("active", b.dataset.m === quiz.mode));
}

// From a pattern card: straight into the quick quiz, on that pattern alone.
function practicePattern(id) {
  store.set("practiceMode", "quiz");
  Object.assign(quiz, { mode: "patterns", focus: id, deck: null, q: null });
  showTab("practice");
  drawQuizFocus();
  $("#quizFocus").value = id;
  window.scrollTo({ top: 0 });
  scrollBelowBar($(".pr-quiz"));
}

function nextQuestion() {
  let id = quiz.mode;
  if (id === "mixed") id = pick(["particles", "verbs", "adjectives", "patterns"]);
  const type = QUIZ_KINDS[id];
  quiz.q = { ...type.make(quiz.focus), kind: type.kind };
  $("#qNext").hidden = true;
  askIn($("#qBox"), quiz.q, (ok, b) => {
    track("quiz." + id);
    quiz.total++;
    if (ok) {
      quiz.score++;
      quiz.streak++;
      if (quiz.streak > quiz.best) { quiz.best = quiz.streak; store.set("best", quiz.best); }
    } else quiz.streak = 0;
    const combo = quiz.streak >= COMBO_AT;
    if (ok) addXP(combo ? XP.combo : XP.practice, b);
    if (ok && quiz.streak === COMBO_AT) toast(`<b>Combo!</b> ${COMBO_AT} right in a row: double XP until you miss one`);
    $("#qCombo").hidden = !combo;
    $("#qScore").textContent = `${quiz.score} / ${quiz.total}`;
    $("#qStreak").textContent = quiz.streak;
    $("#qBest").textContent = quiz.best;
    $("#qNext").hidden = false;
    $("#qNext").focus({ preventScroll: true });
  });
}

// An adjective and a form to put it in. The wrong answers mirror the usual mistake: treating an い
// adjective as a な adjective, or the other way round, which is the trap with きれい.
const ADJECTIVE_FORMS = {
  pn: ["negative", (s) => `isn't ${s}`],
  tp: ["past", (s) => `was ${s}`],
  tn: ["past negative", (s) => `wasn't ${s}`],
};
const WRONG_ENDINGS = { pn: "くない", tp: "かった", tn: "くなかった" };

function makeAdjectiveQ(focus) {
  const type = focus || pick(["i", "na"]);
  const a = pick(ADJECTIVES[type].list);
  const form = pick(Object.keys(ADJECTIVE_FORMS));
  const [label, en] = ADJECTIVE_FORMS[form];
  const text = (f, t = type) => adjForms(a, t, false)[f].join("");
  const right = text(form);
  // As the other kind: 高いじゃない for い, 静かくない for な.
  const other = type === "i" ? text(form, "na") : a.w + WRONG_ENDINGS[form];
  const backup = [...Object.keys(ADJECTIVE_FORMS).filter((f) => f !== form).map((f) => text(f)), a.w];
  const wrong = pickWrong(right, [other], backup).map((w) => w.text);
  const parts = adjForms(a, type, false)[form];
  return {
    link: { tab: "adjectives" },
    prompt: `<div class="q-sentence" lang="ja">${ruby(a.w)} <span class="arrow">→</span> <span class="q-form">${label}</span></div>
      ${hintEn(`“${en(a.short)}”`)}`,
    options: shuffle([right, ...wrong]).map((o) => ({ html: ruby(o), correct: o === right })),
    reveal: () => {},
    feedback: () => `<div class="fb-drill" style="--c:${ADJECTIVES[type].color}">
      <div class="fb-sent" lang="ja">${ruby(parts[0])}<span class="hl">${parts[1]}</span></div>
      <div class="q-en">${en(a.short)}</div>
      <div class="fb-point"><b>${ADJECTIVES[type].label}</b>: <span lang="ja">${ADJECTIVES[type].pattern}</span></div>
      ${a.note ? `<p class="small">${a.note}</p>` : ""}
      <button class="lp-link" data-see>See it → ${linkLabel({ tab: "adjectives" })}</button>
    </div>`,
    review: "",
  };
}
