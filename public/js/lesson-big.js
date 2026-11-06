// Big tests on the Lessons tab: one every few lessons, and a final for each book. They're open from
// the start, and passing one finishes every lesson it covers. Loaded after lesson-review.js and uses
// its helpers. Best scores are saved per account under "bigTests" (see server.js).

const BIG_PER_LESSON = 5; // questions per lesson in a block's big test
const BIG_FINAL_LEN = 50;
const BIG_PASS = 0.8;

// Blocks follow the grammar rather than a strict five: 17–20 is the plain verb forms up to casual
// speech, which uses all of them. An id is what a score is saved under, so it must not change.
const BIG_BLOCKS = [
  { id: "t1-5", from: 1, to: 5, title: "First sentences" },
  { id: "t6-10", from: 6, to: 10, title: "Verbs, adjectives & where things are" },
  { id: "t11-16", from: 11, to: 16, title: "Counting up to the て-form" },
  { id: "t17-20", from: 17, to: 20, title: "Plain forms & casual speech" },
  { id: "t21-25", from: 21, to: 25, title: "Opinions, favours & conditions" },
  { id: "t26-30", from: 26, to: 30, title: "Explaining, abilities & states" },
  { id: "t31-35", from: 31, to: 35, title: "Plans, advice & commands" },
  { id: "t36-40", from: 36, to: 40, title: "Passive & embedded sentences" },
  { id: "t41-45", from: 41, to: 45, title: "Purpose, appearance & difficulty" },
  { id: "t46-50", from: 46, to: 50, title: "Causative & polite language" },
];
const BIG_TESTS = [
  ...BIG_BLOCKS.map((b, j) => ({
    ...b, name: `Big test ${j + 1}`, final: false, len: (b.to - b.from + 1) * BIG_PER_LESSON,
  })),
  { id: "book1", from: 1, to: 25, name: "Book I final", title: "The whole of 初級 Ⅰ", final: true, len: BIG_FINAL_LEN },
  { id: "book2", from: 26, to: 50, name: "Book II final", title: "The whole of 初級 Ⅱ", final: true, len: BIG_FINAL_LEN },
];

const bigPassMark = (b) => Math.ceil(b.len * BIG_PASS);
const bigBest = (b) => lessonState.big[b.id];
const bigPassed = (b) => (bigBest(b) || 0) >= bigPassMark(b);
const bigById = (id) => BIG_TESTS.find((b) => b.id === id);
const bigLessons = (b) => LESSONS.filter((l) => l.n >= b.from && l.n <= b.to);
const bigRange = (b) => `lessons ${b.from}–${b.to}`;
// The block test a lesson belongs to, and the big test (if any) that has finished it for you.
const bigOfLesson = (n) => BIG_TESTS.find((b) => !b.final && n >= b.from && n <= b.to);
const finishedByBig = (n) => BIG_TESTS.find((b) => n >= b.from && n <= b.to && bigPassed(b));
// A book final comes straight after the book's last block test.
const finalAfter = (b) => (b.final ? null : BIG_TESTS.find((x) => x.final && x.to === b.to));

// open: the test on show instead of a lesson. runs: tests in progress, so leaving for a lesson and
// coming back carries on where you were. They last until the page is reloaded.
const bigUI = { open: null, runs: {} };

/* ---------------------------------------------------------------- The lesson list */

function bigNodeHTML(b) {
  return `<button class="lnode lbig${b.final ? " lfinal" : ""}" data-big="${b.id}">
    <span class="lnum" lang="ja">${b.final ? "卒" : "試"}</span><span class="ltitle">${b.name}</span>
  </button>`;
}

// One book's lessons, each block's test after its last lesson and the final at the end.
const bookNodesHTML = (from, to, lessonNode) => LESSONS.filter((l) => l.n >= from && l.n <= to).map((l) =>
  lessonNode(l) + BIG_TESTS.filter((b) => b.to === l.n).map(bigNodeHTML).join("")).join("");

