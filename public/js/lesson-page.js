// The Lessons tab: lesson list, AI study prompts, practice and tests. Only sent to browsers with approved access
// (see server.js); loaded after app.js and uses its helpers.

/* ---------------------------------------------------------------- Lessons (Minna no Nihongo order) */

// tests: best test score per lesson. A lesson counts as finished once its test is passed.
const lessonState = { n: store.get("lesson", 1), tests: store.get("lessonTests", {}) };
const TEST_LEN = 10;
const PASS_MARK = 8;
const lessonPassed = (n) => (lessonState.tests[n] || 0) >= PASS_MARK;

function renderLessons() {
  const node = (l) => `<button class="lnode" data-l="${l.n}"><span class="lnum">${l.n}</span><span class="ltitle">${l.title}</span></button>`;
  $("#lessons").innerHTML = `
    <div class="card hero">
      <h1>Grammar in <span class="accent">Minna no Nihongo</span> order</h1>
      <p>All 50 lessons of <span lang="ja">みんなの日本語 初級 Ⅰ・Ⅱ</span>, one after another. Each grammar point comes with an example,
      and <b>See it →</b> jumps to the picture that explains it. Practise at the bottom of each lesson,
      then pass the lesson test to finish it.</p>
      <div class="progress">
        <div class="progress-bar"><span id="lProgressBar"></span></div>
        <span id="lProgressText" class="small muted"></span>
      </div>
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
        <div class="lpoint" style="--c:${ROLES[p.role].color}">
          <div class="lp-num">${i + 1}</div>
          <div>
            <div class="lp-g" lang="ja">${p.g}</div>
            <div class="lp-m">${p.m}</div>
            <div class="lp-ex" lang="ja">${rich(p.ex)}</div>
            <div class="lp-en">${p.en}</div>
            ${p.link ? `<button class="lp-link" data-p="${i}">See it → ${linkLabel(p.link)}</button>` : ""}
          </div>
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
  $$("[data-go]", d).forEach((b) => (b.onclick = () => showLesson(+b.dataset.go, true)));
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
    b.classList.toggle("active", n === lessonState.n);
    b.classList.toggle("done", lessonPassed(n));
  });
  const count = LESSONS.filter((l) => lessonPassed(l.n)).length;
  $("#lProgressBar").style.width = `${(count / LESSONS.length) * 100}%`;
  $("#lProgressText").textContent = `${count} / ${LESSONS.length} lessons finished`;

  // Keep the selected lesson visible inside the scrollable lesson list.
  const path = $(".lpath");
  const node = $(`#lessons [data-l="${lessonState.n}"]`);
  if (path.scrollHeight > path.clientHeight &&
      (node.offsetTop < path.scrollTop || node.offsetTop > path.scrollTop + path.clientHeight - 40)) {
    path.scrollTop = node.offsetTop - path.clientHeight / 2;
  }
}

function renderLessonStatus(l) {
  const best = lessonState.tests[l.n];
  $("#lessonStatus").innerHTML = lessonPassed(l.n)
    ? `<span class="lstatus done">✓ Lesson finished · best test score ${best} / ${TEST_LEN}</span>`
    : `<button class="lstatus" id="toTest">${best === undefined
        ? `Finish with the lesson test ↓`
        : `Best test score ${best} / ${TEST_LEN} · need ${PASS_MARK} to finish ↓`}</button>`;
  const btn = $("#toTest");
  if (btn) btn.onclick = () => scrollBelowBar($("#lTest").previousElementSibling);
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
  const links = l.points.map((p) => p.link)
    .filter((k) => k && ((k.tab === "verbs" && k.form !== "dict") || k.tab === "patterns"));
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
      <div class="q-en">${d.en}</div>`,
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

function formQ(link) {
  const q = link.tab === "verbs" ? makeVerbQ(link.form) : makePatternQ(link.id);
  const right = q.options.find((o) => o.correct);
  return {
    ...q,
    kind: link.tab === "verbs" ? "Build the verb form" : "Build the pattern",
    review: `<span class="lt-form">${q.prompt.replace(/<div class="q-en">.*?<\/div>/s, "")}</span>
      <span lang="ja">→ <b>${right.html}</b></span>`,
  };
}

// Draw one question into `box`. `done(ok)` runs once an answer is picked.
function askIn(box, q, done) {
  box.innerHTML = `
    <div class="q-kind">${q.kind}</div>
    <div class="q-prompt">${q.prompt}</div>
    <div class="q-opts${q.wide ? " wide" : ""}">
      ${q.options.map((o, i) => `<button class="q-opt" data-i="${i}" lang="${o.lang || "ja"}">${o.html}</button>`).join("")}
    </div>
    <div class="q-feedback"></div>`;
  $$(".q-opt", box).forEach((b) => (b.onclick = () => {
    const i = +b.dataset.i;
    const ok = q.options[i].correct;
    $$(".q-opt", box).forEach((x, j) => {
      x.disabled = true;
      if (q.options[j].correct) x.classList.add("right");
      else if (j === i) x.classList.add("wrong");
    });
    q.reveal(box);
    $(".q-feedback", box).innerHTML =
      `<div class="verdict ${ok ? "ok" : "bad"}">${ok ? "Correct!" : "Not quite."}</div>${q.feedback(q.options[i])}`;
    const see = $("[data-see]", box);
    if (see) see.onclick = () => goTo(q.link);
    done(ok);
  }));
}

const lessonPractice = { deck: [], score: 0, total: 0, streak: 0 };

function startLessonPractice(l) {
  Object.assign(lessonPractice, { deck: [], score: 0, total: 0, streak: 0 });
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
  askIn($("#lpQ"), q, (ok) => {
    lp.total++;
    if (ok) { lp.score++; lp.streak++; } else lp.streak = 0;
    $("#lpScore").textContent = `${lp.score} / ${lp.total}`;
    $("#lpStreak").textContent = lp.streak;
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
  const dots = () => t.qs.map((_, j) => {
    const r = t.results[j];
    return `<span class="lt-dot${r === undefined ? (j === t.i ? " now" : "") : r ? " ok" : " bad"}"></span>`;
  }).join("");
  box.innerHTML = `
    <div class="lt-top">
      <span class="small"><b>Question ${t.i + 1}</b> of ${t.qs.length}</span>
      <div class="lt-dots">${dots()}</div>
    </div>
    <div id="ltQ"></div>
    <div class="q-actions"><button class="btn primary" id="ltNext" hidden>${t.i + 1 < t.qs.length ? "Next question →" : "See my result →"}</button></div>`;
  askIn($("#ltQ"), t.qs[t.i], (ok) => {
    t.results[t.i] = ok;
    $(".lt-dots", box).innerHTML = dots();
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
  $("#lTest").innerHTML = `
    <div class="lt-result ${passed ? "pass" : "fail"}">
      <div class="lt-seal${passed ? " pass stamp" : ""}" lang="ja">${passed ? "合格" : "もう少し"}</div>
      <div>
        <div class="lt-score"><b>${score}</b> / ${t.qs.length}</div>
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
}
