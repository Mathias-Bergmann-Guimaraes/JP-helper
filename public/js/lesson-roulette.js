// The daily roulettes: a board of seven kinds of test on grammar you've already finished, on the Home
// and Practice tabs. Each pays a bonus the first time it's cleared each day and can be run again
// for normal XP. Loaded after lesson-mistakes.js and uses its helpers.

// day: the day `runs` is for. runs: { [roulette]: { pick: what it landed on and is waiting to be
// run, clears: times cleared that day, score, of: the day's best result } }. recent and
// recentLessons: what it landed on lately, newest first. Saved per account, where a value like
// this has to stay under 2 KB, so the lists are capped.
const spin = (() => {
  const s = store.get("roulette", {});
  return { day: s.day || null, runs: s.runs || {}, recent: s.recent || [], recentLessons: s.recentLessons || [] };
})();
const RECENT_POINTS = 30;
const RECENT_LESSONS = 15;
const MIX_LEN = 10;
const MIX_MIN_POINTS = 3;
const WEAK_LEN = 5;
const BUILD_LEN = 5;
const FORMS_LEN = 8;
const RETEST_LEN = 10;
const RETEST_LESSONS = 5; // at most this many lessons in one retest
const NEEDED_XP = 10; // extra on the roulette flagged today
const REEL_ROWS = 28;
const REEL_MS = 2600; // matches .rl-track in style.css
// busy: spinning or mid-quiz. view: a roulette's panel is open instead of the board. Neither gets
// redrawn from outside. day: the day the card was last drawn for.
const rouletteUI = { busy: false, view: null, day: null };

function runOf(id) {
  if (spin.day !== dayStr()) {
    spin.day = dayStr();
    spin.runs = {};
  }
  return spin.runs[id] || (spin.runs[id] = {});
}

/* ---------------------------------------------------------------- What can come up */

const pointKey = ({ l, i }) => `${l.n}.${i}`;
const finishedPoints = () => LESSONS.flatMap((l) =>
  l.points.map((_, i) => ({ l, i })).filter(({ i }) => lessonPassed(l.n) || pointStars(l.n, i) > 0));
const finishedLessons = () => LESSONS.filter((l) => lessonPassed(l.n));
const openMistakes = () => LESSONS.flatMap((l) =>
  lessonMistakes(l).filter((x) => !isLearned(x.m)).map((x) => ({ l, ...x })));
const finishedBuilds = () => finishedPoints().flatMap(({ l, i }) => lessonBuilds(l).filter((b) => b.i === i));
const finishedForms = () => finishedPoints().map(({ l, i }) => l.points[i].link).filter(isFormLink);

// Any of them, except those it landed on lately. At most half are held back, so there's always
// a real choice left.
function pickFresh(all, keyOf, recent) {
  const held = recent.slice(0, Math.floor(all.length / 2));
  return pick(all.filter((x) => !held.includes(keyOf(x))));
}

// One of the finished points with the fewest stars, not a recent one if that can be helped.
function weakestPoint() {
  const all = finishedPoints();
  if (!all.length) return null;
  const low = Math.min(...all.map(({ l, i }) => pointStars(l.n, i)));
  const lows = all.filter(({ l, i }) => pointStars(l.n, i) === low);
  const fresh = lows.filter((p) => !spin.recent.includes(pointKey(p)));
  return pick(fresh.length ? fresh : lows);
}

