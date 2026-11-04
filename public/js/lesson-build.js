// The sentence builder on the lesson page: read the English, tap the shuffled colour blocks into
// Japanese order. Sentences are in builds.js. Loaded after lesson-page.js and uses its helpers.

const BUILD_ROLES = { ...ROLES, clause: { label: "Linked clause", color: "var(--muted)" } };

// "~word+particle:role" → a block. text is what it reads as, used to compare answers, so two
// identical blocks can't count as being in the wrong place.
function parseBlock(s, i) {
  const [, free, w, p = "", role] = s.match(/^(~?)(.+?)(?:\+(.+))?:(\w+)$/);
  return { id: i, free: !!free, w, p, role, text: w + p };
}

const parseBuild = (l, [point, en, blocks]) => ({ i: point, point: l.points[point], en, blocks: blocks.split(" ").map(parseBlock) });
const lessonBuilds = (l) => (BUILDS[l.n] || []).map((b) => parseBuild(l, b));

// Which placed blocks are wrong: a fixed block has to be exactly where it belongs, and the spots
// of the ~ blocks can hold any of the ~ blocks.
const wrongSpots = (b, placed) => placed.map((x, i) => {
  const want = b.blocks[i];
  return want.free ? !x.free : x.text !== want.text;
}).map((bad, i) => (bad ? i : -1)).filter((i) => i >= 0);

const sameOrder = (b, placed) => placed.every((x, i) => x.text === b.blocks[i].text);

const builtSentence = (b, blocks = b.blocks) => {
  const s = blocks.map((x) => x.text).join("");
  return ruby(s) + (s.endsWith("？") ? "" : "。");
};

function buildShuffled(b) {
  let order;
  let tries = 0;
  do { order = shuffle(b.blocks.slice()); } while (!wrongSpots(b, order).length && ++tries < 20);
  return order;
}

/* ---------------------------------------------------------------- Drawing */

// A block as a button: the same look as everywhere else on the site.
function blockBtn(x, wrong) {
  const r = BUILD_ROLES[x.role];
  return `<button type="button" class="chunk sb-block${wrong ? " wrong" : ""}" style="--c:${r.color}" data-b="${x.id}">
    <span class="chunk-jp" lang="ja"><span class="w">${ruby(x.w)}</span>${x.p ? `<span class="p">${x.p}</span>` : ""}</span>
    <span class="chunk-role">${r.label}</span>
  </button>`;
}

// mode: "blocks" or "text" (this browser's choice). tried: this sentence has been counted in the
// score. run: the round of free text sentences (see newTextRun).
const buildState = {
  l: null, deck: [], b: null, placed: [], bank: [], tried: false, done: false, wrong: [], score: 0, total: 0,
  mode: store.get("buildMode", "blocks"), run: null,
};

function startBuild(l) {
  Object.assign(buildState, { l, deck: [], score: 0, total: 0, run: null });
  if (lessonBuilds(l).length) nextBuild();
}

function nextBuild() {
  const s = buildState;
  const all = lessonBuilds(s.l);
  // Dealt from a shuffled deck, so each sentence comes up before any repeats.
  if (!s.deck.length) s.deck = shuffle(all.map((_, i) => i));
  const b = all[s.deck.pop()];
  Object.assign(s, { b, placed: [], bank: buildShuffled(b), tried: false, done: false, wrong: [] });
  drawBuild();
}

// The score bar and the switch between blocks and free text, the same in both modes.
function buildTop(left) {
  const s = buildState;
  const mode = (id, label) => `<button type="button" class="sb-mode${s.mode === id ? " on" : ""}" data-mode="${id}" aria-pressed="${s.mode === id}">${label}</button>`;
  return `
    <div class="scorebar sb-top">
      ${left}
      <span class="sb-modes" role="group" aria-label="How to answer">${mode("blocks", "Blocks")}${mode("text", "Free text · AI")}</span>
    </div>`;
}

function wireBuildTop(box) {
  const s = buildState;
  $$("[data-mode]", box).forEach((b) => (b.onclick = () => {
    if (b.dataset.mode === s.mode) return;
    s.mode = b.dataset.mode;
    store.set("buildMode", s.mode);
    // A finished block sentence has nothing left to show when coming back to it.
    if (s.mode === "blocks" && s.done) nextBuild();
    else drawBuild();
    focusBuildText();
  }));
}

