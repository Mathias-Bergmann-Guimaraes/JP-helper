// "Your mistakes": sentences the chatbot marked ✗, with its correction, kept per grammar point.
// They're saved when an answer is pasted into a writing box, listed on the lesson page with the
// difference highlighted, and come back as questions in the point's check (and in practice)
// until they're answered right twice. Loaded after lesson-write.js and uses its helpers.

// { "lesson.point": [{ w: what you wrote, r: the correction, en: English, n: right answers since }] },
// newest first. Saved per account. A point whose last mistake was removed keeps an empty list,
// so the server hears about the removal.
const mistakes = store.get("mistakes", {});
const MISTAKES_PER_POINT = 10;
const LEARNED_AT = 2;
const MISTAKE_XP = 10;
const mistakeRound = { on: false };
// Which version of the answer reader last read each point's pasted answer (this browser only).
// When the reader learns a new layout, saved answers are read again once.
const mistakesRead = store.get("mistakesRead", {});
const CORRECTIONS_VERSION = 2;
const needsReading = (key) => (mistakesRead[key] || 0) < CORRECTIONS_VERSION;

const isLearned = (m) => m.n >= LEARNED_AT;
const lessonMistakes = (l) => l.points.flatMap((_, i) => (mistakes[`${l.n}.${i}`] || []).map((m) => ({ i, m })));

function saveMistakes(l) {
  store.set("mistakes", mistakes);
  // A daily roulette question can belong to a lesson other than the one on screen.
  if (!mistakeRound.on && l.n === lessonState.n) renderMistakes(l);
}

/* ---------------------------------------------------------------- Saving them from an answer */

const END_PUNCT = /[。．.!！?？]+$/;

// The correction ends the way the sentence did, so a missing 。 doesn't show up as a mistake.
const matchEnd = (w, r) => r.replace(END_PUNCT, "") + ((w.match(END_PUNCT) || [""])[0]);

// Read the ✗ sentences out of the chatbot's answer for point i. Mistakes from older sets of
// sentences stay; those of the current set are redone from this answer (keeping any progress on
// one that didn't change). Returns how many the current set has now. `corrections` is for an answer
// that also covers sentences of other points: only those of this point, numbered within `mine`.
function saveCorrections(l, i, text, mine, corrections = aiCorrections(text)) {
  const key = `${l.n}.${i}`;
  const list = mistakes[key] || [];
  const old = list.filter((m) => mine.includes(m.w));
  const found = [];
  for (const c of corrections) {
    // The sentence as it was typed: the chatbot may have added furigana or punctuation.
    const w = mine.find((s) => normJa(s) === normJa(c.text)) || mine[c.n - 1] || c.text;
    const r = matchEnd(w, c.right);
    if (normJa(w) === normJa(r) || w.length > 200 || r.length > 200 || found.some((m) => m.w === w)) continue;
    const before = old.find((m) => m.w === w && m.r === r);
    found.push({ w, r, ...(c.en ? { en: c.en.slice(0, 200) } : {}), n: before ? before.n : 0 });
  }
  mistakesRead[key] = CORRECTIONS_VERSION;
  store.set("mistakesRead", mistakesRead);
  const next = [...found, ...list.filter((m) => !mine.includes(m.w))].slice(0, MISTAKES_PER_POINT);
  if (JSON.stringify(next) !== JSON.stringify(list) || !(key in mistakes)) {
    mistakes[key] = next;
    saveMistakes(l);
  }
  return found.length;
}

// Answers pasted before the reader knew their layout, read again when the lesson opens.
function readSavedAnswers(l) {
  l.points.forEach((_, i) => {
    const key = `${l.n}.${i}`;
    if (feedback[key] && written[key] && needsReading(key)) saveCorrections(l, i, feedback[key], written[key]);
  });
}

/* ---------------------------------------------------------------- Showing the difference */

// A character diff of two sentences: [{ same }] and [{ del, ins }] parts, in order.
function diffJa(a, b) {
  const A = Array.from(a);
  const B = Array.from(b);
  const T = Array.from({ length: A.length + 1 }, () => new Uint16Array(B.length + 1));
  for (let i = A.length - 1; i >= 0; i--) {
    for (let j = B.length - 1; j >= 0; j--) {
      T[i][j] = A[i] === B[j] ? T[i + 1][j + 1] + 1 : Math.max(T[i + 1][j], T[i][j + 1]);
    }
  }
  const parts = [];
  const add = (kind, c) => {
    const last = parts[parts.length - 1];
    if (kind === "same") {
      if (last && "same" in last) last.same += c;
      else parts.push({ same: c });
    } else {
      const p = last && !("same" in last) ? last : (parts.push({ del: "", ins: "" }), parts[parts.length - 1]);
      p[kind] += c;
    }
  };
  let i = 0;
  let j = 0;
  while (i < A.length || j < B.length) {
    if (i < A.length && j < B.length && A[i] === B[j]) { add("same", A[i]); i++; j++; }
    else if (j >= B.length || (i < A.length && T[i + 1][j] >= T[i][j + 1])) add("del", A[i++]);
    else add("ins", B[j++]);
  }
  // A single matching character between two changes reads better as part of one change.
  for (let k = 1; k < parts.length - 1; k++) {
    const p = parts[k];
    if ("same" in p && Array.from(p.same).length === 1 && !("same" in parts[k - 1]) && !("same" in parts[k + 1])) {
      const a = parts[k - 1];
      const b = parts[k + 1];
      parts.splice(k - 1, 3, { del: a.del + p.same + b.del, ins: a.ins + p.same + b.ins });
      k--;
    }
  }
  return parts;
}

