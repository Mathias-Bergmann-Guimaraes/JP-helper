// The Mistakes tab: every sentence the chatbot corrected, from all lessons, grouped by lesson and
// grammar point. Loaded after lesson-mistakes.js and uses its helpers; they keep the saved list.

const MISTAKE_SHOWS = {
  all: { label: "All", test: () => true, none: "" },
  open: { label: "To learn", test: (m) => !isLearned(m), none: "All learned — nothing left to practise." },
  learned: { label: "Learned", test: isLearned, none: "None learned yet. Pick the right version twice and a mistake moves here." },
};
const mistakesPage = { show: "all", round: false };
const PAGE_ROUND_LEN = 10;

function renderMistakesPage() {
  if (mistakesPage.round) return; // a round under way stays put when you come back to the tab
  if (!$("#mistakesBody")) {
    $("#mistakes").innerHTML = `
      <div class="card hero">
        <h1>Your <span class="accent">mistakes</span></h1>
        <p>Every sentence your chatbot corrected, from every lesson, next to the fixed version.
        Each one comes back in its point's check until you pick the right version twice.</p>
      </div>
      <div id="mistakesBody"></div>`;
  }
  const box = $("#mistakesBody");
  const all = LESSONS.flatMap((l) => lessonMistakes(l));
  if (!all.length) {
    box.innerHTML = `
      <div class="card lm-card">
        <p class="mp-empty">Nothing here yet. Write your own sentences in a lesson and paste your chatbot's answer
          back: anything it corrects is saved here.</p>
        <div><button class="btn primary" id="mpLessons">Go to the lessons →</button></div>
      </div>`;
    $("#mpLessons").onclick = () => { showTab("lessons"); window.scrollTo({ top: 0 }); };
    return;
  }
  const open = all.filter((x) => !isLearned(x.m)).length;
  const counts = { all: all.length, open, learned: all.length - open };
  const list = mistakeLessonsHTML(MISTAKE_SHOWS[mistakesPage.show].test);
  box.innerHTML = `
    <div class="card lm-card">
      <div class="lm-bar">
        <div class="seg" role="group" aria-label="Which mistakes to show">
          ${Object.entries(MISTAKE_SHOWS).map(([k, s]) => `
            <button class="${k === mistakesPage.show ? "active" : ""}" data-show="${k}">${s.label} · ${counts[k]}</button>`).join("")}
        </div>
        ${open ? `<button class="btn primary lm-practise">Practise ${open === 1 ? "it" : open > PAGE_ROUND_LEN ? `${PAGE_ROUND_LEN} of them` : `these ${open}`} now</button>` : ""}
      </div>
      <div class="lm-quiz" hidden></div>
      <div class="lm-list">${list || `<p class="mp-empty muted">${MISTAKE_SHOWS[mistakesPage.show].none}</p>`}</div>
    </div>`;
  $$("[data-show]", box).forEach((b) => (b.onclick = () => { mistakesPage.show = b.dataset.show; renderMistakesPage(); }));
  $$("[data-lesson]", box).forEach((b) => (b.onclick = () => {
    openLessonTab(LESSONS.find((l) => l.n === +b.dataset.lesson));
    scrollBelowBar($("#lMistakes"));
  }));
  $$("[data-del]", box).forEach((b) => (b.onclick = () => {
    const [n, i, k] = b.dataset.del.split(".").map(Number);
    removeMistake(LESSONS.find((l) => l.n === n), i, k);
    renderMistakesPage();
  }));
  const go = $(".lm-practise", box);
  if (go) go.onclick = startPageRound;
}

// Each lesson with mistakes passing `test`, its points below it. Empty if there are none.
function mistakeLessonsHTML(test) {
  return LESSONS.map((l) => {
    const points = l.points.map((p, i) => {
      // Numbered before filtering: k is the mistake's place in the saved list.
      const shown = (mistakes[`${l.n}.${i}`] || []).map((m, k) => ({ m, k })).filter((x) => test(x.m));
      return shown.length ? mistakeGroupHTML(p, i, shown.map((x) => mistakeItemHTML(x.m, `${l.n}.${i}.${x.k}`)).join("")) : "";
    }).join("");
    return points ? `
      <div class="mp-lesson">
        <div class="mp-head">
          <h2>${l.n}. ${l.title}</h2>
          <button class="btn" data-lesson="${l.n}">Open lesson →</button>
        </div>
        ${points}
      </div>` : "";
  }).join("");
}

// Mistakes not learned yet from any lesson, one question each.
function startPageRound() {
  const open = LESSONS.flatMap((l) => lessonMistakes(l).filter((x) => !isLearned(x.m)).map((x) => ({ l, ...x })));
  const qs = shuffle(open).slice(0, PAGE_ROUND_LEN).map((x) => mistakeQ(x.l, x.i, x.m));
  if (!qs.length) return;
  track("mistakes.round");
  mistakesPage.round = true;
  const area = $("#mistakesBody");
  $(".lm-list", area).hidden = true;
  $(".lm-bar", area).hidden = true;
  const box = $(".lm-quiz", area);
  box.hidden = false;
  runMistakeRound(area, box, { qs, i: 0, results: [] }, () => {
    mistakesPage.round = false;
    renderMistakesPage();
  });
  scrollBelowBar(area);
}
