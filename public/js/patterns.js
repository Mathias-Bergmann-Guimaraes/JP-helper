// Verb patterns: a verb form + a fixed ending.
// base: the verb form the ending attaches to.
//   stem = ます-form minus ます · te = て-form · nai = ない-form minus ない · naif = the whole ない-form
//   dict = dictionary form · ta = た-form · plain = any plain form, shown with the dictionary form · vol = volitional
// en: {v} {ing} {pp} become the verb's English.
// avoid: wrong-answer verb forms to leave out of the quiz, because they'd also be right for this pattern.
// not: verbs the pattern doesn't make sense with.
// In example chunks, {…} marks the pattern part.

// Groups run in the order Minna no Nihongo introduces each verb form.
const PATTERN_GROUPS = [
  { id: "stem", label: "ます-stem", color: "var(--c-with)", about: "Take the ます-form and remove ます: 書きます → 書き" },
  { id: "te", label: "て-form", color: "var(--c-time)", about: "The linking form: 書く → 書いて" },
  { id: "nai", label: "ない-form", color: "var(--c-subject)", about: "The plain negative: 書く → 書かない" },
  { id: "dict", label: "Dictionary form", color: "var(--c-topic)", about: "The verb just as it is: 書く" },
  { id: "ta", label: "た-form", color: "var(--c-point)", about: "The plain past: 書く → 書いた" },
  { id: "plain", label: "Plain form", color: "var(--c-place)", about: "Any plain form works, past or negative too: 書く, 書いた, 書かない" },
  { id: "vol", label: "Volitional form", color: "var(--c-object)", about: "The “let's” form: 書く → 書こう" },
];
const patGroupOf = (p) => (p.base === "naif" ? "nai" : p.base);

const BASE_LIT = {
  stem: ["ます-stem", "(the verb)"], te: ["て-form", "doing"], nai: ["ない-form − ない", "(not) do"], naif: ["ない-form", "not doing"],
  dict: ["dictionary form", "(the verb)"], ta: ["た-form", "did"], plain: ["plain form", "(the verb)"], vol: ["volitional", "let's do"],
};
const patEx = (label, en, ...chunks) => ({ label, en, chunks: chunks.map(([w, p, role]) => ({ w, p, role })) });
const patDef = ({ lit, result, ex, forms, ...p }) => ({
  ...p,
  examples: ex,
  literal: [{ t: BASE_LIT[p.base][0], g: BASE_LIT[p.base][1], verb: true }, ...lit.map(([t, g]) => ({ t, g }))],
  literalResult: result,
  forms: forms.map(([e, m]) => ({ e, m })),
});