// One side of the diff: what you wrote with the wrong parts struck out (and a mark where
// something is missing), or the correction with the new parts underlined.
function diffSide(parts, side) {
  return parts.map((p) => {
    if ("same" in p) return escHTML(p.same);
    if (side === "w") return p.del ? `<del>${escHTML(p.del)}</del>` : '<span class="lm-miss" title="Something is missing here" aria-label="(something missing)"></span>';
    return p.ins ? `<ins>${escHTML(p.ins)}</ins>` : "";
  }).join("");
}

const diffChips = (parts) => parts.filter((p) => !("same" in p)).slice(0, 4).map((p) =>
  `<span class="lm-change" lang="ja">${p.del && p.ins
    ? `<del>${escHTML(p.del)}</del> → <ins>${escHTML(p.ins)}</ins>`
    : p.ins ? `add <ins>${escHTML(p.ins)}</ins>` : `drop <del>${escHTML(p.del)}</del>`}</span>`).join("");

function mistakePairHTML(m) {
  const parts = diffJa(m.w, m.r);
  return `<div class="lm-pair">
    <div class="lm-row bad"><span class="lm-tag">✗ You wrote</span><span class="lm-sent" lang="ja">${diffSide(parts, "w")}</span></div>
    <div class="lm-row ok"><span class="lm-tag">✓ Correct</span><span class="lm-sent" lang="ja">${diffSide(parts, "r")}</span></div>
  </div>
  ${m.en ? `<div class="lm-en">${escHTML(m.en)}</div>` : ""}
  <div class="lm-changes">${diffChips(parts)}</div>`;
}

/* ---------------------------------------------------------------- Questions from them */

// A mistake to ask about: one of point i's (any point's if i is undefined) that isn't learned
// yet, the least practised first. Returns { i, m } or null.
function pickMistake(l, i) {
  const open = lessonMistakes(l).filter((x) => (i === undefined || x.i === i) && !isLearned(x.m));
  if (!open.length) return null;
  const least = Math.min(...open.map((x) => x.m.n));
  return pick(open.filter((x) => x.m.n === least));
}