const ROULETTES = [
  {
    id: "review", icon: "🎯", name: "Review", about: "One random point you've finished.", len: CHECK_LEN, bonus: 15, each: XP.check,
    locked: () => (finishedPoints().length ? "" : "Finish a grammar point to unlock this."),
    choose: () => pointKey(pickFresh(finishedPoints(), pointKey, spin.recent)),
  },
  {
    id: "lesson", icon: "📖", name: "Lesson", about: "The full test of one random finished lesson.", len: TEST_LEN, bonus: 30, each: XP.test,
    locked: () => (finishedLessons().length ? "" : "Pass a lesson test to unlock this."),
    choose: () => String(pickFresh(finishedLessons(), (l) => String(l.n), spin.recentLessons).n),
  },
  {
    id: "mixed", icon: "🔀", name: "Mixed", about: "Questions from many points, so you work out which grammar applies.", len: MIX_LEN, bonus: 30, each: XP.test,
    locked: () => {
      const left = MIX_MIN_POINTS - finishedPoints().length;
      return left > 0 ? `Finish ${left} more grammar point${left === 1 ? "" : "s"} to unlock this.` : "";
    },
    choose: () => "mix",
  },
  {
    id: "weak", icon: "🩹", name: "Weak spot", about: "Your own uncorrected mistakes, or your lowest-starred point.", len: WEAK_LEN, bonus: 20, each: XP.check,
    locked: () => (finishedPoints().length || openMistakes().length ? "" : "Finish a grammar point to unlock this."),
    choose: () => (openMistakes().length ? "mistakes" : pointKey(weakestPoint())),
  },
  {
    id: "build", icon: "🧩", name: "Build", about: "Colour blocks into Japanese order, from what you've finished.", len: BUILD_LEN, unit: "sentences", bonus: 20, each: XP.build,
    locked: () => (finishedBuilds().length ? "" : "Finish a grammar point to unlock this."),
    choose: () => "build",
  },
  {
    id: "forms", icon: "🔧", name: "Forms", about: "Verb forms and patterns from the points you've finished.", len: FORMS_LEN, bonus: 20, each: XP.check,
    locked: () => (finishedForms().length ? "" : "Finish a point on a verb form or pattern to unlock this."),
    choose: () => "forms",
  },
  {
    id: "retest", icon: "🔁", name: "Retest", about: "Just the lessons you scored low on in a big test.", len: RETEST_LEN, bonus: 25, each: XP.test,
    locked: () => (weakLessons().length ? "" : "Score low on a lesson in a big test to unlock this."),
    choose: () => "weak",
  },
];

const openRoulettes = () => ROULETTES.filter((r) => !r.locked());

// One open roulette is flagged for extra XP each day; the date decides which, so every device agrees.
function neededToday() {
  const open = openRoulettes();
  if (!open.length) return null;
  return open[[...dayStr()].reduce((sum, c) => sum + c.charCodeAt(0), 0) % open.length];
}

// What a saved pick means: a name to show, and a lesson and point when it's about just one.
function targetOf(r, key) {
  if (key === "mix") {
    return { kind: "mix", label: `${MIX_LEN} mixed questions`, color: "var(--accent)", sub: `From the ${finishedPoints().length} points you've finished.` };
  }
  if (key === "mistakes") {
    return { kind: "mistakes", label: "Your own mistakes", color: "var(--accent)", sub: "Sentences your chatbot corrected, topped up from your weakest point if there are too few." };
  }
  if (key === "build") {
    return { kind: "build", label: `${BUILD_LEN} sentences to build`, color: "var(--accent)", sub: `From the ${finishedBuilds().length} sentences of the points you've finished.` };
  }
  if (key === "forms") {
    return { kind: "forms", label: `${FORMS_LEN} forms to build`, color: "var(--accent)", sub: "From the verb forms and patterns you've finished." };
  }
  if (key === "weak") {
    const weak = weakLessons();
    const shown = weak.slice(0, RETEST_LESSONS).map((l) => l.n).join(", ");
    return { kind: "retest", label: plural(weak.length, "weak lesson"), color: "var(--accent)",
      sub: weak.length > RETEST_LESSONS ? `${RETEST_LESSONS} of them at a time, such as lessons ${shown}.` : `Lesson${weak.length === 1 ? "" : "s"} ${shown}. Score 80% on a lesson to take it off the list.` };
  }
  if (r.id === "lesson") {
    const l = LESSONS.find((x) => x.n === +key);
    return l && { kind: "lesson", l, label: `Lesson ${l.n}: ${l.title}`, color: "var(--accent)", sub: `The full ${TEST_LEN}-question test.` };
  }
  const [n, i] = key.split(".").map(Number);
  const l = LESSONS.find((x) => x.n === n);
  const p = l && l.points[i];
  return p && { kind: "point", l, i, ja: true, label: p.g, color: ROLES[p.role].color,
    sub: `${p.m} <span class="muted small">· Lesson ${l.n}: ${l.title}</span>` };
}

