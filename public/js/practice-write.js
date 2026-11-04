// Practice's Write mode: sentences of your own, guided by a translation, a pattern, a theme, words
// to use, a situation, a question or half a sentence. The tasks are in write-prompts.js. A task runs
// in a free text round of the sentence builder, so the chatbot checks it like any other: see
// lesson-build.js. Loaded after it and uses its helpers.

const GUIDE_KINDS = [
  { id: "mix", icon: "🎲", label: "Surprise me", about: "A different kind of task each time." },
  { id: "translate", icon: "🌐", label: "Translate", about: "Direct translation, from English into Japanese. The site knows these wordings, so many are marked right away." },
  { id: "pattern", icon: "🎯", label: "Use a pattern", about: "One grammar pattern to use, in a sentence that's all yours." },
  { id: "theme", icon: "🎨", label: "Theme", about: "A general topic to write about. Starter words are in the hints." },
  { id: "words", icon: "🧺", label: "Word bank", about: "Three words you have to fit into one sentence." },
  { id: "situation", icon: "🎬", label: "Situation", about: "A real moment: what would you say?" },
  { id: "question", icon: "💬", label: "Answer it", about: "A question in Japanese, about you. Answer it truthfully or make something up." },
  { id: "starter", icon: "✍️", label: "Finish it", about: "Part of a sentence is given. You write the rest." },
  { id: "two", icon: "🔗", label: "Two patterns", about: "Two grammar points in one sentence. The hardest one." },
];
const WRITE_COUNTS = [3, 5, 8];
const WRITE_LOG_MAX = 30;
// Teaches the groups, not something to write a sentence with.
const NOT_FOR_WRITING = ["14.0"];

// kind, theme and count are this browser's choices. builder: the round under way, if any.
const writeState = {
  kind: store.get("writeKind", "mix"), theme: store.get("writeTheme", ""), count: store.get("writeCount", 5), builder: null,
};
// The sentences of finished rounds, newest first, in this browser (see LOCAL_PROGRESS in app.js):
// [{ ja, task, mark, day }]
const writeLog = store.get("writeLog", []);

/* ---------------------------------------------------------------- Making a task */

const lessonOf = (n) => LESSONS.find((l) => l.n === n);
const pointAt = (at) => {
  const [n, i] = at.split(".").map(Number);
  const l = lessonOf(n);
  return { l, i, p: l.points[i] };
};

// ctx says what a round draws from: l (its lesson), lessons, point (one point of the lesson, or
// null), theme (a theme's id, or ""), used (what's come up, so a round doesn't repeat itself).
const scopePoints = (ctx) => ctx.lessons
  .flatMap((l) => l.points.map((p, i) => ({ l, i, p })))
  .filter(({ l, i }) => !NOT_FOR_WRITING.includes(`${l.n}.${i}`) && (ctx.point === null || i === ctx.point));

function pickFreshFor(ctx, list, keyOf) {
  const fresh = list.filter((x) => !ctx.used.has(keyOf(x)));
  const x = pick(fresh.length ? fresh : list);
  ctx.used.add(keyOf(x));
  return x;
}

// Tasks for exactly this grammar while any are left, then anything from lessons up to here.
function tasksFor(list, ctx) {
  const inScope = list.filter(([at]) => {
    const [n, i] = at.split(".").map(Number);
    return ctx.lessons.some((l) => l.n === n) && (ctx.point === null || i === ctx.point);
  });
  if (inScope.some(([at, text]) => !ctx.used.has(text))) return inScope;
  return list.filter(([at]) => +at.split(".")[0] <= ctx.l.n);
}

const chooseTheme = (ctx) => WRITE_THEMES.find((t) => t.id === ctx.theme) || pickFreshFor(ctx, WRITE_THEMES, (t) => t.id);

const grammarHint = ({ p }, label = "Grammar to use") => ({ label, html: pointHint(p) });
const exampleHint = ({ p }) => ({ label: "Example", html: `<div class="wg-ex" lang="ja" style="--c:${ROLES[p.role].color}">${rich(p.ex)}</div><div class="small muted">${p.en}</div>` });
const wordsHint = (theme, n = 6) => ({ label: `Words: ${theme.name.toLowerCase()}`, html: wordChips(shuffle(theme.words.slice()).slice(0, n)) });
const coloured = ({ p }) => `<b lang="ja" style="color:${ROLES[p.role].color}">${p.g}</b>`;

// The word as it's written, without what changes when it's used: 飲みます → 飲, 暑い → 暑.
function wordForms(word) {
  const w = word.split("=")[0];
  return [plain(w), kana(w)].map((s) => {
    if (!/(ます|ました|い)$/.test(s)) return s;
    const kanji = s.match(/^[々㐀-鿿]+/);
    return kanji ? kanji[0] : s.replace(/(ます|ました|い)$/, "");
  });
}

