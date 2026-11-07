// The Listen tab: YouTube videos sorted by how much of their grammar you've studied, and which
// grammar each one needs. VIDEOS comes from videos-data.js, written by tools/videos/analyse.py.
// Grammar is spotted by rules, so the numbers are a good guide rather than a count by a teacher.

VIDEOS.push(...SONGS); // from songs-data.js: songs share everything but the lyrics panel, at the end of this file

const listenState = { open: null, show: "reach", channel: "", kind: "all" };
const listenIsAudio = (v) => v.kind === "audio";
const listenIsMusic = (v) => v.kind === "music";
const listenKind = (v) => v.kind || "video";

/* ---------------------------------------------------------------- Likes, bookmarks, favourite channels */

// Likes and dislikes come from server.js: everyone's totals and this member's own vote, never who
// voted. Without the server (the page opened as a file) there's nobody to count with, so they hide.
// Bookmarks and favourite channels are per account, saved like other progress.
const listenVotes = { totals: {}, mine: {}, loadedAt: 0 };

// Drawn in the text's colour, so they suit both themes. A pressed button's icon fills in (see .on in style.css).
const listenIcon = (name) => `<svg class="listen-icon" viewBox="0 0 24 24" aria-hidden="true">${{
  up: '<path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3Z"/><path d="M7 10l4.5-7.5A2.5 2.5 0 0 1 16 4v4h4a2 2 0 0 1 2 2.4l-1.6 8.1a3 3 0 0 1-3 2.5H7"/>',
  down: '<path d="M7 14V3H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3Z"/><path d="M7 14l4.5 7.5A2.5 2.5 0 0 0 16 20v-4h4a2 2 0 0 0 2-2.4l-1.6-8.1a3 3 0 0 0-3-2.5H7"/>',
  save: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1Z"/>',
  star: '<path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.8Z"/>',
  video: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="m10 9 5 3-5 3V9Z"/>',
  audio: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2.5" y="14" width="5" height="7" rx="1.5"/><rect x="16.5" y="14" width="5" height="7" rx="1.5"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
}[name]}</svg>`;

// The channel's name, marked with a filled star once it's a favourite.
const listenChannelHTML = (v) => listenChannels().includes(v.channel)
  ? `<span class="listen-channel fav" title="One of your favourite channels">${listenIcon("star")}${listenEsc(v.channel)}</span>`
  : `<span class="listen-channel">${listenEsc(v.channel)}</span>`;
const listenSaved = () => store.get("listenSaved", []);
const listenChannels = () => store.get("listenChannels", []);

async function listenLoadVotes() {
  if (!progress.sync || Date.now() - listenVotes.loadedAt < 30000) return;
  listenVotes.loadedAt = Date.now();
  try {
    const r = await fetch("/votes");
    if (!r.ok) return;
    const { totals, mine } = await r.json();
    Object.assign(listenVotes, { totals, mine });
    VIDEOS.forEach((v) => listenRefreshActions(v.id));
  } catch { /* the counts just stay as they were */ }
}

function listenActionsHTML(v, onCard) {
  const [up, down] = listenVotes.totals[v.id] || [0, 0];
  const mine = listenVotes.mine[v.id] || 0;
  const saved = listenSaved().includes(v.id);
  const fav = listenChannels().includes(v.channel);
  return `
    ${progress.sync ? `
      <button class="listen-act ${mine > 0 ? "on" : ""}" data-vote="1" aria-pressed="${mine > 0}" aria-label="Like, ${up} so far" title="Like">${listenIcon("up")} ${up}</button>
      <button class="listen-act ${mine < 0 ? "on" : ""}" data-vote="-1" aria-pressed="${mine < 0}" aria-label="Dislike, ${down} so far" title="Dislike">${listenIcon("down")} ${down}</button>` : ""}
    <button class="listen-act ${saved ? "on" : ""}" data-save aria-pressed="${saved}" title="Only you can see your bookmarks">${listenIcon("save")} ${saved ? "Bookmarked" : "Bookmark"}</button>
    ${onCard ? `<button class="listen-act listen-fav ${fav ? "on" : ""}" data-fav aria-pressed="${fav}" aria-label="Favourite this channel: ${listenEsc(v.channel)}" title="${fav ? "Remove this channel from your favourites" : "Favourite this channel"}">${listenIcon("star")}</button>` : ""}`;
}