function updateBigNodes() {
  $$("#lessons [data-big]").forEach((node) => {
    const b = bigById(node.dataset.big);
    const lessons = bigLessons(b);
    const done = lessons.filter((l) => lessonPassed(l.n)).length;
    node.classList.toggle("active", b.id === bigUI.open);
    node.classList.toggle("done", bigPassed(b));
    node.classList.toggle("ready", !bigPassed(b) && done === lessons.length);
    $(".lnum", node).style.setProperty("--p", `${(done / lessons.length) * 100}%`);
    node.title = `${b.name}: ${bigRange(b)}. ${bigPassed(b) ? "Passed" : `${done} of ${lessons.length} lessons finished`}`;
  });
  renderBigHint();
}

/* ---------------------------------------------------------------- The card on each lesson page */

function renderBigHint() {
  const box = $("#lBigHint");
  if (!box) return;
  const b = bigOfLesson(lessonState.n);
  const lessons = bigLessons(b);
  const done = lessons.filter((l) => lessonPassed(l.n)).length;
  const words = bigPassed(b)
    ? `<b>Passed</b> with a best of ${bigBest(b)} / ${b.len}.`
    : done === lessons.length
      ? `All ${lessons.length} lessons finished. Ready when you are!`
      : `${done} of ${lessons.length} lessons finished. Already know them? Passing finishes them all at once.`;
  box.innerHTML = `
    <div class="big-hint-text">
      <div class="rl-kicker"><span lang="ja">試</span> ${b.name} · ${bigRange(b)}</div>
      <p class="small">${words}</p>
    </div>
    <button class="btn${!bigPassed(b) && done === lessons.length ? " primary" : ""}" data-open-big="${b.id}">Open ${b.name} ›</button>`;
  $("[data-open-big]", box).onclick = () => showBig(b.id, true);
}

/* ---------------------------------------------------------------- Showing a test */

function showBig(id, scroll) {
  const b = bigById(id);
  bigUI.open = id;
  $("#lessonDetail").hidden = true;
  const box = $("#bigDetail");
  box.hidden = false;
  // The hidden lesson's quiz shouldn't answer to the number keys.
  if (keyQuiz && keyQuiz.closest("#lessonDetail")) keyQuiz = null;
  drawBigIntro(b);
  updateLessonPath();
  const top = box.getBoundingClientRect().top;
  if (scroll && (top < 0 || top > window.innerHeight * 0.5)) scrollBelowBar(box);
}

// Back to the lessons: showLesson() redraws the lesson it opens.
function closeBig() {
  bigUI.open = null;
  $("#bigDetail").hidden = true;
  $("#lessonDetail").hidden = false;
}

function bigNavHTML(b) {
  const prev = LESSONS.find((l) => l.n === b.to);
  const after = finalAfter(b);
  const next = LESSONS.find((l) => l.n === b.to + 1);
  return `<div class="lesson-nav">
    <button class="btn" data-go-l="${prev.n}">‹ ${prev.n}. ${prev.title}</button>
    ${after ? `<button class="btn" data-go-big="${after.id}">${after.name} ›</button>`
      : next ? `<button class="btn" data-go-l="${next.n}">${next.n}. ${next.title} ›</button>` : ""}
  </div>`;
}

function wireBigLinks(box) {
  $$("[data-go-l]", box).forEach((x) => (x.onclick = () => showLesson(+x.dataset.goL, true)));
  $$("[data-go-big]", box).forEach((x) => (x.onclick = () => showBig(x.dataset.goBig, true)));
}

