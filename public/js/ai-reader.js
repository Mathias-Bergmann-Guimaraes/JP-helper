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

// "🟦 私は | 🟩 本を | 🟪 読みます" → blocks. Null if the line isn't one.
function aiBlocks(line) {
  const s = aiBare(line).replace(/^[-*•]\s+/, "");
  if (!SQUARE_RE.test(s) || !JA_CHAR.test(s)) return null;
  const parts = s.split(/\s*[|｜]\s*/).filter(Boolean);
  if (parts.length < 2 && !SQUARE_RE.test(s.slice(0, 2))) return null;
  const blocks = [];
  for (const part of parts) {
    let m = part.match(/^([🟦🟥🟩🟧🟪🟨🟫])\s*(.+)$/u);
    if (m) { blocks.push({ role: AI_SQUARES[m[1]], text: m[2] }); continue; }
    m = part.match(/^[[［](.+?)[\]］]\s*(.+)$/);
    if (m) {
      const label = m[1];
      const hit = AI_LABEL_ROLES.find(([re]) => re.test(label.toLowerCase()));
      blocks.push({ role: hit ? hit[1] : null, label, text: m[2] });
      continue;
    }
    if (!JA_CHAR.test(part)) return null;
    blocks.push({ role: null, text: part });
  }
  return blocks;
}

function aiBlocksHTML(blocks, gloss) {
  return `<div class="chunks ar-chunks">${blocks.map((b, i) => {
    const r = b.role ? ROLES[b.role] : null;
    return `<div class="chunk${r ? "" : " ar-plain"}" style="--c:${r ? r.color : "var(--muted)"}">
      <div class="chunk-jp" lang="ja">${aiInline(b.text)}</div>
      <div class="chunk-role">${aiEsc(b.label || (r ? r.label : ""))}</div>
      ${gloss ? `<div class="ar-gloss">${aiInline(gloss[i])}</div>` : ""}
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
function aiWords(line) {
  const m = aiBare(line).match(/^(?:new\s+)?(?:words?|vocab(?:ulary)?|語彙)\s*[:：]\s*(.+)$/i);
  if (!m) return null;
  const pairs = m[1].replace(/[.。]\s*$/, "").split(/\s*[,、;；]\s*(?=[^=]*=)/).map((p) => p.split(/\s*[=＝:：]\s*/));
  if (!pairs.length || pairs.some((p) => p.length !== 2)) return null;
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
    const correct = bare.match(/^(?:✓\s*)?(correct(?:ed)?(?: version| sentence)?|fix(?:ed)?|better|more natural|natural)\s*[:：]\s*(.+)$/i);
    if (correct && JA_CHAR.test(correct[2])) {
      closeList();
      let caption = "";
      if (/^[(（].*[)）]$/.test(next) && !JA_CHAR.test(next)) { caption = next.slice(1, -1); i++; }
      emit(`<div class="ar-fix"><div class="ar-fix-label">${aiEsc(correct[1])}</div>
        <div class="ar-fix-sent" lang="ja">${aiInline(correct[2])}</div>
        ${caption ? `<div class="ar-caption">${aiInline(caption)}</div>` : ""}</div>`);
      continue;
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
    emit(`<p class="ar-p">${aiInline(line)}</p>`);
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
