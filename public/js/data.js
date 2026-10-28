// Grammar content for the site.
// Markup used in all Japanese strings:
//   漢字[かんじ]  → kanji with furigana
//   {x}          → highlighted text (e.g. the particle being taught)

const KANJI_RE = /([0-9々一-鿿]+)\[([^\]]+)\]/g;
const ruby = (m) => m.replace(KANJI_RE, "<ruby>$1<rt>$2</rt></ruby>");
const plain = (m) => m.replace(KANJI_RE, "$1");
const kana = (m) => m.replace(KANJI_RE, "$2");
const rich = (m) => ruby(m).replace(/\{([^}]+)\}/g, '<span class="hl">$1</span>');

// Every block in a sentence has a role. Each role has one colour, used everywhere on the site.
const ROLES = {
  topic:   { label: "Topic",            color: "var(--c-topic)",   hint: "は — what the sentence is about" },
  subject: { label: "Subject",          color: "var(--c-subject)", hint: "が — who / what does it" },
  object:  { label: "Object",           color: "var(--c-object)",  hint: "を — what the action is done to" },
  point:   { label: "Point / Target",   color: "var(--c-point)",   hint: "に — destination, exact time, recipient, where something is" },
  dir:     { label: "Direction",        color: "var(--c-dir)",     hint: "へ — heading toward" },
  place:   { label: "Place / Means",    color: "var(--c-place)",   hint: "で — where an action happens, or with what" },
  time:    { label: "Time",             color: "var(--c-time)",    hint: "relative time words need no particle" },
  with:    { label: "Together",         color: "var(--c-with)",    hint: "と — with / and" },
  owner:   { label: "Owner / Describer",color: "var(--c-owner)",   hint: "の — A's B, B of A" },
  also:    { label: "Also",             color: "var(--c-also)",    hint: "も — too / also" },
  range:   { label: "Range",            color: "var(--c-range)",   hint: "から / まで — from / until" },
  verb:    { label: "Verb / Predicate", color: "var(--c-verb)",    hint: "always comes last" },
};

// Sentence explorer. enOrder = indexes of chunks in English word order.
const SENTENCES = [
  {
    chunks: [
      { w: "私[わたし]", p: "は", role: "topic", en: "I" },
      { w: "毎朝[まいあさ]", p: "", role: "time", en: "every morning" },
      { w: "コーヒー", p: "を", role: "object", en: "coffee" },
      { w: "飲[の]みます", p: "", role: "verb", en: "drink" },
    ],
    enOrder: [0, 3, 2, 1],
    en: "I drink coffee every morning.",
  },
  {
    chunks: [
      { w: "田中[たなか]さん", p: "は", role: "topic", en: "Mr. Tanaka" },
      { w: "図書館[としょかん]", p: "で", role: "place", en: "at the library" },
      { w: "本[ほん]", p: "を", role: "object", en: "a book" },
      { w: "読[よ]みます", p: "", role: "verb", en: "reads" },
    ],
    enOrder: [0, 3, 2, 1],
    en: "Mr. Tanaka reads a book at the library.",
  },
  {
    chunks: [
      { w: "私[わたし]", p: "は", role: "topic", en: "(I)", implied: true },
      { w: "明日[あした]", p: "", role: "time", en: "tomorrow" },
      { w: "友達[ともだち]", p: "と", role: "with", en: "with a friend" },
      { w: "京都[きょうと]", p: "へ", role: "dir", en: "to Kyoto" },
      { w: "行[い]きます", p: "", role: "verb", en: "will go" },
    ],
    enOrder: [0, 4, 3, 2, 1],
    en: "(I) will go to Kyoto with a friend tomorrow.",
    note: "The dashed block is usually left out in real Japanese — when “I” is obvious, nobody says it.",
  },
  {
    chunks: [
      { w: "テーブル", p: "の", role: "owner", en: "the table" },
      { w: "上[うえ]", p: "に", role: "point", en: "on top of" },
      { w: "猫[ねこ]", p: "が", role: "subject", en: "a cat" },
      { w: "います", p: "", role: "verb", en: "there is" },
    ],
    enOrder: [3, 2, 1, 0],
    en: "There is a cat on the table.",
    note: "います (living things) and あります (objects) mean “exists”. Where it exists takes に.",
  },
  {
    chunks: [
      { w: "母[はは]", p: "は", role: "topic", en: "My mother" },
      { w: "私[わたし]", p: "に", role: "point", en: "to me" },
      { w: "手紙[てがみ]", p: "を", role: "object", en: "a letter" },
      { w: "書[か]きました", p: "", role: "verb", en: "wrote" },
    ],
    enOrder: [0, 3, 2, 1],
    en: "My mother wrote a letter to me.",
  },
  {
    chunks: [
      { w: "私[わたし]", p: "は", role: "topic", en: "(I)", implied: true },
      { w: "9時[くじ]", p: "から", role: "range", en: "from 9" },
      { w: "5時[ごじ]", p: "まで", role: "range", en: "until 5" },
      { w: "会社[かいしゃ]", p: "で", role: "place", en: "at the office" },
      { w: "働[はたら]きます", p: "", role: "verb", en: "work" },
    ],
    enOrder: [0, 4, 3, 1, 2],
    en: "(I) work at the office from 9 until 5.",
  },
];