// Each item's buttons are redrawn on their own, so voting doesn't redraw the page (or a playing video).
function listenRefreshActions(id, note) {
  const v = VIDEOS.find((x) => x.id === id);
  $$(`[data-actions="${id}"]`).forEach((box) => {
    box.innerHTML = listenActionsHTML(v, !!box.closest(".listen-card")) + (note ? `<span class="small listen-act-note">${note}</span>` : "");
    $$("[data-vote]", box).forEach((b) => (b.onclick = () => listenVote(v, Number(b.dataset.vote))));
    $("[data-save]", box).onclick = () => listenToggleSave(v);
    const fav = $("[data-fav]", box);
    if (fav) fav.onclick = () => listenToggleChannel(v);
  });
}

async function listenVote(v, vote) {
  const before = { total: listenVotes.totals[v.id] || [0, 0], mine: listenVotes.mine[v.id] || 0 };
  const next = before.mine === vote ? 0 : vote; // pressing your own vote again takes it back
  const total = [...before.total];
  if (before.mine) total[before.mine > 0 ? 0 : 1]--;
  if (next) total[next > 0 ? 0 : 1]++;
  listenVotes.totals[v.id] = total;
  listenVotes.mine[v.id] = next;
  listenRefreshActions(v.id);
  track("listen.vote");
  try {
    const r = await post("/votes", { id: v.id, vote: next });
    listenVotes.totals[v.id] = r.total;
    listenRefreshActions(v.id);
  } catch {
    listenVotes.totals[v.id] = before.total;
    listenVotes.mine[v.id] = before.mine;
    listenRefreshActions(v.id, "Couldn't save that. Try again.");
  }
}