const pickedTarget = (r) => {
  const key = runOf(r.id).pick;
  return key ? targetOf(r, key) : null;
};

/* ---------------------------------------------------------------- Question sets */

const drillsOfPoint = ({ l, i }) => lessonDrills(l).filter((d) => d.point === l.points[i]);

// One question from each point in turn, in any of the usual kinds.
function buildMixed() {
  const decks = shuffle(finishedPoints()).map((p) => ({ ...p, left: shuffle(drillsOfPoint(p)) }));
  const qs = [];
  for (let k = 0; qs.length < MIX_LEN && k < MIX_LEN * decks.length; k++) {
    const deck = decks[k % decks.length];
    const link = deck.l.points[deck.i].link;
    const d = deck.left.pop();
    if (!d) continue;
    if (isFormLink(link) && Math.random() < 0.2) qs.push(formQ(link));
    else qs.push(pick([gapQ, gapQ, (x) => meaningQ(x, lessonDrills(deck.l)), sentenceQ])(d));
  }
  return shuffle(qs);
}

// Your mistakes; with too few of them, the rest from your weakest point.
function buildMistakeRun() {
  const qs = shuffle(openMistakes()).slice(0, WEAK_LEN).map((x) => mistakeQ(x.l, x.i, x.m));
  const weakest = qs.length < WEAK_LEN && weakestPoint();
  if (weakest) qs.push(...shuffle(drillsOfPoint(weakest)).slice(0, WEAK_LEN - qs.length).map(gapQ));
  return qs;
}

function questionsFor(target) {
  if (target.kind === "point") return buildCheck(target.l, target.i);
  if (target.kind === "lesson") return buildTest(target.l);
  if (target.kind === "build") {
    return shuffle(finishedBuilds()).slice(0, BUILD_LEN).map((b) => ({
      b, review: `<span lang="ja" style="--c:${ROLES[b.point.role].color}">${builtSentence(b)}</span><span class="muted">${b.en}</span>`,
    }));
  }
  if (target.kind === "forms") {
    const forms = finishedForms();
    return Array.from({ length: FORMS_LEN }, () => formQ(pick(forms)));
  }
  if (target.kind === "retest") return buildRetest();
  return target.kind === "mix" ? buildMixed() : buildMistakeRun();
}

/* ---------------------------------------------------------------- The board */

function renderRoulette() {
  if (!$("#roulette") || rouletteUI.busy || rouletteUI.view) return;
  rouletteUI.day = dayStr();
  const open = openRoulettes();
  const cleared = open.filter((r) => runOf(r.id).clears).length;
  const needed = neededToday();
  $("#roulette").innerHTML = `
    <div class="rl-head">
      <span class="rl-kicker">🎰 Daily roulettes</span>
      ${open.length ? `<span class="rl-count small"><b>${cleared}</b> / ${open.length} cleared today</span>` : ""}
    </div>
    <div class="rl-tiles">${ROULETTES.map((r) => tileHTML(r, r === needed)).join("")}</div>`;
  $$("[data-rl]", $("#roulette")).forEach((b) => (b.onclick = () => {
    const r = ROULETTES.find((x) => x.id === b.dataset.rl);
    const target = pickedTarget(r);
    if (target) startRun(r, target);
    else spinRoulette(r);
  }));
  renderPracticeTiles();
}

