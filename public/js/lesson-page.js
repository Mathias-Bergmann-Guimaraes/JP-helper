// The Lessons tab: lesson list, AI study prompts, practice and tests. Loaded after app.js and
// uses its helpers.

/* ---------------------------------------------------------------- Lessons (Minna no Nihongo order) */

// tests: best test score per lesson. A lesson counts as finished once its test is passed.
// stars: best result (0–3) of each grammar point's 5-question check, keyed "lesson.point".
const lessonState = { n: store.get("lesson", 1), tests: store.get("lessonTests", {}), stars: store.get("pointStars", {}) };
const TEST_LEN = 10;
const PASS_MARK = 8;
const CHECK_LEN = 5;
const lessonPassed = (n) => (lessonState.tests[n] || 0) >= PASS_MARK;
const pointStars = (n, i) => lessonState.stars[`${n}.${i}`] || 0;
const lessonStars = (l) => l.points.reduce((s, _, i) => s + pointStars(l.n, i), 0);

// XP per right answer, and bonuses for finishing things.
const XP = { practice: 2, combo: 4, check: 5, star: 10, test: 3, pass: 50, repass: 10 };
const COMBO_AT = 5;

function renderLessons() {
  const node = (l) => `<button class="lnode" data-l="${l.n}"><span class="lnum">${l.n}</span><span class="ltitle">${l.title}</span></button>`;
  $("#lessons").innerHTML = `
    <div class="card hero">
      <h1>Grammar in <span class="accent">Minna no Nihongo</span> order</h1>
      <p>All 50 lessons of <span lang="ja">みんなの日本語 初級 Ⅰ・Ⅱ</span>, one after another. Each grammar point comes with an example,
      and <b>See it →</b> jumps to the picture that explains it. <b>Check</b> each point with 5 quick questions to earn up to
      three stars, then pass the lesson test to finish the lesson. Every right answer earns XP.</p>
      ${hudHTML()}
    </div>
    <div class="lessons-layout">
      <nav class="card lpath" aria-label="Lessons">
        <div class="book-label">Book I · <span lang="ja">初級 Ⅰ</span></div>
        <div class="lnodes">${LESSONS.filter((l) => l.n <= 25).map(node).join("")}</div>
        <div class="book-label">Book II · <span lang="ja">初級 Ⅱ</span></div>
        <div class="lnodes">${LESSONS.filter((l) => l.n > 25).map(node).join("")}</div>
      </nav>
      <div id="lessonDetail"></div>
    </div>`;
  $$("#lessons [data-l]").forEach((b) => (b.onclick = () => showLesson(+b.dataset.l, true)));
  renderHud();
  showLesson(lessonState.n);
}

function linkLabel(link) {
  if (link.tab === "particles") return `Particles: <span lang="ja">${PARTICLES.find((p) => p.id === link.id).p}</span>`;
  if (link.tab === "patterns") return `Patterns: <span lang="ja">${VERB_PATTERNS.find((p) => p.id === link.id).title}</span>`;
  if (link.tab === "verbs") return `Verbs: ${FORM[link.form].label}`;
  if (link.tab === "adjectives") return "Adjectives";
  return "Sentence blocks";
}

// Scroll so `el` sits just below the sticky top bar (and the sticky verb picker on the Patterns page).
function scrollBelowBar(el) {
  let offset = $(".topbar").offsetHeight + 12;
  const picker = $(".pat-picker");
  if (el.closest("#patterns") && getComputedStyle(picker).position === "sticky") offset += picker.offsetHeight;
  window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - offset });
}

function goTo(link) {
  showTab(link.tab);
  window.scrollTo({ top: 0 });
  if (link.tab === "particles") { showParticle(link.id); scrollBelowBar($("#pDetail")); }
  if (link.tab === "patterns") scrollBelowBar($("#pat-" + link.id));
  if (link.tab === "verbs") { verbForm = link.form; updateVerb(); scrollBelowBar($("#conjOut")); }
}