function listenToggle(key, value) {
  const list = store.get(key, []);
  store.set(key, list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
}

function listenToggleSave(v) {
  listenToggle("listenSaved", v.id);
  track("listen.save");
  // In the bookmarks list, an item that's no longer bookmarked has to go. Otherwise only the count changes.
  if (listenState.show === "saved" && !listenState.open) return renderListen();
  listenRefreshActions(v.id);
  const count = $("#listenSavedCount");
  if (count) count.textContent = listenSaved().length;
}

// A channel's star shows on all its cards, so the list is redrawn. A video's page only has the one,
// and redrawing it would stop the video.
function listenToggleChannel(v) {
  listenToggle("listenChannels", v.channel);
  track("listen.channel");
  if (!listenState.open) return renderListen();
  $("#listenChannelName").innerHTML = listenChannelHTML(v);
  listenWireFav(v);
}

function listenWireFav(v) {
  const fav = listenChannels().includes(v.channel);
  const what = listenIsMusic(v) ? "artist" : "channel";
  $("#listenFavBox").innerHTML = `<button class="listen-act listen-fav ${fav ? "on" : ""}" id="listenFav" aria-pressed="${fav}" title="Only you can see your favourites">${listenIcon("star")} ${fav ? `Favourite ${what}` : `Favourite this ${what}`}</button>`;
  $("#listenFav").onclick = () => listenToggleChannel(v);
}
const LISTEN_REACH = 0.9; // "within reach": this share of a video's sentences use grammar you've studied

const listenEsc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const listenClock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// The lesson the list is measured against: the learner's choice, or else the furthest they've got a
// star in or passed. Not the open lesson, because following a grammar point here can open a late one.
function listenLevel() {
  const chosen = store.get("listenLevel", null);
  if (chosen) return chosen;
  const studied = LESSONS.filter((l) => lessonPassed(l.n) || l.points.some((_, i) => pointStars(l.n, i) > 0));
  return studied.length ? studied[studied.length - 1].n : 1;
}

// The share of a video's sentences that need nothing past `level`.
function listenCoverage(v, level) {
  let known = 0;
  for (const n in v.levels) if (Number(n) <= level) known += v.levels[n];
  return known / v.sentences;
}

function listenPoint(key) {
  const [n, i] = key.split(".").map(Number);
  const lesson = LESSONS.find((l) => l.n === n);
  return { n, lesson, point: lesson.points[i] };
}

const listenNewCount = (v, level) => Object.keys(v.points).filter((k) => parseInt(k, 10) > level).length;

function renderListen() {
  const box = $("#listen");
  listenLoadVotes();
  if (listenState.open) return renderListenVideo(box, VIDEOS.find((v) => v.id === listenState.open));
  const level = listenLevel();
  const ofKind = VIDEOS.filter((v) => listenState.kind === "all" || listenKind(v) === listenState.kind);
  const channels = [...new Set(ofKind.map((v) => v.channel))].sort((a, b) => a.localeCompare(b));
  if (!channels.includes(listenState.channel)) listenState.channel = "";
  let list = ofKind.map((v) => ({ v, cover: listenCoverage(v, level) }));
  const reach = list.filter((x) => x.cover >= LISTEN_REACH).length;
  const total = list.length;
  if (listenState.channel) list = list.filter((x) => x.v.channel === listenState.channel);
  const saved = listenSaved();
  const favs = listenChannels();
  const emptyNote = { saved: "Nothing bookmarked yet. Bookmark a video or episode and it'll be here.", favs: "No favourite channels yet. Open a video or episode to favourite its channel." }[listenState.show];
  if (listenState.show === "saved") list = list.filter((x) => saved.includes(x.v.id));
  if (listenState.show === "favs") list = list.filter((x) => favs.includes(x.v.channel));
  // The highest share of known sentences first. Among equals, the one nearest your level, since it
  // stretches you a little where one far below it wouldn't.
  list.sort((a, b) => b.cover - a.cover || Math.abs(a.v.level - level) - Math.abs(b.v.level - level));
  // Early in the course nothing may be within reach yet, so show the closest instead of an empty page.
  const inReach = list.filter((x) => x.cover >= LISTEN_REACH);
  const closest = listenState.show === "reach" && !inReach.length;
  if (listenState.show === "reach") list = closest ? list.slice(0, 6) : inReach;
  // Favourite channels go on top. The sort keeps each group's order.
  const favFirst = listenChannels();
  list.sort((a, b) => favFirst.includes(b.v.channel) - favFirst.includes(a.v.channel));

  box.innerHTML = `
    <div class="card hero">
      <h1><span class="accent">Listen</span> to real Japanese</h1>
      <p>Real YouTube videos, podcasts and songs, measured against the course. Each one shows the grammar it uses and how much of it you've studied, so you can pick something you'll mostly follow. Songs come with their lyrics.</p>
    </div>
    <div class="card listen-bar">
      <label>I've studied up to
        <select id="listenLevel">
          ${LESSONS.map((l) => `<option value="${l.n}" ${l.n === level ? "selected" : ""}>Lesson ${l.n}: ${listenEsc(l.title)}</option>`).join("")}
        </select>
      </label>
      <button class="btn ${level === lessonToContinue().n ? "primary" : ""}" id="listenCurrent" aria-pressed="${level === lessonToContinue().n}" title="The lesson shown as Your lesson on the Home tab">Current lesson (${lessonToContinue().n})</button>
      <div class="listen-show" role="group" aria-label="Video, audio or music">
        ${[["all", "Everything"], ["video", "Video"], ["audio", "Audio"], ["music", "Music"]].map(([k, name]) => `
          <button class="btn ${listenState.kind === k ? "primary" : ""}" data-kind="${k}">${name}</button>`).join("")}
      </div>
      <div class="listen-show" role="group" aria-label="Which ones to show">
        <button class="btn ${listenState.show === "reach" ? "primary" : ""}" data-show="reach">Within reach (${reach})</button>
        <button class="btn ${listenState.show === "all" ? "primary" : ""}" data-show="all">All (${total})</button>
        <button class="btn ${listenState.show === "saved" ? "primary" : ""}" data-show="saved">Bookmarks (<span id="listenSavedCount">${saved.filter((id) => VIDEOS.some((v) => v.id === id)).length}</span>)</button>
        <button class="btn ${listenState.show === "favs" ? "primary" : ""}" data-show="favs">Favourite channels (${favs.length})</button>
      </div>
      <label>Channel, show or artist
        <select id="listenChannel">
          <option value="">All</option>
          ${channels.map((c) => `<option value="${listenEsc(c)}" ${c === listenState.channel ? "selected" : ""}>${listenEsc(c)}</option>`).join("")}
        </select>
      </label>
    </div>
    ${closest ? `<p class="muted small">Nothing here is within reach at this level yet, so these are the closest. Expect a lot of new grammar.</p>` : ""}
    ${emptyNote && !list.length ? `<p class="muted small">${emptyNote}</p>` : ""}
    <div class="listen-grid">${list.map((x) => listenCardHTML(x.v, x.cover, level)).join("")}</div>`;

  $("#listenLevel").onchange = (e) => { store.set("listenLevel", Number(e.target.value)); renderListen(); };
  $("#listenCurrent").onclick = () => { store.set("listenLevel", lessonToContinue().n); renderListen(); };
  $("#listenChannel").onchange = (e) => { listenState.channel = e.target.value; renderListen(); };
  $$("[data-show]", box).forEach((b) => (b.onclick = () => { listenState.show = b.dataset.show; renderListen(); }));
  $$("[data-kind]", box).forEach((b) => (b.onclick = () => {
    listenState.kind = b.dataset.kind;
    // Songs are chosen because you like them, and few are "within reach", so Music opens on all of them.
    if (listenState.kind === "music" && listenState.show === "reach") listenState.show = "all";
    renderListen();
  }));
  $$("[data-video]", box).forEach((b) => (b.onclick = () => {
    track("listen.open");
    listenState.open = b.dataset.video;
    renderListen();
    window.scrollTo({ top: 0 });
  }));
  list.forEach((x) => listenRefreshActions(x.v.id));
}

function listenCardHTML(v, cover, level) {
  const pct = Math.round(cover * 100);
  const fresh = listenNewCount(v, level);
  return `
    <div class="card listen-card">
    <button class="listen-open" data-video="${v.id}">
      ${listenIsAudio(v)
        ? `<span class="listen-art"><img src="${listenEsc(v.art)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>`
        : `<img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer">`}
      <b class="listen-title">${listenEsc(v.title)}</b>
      <span class="small muted listen-meta">${listenIcon(listenKind(v))} ${{ audio: "Podcast", music: "Song", video: "Video" }[listenKind(v)]} · ${listenClock(v.seconds)}</span>
      <span class="small muted">${listenChannelHTML(v)}</span>
      <span class="listen-meter" aria-hidden="true"><i style="width:${pct}%"></i></span>
      <span class="small"><b>${pct}%</b> of ${listenIsMusic(v) ? "lines" : "sentences"} use grammar you've studied</span>
      <span class="small muted">Comfortable from lesson ${v.level} · ${fresh ? `${fresh} new point${fresh > 1 ? "s" : ""}` : "nothing new"}</span>
    </button>
    <div class="listen-actions" data-actions="${v.id}"></div>
    </div>`;
}

function renderListenVideo(box, v) {
  if (!v) { listenState.open = null; return renderListen(); }
  const level = listenLevel();
  const pct = Math.round(listenCoverage(v, level) * 100);
  const keys = Object.keys(v.points);
  const fresh = keys.filter((k) => parseInt(k, 10) > level);
  const known = keys.filter((k) => parseInt(k, 10) <= level);
  // Sentences per minute would mislead with long pauses, so speed is characters of speech per minute.
  const pace = v.cpm < 120 ? "Slow" : v.cpm < 220 ? "Moderate" : "Fast";

  const music = listenIsMusic(v);

  box.innerHTML = `
    <div class="listen-top"><button class="btn" id="listenBack">← Back to the list</button></div>
    <div class="${music ? "listen-song" : ""}">
    <div class="card listen-player">
      ${listenIsAudio(v) ? `
        <div class="listen-audio">
          <img src="${listenEsc(v.art)}" alt="" referrerpolicy="no-referrer">
          <audio id="listenAudio" controls preload="none" referrerpolicy="no-referrer" src="${listenEsc(v.audio)}"></audio>
        </div>` : `
        <div class="listen-frame">
          <iframe id="listenFrame" src="${listenSrc(v.id, 0, false, music)}" title="${listenEsc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
        </div>`}
      <h2>${listenEsc(v.title)}</h2>
      <p class="small muted"><span id="listenChannelName">${listenChannelHTML(v)}</span> · ${listenClock(v.seconds)}${music ? "" : ` · ${pace} speech`}
        ${listenIsAudio(v)
          ? (v.link ? `· <a href="${listenEsc(v.link)}" target="_blank" rel="noopener">Open the episode</a>` : "")
          : `· <a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">Open on YouTube</a>`}</p>
      <p><b>${pct}%</b> of its ${v.sentences} ${music ? "lines" : "sentences"} use grammar up to lesson ${level}. Comfortable from <b>lesson ${v.level}</b>.</p>
      <div class="listen-actions" data-actions="${v.id}"></div>
      <div class="listen-actions" id="listenFavBox"></div>
    </div>
    ${music ? listenLyricsHTML(v) : ""}
    </div>
    <div class="card">
      <div class="step-label">Grammar you haven't reached (${fresh.length})</div>
      ${fresh.length ? listenPointsHTML(v, fresh) : `<p class="muted small">Nothing past lesson ${level}, so all of it is grammar you've studied.</p>`}
      <div class="step-label">Grammar you've studied (${known.length})</div>
      ${known.length ? listenPointsHTML(v, known) : `<p class="muted small">None of this video's grammar comes before lesson ${level + 1}.</p>`}
      <p class="small muted listen-note">${music
        ? "Found by rules that read the song's lyrics. Lyrics bend grammar and drop words, so expect more to be missed or wrong than on a video."
        : listenIsAudio(v)
        ? "Found by rules that read a machine-made transcript of this episode, which mishears some words, so expect more to be missed or wrong than on a video."
        : "Found by rules that read the video's captions, so a few may be missed or wrong."} Vocabulary isn't counted, and ${VIDEOS_UNDETECTED.length} of the course's points can't be spotted this way (like は for contrast). Press a time to jump to it, or a point to open its lesson.</p>
    </div>`;

  $("#listenBack").onclick = () => { listenState.open = null; renderListen(); window.scrollTo({ top: 0 }); };
  listenRefreshActions(v.id);
  listenWireFav(v);
  // Podcast hosts drop a connection now and then, and a failed audio element stays failed until reloaded.
  const failed = $("#listenAudio");
  if (failed) failed.onerror = () => {
    if (!$("#listenRetry")) failed.insertAdjacentHTML("afterend", `<p class="small muted" id="listenRetry">The audio didn't load. <button class="btn" id="listenRetryBtn">Try again</button></p>`);
    $("#listenRetryBtn").onclick = () => { $("#listenRetry").remove(); failed.load(); failed.play().catch(() => {}); };
  };
  $$("[data-seek]", box).forEach((b) => (b.onclick = () => {
    const audio = $("#listenAudio");
    if (audio) {
      audio.currentTime = Number(b.dataset.seek);
      audio.play().catch(() => {});
    } else if (music) {
      listenSongSeek(v, Number(b.dataset.seek) + listenShift(v));
    } else {
      $("#listenFrame").src = listenSrc(v.id, Number(b.dataset.seek), true);
    }
    scrollBelowBar($(".listen-player"));
  }));
  $$("[data-lesson]", box).forEach((b) => (b.onclick = () => {
    openLessonTab(LESSONS.find((l) => l.n === Number(b.dataset.lesson)));
  }));
  if (music) listenStartLyrics(v);
}

