// UI for every page. Content lives in data.js, conjugation rules in verbs.js.

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// localStorage can be unavailable (private mode, file:// in some browsers) — never let it break the page.
// Saving a progress key also saves it for the signed-in account (see Progress below).
const store = {
  get(k, d) {
    try { const v = localStorage.getItem("jpg." + k); return v === null ? d : JSON.parse(v); } catch { return d; }
  },
  set(k, v) {
    const changed = progress.sync && progress.merge[k] && JSON.stringify(v) !== JSON.stringify(store.get(k));
    try { localStorage.setItem("jpg." + k, JSON.stringify(v)); } catch { /* ignore */ }
    if (changed) queueProgress({ [k]: v });
  },
  del(k) {
    try { localStorage.removeItem("jpg." + k); } catch { /* ignore */ }
  },
};

/* ---------------------------------------------------------------- Progress */

// Lesson progress is saved per account on the server, so it follows a member to every browser.
// server.js sends it in progress.js, loaded before this file:
//   window.SERVER_PROGRESS = { owner, progress: { [key]: value }, merge: { [key]: how } }
// and it is copied into localStorage here, before any other script reads it. localStorage stays
// marked with whose progress it holds ("progressOwner"), so a second account on this browser
// starts clean. Without server.js (the page opened as a file) progress stays in this browser.
const progress = { sync: false, merge: {}, pending: null, sending: false };
// Chatbot answers pasted into the site can be long, so they stay in this browser — but they still
// belong to the account, so they go with it on log out or when someone else logs in here.
// A big test in progress stays in this browser too.
const LOCAL_PROGRESS = ["aiFeedback", "aiAnswers", "mistakesRead", "writeLog", "bigRun", "bigOpen", "certName"];

function queueProgress(patch) {
  progress.pending = Object.assign(progress.pending || {}, patch);
  setTimeout(sendProgress, 300); // gathers quick bursts of saves into one request
}

async function sendProgress() {
  if (progress.sending || !progress.pending) return;
  const patch = progress.pending;
  progress.pending = null;
  progress.sending = true;
  try {
    await post("/progress", patch);
  } catch { /* still saved in this browser; scores are sent again on the next visit */ }
  progress.sending = false;
  sendProgress();
}

// Leaving the page before the short wait is over: send what's left anyway.
addEventListener("pagehide", () => {
  if (!progress.pending) return;
  fetch("/progress", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify(progress.pending) });
  progress.pending = null;
});

(function applyServerProgress() {
  const s = window.SERVER_PROGRESS;
  if (!s) return;
  // Progress saved here by this account, or from before logins existed, is merged in and the
  // server gets what it is missing: the higher score wins, and the last lesson opened (and other
  // "latest" values) only come from here if the server has none yet. Anyone else's is replaced.
  const mine = [null, s.owner].includes(store.get("progressOwner", null));
  if (!mine) LOCAL_PROGRESS.forEach((k) => store.del(k));
  const upload = {};
  for (const [k, how] of Object.entries(s.merge)) {
    const there = s.progress[k];
    const here = mine ? store.get(k) : undefined;
    let v = there;
    if (here !== undefined && (how === "scores" || how === "days")) {
      v = { ...there };
      for (const [n, score] of Object.entries(here)) {
        if (score > (v[n] ?? -1)) { v[n] = score; upload[k] = here; }
      }
    } else if (here !== undefined && (how === "texts" || how === "notes")) {
      // Only entries the server doesn't have yet go up: it keeps the latest of each.
      v = { ...there };
      for (const [n, t] of Object.entries(here)) {
        if (!(n in v)) { v[n] = t; upload[k] = { ...upload[k], [n]: t }; }
      }
    } else if (here !== undefined && how === "dated") {
      // The entry reviewed most recently wins, on either side.
      v = { ...there };
      for (const [n, e] of Object.entries(here)) {
        if (!v[n] || e.last > v[n].last) { v[n] = e; upload[k] = { ...upload[k], [n]: e }; }
      }
    } else if (here !== undefined && how === "max") {
      if (here > (there ?? 0)) { v = here; upload[k] = here; }
    } else if (here !== undefined && there === undefined) {
      v = here;
      upload[k] = here;
    }
    v === undefined ? store.del(k) : store.set(k, v);
  }
  store.set("progressOwner", s.owner);
  Object.assign(progress, { sync: true, merge: s.merge });
  if (Object.keys(upload).length) queueProgress(upload);
})();

// On log out, so the next person on this browser doesn't see this account's progress.
function clearProgress() {
  for (const k of [...Object.keys(progress.merge), ...LOCAL_PROGRESS, "progressOwner"]) store.del(k);
}

/* ---------------------------------------------------------------- Usage */

// Counts which features get used, for the admin page's anonymous totals: only a feature's name is
// sent, never what was typed. The names are listed in USAGE_GROUPS in server.js.
const usage = { pending: {}, timer: null };

function track(feature) {
  if (!progress.sync) return; // no server.js: the page was opened as a file
  usage.pending[feature] = (usage.pending[feature] || 0) + 1;
  if (!usage.timer) usage.timer = setTimeout(sendUsage, 10000); // gathers a while's use into one request
}

function sendUsage() {
  clearTimeout(usage.timer);
  usage.timer = null;
  if (!Object.keys(usage.pending).length) return;
  const body = JSON.stringify(usage.pending);
  usage.pending = {};
  // keepalive lets it finish when the page is closing. A lost count doesn't matter.
  fetch("/usage", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body }).catch(() => {});
}

addEventListener("pagehide", sendUsage);
// Phones often close a page in the background without a pagehide.
document.addEventListener("visibilitychange", () => { if (document.hidden) sendUsage(); });

const partsHTML = (parts) => parts.map((p) => `<span class="vp ${p.cls}">${ruby(p.m)}</span>`).join("");

/* ---------------------------------------------------------------- Tabs */

// How much of the top of the window the bar covers: nothing once it's a sidebar on a wide screen.
const barHeight = () => (matchMedia("(min-width: 1024px)").matches ? 0 : $(".topbar").offsetHeight);

const TABS = ["home", "lessons", "structure", "particles", "verbs", "adjectives", "patterns", "practice", "listen", "mistakes"];

function showTab(id) {
  if (!TABS.includes(id)) id = "home";
  if (!$("#" + id).classList.contains("active")) track("tab." + id);
  $$("#tabs button").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === id);
    // On a narrow screen the tabs scroll sideways: keep the open one in view.
    if (b.dataset.tab === id) b.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
  $$(".panel").forEach((p) => p.classList.toggle("active", p.id === id));
  if (location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
  // The lesson list can only scroll to the open lesson while it's on screen.
  if (id === "lessons") updateLessonPath();
  // Mistakes are added and learned on other pages, so this one is drawn as it opens.
  if (id === "mistakes") renderMistakesPage();
  // Stats change on every other page, and aren't kept up to date while Home is hidden.
  if (id === "home") {
    placeRoulette($("#homeRoulette"));
    renderStats();
  }
  if (id === "practice") showPractice();
  if (id === "listen") renderListen();
}

/* ---------------------------------------------------------------- Account */

// The whole site is private: server.js only sends it to signed-in members, and shows everyone
// else the login page (gate/login.html). Here the top bar shows who is signed in.

async function post(url, data) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.error || "Something went wrong. Please try again later.");
  return json;
}

// Without server.js (e.g. the page opened as a file) there is no login, so nothing is shown.
async function setupAccount() {
  let state;
  try {
    const r = await fetch("/access/status", { cache: "no-store" });
    if (!r.ok) return;
    state = await r.json();
  } catch {
    return;
  }
  drawAccount(state);
  if (state.status === "approved" && !state.username) showLinkCard();
}

function drawAccount(state) {
  const box = $("#account");
  if (!state.username) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = `<span class="account-name"></span><button class="account-btn" type="button">Log out</button>`;
  $(".account-name", box).textContent = state.username;
  $("button", box).onclick = logOut;
}

async function logOut() {
  sendUsage();
  try {
    await post("/access/logout", {});
  } finally {
    clearProgress();
    location.hash = "";
    location.reload();
  }
}

async function submitForm(e, url, errorSel, onDone) {
  e.preventDefault();
  const form = e.target;
  const button = form.querySelector("button[type=submit]");
  $(errorSel).textContent = "";
  button.disabled = true;
  try {
    onDone(await post(url, Object.fromEntries(new FormData(form))));
  } catch (err) {
    $(errorSel).textContent = err.message;
    button.disabled = false;
  }
}

// Browsers approved before logins existed: offer to tie that access to a username and password.
function showLinkCard() {
  const card = document.createElement("div");
  card.className = "card link-card";
  card.innerHTML = `
    <div>
      <h3>Use the lessons on your other devices</h3>
      <p class="muted small">This browser has access, but it isn't tied to a login yet. Pick a username
      and password, then log in with them on any browser.</p>
    </div>
    <form class="lock-form" id="linkForm">
      <input name="username" maxlength="24" autocomplete="username" autocapitalize="none" spellcheck="false"
        placeholder="Username" aria-label="Username" required>
      <input name="password" type="password" minlength="8" maxlength="200" autocomplete="new-password"
        placeholder="Password (8+ characters)" aria-label="Password" required>
      <button class="btn primary" type="submit">Create login</button>
      <p class="lock-error" id="linkError" role="alert"></p>
    </form>`;
  $("#home").prepend(card);
  $("#linkForm").onsubmit = (e) => submitForm(e, "/access/link", "#linkError", (state) => {
    drawAccount(state);
    card.remove();
  });
}

/* ---------------------------------------------------------------- Sentence structure */

function chunkHTML(c, i) {
  const r = ROLES[c.role];
  const p = c.p ? `<span class="p">${c.p}</span>` : "";
  return `<div class="chunk${c.implied ? " implied" : ""}" style="--c:${r.color}" data-i="${i}" title="${r.hint}">
    <div class="chunk-jp" lang="ja">${c.implied ? "(" : ""}<span class="w">${rich(c.w)}</span>${p}${c.implied ? ")" : ""}</div>
    <div class="chunk-role">${c.label || r.label}</div>
  </div>`;
}

function enChunkHTML(c, i) {
  const r = ROLES[c.role];
  return `<div class="chunk en${c.implied ? " implied" : ""}" style="--c:${r.color}" data-i="${i}">
    <div class="chunk-en">${c.en}</div>
    <div class="chunk-role">${r.label}</div>
  </div>`;
}

let sentIdx = 0;

