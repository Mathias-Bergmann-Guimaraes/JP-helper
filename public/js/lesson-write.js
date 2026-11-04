// "Write it": three sentences of your own for each grammar point, for extra XP. Loaded after
// lesson-page.js and lesson-prompts.js and uses their helpers.
//
// The site can't grade free writing, so it only checks what it can be sure of — Japanese, three
// different sentences, not copied from the lesson — and, where it can, spots the pattern. Real
// feedback comes from the "check my sentences" prompt for the user's own chatbot.

// The last three sentences written for each point, keyed "lesson.point". Saved per account.
const written = store.get("sentences", {});
const writeDrafts = {}; // unsent sentences, so closing the box doesn't lose them
// The chatbot's answer pasted back for each point. Kept in this browser only (it can be long).
const feedback = store.get("aiFeedback", {});
const WRITE_COUNT = 3;
const WRITE_MAX = 120;

const isWritten = (n, i) => !!written[`${n}.${i}`];
const writtenCount = (l) => l.points.filter((_, i) => isWritten(l.n, i)).length;

/* ---------------------------------------------------------------- Spotting the pattern */

// Points whose highlighted example doesn't give good markers get a hand-made list. Any form
// listed counts. Points with neither (verb forms like て-form, passive…) aren't spotted at all.
const SPOT = {
  "2.0": ["これ", "それ", "あれ", "どれ"],
  "2.1": ["この", "その", "あの", "どの"],
  "2.3": ["そう", "違い", "ちがい"],
  "3.0": ["ここ", "そこ", "あそこ", "こちら", "そちら", "あちら", "どこ", "どちら"],
  "3.2": ["どこ", "どちら", "何階", "なんがい"],
  "4.1": ["ます", "ません", "ました"],
  "5.1": ["で"],
  "5.2": ["と", "一人で", "ひとりで"],
  "8.2": ["とても", "あまり"],
  "8.3": ["どう", "どんな", "いかが"],
  "9.2": ["よく", "少し", "すこし", "全然", "ぜんぜん", "たくさん", "だいたい", "あまり", "とても"],
  "10.2": ["上", "下", "中", "前", "後ろ", "隣", "近く", "間", "右", "左", "外",
    "うえ", "なか", "まえ", "うしろ", "となり", "ちかく", "あいだ", "みぎ", "ひだり", "そと"],
  "11.0": ["つ", "人", "台", "枚", "個", "本", "冊", "匹", "杯", "歳", "回", "にん", "だい", "まい", "さつ", "ほん", "ぼん", "ぽん", "ひとり", "ふたり"],
  "11.3": ["どのくらい", "どのぐらい", "くらい", "ぐらい", "かかり", "かかる"],
  "13.0": ["欲し", "ほし"],
  "13.1": ["たい", "たく", "たかった"],
  "13.3": ["何か", "なにか", "どこか", "だれか", "誰か"],
  "15.2": ["てい", "でい"],
  "15.3": ["知って", "知り", "知ら", "しって", "しり", "しら"],
  "16.1": ["くて", "で"],
  "17.0": ["ない"],
  "17.4": ["までに", "まで"],
  "18.1": ["ことができ", "ことはでき", "ができ", "でき"],
  "18.2": ["こと", "趣味は", "しゅみは"],
  "19.3": ["なり", "なっ", "なる"],
  "22.1": ["時間", "約束", "用事", "じかん", "やくそく", "ようじ"],
  "22.2": ["が", "の"],
  "24.0": ["くれ", "くださ"],
  "25.2": ["ても", "でも"],
  "26.0": ["んです", "のです", "んだ", "んじゃ"],
  "27.1": ["見え", "聞こえ", "みえ", "きこえ"],
  "29.0": ["てい", "でい"],
  "30.1": ["てお", "でお", "とき", "とく", "どき", "どく"],
  "31.1": ["と思", "とおも"],
  "33.1": ["という", "どういう", "って"],
  "33.2": ["と言って", "といって", "って", "と伝え", "とつたえ"],
  "34.0": ["とおり", "通り", "どおり"],
  "34.1": ["あとで", "後で", "あと", "後"],
  "35.0": ["ば"],
  "36.2": ["ように"],
  "40.2": ["てみ", "でみ"],
  "41.0": ["くださ", "いただ", "やり", "やっ", "やる"],
  "41.1": ["ていただ", "でいただ", "てくださ", "でくださ"],
  "41.2": ["くださいませんか", "いただけませんか"],
  "42.1": ["のに", "に便利", "にべんり", "にいい", "に使", "につか"],
  "43.2": ["て来", "で来", "てき", "でき"],
  "44.1": ["やす", "にく"],
  "44.2": ["くし", "にし", "くす", "にす"],
  "48.0": ["させ", "せます", "せました", "せて", "せた", "せる", "せない"],
  "48.1": ["させ", "せます", "せました", "せて", "せた", "せる", "せない"],
  "48.2": ["せていただけ", "せてください", "せてくださ"],
  "49.2": ["いらっしゃ", "召し上が", "めしあが", "おっしゃ", "なさ", "ご覧", "ごらん", "ご存じ", "ごぞんじ", "くださ"],
  "50.1": ["参", "まいり", "まいる", "申", "もうし", "もうす", "いただ", "おり", "おる", "拝見", "はいけん",
    "伺", "うかが", "いたし", "いたす", "存じ", "ぞんじ", "差し上げ", "さしあげ", "お目にかか", "おめにかか"],
  "50.2": ["ござい"],
};