function drawBigIntro(b) {
  const box = $("#bigDetail");
  const best = bigBest(b);
  const left = bigLessons(b).filter((l) => !lessonPassed(l.n));
  const run = bigUI.runs[b.id];
  const answered = run ? run.results.filter((r) => r !== undefined).length : 0;
  const reward = bigPassed(b)
    ? `You've passed this one, so it's here whenever you want to test yourself again.`
    : left.length
      ? `Pass it and the ${plural(left.length, "lesson")} you haven't finished yet ${left.length === 1 ? "is" : "are"} marked finished too, and their grammar joins your daily review.`
      : `You've finished every lesson it covers, so this is the real test of whether it all stuck.`;
  box.innerHTML = `
    <div class="card lesson-head big-head${b.final ? " big-final" : ""}">
      <div class="lesson-kicker">${b.name} · ${bigRange(b)} · Book ${b.to <= 25 ? "I" : "II"}</div>
      <h2>${b.title}</h2>
      <div class="big-lessons">
        ${bigLessons(b).map((l) => `<button class="big-lesson${lessonPassed(l.n) ? " done" : ""}" data-go-l="${l.n}">
          ${lessonPassed(l.n) ? "✓" : l.n}<span class="big-lesson-title">${l.title}</span>
        </button>`).join("")}
      </div>
    </div>
    <div class="card lquiz ltest" id="bigTest">
      <div class="lt-intro">
        <div class="lt-seal${bigPassed(b) ? " pass" : ""}" lang="ja">${bigPassed(b) ? "合格" : b.final ? "卒業<br>試験" : "試験"}</div>
        <div>
          <p>${b.len} questions, spread evenly across ${b.final ? `all ${b.to - b.from + 1} lessons` : "these lessons"} and mixed together, so you have to work out which grammar applies. Score <b>${bigPassMark(b)} / ${b.len}</b> or more to pass.</p>
          <p class="small muted">${reward}</p>
          <p class="small muted">${best === undefined ? "Not taken yet." : `Best score so far: ${best} / ${b.len}.`}</p>
          ${run ? `<button class="btn primary" id="bigGoOn">Carry on from question ${Math.min(answered + 1, b.len)}</button>
            <button class="btn" id="bigStart">Start over</button>`
            : `<button class="btn primary" id="bigStart">${best === undefined ? "Start the test" : "Take the test again"}</button>`}
        </div>
      </div>
    </div>
    ${bigNavHTML(b)}`;
  wireBigLinks(box);
  $("#bigStart").onclick = () => startBig(b);
  if (run) $("#bigGoOn").onclick = () => runBig(b, run);
}

/* ---------------------------------------------------------------- The questions */

// Each lesson gets the same number of questions, going through its points in a random order so a
// block's test touches every point and a final touches as many as it has room for. No sentence
// comes up twice. `owners` says which lesson each question belongs to, for the result.
function buildBigTest(b) {
  const decks = bigLessons(b).map((l) => ({
    l,
    all: lessonDrills(l),
    points: shuffle(l.points.map((_, i) => ({ i, left: shuffle(drillsOfPoint({ l, i })) }))),
    turn: 0,
  }));
  const items = [];
  for (let k = 0; items.length < b.len && k < b.len * 20; k++) {
    const deck = decks[items.length % decks.length];
    const p = deck.points[deck.turn++ % deck.points.length];
    const d = p.left.pop();
    if (!d) continue;
    const link = deck.l.points[p.i].link;
    const make = isFormLink(link) && Math.random() < 0.25
      ? () => formQ(link)
      : pick([gapQ, gapQ, gapQ, (x) => meaningQ(x, deck.all), sentenceQ]);
    items.push({ q: make(d), n: deck.l.n });
  }
  const mixed = shuffle(items);
  return { id: b.id, qs: mixed.map((x) => x.q), owners: mixed.map((x) => x.n), i: 0, results: [] };
}

function startBig(b) {
  bigUI.runs[b.id] = buildBigTest(b);
  runBig(b, bigUI.runs[b.id]);
}

function bigTally(t) {
  const right = t.results.filter(Boolean).length;
  const wrong = t.results.filter((r) => r === false).length;
  return `<b class="big-right">${right}</b> right · <b class="big-wrong">${wrong}</b> wrong`;
}

function runBig(b, t) {
  // Left after answering, before pressing Next: that question is already counted.
  if (t.results[t.i] !== undefined) t.i++;
  if (t.i >= t.qs.length) return finishBig(b, t);
  const box = $("#bigTest");
  box.innerHTML = `
    <div class="lt-top">
      <span class="small"><b>Question ${t.i + 1}</b> of ${t.qs.length}</span>
      <span class="small muted big-tally">${bigTally(t)}</span>
      <div class="lt-dots big-dots">${progressDots(t)}</div>
    </div>
    <div id="bigQ"></div>
    <div class="q-actions"><button class="btn primary" id="bigNext" hidden>${t.i + 1 < t.qs.length ? "Next question →" : "See my result →"}</button></div>`;
  askIn($("#bigQ"), t.qs[t.i], (ok, btn) => {
    t.results[t.i] = ok;
    if (ok) addXP(XP.test, btn);
    $(".lt-dots", box).innerHTML = progressDots(t);
    $(".big-tally", box).innerHTML = bigTally(t);
    $("#bigNext").hidden = false;
    $("#bigNext").focus({ preventScroll: true });
  });
  $("#bigNext").onclick = () => {
    runBig(b, t);
    if (box.getBoundingClientRect().top < 0) scrollBelowBar(box);
  };
}