function showLesson(n, scroll) {
  const l = LESSONS.find((x) => x.n === n) || LESSONS[0];
  lessonState.n = l.n;
  store.set("lesson", l.n);
  const prev = LESSONS.find((x) => x.n === l.n - 1);
  const next = LESSONS.find((x) => x.n === l.n + 1);

  const d = $("#lessonDetail");
  d.innerHTML = `
    <div class="card lesson-head">
      <div class="lesson-kicker"><span lang="ja">第${l.n}課</span> · Lesson ${l.n} of ${LESSONS.length} · Book ${l.n <= 25 ? "I" : "II"}</div>
      <h2>${l.title}</h2>
      <div class="lesson-tags">
        ${l.points.map((p) => `<span class="ltag" style="--c:${ROLES[p.role].color}" lang="ja">${p.g}</span>`).join("")}
      </div>
      <div id="lessonStatus"></div>
    </div>
    <div class="lpoints">
      ${l.points.map((p, i) => `
        <div class="lpoint" id="lp-${i}" style="--c:${ROLES[p.role].color}">
          <div class="lp-num">${i + 1}</div>
          <div>
            <div class="lp-g" lang="ja">${p.g}</div>
            <div class="lp-m">${p.m}</div>
            <div class="lp-ex" lang="ja">${rich(p.ex)}</div>
            <div class="lp-en">${p.en}</div>
            <div class="lp-actions">
              <button class="lp-check-btn" data-check="${i}"></button>
              ${p.link ? `<button class="lp-link" data-p="${i}">See it → ${linkLabel(p.link)}</button>` : ""}
            </div>
          </div>
          <div class="lp-check" hidden></div>
        </div>`).join("")}
    </div>
    <div class="lsection">
      <h3>Study with your AI</h3>
      <p class="small muted">Ready-made prompts that already know this lesson. Pick one, copy it, and paste it into the chatbot you use.</p>
    </div>
    <div class="card ai-card" id="lAi"></div>
    <div class="lsection">
      <h3>Practice</h3>
      <p class="small muted">${DRILLS[l.n].length} sentences from this lesson, mixed with meaning questions${lessonForms(l).length ? " and verb-form questions" : ""}. Go for as long as you like.</p>
    </div>
    <div class="card lquiz" id="lPractice">
      <div class="scorebar">
        <span>Score <b id="lpScore">0 / 0</b></span>
        <span>Streak <b id="lpStreak">0</b></span>
        <span class="combo" id="lpCombo" hidden>🔥 Combo · double XP</span>
      </div>
      <div id="lpQ"></div>
      <div class="q-actions"><button class="btn primary" id="lpNext" hidden>Next question →</button></div>
    </div>
    <div class="lsection">
      <h3>Lesson test</h3>
      <p class="small muted">${TEST_LEN} questions. Get ${PASS_MARK} or more right to finish the lesson.</p>
    </div>
    <div class="card lquiz ltest" id="lTest"></div>
    <div class="lesson-nav">
      ${prev ? `<button class="btn" data-go="${prev.n}">‹ ${prev.n}. ${prev.title}</button>` : "<span></span>"}
      ${next ? `<button class="btn" data-go="${next.n}">${next.n}. ${next.title} ›</button>` : ""}
    </div>`;

  $$("[data-p]", d).forEach((b) => (b.onclick = () => goTo(l.points[+b.dataset.p].link)));
  $$("[data-check]", d).forEach((b) => (b.onclick = () => openCheck(l, +b.dataset.check)));
  $$("[data-go]", d).forEach((b) => (b.onclick = () => showLesson(+b.dataset.go, true)));
  l.points.forEach((_, i) => drawPointStars(l, i));
  renderLessonStatus(l);
  renderAiPrompts(l);
  startLessonPractice(l);
  showTestIntro(l);
  updateLessonPath();

  const top = d.getBoundingClientRect().top;
  if (scroll && (top < 0 || top > window.innerHeight * 0.5)) scrollBelowBar(d);
}