const VERB_PATTERNS = [
  {
    id: "teiru", lesson: 14, title: "〜ている",
    name: "Ongoing action / current state", meaning: "is doing · is (in a state)",
    base: "te", ending: "いる", en: "is {ing}",
    caption: "An action stretched across “now” — or a result that stays",
    idea: "Take the て-form and add いる (“to be”). It either stretches an action out over time, or says that the result of an action is still true now.",
    literal: [{ t: "て-form", g: "doing", verb: true }, { t: "いる", g: "be / exist" }],
    literalResult: "“be doing”",
    examples: [
      { label: "Action in progress", en: "I'm eating right now.",
        chunks: [{ w: "今[いま]", role: "time" }, { w: "ご飯[はん]", p: "を", role: "object" }, { w: "食[た]べて{います}", role: "verb" }] },
      { label: "Action in progress", en: "It's raining.",
        chunks: [{ w: "雨[あめ]", p: "が", role: "subject" }, { w: "降[ふ]って{います}", role: "verb" }] },
      { label: "Result that stays", en: "My older sister is married.",
        chunks: [{ w: "姉[あね]", p: "は", role: "topic" }, { w: "結婚[けっこん]して{います}", role: "verb" }] },
      { label: "Ongoing situation", en: "I live in Tokyo.",
        chunks: [{ w: "私[わたし]", p: "は", role: "topic" }, { w: "東京[とうきょう]", p: "に", role: "point" }, { w: "住[す]んで{います}", role: "verb" }] },
    ],
    forms: [
      { e: "〜ています", m: "is doing (polite)" },
      { e: "〜ていない / 〜ていません", m: "isn't doing · hasn't done" },
      { e: "〜ていた / 〜ていました", m: "was doing" },
      { e: "〜てる", m: "casual speech (い drops)" },
    ],
    tip: "Verbs of change like 結婚する, 知る, 住む use 〜ている for a state: 知っています = “I know”, not “I am knowing”.",
  },
  {
    id: "tai", lesson: 13, title: "〜たい",
    name: "Wanting to do", meaning: "want to do",
    base: "stem", ending: "たい", en: "want to {v}", avoid: ["te"],
    caption: "A wish in your head",
    idea: "Take the ます-form, remove ます, add たい. The result behaves like an い-adjective, so it conjugates exactly like 高い.",
    literal: [{ t: "ます-stem", g: "(the verb)", verb: true }, { t: "たい", g: "want" }],
    literalResult: "“want to do”",
    examples: [
      { label: "Want to", en: "I want to go to Japan.",
        chunks: [{ w: "日本[にほん]", p: "へ", role: "dir" }, { w: "行[い]き{たいです}", role: "verb" }] },
      { label: "を can become が", en: "I want to drink water.",
        chunks: [{ w: "水[みず]", p: "が", role: "subject" }, { w: "飲[の]み{たい}", role: "verb" }] },
      { label: "Don't want to", en: "Today I don't want to do anything.",
        chunks: [{ w: "今日[きょう]", p: "は", role: "topic" }, { w: "何[なに]", p: "も", role: "also" }, { w: "し{たくないです}", role: "verb" }] },
    ],
    forms: [
      { e: "〜たいです", m: "want to (polite)" },
      { e: "〜たくない", m: "don't want to" },
      { e: "〜たかった", m: "wanted to" },
      { e: "〜たくなかった", m: "didn't want to" },
    ],
    tip: "Only for your own wishes, or when asking someone directly (行きたいですか?). For other people, say 〜たがっている.",
  },
  {
    id: "kudasai", lesson: 14, title: "〜てください",
    name: "Polite request", meaning: "please do",
    base: "te", ending: "ください", en: "please {v}",
    caption: "A request aimed at the listener",
    idea: "て-form + ください is the standard polite request. Literally: “please give me (your) doing it.”",
    literal: [{ t: "て-form", g: "doing", verb: true }, { t: "ください", g: "please give me" }],
    literalResult: "“please do”",
    examples: [
      { label: "Please do", en: "Please write your name here.",
        chunks: [{ w: "ここ", p: "に", role: "point" }, { w: "名前[なまえ]", p: "を", role: "object" }, { w: "書[か]いて{ください}", role: "verb" }] },
      { label: "Please do", en: "Please speak in Japanese.",
        chunks: [{ w: "日本語[にほんご]", p: "で", role: "place" }, { w: "話[はな]して{ください}", role: "verb" }] },
      { label: "Please DON'T → ないでください", en: "Please don't take photos here.",
        chunks: [{ w: "ここ", p: "で", role: "place" }, { w: "写真[しゃしん]", p: "を", role: "object" }, { w: "撮[と]らない{でください}", role: "verb" }] },
    ],
    forms: [
      { e: "〜てください", m: "please do" },
      { e: "〜ないでください", m: "please don't (ない-form + でください)" },
      { e: "〜てくださいませんか", m: "would you kindly…? (extra polite)" },
      { e: "〜ていただけませんか", m: "could you please…? (very polite)" },
      { e: "〜て", m: "casual request to friends (待って!)" },
    ],
    tip: "“Please don't” uses the ない-form, not the て-form: 行かないでください.",
  },
  {
    id: "temoii", lesson: 15, title: "〜てもいい",
    name: "Permission", meaning: "may · it's OK to",
    base: "te", ending: "もいい", en: "it's OK to {v}",
    caption: "The gate is open",
    idea: "て-form + も (“even”) + いい (“good”). Literally “even if you do it, it's fine” — so: you may. Add ですか to ask for permission.",
    literal: [{ t: "て-form", g: "doing", verb: true }, { t: "も", g: "even" }, { t: "いい", g: "good" }],
    literalResult: "“even doing it is fine”",
    examples: [
      { label: "Asking permission", en: "May I take photos here?",
        chunks: [{ w: "ここ", p: "で", role: "place" }, { w: "写真[しゃしん]", p: "を", role: "object" }, { w: "撮[と]って{もいいですか}", role: "verb" }] },
      { label: "Giving permission", en: "You can open the window.",
        chunks: [{ w: "窓[まど]", p: "を", role: "object" }, { w: "開[あ]けて{もいいですよ}", role: "verb" }] },
      { label: "Don't have to → なくてもいい", en: "You don't have to come tomorrow.",
        chunks: [{ w: "明日[あした]", p: "は", role: "topic" }, { w: "来[こ]{なくてもいいです}", role: "verb" }] },
    ],
    forms: [
      { e: "〜てもいいですか", m: "may I…?" },
      { e: "〜てもいいです", m: "you may…" },
      { e: "〜なくてもいい", m: "don't have to" },
      { e: "〜てはいけない", m: "must not (the opposite)" },
    ],
    tip: "The opposite — must NOT — is 〜てはいけない: ここで食べてはいけません = “You mustn't eat here.”",
  },
  {
    id: "nakereba", lesson: 17, title: "〜なければならない",
    name: "Obligation", meaning: "must · have to",
    base: "nai", ending: "なければならない", en: "must {v}",
    caption: "Not doing it is a dead end — only one way left",
    idea: "A double negative: “if (I) don't do it, it won't do.” Take the ない-form, swap ない for なければ, then add ならない.",
    literal: [{ t: "ない-form − ない", g: "(not) do", verb: true }, { t: "なければ", g: "if not" }, { t: "ならない", g: "won't do" }],
    literalResult: "“if I don't, it's no good”",
    examples: [
      { label: "Must (polite)", en: "I have to take medicine every day.",
        chunks: [{ w: "毎日[まいにち]", role: "time" }, { w: "薬[くすり]", p: "を", role: "object" }, { w: "飲[の]ま{なければなりません}", role: "verb" }] },
      { label: "Must (plain)", en: "I have to get up early tomorrow.",
        chunks: [{ w: "明日[あした]", p: "は", role: "topic" }, { w: "早[はや]く", role: "time" }, { w: "起[お]き{なければならない}", role: "verb" }] },
      { label: "Casual: なきゃ", en: "I gotta do my homework.",
        chunks: [{ w: "宿題[しゅくだい]", p: "を", role: "object" }, { w: "し{なきゃ}", role: "verb" }] },
    ],
    forms: [
      { e: "〜なければなりません", m: "must (polite)" },
      { e: "〜なければならない", m: "must (plain / written)" },
      { e: "〜なきゃ / 〜なくちゃ", m: "gotta (casual speech)" },
      { e: "〜なくてもいい", m: "don't have to (the opposite)" },
    ],
    tip: "In conversation you'll mostly hear なきゃ and なくちゃ — they're the long form with the end chopped off.",
  },
  // ---------------------------------------------------------------- ます-stem
  patDef({ id: "mashou", lesson: 6, title: "〜ましょう", base: "stem", ending: "ましょう", en: "let's {v}",
    name: "Let's · invitations · offers", meaning: "let's · won't you…? · shall I…?",
    caption: "Doing it together",
    idea: "Swap the ます for ましょう and you're suggesting something together. Swap it for ませんか and you're inviting someone, which leaves them room to say no.",
    lit: [["ましょう", "let's"]], result: "“let's do”",
    ex: [
      patEx("Let's", "Let's take a short break.", ["少[すこ]し", "", "time"], ["休[やす]み{ましょう}", "", "verb"]),
      patEx("Won't you…?", "Won't you have a meal with me?", ["一緒[いっしょ]に", "", "with"], ["ご飯[はん]", "を", "object"], ["食[た]べ{ませんか}", "", "verb"]),
      patEx("Shall I…?", "Shall I open the window?", ["窓[まど]", "を", "object"], ["開[あ]け{ましょうか}", "", "verb"]),
    ],
    forms: [["〜ましょう", "let's"], ["〜ませんか", "won't you…? (invitation)"], ["〜ましょうか", "shall I…? (offer)"], ["〜(よ)う", "let's (casual)"]],
    tip: "To invite someone, 〜ませんか is more polite than 〜ましょう, because it asks instead of assuming they'll agree." }),
  patDef({ id: "niiku", lesson: 13, title: "〜に行[い]く", base: "stem", ending: "に行[い]く", en: "go (somewhere) to {v}", not: ["行[い]く", "来[く]る", "帰[かえ]る", "死[し]ぬ"],
    name: "Going in order to do", meaning: "go (somewhere) to do",
    caption: "The trip has a purpose",
    idea: "The ます-stem + に names the reason for the trip. It also works with 来ます and 帰ります.",
    lit: [["に", "for the purpose of"], ["行[い]く", "go"]], result: "“go to do”",
    ex: [
      patEx("Go to do", "I'm going to the park to take photos.", ["公園[こうえん]", "へ", "dir"], ["写真[しゃしん]", "を", "object"], ["撮[と]り{に行[い]きます}", "", "verb"]),
      patEx("Come to do", "A friend came to see me.", ["友達[ともだち]", "が", "subject"], ["会[あ]い{に来[き]ました}", "", "verb"]),
    ],
    forms: [["〜に行きます", "go to do"], ["〜に来ます", "come to do"], ["〜に帰ります", "go home to do"], ["N に行きます", "with a noun: 買い物に行きます"]],
    tip: "With a noun + する verb you can drop the する: 勉強に行きます is the same as 勉強しに行きます." }),
  patDef({ id: "nagara", lesson: 28, title: "〜ながら", base: "stem", ending: "ながら", en: "while {ing}",
    name: "Two actions at once", meaning: "while doing",
    caption: "Two actions on the same stretch of time",
    idea: "ます-stem + ながら marks the side action. The main action comes last in the sentence.",
    lit: [["ながら", "while"]], result: "“while doing”",
    ex: [
      patEx("At the same time", "I study while listening to music.", ["音楽[おんがく]", "を", "object"], ["聞[き]き{ながら}", "", "with"], ["勉強[べんきょう]します", "", "verb"]),
      patEx("At the same time", "Let's talk over a coffee.", ["コーヒー", "を", "object"], ["飲[の]み{ながら}", "", "with"], ["話[はな]しましょう", "", "verb"]),
    ],
    forms: [["A ながら B", "B is the main action, A is on the side"], ["〜ながら働きます", "work while doing"]],
    tip: "Both actions need the same person doing them. For two different people, use 〜ている間に instead." }),
  patDef({ id: "soulook", lesson: 43, title: "〜そうです (looks)", base: "stem", ending: "そうです", en: "looks like it's about to {v}",
    name: "Looks like it's about to", meaning: "looks like · seems about to",
    caption: "What your eyes are telling you",
    idea: "ます-stem + そうです says what you can see coming. It's your own impression from looking, not something you heard.",
    lit: [["そうです", "looks like"]], result: "“looks about to”",
    ex: [
      patEx("About to happen", "It looks like it's going to rain.", ["雨[あめ]", "が", "subject"], ["降[ふ]り{そうです}", "", "verb"]),
      patEx("About to happen", "That button looks like it's about to come off.", ["ボタン", "が", "subject"], ["取[と]れ{そうです}", "", "verb"]),
    ],
    forms: [["〜そうです", "looks about to"], ["〜そうもない", "doesn't look like it will"], ["〜そうな N", "before a noun"]],
    tip: "Watch the verb form: 降りそうです = it looks like rain. 降るそうです = I hear it will rain." }),
  patDef({ id: "sugiru", lesson: 44, title: "〜すぎる", base: "stem", ending: "すぎる", en: "{v} too much",
    name: "Too much", meaning: "too much · overdo",
    caption: "Past the limit",
    idea: "ます-stem + すぎる (“to pass”): the action went past the point where it was OK. すぎる is an ichidan verb, so it conjugates like 食べる.",
    lit: [["すぎる", "go past"]], result: "“overdo it”",
    ex: [
      patEx("Overdid it", "I ate too much yesterday.", ["昨日[きのう]", "", "time"], ["食[た]べ{すぎました}", "", "verb"]),
      patEx("With adjectives", "This bag is too expensive.", ["このかばん", "は", "topic"], ["高[たか]{すぎます}", "", "verb"]),
    ],
    forms: [["〜すぎます", "too much (polite)"], ["〜すぎました", "did too much"], ["い-adj すぎる", "drop い: 高すぎる"], ["な-adj すぎる", "drop な: 静かすぎる"]],
    tip: "It works on adjectives too. Just drop the い or な: 高い → 高すぎる." }),
  patDef({ id: "yasui", lesson: 44, title: "〜やすい・にくい", base: "stem", ending: "やすい", en: "easy to {v}",
    name: "Easy / hard to do", meaning: "easy to do · hard to do",
    caption: "A gentle slope or a steep one",
    idea: "ます-stem + やすい means the action is easy, and + にくい means it's hard. The result is an い-adjective, so it conjugates like 高い.",
    lit: [["やすい", "easy"]], result: "“easy to do”",
    ex: [
      patEx("Easy to", "This pen is easy to write with.", ["このペン", "は", "topic"], ["書[か]き{やすいです}", "", "verb"]),
      patEx("Hard to", "This word is hard to remember.", ["この言葉[ことば]", "は", "topic"], ["覚[おぼ]え{にくいです}", "", "verb"]),
    ],
    forms: [["〜やすい", "easy to do"], ["〜にくい", "hard to do"], ["〜やすくて", "linking: easy to…, and"], ["〜やすくなる", "become easier to"]],
    tip: "It can also mean “tends to”: 壊れやすい = breaks easily, 忘れやすい = easy to forget." }),

  // ---------------------------------------------------------------- て-form
  patDef({ id: "tehaikenai", lesson: 15, title: "〜てはいけない", base: "te", ending: "はいけない", en: "must not {v}",
    name: "Prohibition", meaning: "must not · not allowed",
    caption: "The gate is shut",
    idea: "て-form + は + いけない (“no good”). It's a firm rule, so it's used for rules and by people in charge.",
    lit: [["は", "as for"], ["いけない", "no good"]], result: "“doing it is no good”",
    ex: [
      patEx("A rule", "You mustn't smoke here.", ["ここ", "で", "place"], ["たばこ", "を", "object"], ["吸[す]って{はいけません}", "", "verb"]),
      patEx("A rule", "You mustn't take photos in the museum.", ["美術館[びじゅつかん]", "で", "place"], ["写真[しゃしん]", "を", "object"], ["撮[と]って{はいけません}", "", "verb"]),
    ],
    forms: [["〜てはいけません", "must not (polite)"], ["〜てはいけない", "must not (plain)"], ["〜ちゃだめ", "casual: don't!"], ["〜てもいい", "may (the opposite)"]],
    tip: "It sounds strict said to someone's face. To ask politely, use 〜ないでください instead." }),
  patDef({ id: "tekara", lesson: 16, title: "〜てから", base: "te", ending: "から", en: "after {ing}, …",
    name: "After doing", meaning: "after doing · once done",
    caption: "First one, then the other",
    idea: "て-form + から (“from”): starting from when A is done, B happens. It stresses the order: A has to come first.",
    lit: [["から", "from"]], result: "“from having done”",
    ex: [
      patEx("First A, then B", "I brush my teeth after eating.", ["ご飯[はん]", "を", "object"], ["食[た]べて{から}", "", "range"], ["歯[は]", "を", "object"], ["磨[みが]きます", "", "verb"]),
      patEx("First A, then B", "I'll go home after work finishes.", ["仕事[しごと]", "が", "subject"], ["終[お]わって{から}", "", "range"], ["帰[かえ]ります", "", "verb"]),
    ],
    forms: [["V1 てから V2", "after V1, V2"], ["V た あとで", "after (a similar pattern)"]],
    tip: "Don't mix it up with plain + から (“because”): 食べてから = after eating, 食べるから = because I'll eat." }),
  patDef({ id: "teageru", lesson: 24, title: "〜てあげる", base: "te", ending: "あげる", en: "{v} for someone", avoid: ["stem"],
    name: "Doing a favour for someone", meaning: "do something for someone",
    caption: "The favour leaves you",
    idea: "て-form + あげる (“give”): you give the action to someone as a favour. The favour travels away from you.",
    lit: [["あげる", "give"]], result: "“give the doing”",
    ex: [
      patEx("I do it for them", "I taught a friend some Japanese.", ["友達[ともだち]", "に", "point"], ["日本語[にほんご]", "を", "object"], ["教[おし]えて{あげました}", "", "verb"]),
      patEx("I do it for them", "I'll carry your bag for you.", ["荷物[にもつ]", "を", "object"], ["持[も]って{あげます}", "", "verb"]),
    ],
    forms: [["〜てあげます", "do for someone (polite)"], ["〜てやります", "do for a pet or a junior"], ["〜てさしあげます", "do for a superior (humble)"]],
    tip: "It can sound like you're showing off the favour. When offering help to a stranger, 〜ましょうか is safer." }),
  patDef({ id: "temorau", lesson: 24, title: "〜てもらう", base: "te", ending: "もらう", en: "have someone {v} for me",
    name: "Receiving a favour", meaning: "have someone do · get someone to do",
    caption: "You're the one receiving",
    idea: "て-form + もらう (“receive”): you receive someone's action. You are the subject, and the helper gets に.",
    lit: [["もらう", "receive"]], result: "“receive the doing”",
    ex: [
      patEx("I got them to", "I had my father fix my bicycle.", ["父[ちち]", "に", "point"], ["自転車[じてんしゃ]", "を", "object"], ["直[なお]して{もらいました}", "", "verb"]),
      patEx("I got them to", "A friend took a photo for me.", ["友達[ともだち]", "に", "point"], ["写真[しゃしん]", "を", "object"], ["撮[と]って{もらいました}", "", "verb"]),
    ],
    forms: [["〜てもらいます", "have someone do (polite)"], ["〜ていただきます", "have a superior do (humble)"], ["〜てもらえませんか", "could you please…?"]],
    tip: "The sentence is about you: 友達に手伝ってもらいました is literally “I received help from a friend”." }),
  patDef({ id: "tekureru", lesson: 24, title: "〜てくれる", base: "te", ending: "くれる", en: "someone will {v} for me",
    name: "Someone does me a favour", meaning: "someone does (for me)",
    caption: "The favour comes to you",
    idea: "て-form + くれる (“gives to me”): someone else gives you their action. The helper is the subject and gets が, and it sounds grateful.",
    lit: [["くれる", "gives to me"]], result: "“gives me the doing”",
    ex: [
      patEx("They did it for me", "My mother made me lunch.", ["母[はは]", "が", "subject"], ["昼[ひる]ご飯[はん]", "を", "object"], ["作[つく]って{くれました}", "", "verb"]),
      patEx("They did it for me", "A friend helped me with my homework.", ["友達[ともだち]", "が", "subject"], ["宿題[しゅくだい]", "を", "object"], ["手伝[てつだ]って{くれました}", "", "verb"]),
    ],
    forms: [["〜てくれます", "does for me (polite)"], ["〜てくださいます", "a superior does for me"], ["〜てくれませんか", "won't you…? (request)"]],
    tip: "The same event two ways: 友達が手伝ってくれました (the friend is the subject), 友達に手伝ってもらいました (you are)." }),
  patDef({ id: "temo", lesson: 25, title: "〜ても", base: "te", ending: "も", en: "even if (I) {v}", avoid: ["stem"],
    name: "Even if", meaning: "even if · even though",
    caption: "Something's in the way, but the result doesn't change",
    idea: "て-form + も (“even”): whatever happens in the first half, the second half still stands.",
    lit: [["も", "even"]], result: "“even doing”",
    ex: [
      patEx("Even if", "Even if it rains, I'll go.", ["雨[あめ]", "が", "subject"], ["降[ふ]って{も}", "", "also"], ["行[い]きます", "", "verb"]),
      patEx("No matter how", "No matter how much I think, I don't get it.", ["いくら", "", "also"], ["考[かんが]えて{も}", "", "also"], ["わかりません", "", "verb"]),
    ],
    forms: [["〜ても", "even if"], ["〜なくても", "even if not"], ["いくら〜ても", "no matter how much"], ["い-adj くても / N でも", "with adjectives and nouns"]],
    tip: "Compare it with 〜たら: 雨が降ったら行きません (if it rains, I won't go), 雨が降っても行きます (even if it rains, I'll go)." }),
  patDef({ id: "teshimau", lesson: 29, title: "〜てしまう", base: "te", ending: "しまう", en: "{v} completely · end up {ing}",
    name: "Finished · oops", meaning: "do completely · end up doing (regret)",
    caption: "It's done, and it can't be undone",
    idea: "て-form + しまう (“put away”): the action is completely finished. Very often that comes with regret: “oh no, I went and did it.”",
    lit: [["しまう", "finish off"]], result: "“do and be done”",
    ex: [
      patEx("Regret", "I (went and) lost my wallet.", ["財布[さいふ]", "を", "object"], ["なくして{しまいました}", "", "verb"]),
      patEx("All finished", "I've finished all the homework.", ["宿題[しゅくだい]", "は", "topic"], ["全部[ぜんぶ]", "", "verb"], ["やって{しまいました}", "", "verb"]),
    ],
    forms: [["〜てしまいます", "will finish (polite)"], ["〜てしまいました", "did (often with regret)"], ["〜ちゃう / 〜じゃう", "casual: 食べちゃった"]],
    tip: "You'll hear the casual version all the time: 忘れてしまった → 忘れちゃった, 飲んでしまった → 飲んじゃった." }),
  patDef({ id: "tearu", lesson: 30, title: "〜てある", base: "te", ending: "ある", en: "has been {pp} (on purpose)", avoid: ["ta"], not: ["泳[およ]ぐ", "待[ま]つ", "死[し]ぬ", "遊[あそ]ぶ", "帰[かえ]る", "行[い]く", "起[お]きる", "寝[ね]る", "来[く]る"],
    name: "Done on purpose, and still that way", meaning: "has been done (and stays)",
    caption: "Someone did it, and the result is still there",
    idea: "て-form + ある (“exists”): someone did this on purpose, and the result is still there now. The thing that was acted on usually takes が.",
    lit: [["ある", "exists"]], result: "“exists as done”",
    ex: [
      patEx("Result on purpose", "A map has been put up on the wall.", ["壁[かべ]", "に", "point"], ["地図[ちず]", "が", "subject"], ["貼[は]って{あります}", "", "verb"]),
      patEx("Result on purpose", "The hotel has already been booked.", ["ホテル", "は", "topic"], ["もう", "", "time"], ["予約[よやく]して{あります}", "", "verb"]),
    ],
    forms: [["〜てあります", "has been done (polite)"], ["〜てある (vs ている)", "窓が開けてある = someone opened it; 窓が開いている = it's open"]],
    tip: "Only use it with verbs that take を (開ける, not 開く). The other group uses 〜ている for the same kind of state." }),
  patDef({ id: "teoku", lesson: 30, title: "〜ておく", base: "te", ending: "おく", en: "{v} in advance", avoid: ["stem"],
    name: "Do in advance", meaning: "do in advance · leave as is",
    caption: "Ticked off before the big day",
    idea: "て-form + おく (“put”): do it now and set it aside, ready for later. It can also mean leaving something as it is.",
    lit: [["おく", "put, leave"]], result: "“do and set aside”",
    ex: [
      patEx("In advance", "I'll book the restaurant ahead of time.", ["レストラン", "を", "object"], ["予約[よやく]して{おきます}", "", "verb"]),
      patEx("Leave as is", "Please leave the window open.", ["窓[まど]", "を", "object"], ["開[あ]けて{おいてください}", "", "verb"]),
    ],
    forms: [["〜ておきます", "will do in advance"], ["〜ておいてください", "please do ahead · please leave it"], ["〜とく", "casual: 買っとく"]],
    tip: "Casually, ておく shrinks to とく: 買っておく → 買っとく, and でおく to どく: 読んどく." }),
  patDef({ id: "temiru", lesson: 40, title: "〜てみる", base: "te", ending: "みる", en: "try {ing}",
    name: "Try and see", meaning: "try doing (and see)",
    caption: "Do it, then see what happens",
    idea: "て-form + みる (“see”): do it and see how it turns out. Often it comes as 〜てみたい (“I'd like to try”).",
    lit: [["みる", "see"]], result: "“do and see”",
    ex: [
      patEx("Try it", "I want to try wearing a kimono.", ["着物[きもの]", "を", "object"], ["着[き]て{みたいです}", "", "verb"]),
      patEx("Try it", "Please try eating this.", ["これ", "を", "object"], ["食[た]べて{みてください}", "", "verb"]),
    ],
    forms: [["〜てみます", "will try (polite)"], ["〜てみたい", "want to try"], ["〜てみてください", "please try"]],
    tip: "It means trying something out, not making an effort. For “try hard to”, use 〜ようにする." }),
  patDef({ id: "tekuru", lesson: 43, title: "〜てくる", base: "te", ending: "くる", en: "{v} and come back", not: ["行[い]く", "来[く]る", "帰[かえ]る"],
    name: "Go, do, and come back", meaning: "go do something and come back",
    caption: "Out and back",
    idea: "て-form + くる (“come”): leave, do something, and come back. Japanese says this where English often just says “I'll go do it.”",
    lit: [["くる", "come"]], result: "“do and come”",
    ex: [
      patEx("And come back", "I'll just go buy a ticket.", ["ちょっと", "", "time"], ["切符[きっぷ]", "を", "object"], ["買[か]って{きます}", "", "verb"]),
      patEx("And come back", "I'll go wash my hands.", ["手[て]", "を", "object"], ["洗[あら]って{きます}", "", "verb"]),
    ],
    forms: [["〜てきます", "go do and come back"], ["〜てきました", "did and came back"], ["行ってきます", "“I'm off!” (literally: I'll go and come back)"]],
    tip: "You already know one: 行ってきます, said when leaving home, is literally “I'll go and come back”." }),

  // ---------------------------------------------------------------- ない-form
  patDef({ id: "naide", lesson: 17, title: "〜ないでください", base: "naif", ending: "でください", en: "please don't {v}",
    name: "Please don't", meaning: "please don't · without doing",
    caption: "A polite stop sign",
    idea: "Keep the whole ない-form and add でください. Just ないで in the middle of a sentence means “without doing”.",
    lit: [["で", "(linking)"], ["ください", "please"]], result: "“please, not doing”",
    ex: [
      patEx("Please don't", "Please don't open this door.", ["このドア", "を", "object"], ["開[あ]けない{でください}", "", "verb"]),
      patEx("Without doing", "I drink it without sugar.", ["砂糖[さとう]", "を", "object"], ["入[い]れない{で}", "", "with"], ["飲[の]みます", "", "verb"]),
    ],
    forms: [["〜ないでください", "please don't"], ["〜ないで", "casual: don't! · without doing"], ["〜ないで V2", "do V2 without doing V1"], ["〜ないでくださいませんか", "could you please not…?"]],
    tip: "Use the ない-form here, not the て-form: 行かないでください, never 行ってないでください." }),
  patDef({ id: "nakutemo", lesson: 17, title: "〜なくてもいい", base: "nai", ending: "なくてもいい", en: "don't have to {v}",
    name: "No need to", meaning: "don't have to · no need to",
    caption: "Do it or don't, either way is fine",
    idea: "“Even if you don't do it, it's fine.” Take the ない-form and swap ない for なくてもいい.",
    lit: [["なくても", "even if not"], ["いい", "good"]], result: "“even not doing is fine”",
    ex: [
      patEx("No need", "You don't have to come tomorrow.", ["明日[あした]", "は", "topic"], ["来[こ]{なくてもいいです}", "", "verb"]),
      patEx("No need", "You don't have to take off your shoes.", ["靴[くつ]", "を", "object"], ["脱[ぬ]が{なくてもいいです}", "", "verb"]),
    ],
    forms: [["〜なくてもいいです", "don't have to (polite)"], ["〜なくてもいいですか", "is it OK if I don't…?"], ["〜なければならない", "must (the opposite)"]],
    tip: "“Don't have to” is not “must not”: 食べなくてもいい = you needn't eat, 食べてはいけない = you mustn't eat." }),

  // ---------------------------------------------------------------- Dictionary form
  patDef({ id: "koto", lesson: 18, title: "〜ことができる", base: "dict", ending: "ことができる", en: "can {v}",
    name: "Ability", meaning: "can do · is able to",
    caption: "You have the ability, or it's allowed",
    idea: "The dictionary form + こと turns the verb into a noun (“the act of doing”). Then できる says that act is possible. It covers both skill and permission.",
    lit: [["こと", "the act of"], ["が", ""], ["できる", "is possible"]], result: "“doing is possible”",
    ex: [
      patEx("Ability", "I can play the piano.", ["ピアノ", "を", "object"], ["弾[ひ]く{ことができます}", "", "verb"]),
      patEx("Possible here", "You can pay by card at this shop.", ["この店[みせ]", "で", "place"], ["カード", "で", "place"], ["払[はら]う{ことができます}", "", "verb"]),
      patEx("Hobby: 〜ことです", "My hobby is taking photos.", ["趣味[しゅみ]", "は", "topic"], ["写真[しゃしん]", "を", "object"], ["撮[と]る{ことです}", "", "verb"]),
    ],
    forms: [["〜ことができます", "can (polite)"], ["〜ことができません", "can't"], ["〜ことができました", "could · managed to"], ["N ができます", "with a noun: 日本語ができます"], ["趣味は〜ことです", "my hobby is doing"]],
    tip: "The potential form says the same thing in fewer syllables: 読むことができる = 読める. This long version sounds a little more formal." }),
  patDef({ id: "mae", lesson: 18, title: "〜まえに", base: "dict", ending: "まえに", en: "before {ing}",
    name: "Before doing", meaning: "before doing",
    caption: "This part happens first",
    idea: "Dictionary form + まえに (“in front of”). The verb stays in the dictionary form, even when the sentence is in the past, because that action hadn't happened yet.",
    lit: [["まえ", "before"], ["に", "at"]], result: "“before doing”",
    ex: [
      patEx("Before", "I read before going to sleep.", ["寝[ね]る{まえに}", "", "time"], ["本[ほん]", "を", "object"], ["読[よ]みます", "", "verb"]),
      patEx("Past sentence", "I washed my hands before eating.", ["食[た]べる{まえに}", "", "time"], ["手[て]", "を", "object"], ["洗[あら]いました", "", "verb"]),
    ],
    forms: [["V dict まえに", "before doing"], ["N のまえに", "before a noun: 食事のまえに"], ["time まえに", "ago: 3年まえに"]],
    tip: "Never the た-form here: 食べたまえに is wrong, even when you're talking about the past." }),
  patDef({ id: "to", lesson: 23, title: "〜と (whenever)", base: "dict", ending: "と", en: "whenever (I) {v}, …", avoid: ["te"],
    name: "Whenever · automatic result", meaning: "whenever · if… then always",
    caption: "Press the button, and it always happens",
    idea: "Dictionary form + と: when the first thing happens, the second follows automatically. It's for nature, machines, habits and directions.",
    lit: [["と", "when, then"]], result: "“when A, always B”",
    ex: [
      patEx("Machines", "If you press this button, water comes out.", ["このボタン", "を", "object"], ["押[お]す{と}", "", "with"], ["水[みず]", "が", "subject"], ["出[で]ます", "", "verb"]),
      patEx("Directions", "Go straight and you'll see the station.", ["まっすぐ", "", "verb"], ["行[い]く{と}", "", "with"], ["駅[えき]", "が", "subject"], ["あります", "", "verb"]),
    ],
    forms: [["V dict と", "whenever"], ["V ない と", "if you don't: 急がないと"], ["〜と、〜ます", "the result, stated as fact"]],
    tip: "The second half can't be a wish or request. “If it rains, please call” needs 〜たら, not 〜と." }),
  patDef({ id: "tsumori", lesson: 31, title: "〜つもりです", base: "dict", ending: "つもりです", en: "intend to {v}", avoid: ["ta"],
    name: "Plans you've decided on", meaning: "intend to · plan to",
    caption: "You've already made up your mind",
    idea: "Dictionary form + つもり (“intention”): you've decided on this. For a schedule that doesn't depend on you, use 予定 in the same slot.",
    lit: [["つもり", "intention"], ["です", "is"]], result: "“it's my intention to”",
    ex: [
      patEx("Intend to", "I plan to go back home next year.", ["来年[らいねん]", "", "time"], ["国[くに]", "へ", "dir"], ["帰[かえ]る{つもりです}", "", "verb"]),
      patEx("Intend not to", "I don't intend to go tomorrow.", ["明日[あした]", "は", "topic"], ["行[い]かない{つもりです}", "", "verb"]),
      patEx("Scheduled: 予定", "The meeting is scheduled to start at 3.", ["会議[かいぎ]", "は", "topic"], ["3時[さんじ]", "に", "point"], ["始[はじ]まる{予定[よてい]です}", "", "verb"]),
    ],
    forms: [["〜つもりです", "intend to"], ["〜ないつもりです", "intend not to"], ["V dict 予定です", "it's scheduled"], ["N の予定です", "with a noun: 出張の予定です"]],
    tip: "つもり is your own decision, and 予定 is the schedule. A train or a meeting can have a 予定, but not a つもり." }),
  patDef({ id: "youni", lesson: 36, title: "〜ように", base: "dict", ending: "ように", en: "so that (I) {v}", avoid: ["ta"],
    name: "So that", meaning: "so that · in order that",
    caption: "Do this, so that can happen",
    idea: "Dictionary form or ない-form + ように: the first half says the result you're aiming for. That part uses verbs you don't fully control, like potential forms or わかる.",
    lit: [["ように", "so that"]], result: "“so that it happens”",
    ex: [
      patEx("So that", "I practise so that I can speak Japanese.", ["日本語[にほんご]", "が", "subject"], ["話[はな]せる{ように}", "", "point"], ["練習[れんしゅう]します", "", "verb"]),
      patEx("So that not", "I'll write it down so I don't forget.", ["忘[わす]れない{ように}", "", "point"], ["メモします", "", "verb"]),
    ],
    forms: [["V dict ように", "so that"], ["V ない ように", "so that not"], ["V pot ように", "so that (I) can"]],
    tip: "ように is for results you can't simply decide (話せる, 忘れない). For a goal you just choose, use 〜ために." }),
  patDef({ id: "younaru", lesson: 36, title: "〜ようになる", base: "dict", ending: "ようになる", en: "come to {v}",
    name: "Coming to be able", meaning: "come to · reach the point of",
    caption: "Step by step, a change happens",
    idea: "Dictionary form or potential form + ようになる (“become like”): it marks a change, from not doing or not being able to, to doing it now.",
    lit: [["ように", "like"], ["なる", "become"]], result: "“become so that”",
    ex: [
      patEx("Now able", "I've become able to speak Japanese.", ["日本語[にほんご]", "が", "subject"], ["話[はな]せる{ようになりました}", "", "verb"]),
      patEx("A new habit", "I've started eating vegetables.", ["野菜[やさい]", "を", "object"], ["食[た]べる{ようになりました}", "", "verb"]),
    ],
    forms: [["〜ようになります", "will come to"], ["〜ようになりました", "has come to"], ["〜なくなりました", "no longer does"]],
    tip: "The opposite change uses なくなる: 食べなくなりました = I stopped eating it." }),
  patDef({ id: "younisuru", lesson: 36, title: "〜ようにする", base: "dict", ending: "ようにする", en: "make a point of {ing}",
    name: "Make a point of", meaning: "make an effort to · make a habit of",
    caption: "A tick every day",
    idea: "Dictionary form or ない-form + ようにする: you make the effort to do it. With している it's an ongoing habit, and with してください it's a request.",
    lit: [["ように", "so that"], ["する", "do"]], result: "“act so that”",
    ex: [
      patEx("A habit", "I make a point of walking every day.", ["毎日[まいにち]", "", "time"], ["歩[ある]く{ようにしています}", "", "verb"]),
      patEx("A request", "Please try not to be late.", ["遅[おく]れない{ようにしてください}", "", "verb"]),
    ],
    forms: [["〜ようにしています", "make a habit of"], ["〜ようにします", "will try to"], ["〜ようにしてください", "please make sure to"], ["〜ないようにする", "try not to"]],
    tip: "Compare the pair: ようになる is a change that happens to you, and ようにする is an effort you make." }),
  patDef({ id: "tame", lesson: 42, title: "〜ために", base: "dict", ending: "ために", en: "in order to {v}", avoid: ["ta"],
    name: "Purpose", meaning: "in order to · for the sake of",
    caption: "Everything aims at the goal",
    idea: "Dictionary form + ために: a goal you've chosen for yourself. It takes verbs you control. 〜のに is a close relative that says what a tool or thing is used for.",
    lit: [["ため", "purpose"], ["に", "for"]], result: "“for the purpose of”",
    ex: [
      patEx("A goal", "I'm saving up to buy a house.", ["家[いえ]", "を", "object"], ["買[か]う{ために}", "", "point"], ["貯金[ちょきん]しています", "", "verb"]),
      patEx("Used for: のに", "These scissors are for cutting flowers.", ["はさみ", "は", "topic"], ["花[はな]", "を", "object"], ["切[き]る{のに}", "", "point"], ["使[つか]います", "", "verb"]),
    ],
    forms: [["V dict ために", "in order to"], ["N のために", "for: 家族のために"], ["V dict のに使います", "is used for doing"], ["V dict のにいいです", "is good for doing"]],
    tip: "ために takes a verb you control (買う), and ように takes one you don't (買える)." }),
  patDef({ id: "nominal", lesson: 38, title: "〜のが好[す]き", base: "dict", ending: "のが好[す]きです", en: "like {ing}", avoid: ["ta"],
    name: "Turning a verb into a noun", meaning: "like doing · doing is…",
    caption: "Put a verb in a box, and it acts like a noun",
    idea: "The plain form + の packs the verb up as a noun, so it can take は, が or を. Then 好き, 上手 or 忘れました can talk about it.",
    lit: [["の", "(the) doing"], ["が", ""], ["好[す]きです", "like"]], result: "“doing is liked”",
    ex: [
      patEx("のが", "I like growing flowers.", ["花[はな]", "を", "object"], ["育[そだ]てる{のが好[す]きです}", "", "verb"]),
      patEx("のは", "Drawing pictures is fun.", ["絵[え]", "を", "object"], ["描[か]く{のは}", "", "topic"], ["楽[たの]しいです", "", "verb"]),
      patEx("のを", "I forgot to lock the door.", ["鍵[かぎ]", "を", "object"], ["かける{のを}", "", "object"], ["忘[わす]れました", "", "verb"]),
    ],
    forms: [["〜のが好きです", "like doing"], ["〜のが上手です", "good at doing"], ["〜のは楽しいです", "doing is fun"], ["〜のを忘れました", "forgot to do"]],
    tip: "の and こと often swap, but only こと works in ことができる and 趣味は〜ことです." }),
  patDef({ id: "tokoro", lesson: 46, title: "〜ところです", base: "dict", ending: "ところです", en: "just about to {v}", avoid: ["ta"],
    name: "A point in the action", meaning: "about to · in the middle of · just did",
    caption: "Three points on one action",
    idea: "ところ (“place”) points to a moment in an action. The verb form picks the moment: dictionary form (about to), ている (in the middle), or た-form (just finished).",
    lit: [["ところ", "point"], ["です", "is"]], result: "“at the point of doing”",
    ex: [
      patEx("About to", "I'm just about to eat.", ["今[いま]から", "", "time"], ["食[た]べる{ところです}", "", "verb"]),
      patEx("In the middle", "I'm looking into it right now.", ["今[いま]", "", "time"], ["調[しら]べている{ところです}", "", "verb"]),
      patEx("Just did", "I've just finished eating.", ["今[いま]", "", "time"], ["食[た]べた{ところです}", "", "verb"]),
    ],
    forms: [["V dict ところです", "about to"], ["V ている ところです", "in the middle of"], ["V た ところです", "just did"]],
    tip: "た-ところ means seconds ago. For “recently”, in the way the speaker feels it, use 〜たばかり." }),

  // ---------------------------------------------------------------- た-form
  patDef({ id: "takoto", lesson: 19, title: "〜たことがある", base: "ta", ending: "ことがある", en: "have {pp} before",
    name: "Experience", meaning: "have done (before)",
    caption: "One dot somewhere in your past",
    idea: "た-form + こと (“the fact of”) + がある (“exists”): the experience exists in your life. It's for things worth mentioning, not what you did this morning.",
    lit: [["こと", "experience"], ["が", ""], ["ある", "exists"]], result: "“the experience exists”",
    ex: [
      patEx("Have done", "I've climbed Mt. Fuji.", ["富士山[ふじさん]", "に", "point"], ["登[のぼ]った{ことがあります}", "", "verb"]),
      patEx("Have never", "I've never eaten sushi.", ["寿司[すし]", "を", "object"], ["食[た]べた{ことがありません}", "", "verb"]),
    ],
    forms: [["〜たことがあります", "have done"], ["〜たことがありません", "have never done"], ["〜たことがありますか", "have you ever…?"]],
    tip: "The た matters: 食べたことがある = I've eaten it before, 食べることがある = I sometimes eat it." }),
  patDef({ id: "tari", lesson: 19, title: "〜たり〜たりする", base: "ta", ending: "りする", en: "do things like {ing}",
    name: "Things like A and B", meaning: "do things like A and B",
    caption: "A sample from a longer list",
    idea: "Take the た-form and add り. Line up a few of them and finish with する. It says these are examples, and there's more where they came from.",
    lit: [["り", "(among others)"], ["する", "do"]], result: "“do things like”",
    ex: [
      patEx("Examples", "On Sundays I do things like clean and shop.", ["日曜日[にちようび]", "は", "topic"], ["掃除[そうじ]し{たり}", "", "with"], ["買[か]い物[もの]し{たりします}", "", "verb"]),
      patEx("Back and forth", "It rains on and off.", ["雨[あめ]", "が", "subject"], ["降[ふ]っ{たり}", "", "with"], ["止[や]ん{だりします}", "", "verb"]),
    ],
    forms: [["A たり B たりします", "do things like A and B"], ["A たり B たりしました", "did things like A and B"], ["A たり B たりしてはいけません", "mustn't do things like A or B"]],
    tip: "Tense goes on the final する only: 食べたり飲んだりしました. The たり parts never change." }),
  patDef({ id: "tara", lesson: 25, title: "〜たら", base: "ta", ending: "ら", en: "if (I) {v} · once (I) {v}",
    name: "If · once", meaning: "if · when · once",
    caption: "The road splits at “if”",
    idea: "た-form + ら. It's the most flexible way to say “if”, and it also means “once this has happened, then…”.",
    lit: [["ら", "if, once"]], result: "“if / once done”",
    ex: [
      patEx("If", "If it rains, I won't go.", ["雨[あめ]", "が", "subject"], ["降[ふ]っ{たら}", "", "range"], ["行[い]きません", "", "verb"]),
      patEx("Once", "Call me once you get to the station.", ["駅[えき]", "に", "point"], ["着[つ]い{たら}", "", "time"], ["電話[でんわ]してください", "", "verb"]),
      patEx("What should I…?", "Where should I buy it?", ["どこ", "で", "place"], ["買[か]っ{たらいいですか}", "", "verb"]),
    ],
    forms: [["〜たら", "if · once"], ["〜なかったら", "if not"], ["い-adj かったら / N だったら", "with adjectives and nouns"], ["〜たらいいですか", "what should I do?"]],
    tip: "Unlike 〜と, the second half of 〜たら can be a request, a wish or a plan. That makes it the safest “if” to reach for." }),
  patDef({ id: "hou", lesson: 32, title: "〜ほうがいい", base: "ta", ending: "ほうがいい", en: "had better {v}", avoid: ["dict"],
    name: "Advice", meaning: "you'd better · should",
    caption: "Two paths, and one is better",
    idea: "た-form + ほう (“side”) + がいい: of the two options, doing it is the better side. For “you'd better not”, use the ない-form: ないほうがいい.",
    lit: [["ほう", "side"], ["が", ""], ["いい", "good"]], result: "“that side is good”",
    ex: [
      patEx("You'd better", "You should see a doctor.", ["病院[びょういん]", "へ", "dir"], ["行[い]った{ほうがいいです}", "", "verb"]),
      patEx("You'd better not", "You'd better not drink too much.", ["お酒[さけ]", "を", "object"], ["飲[の]みすぎない{ほうがいいです}", "", "verb"]),
    ],
    forms: [["V た ほうがいいです", "you'd better"], ["V ない ほうがいいです", "you'd better not"], ["〜ほうがいいですよ", "friendly advice"]],
    tip: "Notice the mismatch: do it uses た (行ったほうがいい), but don't uses ない (行かないほうがいい), not なかった." }),
  patDef({ id: "ato", lesson: 34, title: "〜あとで", base: "ta", ending: "あとで", en: "after {ing}",
    name: "After doing", meaning: "after doing · later",
    caption: "First this, then that",
    idea: "た-form + あと (“after”) + で: the second action happens some time after the first. It doesn't stress the order the way 〜てから does.",
    lit: [["あと", "after"], ["で", "at"]], result: "“after having done”",
    ex: [
      patEx("After", "I'll take a walk after dinner.", ["晩[ばん]ご飯[はん]", "を", "object"], ["食[た]べた{あとで}", "", "time"], ["散歩[さんぽ]します", "", "verb"]),
      patEx("After a noun", "I'll go for a drink after work.", ["仕事[しごと]{のあとで}", "", "time"], ["飲[の]み", "に", "point"], ["行[い]きます", "", "verb"]),
    ],
    forms: [["V た あとで", "after doing"], ["N のあとで", "after a noun"], ["あとで", "on its own: later"]],
    tip: "It's the mirror of 〜まえに: あと takes た-form, because the action is already done, and まえ takes the dictionary form." }),
  patDef({ id: "bakari", lesson: 46, title: "〜たばかりです", base: "ta", ending: "ばかりです", en: "have only just {pp}", avoid: ["dict", "te"],
    name: "Only just", meaning: "have only just done",
    caption: "It still feels very recent",
    idea: "た-form + ばかり. It's about how recent it feels to you, so it can stretch: “I only just came to Japan” could mean months ago.",
    lit: [["ばかり", "only just"], ["です", "is"]], result: "“only just did”",
    ex: [
      patEx("Only just", "I've only just come to Japan.", ["日本[にほん]", "に", "point"], ["来[き]た{ばかりです}", "", "verb"]),
      patEx("Only just", "I only just bought this bag.", ["このかばん", "は", "topic"], ["買[か]った{ばかりです}", "", "verb"]),
    ],
    forms: [["〜たばかりです", "have only just"], ["〜たばかりの N", "before a noun: 買ったばかりの車"], ["〜たところです", "just this second"]],
    tip: "たところ is seconds ago by the clock, and たばかり is how recent it feels. A month ago can still be たばかり." }),

  // ---------------------------------------------------------------- Plain form
  patDef({ id: "omou", lesson: 21, title: "〜と思[おも]う", base: "plain", ending: "と思[おも]う", en: "I think (someone will) {v}",
    name: "I think · someone said", meaning: "I think that… · said that…",
    caption: "A thought with と around it",
    idea: "Plain form + と (the “quote” marker) + 思う. と wraps up the thought. Swap in 言う and it reports what someone said.",
    lit: [["と", "(quote)"], ["思[おも]う", "think"]], result: "“think that”",
    ex: [
      patEx("I think", "I think it will rain tomorrow.", ["明日[あした]", "", "time"], ["雨[あめ]", "が", "subject"], ["降[ふ]る{と思[おも]います}", "", "verb"]),
      patEx("Someone said", "Tanaka said they'd be late.", ["田中[たなか]さん", "は", "topic"], ["遅[おく]れる{と言[い]っていました}", "", "verb"]),
    ],
    forms: [["〜と思います", "I think"], ["〜ないと思います", "I don't think"], ["〜と言いました", "said that"], ["〜と言っていました", "said (passing on a message)"]],
    tip: "“I don't think they'll come” goes on the inside: 来ないと思います, not 来ると思いません." }),
  patDef({ id: "nda", lesson: 26, title: "〜んです", base: "plain", ending: "んです", en: "(the thing is,) I {v}", avoid: ["nai"],
    name: "Explaining", meaning: "the thing is… · explaining",
    caption: "Filling in the story behind it",
    idea: "Plain form + んです adds the background: it explains something, or asks for the story. Use it with どうして, or when something you saw makes you curious.",
    lit: [["ん", "(the reason)"], ["です", "is"]], result: "“it's that…”",
    ex: [
      patEx("Asking", "Why were you late?", ["どうして", "", "verb"], ["遅[おく]れた{んですか}", "", "verb"]),
      patEx("Explaining", "My head hurts, you see.", ["頭[あたま]", "が", "subject"], ["痛[いた]い{んです}", "", "verb"]),
    ],
    forms: [["〜んです", "the thing is"], ["〜んですか", "is it that…?"], ["〜んですが", "the thing is… (opening a request)"], ["〜の？", "casual question"]],
    tip: "Don't use it for simple facts. 学生ですか is just asking, while 学生なんですか sounds surprised and wants the story." }),
  patDef({ id: "deshou", lesson: 32, title: "〜でしょう", base: "plain", ending: "でしょう", en: "will probably {v}",
    name: "Probably", meaning: "probably · …, right?",
    caption: "Pretty sure, not certain",
    idea: "Plain form + でしょう: a confident guess, often heard in weather forecasts. With a rising tone it checks with the listener: “right?”",
    lit: [["でしょう", "probably"]], result: "“will probably”",
    ex: [
      patEx("Probably", "It will probably be sunny tomorrow.", ["明日[あした]", "は", "topic"], ["晴[は]れる{でしょう}", "", "verb"]),
      patEx("Right?", "You're going to the party, right?", ["パーティー", "に", "point"], ["行[い]く{でしょう}", "", "verb"]),
    ],
    forms: [["〜でしょう", "probably"], ["〜でしょう？", "…, right?"], ["〜でしょうか", "I wonder · would it be…? (polite)"], ["〜だろう", "plain version"]],
    tip: "On the scale of certainty: 〜はずです is the surest, then 〜でしょう, then 〜かもしれません." }),
  patDef({ id: "kamo", lesson: 32, title: "〜かもしれない", base: "plain", ending: "かもしれない", en: "might {v}",
    name: "Maybe", meaning: "might · maybe",
    caption: "Could go either way",
    idea: "Plain form + かもしれない: it's possible, but you wouldn't bet on it.",
    lit: [["か", "whether"], ["も", "even"], ["しれない", "can't know"]], result: "“can't even know”",
    ex: [
      patEx("Might", "It might rain this afternoon.", ["午後[ごご]", "", "time"], ["雨[あめ]", "が", "subject"], ["降[ふ]る{かもしれません}", "", "verb"]),
      patEx("Might not", "I might not make it in time.", ["間[ま]に合[あ]わない{かもしれません}", "", "verb"]),
    ],
    forms: [["〜かもしれません", "might (polite)"], ["〜かもしれない", "might (plain)"], ["〜かも", "casual: maybe"]],
    tip: "With nouns and な-adjectives, there's no だ: 雨かもしれません, not 雨だかもしれません." }),
  patDef({ id: "node", lesson: 39, title: "〜ので", base: "plain", ending: "ので", en: "because (I) {v}",
    name: "Because (soft)", meaning: "because · so",
    caption: "A gentle reason, then the result",
    idea: "Plain form + ので gives a reason in a softer, more objective way than から. It's the one to use when excusing yourself or asking a favour.",
    lit: [["ので", "because"]], result: "“since…”",
    ex: [
      patEx("Soft reason", "I have an errand, so I'll leave early.", ["用事[ようじ]", "が", "subject"], ["ある{ので}", "", "range"], ["早[はや]く", "", "time"], ["帰[かえ]ります", "", "verb"]),
      patEx("Polite reason", "I don't understand, so please teach me.", ["わからない{ので}", "", "range"], ["教[おし]えてください", "", "verb"]),
    ],
    forms: [["V plain ので", "because"], ["N / な-adj なので", "with nouns: 雨なので"], ["〜から", "because (more direct)"]],
    tip: "Nouns and な-adjectives take な here, not だ: 休みなので, 静かなので." }),
  patDef({ id: "noni", lesson: 45, title: "〜のに", base: "plain", ending: "のに", en: "even though (I) {v}",
    name: "Even though", meaning: "even though · despite",
    caption: "You expected this, and got that",
    idea: "Plain form + のに: the second half isn't what the first half should have led to, and you're surprised, or a bit annoyed about it.",
    lit: [["のに", "even though"]], result: "“even though…”",
    ex: [
      patEx("Unexpected", "Even though we'd agreed, they didn't come.", ["約束[やくそく]した{のに}", "", "range"], ["来[き]ませんでした", "", "verb"]),
      patEx("Unexpected", "Even though it's Sunday, I'm working.", ["日曜日[にちようび]な{のに}", "", "range"], ["働[はたら]いています", "", "verb"]),
    ],
    forms: [["V plain のに", "even though"], ["N / な-adj なのに", "with nouns: 休みなのに"], ["〜が / 〜けれど", "but (no surprise)"]],
    tip: "It has a feeling to it. For a neutral “but”, use 〜が or 〜けど. And this isn't the “used for” のに from 〜のに使います." }),
  patDef({ id: "hazu", lesson: 46, title: "〜はずです", base: "plain", ending: "はずです", en: "should {v} (I expect)",
    name: "Should be", meaning: "should · is expected to",
    caption: "You have good reason to expect it",
    idea: "Plain form + はず: based on the facts you have, this should be true. It's a logical expectation, not advice.",
    lit: [["はず", "expectation"], ["です", "is"]], result: "“it's expected that”",
    ex: [
      patEx("Should", "The package should arrive tomorrow.", ["荷物[にもつ]", "は", "topic"], ["明日[あした]", "", "time"], ["届[とど]く{はずです}", "", "verb"]),
      patEx("Should not", "Tanaka shouldn't be coming today.", ["田中[たなか]さん", "は", "topic"], ["今日[きょう]", "", "time"], ["来[こ]ない{はずです}", "", "verb"]),
    ],
    forms: [["〜はずです", "should"], ["〜ないはずです", "should not"], ["〜はずがありません", "there's no way that…"]],
    tip: "はず is what you expect, not what someone ought to do. For advice, use 〜ほうがいい." }),
  patDef({ id: "souhear", lesson: 47, title: "〜そうです (I hear)", base: "plain", ending: "そうです", en: "I hear (someone will) {v}",
    name: "Hearsay", meaning: "I hear that · apparently",
    caption: "It reached you from someone else",
    idea: "Plain form + そうです passes on what you heard or read. It looks like the “looks like” そうです, but it attaches to a different form.",
    lit: [["そうです", "I hear"]], result: "“I hear that”",
    ex: [
      patEx("I hear", "I hear it'll rain tomorrow.", ["明日[あした]", "は", "topic"], ["雨[あめ]", "が", "subject"], ["降[ふ]る{そうです}", "", "verb"]),
      patEx("With a source", "According to Tanaka, the test is on Friday.", ["田中[たなか]さんによると", "", "with"], ["テスト", "は", "topic"], ["金曜日[きんようび]だ{そうです}", "", "verb"]),
    ],
    forms: [["V plain そうです", "I hear"], ["〜によると、〜そうです", "according to…"], ["N だそうです", "with a noun, keep だ"]],
    tip: "This one doesn't change: there's no そうでした or そうではありません. The grammar goes in the part before it." }),
  patDef({ id: "youdesu", lesson: 47, title: "〜ようです", base: "plain", ending: "ようです", en: "it seems (someone will) {v}",
    name: "It seems", meaning: "it seems · looks as if",
    caption: "Working it out from clues",
    idea: "Plain form + ようです: you're drawing a conclusion from what you noticed, like a detective with evidence.",
    lit: [["よう", "appearance"], ["です", "is"]], result: "“it appears that”",
    ex: [
      patEx("From clues", "It seems nobody's here.", ["誰[だれ]", "も", "also"], ["いない{ようです}", "", "verb"]),
      patEx("From clues", "It seems there's been an accident.", ["事故[じこ]", "が", "subject"], ["あった{ようです}", "", "verb"]),
    ],
    forms: [["V plain ようです", "it seems"], ["N のようです", "with a noun: 雨のようです"], ["な-adj なようです", "with な-adj: 暇なようです"], ["〜みたいです", "casual"]],
    tip: "Three to compare: そう (looks like, from your eyes), よう (seems, from clues), そう (I hear, from others)." }),

  // ---------------------------------------------------------------- Volitional form
  patDef({ id: "volomou", lesson: 31, title: "〜(よ)うと思[おも]う", base: "vol", ending: "と思[おも]っています", en: "I'm thinking of {ing}",
    name: "Thinking of doing", meaning: "I'm thinking of doing",
    caption: "A plan still forming in your head",
    idea: "The volitional form is what you'd say to yourself (“let's go”). Add と思っています and you're telling someone about that plan.",
    lit: [["と", "(quote)"], ["思[おも]っています", "am thinking"]], result: "“am thinking ‘let's do’”",
    ex: [
      patEx("Thinking of", "I'm thinking of working in Japan.", ["日本[にほん]", "で", "place"], ["働[はたら]こう{と思[おも]っています}", "", "verb"]),
      patEx("Thinking of", "I'm thinking of buying a car next year.", ["来年[らいねん]", "", "time"], ["車[くるま]", "を", "object"], ["買[か]おう{と思[おも]っています}", "", "verb"]),
    ],
    forms: [["〜(よ)うと思っています", "have been thinking of"], ["〜(よ)うと思います", "I think I'll"], ["V dict つもりです", "intend to (more decided)"]],
    tip: "Keep the verb forms apart: 行こうと思う = I'm thinking of going, 行くと思う = I think (someone) will go." }),
];