const focusBuildText = () => { const t = $("#lBuild .sb-text"); if (t) t.focus({ preventScroll: true }); };

// One count per sentence in the score, and XP only if it's right the first time.
function countBuild(ok) {
  const s = buildState;
  if (s.tried) return;
  s.tried = true;
  s.total++;
  if (ok) s.score++;
  $("#lBuild .sb-score").textContent = `${s.score} / ${s.total}`;
  if (ok) addXP(XP.build, $("#lBuild .sb-score"));
}

function drawBuild() {
  const s = buildState;
  const box = $("#lBuild");
  box.classList.toggle("sb-live", s.mode === "blocks" && !s.done);
  if (s.mode === "text") return drawBuildText();
  const count = lessonBuilds(s.l).length;
  box.innerHTML = `
    ${buildTop(`<span>Sentence <b>${count - s.deck.length} / ${count}</b></span>
      <span>Right first time <b class="sb-score">${s.score} / ${s.total}</b></span>`)}
    <div class="q-kind">Build the sentence</div>
    <div class="q-en-big">“${s.b.en}”</div>
    <div class="row-label">Your sentence</div>
    <div class="chunks compact sb-row sb-answer" aria-label="Your sentence">
      ${s.placed.length ? s.placed.map((x, i) => blockBtn(x, s.wrong.includes(i))).join("") : '<span class="small muted sb-empty">Tap or drag the blocks below, in order.</span>'}
    </div>
    <div class="chunks compact sb-row sb-bank" aria-label="Blocks left">${s.bank.map((x) => blockBtn(x)).join("")}</div>
    <div id="sbMsg" class="q-feedback"></div>
    <div class="q-actions sb-actions">
      <button class="btn primary" id="sbCheck" ${s.bank.length || s.done ? "hidden" : ""}>Check</button>
      <button class="btn" id="sbShow" ${s.tried && !s.done ? "" : "hidden"}>Show the answer</button>
      <button class="btn primary" id="sbNext" ${s.done ? "" : "hidden"}>${s.deck.length ? "Next sentence →" : "Go round again →"}</button>
    </div>`;

  if (!s.done) {
    $$("[data-b]", box).forEach((el) => {
      const toPlaced = !!el.closest(".sb-bank");
      // A keyboard click has no detail, and is never the end of a drag.
      el.onclick = (e) => { if (!(blockDragged && e.detail)) moveBlock(+el.dataset.b, toPlaced); };
      el.onpointerdown = (e) => pressBlock(e, el);
    });
  }
  $("#sbCheck").onclick = checkBuild;
  $("#sbShow").onclick = showBuild;
  $("#sbNext").onclick = () => { nextBuild(); scrollIfAbove($("#lBuild")); };
  wireBuildTop(box);
}

// Moves a block into the sentence (at `index`, or the end) or back to the blocks left, and clears
// any red marks.
function moveBlock(id, toPlaced, index) {
  const s = buildState;
  const message = $("#sbMsg").innerHTML;
  const from = s.bank.some((x) => x.id === id) ? s.bank : s.placed;
  const [block] = from.splice(from.findIndex((x) => x.id === id), 1);
  if (toPlaced) s.placed.splice(index ?? s.placed.length, 0, block);
  else s.bank.push(block);
  const hadMarks = s.wrong.length;
  s.wrong = [];
  drawBuild();
  if (!hadMarks) $("#sbMsg").innerHTML = message;
  const next = $("#sbCheck:not([hidden])") || $(`.sb-block[data-b]`);
  if (next) next.focus({ preventScroll: true });
}

/* ---------------------------------------------------------------- Dragging */

const DRAG_FROM = 6; // pixels a press has to move before it's a drag and not a tap
const DROP_MARGIN = 16; // how far outside the sentence row still counts as dropping into it
let blockDragged = false; // the last press was a drag, so the click that ends it isn't a tap

// Where a block would land: { index } in the sentence, { out: true } back to the blocks left, or
// null to stay put. Blocks wrap onto new lines, so anything on a line above the pointer, or to its
// left on the same line, comes before it.
function dropTarget(x, y, id, fromBank) {
  const row = $("#lBuild .sb-answer");
  const box = row.getBoundingClientRect();
  if (y < box.top - DROP_MARGIN) return null;
  if (y > box.bottom + DROP_MARGIN) return fromBank ? null : { out: true };
  const others = $$("[data-b]", row).filter((el) => +el.dataset.b !== id).map((el) => el.getBoundingClientRect());
  const index = others.filter((r) => r.bottom < y || (r.top <= y && r.left + r.width / 2 < x)).length;
  return { index, others };
}