// Spaces and punctuation don't matter when comparing sentences.
const normJa = (s) => s.normalize("NFKC").replace(/[\s。、，,.．!?！？「」『』（）()…~〜]/g, "");
const JA_RE = /[぀-ヿ㐀-鿿豈-﫿]/;
const POLITE_ENDS = ["ませんでした", "ましょう", "ました", "ません", "ます", "でした", "です"];

// The highlighted part of the example, without a polite ending, so the plain form counts too.
function spotCore(s) {
  const end = POLITE_ENDS.find((e) => s.endsWith(e) && s.length - e.length >= 2);
  return end ? s.slice(0, -end.length) : s;
}

const drillText = (d) => plain(d[0].replace(/\{([^|}]+)[^}]*\}/, "$1"));

// The forms that show a point is used, or null if they can't be trusted: nearly every practice
// sentence for the point has to contain one of them (a few are deliberate contrasts).
const spotCache = {};
function spotsFor(l, i) {
  const key = `${l.n}.${i}`;
  if (key in spotCache) return spotCache[key];
  const fromEx = [...l.points[i].ex.matchAll(/\{([^}]+)\}/g)].flatMap((m) => [spotCore(plain(m[1])), spotCore(kana(m[1]))]);
  const list = [...new Set(SPOT[key] || fromEx)].filter(Boolean);
  const drills = DRILLS[l.n].filter((d) => d[2] === i).map((d) => normJa(drillText(d)));
  const hits = drills.filter((s) => list.some((c) => s.includes(normJa(c)))).length;
  const ok = list.length && drills.length && hits >= drills.length * 0.85;
  return (spotCache[key] = ok ? list : null);
}

/* ---------------------------------------------------------------- Checking a sentence */

// Lesson sentences don't count as your own — the example and every practice sentence.
const lessonSentenceCache = {};
function lessonSentences(l) {
  if (lessonSentenceCache[l.n]) return lessonSentenceCache[l.n];
  const out = new Set();
  for (const p of l.points) for (const m of [plain(p.ex), kana(p.ex)]) out.add(normJa(m.replace(/[{}]/g, "")));
  for (const d of DRILLS[l.n]) out.add(normJa(drillText(d)));
  return (lessonSentenceCache[l.n] = out);
}

// One sentence of the three: state "empty", "bad" (can't be sent), "warn" or "ok".
function checkSentence(l, i, all, j) {
  const s = all[j].trim();
  if (!s) return { state: "empty" };
  if (!JA_RE.test(s)) return { state: "bad", msg: "Write it in Japanese — switch on your Japanese keyboard." };
  const n = normJa(s);
  if (n.length < 3) return { state: "bad", msg: "A bit longer — make it a whole sentence." };
  if (lessonSentences(l).has(n)) return { state: "bad", msg: "That one is from the lesson — change the people, things or places to make it yours." };
  const same = all.findIndex((x, k) => k < j && normJa(x) === n);
  if (same >= 0) return { state: "bad", msg: `Same as sentence ${same + 1} — write a different one.` };
  const spots = spotsFor(l, i);
  if (!spots) return { state: "ok", msg: "✓ Ready — your AI can check the grammar." };
  const found = spots.filter((c) => n.includes(normJa(c)));
  if (!found.length) {
    return { state: "warn", msg: `Can't spot <b lang="ja">${plain(l.points[i].g)}</b> in it — is it in there? (If you used another form of it, that's fine.)` };
  }
  return { state: "ok", msg: `✓ Uses <span lang="ja">${found.slice(0, 3).join("・")}</span>` };
}

/* ---------------------------------------------------------------- The box on each point card */

function drawWriteBtn(l, i) {
  const card = $(`#lp-${i}`);
  const btn = $("[data-write]", card);
  const done = isWritten(l.n, i);
  btn.classList.toggle("done", done);
  btn.innerHTML = done ? "✎ Your sentences ✓" : `✎ Write ${WRITE_COUNT} sentences`;
  btn.hidden = !$(".lp-write", card).hidden;
}