function renderStructure() {
  const formula = ["topic", "time", "place", "object"]
    .map((r) => `<span class="fchip" style="--c:${ROLES[r].color}">${ROLES[r].label}</span>`)
    .join('<span class="fplus">+</span>');

  $("#structure").innerHTML = `
    <div class="card hero">
      <h1>Japanese sentences are built from <span class="accent">blocks</span></h1>
      <p>Each block is a word plus a small <b>particle</b> tag that says what job the word does.
      English shows “who did what to whom” with word order — Japanese shows it with particles.
      The one fixed rule: <b>the verb comes last.</b></p>
      <div class="formula">${formula}<span class="fplus">→</span><span class="fchip solid" style="--c:${ROLES.verb.color}">Verb</span></div>
      <p class="muted small">This is the <b>natural default</b> order. The other blocks <i>can</i> move, but moving them shifts the emphasis:
      the block right before the verb is the one in focus.</p>
    </div>

    <div class="card" id="sv">
      <h2>Sentence explorer</h2>
      <p class="muted small">Pick a rule, then hover or tap a block to find it in the English sentence.</p>
      <div class="sv-picker" id="svPicker" role="tablist" aria-label="Sentences">
        ${SENTENCES.map((s, i) => `<button class="sv-pick" role="tab" data-s="${i}" title="${plain(s.chunks.filter((c) => !c.implied).map((c) => c.w + c.p).join(""))}">${s.rule}</button>`).join("")}
      </div>
      <div class="row-label sv-jp-label">Japanese order <span class="pill" id="svVerdict"></span></div>
      <div class="chunks" id="svJp"></div>
      <div class="row-label">English order</div>
      <div class="chunks" id="svEn"></div>
      <div class="sv-translation" id="svTrans"></div>
      <div class="sv-actions">
        <button class="btn" id="svShuffle">Try another order</button>
        <button class="btn" id="svReset" hidden>Back to natural order</button>
      </div>
      <div class="sv-why" id="svWhy"></div>
    </div>

    <div class="card lquiz" id="woSentences"></div>

    <div class="card">
      <h2>Core patterns</h2>
      <div class="patterns">
        ${PATTERNS.map((p) => `
          <div class="pattern">
            <div class="pattern-title"><span lang="ja">${p.title}</span><span class="muted"> = ${p.meaning}</span></div>
            <div class="chunks compact">${p.chunks.map(chunkHTML).join("")}</div>
            <div class="muted small">${p.en}</div>
            ${p.tip ? `<div class="pattern-tip">${rich(p.tip)}</div>` : ""}
          </div>`).join("")}
      </div>
    </div>

    <div class="card">
      <h2>Colour key</h2>
      <div class="legend">
        ${Object.values(ROLES).map((r) => `
          <div class="legend-item" style="--c:${r.color}">
            <span class="swatch"></span><b>${r.label}</b><span class="muted small">${r.hint}</span>
          </div>`).join("")}
      </div>
    </div>`;

  $("#svPicker").onclick = (e) => {
    const b = e.target.closest(".sv-pick");
    if (!b) return;
    track("explore.sentences");
    showSentence(+b.dataset.s);
  };
  $("#svShuffle").onclick = () => { track("explore.sentences"); nextOrder(); };
  $("#svReset").onclick = () => setOrder(-1);

  const sv = $("#sv");
  const link = (i) => {
    $$(".chunks#svJp, .chunks#svEn", sv).forEach((row) => row.classList.toggle("dimmed", i != null));
    $$("#svJp .chunk, #svEn .chunk", sv).forEach((c) => c.classList.toggle("lit", c.dataset.i === i));
  };
  sv.addEventListener("pointerover", (e) => {
    const c = e.target.closest("#svJp .chunk, #svEn .chunk");
    link(c ? c.dataset.i : null);
  });
  sv.addEventListener("pointerleave", () => link(null));

  showSentence(0);
  newOrderGame($("#woSentences"));
}

let orderIdx = -1; // -1 = the natural default order; otherwise an index into SENTENCES[i].orders

const VERDICTS = {
  natural: { cls: "good",  label: "✓ Natural order" },
  also:    { cls: "good",  label: "✓ Also natural" },
  shift:   { cls: "shift", label: "↔ Natural, new emphasis" },
  awkward: { cls: "warn",  label: "⚠ Sounds unnatural" },
  broken:  { cls: "bad",   label: "✗ Meaning breaks" },
};

function showSentence(i) {
  sentIdx = (i + SENTENCES.length) % SENTENCES.length;
  orderIdx = -1;
  const s = SENTENCES[sentIdx];
  $$("#svPicker .sv-pick").forEach((b) => {
    const on = +b.dataset.s === sentIdx;
    b.classList.toggle("on", on);
    b.setAttribute("aria-selected", on);
  });
  $("#svJp").innerHTML = s.chunks.map(chunkHTML).join("");
  $("#svEn").innerHTML = s.enOrder.map((i) => enChunkHTML(s.chunks[i], i)).join("");
  $("#svShuffle").hidden = !s.orders?.length;
  showOrder();
}

// Step through the other orders, then back to the natural one.
function nextOrder() {
  const n = SENTENCES[sentIdx].orders?.length || 0;
  if (n) setOrder(orderIdx + 1 >= n ? -1 : orderIdx + 1);
}

function setOrder(k) {
  orderIdx = k;
  moveBlocks(currentOrder());
  showOrder();
}

function currentOrder() {
  const s = SENTENCES[sentIdx];
  return orderIdx < 0 ? s.chunks.map((_, i) => i) : s.orders[orderIdx].order;
}

// Verdict pill, focus marker, sentence line and explanation for the current order.
function showOrder() {
  const s = SENTENCES[sentIdx];
  const alt = orderIdx < 0 ? null : s.orders[orderIdx];
  const v = VERDICTS[alt ? (alt.v === "natural" ? "also" : alt.v) : "natural"];
  const order = currentOrder();

  const pill = $("#svVerdict");
  pill.className = `pill ${v.cls}`;
  pill.textContent = v.label;

  // Mark the block(s) the emphasis has moved to.
  const focus = (alt?.focus || []).map(String);
  $$("#svJp .chunk").forEach((c) => c.classList.toggle("focus", focus.includes(c.dataset.i)));

  const jp = order.map((ci, k) => {
    const c = s.chunks[ci];
    let t = ruby(c.w + c.p);
    if (k === 0 && !c.p && c.role !== "verb") t += "、"; // a time word opening the sentence takes a comma
    return c.implied ? `<span class="muted">(${t})</span>` : t;
  }).join("");
  const off = alt && (alt.v === "awkward" || alt.v === "broken");
  $("#svTrans").innerHTML = `<span lang="ja"${off ? ' class="sv-off"' : ""}>${jp}。</span>
    <span class="muted">— ${s.en}</span>${s.note ? `<div class="note">${s.note}</div>` : ""}`;

  const why = $("#svWhy");
  why.className = `sv-why ${v.cls}`;
  why.innerHTML = alt ? rich(alt.why) : `<b>Why this order:</b> ${rich(s.why || "")}`;
  $("#svReset").hidden = !alt;
}

