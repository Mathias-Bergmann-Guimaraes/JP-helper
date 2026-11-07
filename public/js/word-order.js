// Word order game: put a sentence's blocks in an order that sounds natural, or in the order that
// puts the emphasis on one thing. Built from the Sentence explorer's sentences (SENTENCES in
// data.js): the natural order and its "natural" alternatives answer "make it sound natural", and
// each "shift" order with a focus answers "put the emphasis on …". The verb stays locked at the end.
// Used on the Sentences tab and as a mode on the Practice tab.

const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// Every goal: which sentence, what to aim for, and which orders reach it.
const ORDER_GOALS = SENTENCES.flatMap((s, si) => {
  const goals = [{ si, kind: "natural" }];
  (s.orders || []).forEach((o) => {
    const q = o.v === "shift" && o.focus && (o.why.match(/<b>(.+?)<\/b>/) || [])[1];
    if (q && !goals.some((g) => g.q === q && g.si === si)) goals.push({ si, kind: "emph", q, focus: o.focus });
  });
  return goals;
});

// What an order is, as the explorer describes it: { v, why, focus } or null when it isn't listed.
function describeOrder(s, order) {
  if (sameList(order, s.chunks.map((_, i) => i))) return { v: "natural", why: s.why, main: true };
  return (s.orders || []).find((o) => sameList(o.order, order)) || null;
}

const sameFocus = (a, b) => !!a && !!b && sameList([...a].sort(), [...b].sort());

// Right or not, and what to say about it.
function judgeOrder(goal, order) {
  const s = SENTENCES[goal.si];
  const d = describeOrder(s, order);
  const focusHint = `The block you want to stress goes <b>right before the verb</b>.`;
  if (goal.kind === "natural") {
    if (d && d.v === "natural") return { ok: true, pill: d.main ? "natural" : "also", why: d.why };
    if (d && d.v === "shift") return { ok: true, pill: "shift", why: `${d.why} Natural, so it counts. For a neutral sentence, the default is: ${defaultLine(s)}` };
    if (d) return { ok: false, pill: d.v, why: d.why };
    return { ok: false, pill: "awkward", why: `Not quite. Rules of thumb: は goes first (a time word may come before it), time before place, and を / に stay close to the verb.` };
  }
  if (d && d.v === "shift" && sameFocus(d.focus, goal.focus)) return { ok: true, pill: "shift", why: d.why };
  if (d && d.v === "natural") return { ok: false, pill: "also", why: `That's natural, but the emphasis isn't on <b>${goal.q}</b> yet. ${focusHint}` };
  if (d && d.v === "shift") return { ok: false, pill: "shift", why: `${d.why} That's a different emphasis from <b>${goal.q}</b>.` };
  if (d) return { ok: false, pill: d.v, why: d.why };
  return { ok: false, pill: "awkward", why: `Not quite. ${focusHint} Keep は near the start.` };
}

const defaultLine = (s) => `<span lang="ja">${ruby(s.chunks.filter((c) => !c.implied).map((c) => c.w + c.p).join(""))}。</span>`;

// The answer for a goal, for "Show me".
function goalAnswer(goal) {
  const s = SENTENCES[goal.si];
  if (goal.kind === "natural") return s.chunks.map((_, i) => i);
  return s.orders.find((o) => o.v === "shift" && sameFocus(o.focus, goal.focus)).order;
}

const woBlock = (s, i, cls = "") => `<button class="wo-pick ${cls}" data-i="${i}" type="button">${chunkHTML(s.chunks[i], i)}</button>`;