// `tracked` lets the page follow the song's time, for the lyrics, and move it without a reload.
function listenSrc(id, start, play, tracked) {
  const track = tracked && location.protocol.startsWith("http") ? `&enablejsapi=1&origin=${encodeURIComponent(location.origin)}` : "";
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&cc_load_policy=0${start ? `&start=${Math.floor(start)}` : ""}${play ? "&autoplay=1" : ""}${track}`;
}

function listenPointsHTML(v, keys) {
  return `<ul class="listen-points">${keys.map((k) => {
    const { n, lesson, point } = listenPoint(k);
    const [count, times] = v.points[k];
    return `
      <li>
        <button class="listen-point" data-lesson="${n}" title="Open lesson ${n}: ${listenEsc(lesson.title)}">
          <span class="listen-lesson">L${n}</span>
          <span><b lang="ja">${point.g}</b> <span class="small muted">${point.m}</span></span>
        </button>
        <span class="listen-times">
          <span class="small muted">×${count}</span>
          ${times.map((t) => `<button class="listen-time small" data-seek="${t}">${listenClock(t)}</button>`).join("")}
        </span>
      </li>`;
  }).join("")}</ul>`;
}

/* ---------------------------------------------------------------- Song lyrics */

// Lyrics aren't stored on this site. The member's browser fetches them from LRCLIB (lrclib.net, a free
// database its users write) when a song is opened. Its lines have times, so the player can drive them:
// YouTube's embed reports its time by postMessage, and takes commands the same way.
const LISTEN_YT_ORIGIN = "https://www.youtube-nocookie.com";
const listenLyric = { lines: [], at: -1, ready: false, touched: 0, hello: null, cache: new Map() };

// The lyrics are timed to the record, and a video can start earlier or later. Each song keeps its own
// correction on this device: seconds to add to every line's time.
const listenShift = (v) => store.get("listenLyricShift", {})[v.id] || 0;

function listenLyricsHTML(v) {
  return `
    <div class="card listen-lyrics-card">
      <div class="step-label">Lyrics</div>
      <div class="listen-lyrics" id="listenLyrics" lang="ja" tabindex="0"><p class="muted small">Loading the lyrics…</p></div>
      <div class="listen-shift" id="listenShiftBox" hidden>
        <span class="small muted">Out of time with the video?</span>
        <button class="btn" data-shift="-0.5" title="Show each line half a second sooner">Sooner</button>
        <button class="btn" data-shift="0.5" title="Show each line half a second later">Later</button>
        <span class="small muted" id="listenShiftNow"></span>
      </div>
      <p class="small muted listen-note">From <a href="https://lrclib.net" target="_blank" rel="noopener">LRCLIB</a>, written by its users, so a line may be off. Press a line to jump to it.</p>
    </div>`;
}

function listenParseLrc(text) {
  const lines = [];
  for (const row of (text || "").split(/\r?\n/)) {
    const m = row.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    if (m) lines.push({ t: Number(m[1]) * 60 + Number(m[2]), text: m[3].trim() });
  }
  return lines;
}

async function listenStartLyrics(v) {
  const box = $("#listenLyrics");
  Object.assign(listenLyric, { lines: [], at: -1, ready: false });
  listenGreetPlayer();
  try {
    let entry = listenLyric.cache.get(v.lrc);
    if (!entry) {
      const r = await fetch(`https://lrclib.net/api/get/${v.lrc}`, { referrerPolicy: "no-referrer" });
      if (!r.ok) throw new Error(r.status);
      entry = await r.json();
      listenLyric.cache.set(v.lrc, entry);
    }
    if (listenState.open !== v.id || !$("#listenLyrics")) return; // they've moved on while it loaded
    listenLyric.lines = listenParseLrc(entry.syncedLyrics);
    if (!listenLyric.lines.length) throw new Error("no lines");
    box.innerHTML = listenLyric.lines.map((l, i) => l.text
      ? `<button class="listen-line" data-line="${i}">${listenEsc(l.text)}</button>`
      : `<span class="listen-gap" data-line="${i}"></span>`).join("");
    $$(".listen-line", box).forEach((b) => (b.onclick = () => listenSongSeek(v, listenLyric.lines[b.dataset.line].t + listenShift(v))));
    // Reading ahead shouldn't be fought: following pauses for a moment after you scroll the lyrics.
    ["wheel", "touchmove"].forEach((type) => box.addEventListener(type, () => { listenLyric.touched = Date.now(); }, { passive: true }));
    $("#listenShiftBox").hidden = false;
    $$("[data-shift]").forEach((b) => (b.onclick = () => listenMoveShift(v, Number(b.dataset.shift))));
    listenShowShift(v);
  } catch {
    if (listenState.open !== v.id || !$("#listenLyrics")) return;
    const search = `https://www.google.com/search?q=${encodeURIComponent(`${v.channel} ${v.title} 歌詞`)}`;
    box.innerHTML = `<p class="small muted">The lyrics didn't load. <button class="btn" id="listenLyricsRetry">Try again</button> or <a href="${search}" target="_blank" rel="noopener">search for them</a>.</p>`;
    $("#listenLyricsRetry").onclick = () => listenStartLyrics(v);
  }
}

