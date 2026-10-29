// "Study with your AI": ready-made prompts for each lesson, to paste into any chatbot.
// Used by lesson-page.js.

// Japanese markup as plain text: 学生(がくせい) with furigana, 学生 without. Highlights are dropped.
const promptJa = (m, furi) => (furi ? m.replace(KANJI_RE, "$1($2)") : plain(m)).replace(/[{}]/g, "");

function promptContext(l, furi) {
  const known = l.n === 1
    ? "This is my first lesson, so I don't know any other grammar yet."
    : `I already know the grammar of lessons 1–${l.n - 1}, but nothing after lesson ${l.n}.`;
  return `I'm learning Japanese with the textbook Minna no Nihongo (みんなの日本語 初級 I・II). I'm on lesson ${l.n} of 50, "${l.title}". ${known} I'm a visual learner and grammar is the hard part for me.

Grammar points of lesson ${l.n}:
${l.points.map((p, i) => `${i + 1}. ${promptJa(p.g, furi)} — ${p.m}
   e.g. ${promptJa(p.ex, furi)} (${p.en})`).join("\n")}`;
}

// The same colours as the role blocks on this site, as far as emoji squares allow.
function promptStyle(l, furi) {
  const ex = furi ? "🟦 私(わたし)は | 🟩 本(ほん)を | 🟪 読(よ)みます" : "🟦 私は | 🟩 本を | 🟪 読みます";
  return `How to write your answers:
- Stick to grammar from lessons 1–${l.n} and common words. When you use a word I might not know, give its meaning.
- ${furi ? "Write furigana in brackets after kanji, like 学生(がくせい)." : "Write kanji normally, without furigana."} Don't use romaji.
- Make it visual. Break Japanese sentences into blocks and mark each block's job with the colours my study site uses: 🟦 topic (は), 🟥 subject (が), 🟩 object (を), 🟧 target / point (に), 🟪 verb or predicate (always last). Name any other job in words, e.g. [time], [place で].
  Example: ${ex}
- Keep explanations short. Use tables, arrows and text diagrams where they help.`;
}

// Each preset: what the chip says, a one-line description, and the task given to the chatbot.
// The task goes last, so presets that end in "My question:" leave the cursor where the user types.
const AI_PRESETS = [
  { id: "handout", label: "Lesson handout", desc: "A one-page study sheet: every pattern, examples, a trap each, and a cheat sheet.",
    task: ({ f }) => `Make me a one-page study handout for ${f}. For each grammar point:
1. What it means, in one plain sentence.
2. The formula (e.g. N1 は N2 です), with the block colours.
3. Three example sentences, from easy to a bit harder, each split into blocks with an English translation.
4. One common mistake, wrong ✗ and right ✓.
End with a short cheat sheet (one line per point) and 5 quick check questions, with the answers listed separately at the very bottom.` },

  { id: "question", label: "Ask a question", desc: "Type your question at the end of the prompt, then copy it.", typeAtEnd: true,
    task: ({ f }) => `I have a question about ${f}. Answer it directly first, then explain with blocks and one or two examples. If my question shows a misunderstanding, point it out gently.

My question: ` },

  { id: "explain", label: "Explain it differently", desc: "Still confused? A new angle, with an everyday analogy and a block diagram.",
    task: ({ f }) => `I've read the textbook explanation of ${f} and it hasn't clicked. Explain it in a completely different way:
- Start with a picture or everyday analogy that shows what it does.
- Draw the sentence structure as blocks and compare the word order with English.
- Show how it differs from similar grammar I've already learned.
- Then ask me one question to check I understood, and wait for my answer.` },

  { id: "examples", label: "More examples", desc: "12 new sentences from easy to harder, each broken into blocks.",
    task: ({ f }) => `Give me 12 new example sentences using ${f}: 4 easy, 4 medium and 4 a bit harder, set in different everyday situations (home, work, shopping, travel, friends…). For each sentence show the blocks, the English translation, and a short note on what's new compared to the sentence before. Put each level in its own table.` },

  { id: "quiz", label: "Quiz me", desc: "One question at a time, with feedback after each answer and a score at the end.",
    task: ({ f }) => `Quiz me on ${f}. Ask one question at a time and wait for my answer before going on — never show the answer early. Mix the kinds of question: fill the gap, pick the right particle or form, translate English → Japanese, translate Japanese → English, and spot the mistake. After each answer, tell me if I'm right and explain briefly with blocks. After 10 questions, give me my score and tell me what to review.` },

  { id: "check", label: "Check my sentences", desc: "Write your own sentences at the end of the prompt and get them corrected.", typeAtEnd: true,
    task: ({ f }) => `I'll write my own sentences using ${f}. For each one:
- Say whether it's correct ✓ or not ✗.
- If not, show the corrected sentence and explain the fix with blocks.
- Suggest a more natural way to say it, if there is one.
Be encouraging but honest — don't let mistakes slide.

My sentences:
1. ` },

  { id: "conversation", label: "Conversation practice", desc: "Role-play a real situation, with a correction after each of your replies.",
    task: ({ f, l }) => `Let's practise a conversation in Japanese that uses ${f}. Pick a realistic situation that fits the lesson ("${l.title}"), tell me who we both are, then start. Rules:
- Say one short line at a time, then wait for my reply in Japanese.
- After each of my replies, add a short note in English: ✓ if it was fine, or the corrected version and why.
- If I write "hint", give me a hint for what I could say. If I write "?", translate your last line.
- After about 10 exchanges, wrap up with what I did well and what to practise.` },

  { id: "traps", label: "Traps & look-alikes", desc: "Common mistakes, and the earlier grammar it gets confused with.",
    task: ({ f }) => `Show me the traps in ${f}:
- The most common mistakes learners make, as wrong ✗ / right ✓ pairs with a one-line reason each.
- Grammar from earlier lessons it gets mixed up with, compared side by side in a table.
- A simple rule of thumb I can remember for each.
Finish with 5 "which one is right?" questions, with the answers at the very bottom.` },

  { id: "anki", label: "Anki flashcards", desc: "20 cards as text you can import straight into Anki.",
    task: ({ f, furi }) => `Make 20 Anki flashcards for ${f}, mixing these kinds of card:
- Japanese sentence with one gap → the missing word and the full sentence
- English sentence → Japanese sentence
- Japanese sentence → English meaning and which grammar point it uses
Put all the cards in one code block, one card per line, as front;back — no header, no emoji blocks, and no semicolons inside a card — so I can import it into Anki (File → Import, separator: semicolon).${furi
  ? "\nIn the cards, write furigana in Anki's format instead: a space before each kanji word and the reading in square brackets, like 私[わたし]は 学生[がくせい]です。"
  : ""}` },
];

