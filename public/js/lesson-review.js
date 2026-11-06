// Spaced review on the Home tab: each finished grammar point comes back at growing intervals.
// A day's review stops at REVIEW_LIMIT points, and "Study more" keeps going in small batches for
// anyone who wants to. Loaded after lesson-roulette.js and uses its helpers.

const REVIEW_STEPS = [1, 3, 7, 21, 60]; // days until the next review, at each step
const REVIEW_LIMIT = 10; // points in a day's review
const REVIEW_MORE = 5; // points in each "study more" batch
const REVIEW_QS = 2; // questions per point
const REVIEW_BONUS = 25; // XP for the first review finished each day
const REVIEW_PILLS = 6; // points named on the card

// reviewPlan: { "lesson.point": { step, last: day last reviewed, due: day of the next review } }.
// reviewLog: { day, done: due points reviewed that day, bonus: the day's XP bonus is paid }.
const reviewPlan = store.get("review", {});
const reviewLog = Object.assign({ day: null, done: 0, bonus: false }, store.get("reviewDay", {}));
// busy: mid-review, so nothing redraws the card. loaded: points finished before this page opened
// have been scheduled. day: the day the card was last drawn for.
const reviewUI = { busy: false, loaded: false, day: null };

function logToday() {
  if (reviewLog.day !== dayStr()) Object.assign(reviewLog, { day: dayStr(), done: 0, bonus: false });
  return reviewLog;
}

function addDays(day, n) {
  const [y, m, d] = day.split("-").map(Number);
  return dayStr(new Date(y, m - 1, d + n));
}