function tileHTML(r, needed) {
  const lock = r.locked();
  const run = runOf(r.id);
  const target = pickedTarget(r);
  const cls = lock ? " locked" : run.clears ? " cleared" : needed ? " needed" : "";
  let foot;
  if (lock) foot = `<p class="small muted">🔒 ${lock}</p>`;
  else if (target) {
    foot = `<div class="rl-landed" style="--c:${target.color}"${target.ja ? ' lang="ja"' : ""}>${target.label}</div>
      <button class="btn primary" data-rl="${r.id}">Start →</button>`;
  } else if (run.clears) {
    foot = `<div class="rl-best small">✓ Cleared · best <b>${run.score}</b> / ${run.of}</div>
      <button class="btn" data-rl="${r.id}">Run again</button>`;
  } else foot = `<button class="btn primary" data-rl="${r.id}">Spin</button>`;
  return `
    <div class="rl-tile${cls}">
      <div class="rl-tile-top">
        <span class="rl-name"><span aria-hidden="true">${r.icon}</span> ${r.name}</span>
        ${lock ? "" : run.clears ? `<span class="small muted">no bonus now</span>` : `<span class="xp-chip">+${r.bonus + (needed ? NEEDED_XP : 0)} XP</span>`}
      </div>
      ${needed && !lock && !run.clears ? `<div class="rl-needed small">★ Bonus today: +${NEEDED_XP} XP extra</div>` : ""}
      <p class="small muted">${r.about} ${r.len} ${r.unit || "questions"}.</p>
      ${foot}
    </div>`;
}

// One card, whichever tab it's on: it moves with you, so a run under way carries on.
function placeRoulette(slot) {
  const card = $("#roulette");
  if (card && slot && card.parentElement !== slot) slot.append(card);
}

// After a check or test: more may have unlocked, and the counts go up.
const refreshRoulette = () => {
  renderRoulette();
  renderReview();
};

function backToBoard() {
  rouletteUI.busy = false;
  rouletteUI.view = null;
  renderRoulette();
}

/* ---------------------------------------------------------------- Spinning */

const reelRow = (t) => `<div class="rl-row" style="--c:${t.color}"${t.ja ? ' lang="ja"' : ""}>${t.label}</div>`;
const REEL_BLANK = '<div class="rl-row rl-blank">？</div>';
const reelHTML = (rows, stop = 1) => `
  <div class="rl-reel" aria-hidden="true"><div class="rl-track" style="--stop:${stop}">${rows.join("")}</div></div>`;
const landedReel = (target) => reelHTML([REEL_BLANK, reelRow(target), REEL_BLANK]);

function drawPanel(r, reel, body, below = "") {
  rouletteUI.view = r.id;
  const box = $("#roulette");
  box.innerHTML = `
    <div class="rl-run">
      ${reel}
      <div class="rl-body"><div class="rl-kicker"><span aria-hidden="true">${r.icon}</span> ${r.name} roulette</div>${body}</div>
      ${below}
    </div>`;
  return box;
}

function remember(r, key) {
  if (r.id === "lesson") spin.recentLessons = [key, ...spin.recentLessons.filter((k) => k !== key)].slice(0, RECENT_LESSONS);
  else if (!["mix", "mistakes", "build", "forms", "weak"].includes(key)) spin.recent = [key, ...spin.recent.filter((k) => k !== key)].slice(0, RECENT_POINTS);
}

function spinRoulette(r) {
  const key = r.choose();
  runOf(r.id).pick = key;
  remember(r, key);
  // Saved before the reel moves, so reloading can't land it somewhere else.
  store.set("roulette", spin);
  const target = targetOf(r, key);
  if (calm()) return drawPicked(r, target);

  const lessonRoulette = ROULETTES.find((x) => x.id === "lesson");
  const pool = r.id === "lesson" || r.id === "retest"
    ? (r.id === "lesson" ? finishedLessons() : weakLessons()).map((l) => targetOf(lessonRoulette, String(l.n)))
    : finishedPoints().map((p) => targetOf(ROULETTES[0], pointKey(p)));
  const row = () => reelRow(pool.length ? pick(pool) : target);
  const rows = [row(), REEL_BLANK, row(), ...Array.from({ length: REEL_ROWS }, row), reelRow(target), row()];
  rouletteUI.busy = true;
  const box = drawPanel(r, reelHTML(rows), `<h3>Spinning…</h3><p class="small muted">${r.about}</p>`);
  scrollIfAbove(box);
  const track = $(".rl-track", box);
  track.getBoundingClientRect(); // starts the move from where it is now
  track.style.setProperty("--stop", rows.length - 2);
  setTimeout(() => {
    rouletteUI.busy = false;
    drawPicked(r, target);
    burst($(".rl-reel", box));
  }, REEL_MS + 100);
}