// Rearrange the Japanese blocks to `order`, animating each from its old position (FLIP).
function moveBlocks(order) {
  const row = $("#svJp");
  const kids = [...row.children];
  const before = new Map(kids.map((k) => [k, k.getBoundingClientRect()]));
  order.forEach((ci) => row.appendChild(kids.find((k) => k.dataset.i === String(ci))));
  kids.forEach((k) => {
    const a = before.get(k), b = k.getBoundingClientRect();
    if (a.left === b.left && a.top === b.top) return;
    k.animate(
      [{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` }, { transform: "none" }],
      { duration: 550, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
  });
}

/* ---------------------------------------------------------------- Particles */

const PARTICLE_SVG = {
  wa: `<circle cx="25" cy="84" r="11" class="f-mute" opacity=".35"/>
       <circle cx="195" cy="84" r="11" class="f-mute" opacity=".35"/>
       <polygon points="100,16 120,16 172,96 48,96" fill="currentColor" opacity=".16"/>
       <rect x="94" y="6" width="32" height="11" rx="3" fill="currentColor"/>
       <ellipse cx="110" cy="96" rx="64" ry="7" fill="currentColor" opacity=".22"/>
       <rect x="86" y="58" width="48" height="36" rx="7" fill="currentColor"/>
       <text x="110" y="82" text-anchor="middle" class="t-inv">X</text>`,
  ga: `<circle cx="50" cy="80" r="17" class="f-mute" opacity=".35"/>
       <circle cx="110" cy="80" r="20" fill="currentColor"/>
       <circle cx="170" cy="80" r="17" class="f-mute" opacity=".35"/>
       <line x1="110" y1="8" x2="110" y2="50" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
       <polyline points="100,40 110,52 120,40" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
       <text x="124" y="26" class="t">this one!</text>`,
  wo: `<circle cx="32" cy="55" r="14" class="f-mute" opacity=".5"/>
       <text x="32" y="90" text-anchor="middle" class="t">doer</text>
       <line x1="52" y1="55" x2="138" y2="55" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
       <polyline points="126,43 140,55 126,67" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
       <text x="95" y="42" text-anchor="middle" class="t">verb</text>
       <circle cx="178" cy="55" r="26" fill="none" stroke="currentColor" stroke-width="4"/>
       <circle cx="178" cy="55" r="15" fill="none" stroke="currentColor" stroke-width="4"/>
       <circle cx="178" cy="55" r="5" fill="currentColor"/>
       <text x="178" y="102" text-anchor="middle" class="t">object</text>`,
  ni: `<line x1="16" y1="90" x2="204" y2="90" class="s-mute" stroke-width="2"/>
       <path d="M24 74 H150" stroke="currentColor" stroke-width="5" stroke-dasharray="1 10" stroke-linecap="round" fill="none"/>
       <path d="M178 90 C160 64 160 58 160 46 a18 18 0 1 1 36 0 c0 12 0 18 -18 44z" fill="currentColor"/>
       <circle cx="178" cy="46" r="7" class="f-surface"/>
       <text x="24" y="60" class="t">arrive exactly here →</text>`,
  he: `<path d="M24 64 Q110 22 194 52" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="10 8" stroke-linecap="round"/>
       <polyline points="186,40 197,53 183,58" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
       <circle cx="24" cy="64" r="7" fill="currentColor"/>
       <text x="110" y="96" text-anchor="middle" class="t">heading that way…</text>`,
  de: `<rect x="24" y="12" width="172" height="84" rx="12" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-width="3"/>
       <polygon points="110,30 117,48 136,48 121,59 127,77 110,66 93,77 99,59 84,48 103,48" fill="currentColor"/>
       <text x="36" y="32" class="t">stage</text>
       <text x="184" y="88" text-anchor="end" class="t">action!</text>`,
  to: `<circle cx="66" cy="52" r="24" fill="currentColor"/>
       <circle cx="154" cy="52" r="24" fill="currentColor"/>
       <rect x="86" y="47" width="48" height="10" rx="5" fill="currentColor" opacity=".55"/>
       <text x="66" y="58" text-anchor="middle" class="t-inv">A</text>
       <text x="154" y="58" text-anchor="middle" class="t-inv">B</text>
       <text x="110" y="100" text-anchor="middle" class="t">together</text>`,
  no: `<circle cx="96" cy="55" r="46" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="3"/>
       <circle cx="112" cy="68" r="17" fill="currentColor"/>
       <text x="74" y="44" text-anchor="middle" class="t big">A</text>
       <text x="112" y="74" text-anchor="middle" class="t-inv">B</text>
       <text x="186" y="60" text-anchor="middle" class="t">B of A</text>`,
  mo: `<rect x="30" y="26" width="52" height="52" rx="10" class="f-mute" opacity=".5"/>
       <text x="56" y="58" text-anchor="middle" class="t-inv">A</text>
       <text x="110" y="62" text-anchor="middle" class="t big">=</text>
       <rect x="138" y="26" width="52" height="52" rx="10" fill="currentColor"/>
       <text x="164" y="58" text-anchor="middle" class="t-inv">B</text>
       <text x="164" y="100" text-anchor="middle" class="t">B too!</text>`,
  kara: `<rect x="30" y="50" width="160" height="12" rx="6" fill="currentColor" opacity=".3"/>
       <line x1="30" y1="20" x2="30" y2="82" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
       <polygon points="30,20 58,28 30,36" fill="currentColor"/>
       <line x1="190" y1="20" x2="190" y2="82" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
       <polygon points="190,20 162,28 190,36" fill="currentColor"/>
       <text x="30" y="102" text-anchor="middle" class="t jp">から</text>
       <text x="190" y="102" text-anchor="middle" class="t jp">まで</text>`,
};

const particleSVG = (id) =>
  `<svg viewBox="0 0 220 110" class="psvg" aria-hidden="true">${PARTICLE_SVG[id]}</svg>`;

let currentParticle = "wa";

const notPill = (p) => `<span class="pill bad">✗ <span lang="ja">${p}</span></span>`;

// も before → after: "swap" replaces the particle, otherwise も stacks after it.
const moRow = (word, from, rest, en, swap) => `
  <li>
    <div class="mo-before" lang="ja">${ruby(word)}${swap ? `<s>${from}</s>` : from}${ruby(rest)}</div>
    <div class="mo-after" lang="ja"><span class="mo-arrow">→</span>${ruby(word)}${swap ? "" : from}<span class="hl">も</span>${ruby(rest)}</div>
    <div class="use-en">${en}</div>
  </li>`;

// Extra boxes under a particle's card, shown only for the particles listed in `for`.
const PARTICLE_BOXES = [
  { for: ["wa", "ga"], html: () => `
    <h2><span lang="ja">は</span> vs <span lang="ja">が</span> — where is the new information?</h2>
    <p class="muted">Both can mark “who”. The difference is which part of the sentence is the <b>news</b>.</p>
    <div class="compare">
      <div class="cmp" style="--c:${ROLES.topic.color}">
        <div class="cmp-q">Q: <span lang="ja">${ruby("お名前[なまえ]は？")}</span> <span class="muted">(What's your name?)</span></div>
        <div class="cmp-s" lang="ja"><span class="old">${ruby("私[わたし]")}<span class="hl">は</span></span><span class="new">${ruby("田中[たなか]です")}</span></div>
        <div class="cmp-en">“I'm <b>Tanaka</b>.”</div>
        <p class="small"><b>は</b>: “me” is already known. The new info comes <b>after</b> は.</p>
      </div>
      <div class="cmp" style="--c:${ROLES.subject.color}">
        <div class="cmp-q">Q: <span lang="ja">${ruby("田中[たなか]さんはどなたですか。")}</span> <span class="muted">(Which one is Tanaka?)</span></div>
        <div class="cmp-s" lang="ja"><span class="new">${ruby("私[わたし]")}<span class="hl">が</span></span><span class="old">${ruby("田中[たなか]です")}</span></div>
        <div class="cmp-en">“<b>I</b> am Tanaka.”</div>
        <p class="small"><b>が</b>: the new info is the word <b>before</b> が.</p>
      </div>
    </div>` },

  { for: ["ga", "wo"], html: () => `
    <h2><span lang="ja">${ruby("好[す]き")}</span>, <span lang="ja">わかる</span>, <span lang="ja">ほしい</span> — why <span lang="ja">が</span> and not <span lang="ja">を</span>?</h2>
    <p class="muted">In English “I like <b>cats</b>” makes the cats look like the object. In Japanese, <span lang="ja">${ruby("好[す]き")}</span> isn't an action you do to the cat — it <b>describes</b> the cat.</p>
    <div class="compare">
      <div class="cmp" style="--c:${ROLES.object.color}">
        <div class="cmp-head">English thinking ${notPill("を")}</div>
        <div class="cmp-s wrong" lang="ja"><span class="old">${ruby("私[わたし]は")}</span><span>${ruby("猫[ねこ]")}<span class="hl">を</span></span><span class="old">${ruby("好[す]きです")}</span></div>
        <div class="cmp-en">I → <i>like</i> → cats</div>
        <p class="small">Treats “like” as an action that hits the cat. Japanese doesn't see it that way.</p>
      </div>
      <div class="cmp" style="--c:${ROLES.subject.color}">
        <div class="cmp-head">Japanese thinking <span class="pill good">✓ <span lang="ja">が</span></span></div>
        <div class="cmp-s" lang="ja"><span class="old">${ruby("私[わたし]は")}</span><span class="new" data-tag="WHAT IS LIKEABLE">${ruby("猫[ねこ]")}<span class="hl">が</span></span><span class="old">${ruby("好[す]きです")}</span></div>
        <div class="cmp-en">“As for me, <b>cats</b> are likeable.”</div>
        <p class="small"><b>が</b> points at the thing the feeling is about. <span lang="ja">${ruby("好[す]き")}</span> works like an adjective.</p>
      </div>
    </div>
    <div class="step-label">These all take <span lang="ja">が</span> — feelings, skills, wanting and having</div>
    <ul class="only-list" style="--c:${ROLES.subject.color}">
      <li><span class="use-label">Like / dislike</span><span lang="ja">${rich("猫[ねこ]{が}好[す]きです。")}</span><span class="use-en">I like cats.</span></li>
      <li><span class="use-label">Good / bad at</span><span lang="ja">${rich("料理[りょうり]{が}上手[じょうず]です。")}</span><span class="use-en">I'm good at cooking.</span></li>
      <li><span class="use-label">Understand</span><span lang="ja">${rich("日本語[にほんご]{が}わかります。")}</span><span class="use-en">I understand Japanese.</span></li>
      <li><span class="use-label">Want</span><span lang="ja">${rich("車[くるま]{が}ほしいです。")}</span><span class="use-en">I want a car.</span></li>
      <li><span class="use-label">Can do</span><span lang="ja">${rich("英語[えいご]{が}できます。")}</span><span class="use-en">I can speak English.</span></li>
      <li><span class="use-label">Have</span><span lang="ja">${rich("時間[じかん]{が}あります。")}</span><span class="use-en">I have time.</span></li>
    </ul>
    <div class="tip" style="--c:${ROLES.subject.color}"><b>Rule of thumb</b> If the English verb is a feeling, a skill or having — like, good at, understand, want, can, have — Japanese uses <span lang="ja">が</span>.</div>` },

  { for: ["he", "ni"], html: () => `
    <h2><span lang="ja">へ</span> vs <span lang="ja">に</span> — the journey or the landing?</h2>
    <p class="muted">With <b lang="ja">${ruby("行[い]く")}・${ruby("来[く]る")}・${ruby("帰[かえ]る")}</b> both work and mean the same thing. The difference is only what you picture.</p>
    <div class="compare">
      <div class="cmp" style="--c:${ROLES.dir.color}">
        <div class="cmp-pic">${particleSVG("he")}</div>
        <div class="cmp-s" lang="ja"><span class="new" data-tag="DIRECTION">${ruby("東京[とうきょう]")}<span class="hl">へ</span></span><span class="old">${ruby("行[い]きます")}</span></div>
        <div class="cmp-en">“I'm heading <b>toward</b> Tokyo.”</div>
        <p class="small"><b>へ</b>: the arrow — you're on your way, facing that direction.</p>
      </div>
      <div class="cmp" style="--c:${ROLES.point.color}">
        <div class="cmp-pic">${particleSVG("ni")}</div>
        <div class="cmp-s" lang="ja"><span class="new" data-tag="ARRIVAL POINT">${ruby("東京[とうきょう]")}<span class="hl">に</span></span><span class="old">${ruby("行[い]きます")}</span></div>
        <div class="cmp-en">“I'm going <b>to</b> Tokyo.”</div>
        <p class="small"><b>に</b>: the pin — you land exactly there.</p>
      </div>
    </div>
    <div class="step-label">Only <span lang="ja">に</span> works here — there's no movement, so there's no direction</div>
    <ul class="only-list" style="--c:${ROLES.point.color}">
      <li><span class="use-label">Exact time</span><span lang="ja">${rich("7時[しちじ]{に}起[お]きます。")}</span>${notPill("へ")}</li>
      <li><span class="use-label">Recipient</span><span lang="ja">${rich("友達[ともだち]{に}あげます。")}</span>${notPill("へ")}</li>
      <li><span class="use-label">Where something is</span><span lang="ja">${rich("部屋[へや]{に}猫[ねこ]がいます。")}</span>${notPill("へ")}</li>
    </ul>
    <div class="tip" style="--c:${ROLES.dir.color}"><b>Rule of thumb</b> Not sure? Use <span lang="ja">に</span> — it's right in every case above. <span lang="ja">へ</span> only ever goes with movement.</div>` },

  { for: ["de", "ni"], html: () => `
    <h2><span lang="ja">で</span> vs <span lang="ja">に</span> for places — doing or being?</h2>
    <p class="muted">Same place, different particle. Look at the <b>verb</b>: is something happening there, or is something just there?</p>
    <div class="compare">
      <div class="cmp" style="--c:${ROLES.place.color}">
        <div class="cmp-pic">${particleSVG("de")}</div>
        <div class="cmp-s" lang="ja"><span class="new" data-tag="WHERE IT HAPPENS">${ruby("図書館[としょかん]")}<span class="hl">で</span></span><span class="old">${ruby("勉強[べんきょう]します")}</span></div>
        <div class="cmp-en">“I <b>study</b> at the library.”</div>
        <p class="small"><b>で</b>: the stage — an action takes place there (study, eat, work, play).</p>
      </div>
      <div class="cmp" style="--c:${ROLES.point.color}">
        <div class="cmp-pic">${particleSVG("ni")}</div>
        <div class="cmp-s" lang="ja"><span class="new" data-tag="WHERE IT IS">${ruby("図書館[としょかん]")}<span class="hl">に</span></span><span class="old">${ruby("います")}</span></div>
        <div class="cmp-en">“I'm <b>at</b> the library.”</div>
        <p class="small"><b>に</b>: the pin — someone or something simply is there (いる, ある, live).</p>
      </div>
    </div>
    <div class="step-label">Same place, sorted by the verb</div>
    <ul class="only-list">
      <li style="--c:${ROLES.place.color}"><span class="use-label">Doing → で</span><span lang="ja">${rich("公園[こうえん]{で}遊[あそ]びます。")}</span><span class="use-en">I play in the park.</span></li>
      <li style="--c:${ROLES.point.color}"><span class="use-label">Being → に</span><span lang="ja">${rich("公園[こうえん]{に}子供[こども]がいます。")}</span><span class="use-en">There are kids in the park.</span></li>
      <li style="--c:${ROLES.place.color}"><span class="use-label">Doing → で</span><span lang="ja">${rich("東京[とうきょう]{で}働[はたら]いています。")}</span><span class="use-en">I work in Tokyo.</span></li>
      <li style="--c:${ROLES.point.color}"><span class="use-label">Being → に</span><span lang="ja">${rich("東京[とうきょう]{に}住[す]んでいます。")}</span><span class="use-en">I live in Tokyo.</span></li>
    </ul>
    <div class="tip" style="--c:${ROLES.place.color}"><b>Rule of thumb</b> <span lang="ja">いる・ある・${ruby("住[す]む")}</span> → <span lang="ja">に</span>. Almost every other verb → <span lang="ja">で</span>.</div>` },

  { for: ["mo"], html: () => `
    <h2>Where does <span lang="ja">も</span> go?</h2>
    <p class="muted"><span lang="ja">も</span> <b>replaces</b> three particles, but <b>stacks after</b> all the others.</p>
    <div class="compare">
      <div class="cmp" style="--c:${ROLES.also.color}">
        <div class="cmp-head">Swap: <span lang="ja">は・が・を</span> → <span lang="ja">も</span></div>
        <p class="small">The old particle disappears.</p>
        <ul class="mo-list">
          ${moRow("私[わたし]", "は", "学生[がくせい]です。", "I'm a student too.", true)}
          ${moRow("パン", "を", "食[た]べます。", "I eat bread too.", true)}
          ${moRow("犬[いぬ]", "が", "好[す]きです。", "I like dogs too.", true)}
        </ul>
      </div>
      <div class="cmp" style="--c:${ROLES.also.color}">
        <div class="cmp-head">Stack: <span lang="ja">に・で・へ・と</span> + <span lang="ja">も</span></div>
        <p class="small">The old particle stays, and <span lang="ja">も</span> goes right after it.</p>
        <ul class="mo-list">
          ${moRow("京都[きょうと]", "に", "行[い]きました。", "I went to Kyoto too.", false)}
          ${moRow("家[いえ]", "で", "勉強[べんきょう]します。", "I study at home too.", false)}
          ${moRow("先生[せんせい]", "と", "話[はな]しました。", "I talked with the teacher too.", false)}
        </ul>
      </div>
    </div>
    <div class="tip" style="--c:${ROLES.also.color}"><b>Never</b> <span lang="ja">はも・がも・をも</span>. But <span lang="ja">にも・でも・へも・とも</span> are all fine.</div>` },
];

function renderParticles() {
  $("#particles").innerHTML = `
    <div class="card hero">
      <h1>Particles are <span class="accent">tags</span></h1>
      <p>A particle comes <b>after</b> a word and tells you what job that word does in the sentence.
      Each one has a picture — learn the picture, and the uses follow from it.</p>
    </div>

    <div class="ptiles">
      ${PARTICLES.map((p) => `
        <button class="ptile" data-id="${p.id}" style="--c:${ROLES[p.role].color}">
          <span class="ptile-p" lang="ja">${p.p}</span>
          <span class="ptile-n">${p.name}</span>
        </button>`).join("")}
    </div>

    <div class="card pdetail" id="pDetail"></div>

    <div id="pCompare"></div>`;

  $$(".ptile").forEach((b) => (b.onclick = () => { track("explore.particles"); showParticle(b.dataset.id, true); }));
  showParticle(currentParticle);
}

function showParticle(id, scroll) {
  currentParticle = id;
  const p = PARTICLES.find((x) => x.id === id);
  const r = ROLES[p.role];
  $$(".ptile").forEach((b) => b.classList.toggle("active", b.dataset.id === id));
  const d = $("#pDetail");
  d.style.setProperty("--c", r.color);
  d.innerHTML = `
    <div class="pd-visual">
      <div class="pd-big" lang="ja">${p.p}</div>
      <div class="pd-read">“${p.read}”</div>
      ${particleSVG(p.id)}
      <div class="pd-caption">${p.caption}</div>
    </div>
    <div class="pd-body">
      <div class="pd-name">${p.name}</div>
      <p class="pd-idea">${p.idea}</p>
      <ul class="uses">
        ${p.uses.map((u) => `
          <li>
            <div class="use-label">${u.label}</div>
            <div class="use-ex" lang="ja">${rich(u.ex)}</div>
            <div class="use-en">${u.en}</div>
          </li>`).join("")}
      </ul>
      <div class="tip"><b>Tip</b> ${p.tip}</div>
    </div>`;
  d.classList.remove("enter");
  void d.offsetWidth; // restart the entry animation
  d.classList.add("enter");

  $("#pCompare").innerHTML = PARTICLE_BOXES
    .filter((b) => b.for.includes(id))
    .map((b) => `<div class="card">${b.html()}</div>`)
    .join("");

  if (scroll && d.getBoundingClientRect().top > window.innerHeight * 0.6) {
    d.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/* ---------------------------------------------------------------- Verbs */

let verbIdx = 0;
let verbForm = "masu";

function renderVerbs() {
  const groupChips = Object.entries(GROUPS).map(([g, info]) => `
    <div class="vgroup" style="--gc:${info.color}">
      <div class="vgroup-head"><span class="gbadge">${info.label}</span><span class="muted small">${info.alt} — ${info.blurb}</span></div>
      <div class="chips">
        ${VERBS.map((v, i) => v.group === g ? `<button class="chip" data-v="${i}" lang="ja">${ruby(v.w)}</button>` : "").join("")}
      </div>
    </div>`).join("");

  $("#verbs").innerHTML = `
    <div class="card hero">
      <h1>Verbs change their <span class="accent">ending</span></h1>
      <p>Every Japanese verb belongs to one of three groups, and the group tells you how the ending changes.
      Pick a verb and a form, and watch it transform.</p>
    </div>

    <div class="card">
      <div class="step-label">1 · Pick a verb</div>
      <div class="vgroups">${groupChips}</div>
      <div class="step-label">2 · Pick a form</div>
      <div class="chips" id="formChips">
        ${FORMS.map((f) => `<button class="chip form" data-f="${f.id}">${f.label}</button>`).join("")}
      </div>
      <div id="conjOut" class="conj-out"></div>
    </div>

    <div class="grid2">
      <div class="card" id="formTable"></div>
      <div class="card">
        <h2>Which group is my verb?</h2>
        <div class="flow">
          <div class="fnode">Is it <b lang="ja">する</b> or <b lang="ja">${ruby("来[く]る")}</b>?</div>
          <div class="fside"><span class="yes">yes</span><span class="fres" style="--gc:var(--g-irr)">Irregular</span></div>
          <div class="fdown">no ↓</div><div></div>
          <div class="fnode">Does it end in <b lang="ja">る</b>?</div>
          <div class="fside"><span class="no">no</span><span class="fres" style="--gc:var(--g-godan)">Godan</span></div>
          <div class="fdown">yes ↓</div><div></div>
          <div class="fnode">Is the sound right before る an <b>i</b> or <b>e</b> sound?
            <div class="small muted" lang="ja">た<u>べ</u>る · <u>み</u>る · お<u>き</u>る</div></div>
          <div class="fside"><span class="no">no</span><span class="fres" style="--gc:var(--g-godan)">Godan</span><span class="small muted" lang="ja">わかる・のる</span></div>
          <div class="fdown">yes ↓</div><div></div>
          <div class="fnode end"><span class="fres" style="--gc:var(--g-ichi)">Ichidan</span> — almost always!</div><div></div>
        </div>
        <p class="small muted" lang="ja">Sneaky godan verbs that look ichidan: ${["帰[かえ]る", "入[はい]る", "走[はし]る", "知[し]る", "切[き]る", "要[い]る"].map(ruby).join("、")}</p>
        <button class="lp-link vq-go" data-vq="group">Test yourself: which group? ↓</button>
      </div>
    </div>

    <div class="card lquiz pr-card vquiz" id="vqCard">
      <div class="rl-head"><span class="rl-kicker">⚡ Test yourself</span></div>
      <div class="pr-controls">
        <div class="seg pr-seg" id="vqMode">
          ${Object.entries(VERB_QUIZ).map(([id, k]) => `<button data-m="${id}">${k.name}</button>`).join("")}
        </div>
        <label class="ai-focus small" id="vqFocusBox">Focus on <select id="vqFocus">
          <option value="">Every form</option>
          ${FORMS.filter((f) => f.id !== "dict").map((f) => `<option value="${f.id}">${f.label}</option>`).join("")}
        </select></label>
      </div>
      <div class="scorebar">
        <span>Score <b id="vqScore">0 / 0</b></span>
        <span>Streak <b id="vqStreak">0</b></span>
      </div>
      <div id="vqBox"></div>
      <div class="q-actions"><button class="btn primary" id="vqNext" hidden>Next question →</button></div>
    </div>

    <div class="card" id="keigoCard">
      <h2>Polite language: respectful and humble</h2>
      <p>Who's doing the action decides which one you use. <b>Respectful</b> (尊敬語) lifts up someone else who's doing it.
      <b>Humble</b> (謙譲語) lowers you when you're the one doing it.</p>
      <div class="grid2">
        <div class="keigo-rule">
          <div class="step-label">Respectful, with most verbs</div>
          <div class="keigo-formula" lang="ja">お + ます-stem + になる</div>
          <div lang="ja">${ruby("先生[せんせい]はもうお帰[かえ]りになりました。")}</div>
          <div class="muted small">The teacher has already gone home.</div>
          <div class="muted small">The passive form also works as respectful: ${ruby("帰[かえ]られました")}.</div>
        </div>
        <div class="keigo-rule">
          <div class="step-label">Humble, with most verbs</div>
          <div class="keigo-formula" lang="ja">お + ます-stem + する</div>
          <div lang="ja">${ruby("荷物[にもつ]をお持[も]ちします。")}</div>
          <div class="muted small">Let me carry your bag.</div>
          <div class="muted small">Only for something you do for the other person.</div>
        </div>
      </div>
      <div class="step-label">Verbs with their own special word</div>
      <div class="table-wrap">
        <table class="ftable keigo-table">
          <tr><th>Normal</th><th>Respectful</th><th>Humble</th></tr>
          ${KEIGO.map((k) => `<tr>
            <td lang="ja">${ruby(k.w)} <span class="muted small" lang="en">${k.en}</span></td>
            <td lang="ja">${ruby(k.up)}</td>
            <td lang="ja">${ruby(k.down)}</td>
          </tr>`).join("")}
        </table>
      </div>
      <button class="lp-link vq-go" data-vq="keigo">Practise these ↑</button>
    </div>`;

  $$("#verbs [data-v]").forEach((b) => (b.onclick = () => { track("explore.verbs"); verbIdx = +b.dataset.v; updateVerb(); }));
  $$("#verbs [data-f]").forEach((b) => (b.onclick = () => { track("explore.verbs"); verbForm = b.dataset.f; updateVerb(); }));
  $$("#vqMode button").forEach((b) => (b.onclick = () => setVerbQuiz(b.dataset.m)));
  $$("#verbs [data-vq]").forEach((b) => (b.onclick = () => { setVerbQuiz(b.dataset.vq); scrollBelowBar($("#vqCard")); }));
  $("#vqFocus").onchange = (e) => setVerbQuiz("forms", e.target.value);
  $("#vqNext").onclick = nextVerbQuizQ;
  updateVerb();
  setVerbQuiz(verbQuiz.mode, verbQuiz.focus);
}

// "Test yourself" on the Verbs page: verb forms (the same questions as the Practice tab's quick
// quiz), which group a verb is in, and the special polite-language words.
const verbQuiz = { mode: "forms", focus: "", score: 0, total: 0, streak: 0, groupDeck: [], lastKeigo: null };

const VERB_QUIZ = {
  forms: { name: "Verb forms", track: "quiz.verbs", make: () => ({ ...makeVerbQ(verbQuiz.focus || undefined), kind: "Build the verb form" }) },
  group: { name: "Which group?", track: "quiz.verbgroups", make: () => makeGroupQ() },
  keigo: { name: "Polite language", track: "quiz.keigo", make: () => makeKeigoQ() },
};

// focus: a form to stick to, only for the verb forms.
function setVerbQuiz(mode, focus = "") {
  Object.assign(verbQuiz, { mode, focus: mode === "forms" ? focus : "" });
  $$("#vqMode button").forEach((b) => b.classList.toggle("active", b.dataset.m === mode));
  $("#vqFocusBox").hidden = mode !== "forms";
  $("#vqFocus").value = verbQuiz.focus;
  nextVerbQuizQ();
}

function makeGroupQ() {
  const vq = verbQuiz;
  // From a shuffled deck, so every verb comes up once before any repeats.
  if (!vq.groupDeck.length) vq.groupDeck = shuffle(GROUP_QUIZ.slice());
  const v = vq.groupDeck.pop();
  const g = GROUPS[v.group];
  const nai = conjugate(v, "nai");
  return {
    kind: "Which group is it in?",
    wide: true,
    prompt: `<div class="q-sentence" lang="ja">${ruby(v.w)}</div>${hintEn(`“to ${v.en}”`)}`,
    options: Object.entries(GROUPS).map(([id, info]) => ({
      html: `<span class="gbadge" style="--gc:${info.color}">${info.label}</span> <span class="small muted">${info.alt}</span>`,
      lang: "en",
      correct: id === v.group,
    })),
    reveal: () => {},
    feedback: () => `<div class="fb-verb" style="--gc:${g.color}">
        <div class="small muted">Its ない-form</div>
        <div class="conj-word" lang="ja">${partsHTML(nai.parts)}</div>
        <p><span class="gbadge">${g.label}</span> ${groupWhy(v)}</p>
        ${v.note ? `<div class="note">${v.note}</div>` : ""}
      </div>`,
  };
}

// A verb from the polite-language table, and its respectful or humble word. The usual mistake is
// mixing the two up, so the other one is always among the wrong answers when there is one.
function makeKeigoQ() {
  const vq = verbQuiz;
  const asks = KEIGO.flatMap((k) => ["up", "down"].filter((d) => k[d] !== "—").map((d) => [k, d]))
    .filter(([k, d]) => `${k.w}${d}` !== vq.lastKeigo);
  const [k, dir] = pick(asks);
  vq.lastKeigo = `${k.w}${dir}`;
  const up = dir === "up";
  const right = k[dir];
  const other = k[up ? "down" : "up"];
  const words = KEIGO.flatMap((x) => [x.up, x.down]).filter((w) => w !== "—" && w !== right);
  const wrong = pickWrong(right, other !== "—" ? [other] : [], words).map((w) => w.text);
  return {
    kind: "Pick the polite word",
    prompt: `<div class="q-sentence" lang="ja">${ruby(k.w)} <span class="arrow">→</span> <span class="q-form">${up ? "Respectful" : "Humble"}</span></div>
      <div class="small muted">${up ? "Someone you look up to does it." : "You do it, for someone you look up to."}</div>
      ${hintEn(`“${k.en}”`)}`,
    options: shuffle([right, ...wrong]).map((o) => ({ html: ruby(o), correct: o === right })),
    reveal: () => {},
    feedback: () => `<div class="fb-keigo">
        <table class="ftable keigo-table">
          <tr><th>Normal</th><th>Respectful</th><th>Humble</th></tr>
          <tr>
            <td lang="ja">${ruby(k.w)} <span class="muted small" lang="en">${k.en}</span></td>
            <td lang="ja"${up ? ' class="on"' : ""}>${ruby(k.up)}</td>
            <td lang="ja"${up ? "" : ' class="on"'}>${ruby(k.down)}</td>
          </tr>
        </table>
        <p class="small">${up
          ? "<b>Respectful</b> (尊敬語) lifts up the other person when they're the one doing it."
          : "<b>Humble</b> (謙譲語) lowers you when you're the one doing it."}</p>
      </div>`,
  };
}

function nextVerbQuizQ() {
  const vq = verbQuiz;
  const type = VERB_QUIZ[vq.mode];
  $("#vqNext").hidden = true;
  askIn($("#vqBox"), type.make(), (ok, b) => {
    track(type.track);
    vq.total++;
    if (ok) { vq.score++; vq.streak++; addXP(XP.practice, b); } else vq.streak = 0;
    $("#vqScore").textContent = `${vq.score} / ${vq.total}`;
    $("#vqStreak").textContent = vq.streak;
    $("#vqNext").hidden = false;
    $("#vqNext").focus({ preventScroll: true });
  });
}

function updateVerb() {
  const v = VERBS[verbIdx];
  const f = FORM[verbForm];
  const g = GROUPS[v.group];
  const dict = conjugate(v, "dict");
  const c = conjugate(v, verbForm);

  $$("#verbs [data-v]").forEach((b) => b.classList.toggle("active", +b.dataset.v === verbIdx));
  $$("#verbs [data-f]").forEach((b) => b.classList.toggle("active", b.dataset.f === verbForm));

  const out = $("#conjOut");
  out.style.setProperty("--gc", g.color);
  out.innerHTML = `
    <div class="conj-display">
      <div class="conj-word" lang="ja">${partsHTML(dict.parts)}</div>
      <div class="conj-arrow"><span>→</span><small>${f.label}</small></div>
      <div class="conj-word big" lang="ja">${partsHTML(c.parts)}</div>
    </div>
    <div class="conj-meaning"><span class="gbadge">${g.label}</span> “${f.meaning.replace(/\{v\}/g, v.en)}”</div>
    <p class="conj-explain">${c.explain}</p>
    ${v.note ? `<div class="note">${v.note}</div>` : ""}
    ${f.note ? `<div class="note" lang="en">${f.note}</div>` : ""}
    <div class="conj-viz">${vizHTML(c.viz, v)}</div>
    ${verbForm === "dict" ? "" : `<button class="lp-link" id="vqThisForm">Test yourself on the ${f.label} ↓</button>`}`;
  const test = $("#vqThisForm");
  if (test) test.onclick = () => { setVerbQuiz("forms", verbForm); scrollBelowBar($("#vqCard")); };

  $("#formTable").innerHTML = `
    <h2>All forms of <span lang="ja">${ruby(v.w)}</span></h2>
    <table class="ftable">
      ${FORMS.map((x) => {
        const r = conjugate(v, x.id);
        return `<tr data-f="${x.id}" class="${x.id === verbForm ? "on" : ""}">
          <th>${x.label}</th>
          <td lang="ja">${partsHTML(r.parts)}</td>
          <td class="muted small">${x.meaning.replace(/\{v\}/g, v.en).replace(/ \(.*\)$/, "")}</td>
        </tr>`;
      }).join("")}
    </table>`;
  $("#formTable").style.setProperty("--gc", g.color);
  $$("#formTable tr").forEach((tr) => (tr.onclick = () => { track("explore.verbs"); verbForm = tr.dataset.f; updateVerb(); }));
}

function vizHTML(z, v) {
  if (z.type === "row") {
    const cell = (e, i) => {
      const cls = [];
      if (i === z.vowel) cls.push("col-on");
      if (e === z.end && i === 2) cls.push("from");
      if (e === z.end && i === z.vowel) cls.push("to");
      return `<td class="${cls.join(" ")}">${ROWS[e][i]}</td>`;
    };
    return `
      <div class="viz-title">The ending slides through the kana chart</div>
      <div class="table-wrap">
        <table class="gojuon" lang="ja">
          <thead><tr><th class="corner">ends in</th>${VOWELS.map((x, i) => `<th class="${i === z.vowel ? "col-on" : ""}">${x}</th>`).join("")}</tr></thead>
          <tbody>
            ${Object.keys(ROWS).map((e) => `<tr class="${e === z.end ? "row-on" : ""}"><th>${e}</th>${ROWS[e].map((_, i) => cell(e, i)).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
      <p class="viz-note">Row = the verb's last kana (<b lang="ja">${z.end}</b>). Column = the vowel the form needs (<b>${VOWELS[z.vowel]}</b>).
      ${z.vowel === 2 ? "Dictionary form sits in the u-column — that's home base." : ""}</p>`;
  }

  if (z.type === "te") {
    const ta = verbForm === "ta";
    const examples = (g) => VERBS
      .filter((x) => x.group === "godan" && !x.teException && !x.extra && g.ends.includes(x.w.slice(-1)))
      .map((x) => `${ruby(x.w)} → ${ruby(conjugate(x, ta ? "ta" : "te").result)}`).join("　");
    return `
      <div class="viz-title">The ${ta ? "た" : "て"}-form sound-change chart</div>
      <div class="techart" lang="ja">
        ${TE_GROUPS.map((g) => `
          <div class="te-row ${!z.exception && g.ends.includes(z.end) ? "on" : ""}">
            <div class="te-ends">${g.ends.map((e) => `<span class="${e === z.end && !z.exception ? "me" : ""}">${e}</span>`).join("")}</div>
            <div class="te-arrow">→</div>
            <div class="te-res">${ta ? toTa(g.te) : g.te}</div>
            <div class="te-ex">${examples(g)}</div>
          </div>`).join("")}
        <div class="te-row exc ${z.exception ? "on" : ""}">
          <div class="te-ends"><span class="${z.exception ? "me" : ""}">${ruby("行[い]く")}</span></div>
          <div class="te-arrow">→</div>
          <div class="te-res">${ruby(ta ? "行[い]った" : "行[い]って")}</div>
          <div class="te-ex">the one exception</div>
        </div>
      </div>
      <p class="viz-note">${ta ? "The た-form uses exactly the same chart — just swap て→た and で→だ." : "Chant it: う・つ・る → って, む・ぶ・ぬ → んで, く → いて, ぐ → いで, す → して."}</p>`;
  }

  if (z.type === "drop") {
    return `
      <div class="viz-title">Ichidan: snip, then attach</div>
      <div class="dropviz" lang="ja">
        <span class="dv stem">${ruby(z.stem)}</span>
        <span class="dv ru">る<span class="snip">✂</span></span>
        <span class="dv plus">+</span>
        <span class="dv suf">${z.suffix}</span>
      </div>
      <p class="viz-note">The stem <b lang="ja">${ruby(z.stem)}</b> stays exactly the same in every form.</p>`;
  }

  if (z.type === "irregular") {
    return `
      <div class="viz-title">The two irregular verbs side by side</div>
      <table class="ftable irr" lang="ja">
        <tr><th></th><th>する <span class="muted small">do</span></th><th>${ruby("来[く]る")} <span class="muted small">come</span></th></tr>
        ${FORMS.map((f) => `
          <tr class="${f.id === verbForm ? "on" : ""}">
            <th>${f.label}</th>
            <td><span class="vp change">${ruby(IRREGULAR["する"][f.id][0])}</span>${IRREGULAR["する"][f.id][1]}</td>
            <td><span class="vp change">${ruby(IRREGULAR["来[く]る"][f.id][0])}</span>${IRREGULAR["来[く]る"][f.id][1]}</td>
          </tr>`).join("")}
      </table>
      <p class="viz-note">Watch the reading of <span lang="ja">来</span>: き・こ・く. That's the part to memorize.</p>`;
  }

  if (z.type === "add") return `<p class="viz-note">This works the same way for all three verb groups.</p>`;

  return `<p class="viz-note">Ichidan verbs always end in <b lang="ja">る</b>. Pick a form above to see it change.</p>`;
}

/* ---------------------------------------------------------------- Adjectives */

const adjState = { i: 0, na: 0, polite: false };

function adjForms(a, type, polite) {
  if (type === "i") {
    const base = a.w.slice(0, -1);
    const stem = a.irregular ? "よ" : base;
    const d = polite ? "です" : "";
    return {
      pp: [base, "い", d], pn: [stem, "くない", d], tp: [stem, "かった", d], tn: [stem, "くなかった", d],
    };
  }
  return polite
    ? { pp: [a.w, "です", ""], pn: [a.w, "じゃありません", ""], tp: [a.w, "でした", ""], tn: [a.w, "じゃありませんでした", ""] }
    : { pp: [a.w, "だ", ""], pn: [a.w, "じゃない", ""], tp: [a.w, "だった", ""], tn: [a.w, "じゃなかった", ""] };
}

function renderAdjectives() {
  $("#adjectives").innerHTML = `
    <div class="card hero">
      <h1>Two kinds of <span class="accent">adjectives</span></h1>
      <p><b lang="ja">い</b>-adjectives conjugate themselves — the ending changes like a verb.
      <b lang="ja">な</b>-adjectives never change; the little word after them (<span lang="ja">だ / です</span>) does the work.</p>
      <label class="switch inline">
        <input type="checkbox" id="politeToggle" ${adjState.polite ? "checked" : ""}>
        <span class="switch-track"><span class="switch-thumb"></span></span>
        <span>Polite (です) forms</span>
      </label>
    </div>
    <div class="grid2">
      <div class="card adj-card" id="adj-i"></div>
      <div class="card adj-card" id="adj-na"></div>
    </div>`;
  $("#politeToggle").onchange = (e) => { track("explore.adjectives"); adjState.polite = e.target.checked; drawAdj("i"); drawAdj("na"); };
  drawAdj("i");
  drawAdj("na");
}

function drawAdj(type) {
  const T = ADJECTIVES[type];
  const a = T.list[adjState[type]];
  const f = adjForms(a, type, adjState.polite);
  const stemCls = (s) => (a.irregular && s === "よ" ? "change" : "stem");
  const cell = ([s, e, d]) =>
    `<span class="vp ${stemCls(s)}">${ruby(s)}</span><span class="vp suffix">${e}</span>${d ? `<span class="vp end">${d}</span>` : ""}`;
  const before = type === "i"
    ? `<span class="vp stem">${ruby(a.w.slice(0, -1))}</span><span class="vp suffix">い</span> ${ruby(a.noun)}`
    : `<span class="vp stem">${ruby(a.w)}</span><span class="vp suffix">な</span> ${ruby(a.noun)}`;

  const el = $("#adj-" + type);
  el.style.setProperty("--gc", T.color);
  el.innerHTML = `
    <h2><span class="gbadge">${T.label}</span></h2>
    <div class="chips">
      ${T.list.map((x, i) => `<button class="chip ${i === adjState[type] ? "active" : ""}" data-a="${i}" lang="ja">${ruby(x.w)}</button>`).join("")}
    </div>
    <div class="adj-word" lang="ja">${ruby(a.w)} <span class="muted small">${a.en}</span></div>
    <div class="adj-grid" lang="ja">
      <div></div><div class="ah">Present</div><div class="ah">Past</div>
      <div class="ah side">Positive</div><div class="acell">${cell(f.pp)}</div><div class="acell past">${cell(f.tp)}</div>
      <div class="ah side">Negative</div><div class="acell neg">${cell(f.pn)}</div><div class="acell neg past">${cell(f.tn)}</div>
    </div>
    <div class="pattern-line" lang="ja">${T.pattern}</div>
    <div class="before-noun">
      <div class="step-label">Before a noun</div>
      <div class="bn" lang="ja">${before}</div>
      <div class="muted small">a ${a.short} ${a.nounEn}</div>
    </div>
    ${a.note ? `<div class="note">${a.note}</div>` : ""}
    ${type === "na" && adjState.polite ? `<p class="small muted">Also common: <span lang="ja">じゃないです / ではありません</span>.</p>` : ""}`;
  $$("[data-a]", el).forEach((b) => (b.onclick = () => { track("explore.adjectives"); adjState[type] = +b.dataset.a; drawAdj(type); }));
}

/* ---------------------------------------------------------------- Verb patterns */

const PATTERN_BASE_LABEL = {
  te: "Built on the <b>て-form</b>",
  stem: "Built on the <b>ます-form minus ます</b>",
  nai: "Built on the <b>ない-form minus ない</b>",
  naif: "Built on the whole <b>ない-form</b>",
  dict: "Built on the <b>dictionary form</b>",
  ta: "Built on the <b>た-form</b>",
  plain: "Built on the <b>plain form</b> (shown here in the present)",
  vol: "Built on the <b>volitional form</b>",
};

const BASE_NAME = { te: "て-form", stem: "ます-stem", nai: "ない-form minus ない", naif: "ない-form", dict: "dictionary form", ta: "た-form", plain: "plain form", vol: "volitional form" };

// The verb part a pattern attaches to, as display parts from conjugate().
// `group` can be overridden to build wrong answers for the quiz.
function patternBase(v, base, group = v.group) {
  if (base === "dict" || base === "plain") return [{ m: v.w, cls: "stem" }];
  if (base === "te" || base === "ta" || base === "vol") return conjugate(v, base, group).parts;
  if (base === "naif") return conjugate(v, "nai", group).parts;
  return conjugate(v, base === "stem" ? "masu" : "nai", group).parts.slice(0, -1); // drop ます / ない
}
const partsText = (parts) => parts.filter((p) => p.cls !== "drop").map((p) => p.m).join("");
const patEn = (p, v) => p.en.replace("{v}", v.en).replace("{v}", v.en).replace("{ing}", v.ing).replace("{pp}", v.pp);

let patVerb = 0;

function renderPatterns() {
  const inGroup = (g) => VERB_PATTERNS.filter((p) => patGroupOf(p) === g.id).sort((a, b) => a.lesson - b.lesson);
  $("#patterns").innerHTML = `
    <div class="card hero">
      <h1>Verb <span class="accent">patterns</span>: snap an ending onto a verb</h1>
      <p>Most grammar patterns are just <b>a verb form + a fixed ending</b>. The verb part changes;
      the pattern part never does. Here are the ${VERB_PATTERNS.length} main ones from Minna no Nihongo, grouped by the
      verb form they need. Open any of them to see how it works.</p>
      <div class="pat-nav">
        ${PATTERN_GROUPS.map((g) => `<button class="pat-jump" data-jump="${g.id}" style="--pc:${g.color}" lang="ja">${g.label} <span class="pat-count">${inGroup(g).length}</span></button>`).join("")}
      </div>
      <input type="search" class="pat-search" id="patSearch" placeholder="Search in English or Japanese: must, because, ている…" aria-label="Search the patterns">
      <p class="small muted pat-found" id="patFound" hidden></p>
      <p class="small muted pat-cmp-hint">Mixing up similar ones? <button class="pat-cmp-link" id="patCmpLink">See “Which one do I use?” ↓</button></p>
    </div>

    <div class="card pat-picker">
      <div class="step-label">Pick a verb — every pattern below updates</div>
      <div class="pat-vgroups">
        ${Object.entries(GROUPS).map(([g, info]) => `
          <div class="chips pat-vgroup" style="--gc:${info.color}">
            <span class="pat-vgroup-name">${info.label}</span>
            ${VERBS.map((v, i) => v.group === g && !v.extra ? `<button class="chip" data-pv="${i}" lang="ja">${ruby(v.w)}</button>` : "").join("")}
          </div>`).join("")}
      </div>
    </div>

    ${PATTERN_GROUPS.map((g) => `
      <section class="pat-group" id="patg-${g.id}" style="--pc:${g.color}">
        <h2 lang="ja">${g.label}</h2>
        <p class="muted small" lang="ja">${g.about}</p>
      </section>
      ${inGroup(g).map(patternCardHTML).join("")}`).join("")}

    ${compareCardHTML()}`;

  $$("#patterns [data-pv]").forEach((b) => (b.onclick = () => { track("explore.patterns"); patVerb = +b.dataset.pv; updatePatternVerb(); }));
  $$("#cmpCard [data-cmp]").forEach((b) => (b.onclick = () => showCompare(b.dataset.cmp)));
  $$("#patterns [data-practice]").forEach((b) => (b.onclick = () => practicePattern(b.dataset.practice)));
  $$("#patterns [data-see-cmp]").forEach((b) => (b.onclick = () => jumpToCompare(`<span lang="ja">${$(".pat-title", b.closest(".pat-card")).innerHTML}</span>`, b.dataset.seeCmp)));
  wireCompareBack();
  $("#patSearch").oninput = filterPatterns;
  $("#patCmpLink").onclick = () => jumpToCompare("the top");
  $$("#patterns [data-jump]").forEach((b) => (b.onclick = () => {
    const head = $("#patg-" + b.dataset.jump);
    const picker = $(".pat-picker");
    const offset = barHeight() + (getComputedStyle(picker).position === "sticky" ? picker.offsetHeight : 0) + 16;
    window.scrollTo({ top: head.getBoundingClientRect().top + scrollY - offset, behavior: "smooth" });
  }));
  updatePatternVerb();
}

// Everything a search can match on a card.
const patSearchText = (p) => [
  plain(p.title), kana(p.title), p.tag || "", plain(p.ending), kana(p.ending), p.name, p.meaning, p.en.replace(/\{\w+\}/g, ""),
  ...p.forms.flatMap((f) => [plain(f.e), kana(f.e), f.m]),
].join(" ").toLowerCase();

function filterPatterns() {
  const words = $("#patSearch").value.toLowerCase().replace(/[〜~]/g, " ").split(/\s+/).filter(Boolean);
  let found = 0;
  VERB_PATTERNS.forEach((p) => {
    const on = words.every((w) => patSearchText(p).includes(w));
    $("#pat-" + p.id).style.display = on ? "" : "none";
    if (on) found++;
  });
  PATTERN_GROUPS.forEach((g) => {
    const any = VERB_PATTERNS.some((p) => patGroupOf(p) === g.id && $("#pat-" + p.id).style.display !== "none");
    $("#patg-" + g.id).style.display = any ? "" : "none";
  });
  const note = $("#patFound");
  note.hidden = !words.length;
  note.textContent = found ? `${found} of ${VERB_PATTERNS.length} patterns match` : "Nothing matches. Try another word, like “want” or “たい”.";
}

function clearPatternSearch() {
  $("#patSearch").value = "";
  filterPatterns();
}

function patternCardHTML(p) {
  const literal = p.literal.map((b) => `
    <div class="lit-block${b.verb ? " verb" : ""}">
      <span class="lit-t" lang="ja">${ruby(b.t)}</span>
      <span class="lit-g">${b.g}</span>
    </div>`).join('<span class="fplus">+</span>');

  return `
    <details class="card pat-card" id="pat-${p.id}" style="--pc:${p.color}; --c:${p.color}">
      <summary class="pat-head">
        <span class="pat-title" lang="ja">${ruby(p.title)}</span>
        <div class="pat-sum"><div class="pd-name">${p.name}</div><div class="pat-meaning">${p.meaning}</div></div>
        <span class="pat-lesson">${p.tag ? `<span class="pat-tag">${p.tag}</span> ` : ""}Lesson ${p.lesson}</span>
      </summary>
      <div class="pat-top">
        <div class="pd-visual">
          <svg viewBox="0 0 220 115" class="psvg" aria-hidden="true">${PATTERN_SVG[p.id]}</svg>
          <div class="pd-caption">${p.caption}</div>
        </div>
        <div>
          <p class="pd-idea">${p.idea}</p>
          <div class="step-label">How it's built</div>
          <div class="lit-row">${literal}<span class="fplus">=</span><span class="lit-result">${p.literalResult}</span></div>
        </div>
      </div>
      <div class="step-label">Try it</div>
      <div class="pat-try" data-try="${p.id}"></div>
      <div class="step-label">Examples</div>
      <div class="pat-examples">
        ${p.examples.map((ex) => `
          <div class="pattern">
            <div class="use-label">${ex.label}</div>
            <div class="chunks compact">${ex.chunks.map(chunkHTML).join("")}</div>
            <div class="muted small">${ex.en}</div>
          </div>`).join("")}
      </div>
      <div class="pat-bottom">
        <div>
          <div class="step-label">Forms of the pattern</div>
          <table class="ftable pat-forms">
            ${p.forms.map((f) => `<tr><td lang="ja">${ruby(f.e)}</td><td class="muted small">${f.m}</td></tr>`).join("")}
          </table>
        </div>
        <div class="tip"><b>Tip</b> ${p.tip}</div>
      </div>
      <div class="pat-actions">
        <button class="btn primary" data-practice="${p.id}">Practice this →</button>
        ${COMPARISONS.filter((c) => c.patterns.includes(p.id)).map((c) => `<button class="btn" data-see-cmp="${c.id}">Compare: <span lang="ja">${ruby(c.title)}</span></button>`).join("")}
      </div>
    </details>`;
}

// Plain-form patterns take more than the present tense. One switch, shared by all those cards.
const PLAIN_TENSES = [["pres", "Present"], ["neg", "Negative"], ["past", "Past"], ["pneg", "Past negative"], ["iadj", "い-adj"], ["naadj", "な-adj"], ["noun", "Noun"]];
let patTense = "pres";

function plainTryHTML(p, v) {
  const nai = conjugate(v, "nai").parts;
  const join = PLAIN_JOIN[p.id];
  const withJoin = (m, j) => [{ m, cls: "stem" }, ...(j ? [{ m: j, cls: "suffix" }] : [])];
  const [parts, about] = {
    pres: () => [patternBase(v, "plain"), `“${patEn(p, v)}”`],
    neg: () => [nai, `The same pattern with “don't ${v.en}”`],
    past: () => [conjugate(v, "ta").parts, `The same pattern, about the past (“${v.en}” in the past)`],
    pneg: () => [[...nai.slice(0, -1), { m: "なかった", cls: "suffix" }], `The same pattern, with “didn't ${v.en}”`],
    iadj: () => [withJoin("高[たか]い"), "高い = expensive. い-adjectives join directly."],
    naadj: () => [withJoin("静[しず]か", join.na), `静か = quiet. ${join.na ? `な-adjectives need ${join.na} here.` : "な-adjectives join directly here, with no だ."}`],
    noun: () => [withJoin("雨[あめ]", join.n), `雨 = rain. ${join.n ? `Nouns need ${join.n} here.` : "Nouns join directly here, with no だ."}`],
  }[patTense]();
  return `
    <div class="pat-tenses">${PLAIN_TENSES.map(([id, label]) => `<button class="pat-tense${id === patTense ? " active" : ""}" data-tense="${id}" lang="ja">${label}</button>`).join("")}</div>
    <div class="conj-word" lang="ja" style="--gc:${GROUPS[v.group].color}">${partsHTML(parts)}<span class="vp pat">${ruby(p.ending)}</span></div>
    <div class="pat-try-en">${about}</div>`;
}

function updatePatternVerb() {
  const v = VERBS[patVerb];
  $$("#patterns [data-pv]").forEach((b) => b.classList.toggle("active", +b.dataset.pv === patVerb));
  VERB_PATTERNS.forEach((p) => {
    if (p.base === "plain") {
      $(`[data-try="${p.id}"]`).innerHTML = plainTryHTML(p, v);
      return;
    }
    $(`[data-try="${p.id}"]`).innerHTML = `
      <div class="conj-word" lang="ja" style="--gc:${GROUPS[v.group].color}">${partsHTML(patternBase(v, p.base))}<span class="vp pat">${ruby(p.ending)}</span></div>
      <div class="pat-try-en">“${patEn(p, v)}”</div>
      <div class="small muted" lang="ja">${PATTERN_BASE_LABEL[p.base]} · <span class="gbadge" style="--gc:${GROUPS[v.group].color}">${GROUPS[v.group].label}</span></div>`;
  });
  $$("#patterns [data-tense]").forEach((b) => (b.onclick = () => { track("explore.patterns"); patTense = b.dataset.tense; updatePatternVerb(); }));
}

/* ---------------------------------------------------------------- Practice */

// The questions the Practice tab's quick quiz and the lessons share. The tab itself is in
// practice-page.js. focus: one thing to ask about, or "" for everything.
const quiz = { mode: "particles", focus: "", q: null, score: 0, total: 0, streak: 0, best: store.get("best", 0), last: null, deck: null };

// A question's English stays folded behind a button until asked for, or until the question is answered.
const hintEn = (text) => `<details class="q-hint"><summary>Show translation</summary><div class="q-en">${text}</div></details>`;
const openHints = (box) => $$(".q-hint", box).forEach((d) => (d.open = true));

function makeParticleQ(focus) {
  // Deal from a shuffled deck so every question comes up once before any repeats.
  if (!quiz.deck || !quiz.deck.length) {
    quiz.deck = shuffle(PARTICLE_QUIZ.filter((q) => !focus || q.a === focus));
    if (quiz.deck[quiz.deck.length - 1] === quiz.last) quiz.deck.unshift(quiz.deck.pop());
  }
  const q = quiz.deck.pop();
  quiz.last = q;
  const blank = `<span class="blank" id="qBlank">？</span>`;
  return {
    prompt: `<div class="q-sentence" lang="ja">${ruby(q.s).replace("{_}", blank)}</div>${hintEn(q.en)}`,
    options: shuffle(q.opts.slice()).map((o) => ({ html: o, value: o, correct: o === q.a })),
    feedback: () => {
      const r = ROLES[PARTICLE_ROLE[q.a]];
      const p = PARTICLES.find((x) => x.p.includes(q.a));
      return `<div class="fb-grid" style="--c:${r.color}">
        ${p ? particleSVG(p.id) : ""}
        <div><p>${q.why}</p>${p ? `<p class="small muted">Picture: ${p.caption.toLowerCase()}.</p>` : ""}</div>
      </div>`;
    },
    reveal: () => {
      const b = $("#qBlank");
      b.textContent = q.a;
      b.classList.add("filled");
      b.style.setProperty("--c", ROLES[PARTICLE_ROLE[q.a]].color);
    },
  };
}

function makeVerbQ(formId) {
  const v = pick(VERBS);
  const f = formId ? FORM[formId] : pick(FORMS.filter((x) => x.id !== "dict"));
  const c = conjugate(v, f.id);
  const stem = v.w.slice(0, -1);

  // Wrong answers that mirror real learner mistakes: wrong group, wrong て-sound, wrong form.
  const likely = [];
  likely.push(conjugate(v, f.id, v.group === "godan" ? "ichidan" : "godan").result);
  if (v.group === "irregular") likely.push(conjugate(v, f.id, "ichidan").result);
  if (v.group === "godan" && (f.id === "te" || f.id === "ta")) {
    TE_GROUPS.forEach((g) => likely.push(stem + (f.id === "ta" ? toTa(g.te) : g.te)));
  }
  const others = FORMS.filter((x) => x.id !== f.id && x.id !== "dict").map((x) => conjugate(v, x.id).result);
  const wrong = pickWrong(c.result, likely, others).map((w) => w.text);

  const g = GROUPS[v.group];
  return {
    prompt: `<div class="q-sentence" lang="ja">${ruby(v.w)} <span class="arrow">→</span> <span class="q-form">${f.label}</span></div>
      ${hintEn(`“${f.meaning.replace(/\{v\}/g, v.en).replace(/ \(.*\)$/, "")}”`)}`,
    options: shuffle([c.result, ...wrong]).map((o) => ({ html: ruby(o), value: o, correct: o === c.result })),
    feedback: () => `<div class="fb-verb" style="--gc:${g.color}">
        <div class="conj-word" lang="ja">${partsHTML(c.parts)}</div>
        <p><span class="gbadge">${g.label}</span> ${c.explain}</p>
      </div>`,
    reveal: () => {},
  };
}

// Up to 3 distinct wrong answers: shuffled from `likely` first, topped up from `backup`.
// Candidates are strings or { text, why } objects. Two options count as duplicates if they share
// a reading or a written form (来[き]… and 来[こ]… look identical with furigana off).
function pickWrong(correct, likely, backup) {
  const seen = new Set([kana(correct), plain(correct)]);
  const wrong = [];
  for (const cand of [...shuffle(likely.slice()), ...shuffle(backup.slice())]) {
    const w = typeof cand === "string" ? { text: cand } : cand;
    if (wrong.length === 3) break;
    if (seen.has(kana(w.text)) || seen.has(plain(w.text))) continue;
    seen.add(kana(w.text)).add(plain(w.text));
    wrong.push(w);
  }
  return wrong;
}

// Build a pattern from a verb. Wrong answers attach the ending to the wrong verb form,
// or build the right form with the wrong group's rules.
function makePatternQ(patId) {
  const p = patId ? VERB_PATTERNS.find((x) => x.id === patId) : pick(VERB_PATTERNS);
  const v = pick(VERBS.filter((x) => !x.extra && !(p.not || []).includes(x.w)));
  const g = GROUPS[v.group];
  const other = v.group === "godan" ? "ichidan" : "godan";
  const build = (base, group) => partsText(patternBase(v, base, group)) + p.ending;
  const correct = build(p.base);

  // Plain-form patterns accept the dictionary form and the た-form, so neither can be a wrong answer.
  const notWrong = [p.base, ...(p.avoid || []), ...(p.base === "plain" ? ["dict", "ta"] : [])];
  const wrongBases = ["te", "stem", "nai", "dict", "ta"].filter((b) => !notWrong.includes(b));
  const likely = [
    ...wrongBases.map((b) => ({ text: build(b), why: `That uses the <b>${BASE_NAME[b]}</b>, but <b lang="ja">${patTitleHTML(p)}</b> needs the <b>${BASE_NAME[p.base]}</b>.` })),
    { text: build(p.base, other), why: `That's the ${BASE_NAME[p.base]} built with <b>${GROUPS[other].label}</b> rules — but <b lang="ja">${plain(v.w)}</b> is <b>${g.label}</b>.` },
  ];
  const backup = wrongBases.filter((b) => b !== "dict").map((b) => ({
    text: build(b, other), why: `That uses the wrong verb form <i>and</i> ${GROUPS[other].label} rules.`,
  }));
  const wrong = pickWrong(correct, likely, backup);

  const baseForm = {
    te: () => `て-form: <span lang="ja">${ruby(conjugate(v, "te").result)}</span>`,
    ta: () => `た-form: <span lang="ja">${ruby(conjugate(v, "ta").result)}</span>`,
    vol: () => `volitional: <span lang="ja">${ruby(conjugate(v, "vol").result)}</span>`,
    stem: () => `ます-form: <span lang="ja">${ruby(conjugate(v, "masu").result)}</span> → drop ます`,
    nai: () => `ない-form: <span lang="ja">${ruby(conjugate(v, "nai").result)}</span> → swap ない`,
    naif: () => `ない-form: <span lang="ja">${ruby(conjugate(v, "nai").result)}</span>`,
    dict: () => `dictionary form: <span lang="ja">${ruby(v.w)}</span>`,
    plain: () => `plain form: <span lang="ja">${ruby(v.w)}</span>`,
  }[p.base]();

  return {
    prompt: `<div class="q-sentence" lang="ja">${ruby(v.w)} <span class="arrow">+</span> <span class="q-pat" style="--pc:${p.color}">${patTitleHTML(p)}</span></div>
      ${hintEn(`“${patEn(p, v)}”`)}`,
    options: shuffle([{ text: correct }, ...wrong]).map((o) => ({
      html: ruby(o.text), value: o.text, correct: o.text === correct, why: o.why,
    })),
    feedback: (chosen) => `<div class="fb-grid fb-pat" style="--c:${p.color}; --pc:${p.color}">
        <svg viewBox="0 0 220 115" class="psvg" aria-hidden="true">${PATTERN_SVG[p.id]}</svg>
        <div>
          <div class="conj-word" lang="ja" style="--gc:${g.color}">${partsHTML(patternBase(v, p.base))}<span class="vp pat">${ruby(p.ending)}</span></div>
          ${chosen.correct ? "" : `<p>${chosen.why}</p>`}
          <p><b lang="ja">${patTitleHTML(p)}</b> ${PATTERN_BASE_LABEL[p.base].replace("Built on", "is built on")}. ${baseForm}</p>
          <p class="small muted"><span class="gbadge" style="--gc:${g.color}">${g.label}</span> ${p.name}: ${p.meaning}</p>
        </div>
      </div>`,
    reveal: () => {},
  };
}


/* ---------------------------------------------------------------- Theme */

// "auto" follows the device. The button cycles auto → light → dark.
const THEMES = { auto: ["◐", "Auto"], light: ["☀", "Light"], dark: ["☾", "Dark"] };
const darkMq = matchMedia("(prefers-color-scheme: dark)");

function applyTheme() {
  let t = store.get("theme", "auto");
  if (!THEMES[t]) t = "auto";
  document.documentElement.dataset.theme = t === "auto" ? (darkMq.matches ? "dark" : "light") : t;
  const b = $("#themeBtn");
  b.innerHTML = `<span aria-hidden="true">${THEMES[t][0]}</span><span class="theme-word"> ${THEMES[t][1]}</span>`;
  b.title = "Colour theme — click to change";
  b.setAttribute("aria-label", `Colour theme: ${t}. Click to change.`);
}

function setupTheme() {
  applyTheme();
  darkMq.addEventListener("change", applyTheme);
  $("#themeBtn").onclick = () => {
    track("setting.theme");
    const keys = Object.keys(THEMES);
    store.set("theme", keys[(keys.indexOf(store.get("theme", "auto")) + 1) % keys.length]);
    applyTheme();
  };
}

/* ---------------------------------------------------------------- Init */

function init() {
  setupTheme();
  const furi = $("#furiToggle");
  furi.checked = store.get("furigana", true);
  document.body.classList.toggle("no-furi", !furi.checked);
  furi.onchange = () => {
    track("setting.furigana");
    document.body.classList.toggle("no-furi", !furi.checked);
    store.set("furigana", furi.checked);
  };

  renderStructure();
  renderParticles();
  renderVerbs();
  renderAdjectives();
  renderPatterns();

  // Sticky elements sit just below the top bar, whose height changes when it wraps.
  const setBarHeight = () => document.documentElement.style.setProperty("--topbar-h", barHeight() + "px");
  setBarHeight();
  window.addEventListener("resize", setBarHeight);

  $$("#tabs button").forEach((b) => (b.onclick = () => { showTab(b.dataset.tab); window.scrollTo({ top: 0 }); }));
  window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));

  renderHome();
  renderLessons();
  renderPractice();
  showTab(location.hash.slice(1));
  setupAccount();
}

// The lesson scripts load after this file (they use its helpers), so wait for all of them.
document.addEventListener("DOMContentLoaded", init);