function showDropHint(target) {
  const row = $("#lBuild .sb-answer");
  const box = row.getBoundingClientRect();
  const marker = $(".sb-marker", row);
  const placing = target && !target.out;
  row.classList.toggle("sb-over", !!placing);
  $("#lBuild .sb-bank").classList.toggle("sb-over", !!(target && target.out));
  marker.hidden = !(placing && target.others.length);
  if (marker.hidden) return;
  const { index, others } = target;
  const near = others[Math.min(index, others.length - 1)];
  const left = index < others.length ? near.left - 7 : near.right + 4;
  marker.style.cssText = `left:${left - box.left - row.clientLeft}px;top:${near.top - box.top - row.clientTop}px;height:${near.height}px`;
}

function pressBlock(e, el) {
  blockDragged = false;
  if (e.button !== 0 || !e.isPrimary) return;
  const box = $("#lBuild");
  const id = +el.dataset.b;
  const fromBank = !!el.closest(".sb-bank");
  const start = el.getBoundingClientRect();
  const [startX, startY] = [e.clientX, e.clientY];
  let ghost = null;
  let target = null;

  const move = (ev) => {
    const [dx, dy] = [ev.clientX - startX, ev.clientY - startY];
    if (!ghost) {
      if (Math.hypot(dx, dy) < DRAG_FROM) return;
      blockDragged = true;
      // A copy follows the pointer, in the same row so it keeps the same size and furigana.
      ghost = el.cloneNode(true);
      ghost.removeAttribute("data-b");
      ghost.classList.add("sb-ghost");
      ghost.style.left = `${start.left}px`;
      ghost.style.top = `${start.top}px`;
      ghost.style.width = `${start.width}px`;
      el.parentElement.append(ghost);
      el.classList.add("sb-held");
      box.classList.add("sb-dragging");
      $(".sb-answer", box).insertAdjacentHTML("beforeend", '<span class="sb-marker" hidden></span>');
    }
    ghost.style.transform = `translate(${dx}px, ${dy}px)`;
    target = dropTarget(ev.clientX, ev.clientY, id, fromBank);
    showDropHint(target);
  };

  const finish = (drop) => {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", cancel);
    removeEventListener("keydown", key);
    if (!ghost) return;
    ghost.remove();
    el.classList.remove("sb-held");
    box.classList.remove("sb-dragging");
    showDropHint(null);
    $(".sb-marker", box).remove();
    if (drop && target) {
      if (target.out) moveBlock(id, false);
      else moveBlock(id, true, target.index);
    }
  };
  const up = () => finish(true);
  const cancel = () => finish(false);
  const key = (ev) => { if (ev.key === "Escape") finish(false); };

  // Keeps the moves coming to this block wherever the pointer goes.
  el.setPointerCapture(e.pointerId);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", cancel);
  addEventListener("keydown", key);
}

/* ---------------------------------------------------------------- Checking */

function checkBuild() {
  const s = buildState;
  const wrong = wrongSpots(s.b, s.placed);
  if (wrong.length) {
    countBuild(false);
    s.wrong = wrong;
    drawBuild();
    const last = s.b.blocks[s.b.blocks.length - 1];
    const verbLast = s.placed[s.placed.length - 1].text === last.text;
    $("#sbMsg").innerHTML = `<div class="verdict bad">Not quite.</div>
      <p class="small">${verbLast ? "The blocks in red are in the wrong place. Tap them to take them back out." : "Remember, the verb block comes last. Tap the red blocks to take them back out."}</p>`;
    return;
  }
  s.done = true;
  drawBuild();
  $("#sbMsg").innerHTML = buildFeedback(s.b, !sameOrder(s.b, s.placed));
  seeLink();
  $("#sbNext").focus({ preventScroll: true });
  countBuild(true);
}

