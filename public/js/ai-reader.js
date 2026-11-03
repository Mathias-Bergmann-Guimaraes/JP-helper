// "Read an answer": paste what a chatbot wrote back (all of it or a part) and see it drawn the
// way this site draws grammar — colour blocks, furigana, ✓ / ✗ cards, tables and word lists.
// Works with text copied from the chat page and with Markdown from a chatbot's copy button.
// Loaded after app.js and data.js; used by lesson-prompts.js and lesson-write.js.

// The emoji squares the study prompts ask for, and the site role each one stands for.
const AI_SQUARES = { "🟦": "topic", "🟥": "subject", "🟩": "object", "🟧": "point", "🟪": "verb", "🟨": "point", "🟫": "owner" };
const SQUARE_RE = /[🟦🟥🟩🟧🟪🟨🟫]/u;
const SQUARES_RE = /[🟦🟥🟩🟧🟪🟨🟫]/gu;
const JA_CHAR = /[぀-ヿ㐀-鿿]/;
const VERDICT_OK = "✓✔✅";
const VERDICT_BAD = "✗✘❌×";
const VERDICT_CHARS = VERDICT_OK + VERDICT_BAD;

// Blocks that aren't one of the five squares are named in words, e.g. [time] or [place で].
const AI_LABEL_ROLES = [
  [/time|when|時/, "time"],
  [/place|means|tool|で/, "place"],
  [/direction|へ/, "dir"],
  [/with|together|と/, "with"],
  [/also|too|も/, "also"],
  [/range|from|until|から|まで/, "range"],
  [/owner|describ|の/, "owner"],
  [/topic|は/, "topic"],
  [/subject|が/, "subject"],
  [/object|を/, "object"],
  [/target|point|に/, "point"],
  [/verb|predicate/, "verb"],
];

const aiEsc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// One line of text: escaped, with furigana as ruby, **bold**, `code`, squares as colour swatches
// and ✓ / ✗ in colour.
function aiInline(s) {
  return aiEsc(s)
    .replace(/([㐀-鿿々〆ヶ]+)[(（]([぀-ゟー]+)[)）]/g, "<ruby>$1<rt>$2</rt></ruby>")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/__(.+?)__/g, "<b>$1</b>")
    .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,!?:;]|$)/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // "takes が 🟥" — a particle with its square becomes a coloured pill, like on the site.
    .replace(/(^|[^぀-ヿ])([぀-ヿ]{1,3})\s?([🟦🟥🟩🟧🟪🟨🟫])/gu, (_, pre, p, q) =>
      `${pre}<span class="hl" style="--c:${ROLES[AI_SQUARES[q]].color}" title="${ROLES[AI_SQUARES[q]].label}">${p}</span>`)
    .replace(SQUARES_RE, (q) => `<span class="ar-sq" style="--c:${ROLES[AI_SQUARES[q]].color}" title="${ROLES[AI_SQUARES[q]].label}"></span>`)
    .replace(/[✓✔✅]/g, '<span class="ar-ok">✓</span>')
    .replace(/[✗✘❌]/g, '<span class="ar-bad">✗</span>');
}

// Markdown decoration that gets in the way of reading a line's shape.
const aiBare = (s) => s.replace(/^#{1,6}\s+/, "").replace(/\*\*|__/g, "").trim();

// "1. 僕はヤシが大好きです ✓" (or with the mark first) — a numbered sentence with a verdict.
function aiVerdictLine(line) {
  const s = aiBare(line);
  const re = new RegExp(`^(\\d+)[.)．]\\s*([${VERDICT_CHARS}])?\\s*(.+?)\\s*([${VERDICT_CHARS}])?\\s*$`, "u");
  const m = s.match(re);
  if (!m || !(m[2] || m[4]) || !JA_CHAR.test(m[3])) return null;
  const mark = m[4] || m[2];
  return { n: +m[1], text: m[3].replace(/^[「"]|[」"]$/g, ""), ok: VERDICT_OK.includes(mark) };
}

// The verdicts in an answer, by sentence number: { 1: true, 2: false, … }.
function aiVerdicts(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const v = aiVerdictLine(line);
    if (v && !(v.n in out)) out[v.n] = v.ok;
  }
  return out;
}

// "Correct: …", "Natural: …" — a fixed or better version of the sentence.
const AI_FIX_RE = /^(?:✓\s*)?(correct(?:ed)?(?: version| sentence)?|fix(?:ed)?|better|more natural|natural)\s*[:：]\s*(.+)$/i;