// What goes between a noun (n) or な-adjective (na) and each plain-form pattern. "" means nothing does.
const PLAIN_JOIN = {
  omou: { n: "だ", na: "だ" }, nda: { n: "な", na: "な" }, deshou: { n: "", na: "" }, kamo: { n: "", na: "" }, node: { n: "な", na: "な" },
  noni: { n: "な", na: "な" }, hazu: { n: "の", na: "な" }, souhear: { n: "だ", na: "だ" }, youdesu: { n: "の", na: "な" },
};
VERB_PATTERNS.forEach((p) => { p.color = PATTERN_GROUPS.find((g) => g.id === patGroupOf(p)).color; });

// Drawings for the patterns. Each one shares the 220 × 115 canvas.
const PATTERN_SVG = (() => {
  const tx = (x, y, s, anchor = "middle") => `<text x="${x}" y="${y}" text-anchor="${anchor}" class="t">${s}</text>`;
  const ar = (x1, y1, x2, y2, dashed) => {
    const a = Math.atan2(y2 - y1, x2 - x1), h = 10;
    const wing = (d) => `${x2 - h * Math.cos(a + d)},${y2 - h * Math.sin(a + d)}`;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="3" stroke-linecap="round"${dashed ? ' stroke-dasharray="5 6"' : ""}/>
      <polyline points="${wing(0.5)} ${x2},${y2} ${wing(-0.5)}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  const ok = (x, y, r = 14) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor"/>
      <polyline points="${x - r * 0.5},${y} ${x - r * 0.1},${y + r * 0.4} ${x + r * 0.5},${y - r * 0.4}" fill="none" class="s-surface" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  const no = (x, y, r = 9) => `<g class="s-mute" stroke-width="4" stroke-linecap="round"><line x1="${x - r}" y1="${y - r}" x2="${x + r}" y2="${y + r}"/><line x1="${x + r}" y1="${y - r}" x2="${x - r}" y2="${y + r}"/></g>`;
  const who = (x, y, label, on) => `<circle cx="${x}" cy="${y}" r="15" ${on ? 'fill="currentColor"' : 'class="f-mute" opacity=".6"'}/>${label ? tx(x, y + 34, label) : ""}`;
  const block = (x, y, w, h, label, on = true) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="currentColor"${on ? "" : ' fill-opacity=".18" stroke="currentColor" stroke-width="2"'}/>${label ? `<text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" class="${on ? "t-inv" : "t"}">${label}</text>` : ""}`;
  const bubble = (x, y, rx, ry, label) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="3"/>${label ? tx(x, y + 4, label) : ""}`;
  const timeline = (y, nowX) => `<line x1="10" y1="${y}" x2="210" y2="${y}" class="s-mute" stroke-width="2"/>${nowX ? `<line x1="${nowX}" y1="${y - 26}" x2="${nowX}" y2="${y + 12}" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>${tx(nowX, y + 28, "now")}` : ""}`;
  const meter = (pct, label) => `<rect x="20" y="38" width="180" height="22" rx="11" class="f-mute" opacity=".25"/><rect x="20" y="38" width="${1.8 * pct}" height="22" rx="11" fill="currentColor"/>${tx(20, 28, "how sure", "start")}${tx(110, 88, label)}`;
  const fork = (topY, botY) => `<circle cx="22" cy="58" r="7" fill="currentColor"/>
      <path d="M29 58 C70 58 80 ${topY} 128 ${topY}" fill="none" class="s-mute" stroke-width="3" stroke-dasharray="6 6"/>
      <path d="M29 58 C70 58 80 ${botY} 128 ${botY}" fill="none" stroke="currentColor" stroke-width="4"/>`;
  const thought = (label) => who(32, 74, "") + `<circle cx="58" cy="50" r="4" fill="currentColor" opacity=".6"/>` + bubble(134, 38, 66, 30, label);

  return {
    teiru: `<text x="10" y="18" class="t">action in progress</text>
       <line x1="10" y1="36" x2="210" y2="36" class="s-mute" stroke-width="2"/>
       <rect x="40" y="28" width="150" height="16" rx="8" fill="currentColor" opacity=".3"/>
       <rect x="40" y="28" width="90" height="16" rx="8" fill="currentColor"/>
       <text x="10" y="70" class="t">result that stays</text>
       <line x1="10" y1="88" x2="210" y2="88" class="s-mute" stroke-width="2"/>
       <rect x="50" y="83" width="160" height="10" rx="5" fill="currentColor" opacity=".3"/>
       <circle cx="50" cy="88" r="8" fill="currentColor"/>
       <line x1="130" y1="22" x2="130" y2="100" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
       <text x="130" y="112" text-anchor="middle" class="t">now</text>`,
  tai: `<circle cx="45" cy="62" r="14" class="f-mute" opacity=".6"/>
       <path d="M22 104 q23 -34 46 0z" class="f-mute" opacity=".6"/>
       <circle cx="72" cy="46" r="4" fill="currentColor" opacity=".5"/>
       <circle cx="86" cy="35" r="6" fill="currentColor" opacity=".65"/>
       <ellipse cx="150" cy="40" rx="58" ry="32" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="3"/>
       <path d="M150 60 C122 42 130 20 150 32 C170 20 178 42 150 60Z" fill="currentColor"/>
       <text x="150" y="96" text-anchor="middle" class="t">I want to…</text>`,
  kudasai: `<circle cx="36" cy="58" r="16" class="f-mute" opacity=".6"/>
       <text x="36" y="94" text-anchor="middle" class="t">me</text>
       <circle cx="184" cy="58" r="16" fill="currentColor"/>
       <text x="184" y="94" text-anchor="middle" class="t">you</text>
       <rect x="62" y="14" width="96" height="26" rx="13" fill="currentColor" fill-opacity=".15" stroke="currentColor" stroke-width="2"/>
       <text x="110" y="31" text-anchor="middle" class="t">please do it</text>
       <line x1="58" y1="62" x2="156" y2="62" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
       <polyline points="146,52 158,62 146,72" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  temoii: `<line x1="16" y1="60" x2="166" y2="60" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 10"/>
       <rect x="96" y="22" width="8" height="70" rx="3" class="f-mute"/>
       <rect x="136" y="22" width="8" height="70" rx="3" class="f-mute"/>
       <path d="M104 28 L78 16 L78 82 L104 88Z" fill="currentColor" fill-opacity=".15" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
       <circle cx="190" cy="60" r="18" fill="currentColor"/>
       <polyline points="181,60 188,67 200,53" fill="none" class="s-surface" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
       <text x="120" y="110" text-anchor="middle" class="t">the way is open</text>`,
  nakereba: `<circle cx="22" cy="58" r="7" fill="currentColor"/>
       <path d="M29 58 C70 58 80 22 128 22" fill="none" class="s-mute" stroke-width="3" stroke-dasharray="6 6"/>
       <path d="M29 58 C70 58 80 92 128 92" fill="none" stroke="currentColor" stroke-width="4"/>
       <g class="s-mute" stroke-width="4" stroke-linecap="round"><line x1="138" y1="13" x2="156" y2="31"/><line x1="156" y1="13" x2="138" y2="31"/></g>
       <text x="164" y="27" class="t">don't = ✗</text>
       <circle cx="147" cy="92" r="12" fill="currentColor"/>
       <polyline points="141,92 146,97 154,87" fill="none" class="s-surface" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
       <text x="164" y="97" class="t">do = ✓</text>`,
    mashou: who(45, 45, "you") + who(175, 45, "me") + ar(66, 45, 94, 45) + ar(154, 45, 126, 45) + `<circle cx="110" cy="45" r="10" fill="currentColor"/>` + tx(110, 100, "together"),
    niiku: who(28, 48, "me", true) + ar(50, 48, 112, 48) + block(120, 22, 88, 52, "to do…", false),
    nagara: tx(30, 22, "side action", "start") + block(30, 28, 160, 16) + tx(30, 66, "main action", "start") + block(30, 72, 160, 16),
    soulook: `<path d="M12 50 Q45 16 78 50 Q45 84 12 50Z" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="3"/><circle cx="45" cy="50" r="10" fill="currentColor"/>` + ar(90, 50, 134, 50, true) + `<path d="M170 22 C186 46 192 56 170 72 C148 56 154 46 170 22Z" fill="currentColor" fill-opacity=".3" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>` + tx(110, 100, "about to happen"),
    sugiru: tx(140, 22, "the limit") + block(16, 38, 188, 24) + `<line x1="140" y1="38" x2="140" y2="62" class="s-surface" stroke-width="3"/><line x1="140" y1="28" x2="140" y2="38" class="s-mute" stroke-width="3"/>` + tx(172, 84, "too much") + tx(78, 84, "fine"),
    yasui: `<line x1="14" y1="86" x2="100" y2="64" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="64" r="7" fill="currentColor"/>` + tx(57, 106, "やすい") + `<line x1="124" y1="86" x2="196" y2="16" class="s-mute" stroke-width="5" stroke-linecap="round"/><circle cx="196" cy="16" r="7" class="f-mute"/>` + tx(160, 106, "にくい"),
    tehaikenai: `<line x1="14" y1="58" x2="96" y2="58" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 10"/><rect x="100" y="20" width="8" height="74" rx="3" class="f-mute"/><rect x="146" y="20" width="8" height="74" rx="3" class="f-mute"/><rect x="108" y="30" width="38" height="54" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="3"/>` + no(127, 57, 11) + tx(127, 110, "the way is shut"),
    tekara: block(14, 32, 76, 38, "A") + ar(98, 51, 126, 51) + block(134, 32, 76, 38, "B", false) + tx(110, 96, "A has to come first"),
    teageru: who(35, 50, "me", true) + who(185, 50, "them") + ar(58, 50, 162, 50) + tx(110, 36, "I give the favour"),
    temorau: who(35, 50, "me", true) + who(185, 50, "them") + ar(162, 50, 58, 50) + tx(110, 36, "I receive it"),
    tekureru: who(35, 50, "me") + who(185, 50, "them", true) + ar(162, 50, 58, 50) + tx(110, 36, "they give it to me"),
    temo: `<line x1="10" y1="78" x2="172" y2="78" class="s-mute" stroke-width="3"/>` + block(78, 56, 26, 22, "", false) + `<path d="M46 78 C66 20 116 20 136 72" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>` + ok(192, 72) + tx(91, 104, "even if…"),
    teshimau: block(14, 36, 150, 22) + `<circle cx="190" cy="47" r="18" fill="currentColor"/><text x="190" y="53" text-anchor="middle" class="t-inv">!</text>` + tx(14, 26, "all the way to the end", "start") + tx(110, 88, "…and that's that"),
    tearu: `<rect x="96" y="10" width="112" height="82" rx="6" class="f-mute" opacity=".18"/>` + block(124, 24, 56, 42) + `<circle cx="34" cy="50" r="15" fill="none" class="s-mute" stroke-width="2" stroke-dasharray="4 4"/>` + tx(34, 84, "(did it)") + tx(152, 110, "still there"),
    teoku: timeline(60, 92) + ok(46, 60, 13) + block(150, 44, 54, 32, "later", false) + tx(46, 36, "ready"),
    temiru: who(30, 50, "me", true) + ar(52, 50, 130, 50, true) + `<circle cx="168" cy="50" r="24" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="3"/>` + tx(168, 55, "?") + tx(150, 100, "try and see"),
    tekuru: `<circle cx="34" cy="58" r="14" fill="currentColor"/><path d="M48 50 C90 14 150 14 180 44" fill="none" stroke="currentColor" stroke-width="3"/><path d="M180 72 C150 104 90 104 52 72" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="6 6"/>` + block(160, 46, 46, 24, "do") + ar(62, 80, 50, 70),
    naide: `<circle cx="110" cy="48" r="34" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="6"/><line x1="86" y1="24" x2="134" y2="72" stroke="currentColor" stroke-width="6"/>` + tx(110, 106, "please don't"),
    nakutemo: fork(24, 92) + `<path d="M29 58 C70 58 80 24 128 24" fill="none" stroke="currentColor" stroke-width="4"/>` + ok(147, 24, 12) + ok(147, 92, 12) + tx(164, 29, "do", "start") + tx(164, 97, "don't", "start"),
    koto: who(40, 48, "me", true) + ar(62, 48, 124, 48) + ok(156, 48, 22) + tx(156, 92, "possible"),
    mae: block(14, 32, 76, 38, "A") + ar(98, 51, 126, 51) + block(134, 32, 76, 38, "B", false) + tx(110, 96, "before doing B, A"),
    to: `<circle cx="36" cy="48" r="22" fill="currentColor"/><circle cx="36" cy="48" r="11" class="f-surface"/>` + ar(66, 48, 130, 48) + ok(166, 48, 20) + tx(110, 98, "A → B, every time"),
    tsumori: who(32, 74, "") + `<circle cx="58" cy="50" r="4" fill="currentColor" opacity=".6"/>` + bubble(134, 40, 66, 32) + `<line x1="122" y1="60" x2="122" y2="20" stroke="currentColor" stroke-width="3"/><path d="M122 20 L156 30 L122 40Z" fill="currentColor"/>` + tx(134, 96, "decided"),
    youni: who(30, 50, "me", true) + ar(52, 50, 124, 50) + `<circle cx="166" cy="50" r="28" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="6 6"/>` + tx(166, 55, "result"),
    younaru: `<path d="M14 94 H66 V70 H118 V46 H170 V22 H206" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>` + no(34, 72, 8) + ok(188, 44, 12) + tx(120, 110, "little by little"),
    younisuru: [30, 70, 110, 150, 190].map((x) => ok(x, 44, 14)).join("") + tx(110, 88, "every time, on purpose"),
    tame: [34, 22, 10].map((r, i) => `<circle cx="160" cy="52" r="${r}" ${i === 2 ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="3"'}/>`).join("") + ar(30, 52, 148, 52) + tx(70, 100, "the goal"),
    nominal: block(12, 32, 58, 38, "verb", false) + tx(88, 44, "の") + ar(76, 51, 136, 51) + block(142, 32, 66, 38, "noun") + tx(110, 98, "now it can take は が を"),
    tokoro: timeline(62) + `<circle cx="50" cy="62" r="7" fill="currentColor"/><circle cx="110" cy="62" r="7" fill="currentColor"/><circle cx="170" cy="62" r="7" fill="currentColor"/>` + tx(50, 40, "about to") + tx(110, 40, "middle") + tx(170, 40, "just did"),
    takoto: timeline(60, 170) + `<circle cx="60" cy="60" r="10" fill="currentColor"/>` + tx(60, 40, "once, back then"),
    tari: block(14, 24, 60, 30, "A") + block(84, 24, 60, 30, "B") + `<circle cx="162" cy="39" r="4" class="f-mute"/><circle cx="178" cy="39" r="4" class="f-mute"/><circle cx="194" cy="39" r="4" class="f-mute"/>` + tx(110, 86, "and other things like that"),
    tara: fork(24, 92) + tx(22, 42, "if") + tx(138, 29, "otherwise", "start") + block(134, 74, 72, 30, "then B"),
    hou: fork(24, 92) + no(147, 24) + ok(147, 92, 12) + tx(164, 97, "better", "start"),
    ato: block(14, 32, 76, 38, "A", false) + ar(98, 51, 126, 51) + block(134, 32, 76, 38, "B") + tx(110, 96, "after A is done, B"),
    bakari: timeline(60, 150) + `<circle cx="132" cy="60" r="10" fill="currentColor"/>` + tx(110, 26, "only just happened"),
    omou: thought("“…” と"),
    nda: `<circle cx="42" cy="48" r="24" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="3"/>` + tx(42, 53, "?") + ar(72, 48, 104, 48) + bubble(158, 48, 50, 28, "because…"),
    deshou: meter(80, "pretty sure"),
    kamo: meter(45, "could go either way"),
    node: block(12, 32, 74, 38, "reason", false) + ar(94, 51, 128, 51, true) + block(136, 32, 72, 38, "result") + tx(110, 96, "a gentle link"),
    noni: fork(24, 92) + no(147, 92) + tx(134, 29, "expected", "start") + tx(162, 97, "actual", "start"),
    hazu: meter(90, "the facts point this way"),
    souhear: who(35, 50, "them") + who(185, 50, "me", true) + ar(58, 50, 162, 50) + tx(110, 36, "I heard…"),
    youdesu: `<circle cx="96" cy="44" r="26" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="4"/><line x1="115" y1="63" x2="142" y2="90" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><circle cx="86" cy="38" r="4" fill="currentColor"/><circle cx="104" cy="50" r="4" fill="currentColor"/>` + tx(110, 110, "from the clues…"),
    volomou: thought("“let's…”"),
  };
})();
