// "Your progress" on the Home tab: a member's own numbers, drawn from what the site already saves
// for them (see Progress in app.js). Only they see this. Loaded after the lesson scripts and uses
// their helpers.

const STATS_DAYS = 30;
const statsUI = { tableOpen: false };

const shortDay = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
const countOf = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// The last `n` days ending `endsAgo` days back, oldest first.
const lastDays = (n, endsAgo = 0) => Array.from({ length: n }, (_, i) => addDays(dayStr(), i - n + 1 - endsAgo));
const xpIn = (days) => days.reduce((sum, d) => sum + (xpDays[d] || 0), 0);

function longestStreak() {
  let best = 0;
  let run = 0;
  let prev = null;
  for (const day of Object.keys(xpDays).filter((d) => xpDays[d] > 0).sort()) {
    run = prev && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return Math.max(best, liveStreak());
}

function weekCompared(now, before) {
  if (now === before) return "same as the week before";
  return now > before ? `${now - before} more than the week before` : `${before - now} less than the week before`;
}

const statTile = (label, value, sub) => `
  <div class="ps-tile">
    <div class="ps-label">${label}</div>
    <div class="ps-value">${value}</div>
    <div class="ps-sub">${sub}</div>
  </div>`;

function statTiles() {
  const week = xpIn(lastDays(7));
  const streak = longestStreak();
  const tests = Object.values(lessonState.tests);
  const average = tests.length ? (tests.reduce((a, b) => a + b, 0) / tests.length).toFixed(1) : "–";
  const all = LESSONS.flatMap((l) => lessonMistakes(l));
  const learned = all.filter((x) => isLearned(x.m)).length;
  const sentences = Object.values(written);
  return [
    statTile("XP this week", week, weekCompared(week, xpIn(lastDays(7, 7)))),
    statTile("Days studied", lastDays(STATS_DAYS).filter((d) => xpDays[d] > 0).length, `in the last ${STATS_DAYS} days`),
    statTile("Longest streak", streak, streak === 1 ? "day" : "days in a row"),
    statTile("Test average", tests.length ? `${average} / ${TEST_LEN}` : average, tests.length ? `your best in ${countOf(tests.length, "test")}` : "no tests yet"),
    statTile("Mistakes fixed", `${learned} / ${all.length}`, all.length ? `${all.length - learned} still to learn` : "none saved yet"),
    statTile("Sentences written", sentences.flat().length, `for ${countOf(sentences.length, "grammar point")}`),
  ].join("");
}

// A round step that gives about four lines on the chart's axis.
function statsAxisStep(top) {
  const raw = top / 4;
  const size = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((x) => x * size).find((x) => x >= raw);
}

function xpChartHTML() {
  const days = lastDays(STATS_DAYS);
  const step = statsAxisStep(Math.max(DAILY_GOAL, ...days.map((d) => xpDays[d] || 0)));
  const top = Math.ceil(Math.max(DAILY_GOAL, ...days.map((d) => xpDays[d] || 0)) / step) * step;
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  const earned = days.filter((d) => xpDays[d] > 0).reverse();
  return `
    <div class="ps-section">
      <h3>XP per day <small>The thick line is your daily goal, ${DAILY_GOAL} XP</small></h3>
      <div class="xpc" id="xpChart">
        <div class="xpc-plot" aria-hidden="true">
          ${ticks.map((v) => `<div class="xpc-grid" style="bottom:${(v / top) * 100}%"><span>${v}</span></div>`).join("")}
          <div class="xpc-goal" style="bottom:${(DAILY_GOAL / top) * 100}%"></div>
          <div class="xpc-cols">
            ${days.map((d) => `
              <div class="xpc-col" data-day="${d}">
                ${xpDays[d] > 0 ? `<span class="xpc-bar" style="height:${(xpDays[d] / top) * 100}%"></span>` : ""}
              </div>`).join("")}
          </div>
        </div>
        <div class="xpc-axis" aria-hidden="true"><span>${shortDay(days[0])}</span><span>Today</span></div>
        <div class="xpc-tip" hidden></div>
      </div>
      ${earned.length ? `
        <details class="ps-table"${statsUI.tableOpen ? " open" : ""}>
          <summary>Show as a table</summary>
          <table>
            <tr><th>Day</th><th>XP</th></tr>
            ${earned.map((d) => `<tr><td>${shortDay(d)}</td><td>${xpDays[d]}</td></tr>`).join("")}
          </table>
        </details>` : `<p class="small muted">Your chart starts with the first XP you earn.</p>`}
    </div>`;
}

function wireXpChart(box) {
  const chart = $("#xpChart", box);
  const tip = $(".xpc-tip", chart);
  $$(".xpc-col", chart).forEach((col) => {
    col.onpointerenter = () => {
      const xp = xpDays[col.dataset.day] || 0;
      tip.innerHTML = `<b>${shortDay(col.dataset.day)}</b>${xp} XP${xp >= DAILY_GOAL ? " · goal reached" : ""}`;
      tip.hidden = false;
      // Beside the column, on whichever side has room.
      const c = chart.getBoundingClientRect();
      const r = col.getBoundingClientRect();
      const right = r.right - c.left + 6;
      tip.style.left = `${right + tip.offsetWidth > c.width ? r.left - c.left - tip.offsetWidth - 6 : right}px`;
    };
    col.onpointerleave = () => { tip.hidden = true; };
  });
  const table = $(".ps-table", box);
  if (table) table.ontoggle = () => { statsUI.tableOpen = table.open; };
}

// Every grammar point in the course, by the stars on its check.
function starsSectionHTML() {
  const points = LESSONS.flatMap((l) => l.points.map((_, i) => pointStars(l.n, i)));
  const parts = [
    { stars: 3, label: "3 stars" },
    { stars: 2, label: "2 stars" },
    { stars: 1, label: "1 star" },
    { stars: 0, label: "No stars yet" },
  ].map((p) => ({ ...p, n: points.filter((s) => s === p.stars).length }));
  const earned = points.reduce((a, b) => a + b, 0);
  return `
    <div class="ps-section">
      <h3>Grammar points <small>${earned} of ${points.length * 3} stars</small></h3>
      <div class="ps-bar" role="img" aria-label="${parts.map((p) => `${p.label}: ${p.n}`).join(", ")}">
        ${parts.filter((p) => p.n).map((p) => `<span class="ps-seg s${p.stars}" style="flex-grow:${p.n}" title="${p.label}: ${p.n}"></span>`).join("")}
      </div>
      <ul class="ps-legend">
        ${parts.map((p) => `<li><span class="ps-key s${p.stars}"></span>${p.label}<b>${p.n}</b></li>`).join("")}
      </ul>
    </div>`;
}

// Points they've started but not mastered, lowest stars first: the check is one click away.
function weakSectionHTML() {
  const weak = LESSONS.flatMap((l) => l.points.map((_, i) => ({ l, i })))
    .filter(({ l, i }) => pointStars(l.n, i) > 0 && pointStars(l.n, i) < 3)
    .sort((a, b) => pointStars(a.l.n, a.i) - pointStars(b.l.n, b.i))
    .slice(0, 3);
  return `
    <div class="ps-section">
      <h3>Worth another look</h3>
      ${weak.length ? weak.map(({ l, i }) => `
        <button class="ps-weak" data-l="${l.n}" data-p="${i}">
          <span class="ps-weak-name">${pointPill({ l, i })}</span>
          <span class="small muted">Lesson ${l.n}</span>
          ${starsHTML(pointStars(l.n, i))}
        </button>`).join("") : `<p class="small muted">Grammar points with one or two stars show up here, ready to practise.</p>`}
    </div>`;
}

// Drawn as Home opens and when XP comes in on it. It's skipped while Home is hidden, since nothing
// can be seen changing there.
function renderStats() {
  const box = $("#stats");
  if (!box || !$("#home").classList.contains("active")) return;
  box.innerHTML = `
    <div class="rl-head"><span class="rl-kicker">📊 Your progress</span></div>
    <div class="ps-tiles">${statTiles()}</div>
    ${xpChartHTML()}
    <div class="ps-duo">${starsSectionHTML()}${weakSectionHTML()}</div>`;
  wireXpChart(box);
  $$(".ps-weak", box).forEach((b) => (b.onclick = () => {
    track("home.stats");
    openLessonTab(LESSONS.find((l) => l.n === +b.dataset.l));
    openCheck(LESSONS.find((l) => l.n === +b.dataset.l), +b.dataset.p);
  }));
}