function updateLessonPath() {
  $$("#lessons [data-l]").forEach((b) => {
    const n = +b.dataset.l;
    const l = LESSONS.find((x) => x.n === n);
    b.classList.toggle("active", n === lessonState.n);
    b.classList.toggle("done", lessonPassed(n));
    // The ring around the number fills up with the lesson's stars.
    $(".lnum", b).style.setProperty("--p", `${(lessonStars(l) / (l.points.length * 3)) * 100}%`);
  });
  const count = LESSONS.filter((l) => lessonPassed(l.n)).length;
  $("#lProgressBar").style.width = `${(count / LESSONS.length) * 100}%`;
  $("#lProgressText").textContent = `${count} / ${LESSONS.length}`;

  // Keep the selected lesson visible inside the scrollable lesson list.
  const path = $(".lpath");
  const node = $(`#lessons [data-l="${lessonState.n}"]`);
  if (path.scrollHeight > path.clientHeight &&
      (node.offsetTop < path.scrollTop || node.offsetTop > path.scrollTop + path.clientHeight - 40)) {
    path.scrollTop = node.offsetTop - path.clientHeight / 2;
  }
}

// Stars so far, plus one button for the most useful next step: the first point without stars,
// then the test, then the first point that isn't at three stars yet.
function renderLessonStatus(l) {
  const best = lessonState.tests[l.n];
  const stars = lessonStars(l);
  const max = l.points.length * 3;
  const unchecked = l.points.findIndex((_, i) => !pointStars(l.n, i));
  const notFull = l.points.findIndex((_, i) => pointStars(l.n, i) < 3);
  let next;
  if (unchecked >= 0) next = { point: unchecked, html: `Next: check point ${unchecked + 1} ↓` };
  else if (!lessonPassed(l.n)) next = { html: best === undefined
    ? `Next: the lesson test ↓`
    : `Best test score ${best} / ${TEST_LEN} · need ${PASS_MARK} to finish ↓` };
  else if (notFull >= 0) next = { point: notFull, html: `Go for 3 stars on point ${notFull + 1} ↓` };

  $("#lessonStatus").innerHTML = `
    <div class="lmastery">
      <span class="lmastery-stars"><span class="star on">★</span> <b>${stars}</b> / ${max} stars</span>
      <span class="lmastery-bar"><span style="width:${(stars / max) * 100}%"></span></span>
    </div>
    <div class="lstatus-row">
      ${lessonPassed(l.n) ? `<span class="lstatus done">✓ Lesson finished · best test score ${best} / ${TEST_LEN}</span>` : ""}
      ${next ? `<button class="lstatus" id="toNext">${next.html}</button>` : `<span class="lstatus done">★ Every point at three stars</span>`}
    </div>`;
  const btn = $("#toNext");
  if (btn) btn.onclick = () => (next.point === undefined
    ? scrollBelowBar($("#lTest").previousElementSibling)
    : openCheck(l, next.point));
}

/* ------------------------------------------- Lesson practice & test */

// Drill sentences hold one gap: {right|wrong|wrong}. Split it out once.
function parseDrill(l, [s, en, p]) {
  const m = s.match(/\{([^}]+)\}/);
  const [answer, ...wrong] = m[1].split("|");
  return { before: s.slice(0, m.index), after: s.slice(m.index + m[0].length), answer, wrong, en, point: l.points[p] };
}

const lessonDrills = (l) => DRILLS[l.n].map((d) => parseDrill(l, d));

// Verb forms and patterns this lesson teaches — these get generated questions too.
function lessonForms(l) {
  const links = l.points.map((p) => p.link).filter(isFormLink);
  return links.filter((k, i) => links.findIndex((x) => x.tab === k.tab && (x.form || x.id) === (k.form || k.id)) === i);
}

const drillSentence = (d) => `${ruby(d.before)}<span class="hl">${ruby(d.answer)}</span>${ruby(d.after)}`;

function drillFeedback(d) {
  const p = d.point;
  return `<div class="fb-drill" style="--c:${ROLES[p.role].color}">
    <div class="fb-sent" lang="ja">${drillSentence(d)}</div>
    <div class="q-en">${d.en}</div>
    <div class="fb-point"><b lang="ja">${p.g}</b> — ${p.m}</div>
    ${p.link ? `<button class="lp-link" data-see>See it → ${linkLabel(p.link)}</button>` : ""}
  </div>`;
}