function listenMoveShift(v, by) {
  const shifts = store.get("listenLyricShift", {});
  shifts[v.id] = Math.round((listenShift(v) + by) * 2) / 2;
  if (!shifts[v.id]) delete shifts[v.id];
  store.set("listenLyricShift", shifts);
  listenShowShift(v);
}

function listenShowShift(v) {
  const s = listenShift(v);
  $("#listenShiftNow").textContent = s ? `${s > 0 ? "+" : "−"}${Math.abs(s).toFixed(1)} s` : "";
}

const listenPlayerSay = (message) => {
  const frame = $("#listenFrame");
  if (frame) frame.contentWindow.postMessage(JSON.stringify({ ...message, id: 1, channel: "widget" }), LISTEN_YT_ORIGIN);
};

// The player only reports its time once it's been asked, and it can't hear that until it has loaded.
function listenGreetPlayer() {
  clearInterval(listenLyric.hello);
  let tries = 0;
  listenLyric.hello = setInterval(() => {
    if (listenLyric.ready || !$("#listenFrame") || ++tries > 40) return clearInterval(listenLyric.hello);
    listenPlayerSay({ event: "listening" });
  }, 500);
}

function listenSongSeek(v, seconds) {
  const time = Math.max(0, seconds);
  if (!listenLyric.ready) { // not talking yet, so fall back on reloading the player at that time
    $("#listenFrame").src = listenSrc(v.id, time, true, true);
    listenGreetPlayer();
    return;
  }
  listenPlayerSay({ event: "command", func: "seekTo", args: [time, true] });
  listenPlayerSay({ event: "command", func: "playVideo", args: [] });
  listenLyric.touched = 0;
}