// What the site can notice about a sentence of your own. Never more than a question: only the
// chatbot can say it's wrong.
function ownDoubt(n, points) {
  if (n.length < 3) return "A bit longer: make it a whole sentence.";
  for (const { l, i, p } of points) {
    if (lessonSentences(l).has(n)) return "That one is from the lesson. Change the people, things or places to make it yours.";
    const spots = spotsFor(l, i);
    if (spots && !spots.some((c) => n.includes(normJa(c)))) return `Can't spot <b lang="ja">${plain(p.g)}</b> in it. Another form of it is fine.`;
  }
  return "";
}

const GUIDE_MAKERS = {
  translate(ctx) {
    const lessons = ctx.lessons;
    const builds = lessons.flatMap(lessonBuilds).filter((b) => ctx.point === null || b.i === ctx.point);
    const freshBuilds = builds.filter((b) => !ctx.used.has(b.en));
    if (freshBuilds.length) {
      const b = pick(freshBuilds);
      ctx.used.add(b.en);
      return buildGuide(b);
    }
    // Then the lesson's practice sentences. Conversations don't make good translations.
    const drills = lessons.flatMap((l) => lessonDrills(l).filter((d) => !d.en.includes(":") && (ctx.point === null || d.point === l.points[ctx.point])).map((d) => ({ l, d })));
    if (!drills.length) return null;
    const { l, d } = pickFreshFor(ctx, drills, (x) => x.d.en);
    const full = d.before + d.answer + d.after;
    const n = [normJa(plain(full)), normJa(kana(full))];
    return {
      main: `“${d.en}”`, short: d.en, ask: `Translate into Japanese: "${d.en}"`, l, i: l.points.indexOf(d.point), xp: XP.build,
      accept: new Set(n), natural: n, site: ruby(full),
      hints: [
        { label: "Grammar to use", html: pointHint(d.point) },
        { label: "With a gap", html: `<div class="wg-ex" lang="ja">${ruby(d.before)}<span class="wg-gap">＿＿</span>${ruby(d.after)}</div>` },
      ],
    };
  },

  pattern(ctx) {
    const pt = pickFreshFor(ctx, scopePoints(ctx), ({ l, i }) => `p${l.n}.${i}`);
    const theme = chooseTheme(ctx);
    return {
      main: `Write a sentence of your own with ${coloured(pt)}`, sub: pt.p.m, short: `Use ${plain(pt.p.g)}`,
      ask: `Write a sentence of my own using the pattern ${plain(pt.p.g)}, meaning "${pt.p.m}".`,
      l: pt.l, i: pt.i, xp: XP.compose, doubt: (n) => ownDoubt(n, [pt]),
      hints: [exampleHint(pt), wordsHint(theme)],
    };
  },

  theme(ctx) {
    const theme = chooseTheme(ctx);
    const pt = pick(scopePoints(ctx));
    const idea = pick(theme.ideas);
    return {
      main: `Write about <b>${theme.name.toLowerCase()}</b> ${theme.icon}`, sub: `For example: ${idea}.`, short: `Theme: ${theme.name}`,
      ask: `Write a sentence on the theme "${theme.name}" (for example: ${idea}).`,
      l: pt.l, i: pt.i, xp: XP.compose, doubt: (n) => (n.length < 3 ? "A bit longer: make it a whole sentence." : ""),
      hints: [wordsHint(theme), grammarHint(pt, "Grammar you could try"), exampleHint(pt)],
    };
  },

  words(ctx) {
    const theme = chooseTheme(ctx);
    const words = shuffle(theme.words.slice()).slice(0, 3);
    const pt = pick(scopePoints(ctx));
    const shown = words.map((w) => plain(w.split("=")[0]));
    return {
      main: "Fit all three into one sentence", sub: wordChips(words), short: `Use ${shown.join("・")}`,
      ask: `Write one sentence using all of these words, in whatever form fits: ${shown.join(", ")}.`,
      l: pt.l, i: pt.i, xp: XP.compose,
      doubt: (n) => {
        if (n.length < 3) return "A bit longer: make it a whole sentence.";
        const missing = words.filter((w) => !wordForms(w).some((f) => n.includes(normJa(f))));
        return missing.length ? `Can't spot <b lang="ja">${missing.map((w) => plain(w.split("=")[0])).join("・")}</b> in it. Another form of it is fine.` : "";
      },
      hints: [grammarHint(pt, "Grammar you could try"), exampleHint(pt)],
    };
  },

  situation(ctx) {
    const [at, en] = pickFreshFor(ctx, tasksFor(WRITE_SITUATIONS, ctx), (x) => x[1]);
    const pt = pointAt(at);
    return {
      main: en, short: en, ask: `Situation: ${en} Write what I would say, in Japanese.`,
      l: pt.l, i: pt.i, xp: XP.compose, doubt: (n) => (n.length < 3 ? "A bit longer: make it a whole sentence." : ""),
      hints: [grammarHint(pt), exampleHint(pt)],
    };
  },

  question(ctx) {
    const [at, q, en] = pickFreshFor(ctx, tasksFor(WRITE_QUESTIONS, ctx), (x) => x[1]);
    const pt = pointAt(at);
    return {
      main: `<span class="wg-ja" lang="ja">${ruby(q)}</span>`, short: `<span lang="ja">${plain(q)}</span>`,
      ask: `Answer this question about myself: "${plain(q)}" (${en})`,
      l: pt.l, i: pt.i, xp: XP.compose, doubt: (n) => (n.length < 2 ? "A bit longer, please." : ""),
      hints: [{ label: "In English", html: en }, grammarHint(pt), exampleHint(pt)],
    };
  },

  starter(ctx) {
    const [at, s, en] = pickFreshFor(ctx, tasksFor(WRITE_STARTERS, ctx), (x) => x[1]);
    const pt = pointAt(at);
    const parts = (f) => f(s).split("＿＿").map(normJa).filter(Boolean);
    return {
      main: `<span class="wg-ja" lang="ja">${ruby(s).replace(/＿＿/g, '<span class="wg-gap">＿＿</span>')}</span>`,
      short: `<span lang="ja">${plain(s)}</span>`, ask: `Finish this sentence: "${plain(s)}" (${en})`,
      l: pt.l, i: pt.i, xp: XP.compose,
      doubt: (n) => ([plain, kana].some((f) => parts(f).every((x) => n.includes(x))) ? "" : "Keep the part that's given, and write the rest around it."),
      hints: [{ label: "In English", html: en }, grammarHint(pt), exampleHint(pt)],
    };
  },

  two(ctx) {
    const a = pickFreshFor(ctx, scopePoints(ctx), ({ l, i }) => `p${l.n}.${i}`);
    const wider = LESSONS.filter((l) => l.n <= ctx.l.n).flatMap((l) => l.points.map((p, i) => ({ l, i, p })))
      .filter((x) => x.p !== a.p && !NOT_FOR_WRITING.includes(`${x.l.n}.${x.i}`));
    if (!wider.length) return null;
    const b = pick(wider);
    return {
      main: `Use both in one sentence: ${coloured(a)} + ${coloured(b)}`, sub: `${a.p.m} · ${b.p.m}. If they really won't fit, two short sentences are fine.`,
      short: `Use ${plain(a.p.g)} + ${plain(b.p.g)}`,
      ask: `Use both of these in one sentence (or, if they really won't fit, two short linked sentences): ${plain(a.p.g)}, meaning "${a.p.m}", and ${plain(b.p.g)}, meaning "${b.p.m}".`,
      l: a.l, i: a.i, xp: XP.two, doubt: (n) => ownDoubt(n, [a, b]),
      hints: [exampleHint(a), exampleHint(b)],
    };
  },
};