// A Japanese sentence as the chatbot wrote it, as plain text: no furigana, Markdown or quotes,
// and no translation in brackets at the end.
function aiPlainJa(s) {
  return s.replace(/\*\*|__|`/g, "")
    .replace(/([㐀-鿿々〆ヶ]+)[(（][぀-ゟー]+[)）]/g, "$1")
    .replace(/\s*[(（][^぀-ヿ㐀-鿿]*[)）]\s*$/, "")
    .replace(/\s*[→←].*$/, "")
    .replace(/(?<=[぀-ヿ㐀-鿿。、])\s+|\s+(?=[぀-ヿ㐀-鿿。、])/g, "")
    .replace(/^[「"“]|[」"”]$/g, "")
    .trim();
}

// "✅ この漫画はとても面白いです。" — under a ✗ sentence, a line starting with a tick is the fix.
const AI_TICK_RE = /^[✓✔✅]\s*([^A-Za-z]*[぀-ヿ㐀-鿿][^]*)$/u;

// The English for a sentence, on the line below it: "(This is a pen.)" or "“This is a pen.”",
// maybe with a note after the quote. Returns { en, rest } or null.
function aiEnglishLine(s) {
  let m = s.match(/^[(（](.*)[)）]$/);
  if (m && m[1] && !JA_CHAR.test(m[1])) return { en: m[1], rest: "" };
  m = s.match(/^[“"]([^“”"]+)[”"]\s*(.*)$/);
  if (m && !JA_CHAR.test(m[1])) return { en: m[1], rest: m[2] };
  return null;
}

const AI_FIX_HEAD_RE =/^(fix|option|version|alternative)\s*\w{0,2}\s*[—–:-]/i;

// Each ✗ sentence in an answer with its correction: [{ n, text, right, en }]. The correction is
// the first "Correct:" line, else the first sentence under a "Fix A —" heading, else a "Natural:"
// line. The English comes from a "(…)" at its end or a line of English right below it.
function aiCorrections(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").map((x) => x.trim()).filter(Boolean);
  const out = [];
  let cur = null;
  let underFix = false;
  const english = (s) => !!s && !JA_CHAR.test(s) && !SQUARE_RE.test(s) && s.length < 160 && !/^[-*•#|>↑↓→]/.test(s);
  const offer = (rank, ja, i) => {
    if (cur.rank <= rank) return;
    Object.assign(cur, { rank, right: aiPlainJa(ja) });
    const end = ja.match(/[(（]([^぀-ヿ㐀-鿿]+)[)）]\s*$/);
    const next = aiEnglishLine(lines[i + 1] || "");
    cur.en = end ? end[1] : next ? next.en : rank === 2 && english(lines[i + 1]) ? lines[i + 1] : "";
  };
  let inCode = false;
  lines.forEach((line, i) => {
    if (line.startsWith("```")) { inCode = !inCode; return; }
    if (inCode) return;
    const v = aiVerdictLine(line);
    if (v) {
      cur = v.ok ? null : { n: v.n, text: aiPlainJa(v.text), right: "", en: "", rank: 9 };
      if (cur) out.push(cur);
      underFix = false;
      return;
    }
    if (!cur) return;
    const bare = aiBare(line);
    const m = bare.match(AI_FIX_RE);
    if (m && JA_CHAR.test(m[2])) { offer(/natural|better/i.test(m[1]) ? 3 : 1, m[2], i); return; }
    const tick = bare.match(AI_TICK_RE);
    if (tick) { offer(1, tick[1], i); return; }
    if (AI_FIX_HEAD_RE.test(bare) && !JA_CHAR.test(bare)) { underFix = true; return; }
    if (underFix && JA_CHAR.test(line) && !aiWords(line)) {
      const blocks = aiBlocks(line);
      offer(2, blocks ? blocks.map((b) => b.text).join("") : bare.replace(/^[-*•]\s+/, ""), i);
      underFix = false;
    }
  });
  return out.filter((c) => c.right).map(({ rank, ...c }) => c);
}