const PATTERNS = [
  {
    title: "A は B です", meaning: "A is B",
    chunks: [
      { w: "私[わたし]", p: "は", role: "topic" },
      { w: "学生[がくせい]", p: "です", role: "verb" },
    ],
    en: "I am a student.",
  },
  {
    title: "A は Adjective です", meaning: "A is (adjective)",
    chunks: [
      { w: "この本[ほん]", p: "は", role: "topic" },
      { w: "面白[おもしろ]い", p: "です", role: "verb" },
    ],
    en: "This book is interesting.",
  },
  {
    title: "A は B を Verb", meaning: "A does something to B",
    chunks: [
      { w: "弟[おとうと]", p: "は", role: "topic" },
      { w: "ゲーム", p: "を", role: "object" },
      { w: "します", p: "", role: "verb" },
    ],
    en: "My little brother plays games.",
  },
  {
    title: "Place に Thing が あります", meaning: "There is a thing in a place",
    chunks: [
      { w: "駅[えき]", p: "に", role: "point" },
      { w: "コンビニ", p: "が", role: "subject" },
      { w: "あります", p: "", role: "verb" },
    ],
    en: "There is a convenience store at the station.",
  },
];

const PARTICLES = [
  {
    id: "wa", p: "は", read: "wa", role: "topic", name: "Topic marker",
    idea: "Sets the stage: “As for X…”. Everything after は is a comment about X.",
    caption: "A spotlight on the topic",
    uses: [
      { label: "Introduce the topic", ex: "私[わたし]{は}学生[がくせい]です。", en: "I am a student. (As for me — student.)" },
      { label: "Contrast", ex: "肉[にく]{は}食[た]べますが、魚[さかな]{は}食[た]べません。", en: "Meat I eat, but fish I don't." },
      { label: "Set the scene", ex: "今日[きょう]{は}暑[あつ]いです。", en: "Today, it's hot." },
    ],
    tip: "Written は (ha) but pronounced “wa”.",
  },
  {
    id: "ga", p: "が", read: "ga", role: "subject", name: "Subject marker",
    idea: "Points at WHO or WHAT — usually the new or important piece of information.",
    caption: "Pointing: “this one!”",
    uses: [
      { label: "Answering “who / what?”", ex: "誰[だれ]{が}来[き]ましたか。— 田中[たなか]さん{が}来[き]ました。", en: "Who came? — Tanaka came." },
      { label: "Describing what you see", ex: "雨[あめ]{が}降[ふ]っています。", en: "It's raining. (Rain is falling.)" },
      { label: "With 好き・ある・いる・わかる", ex: "私[わたし]は猫[ねこ]{が}好[す]きです。", en: "I like cats." },
    ],
    tip: "Question words (誰, 何, どこ) as the subject always take が, never は.",
  },
  {
    id: "wo", p: "を", read: "o", role: "object", name: "Object marker",
    idea: "Marks the thing the action is done TO — the target the verb hits.",
    caption: "The action hits a target",
    uses: [
      { label: "Direct object", ex: "パン{を}食[た]べます。", en: "I eat bread." },
      { label: "Direct object", ex: "日本語[にほんご]{を}勉強[べんきょう]します。", en: "I study Japanese." },
      { label: "Space you move through", ex: "橋[はし]{を}渡[わた]ります。", en: "I cross the bridge." },
      { label: "Place you leave", ex: "家[いえ]{を}出[で]ます。", en: "I leave the house." },
    ],
    tip: "Written を (wo) but pronounced “o”.",
  },
  {
    id: "ni", p: "に", read: "ni", role: "point", name: "Point / target",
    idea: "A precise POINT: where you arrive, when something happens, who receives, where something exists.",
    caption: "Landing on an exact point",
    uses: [
      { label: "Destination", ex: "学校[がっこう]{に}行[い]きます。", en: "I go to school." },
      { label: "Exact time", ex: "7時[しちじ]{に}起[お]きます。", en: "I wake up at 7." },
      { label: "Recipient", ex: "友達[ともだち]{に}プレゼントをあげます。", en: "I give a present to a friend." },
      { label: "Where something exists", ex: "部屋[へや]{に}猫[ねこ]がいます。", en: "There's a cat in the room." },
    ],
    tip: "Relative time words (今日, 明日, 毎朝) don't take に.",
  },
  {
    id: "he", p: "へ", read: "e", role: "dir", name: "Direction",
    idea: "Heading TOWARD somewhere. The focus is the direction, not the arrival.",
    caption: "Heading that way",
    uses: [
      { label: "Direction of movement", ex: "日本[にほん]{へ}行[い]きます。", en: "I'm going to (toward) Japan." },
      { label: "Messages addressed to someone", ex: "母[はは]{へ}の手紙[てがみ]", en: "a letter to Mom" },
    ],
    tip: "Written へ (he) but pronounced “e”. With movement verbs に and へ are usually interchangeable.",
  },
  {
    id: "de", p: "で", read: "de", role: "place", name: "Place of action / means",
    idea: "The STAGE where an action happens — or the TOOL you do it with.",
    caption: "The stage where action happens",
    uses: [
      { label: "Where an action happens", ex: "図書館[としょかん]{で}勉強[べんきょう]します。", en: "I study at the library." },
      { label: "Tool", ex: "箸[はし]{で}食[た]べます。", en: "I eat with chopsticks." },
      { label: "Transport", ex: "バス{で}行[い]きます。", en: "I go by bus." },
      { label: "Language", ex: "日本語[にほんご]{で}話[はな]してください。", en: "Please speak in Japanese." },
    ],
    tip: "に = where something IS (いる / ある).  で = where something HAPPENS.",
  },
  {
    id: "to", p: "と", read: "to", role: "with", name: "With / and",
    idea: "LINKS things: “together with” someone, or “and” in a complete list.",
    caption: "Two things linked",
    uses: [
      { label: "Together with", ex: "友達[ともだち]{と}映画[えいが]を見[み]ます。", en: "I watch a movie with a friend." },
      { label: "A and B (complete list)", ex: "パン{と}牛乳[ぎゅうにゅう]を買[か]いました。", en: "I bought bread and milk." },
      { label: "Quoting", ex: "「はい」{と}言[い]いました。", en: "(They) said “yes”." },
    ],
    tip: "と only links nouns. To link verbs or adjectives, use the て-form.",
  },
  {
    id: "no", p: "の", read: "no", role: "owner", name: "Possessive / connector",
    idea: "Joins two nouns: A の B = “B that belongs to / is described by A”.",
    caption: "B lives inside A",
    uses: [
      { label: "Possession", ex: "私[わたし]{の}本[ほん]", en: "my book" },
      { label: "Description", ex: "日本語[にほんご]{の}先生[せんせい]", en: "a Japanese-language teacher" },
      { label: "Position", ex: "机[つくえ]{の}上[うえ]", en: "on top of the desk" },
    ],
    tip: "Read it backwards in English: A の B → “B of A”.",
  },
  {
    id: "mo", p: "も", read: "mo", role: "also", name: "Also / too",
    idea: "“Me TOO!” — takes the place of は, が or を to say the same thing applies.",
    caption: "Same thing applies",
    uses: [
      { label: "Also", ex: "私[わたし]{も}学生[がくせい]です。", en: "I'm a student too." },
      { label: "Replaces を", ex: "魚[さかな]{も}食[た]べます。", en: "I eat fish too." },
      { label: "Not … either", ex: "私[わたし]{も}行[い]きません。", en: "I'm not going either." },
    ],
    tip: "も REPLACES は / が / を. Never say はも or をも.",
  },
  {
    id: "kara", p: "から・まで", read: "kara / made", role: "range", name: "From / until",
    idea: "Marks the START and END of a range — in time or in space.",
    caption: "Start flag → end flag",
    uses: [
      { label: "Time range", ex: "9時[くじ]{から}5時[ごじ]{まで}働[はたら]きます。", en: "I work from 9 until 5." },
      { label: "Distance", ex: "東京[とうきょう]{から}大阪[おおさか]{まで}", en: "from Tokyo to Osaka" },
    ],
    tip: "から after a full sentence means “because”.",
  },
];

