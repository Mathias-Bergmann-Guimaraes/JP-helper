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
  const upload = {};
  for (const [k, how] of Object.entries(s.merge)) {
    const there = s.progress[k];
    const here = mine ? store.get(k) : undefined;
    let v = there;
    if (here !== undefined && how === "scores") {
      v = { ...there };
      for (const [n, score] of Object.entries(here)) {
        if (score > (v[n] ?? -1)) { v[n] = score; upload[k] = here; }
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
  for (const k of [...Object.keys(progress.merge), "progressOwner"]) store.del(k);
}

const partsHTML = (parts) => parts.map((p) => `<span class="vp ${p.cls}">${ruby(p.m)}</span>`).join("");

/* ---------------------------------------------------------------- Tabs */

const TABS = ["lessons", "structure", "particles", "verbs", "adjectives", "patterns", "practice"];

function showTab(id) {
  if (!TABS.includes(id)) id = "lessons";
  $$("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
  $$(".panel").forEach((p) => p.classList.toggle("active", p.id === id));
  if (location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
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
  $("#lessons").prepend(card);
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
    <div class="chunk-role">${r.label}</div>
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
    </div>

    <div class="card" id="sv">
      <div class="card-head">
        <h2>Sentence explorer</h2>
        <div class="pager">
          <button class="icon-btn" id="svPrev" aria-label="Previous sentence">‹</button>
          <span id="svCount" class="muted"></span>
          <button class="icon-btn" id="svNext" aria-label="Next sentence">›</button>
        </div>
      </div>
      <p class="muted small">Hover or tap a block to find it in the English sentence.</p>
      <div class="row-label">Japanese order</div>
      <div class="chunks" id="svJp"></div>
      <div class="row-label">English order</div>
      <div class="chunks" id="svEn"></div>
      <div class="sv-translation" id="svTrans"></div>
      <div class="sv-actions">
        <button class="btn" id="svShuffle">Shuffle the blocks</button>
        <span id="svNote" class="muted small"></span>
      </div>
    </div>

    <div class="card">
      <h2>Core patterns</h2>
      <div class="patterns">
        ${PATTERNS.map((p) => `
          <div class="pattern">
            <div class="pattern-title"><span lang="ja">${p.title}</span><span class="muted"> = ${p.meaning}</span></div>
            <div class="chunks compact">${p.chunks.map(chunkHTML).join("")}</div>
            <div class="muted small">${p.en}</div>
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

  $("#svPrev").onclick = () => showSentence(sentIdx - 1);
  $("#svNext").onclick = () => showSentence(sentIdx + 1);
  $("#svShuffle").onclick = shuffleSentence;

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
}

function showSentence(i) {
  sentIdx = (i + SENTENCES.length) % SENTENCES.length;
  const s = SENTENCES[sentIdx];
  $("#svCount").textContent = `${sentIdx + 1} / ${SENTENCES.length}`;
  $("#svJp").innerHTML = s.chunks.map(chunkHTML).join("");
  $("#svEn").innerHTML = s.enOrder.map((i) => enChunkHTML(s.chunks[i], i)).join("");
  $("#svTrans").innerHTML = `<span lang="ja">${ruby(s.chunks.filter((c) => !c.implied).map((c) => c.w + c.p).join(""))}。</span>
    <span class="muted">— ${s.en}</span>${s.note ? `<div class="note">${s.note}</div>` : ""}`;
  $("#svNote").textContent = "";
}

// Reorder every block except the verb, animating each block from its old position (FLIP).
function shuffleSentence() {
  const row = $("#svJp");
  const kids = [...row.children];
  const verb = kids[kids.length - 1];
  const movable = kids.slice(0, -1);
  if (movable.length < 2) return;

  const before = new Map(kids.map((k) => [k, k.getBoundingClientRect()]));
  let order;
  do { order = shuffle(movable.slice()); } while (order.every((k, i) => k === movable[i]));
  order.forEach((k) => row.insertBefore(k, verb));

  kids.forEach((k) => {
    const a = before.get(k), b = k.getBoundingClientRect();
    k.animate(
      [{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` }, { transform: "none" }],
      { duration: 550, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
  });
  $("#svNote").textContent = "Same meaning! The particles carry each block's job, so blocks can move around. Only the verb has to stay last.";
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

    <div class="card">
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
      </div>
    </div>`;

  $$(".ptile").forEach((b) => (b.onclick = () => showParticle(b.dataset.id, true)));
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
      </div>
    </div>`;

  $$("#verbs [data-v]").forEach((b) => (b.onclick = () => { verbIdx = +b.dataset.v; updateVerb(); }));
  $$("#verbs [data-f]").forEach((b) => (b.onclick = () => { verbForm = b.dataset.f; updateVerb(); }));
  updateVerb();
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
    <div class="conj-viz">${vizHTML(c.viz, v)}</div>`;

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
  $$("#formTable tr").forEach((tr) => (tr.onclick = () => { verbForm = tr.dataset.f; updateVerb(); }));
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
      .filter((x) => x.group === "godan" && !x.teException && g.ends.includes(x.w.slice(-1)))
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
  $("#politeToggle").onchange = (e) => { adjState.polite = e.target.checked; drawAdj("i"); drawAdj("na"); };
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
  $$("[data-a]", el).forEach((b) => (b.onclick = () => { adjState[type] = +b.dataset.a; drawAdj(type); }));
}

/* ---------------------------------------------------------------- Verb patterns */

const PATTERN_SVG = {
  teiru: `<text x="10" y="18" class="t">action in progress</text>
       <line x1="10" y1="36" x2="210" y2="36" class="s-mute" stroke-width="2"/>
       <rect x="40" y="28" width="150" height="16" rx="8" fill="currentColor" opacity=".3"/>
       <rect x="40" y="28" width="90" height="16" rx="8" fill="currentColor"/>
       <text x="10" y="70" class="t">result that stays</text>
       <line x1="10" y1="88" x2="210" y2="88" class="s-mute" stroke-width="2"/>
       <rect x="50" y="83" width="160" height="10" rx="5" fill="currentColor" opacity=".3"/>
       <circle cx="50" cy="88" r="8" fill="currentColor"/>
       <line x1="130" y1="22" x2="130" y2="100" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
       <text x="130" y="112" text-anchor="middle" class="t">now</text>`,
  tai: `<circle cx="45" cy="62" r="14" class="f-mute" opacity=".6"/>
       <path d="M22 104 q23 -34 46 0z" class="f-mute" opacity=".6"/>
       <circle cx="72" cy="46" r="4" fill="currentColor" opacity=".5"/>
       <circle cx="86" cy="35" r="6" fill="currentColor" opacity=".65"/>
       <ellipse cx="150" cy="40" rx="58" ry="32" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="3"/>
       <path d="M150 60 C122 42 130 20 150 32 C170 20 178 42 150 60Z" fill="currentColor"/>
       <text x="150" y="96" text-anchor="middle" class="t">I want to…</text>`,
  kudasai: `<circle cx="36" cy="58" r="16" class="f-mute" opacity=".6"/>
       <text x="36" y="94" text-anchor="middle" class="t">me</text>
       <circle cx="184" cy="58" r="16" fill="currentColor"/>
       <text x="184" y="94" text-anchor="middle" class="t">you</text>
       <rect x="62" y="14" width="96" height="26" rx="13" fill="currentColor" fill-opacity=".15" stroke="currentColor" stroke-width="2"/>
       <text x="110" y="31" text-anchor="middle" class="t">please do it</text>
       <line x1="58" y1="62" x2="156" y2="62" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
       <polyline points="146,52 158,62 146,72" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  temoii: `<line x1="16" y1="60" x2="166" y2="60" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 10"/>
       <rect x="96" y="22" width="8" height="70" rx="3" class="f-mute"/>
       <rect x="136" y="22" width="8" height="70" rx="3" class="f-mute"/>
       <path d="M104 28 L78 16 L78 82 L104 88Z" fill="currentColor" fill-opacity=".15" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
       <circle cx="190" cy="60" r="18" fill="currentColor"/>
       <polyline points="181,60 188,67 200,53" fill="none" class="s-surface" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
       <text x="120" y="110" text-anchor="middle" class="t">the way is open</text>`,
  nakereba: `<circle cx="22" cy="58" r="7" fill="currentColor"/>
       <path d="M29 58 C70 58 80 22 128 22" fill="none" class="s-mute" stroke-width="3" stroke-dasharray="6 6"/>
       <path d="M29 58 C70 58 80 92 128 92" fill="none" stroke="currentColor" stroke-width="4"/>
       <g class="s-mute" stroke-width="4" stroke-linecap="round"><line x1="138" y1="13" x2="156" y2="31"/><line x1="156" y1="13" x2="138" y2="31"/></g>
       <text x="164" y="27" class="t">don't = ✗</text>
       <circle cx="147" cy="92" r="12" fill="currentColor"/>
       <polyline points="141,92 146,97 154,87" fill="none" class="s-surface" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
       <text x="164" y="97" class="t">do = ✓</text>`,
};

const PATTERN_BASE_LABEL = {
  te: "Built on the <b>て-form</b>",
  stem: "Built on the <b>ます-form minus ます</b>",
  nai: "Built on the <b>ない-form</b>: ない → なければならない",
};

const BASE_NAME = { te: "て-form", stem: "ます-stem", nai: "ない-form", dict: "dictionary form" };

// The verb part a pattern attaches to, as display parts from conjugate().
// `group` can be overridden to build wrong answers for the quiz.
function patternBase(v, base, group = v.group) {
  if (base === "dict") return [{ m: v.w, cls: "stem" }];
  if (base === "te") return conjugate(v, "te", group).parts;
  return conjugate(v, base === "stem" ? "masu" : "nai", group).parts.slice(0, -1); // drop ます / ない
}
const partsText = (parts) => parts.filter((p) => p.cls !== "drop").map((p) => p.m).join("");

let patVerb = 0;

function renderPatterns() {
  $("#patterns").innerHTML = `
    <div class="card hero">
      <h1>Verb <span class="accent">patterns</span>: snap an ending onto a verb</h1>
      <p>Most grammar patterns are just <b>a verb form + a fixed ending</b>. The verb part changes;
      the pattern part never does. Learn which verb form each pattern needs, and it works with every verb.</p>
      <div class="pat-nav">
        ${VERB_PATTERNS.map((p) => `<button class="pat-jump" data-jump="${p.id}" style="--pc:${p.color}" lang="ja">${p.title}</button>`).join("")}
      </div>
    </div>

    <div class="card pat-picker">
      <div class="step-label">Pick a verb — every pattern below updates</div>
      <div class="chips">
        ${VERBS.map((v, i) => `<button class="chip" data-pv="${i}" style="--gc:${GROUPS[v.group].color}" lang="ja">${ruby(v.w)}</button>`).join("")}
      </div>
    </div>

    ${VERB_PATTERNS.map(patternCardHTML).join("")}`;

  $$("#patterns [data-pv]").forEach((b) => (b.onclick = () => { patVerb = +b.dataset.pv; updatePatternVerb(); }));
  $$("#patterns [data-jump]").forEach((b) => (b.onclick = () => {
    const card = $("#pat-" + b.dataset.jump);
    const offset = $(".topbar").offsetHeight + ($(".pat-picker").offsetHeight || 0) + 16;
    window.scrollTo({ top: card.getBoundingClientRect().top + scrollY - offset, behavior: "smooth" });
  }));
  updatePatternVerb();
}

function patternCardHTML(p) {
  const literal = p.literal.map((b) => `
    <div class="lit-block${b.verb ? " verb" : ""}">
      <span class="lit-t" lang="ja">${b.t}</span>
      <span class="lit-g">${b.g}</span>
    </div>`).join('<span class="fplus">+</span>');

  return `
    <article class="card pat-card" id="pat-${p.id}" style="--pc:${p.color}; --c:${p.color}">
      <header class="pat-head">
        <span class="pat-title" lang="ja">${p.title}</span>
        <div><div class="pd-name">${p.name}</div><div class="pat-meaning">${p.meaning}</div></div>
      </header>
      <div class="pat-top">
        <div class="pd-visual">
          <svg viewBox="0 0 220 115" class="psvg" aria-hidden="true">${PATTERN_SVG[p.id]}</svg>
          <div class="pd-caption">${p.caption}</div>
        </div>
        <div>
          <p class="pd-idea">${p.idea}</p>
          <div class="step-label">How it's built</div>
          <div class="lit-row">${literal}<span class="fplus">=</span><span class="lit-result">${p.literalResult}</span></div>
          <div class="step-label">Try it</div>
          <div class="pat-try" data-try="${p.id}"></div>
        </div>
      </div>
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
            ${p.forms.map((f) => `<tr><td lang="ja">${f.e}</td><td class="muted small">${f.m}</td></tr>`).join("")}
          </table>
        </div>
        <div class="tip"><b>Tip</b> ${p.tip}</div>
      </div>
    </article>`;
}

function updatePatternVerb() {
  const v = VERBS[patVerb];
  $$("#patterns [data-pv]").forEach((b) => b.classList.toggle("active", +b.dataset.pv === patVerb));
  VERB_PATTERNS.forEach((p) => {
    $(`[data-try="${p.id}"]`).innerHTML = `
      <div class="conj-word" lang="ja" style="--gc:${GROUPS[v.group].color}">${partsHTML(patternBase(v, p.base))}<span class="vp pat">${p.ending}</span></div>
      <div class="pat-try-en">“${p.en.replace("{v}", v.en).replace("{ing}", v.ing)}”</div>
      <div class="small muted" lang="ja">${PATTERN_BASE_LABEL[p.base]} · <span class="gbadge" style="--gc:${GROUPS[v.group].color}">${GROUPS[v.group].label}</span></div>`;
  });
}

/* ---------------------------------------------------------------- Practice */

const quiz = { mode: "particles", q: null, answered: false, score: 0, total: 0, streak: 0, best: store.get("best", 0), last: null, deck: null };

function renderPractice() {
  $("#practice").innerHTML = `
    <div class="card hero">
      <h1>Practice</h1>
      <p>Short rounds, instant feedback. Every answer shows the picture behind the rule.</p>
      <div class="seg" id="quizMode">
        <button data-m="particles">Particles</button>
        <button data-m="verbs">Verb forms</button>
        <button data-m="patterns">Patterns</button>
      </div>
    </div>
    <div class="card quiz">
      <div class="scorebar">
        <span>Score <b id="qScore">0 / 0</b></span>
        <span>Streak <b id="qStreak">0</b></span>
        <span>Best streak <b id="qBest">${quiz.best}</b></span>
      </div>
      <div id="qPrompt" class="q-prompt"></div>
      <div id="qOpts" class="q-opts"></div>
      <div id="qFeedback" class="q-feedback"></div>
      <div class="q-actions"><button class="btn primary" id="qNext">Next question →</button></div>
    </div>`;
  $$("#quizMode button").forEach((b) => (b.onclick = () => { quiz.mode = b.dataset.m; nextQuestion(); }));
  $("#qNext").onclick = nextQuestion;
  nextQuestion();
}

function nextQuestion() {
  $$("#quizMode button").forEach((b) => b.classList.toggle("active", b.dataset.m === quiz.mode));
  quiz.answered = false;
  quiz.q = { particles: makeParticleQ, verbs: makeVerbQ, patterns: makePatternQ }[quiz.mode]();
  $("#qPrompt").innerHTML = quiz.q.prompt;
  $("#qOpts").innerHTML = quiz.q.options
    .map((o, i) => `<button class="q-opt" data-i="${i}" lang="ja">${o.html}</button>`).join("");
  $("#qFeedback").innerHTML = "";
  $("#qNext").hidden = true;
  $$("#qOpts .q-opt").forEach((b) => (b.onclick = () => answer(+b.dataset.i)));
}

// A question's English stays folded behind a button until asked for, or until the question is answered.
const hintEn = (text) => `<details class="q-hint"><summary>Show translation</summary><div class="q-en">${text}</div></details>`;
const openHints = (box) => $$(".q-hint", box).forEach((d) => (d.open = true));

function makeParticleQ() {
  // Deal from a shuffled deck so every question comes up once before any repeats.
  if (!quiz.deck || !quiz.deck.length) {
    quiz.deck = shuffle(PARTICLE_QUIZ.slice());
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
  const v = pick(VERBS);
  const p = patId ? VERB_PATTERNS.find((x) => x.id === patId) : pick(VERB_PATTERNS);
  const g = GROUPS[v.group];
  const other = v.group === "godan" ? "ichidan" : "godan";
  const build = (base, group) => partsText(patternBase(v, base, group)) + p.ending;
  const correct = build(p.base);

  // 書いてたい is real casual speech (〜ていたい), so don't offer the て-form for 〜たい.
  const wrongBases = ["te", "stem", "nai", "dict"].filter((b) => b !== p.base && !(p.id === "tai" && b === "te"));
  const likely = [
    ...wrongBases.map((b) => ({ text: build(b), why: `That uses the <b>${BASE_NAME[b]}</b>, but <b lang="ja">${p.title}</b> needs the <b>${BASE_NAME[p.base]}</b>.` })),
    { text: build(p.base, other), why: `That's the ${BASE_NAME[p.base]} built with <b>${GROUPS[other].label}</b> rules — but <b lang="ja">${plain(v.w)}</b> is <b>${g.label}</b>.` },
  ];
  const backup = wrongBases.filter((b) => b !== "dict").map((b) => ({
    text: build(b, other), why: `That uses the wrong verb form <i>and</i> ${GROUPS[other].label} rules.`,
  }));
  const wrong = pickWrong(correct, likely, backup);

  const baseForm = {
    te: () => `て-form: <span lang="ja">${ruby(conjugate(v, "te").result)}</span>`,
    stem: () => `ます-form: <span lang="ja">${ruby(conjugate(v, "masu").result)}</span> → drop ます`,
    nai: () => `ない-form: <span lang="ja">${ruby(conjugate(v, "nai").result)}</span> → swap ない`,
  }[p.base]();

  return {
    prompt: `<div class="q-sentence" lang="ja">${ruby(v.w)} <span class="arrow">+</span> <span class="q-pat" style="--pc:${p.color}">${p.title}</span></div>
      ${hintEn(`“${p.en.replace("{v}", v.en).replace("{ing}", v.ing)}”`)}`,
    options: shuffle([{ text: correct }, ...wrong]).map((o) => ({
      html: ruby(o.text), value: o.text, correct: o.text === correct, why: o.why,
    })),
    feedback: (chosen) => `<div class="fb-grid fb-pat" style="--c:${p.color}; --pc:${p.color}">
        <svg viewBox="0 0 220 115" class="psvg" aria-hidden="true">${PATTERN_SVG[p.id]}</svg>
        <div>
          <div class="conj-word" lang="ja" style="--gc:${g.color}">${partsHTML(patternBase(v, p.base))}<span class="vp pat">${p.ending}</span></div>
          ${chosen.correct ? "" : `<p>${chosen.why}</p>`}
          <p><b lang="ja">${p.title}</b> ${PATTERN_BASE_LABEL[p.base].replace("Built on", "is built on")}. ${baseForm}</p>
          <p class="small muted"><span class="gbadge" style="--gc:${g.color}">${g.label}</span> ${p.name}: ${p.meaning}</p>
        </div>
      </div>`,
    reveal: () => {},
  };
}

function answer(i) {
  if (quiz.answered) return;
  quiz.answered = true;
  const q = quiz.q;
  const ok = q.options[i].correct;
  quiz.total++;
  if (ok) {
    quiz.score++;
    quiz.streak++;
    if (quiz.streak > quiz.best) { quiz.best = quiz.streak; store.set("best", quiz.best); }
  } else {
    quiz.streak = 0;
  }
  $$("#qOpts .q-opt").forEach((b, j) => {
    b.disabled = true;
    if (q.options[j].correct) b.classList.add("right");
    else if (j === i) b.classList.add("wrong");
  });
  q.reveal();
  openHints($("#qPrompt"));
  $("#qFeedback").innerHTML = `<div class="verdict ${ok ? "ok" : "bad"}">${ok ? "Correct!" : "Not quite."}</div>${q.feedback(q.options[i])}`;
  $("#qScore").textContent = `${quiz.score} / ${quiz.total}`;
  $("#qStreak").textContent = quiz.streak;
  $("#qBest").textContent = quiz.best;
  $("#qNext").hidden = false;
  $("#qNext").focus({ preventScroll: true });
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
    document.body.classList.toggle("no-furi", !furi.checked);
    store.set("furigana", furi.checked);
  };

  renderStructure();
  renderParticles();
  renderVerbs();
  renderAdjectives();
  renderPatterns();
  renderPractice();

  // Sticky elements sit just below the top bar, whose height changes when it wraps.
  const setBarHeight = () => document.documentElement.style.setProperty("--topbar-h", $(".topbar").offsetHeight + "px");
  setBarHeight();
  window.addEventListener("resize", setBarHeight);

  $$("#tabs button").forEach((b) => (b.onclick = () => { showTab(b.dataset.tab); window.scrollTo({ top: 0 }); }));
  window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));

  renderLessons();
  showTab(location.hash.slice(1));
  setupAccount();
}

// The lesson scripts load after this file (they use its helpers), so wait for all of them.
document.addEventListener("DOMContentLoaded", init);