// "🟦 私は | 🟩 本を | 🟪 読みます" → blocks. Null if the line isn't one.
function aiBlocks(line) {
  const s = aiBare(line).replace(/^[-*•]\s+/, "");
  if (!SQUARE_RE.test(s) || !JA_CHAR.test(s)) return null;
  const parts = s.split(/\s*[|｜]\s*/).filter(Boolean);
  if (parts.length < 2 && !SQUARE_RE.test(s.slice(0, 2))) return null;
  const blocks = [];
  for (let part of parts) {
    // "[この = this] 🟦 この漫画は": a bracket with "=" is a note on the words, not the block's job.
    let note = "";
    const before = part.match(/^[[［]([^\]］]*[=＝][^\]］]*)[\]］]\s*(.+)$/);
    const after = part.match(/^(.+?)\s*[[［]([^\]］]*[=＝][^\]］]*)[\]］]$/);
    if (before) [note, part] = [before[1], before[2]];
    else if (after) [part, note] = [after[1], after[2]];
    let m = part.match(/^([🟦🟥🟩🟧🟪🟨🟫])\s*(.+)$/u);
    if (m) { blocks.push({ role: AI_SQUARES[m[1]], text: m[2], note }); continue; }
    m = part.match(/^[[［](.+?)[\]］]\s*(.+)$/);
    if (m) {
      const label = m[1];
      const hit = AI_LABEL_ROLES.find(([re]) => re.test(label.toLowerCase()));
      blocks.push({ role: hit ? hit[1] : null, label, text: m[2], note });
      continue;
    }
    // Without a colour or a label it has to be just Japanese: an English sentence that happens
    // to mention blocks ("the shape is 🟦 N は | 🟪 ですか") is not a line of blocks.
    if (!JA_CHAR.test(part) || /[A-Za-z]+\s+[A-Za-z]+/.test(part)) return null;
    blocks.push({ role: null, text: part, note });
  }
  return blocks;
}

function aiBlocksHTML(blocks, gloss) {
  return `<div class="chunks ar-chunks">${blocks.map((b, i) => {
    const r = b.role ? ROLES[b.role] : null;
    return `<div class="chunk${r ? "" : " ar-plain"}" style="--c:${r ? r.color : "var(--muted)"}">
      <div class="chunk-jp" lang="ja">${aiInline(b.text)}</div>
      <div class="chunk-role">${aiEsc(b.label || (r ? r.label : ""))}</div>
      ${gloss || b.note ? `<div class="ar-gloss">${aiInline(gloss ? gloss[i] : b.note)}</div>` : ""}
    </div>`;
  }).join("")}</div>`;
}

// Table rows: Markdown "| a | b |" or tab-separated (what copying a table off a chat page gives).
const aiTableRow = (line) => (line.includes("\t")
  ? line.split("\t")
  : line.trim().replace(/^\||\|$/g, "").split("|")).map((c) => c.trim());
const isMdRow = (line) => /^\s*\|.*\|\s*$/.test(line) && !SQUARE_RE.test(line);
const isMdRule = (line) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

function aiTableHTML(rows) {
  const width = Math.max(...rows.map((r) => r.length));
  const cells = (r, tag) => Array.from({ length: width }, (_, i) => `<${tag}>${aiInline(r[i] || "")}</${tag}>`).join("");
  return `<div class="ar-table-wrap"><table class="ar-table">
    <thead><tr>${cells(rows[0], "th")}</tr></thead>
    <tbody>${rows.slice(1).map((r) => `<tr>${cells(r, "td")}</tr>`).join("")}</tbody>
  </table></div>`;
}

// "Words: この = this, 漫画(まんが) = manga" → word chips.
// Without the "Words:" label it takes two or more pairs, each Japanese = English.
function aiWords(line) {
  const m = aiBare(line).match(/^(?:new\s+)?(?:words?|vocab(?:ulary)?|語彙)\s*[:：]\s*(.+)$/i);
  const body = m ? m[1] : aiBare(line);
  const pairs = body.replace(/[.。]\s*$/, "").split(/\s*[,、;；]\s*(?=[^=]*=)/).map((p) => p.split(/\s*[=＝:：]\s*/));
  if (!pairs.length || pairs.some((p) => p.length !== 2)) return null;
  if (!m && (pairs.length < 2 || pairs.some(([ja, en]) => !JA_CHAR.test(ja) || JA_CHAR.test(en) || en.length > 40))) return null;
  return `<div class="ar-words">${pairs.map(([ja, en]) =>
    `<span class="ar-word"><span lang="ja">${aiInline(ja)}</span><span>${aiInline(en)}</span></span>`).join("")}</div>`;
}

