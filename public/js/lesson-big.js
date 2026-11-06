// Big tests on the Lessons tab: one every few lessons, and a final for each book. They're open from
// the start, and passing one finishes every lesson it covers. Multiple choice comes first and a
// written section last. Loaded after lesson-review.js and uses its helpers. Runs on the sentence
// builder's helpers (lesson-build.js) for the written section.
//
// Saved per account (see server.js): bigTests, the best score of each test; bigWeak, the lessons
// scored low on, for the Retest roulette; certs, each book's certificate. A test in progress stays
// in this browser ("bigRun"), as a list of which questions it holds rather than the questions.

const BIG_PER_LESSON = 5; // questions per lesson in a block's big test
const BIG_FINAL_LEN = 50;
const BIG_PASS = 0.8;
const BIG_FINAL_WRITTEN = 0.2; // share of a final that's written
const BIG_BLOCK_WRITTEN = 0.15; // gives 3 to 5 questions on a block's test

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
  { id: "book1", from: 1, to: 25, name: "Book I final", book: "Book I", ja: "初級 Ⅰ", title: "The whole of 初級 Ⅰ", final: true, len: BIG_FINAL_LEN },
  { id: "book2", from: 26, to: 50, name: "Book II final", book: "Book II", ja: "初級 Ⅱ", title: "The whole of 初級 Ⅱ", final: true, len: BIG_FINAL_LEN },
];

const bigPassMark = (b) => Math.ceil(b.len * BIG_PASS);
const bigWrittenCount = (b) => Math.round(b.len * (b.final ? BIG_FINAL_WRITTEN : BIG_BLOCK_WRITTEN));
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

// open: the test on show instead of a lesson. runs: tests in progress, by test. exam: this visit's
// choice of exam mode for each test, which starts on for the finals.
const bigUI = { open: null, runs: store.get("bigRun", {}), exam: {} };
const bigExamOn = (b) => bigUI.exam[b.id] ?? b.final;

function saveBigRuns() {
  const saved = {};
  for (const [id, { qs, ...t }] of Object.entries(bigUI.runs)) saved[id] = t;
  store.set("bigRun", saved);
}

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
  const run = bigUI.runs[b.id];
  const words = run
    ? `You've got this test in progress, with ${run.results.length} of ${b.len} answered.`
    : bigPassed(b)
      ? `<b>Passed</b> with a best of ${bigBest(b)} / ${b.len}.`
      : done === lessons.length
        ? `All ${lessons.length} lessons finished. Ready when you are!`
        : `${done} of ${lessons.length} lessons finished. Already know them? Passing finishes them all at once.`;
  box.innerHTML = `
    <div class="big-hint-text">
      <div class="rl-kicker"><span lang="ja">試</span> ${b.name} · ${bigRange(b)}</div>
      <p class="small">${words}</p>
    </div>
    <button class="btn${run || (!bigPassed(b) && done === lessons.length) ? " primary" : ""}" data-open-big="${b.id}">${run ? "Carry on" : `Open ${b.name}`} ›</button>`;
  $("[data-open-big]", box).onclick = () => showBig(b.id, true);
}

/* ---------------------------------------------------------------- Showing a test */