function gapQ(d) {
  return {
    kind: "Fill the gap",
    link: d.point.link,
    prompt: `<div class="q-sentence" lang="ja">${ruby(d.before)}<span class="blank">？</span>${ruby(d.after)}</div>
      ${hintEn(d.en)}`,
    options: shuffle([d.answer, ...d.wrong]).map((o) => ({ html: ruby(o), correct: o === d.answer })),
    reveal: (box) => {
      const b = $(".blank", box);
      b.innerHTML = ruby(d.answer);
      b.classList.add("filled");
      b.style.setProperty("--c", ROLES[d.point.role].color);
    },
    feedback: () => drillFeedback(d),
    review: `<span lang="ja" style="--c:${ROLES[d.point.role].color}">${drillSentence(d)}</span><span class="muted">${d.en}</span>`,
  };
}

// Show the whole sentence, pick its English. Wrong answers are other sentences from the same lesson.
function meaningQ(d, all) {
  const wrong = shuffle(all.filter((x) => x.en !== d.en)).slice(0, 3).map((x) => x.en);
  const c = ROLES[d.point.role].color;
  return {
    kind: "What does it mean?",
    link: d.point.link,
    wide: true,
    prompt: `<div class="q-sentence" lang="ja" style="--c:${c}">${drillSentence(d)}</div>`,
    options: shuffle([d.en, ...wrong]).map((o) => ({ html: o, lang: "en", correct: o === d.en })),
    reveal: () => {},
    feedback: () => drillFeedback(d),
    review: `<span lang="ja" style="--c:${c}">${drillSentence(d)}</span><span class="muted">${d.en}</span>`,
  };
}

// Show the English, pick the one full sentence that says it. The wrong ones swap in the wrong answers.
function sentenceQ(d) {
  const c = ROLES[d.point.role].color;
  return {
    kind: "Which sentence is right?",
    link: d.point.link,
    wide: true,
    prompt: `<div class="q-en-big">“${d.en}”</div>`,
    options: shuffle([d.answer, ...d.wrong]).map((o) => ({ html: ruby(d.before + o + d.after), correct: o === d.answer })),
    reveal: () => {},
    feedback: () => drillFeedback(d),
    review: `<span lang="ja" style="--c:${c}">${drillSentence(d)}</span><span class="muted">${d.en}</span>`,
  };
}

const isFormLink = (k) => k && ((k.tab === "verbs" && k.form !== "dict") || k.tab === "patterns");

function formQ(link) {
  const q = link.tab === "verbs" ? makeVerbQ(link.form) : makePatternQ(link.id);
  const right = q.options.find((o) => o.correct);
  return {
    ...q,
    kind: link.tab === "verbs" ? "Build the verb form" : "Build the pattern",
    review: `<span class="lt-form">${q.prompt.replace(/<details class="q-hint">.*?<\/details>/s, "")}</span>
      <span lang="ja">→ <b>${right.html}</b></span>`,
  };
}

// Draw one question into `box`. `done(ok, button)` runs once an answer is picked.
function askIn(box, q, done) {
  box.innerHTML = `
    <div class="q-kind">${q.kind}</div>
    <div class="q-prompt">${q.prompt}</div>
    <div class="q-opts${q.wide ? " wide" : ""}">
      ${q.options.map((o, i) => `<button class="q-opt" data-i="${i}" lang="${o.lang || "ja"}"><span class="q-key" aria-hidden="true">${i + 1}</span>${o.html}</button>`).join("")}
    </div>
    <div class="q-feedback"></div>`;
  keyQuiz = box;
  $$(".q-opt", box).forEach((b) => (b.onclick = () => {
    const i = +b.dataset.i;
    const ok = q.options[i].correct;
    $$(".q-opt", box).forEach((x, j) => {
      x.disabled = true;
      if (q.options[j].correct) x.classList.add("right");
      else if (j === i) x.classList.add("wrong");
    });
    q.reveal(box);
    openHints(box);
    $(".q-feedback", box).innerHTML =
      `<div class="verdict ${ok ? "ok" : "bad"}">${ok ? "Correct!" : "Not quite."}</div>${q.feedback(q.options[i])}`;
    const see = $("[data-see]", box);
    if (see) see.onclick = () => goTo(q.link);
    done(ok, b);
  }));
}

const progressDots = (t) => t.qs.map((_, j) => {
  const r = t.results[j];
  return `<span class="lt-dot${r === undefined ? (j === t.i ? " now" : "") : r ? " ok" : " bad"}"></span>`;
}).join("");

