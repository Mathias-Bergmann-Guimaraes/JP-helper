// Verb conjugation engine. Verbs use the same 漢字[かな] markup as data.js.

const VOWELS = ["a", "i", "u", "e", "o"];

// Godan endings and their row in the kana chart (a, i, u, e, o).
// う-verbs use わ (not あ) in the a-column.
const ROWS = {
  "う": ["わ", "い", "う", "え", "お"],
  "く": ["か", "き", "く", "け", "こ"],
  "ぐ": ["が", "ぎ", "ぐ", "げ", "ご"],
  "す": ["さ", "し", "す", "せ", "そ"],
  "つ": ["た", "ち", "つ", "て", "と"],
  "ぬ": ["な", "に", "ぬ", "ね", "の"],
  "ぶ": ["ば", "び", "ぶ", "べ", "ぼ"],
  "む": ["ま", "み", "む", "め", "も"],
  "る": ["ら", "り", "る", "れ", "ろ"],
};

const FORMS = [
  { id: "dict", label: "Dictionary", meaning: "to {v}" },
  { id: "masu", label: "Polite ます", meaning: "{v} (polite)", vowel: 1, godan: "ます", ichidan: "ます" },
  { id: "nai",  label: "Negative ない", meaning: "don't {v}", vowel: 0, godan: "ない", ichidan: "ない" },
  { id: "te",   label: "て-form", meaning: "{v} and… (links actions · 〜てください · 〜ている)", ichidan: "て" },
  { id: "ta",   label: "Past た", meaning: "{v} — in the past (did)", ichidan: "た" },
  { id: "pot",  label: "Potential", meaning: "can {v}", vowel: 3, godan: "る", ichidan: "られる" },
  { id: "vol",  label: "Volitional", meaning: "let's {v}", vowel: 4, godan: "う", ichidan: "よう" },
  { id: "ba",   label: "Conditional ば", meaning: "if (I) {v}", vowel: 3, godan: "ば", ichidan: "れば" },
  { id: "pas",  label: "Passive", meaning: "passive of “{v}”", vowel: 0, godan: "れる", ichidan: "られる",
    note: "For ichidan verbs and 来る, the passive looks exactly like the potential: 食べられる can mean “is eaten” or “can eat”. The rest of the sentence tells you which." },
  { id: "cau",  label: "Causative", meaning: "make / let someone {v}", vowel: 0, godan: "せる", ichidan: "させる",
    note: "The person made to do it takes に, or を when the verb has no object: 子供に野菜を食べさせる, 子供を遊ばせる." },
  { id: "imp",  label: "Command", meaning: "{v}!", vowel: 3, godan: "", ichidan: "ろ",
    note: "Very blunt. You'll see it on road signs and hear it shouted at sports matches, but don't say it to people. Use 〜てください." },
  { id: "pro",  label: "Don't!", meaning: "don't {v}!", ichidan: "な",
    note: "Just as blunt as the command form: 入るな = keep out. Politely, it's 〜ないでください." },
];
const FORM = Object.fromEntries(FORMS.map((f) => [f.id, f]));

const TE_GROUPS = [
  { ends: ["う", "つ", "る"], te: "って" },
  { ends: ["む", "ぶ", "ぬ"], te: "んで" },
  { ends: ["く"], te: "いて" },
  { ends: ["ぐ"], te: "いで" },
  { ends: ["す"], te: "して" },
];
const toTa = (te) => te.replace("て", "た").replace("で", "だ");

// [changed part, suffix] for each form of the two irregular verbs.
const IRREGULAR = {
  "する": {
    dict: ["す", "る"], masu: ["し", "ます"], nai: ["し", "ない"], te: ["し", "て"],
    ta: ["し", "た"], pot: ["でき", "る"], vol: ["し", "よう"], ba: ["す", "れば"],
    pas: ["さ", "れる"], cau: ["さ", "せる"], imp: ["し", "ろ"], pro: ["す", "るな"],
  },
  "来[く]る": {
    dict: ["来[く]", "る"], masu: ["来[き]", "ます"], nai: ["来[こ]", "ない"], te: ["来[き]", "て"],
    ta: ["来[き]", "た"], pot: ["来[こ]", "られる"], vol: ["来[こ]", "よう"], ba: ["来[く]", "れば"],
    pas: ["来[こ]", "られる"], cau: ["来[こ]", "させる"], imp: ["来[こ]", "い"], pro: ["来[く]", "るな"],
  },
};