function showBig(id, scroll) {
  const b = bigById(id);
  bigUI.open = id;
  store.set("bigOpen", id);
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
  store.del("bigOpen");
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
  const written = bigWrittenCount(b);
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
          <p>${b.len} questions, spread evenly across ${b.final ? `all ${b.to - b.from + 1} lessons` : "these lessons"}. First ${b.len - written} multiple choice, mixed together so you have to work out which grammar applies, then ${written} to write yourself. Score <b>${bigPassMark(b)} / ${b.len}</b> or more to pass.</p>
          <p class="small muted">${reward}</p>
          <p class="small muted">${best === undefined ? "Not taken yet." : `Best score so far: ${best} / ${b.len}.`}</p>
          ${run ? `<p class="small muted">In progress: ${run.results.length} of ${b.len} answered${run.exam ? ", in exam mode" : ""}.</p>` : `
          <label class="big-exam">
            <input type="checkbox" id="bigExam" ${bigExamOn(b) ? "checked" : ""}>
            <span><b>Exam mode</b> <span class="small muted">No right or wrong until the end, and the XP all comes at the end too.</span></span>
          </label>`}
          <div class="big-intro-actions">
            ${run ? `<button class="btn primary" id="bigGoOn">Carry on</button><button class="btn" id="bigStart">Start over</button>`
              : `<button class="btn primary" id="bigStart">${best === undefined ? "Start the test" : "Take the test again"}</button>`}
            ${b.final && bigPassed(b) ? `<button class="btn" id="bigCert"><span lang="ja">修了証</span> · Certificate</button>` : ""}
          </div>
        </div>
      </div>
    </div>
    ${bigNavHTML(b)}`;
  wireBigLinks(box);
  const exam = $("#bigExam");
  if (exam) exam.onchange = () => (bigUI.exam[b.id] = exam.checked);
  $("#bigStart").onclick = () => startBig(b);
  if (run) $("#bigGoOn").onclick = () => runBig(b, run);
  const cert = $("#bigCert");
  if (cert) cert.onclick = () => drawCertificate(b);
}

/* ---------------------------------------------------------------- Choosing the questions */

// A question is saved as an item: { n: lesson, p: point, k: kind, d: drill or b: build sentence },
// so it can be drawn again after a reload.
const MC_KINDS = ["gap", "gap", "gap", "meaning", "sentence"];

// `count` multiple choice items from one lesson, going through its points in a random order. The
// sentence being written (if any) isn't asked as well, and its point comes last, so the two parts
// between them still touch every point when there's room.
function lessonItems(l, count, write) {
  const drills = lessonDrills(l);
  const skipEn = write ? write.en : null;
  const points = shuffle(l.points.map((_, p) => p)).sort((a, c) => (write ? (a === write.i) - (c === write.i) : 0))
    .map((p) => ({ p, left: shuffle(drills.map((d, j) => ({ d, j })).filter(({ d }) => d.point === l.points[p] && d.en !== skipEn)) }));
  const items = [];
  for (let k = 0; items.length < count && k < count * 20; k++) {
    const { p, left } = points[k % points.length];
    const next = left.pop();
    if (!next) continue;
    const kind = isFormLink(l.points[p].link) && Math.random() < 0.25 ? "form" : pick(MC_KINDS);
    items.push({ n: l.n, p, k: kind, d: next.j });
  }
  return items;
}

// Each lesson gets the same number of questions. The written ones each come from a different lesson.
function buildBigItems(b) {
  const lessons = bigLessons(b);
  const each = b.len / lessons.length;
  const writing = new Map(shuffle(lessons.slice()).slice(0, bigWrittenCount(b)).map((l) => {
    const builds = lessonBuilds(l);
    const at = Math.floor(Math.random() * builds.length);
    return [l.n, { at, en: builds[at].en, i: builds[at].i }];
  }));
  const choice = lessons.flatMap((l) => lessonItems(l, each - (writing.has(l.n) ? 1 : 0), writing.get(l.n)));
  const written = [...writing].map(([n, w]) => ({ n, p: w.i, k: "build", b: w.at }));
  return [...shuffle(choice), ...shuffle(written)];
}

function writtenQ(l, b) {
  const c = ROLES[b.point.role].color;
  return {
    written: true,
    b,
    review: `<span lang="ja" style="--c:${c}">${builtSentence(b)}</span><span class="muted">${b.en}</span>`,
  };
}

// The question for an item, or null if the lesson's sentences have changed since it was saved.
function bigQuestion(item) {
  const l = LESSONS.find((x) => x.n === item.n);
  if (!l || !l.points[item.p]) return null;
  if (item.k === "build") {
    const b = lessonBuilds(l)[item.b];
    return b ? writtenQ(l, b) : null;
  }
  const link = l.points[item.p].link;
  if (item.k === "form") return isFormLink(link) ? formQ(link) : null;
  const all = lessonDrills(l);
  const d = all[item.d];
  if (!d) return null;
  return item.k === "meaning" ? meaningQ(d, all) : item.k === "sentence" ? sentenceQ(d) : gapQ(d);
}

// Draws a saved run's questions, the first time it's needed. Form questions are made up fresh, so
// any already missed keep the review line they were saved with. False if the run can't be used.
function loadBigRun(t) {
  if (t.qs) return true;
  const qs = t.items.map(bigQuestion);
  if (qs.some((q) => !q)) return false;
  qs.forEach((q, j) => { if (t.rv[j]) q.review = t.rv[j]; });
  t.qs = qs;
  return true;
}

function startBig(b) {
  track("big.start");
  const items = buildBigItems(b);
  bigUI.runs[b.id] = { id: b.id, items, i: 0, results: [], exam: bigExamOn(b), typed: {}, rv: {}, batch: null };
  saveBigRuns();
  runBig(b, bigUI.runs[b.id]);
}

/* ---------------------------------------------------------------- Asking */

const bigScore = (t) => t.results.filter((r) => r === true).length;

// One class per question: colours as you go, or just "answered" in exam mode.
function bigBar(t) {
  return t.items.map((_, j) => {
    const r = t.results[j];
    if (r === undefined) return `<span class="lt-dot${j === t.i ? " now" : ""}"></span>`;
    return `<span class="lt-dot ${t.exam || r === "wait" ? "ans" : r ? "ok" : "bad"}"></span>`;
  }).join("");
}

function bigTally(t) {
  if (t.exam) return `<b>${t.results.length}</b> answered · exam mode`;
  const waiting = t.results.filter((r) => r === "wait").length;
  return `<b class="big-right">${bigScore(t)}</b> right · <b class="big-wrong">${t.results.filter((r) => r === false).length}</b> wrong${waiting ? ` · ${waiting} waiting` : ""}`;
}

function runBig(b, t) {
  if (!loadBigRun(t)) {
    delete bigUI.runs[b.id];
    saveBigRuns();
    return drawBigIntro(b);
  }
  // Left after answering, before pressing Next: that question is already counted.
  if (t.results[t.i] !== undefined) t.i++;
  if (t.i >= t.qs.length) return closeWritten(b, t);
  const box = $("#bigTest");
  const last = t.i + 1 === t.qs.length;
  const q = t.qs[t.i];
  box.innerHTML = `
    <div class="lt-top">
      <span class="small"><b>Question ${t.i + 1}</b> of ${t.qs.length}</span>
      <span class="small muted big-tally">${bigTally(t)}</span>
      <div class="lt-dots big-dots">${bigBar(t)}</div>
    </div>
    <div id="bigQ"></div>
    <div class="q-actions"><button class="btn primary" id="bigNext" hidden>${last ? "See my result →" : "Next question →"}</button></div>`;
  const next = $("#bigNext");

  const advance = () => {
    runBig(b, t);
    if (box.getBoundingClientRect().top < 0) scrollBelowBar(box);
  };
  // Saved straight away, so a reload loses nothing.
  const record = (result, btn, typed) => {
    t.results[t.i] = result;
    if (typed) t.typed[t.i] = typed;
    if (result === false && t.items[t.i].k === "form") t.rv[t.i] = q.review;
    saveBigRuns();
    if (result === true && !t.exam) addXP(XP.test, btn);
    $(".lt-dots", box).innerHTML = bigBar(t);
    $(".big-tally", box).innerHTML = bigTally(t);
  };
  const showNext = () => {
    next.hidden = false;
    next.focus({ preventScroll: true });
  };
  next.onclick = advance;

  if (q.written) {
    askWritten($("#bigQ"), q, t.exam, last, (result, btn, typed) => {
      record(result, btn, typed);
      if (t.exam) advance();
      else showNext();
    });
  } else if (t.exam) {
    // In exam mode an answer can be changed until Next is pressed.
    let chosen = null;
    askExam($("#bigQ"), q, (ok, btn) => {
      chosen = { ok, btn };
      showNext();
    });
    next.onclick = () => {
      record(chosen.ok, chosen.btn);
      advance();
    };
  } else {
    askIn($("#bigQ"), q, (ok, btn) => {
      record(ok, btn);
      showNext();
    });
  }
}

// The question and its answers, with nothing said about whether a pick is right.
function askExam(box, q, picked) {
  box.innerHTML = `
    <div class="q-kind">${q.kind}</div>
    <div class="q-prompt">${q.prompt}</div>
    <div class="q-opts${q.wide ? " wide" : ""}">
      ${q.options.map((o, i) => `<button class="q-opt" data-i="${i}" lang="${o.lang || "ja"}"><span class="q-key" aria-hidden="true">${i + 1}</span>${o.html}</button>`).join("")}
    </div>`;
  keyQuiz = box;
  $$(".q-opt", box).forEach((b) => (b.onclick = () => {
    $$(".q-opt", box).forEach((x) => x.classList.toggle("picked", x === b));
    picked(q.options[+b.dataset.i].correct, b);
  }));
}

/* ---------------------------------------------------------------- Written questions */

// Blocks are always marked here. Typed sentences are right if they're a wording the site knows, and
// otherwise wait for the user's chatbot at the end, as in the sentence builder's free text mode.
function askWritten(box, q, exam, last, done) {
  const b = q.b;
  const s = { placed: [], bank: buildShuffled(b), typed: "", mode: store.get("buildMode", "blocks") };
  const draw = () => {
    const { mode } = s;
    const canSend = mode === "blocks" ? !s.bank.length : !!s.typed.trim();
    const modeBtn = (id, label) => `<button type="button" class="sb-mode${mode === id ? " on" : ""}" data-mode="${id}" aria-pressed="${mode === id}">${label}</button>`;
    box.innerHTML = `
      <div class="big-write-top">
        <div class="q-kind">Written · say it in Japanese</div>
        <span class="sb-modes" role="group" aria-label="How to answer">${modeBtn("blocks", "Blocks")}${modeBtn("text", "Type it")}</span>
      </div>
      <div class="q-en-big">“${b.en}”</div>
      ${mode === "blocks" ? `
        <div class="row-label">Your sentence</div>
        <div class="chunks compact sb-row sb-answer" aria-label="Your sentence">
          ${s.placed.length ? s.placed.map((x) => blockBtn(x)).join("") : '<span class="small muted sb-empty">Tap the blocks below, in order.</span>'}
        </div>
        <div class="chunks compact sb-row sb-bank" aria-label="Blocks left">${s.bank.map((x) => blockBtn(x)).join("")}</div>` : `
        <input class="sb-text big-text" lang="ja" maxlength="${WRITE_MAX}" autocomplete="off" spellcheck="false"
          aria-label="Your sentence in Japanese" placeholder="Type it in Japanese">
        <div class="lw-note sb-note" aria-live="polite"></div>
        <p class="small muted big-write-note">If the site doesn't know your wording, your own chatbot checks it at the end.</p>`}
      <div class="q-actions sb-actions big-write-actions">
        <button class="btn primary" id="bigSend" ${canSend ? "" : "disabled"}>${exam ? (last ? "See my result →" : "Next question →") : "Check"}</button>
        <button class="btn" id="bigSkip">Skip</button>
      </div>
      <div class="q-feedback"></div>`;
    keyQuiz = box;
    $$("[data-mode]", box).forEach((x) => (x.onclick = () => {
      if (x.dataset.mode === s.mode) return;
      s.mode = x.dataset.mode;
      store.set("buildMode", s.mode);
      draw();
    }));
    $$("[data-b]", box).forEach((el) => (el.onclick = () => {
      const id = +el.dataset.b;
      const [from, to] = el.closest(".sb-bank") ? [s.bank, s.placed] : [s.placed, s.bank];
      to.push(...from.splice(from.findIndex((x) => x.id === id), 1));
      draw();
    }));
    const input = $(".big-text", box);
    if (input) {
      input.value = s.typed;
      input.oninput = () => {
        s.typed = input.value;
        $("#bigSend").disabled = !s.typed.trim();
        $(".sb-note", box).textContent = "";
      };
      input.onkeydown = (e) => {
        // Enter also confirms a word in a Japanese keyboard (IME) — leave that alone.
        if (e.key !== "Enter" || e.isComposing || e.keyCode === 229) return;
        e.preventDefault();
        send();
      };
      input.focus({ preventScroll: true });
    }
    $("#bigSend").onclick = send;
    $("#bigSkip").onclick = () => finish(false);
  };
  const send = () => {
    if (s.mode === "blocks") {
      if (!s.bank.length) finish(!wrongSpots(b, s.placed).length);
      return;
    }
    const typed = s.typed.trim();
    if (!typed) return;
    if (!JA_RE.test(typed)) {
      $(".sb-note", box).textContent = "Write it in Japanese, or skip this one.";
      return;
    }
    if (acceptedTexts(b).has(normJa(typed))) finish(true);
    else finish("wait", typed);
  };
  const finish = (result, typed) => {
    const btn = $("#bigSend");
    if (!exam) {
      $$("button:not(.lp-link), input", box).forEach((x) => (x.disabled = true));
      $(".big-write-actions", box).hidden = true;
      $(".q-feedback", box).innerHTML = result === "wait"
        ? `<div class="verdict">Saved for your chatbot.</div><p class="small">The site doesn't know this wording, but it may still be right. You'll get one prompt with all of these at the end.</p>`
        : `${result ? "" : `<div class="verdict bad">Not quite.</div>`}${buildFeedback(b, false, !result)}`;
      const see = $("[data-see]", box);
      if (see) see.onclick = () => goTo(b.point.link);
    }
    done(result, btn, typed);
  };
  draw();
}

// The sentences waiting for a chatbot, which go to it in one prompt once the questions are over.
function closeWritten(b, t) {
  const waiting = t.results.map((r, j) => (r === "wait" ? j : -1)).filter((j) => j >= 0);
  if (!waiting.length) return finishBig(b, t);
  // The prompt numbers them, so the list can't change once it's made.
  if (!t.batch) {
    t.batch = waiting;
    saveBigRuns();
  }
  drawBigChatbot(b, t);
}

function bigPrompt(b, t) {
  const furi = $("#furiToggle").checked;
  const l = LESSONS.find((x) => x.n === b.to);
  const f = `the grammar of ${bigRange(b)}`;
  const task = AI_PRESETS.find((x) => x.id === "check").task({ l, f, furi }).replace(/1\. $/, "");
  const list = (get) => t.batch.map((j, k) => `${k + 1}. ${get(j)}`).join("\n");
  const context = `I'm learning Japanese with the textbook Minna no Nihongo (みんなの日本語 初級 I・II). I've just taken a test on ${f}, and I know the grammar of lessons 1–${b.to}.`;
  return [context, promptStyle(l, furi),
    `${task}${list((j) => t.typed[j])}

These are my translations of the English sentences below, in the same order. Any natural Japanese that says the same thing counts as correct, even if it's worded differently from what you would write.

English:
${list((j) => t.qs[j].b.en)}`].join("\n\n");
}

function bigChatbotRows(t) {
  return t.batch.map((j) => {
    const r = t.results[j];
    const [cls, label] = r === "wait" ? ["", "For your chatbot"] : r ? ["ok", "✓ Right"] : ["bad", "✗ Not quite"];
    return `<div class="sb-tx-row">
      <div class="sb-tx-head"><span class="small muted">${t.qs[j].b.en}</span><span class="sb-tx-mark small ${cls}">${label}</span></div>
      <div class="sb-tx-ja" lang="ja">${escHTML(t.typed[j])}</div>
    </div>`;
  }).join("");
}

function drawBigChatbot(b, t) {
  const n = t.batch.length;
  const box = $("#bigTest");
  box.innerHTML = `
    <div class="lt-top"><span class="small"><b>Nearly done</b> · your written answers</span></div>
    <div id="bigChatRows">${bigChatbotRows(t)}</div>
    <div class="lw-ai">
      <p class="small">The site doesn't know ${n === 1 ? "this wording" : "these wordings"}, but ${n === 1 ? "it" : "they"} may still be right, so ask your chatbot before the score is counted.</p>
      <p class="small"><b>1.</b> Copy this prompt and paste it into your chatbot.</p>
      <button class="btn primary lw-copy">Copy prompt for ${plural(n, "sentence")}</button>
      <textarea class="ai-text lw-prompt" rows="8" readonly hidden aria-label="Prompt to copy"></textarea>
      <p class="small lw-step2"><b>2.</b> Copy the chatbot's answer and paste it here.</p>
      ${aiReaderHTML("Paste the chatbot's answer here")}
      <p class="small sb-verdict" aria-live="polite"></p>
    </div>
    <div class="q-actions sb-actions" id="bigChatActions"></div>`;
  wireCopyPrompt(box, () => bigPrompt(b, t));
  setupAiReader($(".ar", box), "", (text) => { if (text) readBigAnswer(b, t, text); });
  drawBigChatActions(b, t);
  if (box.getBoundingClientRect().top < 0) scrollBelowBar(box);
}

function drawBigChatActions(b, t) {
  const open = t.batch.filter((j) => t.results[j] === "wait").length;
  const box = $("#bigChatActions");
  box.innerHTML = open
    ? `<button class="btn" id="bigChatSkip">No chatbot: count ${open === 1 ? "this" : `these ${open}`} as wrong</button>`
    : `<button class="btn primary" id="bigChatDone">See my result →</button>`;
  const skip = $("#bigChatSkip");
  if (skip) skip.onclick = () => {
    t.batch.forEach((j) => { if (t.results[j] === "wait") t.results[j] = false; });
    finishBig(b, t);
  };
  const go = $("#bigChatDone");
  if (go) go.onclick = () => finishBig(b, t);
}

// The prompt numbered the sentences, so the number says which each verdict is about. Each
// correction goes to "Your mistakes" under its sentence's grammar point.
function readBigAnswer(b, t, text) {
  const verdicts = aiVerdicts(text);
  const corrections = aiCorrections(text);
  const fresh = [];
  t.batch.forEach((j, k) => {
    const ok = verdicts[k + 1];
    if (t.results[j] !== "wait" || ok === undefined) return;
    t.results[j] = ok;
    fresh.push({ j, k });
    if (ok && !t.exam) addXP(XP.test, $("#bigChatRows"));
  });
  const groups = new Map();
  for (const x of fresh) {
    const key = `${t.items[x.j].n}.${t.items[x.j].p}`;
    groups.set(key, [...(groups.get(key) || []), x]);
  }
  for (const mine of groups.values()) {
    const { n, p } = t.items[mine[0].j];
    const typed = mine.map((x) => t.typed[x.j].trim());
    const own = mine.flatMap((x, m) => {
      const c = corrections.find((y) => y.n === x.k + 1);
      return c ? [{ ...c, n: m + 1, text: typed[m] }] : [];
    });
    saveCorrections(LESSONS.find((l) => l.n === n), p, text, typed, own);
  }
  saveBigRuns();
  $("#bigChatRows").innerHTML = bigChatbotRows(t);
  const open = t.batch.filter((j) => t.results[j] === "wait").length;
  const note = $("#bigTest .sb-verdict");
  note.className = `small sb-verdict${open ? " bad" : " ok"}`;
  note.textContent = !open
    ? "All checked."
    : open === t.batch.length
      ? "Can't find a ✓ or ✗ on your sentences in this answer, so nothing is counted. Did you paste all of it?"
      : `${open} still ${open === 1 ? "has" : "have"} no ✓ or ✗ in this answer. Paste the rest, or count ${open === 1 ? "it" : "them"} as wrong.`;
  drawBigChatActions(b, t);
}

/* ---------------------------------------------------------------- Lessons scored low on */

// Lesson numbers, saved per account. A big test or a retest takes a lesson off when it scores well.
const bigWeak = new Set(store.get("bigWeak", []));
const weakLessons = () => LESSONS.filter((l) => bigWeak.has(l.n));
const saveWeak = () => store.set("bigWeak", [...bigWeak].sort((a, c) => a - c));

// Round the chosen lessons, one question at a time, for the Retest roulette.
function buildRetest() {
  const lessons = shuffle(weakLessons()).slice(0, RETEST_LESSONS);
  const counts = lessons.map((_, j) => Math.floor(RETEST_LEN / lessons.length) + (j < RETEST_LEN % lessons.length ? 1 : 0));
  const items = shuffle(lessons.flatMap((l, j) => lessonItems(l, counts[j])));
  return items.map((item) => Object.assign(bigQuestion(item), { lessonN: item.n }));
}

// Takes off the lessons that went well. Returns those lessons.
function settleRetest(t) {
  const lessons = [...new Set(t.qs.map((q) => q.lessonN))];
  const cleared = lessons.filter((n) => {
    const mine = t.qs.map((q, j) => (q.lessonN === n ? j : -1)).filter((j) => j >= 0);
    return mine.filter((j) => t.results[j]).length / mine.length >= BIG_PASS;
  });
  cleared.forEach((n) => bigWeak.delete(n));
  saveWeak();
  return cleared;
}

function startRetestRoulette() {
  const r = ROULETTES.find((x) => x.id === "retest");
  showTab("home");
  rouletteUI.busy = false;
  runOf(r.id).pick = "weak";
  store.set("roulette", spin);
  startRun(r, targetOf(r, "weak"));
}

/* ---------------------------------------------------------------- The result */

function saveBigScore(b, score) {
  if (score > (bigBest(b) ?? -1)) {
    lessonState.big[b.id] = score;
    store.set("bigTests", lessonState.big);
  }
}

// Scores for one lesson's questions, shown as a row and used to note which lessons were weak.
function bigLessonRow(t, l) {
  const mine = t.items.map((x, j) => (x.n === l.n ? j : -1)).filter((j) => j >= 0);
  const right = mine.filter((j) => t.results[j] === true).length;
  const low = right / mine.length < BIG_PASS;
  const cls = right === mine.length ? "good" : low ? "bad" : "some";
  return { n: l.n, low, html: `
    <div class="rv-row">
      <button class="big-row-link" data-go-l="${l.n}">${l.n}. ${l.title}</button>
      <span class="rv-mark ${cls}">${right} / ${mine.length}</span>
      <span class="small muted">${low ? "Worth another look" : cls === "some" ? "Nearly there" : "Solid"}</span>
    </div>` };
}

// Grammar points missed in this test come back in tomorrow's review. Returns how many did.
function reviewMissedPoints(t) {
  const keys = new Set(t.items.filter((_, j) => t.results[j] !== true).map((x) => `${x.n}.${x.p}`));
  return [...keys].filter(reviewFromMiss).length;
}

function finishBig(b, t) {
  track("big.done");
  delete bigUI.runs[b.id];
  saveBigRuns();
  const score = bigScore(t);
  const mark = bigPassMark(b);
  const passed = score >= mark;
  const perfect = score === t.qs.length;
  const wasPassed = bigPassed(b);
  const newly = passed ? bigLessons(b).filter((l) => !lessonPassed(l.n)) : [];
  saveBigScore(b, score);
  if (passed && b.final) saveCert(b, score);

  const rows = bigLessons(b).map((l) => bigLessonRow(t, l));
  rows.forEach((r) => (r.low ? bigWeak.add(r.n) : bigWeak.delete(r.n)));
  saveWeak();
  const lowHere = rows.filter((r) => r.low).length;

  updateLessonPath();
  schedulePoints(1); // what this finished has to be on the schedule before a miss can move it
  const missedBack = reviewMissedPoints(t);
  refreshRoulette();

  const bonus = passed ? (wasPassed ? XP.rebig : b.final ? XP.book : XP.big) : 0;
  const examXp = t.exam ? score * XP.test : 0;
  const after = finalAfter(b);
  const next = LESSONS.find((l) => l.n === b.to + 1);
  const finished = newly.length ? ` That finishes ${plural(newly.length, "more lesson")}, and their grammar now comes back in your daily review.` : "";
  const writtenAt = t.items.map((x, j) => (x.k === "build" ? j : -1)).filter((j) => j >= 0);
  const writtenRight = writtenAt.filter((j) => t.results[j] === true).length;
  const box = $("#bigTest");
  box.innerHTML = `
    <div class="lt-result ${passed ? "pass" : "fail"}">
      <div class="lt-seal${passed ? " pass stamp" : ""}" lang="ja">${perfect ? "満点" : passed ? "合格" : "もう少し"}</div>
      <div>
        <div class="lt-score"><b>${score}</b> / ${t.qs.length}${bonus + examXp ? ` <span class="xp-chip">+${bonus + examXp} XP</span>` : ""}</div>
        <h3>${passed ? (perfect ? "A perfect score!" : wasPassed ? "Passed again!" : `${b.name} passed!`) : "Not quite there yet"}</h3>
        <p>${passed
          ? `${perfect ? `<span lang="ja">満点</span> (manten) means “full marks”.` : `<span lang="ja">合格</span> (gōkaku) means “passed”.`}${finished}`
          : `You need ${mark} to pass, so ${plural(mark - score, "more right answer")} next time. The lessons below show where to practise, and the questions change every time.`}</p>
      </div>
    </div>
    <p class="small muted big-result-notes">Written section: ${writtenRight} / ${writtenAt.length}.${missedBack ? ` ${plural(missedBack, "grammar point")} you missed ${missedBack === 1 ? "comes" : "come"} back in your review tomorrow.` : ""}</p>
    <div class="small muted big-rows-label">By lesson</div>
    <div class="rv-rows${rows.length > 10 ? " big-rows-many" : ""}">${rows.map((r) => r.html).join("")}</div>
    ${missedHTML(t)}
    <div class="q-actions lt-actions">
      <button class="btn" id="bigRetry">Try again</button>
      ${!passed && lowHere ? `<button class="btn primary" id="bigRetest">Retest my weak lessons</button>` : ""}
      ${passed && b.final ? `<button class="btn primary" id="bigCert"><span lang="ja">修了証</span> · Your certificate</button>` : ""}
      ${passed && after ? `<button class="btn primary" data-go-big="${after.id}">${after.name} ›</button>`
        : passed && next ? `<button class="btn${b.final ? "" : " primary"}" data-go-l="${next.n}">Lesson ${next.n}: ${next.title} ›</button>` : ""}
    </div>`;
  wireBigLinks(box);
  $("#bigRetry").onclick = () => startBig(b);
  const retest = $("#bigRetest");
  if (retest) retest.onclick = startRetestRoulette;
  const cert = $("#bigCert");
  if (cert) cert.onclick = () => drawCertificate(b);
  if (bonus + examXp) addXP(bonus + examXp, $(".lt-score b", box));
  if (passed) burst($(".lt-seal", box));
  if (passed && !wasPassed && b.final) toast(`<b>${b.name} passed!</b> <span lang="ja">おめでとう</span>, that's the whole book`);
  if (box.getBoundingClientRect().top < 0) scrollBelowBar(box);
}