function listenFollow(time) {
  const v = VIDEOS.find((x) => x.id === listenState.open);
  const lines = listenLyric.lines;
  if (!v || !lines.length) return;
  const shift = listenShift(v);
  let at = -1;
  for (let i = 0; i < lines.length && lines[i].t + shift <= time; i++) at = i;
  if (at === listenLyric.at) return;
  listenLyric.at = at;
  const box = $("#listenLyrics");
  $$(".listen-line.now", box).forEach((b) => b.classList.remove("now"));
  const line = at >= 0 && $(`.listen-line[data-line="${at}"]`, box);
  if (!line) return; // a gap between lines
  line.classList.add("now");
  if (Date.now() - listenLyric.touched < 4000) return;
  // Moves only the lyrics box, never the page.
  const top = line.offsetTop - (box.clientHeight - line.offsetHeight) / 2;
  box.scrollTo({ top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

addEventListener("message", (e) => {
  const frame = $("#listenFrame");
  if (!frame || e.source !== frame.contentWindow || typeof e.data !== "string") return;
  let data;
  try { data = JSON.parse(e.data); } catch { return; }
  listenLyric.ready = true;
  // A label can stop its video playing on other sites, which YouTube only says once the player has loaded.
  if (data.event === "onError" && [100, 101, 150].includes(data.info) && !$("#listenBlocked")) {
    $(".listen-frame").insertAdjacentHTML("afterend", `<p class="small muted" id="listenBlocked">This video won't play here. <a href="https://www.youtube.com/watch?v=${listenEsc(listenState.open)}" target="_blank" rel="noopener">Open it on YouTube</a>, and the lyrics are still below.</p>`);
  }
  const time = data.info && data.info.currentTime;
  if (typeof time === "number") listenFollow(time);
});