const GROUPS = {
  godan:     { label: "Godan", alt: "う-verbs", color: "var(--g-godan)", blurb: "The ending slides through the kana chart." },
  ichidan:   { label: "Ichidan", alt: "る-verbs", color: "var(--g-ichi)", blurb: "Drop る, add the ending. Easy." },
  irregular: { label: "Irregular", alt: "する・来る", color: "var(--g-irr)", blurb: "Only two of them — memorize." },
};

const VERBS = [
  { w: "書[か]く", en: "write", ing: "writing", pp: "written", group: "godan" },
  { w: "泳[およ]ぐ", en: "swim", ing: "swimming", pp: "swum", group: "godan" },
  { w: "話[はな]す", en: "speak", ing: "speaking", pp: "spoken", group: "godan" },
  { w: "待[ま]つ", en: "wait", ing: "waiting", pp: "waited", group: "godan" },
  { w: "死[し]ぬ", en: "die", ing: "dying", pp: "died", group: "godan" },
  { w: "遊[あそ]ぶ", en: "play", ing: "playing", pp: "played", group: "godan" },
  { w: "飲[の]む", en: "drink", ing: "drinking", pp: "drunk", group: "godan" },
  { w: "買[か]う", en: "buy", ing: "buying", pp: "bought", group: "godan" },
  { w: "帰[かえ]る", en: "go home", ing: "going home", pp: "gone home", group: "godan", note: "Looks like an ichidan verb (え-sound + る) but it's godan!" },
  { w: "行[い]く", en: "go", ing: "going", pp: "gone", group: "godan", teException: true, note: "Normal godan verb, except its て/た-form: 行って, 行った." },
  { w: "食[た]べる", en: "eat", ing: "eating", pp: "eaten", group: "ichidan" },
  { w: "見[み]る", en: "see", ing: "watching", pp: "seen", group: "ichidan" },
  { w: "起[お]きる", en: "wake up", ing: "waking up", pp: "woken up", group: "ichidan" },
  { w: "寝[ね]る", en: "sleep", ing: "sleeping", pp: "slept", group: "ichidan" },
  { w: "教[おし]える", en: "teach", ing: "teaching", pp: "taught", group: "ichidan" },
  { w: "する", en: "do", ing: "doing", pp: "done", group: "irregular" },
  { w: "来[く]る", en: "come", ing: "coming", pp: "come", group: "irregular" },
  { w: "勉強[べんきょう]する", en: "study", ing: "studying", pp: "studied", group: "irregular", note: "Noun + する verbs conjugate exactly like する." },
];

const irregularBase = (v) => (v.w.endsWith("する") ? "する" : "来[く]る");