function showBuild() {
  const s = buildState;
  s.placed = s.b.blocks.slice();
  s.bank = [];
  s.wrong = [];
  s.done = true;
  drawBuild();
  $("#sbMsg").innerHTML = buildFeedback(s.b, false, true);
  seeLink();
  $("#sbNext").focus({ preventScroll: true });
}

// other: the answer was right, in an order that isn't the most usual one.
function buildFeedback(b, other, shown) {
  const p = b.point;
  const canMove = b.blocks.some((x) => x.free);
  return `${shown ? "" : `<div class="verdict ok">Correct!</div>`}
    ${other ? `<p class="small">Your order works, because the particles carry each block's job. The most usual order is below.</p>` : ""}
    <div class="fb-drill" style="--c:${ROLES[p.role].color}">
      <div class="fb-sent" lang="ja">${builtSentence(b)}</div>
      <div class="q-en">${b.en}</div>
      <div class="fb-point"><b lang="ja">${p.g}</b> — ${p.m}</div>
      ${!other && canMove ? `<p class="small muted">Some of these blocks could swap places and it would still be right.</p>` : ""}
      ${p.link ? `<button class="lp-link" data-see>See it → ${linkLabel(p.link)}</button>` : ""}
    </div>`;
}

function seeLink() {
  const see = $("#sbMsg [data-see]");
  if (see) see.onclick = () => goTo(buildState.b.point.link);
}

/* ---------------------------------------------------------------- Free text */

// All of the lesson's sentences, written one under the other. The site only knows the wordings in
// builds.js: every allowed order of the blocks, in kanji or in kana. Typing one of those is right
// straight away. Anything else may still be right, so it waits, and all the waiting sentences go
// to the user's own chatbot in one prompt.

function acceptedTexts(b) {
  const spots = b.blocks.map((x, i) => (x.free ? i : -1)).filter((i) => i >= 0);
  const orders = (left) => (left.length < 2 ? [left] : left.flatMap((x, i) =>
    orders(left.filter((_, j) => j !== i)).map((rest) => [x, ...rest])));
  const out = new Set();
  for (const order of orders(b.blocks.filter((x) => x.free))) {
    const blocks = b.blocks.slice();
    spots.forEach((spot, i) => (blocks[spot] = order[i]));
    const text = blocks.map((x) => x.text).join("");
    out.add(normJa(plain(text)));
    out.add(normJa(kana(text)));
  }
  return out;
}

// Each item's status: todo, right (the site knows it), wait (for the chatbot), sent (in the open
// prompt), ok / bad (the chatbot's verdict), skip, or unchecked (the site's version was shown).
// active: the item being typed, if any. batch: the items in the open prompt, in prompt order.
// answers: the chatbot's answer to each prompt. right, xp, saved: totals for this round.
const newTextRun = (l) => ({
  items: shuffle(lessonBuilds(l)).map((b) => ({ b, typed: "", status: "todo" })),
  active: 0, batch: null, answers: [], right: 0, xp: 0, saved: 0, finished: false,
});

const nextTodo = (run) => {
  const i = run.items.findIndex((x) => x.status === "todo");
  return i < 0 ? null : i;
};
const waitingItems = (run) => run.items.filter((x) => x.status === "wait");

function buildPrompt(l, items) {
  const furi = $("#furiToggle").checked;
  const task = AI_PRESETS.find((x) => x.id === "check").task({ l, f: `the grammar of lesson ${l.n}`, furi }).replace(/1\. $/, "");
  const list = (get) => items.map((x, j) => `${j + 1}. ${get(x)}`).join("\n");
  return [promptContext(l, furi), promptStyle(l, furi),
    `${task}${list((x) => x.typed.trim())}

These are my translations of the English sentences below, in the same order. Any natural Japanese that says the same thing counts as correct, even if it's worded differently from what you would write.

English:
${list((x) => x.b.en)}`].join("\n\n");
}

/* ------------------------------------------------- Drawing the list */

const TEXT_MARKS = {
  right: ["ok", "✓ Right"], ok: ["ok", "✓ Right"], bad: ["bad", "✗ Not quite"],
  wait: ["", "For your chatbot"], sent: ["", "With your chatbot"], skip: ["", "Skipped"], unchecked: ["", "Not checked"],
};

// What was written, with the chatbot's correction if it gave one, or the site's version.
function textRowBody(x) {
  if (x.status === "bad" && x.fix) {
    return mistakePairHTML({ w: x.typed.trim(), r: x.fix });
  }
  const typed = x.typed.trim() && x.status !== "skip" ? `<div class="sb-tx-ja" lang="ja">${escHTML(x.typed.trim())}</div>` : "";
  const site = ["skip", "unchecked", "bad"].includes(x.status)
    ? `<div class="small muted sb-tx-site">The site's version: <span lang="ja">${builtSentence(x.b)}</span></div>` : "";
  return typed + site;
}