const scrollIfAbove = (box) => { if (box.getBoundingClientRect().top < 0) scrollBelowBar(box); };

const targetHead = (t) => `
  <h3 class="rl-target" style="--c:${t.color}"${t.ja ? ' lang="ja"' : ""}>${t.label}</h3>
  <p class="rl-meaning">${t.sub}</p>`;

function drawPicked(r, target) {
  drawPanel(r, landedReel(target), `
    ${targetHead(target)}
    <div class="rl-actions">
      <button class="btn primary" id="rlStart">Start the ${r.len} ${r.unit || "questions"} →</button>
      <button class="btn" id="rlBack">Back to the board</button>
    </div>`);
  $("#rlStart").onclick = () => startRun(r, target);
  $("#rlBack").onclick = backToBoard;
}

/* ---------------------------------------------------------------- The questions */

function startRun(r, target) {
  const qs = questionsFor(target);
  // Its mistakes may have been learned elsewhere since the spin, with nothing else to ask.
  if (!qs.length) {
    delete runOf(r.id).pick;
    store.set("roulette", spin);
    return backToBoard();
  }
  track("roulette." + r.id);
  rouletteUI.busy = true;
  rouletteUI.view = r.id;
  if (target.kind === "build") runBuilds(r, target, { qs, i: 0, results: [] });
  else runQuiz(r, target, { qs, i: 0, results: [] });
  scrollBelowBar($("#roulette"));
}

// The Build roulette: a sentence builder for each sentence, in blocks. It pays its own XP.
function runBuilds(r, target, t) {
  const box = $("#roulette");
  box.innerHTML = `
    <div class="lt-top">
      <span class="small"><b>${r.name} · sentence ${t.i + 1}</b> of ${t.qs.length}</span>
      <div class="lt-dots">${progressDots(t)}</div>
      <button class="icon-btn lp-close" aria-label="Stop for now">✕</button>
    </div>
    <div class="rl-build"></div>`;
  $(".lp-close", box).onclick = backToBoard;
  const { b } = t.qs[t.i];
  newBuilder($(".rl-build", box), {
    l: b.l, mode: "blocks", bare: true, source: () => [b],
    nextLabel: t.i + 1 < t.qs.length ? "Next sentence →" : "See my result →",
    onCount: (ok) => {
      t.results[t.i] = ok;
      $(".lt-dots", box).innerHTML = progressDots(t);
    },
    onNext: () => {
      t.i++;
      if (t.i < t.qs.length) runBuilds(r, target, t);
      else finishRun(r, target, t);
      scrollIfAbove(box);
    },
  });
  nextBuild();
}

function runQuiz(r, target, t) {
  const box = $("#roulette");
  const about = target.kind === "point" ? `<span lang="ja">${target.label}</span>` : target.kind === "lesson" ? target.label : "";
  box.innerHTML = `
    <div class="lt-top">
      <span class="small"><b>${r.name} · question ${t.i + 1}</b> of ${t.qs.length}${about ? ` · ${about}` : ""}</span>
      <div class="lt-dots">${progressDots(t)}</div>
      <button class="icon-btn lp-close" aria-label="Stop for now">✕</button>
    </div>
    <div class="lp-q"></div>
    <div class="q-actions"><button class="btn primary" hidden>${t.i + 1 < t.qs.length ? "Next question →" : "See my result →"}</button></div>`;
  $(".lp-close", box).onclick = backToBoard;
  const next = $(".q-actions .btn", box);
  askIn($(".lp-q", box), t.qs[t.i], (ok, b) => {
    t.results[t.i] = ok;
    if (ok) addXP(r.each, b);
    $(".lt-dots", box).innerHTML = progressDots(t);
    next.hidden = false;
    next.focus({ preventScroll: true });
  });
  next.onclick = () => {
    t.i++;
    if (t.i < t.qs.length) runQuiz(r, target, t);
    else finishRun(r, target, t);
    scrollIfAbove(box);
  };
}

/* ---------------------------------------------------------------- The result */