const lessonPractice = { deck: [], score: 0, total: 0, streak: 0 };

function startLessonPractice(l) {
  Object.assign(lessonPractice, { deck: [], score: 0, total: 0, streak: 0 });
  $("#lpCombo").hidden = true;
  $("#lpNext").onclick = () => nextLessonPractice(l);
  nextLessonPractice(l);
}

function nextLessonPractice(l) {
  const lp = lessonPractice;
  const drills = lessonDrills(l);
  const forms = lessonForms(l);
  // Deal sentences from a shuffled deck so each one comes up before any repeats.
  if (!lp.deck.length) lp.deck = shuffle(drills.map((_, i) => i));
  const r = Math.random();
  let q;
  if (forms.length && r < 0.2) q = formQ(pick(forms));
  else {
    const d = drills[lp.deck.pop()];
    q = r < 0.4 ? meaningQ(d, drills) : gapQ(d);
  }
  $("#lpNext").hidden = true;
  askIn($("#lpQ"), q, (ok, b) => {
    lp.total++;
    if (ok) { lp.score++; lp.streak++; } else lp.streak = 0;
    // From COMBO_AT right in a row, every answer is worth double.
    const combo = lp.streak >= COMBO_AT;
    if (ok) addXP(combo ? XP.combo : XP.practice, b);
    $("#lpScore").textContent = `${lp.score} / ${lp.total}`;
    $("#lpStreak").textContent = lp.streak;
    $("#lpCombo").hidden = !combo;
    if (ok && lp.streak === COMBO_AT) toast(`<b>Combo!</b> ${COMBO_AT} right in a row — double XP until you miss one`);
    $("#lpNext").hidden = false;
    $("#lpNext").focus({ preventScroll: true });
  });
}

// 7 gap-fills, 2 meaning questions and 1 verb-form question (another sentence if the lesson has no forms).
function buildTest(l) {
  const drills = lessonDrills(l);
  const ds = shuffle(drills.slice());
  const forms = lessonForms(l);
  const qs = [...ds.slice(0, 7).map(gapQ), ...ds.slice(7, 9).map((d) => meaningQ(d, drills))];
  if (forms.length) qs.push(formQ(pick(forms)));
  else qs.push(ds[9] ? gapQ(ds[9]) : meaningQ(ds[0], drills));
  return shuffle(qs);
}

function showTestIntro(l) {
  const best = lessonState.tests[l.n];
  $("#lTest").innerHTML = `
    <div class="lt-intro">
      <div class="lt-seal${lessonPassed(l.n) ? " pass" : ""}" lang="ja">${lessonPassed(l.n) ? "合格" : "試験"}</div>
      <div>
        <p>Ten questions on the grammar of lesson ${l.n}: fill the gap, pick the meaning${lessonForms(l).length ? ", build the verb form" : ""}.
        Score <b>${PASS_MARK} / ${TEST_LEN}</b> or more and the lesson turns green on your path.</p>
        <p class="small muted">${best === undefined ? "Not taken yet." : `Best score so far: ${best} / ${TEST_LEN}.`}</p>
        <button class="btn primary" id="ltStart">${best === undefined ? "Start the test" : "Take the test again"}</button>
      </div>
    </div>`;
  $("#ltStart").onclick = () => runTest(l, { qs: buildTest(l), i: 0, results: [] });
}

function runTest(l, t) {
  const box = $("#lTest");
  box.innerHTML = `
    <div class="lt-top">
      <span class="small"><b>Question ${t.i + 1}</b> of ${t.qs.length}</span>
      <div class="lt-dots">${progressDots(t)}</div>
    </div>
    <div id="ltQ"></div>
    <div class="q-actions"><button class="btn primary" id="ltNext" hidden>${t.i + 1 < t.qs.length ? "Next question →" : "See my result →"}</button></div>`;
  askIn($("#ltQ"), t.qs[t.i], (ok, b) => {
    t.results[t.i] = ok;
    if (ok) addXP(XP.test, b);
    $(".lt-dots", box).innerHTML = progressDots(t);
    $("#ltNext").hidden = false;
    $("#ltNext").focus({ preventScroll: true });
  });
  $("#ltNext").onclick = () => {
    t.i++;
    if (t.i < t.qs.length) runTest(l, t);
    else finishTest(l, t);
    const top = box.getBoundingClientRect().top;
    if (top < 0) scrollBelowBar(box);
  };
}