/* ---------------------------------------------------------------- The result */

function saveBigScore(b, score) {
  if (score > (bigBest(b) ?? -1)) {
    lessonState.big[b.id] = score;
    store.set("bigTests", lessonState.big);
  }
}

function bigLessonRow(t, l) {
  const mine = t.owners.map((n, j) => (n === l.n ? j : -1)).filter((j) => j >= 0);
  const right = mine.filter((j) => t.results[j]).length;
  const cls = right === mine.length ? "good" : right / mine.length >= BIG_PASS ? "some" : "bad";
  return { right, of: mine.length, html: `
    <div class="rv-row">
      <button class="big-row-link" data-go-l="${l.n}">${l.n}. ${l.title}</button>
      <span class="rv-mark ${cls}">${right} / ${mine.length}</span>
      <span class="small muted">${cls === "bad" ? "Worth another look" : cls === "some" ? "Nearly there" : "Solid"}</span>
    </div>` };
}

function finishBig(b, t) {
  delete bigUI.runs[b.id];
  const score = t.results.filter(Boolean).length;
  const mark = bigPassMark(b);
  const passed = score >= mark;
  const perfect = score === t.qs.length;
  const wasPassed = bigPassed(b);
  const newly = passed ? bigLessons(b).filter((l) => !lessonPassed(l.n)) : [];
  saveBigScore(b, score);
  updateLessonPath();
  refreshRoulette();

  const bonus = passed ? (wasPassed ? XP.rebig : b.final ? XP.book : XP.big) : 0;
  const rows = bigLessons(b).map((l) => bigLessonRow(t, l));
  const after = finalAfter(b);
  const next = LESSONS.find((l) => l.n === b.to + 1);
  const finished = newly.length ? ` That finishes ${plural(newly.length, "more lesson")}, and their grammar now comes back in your daily review.` : "";
  $("#bigTest").innerHTML = `
    <div class="lt-result ${passed ? "pass" : "fail"}">
      <div class="lt-seal${passed ? " pass stamp" : ""}" lang="ja">${perfect ? "満点" : passed ? "合格" : "もう少し"}</div>
      <div>
        <div class="lt-score"><b>${score}</b> / ${t.qs.length}${bonus ? ` <span class="xp-chip">+${bonus} XP bonus</span>` : ""}</div>
        <h3>${passed ? (perfect ? "A perfect score!" : wasPassed ? "Passed again!" : `${b.name} passed!`) : "Not quite there yet"}</h3>
        <p>${passed
          ? `${perfect ? `<span lang="ja">満点</span> (manten) means “full marks”.` : `<span lang="ja">合格</span> (gōkaku) means “passed”.`}${finished}`
          : `You need ${mark} to pass, so ${plural(mark - score, "more right answer")} next time. The lessons below show where to practise, and the questions change every time.`}</p>
      </div>
    </div>
    <div class="small muted big-rows-label">By lesson</div>
    <div class="rv-rows${rows.length > 10 ? " big-rows-many" : ""}">${rows.map((r) => r.html).join("")}</div>
    ${missedHTML(t)}
    <div class="q-actions lt-actions">
      <button class="btn" id="bigRetry">Try again</button>
      ${passed && after ? `<button class="btn primary" data-go-big="${after.id}">${after.name} ›</button>`
        : passed && next ? `<button class="btn primary" data-go-l="${next.n}">Lesson ${next.n}: ${next.title} ›</button>` : ""}
    </div>`;
  const box = $("#bigTest");
  wireBigLinks(box);
  $("#bigRetry").onclick = () => startBig(b);
  if (bonus) addXP(bonus, $(".lt-score b", box));
  if (passed) burst($(".lt-seal", box));
  if (passed && !wasPassed && b.final) toast(`<b>${b.name} passed!</b> <span lang="ja">おめでとう</span>, that's the whole book`);
}