const aiState = { l: null, preset: store.get("aiPreset", "handout"), focus: "" };

function renderAiPrompts(l) {
  aiState.l = l;
  aiState.focus = "";
  if (!AI_PRESETS.some((p) => p.id === aiState.preset)) aiState.preset = "handout";
  const box = $("#lAi");
  box.innerHTML = `
    <div class="ai-presets" role="group" aria-label="What do you want to do?">
      ${AI_PRESETS.map((p) => `<button class="ai-chip" data-ai="${p.id}">${p.label}</button>`).join("")}
    </div>
    <div class="ai-bar">
      <p class="ai-desc small" id="aiDesc"></p>
      <label class="ai-focus small">Focus on
        <select id="aiFocus">
          <option value="">Whole lesson</option>
          ${l.points.map((p, i) => `<option value="${i}" lang="ja">${i + 1}. ${plain(p.g)}</option>`).join("")}
        </select>
      </label>
    </div>
    <textarea class="ai-text" id="aiText" rows="14" spellcheck="false" aria-label="Prompt to copy"></textarea>
    <div class="ai-actions">
      <span class="small muted">Paste it into ChatGPT, Claude, Gemini or any chatbot. You can edit it first.</span>
      <button class="btn primary" id="aiCopy">Copy prompt</button>
    </div>`;
  $$("[data-ai]", box).forEach((b) => (b.onclick = () => {
    aiState.preset = b.dataset.ai;
    store.set("aiPreset", aiState.preset);
    updateAiPrompt();
    if (AI_PRESETS.find((p) => p.id === aiState.preset).typeAtEnd) {
      const ta = $("#aiText");
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(ta.value.length, ta.value.length);
      ta.scrollTop = ta.scrollHeight;
    }
  }));
  $("#aiFocus").onchange = (e) => { aiState.focus = e.target.value; updateAiPrompt(); };
  $("#aiCopy").onclick = copyAiPrompt;
  updateAiPrompt();
}

function updateAiPrompt() {
  const { l } = aiState;
  const preset = AI_PRESETS.find((p) => p.id === aiState.preset);
  const furi = $("#furiToggle").checked;
  const point = aiState.focus === "" ? null : l.points[+aiState.focus];
  const f = point ? `the pattern ${promptJa(point.g, furi)}, meaning "${point.m}"` : `the grammar of lesson ${l.n}`;
  $("#aiText").value = [promptContext(l, furi), promptStyle(l, furi), preset.task({ l, f, furi })].join("\n\n");
  $("#aiDesc").textContent = preset.desc;
  $$("[data-ai]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.ai === preset.id));
}

// The clipboard API needs https or localhost; on a plain-http LAN address fall back to execCommand.
async function copyAiPrompt() {
  const ta = $("#aiText");
  const btn = $("#aiCopy");
  let ok = false;
  try {
    await navigator.clipboard.writeText(ta.value);
    ok = true;
  } catch {
    ta.select();
    try { ok = document.execCommand("copy"); } catch { /* ok stays false */ }
  }
  btn.textContent = ok ? "Copied ✓" : "Press Ctrl+C to copy";
  clearTimeout(btn.timer);
  btn.timer = setTimeout(() => (btn.textContent = "Copy prompt"), 2000);
}

// Furigana on/off changes how the prompt writes kanji.
$("#furiToggle").addEventListener("change", () => { if (aiState.l && $("#aiText")) updateAiPrompt(); });