function finishTest(l, t) {
  const score = t.results.filter(Boolean).length;
  const passed = score >= PASS_MARK;
  const wasPassed = lessonPassed(l.n);
  if (score > (lessonState.tests[l.n] ?? -1)) {
    lessonState.tests[l.n] = score;
    store.set("lessonTests", lessonState.tests);
  }
  renderLessonStatus(l);
  updateLessonPath();

  const next = LESSONS.find((x) => x.n === l.n + 1);
  const missed = t.qs.filter((_, j) => !t.results[j]);
  const bonus = passed ? (wasPassed ? XP.repass : XP.pass) : 0;
  $("#lTest").innerHTML = `
    <div class="lt-result ${passed ? "pass" : "fail"}">
      <div class="lt-seal${passed ? " pass stamp" : ""}" lang="ja">${passed ? "合格" : "もう少し"}</div>
      <div>
        <div class="lt-score"><b>${score}</b> / ${t.qs.length}${bonus ? ` <span class="xp-chip">+${bonus} XP bonus</span>` : ""}</div>
        <h3>${passed ? (wasPassed ? "Passed again!" : `Lesson ${l.n} finished!`) : "Not quite there yet"}</h3>
        <p>${passed
          ? `<span lang="ja">合格</span> (gōkaku) means “passed”. ${next ? "On to the next lesson whenever you're ready." : "That was the last lesson — おめでとう!"}`
          : `You need ${PASS_MARK} to pass. Practise the sentences above a little more, then try again — the questions change every time.`}</p>
      </div>
    </div>
    ${missed.length ? `
      <div class="lt-review">
        <div class="small muted">Correct answers to the ones you missed</div>
        <ul>${missed.map((q) => `<li>${q.review}</li>`).join("")}</ul>
      </div>` : ""}
    <div class="q-actions lt-actions">
      <button class="btn" id="ltRetry">Try again</button>
      ${passed && next ? `<button class="btn primary" id="ltNextLesson">Lesson ${next.n}: ${next.title} ›</button>` : ""}
    </div>`;
  $("#ltRetry").onclick = () => runTest(l, { qs: buildTest(l), i: 0, results: [] });
  const go = $("#ltNextLesson");
  if (go) go.onclick = () => showLesson(next.n, true);
  if (bonus) addXP(bonus, $("#lTest .lt-score b"));
  if (passed) burst($("#lTest .lt-seal"));
}

/* ------------------------------------------- Point checks: 5 questions on one grammar point */

// Five of the point's own sentences: three gap-fills, one meaning, one "which sentence is right?".
// Points that teach a verb form or pattern swap one gap-fill for a build-the-form question.
function buildCheck(l, i) {
  const all = lessonDrills(l);
  const mine = shuffle(all.filter((d) => d.point === l.points[i]));
  const kinds = [gapQ, gapQ, (d) => meaningQ(d, all), sentenceQ, gapQ];
  const qs = mine.slice(0, CHECK_LEN).map((d, j) => kinds[j](d));
  if (isFormLink(l.points[i].link)) qs[CHECK_LEN - 1] = formQ(l.points[i].link);
  return shuffle(qs);
}

function drawPointStars(l, i) {
  const s = pointStars(l.n, i);
  const card = $(`#lp-${i}`);
  card.classList.toggle("mastered", s === 3);
  const btn = $("[data-check]", card);
  btn.innerHTML = `${starsHTML(s)} ${s ? "Check again" : "Check it"} · ${CHECK_LEN} questions`;
  btn.hidden = !$(".lp-check", card).hidden;
}

function openCheck(l, i) {
  // One check open at a time.
  l.points.forEach((_, j) => { if (j !== i) closeCheck(l, j); });
  const card = $(`#lp-${i}`);
  $(".lp-check", card).hidden = false;
  drawPointStars(l, i);
  runCheck(l, i, { qs: buildCheck(l, i), i: 0, results: [] });
  scrollBelowBar(card);
}

