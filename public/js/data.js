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

// Sentence explorer. chunks are listed in the natural (default) Japanese order.
// rule    = short name of what the sentence teaches (shown on its picker chip).
// enOrder = indexes of chunks in English word order.
// orders  = other ways to arrange the blocks, each with a verdict:
//   natural → just as natural as the default
//   shift   → natural, but the emphasis moves; focus = the chunk(s) now in the spotlight
//   awkward → understandable, but a native speaker wouldn't say it like that
//   broken  → the meaning changes or falls apart
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
    rule: "Basic order",
    why: "Topic → time → object → verb. を sits right next to its verb.",
    orders: [
      { order: [1, 0, 2, 3], v: "natural", why: "Time words often open the sentence to set the scene: “Every morning, I…”." },
      { order: [0, 2, 1, 3], v: "shift", focus: [1], why: "The spot right before the verb gets the emphasis. Now the point is <b>how often</b>: every morning." },
      { order: [2, 0, 1, 3], v: "awkward", why: "を is pulled far away from its verb, and は in the middle sounds like a contrast: “coffee, <i>I</i> (unlike others) drink every morning”." },
    ],
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
    rule: "Place → object",
    why: "Topic → place → object → verb.",
    orders: [
      { order: [0, 2, 1, 3], v: "shift", focus: [1], why: "Now the place is right before the verb, so the point is <b>where</b> he reads: at the library (not at home)." },
      { order: [1, 0, 2, 3], v: "shift", why: "Opening with the place sets the scene: “At the library, Mr. Tanaka…”. は in second place can hint at a contrast (him, as opposed to others)." },
      { order: [2, 1, 0, 3], v: "awkward", why: "Sounds scrambled. The は topic should come early to set the frame, and を wants to stay close to the verb." },
    ],
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
    rule: "Dropping 私",
    note: "The dashed block is usually left out in real Japanese — when “I” is obvious, nobody says it.",
    why: "Topic → time → who with → where to → verb. The destination stays closest to 行きます.",
    orders: [
      { order: [1, 0, 2, 3, 4], v: "natural", why: "Time first is very common: “Tomorrow, I'm going…”. Without 私は, this is exactly what you'd hear." },
      { order: [0, 1, 3, 2, 4], v: "shift", focus: [2], why: "Now “with a friend” is right before the verb, so the point is <b>who with</b>, not where." },
      { order: [0, 3, 1, 2, 4], v: "awkward", why: "Jumping to the destination before the time breaks the “when → where” flow, so 明日 sounds like an afterthought." },
    ],
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
    rule: "There is…",
    note: "います (living things) and あります (objects) mean “exists”. Where it exists takes に.",
    why: "Place → new thing が → いる/ある. This is the standard “there is” order: the place first, then what's there.",
    orders: [
      { order: [2, 0, 1, 3], v: "shift", focus: [0, 1], why: "Starting with the cat makes the point <b>where</b> the cat is. Usually you'd then switch to は: 猫[ねこ]{は}テーブルの上[うえ]にいます = “The cat is on the table.”" },
      { order: [0, 2, 1, 3], v: "broken", why: "の glues テーブル to 上 (“the table's top”). Pull them apart and it reads “the table's cat is on top”. Blocks joined by の move as one." },
    ],
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
    rule: "Giving to someone",
    why: "Topic → recipient に → object を → verb. Who it's for, then what, then the action.",
    orders: [
      { order: [0, 2, 1, 3], v: "shift", focus: [1], why: "Now “to me” is right before the verb, so the point is <b>who</b> she wrote to: me." },
      { order: [1, 0, 2, 3], v: "awkward", why: "は in the middle sounds like a contrast: “To me, my mother (as opposed to others) wrote…”. Fine only if you mean that." },
    ],
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
    rule: "From → until",
    why: "Topic → time → place → verb. Zoom in: when, then where, then the action.",
    orders: [
      { order: [0, 3, 1, 2, 4], v: "shift", focus: [1, 2], why: "Now the hours are right before the verb, so the point is <b>when</b>: 9 to 5." },
      { order: [0, 2, 1, 3, 4], v: "awkward", why: "A range goes から → まで (from → until), just like in English. Flipped, it sounds backwards." },
      { order: [3, 1, 0, 2, 4], v: "awkward", why: "から〜まで is one unit, so don't split it. は in the middle also sounds like a contrast: “<i>I</i>, unlike others…”." },
    ],
  },
  {
    chunks: [
      { w: "昨日[きのう]", p: "", role: "time", en: "yesterday" },
      { w: "私[わたし]", p: "は", role: "topic", en: "I" },
      { w: "駅[えき]", p: "で", role: "place", en: "at the station" },
      { w: "友達[ともだち]", p: "に", role: "point", en: "a friend" },
      { w: "会[あ]いました", p: "", role: "verb", en: "met" },
    ],
    enOrder: [1, 4, 3, 2, 0],
    en: "I met a friend at the station yesterday.",
    rule: "Time before topic",
    why: "Time words like 昨日 can come first, even before the topic, with a comma: “Yesterday, I…”. 会う takes に for the person you meet.",
    orders: [
      { order: [1, 0, 2, 3, 4], v: "natural", why: "Topic first works just as well: 私[わたし]は昨日[きのう]… Both are everyday Japanese, and no comma is needed here." },
      { order: [0, 1, 3, 2, 4], v: "shift", focus: [2], why: "Now the station is right before the verb, so the point is <b>where</b> you met: at the station." },
      { order: [3, 1, 0, 2, 4], v: "awkward", why: "は in the middle sounds like a contrast (“to my friend, <i>I</i>…”), and the time gets buried mid-sentence." },
    ],
  },
  {
    chunks: [
      { w: "私[わたし]", p: "は", role: "topic", en: "I" },
      { w: "毎日[まいにち]", p: "", role: "time", en: "every day" },
      { w: "自転車[じてんしゃ]", p: "で", role: "place", en: "by bike" },
      { w: "会社[かいしゃ]", p: "に", role: "point", en: "to the office" },
      { w: "行[い]きます", p: "", role: "verb", en: "go" },
    ],
    enOrder: [0, 4, 3, 2, 1],
    en: "I go to the office by bike every day.",
    rule: "How → where to",
    why: "Topic → time → how (で) → where to (に) → verb. With verbs of movement, the destination stays closest to the verb.",
    orders: [
      { order: [1, 0, 2, 3, 4], v: "natural", why: "Time first sets the scene: “Every day, I…”." },
      { order: [0, 1, 3, 2, 4], v: "shift", focus: [2], why: "Now “by bike” is right before the verb, so the point is <b>how</b> you get there: by bike, not by train." },
      { order: [3, 2, 0, 1, 4], v: "awkward", why: "は buried in the middle sounds like a contrast, and the destination is pulled far from 行きます." },
    ],
  },
  {
    chunks: [
      { w: "私[わたし]", p: "は", role: "topic", en: "I" },
      { w: "友達[ともだち]", p: "に", role: "point", en: "my friend" },
      { w: "誕生日[たんじょうび]", p: "の", role: "owner", en: "a birthday" },
      { w: "プレゼント", p: "を", role: "object", en: "present" },
      { w: "あげました", p: "", role: "verb", en: "gave" },
    ],
    enOrder: [0, 4, 1, 2, 3],
    en: "I gave my friend a birthday present.",
    rule: "の moves as one",
    why: "Topic → who gets it (に) → what (を) → verb. 誕生日の describes プレゼント, so it sits right in front of it.",
    orders: [
      { order: [0, 2, 3, 1, 4], v: "shift", focus: [1], why: "Now “to my friend” is right before the verb, so the point is <b>who</b> got the present. 誕生日のプレゼント moves as one piece." },
      { order: [0, 1, 3, 2, 4], v: "broken", why: "の has to sit right before the word it describes. 誕生日の with nothing after it just dangles: “a present, birthday's…”." },
    ],
  },
  {
    chunks: [
      { w: "日本[にほん]", p: "は", role: "topic", en: "in Japan" },
      { w: "夏[なつ]", p: "が", role: "subject", en: "Summer" },
      { w: "暑[あつ]いです", p: "", role: "verb", en: "is hot" },
    ],
    enOrder: [1, 2, 0],
    en: "Summer is hot in Japan.",
    rule: "は〜が: big → small",
    why: "A classic は〜が sentence. は sets the big frame (Japan), が picks the part being described (summer): “As for Japan — summer is hot.”",
    orders: [
      { order: [1, 0, 2], v: "awkward", why: "は〜が goes from big to small: the whole first, then the part. Swapped, it sounds jumbled. To start with summer, say 日本[にほん]{の}夏[なつ]{は}暑[あつ]いです." },
    ],
  },
  {
    chunks: [
      { w: "私[わたし]", p: "は", role: "topic", en: "(I)", implied: true },
      { w: "毎週[まいしゅう]土曜日[どようび]", p: "に", role: "point", en: "every Saturday" },
      { w: "友達[ともだち]", p: "と", role: "with", en: "with friends" },
      { w: "テニス", p: "を", role: "object", en: "tennis" },
      { w: "します", p: "", role: "verb", en: "play" },
    ],
    enOrder: [0, 4, 3, 2, 1],
    en: "(I) play tennis with friends every Saturday.",
    rule: "Tight pairs",
    why: "Topic → when → who with → what → verb. Days of the week take に, because they're an exact point in time.",
    orders: [
      { order: [1, 0, 2, 3, 4], v: "natural", why: "Time first is common: “Every Saturday, I…”." },
      { order: [0, 2, 1, 3, 4], v: "natural", why: "Partner first, then time is fine too. The core テニスをします stays together at the end." },
      { order: [0, 1, 3, 2, 4], v: "awkward", why: "テニスをします is a tight pair (“play tennis”). Splitting it with 友達と sounds clumsy." },
    ],
  },
];