// The whole answer as HTML.
function renderAiAnswer(text) {
  const lines = text.replace(/\r\n?/g, "\n").replace(/ /g, " ").split("\n");
  const out = [];
  let card = null; // the ✓ / ✗ card being filled
  const emit = (html) => (card ? card.body : out).push(html);
  const closeCard = () => {
    if (!card) return;
    out.push(`<section class="ar-card ${card.ok ? "ok" : "bad"}">
      <div class="ar-card-head">
        <span class="ar-num">${card.n}</span>
        <span class="ar-sent" lang="ja">${aiInline(card.text)}</span>
        <span class="ar-verdict">${card.ok ? "✓ Correct" : "✗ Needs a fix"}</span>
      </div>
      ${card.body.length ? `<div class="ar-card-body">${card.body.join("")}</div>` : ""}
    </section>`);
    card = null;
  };
  let list = null; // open <ul>/<ol>
  const closeList = () => { if (list) { emit(`<${list.tag} class="ar-list">${list.items.join("")}</${list.tag}>`); list = null; } };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    const next = (lines[i + 1] || "").trim();
    if (!line) { closeList(); continue; }

    // A code block, in case the chatbot uses one anyway: no ``` showing, lines kept as they are.
    if (line.startsWith("```")) {
      closeList();
      let end = i + 1;
      while (end < lines.length && !lines[end].trim().startsWith("```")) end++;
      const rows = lines.slice(i + 1, end);
      i = end;
      if (rows.some((r) => r.trim())) emit(`<div class="ar-diagram" lang="ja">${rows.map((r) => aiInline(r.replace(/\s+$/, ""))).join("\n")}</div>`);
      continue;
    }

    const verdict = aiVerdictLine(line);
    if (verdict) { closeList(); closeCard(); card = { ...verdict, body: [] }; continue; }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) { closeList(); closeCard(); out.push('<hr class="ar-hr">'); continue; }

    // Tables: Markdown pipes, or lines with tabs.
    if ((isMdRow(line) && isMdRule(next)) || (raw.includes("\t") && (lines[i + 1] || "").includes("\t"))) {
      closeList();
      const rows = [];
      const tabbed = raw.includes("\t");
      while (i < lines.length && (tabbed ? lines[i].includes("\t") : isMdRow(lines[i]))) {
        if (!isMdRule(lines[i])) rows.push(aiTableRow(lines[i]));
        i++;
      }
      i--;
      emit(aiTableHTML(rows));
      continue;
    }

    const blocks = aiBlocks(line);
    if (blocks) {
      closeList();
      // A line right below without Japanese is the English: one part per block if it splits
      // that way ("I · palm trees · love"), otherwise a translation underneath.
      let gloss = null;
      let caption = "";
      if (next && !JA_CHAR.test(next) && !SQUARE_RE.test(next) && next.length < 160 && !/^[-*•#|]/.test(next)) {
        const parts = next.split(/\s+[·•|｜/]\s+/);
        if (parts.length === blocks.length && parts.length > 1) gloss = parts;
        else caption = next;
        i++;
      }
      emit(aiBlocksHTML(blocks, gloss) + (caption ? `<div class="ar-caption">${aiInline(caption)}</div>` : ""));
      continue;
    }

    const bare = aiBare(line);
    // "Correct: …", or "✅ …" under a ✗ sentence: the fixed sentence, with its English below.
    const correct = bare.match(AI_FIX_RE);
    const tick = card && !card.ok && bare.match(AI_TICK_RE);
    if ((correct && JA_CHAR.test(correct[2])) || tick) {
      closeList();
      const en = aiEnglishLine(next);
      if (en) i++;
      emit(`<div class="ar-fix"><div class="ar-fix-label">${aiEsc(correct ? correct[1] : "Correct")}</div>
        <div class="ar-fix-sent" lang="ja">${aiInline(correct ? correct[2] : tick[1])}</div>
        ${en ? `<div class="ar-caption">${aiInline(en.en)}${en.rest ? ` <span class="muted">${aiInline(en.rest)}</span>` : ""}</div>` : ""}</div>`);
      continue;
    }

    // A text diagram (lined up with spaces, arrows on their own line) keeps its lines and spacing.
    // Nested list items are indented too, so they don't count; and a group needs an arrow line
    // or an indented line, not just double spaces (which some text has after full stops).
    const shaped = (s) => /^\s{3,}(?![-*•]\s|\d+[.)]\s)\S/.test(s) || /^\s*[↑↓|│^]+\s*$/.test(s);
    const diagramLine = (s) => shaped(s) || /\S {2,}\S/.test(s);
    if (diagramLine(raw) && diagramLine(lines[i + 1] || "")) {
      let end = i;
      while (end < lines.length && lines[end].trim()) end++;
      const rows = lines.slice(i, end);
      if (rows.some(shaped)) {
        closeList();
        i = end - 1;
        emit(`<div class="ar-diagram" lang="ja">${rows.map((r) => aiInline(r.replace(/\s+$/, ""))).join("\n")}</div>`);
        continue;
      }
    }

    const words = aiWords(line);
    if (words) { closeList(); emit(words); continue; }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeList();
      if (heading[1].length <= 2) closeCard();
      emit(`<h4 class="ar-h">${aiInline(heading[2])}</h4>`);
      continue;
    }
    // "Fix A — …", "Option 2: …" read as small headings.
    if (/^(fix|option|version|alternative|tip)\s*\w{0,2}\s*[—–:-]/i.test(bare) && bare.length < 90) {
      closeList();
      emit(`<h5 class="ar-sub">${aiInline(bare)}</h5>`);
      continue;
    }

    const item = line.match(/^([-*•]|\d+[.)])\s+(.+)$/);
    if (item) {
      const tag = /\d/.test(item[1]) ? "ol" : "ul";
      if (list && list.tag !== tag) closeList();
      if (!list) list = { tag, items: [] };
      list.items.push(`<li>${aiInline(item[2])}</li>`);
      continue;
    }

    closeList();
    if (/^[(（].*[)）]$/.test(line) && !JA_CHAR.test(line)) { emit(`<div class="ar-caption">${aiInline(line.slice(1, -1))}</div>`); continue; }
    if (/^>\s?/.test(line)) { emit(`<blockquote class="ar-quote">${aiInline(line.replace(/^>\s?/, ""))}</blockquote>`); continue; }
    // "Problem 1: …", "The fix: …" — the label in bold.
    emit(`<p class="ar-p">${aiInline(line).replace(/^((?:problem|issue|mistake|the fix|fix|why|note|tip)\s*\d*\s*[:：])/i, "<b>$1</b>")}</p>`);
  }
  closeList();
  closeCard();
  return out.join("");
}