// Which role colour a particle gets in the quiz.
const PARTICLE_ROLE = { は: "topic", が: "subject", を: "object", に: "point", へ: "dir", で: "place", と: "with", の: "owner", も: "also", から: "range", まで: "range" };

// Particle quiz. {_} marks the blank. Options are chosen so only one answer fits the English.
const PARTICLE_QUIZ = [
  { s: "私[わたし]{_}学生[がくせい]です。", a: "は", opts: ["は", "を", "に", "で"], en: "I am a student.", why: "は marks the topic: “As for me…”." },
  { s: "パン{_}食[た]べます。", a: "を", opts: ["を", "に", "で", "と"], en: "I eat bread.", why: "を marks the direct object — the thing being eaten." },
  { s: "7時[しちじ]{_}起[お]きます。", a: "に", opts: ["に", "で", "を", "へ"], en: "I wake up at 7.", why: "に marks an exact point in time." },
  { s: "図書館[としょかん]{_}勉強[べんきょう]します。", a: "で", opts: ["で", "に", "を", "の"], en: "I study at the library.", why: "で marks the place where an action happens." },
  { s: "友達[ともだち]{_}映画[えいが]を見[み]ます。", a: "と", opts: ["と", "に", "を", "で"], en: "I watch a movie with a friend.", why: "と means “together with”." },
  { s: "これは私[わたし]{_}本[ほん]です。", a: "の", opts: ["の", "が", "と", "に"], en: "This is my book.", why: "A の B = A's B." },
  { s: "部屋[へや]に猫[ねこ]{_}います。", a: "が", opts: ["が", "を", "で", "の"], en: "There is a cat in the room.", why: "With います / あります, the thing that exists takes が." },
  { s: "バス{_}学校[がっこう]に行[い]きます。", a: "で", opts: ["で", "に", "を", "が"], en: "I go to school by bus.", why: "で marks the means — how you do something." },
  { s: "私[わたし]は学生[がくせい]です。田中[たなか]さん{_}学生[がくせい]です。", a: "も", opts: ["も", "は", "の", "と"], en: "I'm a student. Tanaka is a student too.", why: "も = “too”. It replaces は." },
  { s: "9時[くじ]{_}5時[ごじ]まで働[はたら]きます。", a: "から", opts: ["から", "に", "で", "を"], en: "I work from 9 until 5.", why: "から marks the start of a range, まで the end." },
  { s: "誰[だれ]{_}来[き]ましたか。", a: "が", opts: ["が", "は", "を", "に"], en: "Who came?", why: "Question words as the subject always take が, never は." },
  { s: "母[はは]{_}手紙[てがみ]を書[か]きました。", a: "に", opts: ["に", "で", "を", "から"], en: "I wrote a letter to my mother.", why: "に marks the recipient — who it goes to." },
  { s: "日本[にほん]{_}行[い]きたいです。", a: "へ", opts: ["へ", "を", "で", "と"], en: "I want to go to Japan.", why: "へ marks the direction you're heading (に also works here)." },
  { s: "箸[はし]{_}ラーメンを食[た]べます。", a: "で", opts: ["で", "と", "を", "に"], en: "I eat ramen with chopsticks.", why: "で marks the tool you use." },
  { s: "公園[こうえん]に子供[こども]{_}います。", a: "が", opts: ["が", "を", "で", "へ"], en: "There are children in the park.", why: "The thing that exists (with います) takes が." },
];