// A kind's next task, for this round. "mix" goes through all the kinds before any comes round again.
function makeGuide(kindId, ctx) {
  let id = kindId;
  if (kindId === "mix") {
    if (!ctx.mix || !ctx.mix.length) ctx.mix = shuffle(Object.keys(GUIDE_MAKERS));
    id = ctx.mix.pop();
  }
  // Some grammar has no sentences to translate: a theme always works.
  const guide = GUIDE_MAKERS[id](ctx) || GUIDE_MAKERS.theme(ctx);
  const kind = GUIDE_KINDS.find((k) => k.id === id);
  return { ...guide, tag: `<span aria-hidden="true">${kind.icon}</span> ${kind.label}`, swap: () => makeGuide(kindId, ctx) };
}

const writeContext = () => ({ l: scopeLesson(), lessons: scopeLessons(), point: scopePoint(), theme: writeState.theme, used: new Set() });

/* ---------------------------------------------------------------- Setting up a round */

function drawWrite() {
  if (writeState.builder) return;
  const kind = GUIDE_KINDS.find((k) => k.id === writeState.kind) || GUIDE_KINDS[0];
  const needsTheme = ["theme", "words"].includes(kind.id);
  const box = $("#pWrite");
  box.innerHTML = `
    <div class="card pr-card">
      <div class="rl-head">
        <span class="rl-kicker">✎ Write sentences</span>
        <span class="rl-count small">+${XP.compose} XP for each one your chatbot marks ✓</span>
      </div>
      <div class="row-label">What should guide you?</div>
      <div class="ai-presets" role="group" aria-label="What should guide you?">
        ${GUIDE_KINDS.map((k) => `<button class="ai-chip" data-kind="${k.id}" aria-pressed="${k === kind}"><span aria-hidden="true">${k.icon}</span> ${k.label}</button>`).join("")}
      </div>
      <p class="small muted wg-about">${kind.about}</p>
      ${needsTheme ? `
        <div class="row-label">Theme</div>
        <div class="ai-presets" role="group" aria-label="Theme">
          <button class="ai-chip" data-theme-id="" aria-pressed="${!writeState.theme}">Any</button>
          ${WRITE_THEMES.map((t) => `<button class="ai-chip" data-theme-id="${t.id}" aria-pressed="${writeState.theme === t.id}"><span aria-hidden="true">${t.icon}</span> ${t.name}</button>`).join("")}
        </div>` : ""}
      <div class="pr-controls">
        ${scopeHTML()}
        <div class="ai-focus small">How many
          <span class="seg pr-seg" role="group" aria-label="How many sentences">
            ${WRITE_COUNTS.map((n) => `<button data-count="${n}" class="${writeState.count === n ? "active" : ""}">${n}</button>`).join("")}
          </span>
        </div>
      </div>
      <div class="wg-preview">
        <div class="row-label">A task could look like this</div>
        <div class="wg-sample" id="wgSample"></div>
      </div>
      <div class="q-actions"><button class="btn primary" id="wgStart">Start writing →</button></div>
    </div>
    ${writeLogHTML()}`;
  $$("[data-kind]", box).forEach((b) => (b.onclick = () => {
    writeState.kind = b.dataset.kind;
    store.set("writeKind", writeState.kind);
    drawWrite();
  }));
  $$("[data-theme-id]", box).forEach((b) => (b.onclick = () => {
    writeState.theme = b.dataset.themeId;
    store.set("writeTheme", writeState.theme);
    drawWrite();
  }));
  $$("[data-count]", box).forEach((b) => (b.onclick = () => {
    writeState.count = +b.dataset.count;
    store.set("writeCount", writeState.count);
    drawWrite();
  }));
  wireScope(box);
  $("#wgStart").onclick = startWriting;
  const sample = makeGuide(kind.id, writeContext());
  $("#wgSample").innerHTML = `<span class="q-kind wg-kind">${sample.tag}</span><div class="q-en-big">${sample.main}</div>${sample.sub ? `<div class="small muted wg-sub">${sample.sub}</div>` : ""}`;
}

