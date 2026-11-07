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
  { id: "masen", label: "Polite ません", meaning: "don't {v} (polite)", vowel: 1, godan: "ません", ichidan: "ません" },
  { id: "mashita", label: "Polite ました", meaning: "{v} — in the past (polite)", vowel: 1, godan: "ました", ichidan: "ました",
    note: "And “didn't”, politely: ませんでした, as in 書きませんでした." },
  { id: "nai",  label: "Negative ない", meaning: "don't {v}", vowel: 0, godan: "ない", ichidan: "ない" },
  { id: "nakatta", label: "Past negative", meaning: "didn't {v}", vowel: 0, godan: "なかった", ichidan: "なかった",
    note: "Take the ない-form and swap ない for なかった, the same way an い-adjective goes into the past." },
  { id: "te",   label: "て-form", meaning: "{v} and… (links actions · 〜てください · 〜ている)", ichidan: "て" },
  { id: "ta",   label: "Past た", meaning: "{v} — in the past (did)", ichidan: "た" },
  { id: "tai",  label: "Want to たい", meaning: "want to {v}", vowel: 1, godan: "たい", ichidan: "たい",
    note: "たい works like an い-adjective: 書きたくない = don't want to write, 書きたかった = wanted to write. It's for what you want. For someone else, say 書きたがっている." },
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
    dict: ["す", "る"], masu: ["し", "ます"], masen: ["し", "ません"], mashita: ["し", "ました"],
    nai: ["し", "ない"], nakatta: ["し", "なかった"], te: ["し", "て"], ta: ["し", "た"], tai: ["し", "たい"], pot: ["でき", "る"], vol: ["し", "よう"], ba: ["す", "れば"],
    pas: ["さ", "れる"], cau: ["さ", "せる"], imp: ["し", "ろ"], pro: ["す", "るな"],
  },
  "来[く]る": {
    dict: ["来[く]", "る"], masu: ["来[き]", "ます"], masen: ["来[き]", "ません"], mashita: ["来[き]", "ました"],
    nai: ["来[こ]", "ない"], nakatta: ["来[こ]", "なかった"], te: ["来[き]", "て"], ta: ["来[き]", "た"], tai: ["来[き]", "たい"], pot: ["来[こ]", "られる"], vol: ["来[こ]", "よう"], ba: ["来[く]", "れば"],
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
  // The other sneaky godan verbs. extra: only on this page. The patterns' `not` lists weren't written with them in mind.
  { w: "入[はい]る", en: "enter", ing: "entering", pp: "entered", group: "godan", extra: true,
    note: "Looks like an ichidan verb (い-sound + る) but it's godan: 入らない, not 入ない. 入れる (put in) is the ichidan one." },
  { w: "走[はし]る", en: "run", ing: "running", pp: "run", group: "godan", extra: true,
    note: "Looks like an ichidan verb (い-sound + る) but it's godan: 走らない, not 走ない." },
  { w: "知[し]る", en: "know", ing: "knowing", pp: "known", group: "godan", extra: true,
    note: "Looks like an ichidan verb (い-sound + る) but it's godan: 知らない. “I know” is 知っている, but “I don't know” is just 知らない." },
  { w: "切[き]る", en: "cut", ing: "cutting", pp: "cut", group: "godan", extra: true,
    note: "Looks like an ichidan verb (い-sound + る) but it's godan: 切らない. 着る (wear) sounds the same and is ichidan: 着ない." },
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

// Verbs for the "Which group?" quiz. Mostly not the ones on the page, where their group is
// printed right next to them. Heavy on verbs ending in る, since those are the hard ones.
const GROUP_QUIZ = [
  // Ichidan: an i- or e-sound before る.
  { w: "着[き]る", en: "wear", group: "ichidan", note: "切る (cut) sounds just the same but is godan: 着ない vs 切らない." },
  { w: "借[か]りる", en: "borrow", group: "ichidan" },
  { w: "降[お]りる", en: "get off", group: "ichidan", note: "降る (fall, of rain) uses the same kanji but is godan." },
  { w: "浴[あ]びる", en: "take (a shower)", group: "ichidan" },
  { w: "できる", en: "be able to", group: "ichidan" },
  { w: "落[お]ちる", en: "fall", group: "ichidan" },
  { w: "信[しん]じる", en: "believe", group: "ichidan" },
  { w: "いる", en: "be (people, animals)", group: "ichidan", note: "要る (need) sounds the same but is godan: いない vs 要らない." },
  { w: "出[で]る", en: "go out", group: "ichidan" },
  { w: "開[あ]ける", en: "open", group: "ichidan" },
  { w: "閉[し]める", en: "close", group: "ichidan" },
  { w: "忘[わす]れる", en: "forget", group: "ichidan" },
  { w: "覚[おぼ]える", en: "remember", group: "ichidan" },
  { w: "答[こた]える", en: "answer", group: "ichidan" },
  { w: "始[はじ]める", en: "start (something)", group: "ichidan", note: "始まる (something starts) is godan: 始めない vs 始まらない." },
  { w: "見[み]せる", en: "show", group: "ichidan" },
  { w: "入[い]れる", en: "put in", group: "ichidan", note: "入る (enter) uses the same kanji but is godan." },
  { w: "変[か]える", en: "change", group: "ichidan", note: "帰る (go home) sounds the same but is godan: 変えない vs 帰らない." },
  { w: "疲[つか]れる", en: "get tired", group: "ichidan" },
  // Godan that don't end in る.
  { w: "読[よ]む", en: "read", group: "godan" },
  { w: "使[つか]う", en: "use", group: "godan" },
  { w: "会[あ]う", en: "meet", group: "godan" },
  { w: "立[た]つ", en: "stand", group: "godan" },
  { w: "持[も]つ", en: "hold", group: "godan" },
  { w: "呼[よ]ぶ", en: "call", group: "godan" },
  { w: "急[いそ]ぐ", en: "hurry", group: "godan" },
  { w: "押[お]す", en: "push", group: "godan" },
  { w: "歩[ある]く", en: "walk", group: "godan" },
  { w: "休[やす]む", en: "rest", group: "godan" },
  // Godan ending in る after an a-, u- or o-sound.
  { w: "分[わ]かる", en: "understand", group: "godan" },
  { w: "乗[の]る", en: "ride", group: "godan" },
  { w: "作[つく]る", en: "make", group: "godan" },
  { w: "終[お]わる", en: "end", group: "godan" },
  { w: "始[はじ]まる", en: "start (by itself)", group: "godan", note: "始める (start something) is ichidan: 始まらない vs 始めない." },
  { w: "座[すわ]る", en: "sit", group: "godan" },
  { w: "取[と]る", en: "take", group: "godan" },
  { w: "送[おく]る", en: "send", group: "godan" },
  { w: "降[ふ]る", en: "fall (of rain)", group: "godan", note: "降りる (get off) uses the same kanji but is ichidan." },
  { w: "売[う]る", en: "sell", group: "godan" },
  // The sneaky ones: they look ichidan but are godan.
  { w: "帰[かえ]る", en: "go home", group: "godan", note: "変える (change) sounds the same and is ichidan: 帰らない vs 変えない." },
  { w: "入[はい]る", en: "enter", group: "godan", note: "入れる (put in) is the ichidan one." },
  { w: "走[はし]る", en: "run", group: "godan" },
  { w: "知[し]る", en: "know", group: "godan" },
  { w: "切[き]る", en: "cut", group: "godan", note: "着る (wear) sounds the same and is ichidan: 切らない vs 着ない." },
  { w: "要[い]る", en: "need", group: "godan", note: "いる (be) sounds the same and is ichidan: 要らない vs いない." },
  { w: "蹴[け]る", en: "kick", group: "godan" },
  { w: "減[へ]る", en: "decrease", group: "godan" },
  { w: "喋[しゃべ]る", en: "chat", group: "godan" },
  { w: "滑[すべ]る", en: "slip", group: "godan" },
  { w: "握[にぎ]る", en: "grip", group: "godan" },
  { w: "限[かぎ]る", en: "limit", group: "godan" },
  // Irregular: する, 来る, and anything built on them.
  { w: "する", en: "do", group: "irregular" },
  { w: "来[く]る", en: "come", group: "irregular" },
  { w: "散歩[さんぽ]する", en: "take a walk", group: "irregular" },
  { w: "掃除[そうじ]する", en: "clean", group: "irregular" },
  { w: "持[も]って来[く]る", en: "bring", group: "irregular", note: "Anything ending in 来る conjugates like 来る: 持って来ない." },
];

// Why a verb is in its group, following the flowchart on the page.
const I_SOUNDS = "いきぎしじちぢにひびぴみり";
const E_SOUNDS = "えけげせぜてでねへべぺめれ";
function groupWhy(v) {
  const k = kana(v.w);
  if (v.group === "irregular") {
    if (v.w === "する" || v.w === "来[く]る") return `<b>${plain(v.w)}</b> is one of the only two irregular verbs.`;
    return v.w.endsWith("する")
      ? "It's a noun + <b>する</b> verb, and those all work exactly like する."
      : "It ends in <b>来る</b>, so it works exactly like 来る.";
  }
  const end = k.slice(-1);
  if (end !== "る") return `It ends in <b>${end}</b>, not る, so it can only be godan.`;
  const before = k.slice(-2, -1);
  const sound = I_SOUNDS.includes(before) ? "i" : E_SOUNDS.includes(before) ? "e" : "";
  if (!sound) return `It ends in る, but <b>${before}</b> right before it isn't an i- or e-sound, so it's godan.`;
  if (v.group === "ichidan") return `It ends in る with an ${sound}-sound (<b>${before}</b>) right before it, so it's ichidan.`;
  return `A sneaky one: <b>${before}</b> + る looks ichidan, but this verb is godan. These just have to be learned. Its ない-form gives it away: <b>らない</b>, not just ない.`;
}

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