function textRowHTML(run, x, i, finished) {
  if (run.active === i) {
    const editing = x.status !== "todo";
    return `
      <div class="sb-tx-row active">
        <div class="q-en-big">“${x.b.en}”</div>
        <input class="sb-text" lang="ja" maxlength="${WRITE_MAX}" autocomplete="off" spellcheck="false"
          aria-label="Your sentence in Japanese" placeholder="Type it in Japanese">
        <div class="lw-note sb-note" aria-live="polite"></div>
        <div class="sb-tx-keys">
          <button class="btn primary" id="sbEnter">${editing ? "Save" : "Next →"}</button>
          <button class="btn" id="sbSkip">Skip</button>
          <span class="small muted">or press Enter</span>
        </div>
      </div>`;
  }
  const [cls, label] = TEXT_MARKS[x.status];
  const canEdit = !finished && !run.batch && ["wait", "skip"].includes(x.status);
  return `
    <div class="sb-tx-row">
      <div class="sb-tx-head">
        <span class="small muted">${x.b.en}</span>
        <span class="sb-tx-mark small ${cls}">${label}</span>
        ${canEdit ? `<button class="sb-tx-edit small" data-edit="${i}">Edit</button>` : ""}
      </div>
      ${textRowBody(x)}
      ${x.other ? `<div class="small muted">Right, and the blocks can go in that order. The most usual is <span lang="ja">${builtSentence(x.b)}</span></div>` : ""}
    </div>`;
}

function drawBuildText() {
  const s = buildState;
  const run = s.run || (s.run = newTextRun(s.l));
  if (run.finished) return drawTextResult(run);
  const box = $("#lBuild");
  const shown = run.items.map((x, i) => ({ x, i })).filter(({ x, i }) => x.status !== "todo" || i === run.active);
  const place = run.items.filter((x) => x.status !== "todo").length + (nextTodo(run) === null ? 0 : 1);
  box.innerHTML = `
    ${buildTop(`<span>Sentence <b>${Math.min(place, run.items.length)} / ${run.items.length}</b></span>
      <span><b class="sb-score">${run.right}</b> right so far</span>`)}
    <div class="q-kind">Write the sentences</div>
    <div id="sbRows">${shown.map(({ x, i }) => textRowHTML(run, x, i)).join("")}</div>
    <div id="sbPanel"></div>`;
  wireBuildTop(box);
  wireTextRows(run);
  if (run.batch) drawChatbotPanel(run);
  else drawTextActions(run);
}