const ADJECTIVES = {
  i: {
    label: "い-adjectives", color: "var(--c-object)",
    pattern: "〜い → 〜くない → 〜かった → 〜くなかった",
    list: [
      { w: "高[たか]い", en: "tall / expensive", short: "tall", noun: "山[やま]", nounEn: "mountain" },
      { w: "安[やす]い", en: "cheap", short: "cheap", noun: "店[みせ]", nounEn: "shop" },
      { w: "大[おお]きい", en: "big", short: "big", noun: "犬[いぬ]", nounEn: "dog" },
      { w: "新[あたら]しい", en: "new", short: "new", noun: "車[くるま]", nounEn: "car" },
      { w: "楽[たの]しい", en: "fun", short: "fun", noun: "旅行[りょこう]", nounEn: "trip" },
      { w: "いい", en: "good", short: "good", noun: "天気[てんき]", nounEn: "weather", irregular: true,
        note: "いい is irregular: every other form uses よ — よくない, よかった, よくなかった." },
    ],
  },
  na: {
    label: "な-adjectives", color: "var(--c-dir)",
    pattern: "〜だ → 〜じゃない → 〜だった → 〜じゃなかった",
    list: [
      { w: "静[しず]か", en: "quiet", short: "quiet", noun: "町[まち]", nounEn: "town" },
      { w: "元気[げんき]", en: "healthy / energetic", short: "energetic", noun: "子供[こども]", nounEn: "child" },
      { w: "好[す]き", en: "liked", short: "favourite", noun: "食[た]べ物[もの]", nounEn: "food" },
      { w: "有名[ゆうめい]", en: "famous", short: "famous", noun: "人[ひと]", nounEn: "person" },
      { w: "便利[べんり]", en: "convenient", short: "handy", noun: "アプリ", nounEn: "app" },
      { w: "きれい", en: "pretty / clean", short: "pretty", noun: "花[はな]", nounEn: "flower",
        note: "Trap! きれい ends in い but it's a な-adjective: きれいな花, きれいじゃない." },
    ],
  },
};

// Verb patterns: a verb form + a fixed ending.
// base: which verb form the ending attaches to — "te" (て-form), "stem" (ます-form minus ます), "nai" (ない-form minus ない).
// In example chunks, {…} marks the pattern part.
const VERB_PATTERNS = [
  {
    id: "teiru", title: "〜ている", color: "var(--c-time)",
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
    id: "tai", title: "〜たい", color: "var(--c-with)",
    name: "Wanting to do", meaning: "want to do",
    base: "stem", ending: "たい", en: "want to {v}",
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
    id: "kudasai", title: "〜てください", color: "var(--c-point)",
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
      { e: "〜て", m: "casual request to friends (待って!)" },
    ],
    tip: "“Please don't” uses the ない-form, not the て-form: 行かないでください.",
  },
  {
    id: "temoii", title: "〜てもいい", color: "var(--c-object)",
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
    id: "nakereba", title: "〜なければならない", color: "var(--c-subject)",
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
];