// Core sentence skeletons. tip = the one thing to notice. A chunk's label overrides its role's label.
const PATTERNS = [
  {
    title: "A は B です", meaning: "A is B",
    chunks: [
      { w: "私[わたし]", p: "は", role: "topic" },
      { w: "学生[がくせい]", p: "です", role: "verb" },
    ],
    en: "I am a student.",
    tip: "です is the polite “is”. In casual speech it becomes だ, or is dropped.",
  },
  {
    title: "A は B じゃないです", meaning: "A is not B",
    chunks: [
      { w: "私[わたし]", p: "は", role: "topic" },
      { w: "先生[せんせい]", p: "じゃないです", role: "verb" },
    ],
    en: "I am not a teacher.",
    tip: "Just swap です for じゃないです. More formal: ではありません.",
  },
  {
    title: "A は B ですか", meaning: "Is A B?",
    chunks: [
      { w: "田中[たなか]さん", p: "は", role: "topic" },
      { w: "学生[がくせい]", p: "ですか", role: "verb" },
    ],
    en: "Is Mr. Tanaka a student?",
    tip: "Add か at the end. Unlike English, the word order doesn't change.",
  },
  {
    title: "A は Adjective です", meaning: "A is (adjective)",
    chunks: [
      { w: "この本[ほん]", p: "は", role: "topic" },
      { w: "面白[おもしろ]い", p: "です", role: "verb" },
    ],
    en: "This book is interesting.",
    tip: "い-adjectives just add です. な-adjectives drop the な: 静[しず]かです.",
  },
  {
    title: "A は B が Adjective", meaning: "A has an (adjective) B",
    chunks: [
      { w: "象[ぞう]", p: "は", role: "topic" },
      { w: "鼻[はな]", p: "が", role: "subject" },
      { w: "長[なが]い", p: "です", role: "verb" },
    ],
    en: "Elephants have long trunks.",
    tip: "は sets the whole (elephants), が picks the part being described: “As for elephants, the trunk is long.”",
  },
  {
    title: "A は B より Adjective", meaning: "A is more (adjective) than B",
    chunks: [
      { w: "東京[とうきょう]", p: "は", role: "topic" },
      { w: "大阪[おおさか]", p: "より", role: "range", label: "Than" },
      { w: "大[おお]きい", p: "です", role: "verb" },
    ],
    en: "Tokyo is bigger than Osaka.",
    tip: "より marks what you compare against. There's no word for “more”: 大きい alone means “bigger” here.",
  },
  {
    title: "A は B を Verb", meaning: "A does something to B",
    chunks: [
      { w: "弟[おとうと]", p: "は", role: "topic" },
      { w: "ゲーム", p: "を", role: "object" },
      { w: "します", p: "", role: "verb" },
    ],
    en: "My little brother plays games.",
    tip: "を marks what the action is done to. It usually sits right before the verb.",
  },
  {
    title: "A は 何 を Verb か", meaning: "What does A (verb)?",
    chunks: [
      { w: "田中[たなか]さん", p: "は", role: "topic" },
      { w: "何[なに]", p: "を", role: "object" },
      { w: "食[た]べます", p: "か", role: "verb" },
    ],
    en: "What will Mr. Tanaka eat?",
    tip: "The question word sits where the answer goes: {何}を食[た]べますか → {ラーメン}を食[た]べます.",
  },
  {
    title: "A は Place へ 行きます", meaning: "A goes to a place",
    chunks: [
      { w: "母[はは]", p: "は", role: "topic" },
      { w: "駅[えき]", p: "へ", role: "dir" },
      { w: "行[い]きます", p: "", role: "verb" },
    ],
    en: "My mother goes to the station.",
    tip: "へ points toward a destination. に works here too: 駅[えき]に行[い]きます.",
  },
  {
    title: "A は B が 好きです", meaning: "A likes B",
    chunks: [
      { w: "私[わたし]", p: "は", role: "topic" },
      { w: "猫[ねこ]", p: "が", role: "subject" },
      { w: "好[す]き", p: "です", role: "verb" },
    ],
    en: "I like cats.",
    tip: "好き is an adjective, so the thing you like takes が, not を. Same with 嫌[きら]い, 上手[じょうず] and 分[わ]かる.",
  },
  {
    title: "Place に Thing が あります", meaning: "There is a thing in a place",
    chunks: [
      { w: "駅[えき]", p: "に", role: "point" },
      { w: "コンビニ", p: "が", role: "subject" },
      { w: "あります", p: "", role: "verb" },
    ],
    en: "There is a convenience store at the station.",
    tip: "あります for things, います for people and animals. The place comes first.",
  },
  {
    title: "Thing は Place に あります", meaning: "The thing is in a place",
    chunks: [
      { w: "本[ほん]", p: "は", role: "topic" },
      { w: "机[つくえ]の上[うえ]", p: "に", role: "point" },
      { w: "あります", p: "", role: "verb" },
    ],
    en: "The book is on the desk.",
    tip: "The flip of the pattern above. Use it when you both already know the thing: “<i>the</i> book is on the desk”.",
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