function wireTextRows(run) {
  const box = $("#lBuild");
  $$("[data-edit]", box).forEach((b) => (b.onclick = () => {
    run.active = +b.dataset.edit;
    drawBuildText();
    focusBuildText();
  }));
  const input = $(".sb-text", box);
  if (!input) return;
  const x = run.items[run.active];
  input.value = x.typed;
  input.oninput = () => {
    x.typed = input.value;
    $(".sb-note", box).textContent = "";
  };
  input.onkeydown = (e) => {
    // Enter also confirms a word in a Japanese keyboard (IME) — leave that alone.
    if (e.key !== "Enter" || e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    enterSentence(run);
  };
  $("#sbEnter").onclick = () => enterSentence(run);
  $("#sbSkip").onclick = () => {
    x.status = "skip";
    moveOn(run);
  };
}

// "Check now", for what's waiting. Not in the middle of changing a sentence: it isn't ready.
function drawTextActions(run) {
  const n = waitingItems(run).length;
  const editing = run.active !== null && run.items[run.active].status !== "todo";
  const left = run.items.filter((x, i) => x.status === "todo" && i !== run.active).length;
  $("#sbPanel").innerHTML = `
    ${left ? `<p class="small muted sb-left">${left} more after this one</p>` : ""}
    ${n && !editing ? `<div class="q-actions sb-actions"><button class="btn" id="sbCheckNow">Check ${n} with my chatbot${run.active === null ? "" : " now"}</button></div>` : ""}`;
  const now = $("#sbCheckNow");
  if (now) now.onclick = () => openChatbot(run);
}

/* ------------------------------------------------- Writing */

function enterSentence(run) {
  const x = run.items[run.active];
  const typed = x.typed.trim();
  if (!JA_RE.test(typed)) {
    $("#lBuild .sb-note").textContent = "Write it in Japanese, or skip this one.";
    return;
  }
  const n = normJa(typed);
  if (acceptedTexts(x.b).has(n)) {
    const natural = x.b.blocks.map((y) => y.text).join("");
    x.other = n !== normJa(plain(natural)) && n !== normJa(kana(natural));
    x.status = "right";
    moveOn(run, XP.build);
    return;
  }
  x.status = "wait";
  moveOn(run);
}

// On to the next sentence, or to the chatbot once they're all written, or the score if nothing is
// waiting. `xp` is what the sentence just entered earned.
function moveOn(run, xp) {
  // Counted before drawing: the last sentence goes straight to the score.
  if (xp) {
    run.right++;
    run.xp += xp;
  }
  const next = nextTodo(run);
  run.active = next;
  if (next === null && waitingItems(run).length) {
    openChatbot(run);
  } else if (next === null && !run.batch) {
    run.finished = true;
    drawBuildText();
  } else {
    drawBuildText();
    focusBuildText();
  }
  if (xp) addXP(xp, $("#lBuild .sb-score, #lBuild .sb-tx-score"));
}

function payText(run, xp) {
  run.right++;
  run.xp += xp;
  const score = $("#lBuild .sb-score");
  if (score) score.textContent = run.right;
  addXP(xp, score || $("#lBuild"));
}

/* ------------------------------------------------- One prompt for the chatbot */

function openChatbot(run) {
  run.batch = waitingItems(run);
  run.batch.forEach((x) => (x.status = "sent"));
  run.active = null;
  drawBuildText();
  scrollIfAbove($("#lBuild"));
}

function drawChatbotPanel(run) {
  const n = run.batch.length;
  const panel = $("#sbPanel");
  panel.innerHTML = `
    <div class="lw-ai">
      <p class="small">The site doesn't know ${n === 1 ? "this wording" : "these wordings"}, but ${n === 1 ? "it" : "they"} may still be right, so ask your chatbot.</p>
      <p class="small"><b>1.</b> Copy this prompt and paste it into your chatbot.</p>
      <button class="btn primary lw-copy">Copy prompt for ${n === 1 ? "1 sentence" : `${n} sentences`}</button>
      <textarea class="ai-text lw-prompt" rows="8" readonly hidden aria-label="Prompt to copy"></textarea>
      <p class="small lw-step2"><b>2.</b> Copy the chatbot's answer and paste it here to read it in colour.</p>
      ${aiReaderHTML("Paste the chatbot's answer here")}
      <p class="small sb-verdict" aria-live="polite"></p>
    </div>
    <div class="q-actions sb-actions" id="sbPanelActions"></div>`;
  wireCopyPrompt(panel, () => buildPrompt(buildState.l, run.batch));
  setupAiReader($(".ar", panel), "", (text) => { if (text) readChatbotAnswer(run, text); });
  drawPanelActions(run);
}

function drawPanelActions(run) {
  const open = run.batch.filter((x) => x.status === "sent").length;
  const box = $("#sbPanelActions");
  if (!open) {
    const more = nextTodo(run) !== null;
    box.innerHTML = `<button class="btn primary" id="sbCarryOn">${more ? "Carry on writing →" : "See my score →"}</button>`;
    $("#sbCarryOn").onclick = () => closeChatbot(run);
    return;
  }
  const none = open === run.batch.length;
  box.innerHTML = `
    ${none ? '<button class="btn" id="sbBack">Back to my sentences</button>' : ""}
    <button class="btn" id="sbVersions">Show the site's version${open === 1 ? "" : "s"}</button>`;
  const back = $("#sbBack");
  if (back) back.onclick = () => {
    run.batch.forEach((x) => (x.status = "wait"));
    run.batch = null;
    run.active = nextTodo(run);
    drawBuildText();
    focusBuildText();
  };
  $("#sbVersions").onclick = () => {
    run.batch.filter((x) => x.status === "sent").forEach((x) => (x.status = "unchecked"));
    closeChatbot(run);
  };
}

function closeChatbot(run) {
  run.batch = null;
  run.active = nextTodo(run);
  if (run.active === null) run.finished = true;
  drawBuildText();
  focusBuildText();
  scrollIfAbove($("#lBuild"));
}

// The prompt numbered the sentences, so the number says which sentence each verdict is about.
// Pasting a part of an answer scores that part, and the rest of it can follow.
function readChatbotAnswer(run, text) {
  const batch = run.batch;
  if (!batch) return;
  const verdicts = aiVerdicts(text);
  const corrections = aiCorrections(text);
  const fresh = [];
  batch.forEach((x, j) => {
    const ok = verdicts[j + 1];
    if (x.status !== "sent" || ok === undefined) return;
    x.status = ok ? "ok" : "bad";
    const c = corrections.find((y) => y.n === j + 1);
    if (!ok && c && c.right) x.fix = matchEnd(x.typed.trim(), c.right);
    fresh.push(x);
  });
  // Pasting again for the same prompt replaces its answer.
  if (run.answered === batch) run.answers[run.answers.length - 1] = text;
  else run.answers.push(text);
  run.answered = batch;

  // Each grammar point keeps its own mistakes, so a correction is saved under its sentence's point.
  const { l } = buildState;
  for (const i of new Set(fresh.map((x) => x.b.i))) {
    const mine = fresh.filter((x) => x.b.i === i);
    const typed = mine.map((x) => x.typed.trim());
    const own = mine.flatMap((x, k) => {
      const c = corrections.find((y) => y.n === batch.indexOf(x) + 1);
      return c ? [{ ...c, n: k + 1, text: typed[k] }] : [];
    });
    run.saved += saveCorrections(l, i, text, typed, own);
  }
  fresh.filter((x) => x.status === "ok").forEach(() => payText(run, XP.build));

  $("#sbRows").innerHTML = run.items.map((x, i) => ({ x, i })).filter(({ x }) => x.status !== "todo")
    .map(({ x, i }) => textRowHTML(run, x, i)).join("");
  const open = batch.filter((x) => x.status === "sent").length;
  const note = $("#sbPanel .sb-verdict");
  note.className = `small sb-verdict${open ? " bad" : " ok"}`;
  note.textContent = !open
    ? `All ${batch.length === 1 ? "checked" : `${batch.length} checked`}.`
    : open === batch.length
      ? "Can't find a ✓ or ✗ on your sentences in this answer, so nothing is counted. Did you paste all of it?"
      : `${open} still ${open === 1 ? "has" : "have"} no ✓ or ✗ in this answer. Press Edit to paste the rest, or show the site's version.`;
  drawPanelActions(run);
}

/* ------------------------------------------------- The score */

function drawTextResult(run) {
  const scored = run.items.filter((x) => ["right", "ok", "bad"].includes(x.status)).length;
  const box = $("#lBuild");
  box.innerHTML = `
    ${buildTop("")}
    <div class="sb-tx-score">
      ${scored ? `<b>${run.right}</b> / ${scored} right` : "Nothing scored this round"}
      ${run.xp ? `<span class="xp-chip">+${run.xp} XP</span>` : ""}
    </div>
    <div id="sbRows">${run.items.map((x, i) => textRowHTML(run, x, i, true)).join("")}</div>
    ${run.saved ? `<p class="small muted">${run.saved === 1 ? "1 correction" : `${run.saved} corrections`} saved in “Your mistakes” on this lesson.</p>` : ""}
    ${run.answers.length ? `
      <details class="sb-tx-answers">
        <summary class="small">Your chatbot's explanations</summary>
        ${run.answers.map((a) => `<div class="ar-out">${renderAiAnswer(a)}</div>`).join("")}
      </details>` : ""}
    <div class="q-actions sb-actions"><button class="btn primary" id="sbAgain">Go round again →</button></div>`;
  wireBuildTop(box);
  $("#sbAgain").onclick = () => {
    buildState.run = newTextRun(buildState.l);
    drawBuildText();
    focusBuildText();
    scrollIfAbove(box);
  };
  if (scored && run.right === scored && !run.celebrated) {
    run.celebrated = true;
    burst($(".sb-tx-score", box));
  }
}