/* ---------------------------------------------------------------- Certificates */

// certs: { [book final]: { score, day } }, the best score and the day it was made. The site is
// private, so a certificate is shared as an image rather than a link.
const certs = store.get("certs", {});

function saveCert(b, score) {
  const old = certs[b.id];
  if (old && old.score >= score) return;
  certs[b.id] = { score, day: dayStr() };
  store.set("certs", certs);
}

// Passed before certificates existed: dated the day it's first looked at.
function certOf(b) {
  if (!certs[b.id]) saveCert(b, bigBest(b));
  return certs[b.id];
}

function certDate(day) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

const CERT_W = 1400;
const CERT_H = 990;
const CERT_JA = '"Noto Sans JP", sans-serif';
const CERT_UI = 'Inter, "Noto Sans JP", sans-serif';

function paintCertificate(canvas, b, name) {
  const { score, day } = certOf(b);
  const ctx = canvas.getContext("2d");
  const ink = "#2b2620";
  const soft = "#6f6556";
  const red = "#b8352a";
  const mid = CERT_W / 2;
  const text = (s, y, font, color = ink) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(s, mid, y);
  };
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fbf6e9";
  ctx.fillRect(0, 0, CERT_W, CERT_H);
  ctx.strokeStyle = red;
  ctx.lineWidth = 8;
  ctx.strokeRect(44, 44, CERT_W - 88, CERT_H - 88);
  ctx.lineWidth = 2;
  ctx.strokeRect(62, 62, CERT_W - 124, CERT_H - 124);

  text("修了証", 230, `700 118px ${CERT_JA}`);
  text("Certificate of Completion", 288, `500 34px ${CERT_UI}`, soft);
  text("This is to certify that", 390, `400 30px ${CERT_UI}`, soft);
  // A long name shrinks to fit.
  let size = 72;
  do {
    ctx.font = `700 ${size}px ${CERT_UI}`;
    size -= 4;
  } while (ctx.measureText(name).width > CERT_W - 320 && size > 24);
  text(name, 484, ctx.font);
  ctx.strokeStyle = soft;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mid - 340, 512);
  ctx.lineTo(mid + 340, 512);
  ctx.stroke();
  text("has passed the final test of Japanese grammar", 578, `400 30px ${CERT_UI}`, soft);
  text(`${b.book} (${b.ja}), lessons ${b.from}–${b.to}`, 642, `700 42px ${CERT_UI}`);
  text(`Score ${score} / ${b.len} · ${Math.round((score / b.len) * 100)}%`, 736, `500 34px ${CERT_UI}`);
  text(certDate(day), 790, `400 30px ${CERT_UI}`, soft);
  text("Bunpō · Visual Japanese Grammar", 880, `500 24px ${CERT_UI}`, soft);

  // The stamp.
  ctx.save();
  ctx.translate(CERT_W - 240, CERT_H - 230);
  ctx.rotate(-0.14);
  ctx.strokeStyle = red;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, 84, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = red;
  ctx.font = `700 50px ${CERT_JA}`;
  ctx.textBaseline = "middle";
  ctx.fillText("合格", 0, 2);
  ctx.restore();
}