// The sentence is a row of slots, one per block before the verb. A block goes into whichever slot
// you choose: tap it to fill the first empty slot, or drag it onto a slot. Dropping onto a filled
// slot swaps the two blocks (or sends the one there back, when it came from the blocks below).
function newOrderGame(box, { onCount } = {}) {
  const g = { goal: null, deck: [], bank: [], slots: [], checked: false, result: null, shown: false, score: 0, total: 0 };

  const verbOf = () => SENTENCES[g.goal.si].chunks.length - 1;
  const live = () => !g.shown && !(g.result && g.result.ok);

  function next() {
    if (!g.deck.length) g.deck = shuffle(ORDER_GOALS.slice());
    g.goal = g.deck.pop();
    const verb = verbOf();
    const movable = Array.from({ length: verb }, (_, i) => i);
    // The bank never reads off as an answer from left to right.
    let bank, tries = 0;
    do bank = shuffle(movable.slice()); while (tries++ < 50 && judgeOrder(g.goal, [...bank, verb]).ok);
    Object.assign(g, { bank, slots: movable.map(() => null), checked: false, result: null, shown: false });
    draw();
  }

  function draw() {
    const s = SENTENCES[g.goal.si];
    const verb = verbOf();
    const full = g.slots.every((x) => x !== null);
    const r = g.result;
    const v = r && VERDICTS[r.pill];
    const slots = g.slots.map((i, k) => i === null
      ? `<div class="wo-slot" data-slot="${k}" aria-label="Empty slot ${k + 1}"></div>`
      : `<div class="wo-slot filled" data-slot="${k}">${woBlock(s, i)}</div>`).join("");
    box.innerHTML = `
      <div class="rl-head">
        <span class="rl-kicker">🔀 Word order</span>
        <span class="rl-count small"><b>${g.score}</b> / ${g.total} right first time · ${XP.build} XP each</span>
      </div>
      <div class="wo-goal ${g.goal.kind}">
        ${g.goal.kind === "natural"
          ? `<b>Make it sound natural</b><span class="muted small">The everyday way to say it.</span>`
          : `<b>Put the emphasis on ${g.goal.q}</b><span class="muted small">Make that the point of the sentence.</span>`}
      </div>
      <p class="wo-en">${s.en}</p>
      <div class="row-label">Your sentence</div>
      <div class="chunks wo-answer">${slots}${woBlock(s, verb, "wo-locked")}</div>
      <div class="row-label">Blocks <span class="muted small wo-tip">drag one onto any slot, or tap to fill the next one · tap a placed block to take it back</span></div>
      <div class="chunks wo-bank">${g.bank.map((i) => woBlock(s, i)).join("") || `<span class="muted small">All placed.</span>`}</div>
      ${r ? `<div class="wo-result">
          <span class="pill ${v.cls}">${r.ok ? "Right! " : ""}${v.label}</span>
          <div class="sv-why ${r.ok ? v.cls : "bad"}">${rich(r.why)}</div>
        </div>` : ""}
      ${g.shown ? `<div class="wo-result"><div class="row-label">One right answer</div>
          <div class="chunks compact">${goalAnswer(g.goal).map((i) => chunkHTML(s.chunks[i], i)).join("")}</div>
          <div class="sv-why good">${rich(judgeOrder(g.goal, goalAnswer(g.goal)).why)}</div></div>` : ""}
      <div class="q-actions wo-actions">
        ${r && r.ok || g.shown
          ? `<button class="btn primary" data-wo="next" type="button">Next sentence →</button>`
          : `${r ? `<button class="btn" data-wo="show" type="button">Show me</button>` : ""}
             <button class="btn" data-wo="clear" type="button"${g.slots.some((x) => x !== null) ? "" : " disabled"}>Clear</button>
             <button class="btn primary" data-wo="check" type="button"${full ? "" : " disabled"}>Check</button>`}
      </div>`;
  }

  function count() {
    if (g.checked) return;
    g.checked = true;
    g.total++;
    if (onCount) onCount(g);
  }

  function check(btn) {
    const r = judgeOrder(g.goal, [...g.slots, verbOf()]);
    track("quiz.order");
    if (!g.checked && r.ok) { g.score++; addXP(XP.build, btn); }
    count();
    g.result = r;
    draw();
    $(r.ok ? "[data-wo=next]" : "[data-wo=check]", box)?.focus({ preventScroll: true });
  }

  // Moves block i to slot k, or back to the blocks when k is null. Whatever was in slot k goes where
  // block i came from: its old slot, or the blocks.
  function place(i, k) {
    const from = g.slots.indexOf(i);
    if (from === -1) g.bank.splice(g.bank.indexOf(i), 1);
    else g.slots[from] = null;
    if (k === null) g.bank.push(i);
    else {
      const there = g.slots[k];
      if (there !== null) {
        if (from === -1) g.bank.push(there);
        else g.slots[from] = there;
      }
      g.slots[k] = i;
    }
    g.result = null;
    draw();
  }

  box.addEventListener("click", (e) => {
    const act = e.target.closest("[data-wo]");
    if (act) {
      if (act.dataset.wo === "next") next();
      if (act.dataset.wo === "check") check(act);
      if (act.dataset.wo === "clear") {
        g.bank.push(...g.slots.filter((x) => x !== null));
        g.slots = g.slots.map(() => null);
        g.result = null;
        draw();
      }
      if (act.dataset.wo === "show") { count(); g.shown = true; g.result = null; draw(); }
      return;
    }
    // e.detail is 0 for Enter/Space, so a keyboard press still counts after a drag.
    if (!live() || (dragged && e.detail)) return;
    const b = e.target.closest(".wo-pick:not(.wo-locked)");
    if (b) {
      const i = +b.dataset.i;
      if (g.slots.includes(i)) place(i, null);
      else if (g.slots.includes(null)) place(i, g.slots.indexOf(null));
    }
  });

  /* Dragging: a copy of the block follows the pointer, the slot under it lights up, and letting go
     drops it there. Over the blocks below, a placed block goes back. Escape cancels. */
  let dragged = false;

  // The slot under the pointer: { k }, { out: true } for the blocks below, or null.
  function dropTarget(x, y, fromSlot) {
    const el = document.elementFromPoint(x, y);
    const slot = el && el.closest(".wo-slot");
    if (slot && box.contains(slot)) return { k: +slot.dataset.slot };
    // Near a slot also counts, so you don't have to hit it exactly.
    let best = null, bestD = DROP_MARGIN * 2;
    $$(".wo-slot", box).forEach((s) => {
      const r = s.getBoundingClientRect();
      const d = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
      if (d < bestD) { bestD = d; best = s; }
    });
    if (best) return { k: +best.dataset.slot };
    const bank = $(".wo-bank", box).getBoundingClientRect();
    if (fromSlot && y > $(".wo-answer", box).getBoundingClientRect().bottom && y < bank.bottom + DROP_MARGIN * 3) return { out: true };
    return null;
  }

  function showDropHint(target) {
    $$(".wo-slot", box).forEach((s) => s.classList.toggle("wo-target", !!target && target.k === +s.dataset.slot));
    $(".wo-bank", box).classList.toggle("wo-over", !!(target && target.out));
  }

  box.addEventListener("pointerdown", (e) => {
    dragged = false;
    const el = e.target.closest(".wo-pick:not(.wo-locked)");
    if (!el || e.button !== 0 || !e.isPrimary || !live()) return;
    const i = +el.dataset.i;
    const fromSlot = g.slots.includes(i);
    const start = el.getBoundingClientRect();
    const [sx, sy] = [e.clientX, e.clientY];
    let ghost = null;
    let target = null;

    const move = (ev) => {
      const [dx, dy] = [ev.clientX - sx, ev.clientY - sy];
      if (!ghost) {
        if (Math.hypot(dx, dy) < DRAG_FROM) return;
        dragged = true;
        ghost = el.cloneNode(true);
        ghost.removeAttribute("data-i");
        ghost.classList.add("sb-ghost");
        Object.assign(ghost.style, { left: `${start.left}px`, top: `${start.top}px`, width: `${start.width}px` });
        box.append(ghost);
        el.classList.add("sb-held");
        box.classList.add("wo-dragging");
      }
      ghost.style.transform = `translate(${dx}px, ${dy}px)`;
      target = dropTarget(ev.clientX, ev.clientY, fromSlot);
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
      box.classList.remove("wo-dragging");
      showDropHint(null);
      if (drop && target) place(i, target.out ? null : target.k);
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
  });

  next();
  return g;
}