function mistakeQ(l, i, m) {
  const p = l.points[i];
  let after = m.n;
  return {
    kind: "Your own sentence",
    link: p.link,
    wide: true,
    prompt: `${m.en ? `<div class="q-en-big">“${escHTML(m.en)}”</div>` : ""}
      <p class="small muted lm-q-note">You wrote one of these, and your chatbot corrected it. Which one is right?</p>`,
    options: shuffle([{ html: escHTML(m.r), correct: true }, { html: escHTML(m.w), correct: false }]),
    answered: (ok) => { after = markMistake(l, i, m, ok); },
    reveal: () => {},
    feedback: () => `<div class="fb-drill lm-fb" style="--c:${ROLES[p.role].color}">
      ${mistakePairHTML(m)}
      <div class="fb-point"><b lang="ja">${p.g}</b> — ${p.m}</div>
      <p class="small muted">${after >= LEARNED_AT ? "✓ Learned — it won't come back in the checks." : after
        ? `Right ${after} of ${LEARNED_AT} times — once more and it's learned.`
        : "It'll come back until you pick the right one twice."}</p>
      ${p.link ? `<button class="lp-link" data-see>See it → ${linkLabel(p.link)}</button>` : ""}
    </div>`,
    review: `<span lang="ja">${escHTML(m.r)}</span><span class="muted">not <span lang="ja">${escHTML(m.w)}</span></span>`,
  };
}

// Count a right answer (or start again after a wrong one). Returns the new count.
function markMistake(l, i, m, ok) {
  const saved = (mistakes[`${l.n}.${i}`] || []).find((x) => x.w === m.w && x.r === m.r);
  if (!saved) return ok ? m.n + 1 : 0;
  const was = isLearned(saved);
  saved.n = ok ? Math.min(saved.n + 1, 99) : 0;
  saveMistakes(l);
  if (!was && isLearned(saved)) {
    toast(`<b>Mistake fixed!</b> +${MISTAKE_XP} XP · <span lang="ja">${escHTML(saved.r)}</span>`);
    addXP(MISTAKE_XP);
  }
  return saved.n;
}

/* ---------------------------------------------------------------- The list on the lesson page */

function renderMistakes(l) {
  const box = $("#lMistakes");
  if (!box) return;
  const all = lessonMistakes(l);
  if (!all.length) { box.innerHTML = ""; return; }
  const open = all.filter((x) => !isLearned(x.m)).length;
  const item = (i, m, k) => `
    <div class="lm-item${isLearned(m) ? " learned" : ""}">
      ${mistakePairHTML(m)}
      <div class="lm-foot">
        <span class="lm-progress">${isLearned(m) ? "✓ Learned" : `Picked right <b>${m.n}</b> / ${LEARNED_AT}`}</span>
        <button class="icon-btn lm-del" data-del="${i}.${k}" aria-label="Remove this mistake" title="Remove">✕</button>
      </div>
    </div>`;
  box.innerHTML = `
    <div class="lsection">
      <h3>Your mistakes</h3>
      <p class="small muted">Sentences your chatbot corrected, next to the fixed version. Each one comes back in its
        point's check until you pick the right version twice.</p>
    </div>
    <div class="card lm-card">
      <div class="lm-bar">
        <span><b>${all.length}</b> mistake${all.length > 1 ? "s" : ""} · <b>${all.length - open}</b> learned</span>
        ${open ? `<button class="btn primary lm-practise">Practise ${open === 1 ? "it" : `these ${open}`} now</button>` : ""}
      </div>
      <div class="lm-quiz" hidden></div>
      <div class="lm-list">
        ${l.points.map((p, i) => {
          const list = mistakes[`${l.n}.${i}`] || [];
          return list.length ? `
            <div class="lm-group" style="--c:${ROLES[p.role].color}">
              <div class="lm-point"><span class="lm-pnum">${i + 1}</span><span lang="ja">${p.g}</span>
                <span class="small muted">${p.m}</span></div>
              ${list.map((m, k) => item(i, m, k)).join("")}
            </div>` : "";
        }).join("")}
      </div>
    </div>`;
  $$("[data-del]", box).forEach((b) => (b.onclick = () => {
    const [i, k] = b.dataset.del.split(".").map(Number);
    mistakes[`${l.n}.${i}`].splice(k, 1);
    saveMistakes(l);
    if ($(`#lp-${i} .lp-write`) && !$(`#lp-${i} .lp-write`).hidden) drawSavedNote(l, i);
  }));
  const go = $(".lm-practise", box);
  if (go) go.onclick = () => startMistakeRound(l);
}

// Every mistake not learned yet, one question each.
function startMistakeRound(l) {
  const qs = shuffle(lessonMistakes(l).filter((x) => !isLearned(x.m))).slice(0, 10).map((x) => mistakeQ(l, x.i, x.m));
  if (!qs.length) return;
  mistakeRound.on = true;
  $("#lMistakes .lm-list").hidden = true;
  $("#lMistakes .lm-bar").hidden = true;
  const box = $("#lMistakes .lm-quiz");
  box.hidden = false;
  runMistakeRound(l, box, { qs, i: 0, results: [] });
  scrollBelowBar($("#lMistakes"));
}

function runMistakeRound(l, box, t) {
  box.innerHTML = `
    <div class="lt-top">
      <span class="small"><b>Your mistakes · question ${t.i + 1}</b> of ${t.qs.length}</span>
      <div class="lt-dots">${progressDots(t)}</div>
      <button class="icon-btn lp-close" aria-label="Stop">✕</button>
    </div>
    <div class="lp-q"></div>
    <div class="q-actions"><button class="btn primary" hidden>${t.i + 1 < t.qs.length ? "Next question →" : "Done"}</button></div>`;
  const stop = () => { mistakeRound.on = false; renderMistakes(l); };
  $(".lp-close", box).onclick = stop;
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
    if (t.i < t.qs.length) runMistakeRound(l, box, t);
    else {
      stop();
      const right = t.results.filter(Boolean).length;
      toast(`<b>${right} / ${t.qs.length}</b> of your own sentences right`);
    }
    if ($("#lMistakes").getBoundingClientRect().top < 0) scrollBelowBar($("#lMistakes"));
  };
}

/* ---------------------------------------------------------------- In the writing box */

// "2 corrections saved to Your mistakes" under the pasted answer.
function drawSavedNote(l, i) {
  const note = $(`#lp-${i} .lw-saved`);
  if (!note) return;
  const mine = written[`${l.n}.${i}`] || [];
  const count = (mistakes[`${l.n}.${i}`] || []).filter((m) => mine.includes(m.w)).length;
  note.hidden = !count;
  note.innerHTML = count ? `📒 ${count === 1 ? "1 correction" : `${count} corrections`} saved to
    <button class="linkish lw-to-mistakes">Your mistakes</button> — ${count === 1 ? "it comes" : "they come"} back in this point's check.` : "";
  const to = $(".lw-to-mistakes", note);
  if (to) to.onclick = () => scrollBelowBar($("#lMistakes"));
}