/* ---------------------------------------------------------------- The paste box */

const AI_MAX = 20000;

// A paste box with the drawn answer below it. `saved` is the text to start with; `onChange(text)`
// runs (debounced) as it changes, so the caller can save it.
function aiReaderHTML(placeholder) {
  return `<div class="ar">
    <textarea class="ai-text ar-in" rows="4" maxlength="${AI_MAX}" spellcheck="false"
      placeholder="${aiEsc(placeholder)}" aria-label="Chatbot answer"></textarea>
    <div class="ar-bar">
      <span class="small muted ar-hint">Paste all of the answer or just a part — it's drawn below.</span>
      <button class="btn ar-toggle" hidden>Edit the text</button>
      <button class="btn ar-clear" hidden>Clear</button>
    </div>
    <div class="ar-out"></div>
  </div>`;
}

function setupAiReader(root, saved, onChange) {
  const ta = $(".ar-in", root);
  const outBox = $(".ar-out", root);
  const clear = $(".ar-clear", root);
  const toggle = $(".ar-toggle", root);
  let timer;
  const draw = () => {
    const text = ta.value.trim();
    outBox.innerHTML = text ? renderAiAnswer(text) : "";
    clear.hidden = !text;
    toggle.hidden = !text;
  };
  // Once there's an answer, fold the text box away so the drawn version is what you read.
  const fold = (folded) => {
    ta.hidden = folded;
    toggle.textContent = folded ? "Edit the text" : "Hide the text";
  };
  ta.value = saved || "";
  draw();
  fold(!!ta.value.trim());
  ta.oninput = () => {
    draw();
    clearTimeout(timer);
    timer = setTimeout(() => onChange && onChange(ta.value.trim()), 400);
  };
  ta.addEventListener("paste", () => setTimeout(() => { if (ta.value.trim()) fold(true); }, 0));
  toggle.onclick = () => { fold(!ta.hidden); if (!ta.hidden) ta.focus(); };
  clear.onclick = () => {
    ta.value = "";
    draw();
    fold(false);
    onChange && onChange("");
    ta.focus();
  };
}