function closeCheck(l, i) {
  const box = $(`#lp-${i} .lp-check`);
  if (box.hidden) return;
  box.hidden = true;
  box.innerHTML = "";
  drawPointStars(l, i);
}

function runCheck(l, i, t) {
  const box = $(`#lp-${i} .lp-check`);
  box.innerHTML = `
    <div class="lt-top">
      <span class="small"><b>Check · question ${t.i + 1}</b> of ${t.qs.length}</span>
      <div class="lt-dots">${progressDots(t)}</div>
      <button class="icon-btn lp-close" aria-label="Close the check">✕</button>
    </div>
    <div class="lp-q"></div>
    <div class="q-actions"><button class="btn primary" hidden>${t.i + 1 < t.qs.length ? "Next question →" : "See my stars →"}</button></div>`;
  $(".lp-close", box).onclick = () => closeCheck(l, i);
  const next = $(".q-actions .btn", box);
  askIn($(".lp-q", box), t.qs[t.i], (ok, b) => {
    t.results[t.i] = ok;
    if (ok) addXP(XP.check, b);
    $(".lt-dots", box).innerHTML = progressDots(t);
    next.hidden = false;
    next.focus({ preventScroll: true });
  });
  next.onclick = () => {
    t.i++;
    if (t.i < t.qs.length) runCheck(l, i, t);
    else finishCheck(l, i, t);
    if (box.getBoundingClientRect().top < 0) scrollBelowBar(box.parentElement);
  };
}

const CHECK_WORDS = ["Keep going — try it again!", "One star — getting there.", "Two stars — nearly perfect!", "Three stars — perfect!"];

function finishCheck(l, i, t) {
  const score = t.results.filter(Boolean).length;
  const stars = score >= 5 ? 3 : score === 4 ? 2 : score === 3 ? 1 : 0;
  const old = pointStars(l.n, i);
  const gained = Math.max(stars - old, 0);
  if (gained) {
    lessonState.stars[`${l.n}.${i}`] = stars;
    store.set("pointStars", lessonState.stars);
  }
  const nextPoint = l.points.findIndex((_, j) => j > i && pointStars(l.n, j) < 3);
  const missed = t.qs.filter((_, j) => !t.results[j]);
  const box = $(`#lp-${i} .lp-check`);
  box.innerHTML = `
    <div class="lc-result">
      <div class="lc-stars">${starsHTML(stars)}</div>
      <div>
        <div class="lt-score"><b>${score}</b> / ${t.qs.length}${gained ? ` <span class="xp-chip">+${gained * XP.star} XP · new star${gained > 1 ? "s" : ""}!</span>` : ""}</div>
        <p>${CHECK_WORDS[stars]}${old > stars ? ` <span class="muted">(Your best is still ${old} ★.)</span>` : ""}</p>
      </div>
    </div>
    ${missed.length ? `
      <div class="lt-review">
        <div class="small muted">Correct answers to the ones you missed</div>
        <ul>${missed.map((q) => `<li>${q.review}</li>`).join("")}</ul>
      </div>` : ""}
    <div class="q-actions lt-actions">
      <button class="btn" data-a="again">Try again</button>
      ${nextPoint >= 0
        ? `<button class="btn primary" data-a="next">Next point: <span lang="ja">${l.points[nextPoint].g}</span> ›</button>`
        : `<button class="btn primary" data-a="test">On to the lesson test ↓</button>`}
    </div>`;
  $("[data-a=again]", box).onclick = () => runCheck(l, i, { qs: buildCheck(l, i), i: 0, results: [] });
  $("[data-a=next], [data-a=test]", box).onclick = (e) => {
    if (e.currentTarget.dataset.a === "next") openCheck(l, nextPoint);
    else { closeCheck(l, i); scrollBelowBar($("#lTest").previousElementSibling); }
  };
  // Light up the stars one after another.
  $$(".lc-stars .star.on", box).forEach((s, j) => s.style.setProperty("--d", `${j * 0.18}s`));
  renderLessonStatus(l);
  updateLessonPath();
  if (gained) addXP(gained * XP.star, $(".lc-stars", box));
  if (stars === 3) burst($(".lc-stars", box));
}