const certBlob = (canvas) => new Promise((done) => canvas.toBlob(done, "image/png"));

function drawCertificate(b) {
  track("big.cert");
  const box = $("#bigDetail");
  const account = $(".account-name");
  const name = () => $("#certName").value.trim() || " ";
  box.innerHTML = `
    <div class="card lesson-head big-head big-final">
      <div class="lesson-kicker"><span lang="ja">修了証</span> · ${b.name}</div>
      <h2>Your certificate</h2>
      <canvas class="big-cert" id="certCanvas" width="${CERT_W}" height="${CERT_H}" role="img"
        aria-label="Certificate for passing the ${b.name}, score ${certOf(b).score} of ${b.len}"></canvas>
      <label class="big-cert-name small">Name on the certificate
        <input class="sb-text" id="certName" maxlength="40" autocomplete="off" spellcheck="false">
      </label>
      <div class="big-intro-actions">
        <button class="btn primary" id="certSave">Save as an image</button>
        <button class="btn" id="certShare" hidden>Share</button>
        <button class="btn" id="certBack">‹ Back to the ${b.name}</button>
      </div>
      <p class="small muted">The site itself is private, so share the image rather than a link to this page.</p>
    </div>`;
  const canvas = $("#certCanvas");
  const input = $("#certName");
  input.value = store.get("certName", account ? account.textContent : "");
  const paint = () => paintCertificate(canvas, b, name());
  paint();
  // The fonts load by the characters they're needed for, so ask for these and draw again.
  const needed = `修了証合格初級ⅠⅡ${input.value}`;
  Promise.all([`700 118px "Noto Sans JP"`, `700 72px Inter`, `500 34px Inter`, `400 30px Inter`]
    .map((f) => document.fonts.load(f, needed))).then(paint, () => {});
  input.oninput = () => {
    store.set("certName", input.value);
    paint();
  };
  $("#certBack").onclick = () => drawBigIntro(b);
  const fileName = `bunpo-${b.id.replace("book", "book-")}-certificate.png`;
  $("#certSave").onclick = async () => {
    const url = URL.createObjectURL(await certBlob(canvas));
    const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const share = $("#certShare");
  const probe = new File([""], fileName, { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [probe] })) {
    share.hidden = false;
    share.onclick = async () => {
      const file = new File([await certBlob(canvas)], fileName, { type: "image/png" });
      try {
        await navigator.share({ files: [file], title: `${b.book} certificate` });
      } catch { /* closed without sharing */ }
    };
  }
  scrollBelowBar(box);
}