// Returns { parts: [{m, cls}], viz, explain, result }.
// cls: stem | end | change | suffix | drop. `group` can be overridden to build wrong answers for the quiz.
function conjugate(v, formId, group = v.group) {
  const f = FORM[formId];
  const end = v.w.slice(-1);
  const stem = v.w.slice(0, -1);
  let parts, viz, explain;

  if (group === "irregular") {
    const base = irregularBase(v);
    const prefix = v.w.slice(0, v.w.length - base.length);
    const [chg, suf] = IRREGULAR[base][formId];
    const isDict = formId === "dict";
    parts = [
      prefix && { m: prefix, cls: "stem" },
      { m: chg, cls: isDict ? "stem" : "change" },
      { m: suf, cls: isDict ? "end" : "suffix" },
    ].filter(Boolean);
    viz = { type: "irregular", base };
    explain = isDict
      ? `One of the two irregular verbs. Its stem changes in ways that don't follow a rule.`
      : `<b>${plain(base)}</b> is irregular, so the stem changes to <b>${plain(chg)}</b> — just memorize it.`;
    if (prefix) explain += ` Any <b>noun + する</b> verb works exactly like する.`;
  } else if (formId === "dict") {
    parts = [{ m: stem, cls: "stem" }, { m: end, cls: "end" }];
    viz = group === "godan" ? { type: "row", end, vowel: 2 } : { type: "dict" };
    explain = group === "ichidan"
      ? "Ichidan verbs always end in る, with an i- or e-sound right before it."
      : `Godan dictionary forms end in an u-sound. This one ends in <b>${end}</b>.`;
  } else if (formId === "pro") {
    parts = [{ m: stem, cls: "stem" }, { m: end, cls: "end" }, { m: "な", cls: "suffix" }];
    viz = { type: "add" };
    explain = "Nothing changes: take the dictionary form and add <b>な</b>.";
  } else if (group === "ichidan") {
    parts = [{ m: stem, cls: "stem" }, { m: "る", cls: "drop" }, { m: f.ichidan, cls: "suffix" }];
    viz = { type: "drop", stem, suffix: f.ichidan };
    explain = `Ichidan verbs are the easy ones: snip off <b>る</b> and add <b>${f.ichidan}</b>. The stem never changes.`;
  } else if (formId === "te" || formId === "ta") {
    const grp = TE_GROUPS.find((g) => g.ends.includes(end));
    let t = v.teException ? "って" : grp.te;
    if (formId === "ta") t = toTa(t);
    parts = [{ m: stem, cls: "stem" }, { m: t[0], cls: "change" }, { m: t.slice(1), cls: "suffix" }];
    viz = { type: "te", end, exception: !!v.teException };
    explain = v.teException
      ? `<b>${plain(v.w)}</b> is the one exception: it ends in く but becomes <b>${t}</b>, not い${t.slice(1)}.`
      : `Verbs ending in <b>${grp.ends.join(" ・ ")}</b> swap the ending for <b>${t}</b>. Find your row in the chart below.`;
  } else {
    const k = ROWS[end][f.vowel];
    parts = [{ m: stem, cls: "stem" }, { m: k, cls: "change" }];
    if (f.godan) parts.push({ m: f.godan, cls: "suffix" });
    viz = { type: "row", end, vowel: f.vowel };
    explain = `Slide <b>${end}</b> along its row to the <b>${VOWELS[f.vowel]}</b>-column → <b>${k}</b>${f.godan ? `, then add <b>${f.godan}</b>` : ". That's the whole form"}.`;
    if (end === "う" && f.vowel === 0) explain += " (Verbs ending in う use <b>わ</b> here, not あ.)";
  }

  const result = parts.filter((p) => p.cls !== "drop").map((p) => p.m).join("");
  return { parts, viz, explain, result };
}

// Respectful and humble language. Rows are special verbs; a dash means there's no special word.
const KEIGO = [
  { w: "いる", en: "be", up: "いらっしゃる", down: "おる" },
  { w: "行[い]く・来[く]る", en: "go, come", up: "いらっしゃる", down: "参[まい]る" },
  { w: "食[た]べる・飲[の]む", en: "eat, drink", up: "召[め]し上[あ]がる", down: "いただく" },
  { w: "言[い]う", en: "say", up: "おっしゃる", down: "申[もう]す" },
  { w: "する", en: "do", up: "なさる", down: "いたす" },
  { w: "見[み]る", en: "see", up: "ご覧[らん]になる", down: "拝見[はいけん]する" },
  { w: "知[し]っている", en: "know", up: "ご存[ぞん]じだ", down: "存[ぞん]じている" },
  { w: "寝[ね]る", en: "sleep", up: "お休[やす]みになる", down: "—" },
  { w: "会[あ]う", en: "meet", up: "—", down: "お目[め]にかかる" },
  { w: "くれる", en: "give (to me)", up: "くださる", down: "—" },
  { w: "もらう", en: "receive", up: "—", down: "いただく" },
  { w: "あげる", en: "give", up: "—", down: "さしあげる" },
];