function startWriting() {
  track("practice.write");
  const ctx = writeContext();
  const box = $("#pWrite");
  box.innerHTML = '<div class="card lquiz pr-run"></div>';
  writeState.builder = newBuilder($(".pr-run", box), {
    l: ctx.l, mode: "text", textOnly: true, source: () => [], promptAbout: scopeAbout(),
    guides: () => Array.from({ length: writeState.count }, () => makeGuide(writeState.kind, ctx)),
    closeLabel: "Change the setup",
    onClose: closeWriting,
    onFinished: logRound,
  });
  drawBuild();
  focusBuildText();
  scrollIfAbove(box);
}

function closeWriting() {
  const b = writeState.builder;
  if (b && b.run && !b.run.logged) logRound(b.run);
  writeState.builder = null;
  drawWrite();
  renderPracticeTiles();
}

/* ---------------------------------------------------------------- What you've written */

function logRound(run) {
  run.logged = true;
  const fresh = run.items.filter((x) => x.typed.trim() && ["right", "ok", "bad", "unchecked", "wait", "sent"].includes(x.status)).map((x) => ({
    ja: x.typed.trim(), task: x.guide.short, mark: x.status, fix: x.fix || undefined, day: dayStr(),
  }));
  if (!fresh.length) return;
  writeLog.unshift(...fresh.reverse());
  writeLog.length = Math.min(writeLog.length, WRITE_LOG_MAX);
  store.set("writeLog", writeLog);
  renderPracticeTiles();
}

const writtenToday = () => writeLog.filter((x) => x.day === dayStr()).length;

function writeLogHTML() {
  if (!writeLog.length) return "";
  const marks = { right: ["ok", "✓"], ok: ["ok", "✓"], bad: ["bad", "✗"] };
  return `
    <details class="card pr-log">
      <summary><b>Your last sentences</b> <span class="small muted">${writeLog.length}, kept in this browser</span></summary>
      <div class="pr-log-rows">
        ${writeLog.map((x) => {
          const [cls, mark] = marks[x.mark] || ["", "·"];
          return `
            <div class="sb-tx-row">
              <div class="sb-tx-head">
                <span class="small muted">${x.task}</span>
                <span class="sb-tx-mark small ${cls}">${mark}</span>
              </div>
              <div class="sb-tx-ja" lang="ja">${escHTML(x.ja)}</div>
              ${x.fix ? `<div class="small muted" lang="ja">→ ${escHTML(x.fix)}</div>` : ""}
            </div>`;
        }).join("")}
      </div>
    </details>`;
}