function daysUntil(day) {
  const [y, m, d] = day.split("-").map(Number);
  const now = new Date();
  return Math.round((new Date(y, m - 1, d) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
}

const whenText = (day) => {
  const n = daysUntil(day);
  return n <= 0 ? "Today" : n === 1 ? "Tomorrow" : `In ${n} days`;
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/* ---------------------------------------------------------------- The schedule */

// Finished points that have no date yet get one, a day's limit at a time, so a long list of old
// points doesn't all come due at once. `firstIn`: days until the first of them.
function schedulePoints(firstIn) {
  const today = dayStr();
  const fresh = finishedPoints().filter((p) => !reviewPlan[pointKey(p)]);
  fresh.forEach((p, n) => {
    reviewPlan[pointKey(p)] = { step: 0, last: today, due: addDays(today, firstIn + Math.floor(n / REVIEW_LIMIT)) };
  });
  if (fresh.length) store.set("review", reviewPlan);
}

const dueOf = (p) => reviewPlan[pointKey(p)].due;
const byDue = (a, b) => dueOf(a).localeCompare(dueOf(b));
// Sorted without changing the lesson order of those on the same day, most overdue first.
const duePoints = () => finishedPoints().filter((p) => dueOf(p) <= dayStr()).sort(byDue);
const laterPoints = () => finishedPoints().filter((p) => dueOf(p) > dayStr()).sort(byDue);

// Everything right moves a point up a step, a slip moves it down one, nothing right starts it
// over. Reviewing early never brings a reward forward: all right leaves its date alone, and a slip
// can only bring it closer. Returns the point's date afterwards.
function applyReview(key, right, of) {
  const old = reviewPlan[key];
  const today = dayStr();
  const early = old.due > today;
  if (early && right === of) return { due: old.due, early };
  let step = old.step;
  if (right === of) step = Math.min(step + 1, REVIEW_STEPS.length - 1);
  else step = right ? Math.max(step - 1, 0) : 0;
  let due = addDays(today, REVIEW_STEPS[step]);
  if (early && old.due < due) due = old.due;
  reviewPlan[key] = { step, last: today, due };
  store.set("review", reviewPlan);
  return { due, early };
}

// A point's 5-question check also counts as its review, if the review was due.
function reviewFromCheck(l, i, score) {
  const key = `${l.n}.${i}`;
  const entry = reviewPlan[key];
  if (!entry || entry.due > dayStr()) return;
  applyReview(key, score >= 4 ? 2 : score === 3 ? 1 : 0, 2);
  renderReview();
}

// A grammar point missed in a big test comes back tomorrow, a step lower. False if it isn't on the
// schedule, because its lesson isn't finished yet.
function reviewFromMiss(key) {
  const old = reviewPlan[key];
  if (!old) return false;
  const today = dayStr();
  const tomorrow = addDays(today, 1);
  reviewPlan[key] = { step: Math.max(old.step - 1, 0), last: today, due: old.due < tomorrow ? old.due : tomorrow };
  store.set("review", reviewPlan);
  return true;
}

/* ---------------------------------------------------------------- The card */

// What today's limit leaves, and what "study more" would go on to.
const todaysSet = () => duePoints().slice(0, Math.max(REVIEW_LIMIT - logToday().done, 0));

function moreOffer() {
  const due = duePoints();
  if (todaysSet().length) return null;
  const batch = (due.length ? due : laterPoints()).slice(0, REVIEW_MORE);
  if (!batch.length) return null;
  return { points: batch, label: due.length ? `Study ${batch.length} more` : `Review ${batch.length} early` };
}

const pointPill = ({ l, i }) => {
  const p = l.points[i];
  return `<span class="rv-pill" lang="ja" style="--c:${ROLES[p.role].color}">${p.g}</span>`;
};

function renderReview() {
  const box = $("#review");
  if (!box || reviewUI.busy) return;
  reviewUI.day = dayStr();
  schedulePoints(reviewUI.loaded ? 1 : 0);
  reviewUI.loaded = true;

  const head = (right = "") => `<div class="rl-head"><span class="rl-kicker">📅 Due today</span>${right}</div>`;
  if (!finishedPoints().length) {
    box.innerHTML = `${head()}<p class="small muted rv-text">Finish a grammar point and it will come back here just before you'd forget it.</p>`;
    return;
  }

  const log = logToday();
  const set = todaysSet();
  const dueCount = duePoints().length;
  if (set.length) {
    const qs = set.length * REVIEW_QS;
    const shown = set.slice(0, REVIEW_PILLS);
    const rest = set.length - shown.length;
    const after = dueCount - set.length;
    box.innerHTML = `
      ${head(log.bonus ? "" : `<span class="xp-chip">+${REVIEW_BONUS} XP</span>`)}
      <p class="small rv-text">${plural(set.length, "grammar point")} ready to review, about ${plural(Math.max(1, Math.round(qs / 3)), "minute")}.${after ? ` <span class="muted">${after} more can wait, or you can study them afterwards.</span>` : ""}</p>
      <div class="rv-pills">${shown.map(pointPill).join("")}${rest ? `<span class="rv-pill rv-rest">+${rest} more</span>` : ""}</div>
      <div class="rv-foot">
        <button class="btn primary" id="rvStart">Start ${qs} questions</button>
        ${upcomingHTML()}
      </div>`;
    $("#rvStart").onclick = () => startReview(set, true);
    return;
  }

  // Nothing left in today's set: say so, and offer more.
  const more = moreOffer();
  const words = dueCount
    ? `Today's ${REVIEW_LIMIT} are done. ${dueCount} more ${dueCount === 1 ? "is" : "are"} due, and can wait if you've had enough.`
    : `All caught up.${nextText()}`;
  box.innerHTML = `
    ${head(log.done ? `<span class="rl-count small"><b>${log.done}</b> reviewed today</span>` : "")}
    <p class="small rv-text">${words}</p>
    <div class="rv-foot">
      ${more ? `<button class="btn" id="rvMore">${more.label}</button>` : ""}
      ${dueCount ? upcomingHTML() : ""}
    </div>`;
  if (more) $("#rvMore").onclick = () => startReview(more.points, false);
}

function nextText() {
  const later = laterPoints();
  if (!later.length) return "";
  const first = dueOf(later[0]);
  const count = later.filter((p) => dueOf(p) === first).length;
  return ` Next review: ${whenText(first).toLowerCase()} (${plural(count, "point")}).`;
}

function upcomingHTML() {
  const later = laterPoints();
  const tomorrow = later.filter((p) => daysUntil(dueOf(p)) === 1).length;
  const week = later.filter((p) => daysUntil(dueOf(p)) <= 7).length;
  return week ? `<span class="small muted">Tomorrow ${tomorrow} · this week ${week}</span>` : "";
}

/* ---------------------------------------------------------------- The questions */

// Two questions on each point, all mixed together, so you work out which grammar applies.
function reviewQuestions({ l, i }) {
  const all = lessonDrills(l);
  const [a, b] = shuffle(drillsOfPoint({ l, i }));
  const link = l.points[i].link;
  const second = isFormLink(link) ? () => formQ(link) : pick([gapQ, (d) => meaningQ(d, all), sentenceQ]);
  return [gapQ(a), b ? second(b) : isFormLink(link) ? formQ(link) : null].filter(Boolean);
}

function startReview(points, daily) {
  track(daily ? "review.daily" : "review.more");
  const mixed = shuffle(points.flatMap((p) => reviewQuestions(p).map((q) => ({ q, key: pointKey(p) }))));
  const t = { qs: mixed.map((x) => x.q), owners: mixed.map((x) => x.key), i: 0, results: [], points, daily, outcomes: {} };
  reviewUI.busy = true;
  runReview(t);
  scrollBelowBar($("#review"));
}

function runReview(t) {
  const box = $("#review");
  box.innerHTML = `
    <div class="lt-top">
      <span class="small"><b>Review · question ${t.i + 1}</b> of ${t.qs.length}</span>
      <div class="lt-dots">${progressDots(t)}</div>
      <button class="icon-btn lp-close" aria-label="Stop for now">✕</button>
    </div>
    <div class="lp-q"></div>
    <div class="q-actions"><button class="btn primary" hidden>${t.i + 1 < t.qs.length ? "Next question →" : "See my result →"}</button></div>`;
  $(".lp-close", box).onclick = leaveReview;
  const next = $(".q-actions .btn", box);
  askIn($(".lp-q", box), t.qs[t.i], (ok, b) => {
    t.results[t.i] = ok;
    if (ok) addXP(XP.check, b);
    savePointIfDone(t, t.owners[t.i]);
    $(".lt-dots", box).innerHTML = progressDots(t);
    next.hidden = false;
    next.focus({ preventScroll: true });
  });
  next.onclick = () => {
    t.i++;
    if (t.i < t.qs.length) runReview(t);
    else finishReview(t);
    scrollIfAbove(box);
  };
}

// Saved as soon as a point's last question is answered, so stopping halfway loses nothing.
function savePointIfDone(t, key) {
  const mine = t.owners.map((k, j) => (k === key ? j : -1)).filter((j) => j >= 0);
  if (mine.some((j) => t.results[j] === undefined)) return;
  const right = mine.filter((j) => t.results[j]).length;
  const result = applyReview(key, right, mine.length);
  t.outcomes[key] = { ...result, right, of: mine.length };
  if (!result.early) {
    logToday().done++;
    store.set("reviewDay", reviewLog);
  }
}

function leaveReview() {
  reviewUI.busy = false;
  renderReview();
}

/* ---------------------------------------------------------------- The result */

function outcomeRow(t, p) {
  const o = t.outcomes[pointKey(p)];
  const cls = o.right === o.of ? "good" : o.right ? "some" : "bad";
  const stayed = o.early && o.right === o.of;
  return `
    <div class="rv-row">
      ${pointPill(p)}
      <span class="rv-mark ${cls}">${o.right} / ${o.of}</span>
      <span class="small muted">${stayed ? `Stays on schedule: ${whenText(o.due).toLowerCase()}` : `Next: ${whenText(o.due).toLowerCase()}`}</span>
    </div>`;
}

function finishReview(t) {
  track("review.done");
  const score = t.results.filter(Boolean).length;
  const log = logToday();
  const paid = t.daily && !log.bonus;
  if (paid) {
    log.bonus = true;
    store.set("reviewDay", reviewLog);
  }
  reviewUI.busy = false;
  schedulePoints(1); // a lesson may have been finished while the card wasn't being redrawn
  const more = moreOffer();
  const box = $("#review");
  box.innerHTML = `
    <div class="rl-kicker">📅 Review done</div>
    <div class="rl-score"><b>${score}</b> / ${t.qs.length}${paid ? ` <span class="xp-chip">+${REVIEW_BONUS} XP bonus</span>` : ""}</div>
    <div class="rv-rows">${t.points.map((p) => outcomeRow(t, p)).join("")}</div>
    ${missedHTML(t)}
    <div class="rl-actions rv-actions">
      <button class="btn primary" id="rvDone">Done</button>
      ${more ? `<button class="btn" id="rvMore">${more.label}</button>` : ""}
    </div>`;
  $("#rvDone").onclick = leaveReview;
  if (more) $("#rvMore").onclick = () => startReview(more.points, false);
  if (paid) addXP(REVIEW_BONUS, $("#review .rl-score b"));
  if (score === t.qs.length) burst($("#review .rl-score"));
}

// The page left open overnight gets a new day's review.
document.addEventListener("visibilitychange", () => {
  if (document.hidden || reviewUI.busy || reviewUI.day === dayStr()) return;
  renderReview();
});