function openWrite(l, i) {
  l.points.forEach((_, j) => { closeCheck(l, j); if (j !== i) closeWrite(l, j); });
  const card = $(`#lp-${i}`);
  $(".lp-write", card).hidden = false;
  drawWriteBtn(l, i);
  const key = `${l.n}.${i}`;
  if (written[key]) showWritten(l, i);
  else runWrite(l, i, writeDrafts[key] || []);
  scrollBelowBar(card);
}

function closeWrite(l, i) {
  const box = $(`#lp-${i} .lp-write`);
  if (!box || box.hidden) return;
  box.hidden = true;
  box.innerHTML = "";
  drawWriteBtn(l, i);
}

const writeTop = (title) => `
  <div class="lt-top">
    <span class="small"><b>✎ Write it</b> · ${title}</span>
    <button class="icon-btn lp-close" aria-label="Close">✕</button>
  </div>`;

function runWrite(l, i, start) {
  const p = l.points[i];
  const key = `${l.n}.${i}`;
  const first = !written[key];
  const bonus = first ? XP.write : XP.rewrite;
  const box = $(`#lp-${i} .lp-write`);
  box.innerHTML = `
    ${writeTop(`${WRITE_COUNT} sentences of your own`)}
    <p class="lw-intro">Use <b lang="ja">${plain(p.g)}</b> (${p.m}) in ${WRITE_COUNT} sentences of your own.
      Swap in your own people, places and things — the example above is only a model.</p>
    <ol class="lw-list">
      ${Array.from({ length: WRITE_COUNT }, (_, j) => `
        <li>
          <input class="lw-in" lang="ja" maxlength="${WRITE_MAX}" autocomplete="off" spellcheck="false"
            aria-label="Sentence ${j + 1}" placeholder="Sentence ${j + 1} in Japanese">
          <div class="lw-note" aria-live="polite"></div>
        </li>`).join("")}
    </ol>
    <div class="q-actions lw-actions">
      <span class="small muted">${first ? `+${XP.write} XP for your first ${WRITE_COUNT}` : `+${XP.rewrite} XP for a new set`}</span>
      <button class="btn primary lw-done" disabled>Done · +${bonus} XP</button>
    </div>`;
  const ins = $$(".lw-in", box);
  const done = $(".lw-done", box);
  ins.forEach((x, j) => (x.value = start[j] || ""));

  const update = () => {
    const all = ins.map((x) => x.value);
    writeDrafts[key] = all;
    let ready = true;
    ins.forEach((x, j) => {
      const r = checkSentence(l, i, all, j);
      const li = x.parentElement;
      li.className = r.state;
      $(".lw-note", li).innerHTML = r.msg || "";
      if (r.state === "empty" || r.state === "bad") ready = false;
    });
    done.disabled = !ready;
    // Saving the same sentences again earns nothing, so don't promise XP for it.
    const same = !first && all.map((s) => s.trim()).join("\n") === written[key].join("\n");
    done.textContent = same ? "Save" : `Done · +${bonus} XP`;
  };
  ins.forEach((x, j) => {
    x.oninput = update;
    x.onkeydown = (e) => {
      // Enter also confirms a word in a Japanese keyboard (IME) — leave that alone.
      if (e.key !== "Enter" || e.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      if (j + 1 < ins.length) ins[j + 1].focus();
      else if (!done.disabled) done.click();
    };
  });
  $(".lp-close", box).onclick = () => closeWrite(l, i);
  done.onclick = () => finishWrite(l, i, ins.map((x) => x.value.trim()));
  update();
  (ins.find((x) => !x.value) || ins[0]).focus({ preventScroll: true });
}

function finishWrite(l, i, sentences) {
  const key = `${l.n}.${i}`;
  const before = written[key];
  const changed = !before || before.join("\n") !== sentences.join("\n");
  const xp = !before ? XP.write : changed ? XP.rewrite : 0;
  written[key] = sentences;
  store.set("sentences", written);
  delete writeDrafts[key];
  // Feedback on the old sentences doesn't fit the new ones.
  if (changed && feedback[key]) { delete feedback[key]; store.set("aiFeedback", feedback); }
  showWritten(l, i, xp, !before);
  renderLessonStatus(l);
}

const escHTML = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const escRE = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The sentence with the spotted pattern coloured in, like the examples.
function markSpots(s, spots) {
  if (!spots) return escHTML(s);
  const re = new RegExp(spots.slice().sort((a, b) => b.length - a.length).map(escRE).join("|"), "g");
  let out = "";
  let last = 0;
  for (const m of s.matchAll(re)) {
    out += `${escHTML(s.slice(last, m.index))}<span class="hl">${escHTML(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + escHTML(s.slice(last));
}

function showWritten(l, i, xp = 0, first = false) {
  const key = `${l.n}.${i}`;
  const mine = written[key];
  const spots = spotsFor(l, i);
  const box = $(`#lp-${i} .lp-write`);
  box.innerHTML = `
    ${writeTop("your sentences")}
    <div class="lc-result">
      <div class="lw-badge" aria-hidden="true">✎</div>
      <div>
        <div class="lt-score"><b>${mine.length}</b> sentences of your own${xp ? ` <span class="xp-chip">+${xp} XP</span>` : ""}</div>
        <p>${first ? "Nice — that's the best way to make a pattern stick." : "Saved. Write a new set any time for more practice."}</p>
      </div>
    </div>
    <ol class="lw-mine" lang="ja">${mine.map((s) => `<li>${markSpots(s, spots)}<span class="lw-mark"></span></li>`).join("")}</ol>
    <div class="lw-ai">
      <p class="small"><b>1.</b> The site can only check the basics. For real feedback, give them to your chatbot —
        it marks each one ✓ or ✗ and explains any fix with colour blocks.</p>
      <button class="btn primary lw-copy">Copy “check my sentences” prompt</button>
      <textarea class="ai-text lw-prompt" rows="8" readonly hidden aria-label="Prompt to copy"></textarea>
      <p class="small lw-step2"><b>2.</b> Copy the chatbot's answer and paste it here to read it in colour.</p>
      ${aiReaderHTML("Paste the chatbot's answer here")}
      <p class="small lw-saved" hidden></p>
    </div>
    <div class="q-actions lt-actions">
      <button class="btn" data-a="edit">Edit these</button>
      <button class="btn" data-a="new">Write ${WRITE_COUNT} new ones</button>
    </div>`;
  $(".lp-close", box).onclick = () => closeWrite(l, i);
  $("[data-a=edit]", box).onclick = () => runWrite(l, i, writeDrafts[key] || mine);
  $("[data-a=new]", box).onclick = () => runWrite(l, i, []);
  wireCopyPrompt(box, () => writePrompt(l, i, mine));
  // The chatbot's verdicts show up next to the sentences too.
  const markVerdicts = (text) => {
    const v = aiVerdicts(text || "");
    $$(".lw-mine li", box).forEach((li, j) => {
      const ok = v[j + 1];
      li.className = ok === undefined ? "" : ok ? "ok" : "bad";
      $(".lw-mark", li).textContent = ok === undefined ? "" : ok ? " ✓" : " ✗";
    });
  };
  setupAiReader($(".ar", box), feedback[key], (text) => {
    if (text) feedback[key] = text;
    else delete feedback[key];
    store.set("aiFeedback", feedback);
    markVerdicts(text);
    // The ✗ sentences and their corrections go to "Your mistakes".
    saveCorrections(l, i, text, mine);
    drawSavedNote(l, i);
  });
  $(".ar-in", box).addEventListener("input", (e) => markVerdicts(e.target.value));
  markVerdicts(feedback[key]);
  // An answer pasted before the reader knew its layout is read again once.
  if (feedback[key] && needsReading(key)) saveCorrections(l, i, feedback[key], mine);
  drawSavedNote(l, i);
  if (xp) addXP(xp, $(".lw-badge", box));
  if (first) burst($(".lw-badge", box));
}

// The lesson's "check my sentences" prompt, focused on this point, with the sentences filled in.
function writePrompt(l, i, sentences) {
  const furi = $("#furiToggle").checked;
  const p = l.points[i];
  const f = `the pattern ${promptJa(p.g, furi)}, meaning "${p.m}"`;
  const task = AI_PRESETS.find((x) => x.id === "check").task({ l, f, furi }).replace(/1\. $/, "");
  return [promptContext(l, furi), promptStyle(l, furi), task + sentences.map((s, j) => `${j + 1}. ${s}`).join("\n")].join("\n\n");
}

// The .lw-copy button in `box` copies the prompt, or shows it in .lw-prompt if copying fails.
function wireCopyPrompt(box, getText) {
  const copy = $(".lw-copy", box);
  const label = copy.textContent;
  copy.onclick = async () => {
    const text = getText();
    const ok = await copyText(text);
    copy.textContent = ok ? "Copied ✓ — paste it into your chatbot" : "Copy it from the box below";
    if (!ok) {
      const ta = $(".lw-prompt", box);
      ta.value = text;
      ta.hidden = false;
      ta.select();
    }
    clearTimeout(copy.timer);
    copy.timer = setTimeout(() => (copy.textContent = label), 2500);
  };
}

// The clipboard API needs https or localhost; on a plain-http LAN address fall back to execCommand.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch { /* try the old way */ }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  document.body.append(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { /* ok stays false */ }
  ta.remove();
  return ok;
}