function resultWords(target, score, of) {
  if (target.kind === "point") return score < 3 ? "Not this time, so this one can land again soon." : CHECK_WORDS[starsFor(score)];
  if (target.kind === "lesson") return score >= PASS_MARK ? "Passed again!" : "Below the pass mark, so this lesson can land again soon. It stays finished.";
  if (target.kind === "mistakes") return "A mistake you pick right twice counts as learned.";
  if (target.kind === "build") return score / of >= 0.8 ? "Word order: you've got it." : "The verb block comes last, and the particles say what each block does.";
  if (target.kind === "forms") return score / of >= 0.8 ? "Those forms are sticking." : "The Verbs and Patterns pages show how each form is built.";
  if (target.kind === "retest") {
    const left = weakLessons().length;
    return `${target.cleared.length ? `Off the list: lesson${target.cleared.length === 1 ? "" : "s"} ${target.cleared.join(", ")}.` : "Nothing came off the list this time."} ${left ? `${plural(left, "weak lesson")} left.` : "No weak lessons left!"}`;
  }
  return score / of >= 0.8 ? "You spotted the grammar without being told which it was." : "These are the hard ones: nothing tells you which grammar it is.";
}

function finishRun(r, target, t) {
  track("roulette.done");
  const of = t.qs.length;
  const score = t.results.filter(Boolean).length;
  const run = runOf(r.id);
  const first = !run.clears;
  run.clears = (run.clears || 0) + 1;
  if (first || score / of > run.score / run.of) Object.assign(run, { score, of });
  delete run.pick;
  // One that went badly can land again soon.
  if (target.kind === "point" && score < 3) spin.recent = spin.recent.filter((k) => k !== pointKey(target));
  if (target.kind === "lesson" && score < PASS_MARK) spin.recentLessons = spin.recentLessons.filter((k) => k !== String(target.l.n));
  store.set("roulette", spin);

  // The same tests as on the lesson page, so they count there too.
  let starXp = 0;
  if (target.kind === "point") starXp = saveCheckStars(target.l, target.i, score).gained * XP.star;
  if (target.kind === "lesson") saveTestScore(target.l, score);
  if (target.kind === "retest") target.cleared = settleRetest(t);
  if (target.l) {
    if (target.l.n === lessonState.n) {
      if (target.kind === "point") drawPointStars(target.l, target.i);
      else if ($("#lTest .lt-intro")) showTestIntro(target.l);
      renderLessonStatus(target.l);
    }
    updateLessonPath();
  }

  const xp = (first ? r.bonus + (r === neededToday() ? NEEDED_XP : 0) : 0) + starXp;
  rouletteUI.busy = false;
  drawPanel(r, landedReel(target), `
    ${targetHead(target)}
    <div class="rl-score"><b>${score}</b> / ${of}${target.kind === "point" ? ` ${starsHTML(starsFor(score))}` : ""}${xp ? ` <span class="xp-chip">+${xp} XP bonus</span>` : ""}</div>
    <p class="small">${resultWords(target, score, of)}${first ? "" : ` <span class="muted">No clear bonus on a run again.</span>`}</p>
    <div class="rl-actions">
      <button class="btn primary" id="rlBack">Back to the board</button>
      ${target.l ? `<button class="btn" id="rlOpen">Open lesson ${target.l.n} ›</button>` : ""}
    </div>`, missedHTML(t));
  $("#rlBack").onclick = backToBoard;
  const open = $("#rlOpen");
  if (open) open.onclick = () => {
    openLessonTab(target.l);
    scrollBelowBar(target.kind === "point" ? $(`#lp-${target.i}`) : $("#lessonDetail"));
  };

  if (xp) addXP(xp, $("#roulette .rl-score b"));
  const allClear = first && openRoulettes().every((x) => runOf(x.id).clears);
  if (allClear) toast("<b>Board cleared!</b> Every roulette done for today");
  if (allClear || score === of) burst($("#roulette .rl-score"));
}

// The page left open overnight gets a new board.
document.addEventListener("visibilitychange", () => {
  if (document.hidden || rouletteUI.busy || rouletteUI.day === dayStr()) return;
  rouletteUI.view = null;
  renderRoulette();
});
