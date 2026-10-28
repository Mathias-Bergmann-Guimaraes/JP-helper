// Grammar points following the lesson order of Minna no Nihongo (Shokyū I & II, 2nd ed.).
// Example sentences are original, not taken from the textbook.
// Each point: g = pattern, m = meaning, ex = example (markup), en = translation,
// role = colour (a ROLES key), link = where the visual explanation lives on this site.

const LESSONS = [
  // ---------------------------------------------------------------- Book I
  { n: 1, title: "Introducing yourself", points: [
    { g: "N1 は N2 です", m: "N1 is N2", ex: "私[わたし]{は}学生[がくせい]{です}。", en: "I'm a student.", role: "topic", link: { tab: "structure" } },
    { g: "N1 は N2 じゃありません", m: "N1 is not N2", ex: "私[わたし]は先生[せんせい]{じゃありません}。", en: "I'm not a teacher.", role: "verb" },
    { g: "〜か", m: "turns a sentence into a question", ex: "学生[がくせい]です{か}。", en: "Are you a student?", role: "verb" },
    { g: "N も", m: "also / too", ex: "田中[たなか]さん{も}学生[がくせい]です。", en: "Tanaka is a student too.", role: "also", link: { tab: "particles", id: "mo" } },
    { g: "N1 の N2", m: "N2 of / belonging to N1", ex: "東京[とうきょう]大学[だいがく]{の}学生[がくせい]", en: "a student at Tokyo University", role: "owner", link: { tab: "particles", id: "no" } },
  ] },
  { n: 2, title: "This and that", points: [
    { g: "これ・それ・あれ", m: "this one / that one / that one over there", ex: "{それ}は辞書[じしょ]ですか。", en: "Is that a dictionary?", role: "topic" },
    { g: "この・その・あの + N", m: "this N / that N / that N over there", ex: "{この}本[ほん]は面白[おもしろ]いです。", en: "This book is interesting.", role: "owner" },
    { g: "N の (= N's one)", m: "the noun after の can be dropped", ex: "この傘[かさ]は私[わたし]{の}です。", en: "This umbrella is mine.", role: "owner", link: { tab: "particles", id: "no" } },
    { g: "そうです / そうじゃありません", m: "yes, it is / no, it isn't", ex: "はい、{そうです}。", en: "Yes, that's right.", role: "verb" },
    { g: "S1 か、S2 か", m: "A or B?", ex: "それはペンです{か}、鉛筆[えんぴつ]です{か}。", en: "Is that a pen or a pencil?", role: "verb" },
  ] },
  { n: 3, title: "Places", points: [
    { g: "ここ・そこ・あそこ", m: "here / there / over there", ex: "トイレは{あそこ}です。", en: "The toilet is over there.", role: "point" },
    { g: "N は place です", m: "N is at (place)", ex: "電話[でんわ]{は}2階[にかい]です。", en: "The phone is on the 2nd floor.", role: "topic" },
    { g: "どこ / どちら", m: "where (どちら is more polite)", ex: "会社[かいしゃ]は{どちら}ですか。", en: "Where is your company?", role: "point" },
    { g: "いくら", m: "how much?", ex: "この時計[とけい]は{いくら}ですか。", en: "How much is this watch?", role: "verb" },
  ] },
  { n: 4, title: "Time & polite verbs", points: [
    { g: "〜時〜分", m: "telling the time", ex: "今[いま]{4時[よじ]5分[ごふん]}です。", en: "It's 4:05 now.", role: "time" },
    { g: "V ます・ません・ました・ませんでした", m: "polite verbs: do / don't / did / didn't", ex: "昨日[きのう]、勉強[べんきょう]し{ませんでした}。", en: "I didn't study yesterday.", role: "verb", link: { tab: "verbs", form: "masu" } },
    { g: "time に V", m: "at (an exact time)", ex: "6時[ろくじ]{に}起[お]きます。", en: "I get up at 6.", role: "point", link: { tab: "particles", id: "ni" } },
    { g: "N1 から N2 まで", m: "from N1 until N2", ex: "9時[くじ]{から}5時[ごじ]{まで}働[はたら]きます。", en: "I work from 9 until 5.", role: "range", link: { tab: "particles", id: "kara" } },
    { g: "N1 と N2", m: "N1 and N2", ex: "休[やす]みは土曜日[どようび]{と}日曜日[にちようび]です。", en: "The days off are Saturday and Sunday.", role: "with", link: { tab: "particles", id: "to" } },
  ] },
  { n: 5, title: "Going places", points: [
    { g: "place へ 行きます・来ます・帰ります", m: "go / come / return to (place)", ex: "京都[きょうと]{へ}行[い]きます。", en: "I'm going to Kyoto.", role: "dir", link: { tab: "particles", id: "he" } },
    { g: "vehicle で", m: "by (bus, train…)", ex: "電車[でんしゃ]{で}行[い]きます。", en: "I'll go by train.", role: "place", link: { tab: "particles", id: "de" } },
    { g: "person と V", m: "(do) with someone", ex: "家族[かぞく]{と}日本[にほん]へ来[き]ました。", en: "I came to Japan with my family.", role: "with", link: { tab: "particles", id: "to" } },
    { g: "いつ", m: "when?", ex: "{いつ}大阪[おおさか]へ行[い]きますか。", en: "When are you going to Osaka?", role: "time" },
    { g: "どこも + negative", m: "not anywhere", ex: "どこ{も}行[い]きませんでした。", en: "I didn't go anywhere.", role: "also", link: { tab: "particles", id: "mo" } },
  ] },
  { n: 6, title: "Doing things", points: [
    { g: "N を V", m: "the object of the action", ex: "ジュース{を}飲[の]みます。", en: "I drink juice.", role: "object", link: { tab: "particles", id: "wo" } },
    { g: "place で V", m: "where an action happens", ex: "駅[えき]{で}新聞[しんぶん]を買[か]います。", en: "I buy a newspaper at the station.", role: "place", link: { tab: "particles", id: "de" } },
    { g: "V ませんか", m: "won't you…? (invitation)", ex: "一緒[いっしょ]に行[い]き{ませんか}。", en: "Won't you come with me?", role: "verb" },
    { g: "V ましょう", m: "let's…", ex: "ちょっと休[やす]み{ましょう}。", en: "Let's take a short break.", role: "verb" },
  ] },
  { n: 7, title: "Giving & receiving", points: [
    { g: "tool で V", m: "with / using", ex: "箸[はし]{で}食[た]べます。", en: "I eat with chopsticks.", role: "place", link: { tab: "particles", id: "de" } },
    { g: "「…」は 〜語で 何ですか", m: "how do you say … in (language)?", ex: "「Thank you」は日本語[にほんご]{で}何[なん]ですか。", en: "How do you say “thank you” in Japanese?", role: "place", link: { tab: "particles", id: "de" } },
    { g: "person に あげます", m: "give to someone", ex: "友達[ともだち]{に}花[はな]をあげました。", en: "I gave flowers to a friend.", role: "point", link: { tab: "particles", id: "ni" } },
    { g: "person に もらいます", m: "receive from someone", ex: "父[ちち]{に}時計[とけい]をもらいました。", en: "I got a watch from my father.", role: "point", link: { tab: "particles", id: "ni" } },
    { g: "もう V ました", m: "already did", ex: "{もう}昼[ひる]ご飯[はん]を食[た]べました。", en: "I've already had lunch.", role: "time" },
  ] },
  { n: 8, title: "Adjectives", points: [
    { g: "い-adj / な-adj です", m: "N is (adjective)", ex: "富士山[ふじさん]は{高[たか]い}です。", en: "Mt. Fuji is tall.", role: "verb", link: { tab: "adjectives" } },
    { g: "い-adj + N / な-adj な + N", m: "adjective before a noun", ex: "{静[しず]かな}町[まち]です。", en: "It's a quiet town.", role: "owner", link: { tab: "adjectives" } },
    { g: "とても / あまり〜ない", m: "very / not very", ex: "この本[ほん]は{あまり}面白[おもしろ]くないです。", en: "This book isn't very interesting.", role: "verb", link: { tab: "adjectives" } },
    { g: "N は どうですか", m: "how is N?", ex: "日本[にほん]の生活[せいかつ]は{どうですか}。", en: "How is life in Japan?", role: "topic" },
    { g: "S1 が、S2", m: "S1, but S2", ex: "おいしいです{が}、高[たか]いです。", en: "It's tasty, but expensive.", role: "verb" },
  ] },
  { n: 9, title: "Likes & abilities", points: [
    { g: "N が 好き・嫌い・上手・下手です", m: "like / dislike / good at / bad at", ex: "私[わたし]は音楽[おんがく]{が}好[す]きです。", en: "I like music.", role: "subject", link: { tab: "particles", id: "ga" } },
    { g: "N が わかります・あります", m: "understand / have", ex: "日本語[にほんご]{が}少[すこ]しわかります。", en: "I understand a little Japanese.", role: "subject", link: { tab: "particles", id: "ga" } },
    { g: "よく・少し・全然…", m: "how much / how well", ex: "漢字[かんじ]が{全然[ぜんぜん]}わかりません。", en: "I don't understand kanji at all.", role: "verb" },
    { g: "S1 から、S2", m: "because S1, S2", ex: "時間[じかん]がありません{から}、行[い]きません。", en: "I have no time, so I won't go.", role: "range" },
    { g: "どうして", m: "why?", ex: "{どうして}行[い]きませんか。", en: "Why aren't you going?", role: "verb" },
  ] },
  { n: 10, title: "Where things are", points: [
    { g: "place に N が あります・います", m: "there is N in (place)", ex: "公園[こうえん]{に}子供[こども]{が}います。", en: "There are children in the park.", role: "point", link: { tab: "particles", id: "ni" } },
    { g: "N は place に あります・います", m: "N is in (place)", ex: "本[ほん]{は}机[つくえ]の上[うえ]{に}あります。", en: "The book is on the desk.", role: "topic", link: { tab: "structure" } },
    { g: "N の 上・下・中・前…", m: "position words", ex: "箱[はこ]{の中[なか]}に猫[ねこ]がいます。", en: "There's a cat in the box.", role: "owner", link: { tab: "particles", id: "no" } },
    { g: "N1 や N2 など", m: "N1, N2 and so on", ex: "本[ほん]{や}ペン{など}があります。", en: "There are books, pens and so on.", role: "with" },
  ] },
  { n: 11, title: "Counting", points: [
    { g: "Counters: 〜つ・〜人・〜台・〜枚", m: "number + counter, usually after the particle", ex: "りんごを{3つ}買[か]いました。", en: "I bought three apples.", role: "object" },
    { g: "period に 〜回", m: "(x) times per (period)", ex: "1週間[いっしゅうかん]{に}2回[にかい]泳[およ]ぎます。", en: "I swim twice a week.", role: "point" },
    { g: "N / quantity だけ", m: "only", ex: "休[やす]みは日曜日[にちようび]{だけ}です。", en: "My only day off is Sunday.", role: "also" },
    { g: "どのくらい", m: "how long / how much?", ex: "大阪[おおさか]まで{どのくらい}かかりますか。", en: "How long does it take to Osaka?", role: "range" },
  ] },
  { n: 12, title: "Past & comparing", points: [
    { g: "N / な-adj でした", m: "was", ex: "昨日[きのう]は雨[あめ]{でした}。", en: "It was rainy yesterday.", role: "verb" },
    { g: "い-adj かったです", m: "was (い-adjective)", ex: "旅行[りょこう]は楽[たの]し{かった}です。", en: "The trip was fun.", role: "verb", link: { tab: "adjectives" } },
    { g: "N1 は N2 より adj", m: "N1 is more (adj) than N2", ex: "東京[とうきょう]は大阪[おおさか]{より}大[おお]きいです。", en: "Tokyo is bigger than Osaka.", role: "range" },
    { g: "N1 と N2 と どちらが", m: "which is more…?", ex: "肉[にく]と魚[さかな]と{どちらが}好[す]きですか。", en: "Which do you like more, meat or fish?", role: "subject" },
    { g: "〜で 何が いちばん", m: "the most … of all", ex: "果物[くだもの]で何[なに]が{いちばん}好[す]きですか。", en: "What fruit do you like best?", role: "subject" },
  ] },
  { n: 13, title: "Wants", points: [
    { g: "N が 欲しいです", m: "I want (a thing)", ex: "新[あたら]しい車[くるま]{が欲[ほ]しい}です。", en: "I want a new car.", role: "subject" },
    { g: "V ます-stem たいです", m: "I want to do", ex: "日本[にほん]へ行[い]き{たい}です。", en: "I want to go to Japan.", role: "with", link: { tab: "patterns", id: "tai" } },
    { g: "place へ V-stem に 行きます", m: "go (somewhere) to do", ex: "デパートへ買[か]い物[もの]{に}行[い]きます。", en: "I'm going shopping at the department store.", role: "point" },
    { g: "何か・どこか", m: "something / somewhere", ex: "{何[なに]か}食[た]べたいです。", en: "I want to eat something.", role: "object" },
  ] },
  { n: 14, title: "The て-form", points: [
    { g: "Verb groups", m: "godan / ichidan / irregular", ex: "{書[か]く}・{食[た]べる}・{する}", en: "one verb from each group", role: "verb", link: { tab: "verbs", form: "dict" } },
    { g: "て-form", m: "the connecting form", ex: "書[か]く → 書[か]{いて}", en: "write → writing / and", role: "verb", link: { tab: "verbs", form: "te" } },
    { g: "V て ください", m: "please do", ex: "ちょっと待[ま]って{ください}。", en: "Please wait a moment.", role: "point", link: { tab: "patterns", id: "kudasai" } },
    { g: "V て います", m: "is doing (in progress)", ex: "今[いま]、雨[あめ]が降[ふ]って{います}。", en: "It's raining right now.", role: "time", link: { tab: "patterns", id: "teiru" } },
    { g: "V ましょうか", m: "shall I…? (offering help)", ex: "荷物[にもつ]を持[も]ち{ましょうか}。", en: "Shall I carry your bag?", role: "verb" },
  ] },
  { n: 15, title: "Permission & states", points: [
    { g: "V て も いいですか", m: "may I…?", ex: "写真[しゃしん]を撮[と]って{もいいですか}。", en: "May I take a photo?", role: "object", link: { tab: "patterns", id: "temoii" } },
    { g: "V て は いけません", m: "must not", ex: "ここで食[た]べて{はいけません}。", en: "You mustn't eat here.", role: "subject", link: { tab: "patterns", id: "temoii" } },
    { g: "V て います (state / job)", m: "is (in a state) · works as", ex: "私[わたし]は大阪[おおさか]に住[す]んで{います}。", en: "I live in Osaka.", role: "time", link: { tab: "patterns", id: "teiru" } },
    { g: "知っています / 知りません", m: "I know / I don't know", ex: "いいえ、{知[し]りません}。", en: "No, I don't know.", role: "verb" },
  ] },
  { n: 16, title: "Linking actions", points: [
    { g: "V1 て、V2 て、V3", m: "do A, then B, then C", ex: "起[お]き{て}、ご飯[はん]を食[た]べ{て}、出[で]かけます。", en: "I get up, eat, and go out.", role: "verb", link: { tab: "verbs", form: "te" } },
    { g: "い-adj くて / な-adj・N で", m: "linking adjectives (and)", ex: "部屋[へや]は広[ひろ]{くて}、きれいです。", en: "The room is big and clean.", role: "verb", link: { tab: "adjectives" } },
    { g: "V1 て から、V2", m: "after doing V1, V2", ex: "仕事[しごと]が終[お]わって{から}、帰[かえ]ります。", en: "I'll go home after work finishes.", role: "range" },
    { g: "N1 は N2 が adj", m: "N1 has an (adj) N2", ex: "象[ぞう]{は}鼻[はな]{が}長[なが]いです。", en: "Elephants have long trunks.", role: "topic", link: { tab: "particles", id: "ga" } },
    { g: "どうやって", m: "how? (by what way)", ex: "駅[えき]まで{どうやって}行[い]きますか。", en: "How do you get to the station?", role: "place" },
  ] },
  { n: 17, title: "The ない-form", points: [
    { g: "ない-form", m: "plain negative", ex: "書[か]く → 書[か]{かない}", en: "write → don't write", role: "verb", link: { tab: "verbs", form: "nai" } },
    { g: "V ない で ください", m: "please don't", ex: "写真[しゃしん]を撮[と]らない{でください}。", en: "Please don't take photos.", role: "point", link: { tab: "patterns", id: "kudasai" } },
    { g: "V なければ なりません", m: "must / have to", ex: "薬[くすり]を飲[の]ま{なければなりません}。", en: "I have to take medicine.", role: "subject", link: { tab: "patterns", id: "nakereba" } },
    { g: "V なくても いいです", m: "don't have to", ex: "明日[あした]は来[こ]{なくてもいいです}。", en: "You don't have to come tomorrow.", role: "object", link: { tab: "patterns", id: "temoii" } },
    { g: "time までに", m: "by (a deadline)", ex: "金曜日[きんようび]{までに}出[だ]してください。", en: "Please hand it in by Friday.", role: "range" },
  ] },
  { n: 18, title: "The dictionary form", points: [
    { g: "Dictionary form", m: "plain present", ex: "書[か]きます → {書[か]く}", en: "write (polite) → write (plain)", role: "verb", link: { tab: "verbs", form: "dict" } },
    { g: "V dict ことが できます", m: "can do", ex: "ピアノを弾[ひ]く{ことができます}。", en: "I can play the piano.", role: "verb" },
    { g: "趣味は V dict ことです", m: "my hobby is (doing)", ex: "趣味[しゅみ]は写真[しゃしん]を撮[と]る{ことです}。", en: "My hobby is taking photos.", role: "topic" },
    { g: "V dict / N の まえに", m: "before (doing)", ex: "寝[ね]る{まえに}、本[ほん]を読[よ]みます。", en: "I read before going to sleep.", role: "time" },
  ] },
  { n: 19, title: "The た-form", points: [
    { g: "た-form", m: "plain past", ex: "書[か]く → 書[か]{いた}", en: "write → wrote", role: "verb", link: { tab: "verbs", form: "ta" } },
    { g: "V た ことが あります", m: "have done (experience)", ex: "富士山[ふじさん]に登[のぼ]った{ことがあります}。", en: "I've climbed Mt. Fuji.", role: "verb" },
    { g: "V た り、V た り します", m: "do things like A and B", ex: "テニスをし{たり}、映画[えいが]を見[み]{たり}します。", en: "I do things like play tennis and watch movies.", role: "with" },
    { g: "い-adj く / な-adj・N に なります", m: "become", ex: "寒[さむ]{くなりました}。", en: "It's gotten cold.", role: "verb", link: { tab: "adjectives" } },
  ] },
  { n: 20, title: "Casual speech", points: [
    { g: "Plain style (普通形)", m: "how friends and family talk", ex: "明日[あした]、{来[く]る}？", en: "Are you coming tomorrow?", role: "verb", link: { tab: "verbs", form: "dict" } },
    { g: "N / な-adj だ", m: "plain “is”", ex: "日曜日[にちようび]は暇[ひま]{だ}。", en: "I'm free on Sunday.", role: "verb", link: { tab: "adjectives" } },
    { g: "Dropping particles & か", m: "casual questions rise in tone instead", ex: "コーヒー、{飲[の]む}？", en: "Want some coffee?", role: "verb" },
  ] },
  { n: 21, title: "Opinions & quotes", points: [
    { g: "plain と 思います", m: "I think that…", ex: "明日[あした]は雨[あめ]が降[ふ]る{と思[おも]います}。", en: "I think it will rain tomorrow.", role: "with" },
    { g: "「…」/ plain と 言いました", m: "said that…", ex: "先生[せんせい]はテストがある{と言[い]いました}。", en: "The teacher said there's a test.", role: "with", link: { tab: "particles", id: "to" } },
    { g: "plain でしょう？", m: "…, right?", ex: "パーティーに行[い]く{でしょう}？", en: "You're going to the party, right?", role: "verb" },
    { g: "N でも V", m: "…or something", ex: "コーヒー{でも}飲[の]みませんか。", en: "How about a coffee or something?", role: "also" },
  ] },
  { n: 22, title: "Describing nouns with sentences", points: [
    { g: "plain sentence + N", m: "a whole sentence can describe a noun", ex: "{母[はは]が作[つく]った}ケーキです。", en: "It's a cake my mother made.", role: "owner" },
    { g: "V dict 時間・約束・用事", m: "time / plan / errand to do", ex: "友達[ともだち]に会[あ]う{約束[やくそく]}があります。", en: "I have plans to meet a friend.", role: "object" },
    { g: "が inside the clause", m: "the clause's subject takes が (or の), not は", ex: "私[わたし]{が}住[す]んでいる町[まち]", en: "the town I live in", role: "subject", link: { tab: "particles", id: "ga" } },
  ] },
  { n: 23, title: "When & natural results", points: [
    { g: "〜とき、〜", m: "when…", ex: "子供[こども]の{とき}、よく泳[およ]ぎました。", en: "When I was a child, I often swam.", role: "time" },
    { g: "V dict と、〜", m: "whenever / if… then (always)", ex: "このボタンを押[お]す{と}、水[みず]が出[で]ます。", en: "If you press this button, water comes out.", role: "with" },
    { g: "place を V (movement)", m: "move through / along", ex: "橋[はし]{を}渡[わた]ります。", en: "I cross the bridge.", role: "object", link: { tab: "particles", id: "wo" } },
  ] },
  { n: 24, title: "Doing favours", points: [
    { g: "くれます", m: "someone gives (to me)", ex: "友達[ともだち]が本[ほん]を{くれました}。", en: "A friend gave me a book.", role: "point" },
    { g: "V て あげます", m: "do something for someone", ex: "妹[いもうと]に本[ほん]を読[よ]んで{あげました}。", en: "I read a book to my little sister.", role: "point", link: { tab: "verbs", form: "te" } },
    { g: "V て もらいます", m: "have someone do something for me", ex: "友達[ともだち]に手伝[てつだ]って{もらいました}。", en: "I had a friend help me.", role: "point" },
    { g: "V て くれます", m: "someone does something for me", ex: "母[はは]が料理[りょうり]を作[つく]って{くれました}。", en: "My mother cooked for me.", role: "point" },
  ] },
  { n: 25, title: "If & even if", points: [
    { g: "〜たら", m: "if…", ex: "雨[あめ]が降[ふ]っ{たら}、行[い]きません。", en: "If it rains, I won't go.", role: "range", link: { tab: "verbs", form: "ta" } },
    { g: "V たら (after)", m: "when / once…", ex: "駅[えき]に着[つ]い{たら}、電話[でんわ]してください。", en: "Call me once you get to the station.", role: "time" },
    { g: "〜ても", m: "even if…", ex: "雨[あめ]が降[ふ]っ{ても}、行[い]きます。", en: "Even if it rains, I'll go.", role: "also", link: { tab: "verbs", form: "te" } },
    { g: "いくら〜ても", m: "no matter how much…", ex: "{いくら}考[かんが]え{ても}、わかりません。", en: "No matter how much I think, I don't get it.", role: "also" },
  ] },

  // ---------------------------------------------------------------- Book II
  { n: 26, title: "Explaining with んです", points: [
    { g: "plain んです", m: "explaining, or asking for an explanation", ex: "どうして遅[おく]れた{んですか}。", en: "Why were you late?", role: "verb" },
    { g: "V て いただけませんか", m: "could you please…?", ex: "日本語[にほんご]を教[おし]えて{いただけませんか}。", en: "Could you teach me Japanese?", role: "point" },
    { g: "question word + V たら いいですか", m: "what / where should I…?", ex: "どこで買[か]っ{たらいいですか}。", en: "Where should I buy it?", role: "verb" },
  ] },
  { n: 27, title: "Can do", points: [
    { g: "Potential form", m: "can do", ex: "漢字[かんじ]が読[よ]{めます}。", en: "I can read kanji.", role: "verb", link: { tab: "verbs", form: "pot" } },
    { g: "見えます・聞こえます", m: "can be seen / heard", ex: "窓[まど]から海[うみ]が{見[み]えます}。", en: "You can see the sea from the window.", role: "subject" },
    { g: "しか + negative", m: "only (nothing but)", ex: "100円[ひゃくえん]{しか}ありません。", en: "I only have 100 yen.", role: "also" },
    { g: "は for contrast", m: "A (but) B", ex: "ひらがな{は}書[か]けますが、漢字[かんじ]{は}書[か]けません。", en: "I can write hiragana, but not kanji.", role: "topic", link: { tab: "particles", id: "wa" } },
  ] },
  { n: 28, title: "Two things at once", points: [
    { g: "V ます-stem ながら", m: "while doing", ex: "音楽[おんがく]を聞[き]き{ながら}勉強[べんきょう]します。", en: "I study while listening to music.", role: "with" },
    { g: "V て います (habit)", m: "regularly do", ex: "毎朝[まいあさ]走[はし]って{います}。", en: "I run every morning.", role: "time", link: { tab: "patterns", id: "teiru" } },
    { g: "〜し、〜し", m: "and what's more…", ex: "安[やす]い{し}、おいしい{し}、よく来[き]ます。", en: "It's cheap and tasty, so I come often.", role: "with" },
  ] },
  { n: 29, title: "States & regrets", points: [
    { g: "V て います (result state)", m: "is (open, broken…)", ex: "窓[まど]が開[あ]いて{います}。", en: "The window is open.", role: "time", link: { tab: "patterns", id: "teiru" } },
    { g: "V て しまいました", m: "ended up doing / did completely (often regret)", ex: "財布[さいふ]をなくして{しまいました}。", en: "I (went and) lost my wallet.", role: "verb" },
    { g: "Intransitive / transitive pairs", m: "が for what changes, を for what you change", ex: "ドア{が}閉[し]まります・ドア{を}閉[し]めます", en: "the door closes · I close the door", role: "subject", link: { tab: "particles", id: "ga" } },
  ] },
  { n: 30, title: "Preparing ahead", points: [
    { g: "V て あります", m: "has been done (on purpose)", ex: "壁[かべ]に地図[ちず]がはって{あります}。", en: "A map has been put up on the wall.", role: "verb" },
    { g: "V て おきます", m: "do in advance", ex: "ホテルを予約[よやく]して{おきます}。", en: "I'll book the hotel in advance.", role: "verb" },
    { g: "まだ V て いません", m: "not yet", ex: "{まだ}食[た]べて{いません}。", en: "I haven't eaten yet.", role: "time", link: { tab: "patterns", id: "teiru" } },
  ] },
  { n: 31, title: "Plans & intentions", points: [
    { g: "Volitional form", m: "let's (casual)", ex: "一緒[いっしょ]に行[い]{こう}。", en: "Let's go together.", role: "verb", link: { tab: "verbs", form: "vol" } },
    { g: "volitional と 思っています", m: "I'm thinking of doing", ex: "日本[にほん]で働[はたら]こう{と思[おも]っています}。", en: "I'm thinking of working in Japan.", role: "with" },
    { g: "V dict / V ない つもりです", m: "I intend to (not) do", ex: "来年[らいねん]国[くに]へ帰[かえ]る{つもりです}。", en: "I plan to go back home next year.", role: "verb" },
    { g: "V dict / N の 予定です", m: "it's scheduled", ex: "会議[かいぎ]は3時[さんじ]に始[はじ]まる{予定[よてい]です}。", en: "The meeting is scheduled to start at 3.", role: "time" },
  ] },
  { n: 32, title: "Advice & guesses", points: [
    { g: "V た / V ない ほうが いいです", m: "you'd better (not)", ex: "毎日[まいにち]運動[うんどう]した{ほうがいいです}。", en: "You should exercise every day.", role: "verb" },
    { g: "plain でしょう", m: "probably", ex: "明日[あした]は晴[は]れる{でしょう}。", en: "It will probably be sunny tomorrow.", role: "verb" },
    { g: "plain かもしれません", m: "might / maybe", ex: "午後[ごご]、雨[あめ]が降[ふ]る{かもしれません}。", en: "It might rain this afternoon.", role: "verb" },
  ] },
  { n: 33, title: "Commands & meanings", points: [
    { g: "Imperative / prohibitive", m: "do it! / don't!", ex: "止[と]ま{れ}！ 入[はい]る{な}！", en: "Stop! Don't enter!", role: "subject" },
    { g: "X は Y という 意味です", m: "X means Y", ex: "「止まれ」は「stop」{という意味[いみ]です}。", en: "“Tomare” means “stop”.", role: "with" },
    { g: "plain と 言って いました", m: "(someone) said that…", ex: "田中[たなか]さんは遅[おく]れる{と言[い]っていました}。", en: "Tanaka said he'd be late.", role: "with", link: { tab: "particles", id: "to" } },
  ] },
  { n: 34, title: "Order of actions", points: [
    { g: "V dict / V た / N の とおりに", m: "exactly as…", ex: "私[わたし]が言[い]う{とおりに}書[か]いてください。", en: "Please write it exactly as I say.", role: "owner" },
    { g: "V た / N の あとで", m: "after…", ex: "仕事[しごと]{のあとで}、飲[の]みに行[い]きます。", en: "I'll go for a drink after work.", role: "time" },
    { g: "V て / V ないで + V2", m: "do V2 with / without doing V1", ex: "砂糖[さとう]を入[い]れ{ないで}飲[の]みます。", en: "I drink it without sugar.", role: "with" },
  ] },
  { n: 35, title: "The ば conditional", points: [
    { g: "ば-form", m: "if…", ex: "安[やす]{ければ}、買[か]います。", en: "If it's cheap, I'll buy it.", role: "range", link: { tab: "verbs", form: "ba" } },
    { g: "N なら", m: "if it's (topic)…", ex: "温泉[おんせん]{なら}、箱根[はこね]がいいですよ。", en: "If it's hot springs you want, Hakone is good.", role: "topic" },
    { g: "〜ば 〜ほど", m: "the more…, the more…", ex: "練習[れんしゅう]すれ{ば}する{ほど}上手[じょうず]になります。", en: "The more you practise, the better you get.", role: "range" },
  ] },
  { n: 36, title: "So that & coming to", points: [
    { g: "V dict / V ない ように、〜", m: "so that…", ex: "忘[わす]れない{ように}、メモします。", en: "I'll write it down so I don't forget.", role: "point" },
    { g: "V dict ように なります", m: "come to (be able to)", ex: "日本語[にほんご]が話[はな]せる{ようになりました}。", en: "I've become able to speak Japanese.", role: "verb" },
    { g: "V dict / V ない ように します", m: "make a point of (not) doing", ex: "毎日[まいにち]野菜[やさい]を食[た]べる{ようにしています}。", en: "I make a point of eating vegetables every day.", role: "verb" },
  ] },
  { n: 37, title: "The passive", points: [
    { g: "N1 は N2 に V (passive)", m: "be (done) by someone", ex: "先生[せんせい]に褒[ほ]め{られました}。", en: "I was praised by the teacher.", role: "point", link: { tab: "particles", id: "ni" } },
    { g: "N1 は N2 に N3 を V (passive)", m: "have something done to you (often annoying)", ex: "電車[でんしゃ]で足[あし]を踏[ふ]ま{れました}。", en: "I got my foot stepped on in the train.", role: "object" },
    { g: "N が / は V (passive)", m: "things being made / held", ex: "この寺[てら]は800年前[はっぴゃくねんまえ]に建[た]て{られました}。", en: "This temple was built 800 years ago.", role: "subject" },
  ] },
  { n: 38, title: "Turning verbs into nouns (の)", points: [
    { g: "V plain の は adj", m: "doing … is (adj)", ex: "絵[え]を描[か]く{のは}楽[たの]しいです。", en: "Drawing pictures is fun.", role: "topic" },
    { g: "V plain の が 好き・上手", m: "like / good at doing", ex: "花[はな]を育[そだ]てる{のが}好[す]きです。", en: "I like growing flowers.", role: "subject" },
    { g: "V plain の を 忘れました", m: "forgot to do", ex: "鍵[かぎ]をかける{のを}忘[わす]れました。", en: "I forgot to lock the door.", role: "object" },
  ] },
  { n: 39, title: "Reasons & feelings", points: [
    { g: "〜て / 〜くて (cause)", m: "because of… (feelings, results)", ex: "ニュースを聞[き]い{て}、びっくりしました。", en: "I was surprised to hear the news.", role: "range" },
    { g: "N で (cause)", m: "because of N", ex: "地震[じしん]{で}ビルが倒[たお]れました。", en: "The building fell because of the earthquake.", role: "place", link: { tab: "particles", id: "de" } },
    { g: "plain ので", m: "because (softer than から)", ex: "用事[ようじ]がある{ので}、早[はや]く帰[かえ]ります。", en: "I have an errand, so I'll leave early.", role: "range" },
  ] },
  { n: 40, title: "Embedded questions & trying", points: [
    { g: "question word … か", m: "(I don't know) what / when…", ex: "何時[なんじ]に着[つ]く{か}、わかりません。", en: "I don't know what time it arrives.", role: "verb" },
    { g: "〜かどうか", m: "whether or not", ex: "間違[まちが]いがない{かどうか}、調[しら]べてください。", en: "Please check whether there are any mistakes.", role: "verb" },
    { g: "V て みます", m: "try doing", ex: "一度[いちど]着物[きもの]を着[き]て{みたい}です。", en: "I want to try wearing a kimono once.", role: "verb", link: { tab: "verbs", form: "te" } },
    { g: "い-adj → 〜さ", m: "adjective → noun", ex: "山[やま]の高[たか]{さ}", en: "the height of the mountain", role: "owner" },
  ] },
  { n: 41, title: "Polite giving & receiving", points: [
    { g: "いただきます・くださいます・やります", m: "receive / give (polite) · give (to animals, juniors)", ex: "先生[せんせい]が本[ほん]を{くださいました}。", en: "The teacher gave me a book.", role: "point" },
    { g: "V て いただきます・くださいます", m: "a superior does something for me", ex: "部長[ぶちょう]に手伝[てつだ]って{いただきました}。", en: "My manager kindly helped me.", role: "point" },
    { g: "V て くださいませんか", m: "would you kindly…?", ex: "住所[じゅうしょ]を教[おし]えて{くださいませんか}。", en: "Would you kindly tell me your address?", role: "point", link: { tab: "patterns", id: "kudasai" } },
  ] },
  { n: 42, title: "Purpose", points: [
    { g: "V dict / N の ために", m: "in order to / for", ex: "家[いえ]を買[か]う{ために}、貯金[ちょきん]しています。", en: "I'm saving up to buy a house.", role: "point" },
    { g: "V dict のに 使います・いいです", m: "used for / good for (doing)", ex: "このはさみは花[はな]を切[き]る{のに}使[つか]います。", en: "These scissors are for cutting flowers.", role: "point" },
    { g: "quantity も", m: "as many / much as (surprise)", ex: "パーティーに100人[ひゃくにん]{も}来[き]ました。", en: "As many as 100 people came to the party.", role: "also" },
  ] },
  { n: 43, title: "Looks like", points: [
    { g: "V ます-stem そうです", m: "looks like it's about to", ex: "雨[あめ]が降[ふ]り{そうです}。", en: "It looks like it's going to rain.", role: "verb" },
    { g: "adj stem そうです", m: "looks (adj)", ex: "このケーキはおいし{そうです}。", en: "This cake looks delicious.", role: "verb", link: { tab: "adjectives" } },
    { g: "V て 来ます", m: "go do something and come back", ex: "ちょっと切符[きっぷ]を買[か]って{来[き]ます}。", en: "I'll just go buy a ticket.", role: "dir" },
  ] },
  { n: 44, title: "Too much & easy to", points: [
    { g: "〜すぎます", m: "too much", ex: "食[た]べ{すぎました}。", en: "I ate too much.", role: "verb" },
    { g: "V ます-stem やすい・にくい", m: "easy / hard to do", ex: "このペンは書[か]き{やすい}です。", en: "This pen is easy to write with.", role: "verb" },
    { g: "い-adj く / な-adj に します", m: "make (something) (adj)", ex: "音[おと]を小[ちい]さ{くして}ください。", en: "Please turn the volume down.", role: "verb", link: { tab: "adjectives" } },
    { g: "N に します", m: "decide on N", ex: "私[わたし]はコーヒー{にします}。", en: "I'll have coffee.", role: "point" },
  ] },
  { n: 45, title: "In case & even though", points: [
    { g: "〜場合は", m: "in case of…", ex: "火事[かじ]の{場合[ばあい]は}、階段[かいだん]を使[つか]ってください。", en: "In case of fire, please use the stairs.", role: "time" },
    { g: "plain のに", m: "even though…", ex: "約束[やくそく]した{のに}、来[き]ませんでした。", en: "Even though we'd agreed, they didn't come.", role: "range" },
  ] },
  { n: 46, title: "Timing", points: [
    { g: "V dict / V ている / V た ところです", m: "about to / in the middle of / just did", ex: "今[いま]から食[た]べる{ところです}。", en: "I'm just about to eat.", role: "time" },
    { g: "V た ばかりです", m: "only just did", ex: "日本[にほん]に来[き]た{ばかりです}。", en: "I've only just come to Japan.", role: "time" },
    { g: "plain はずです", m: "should be (expected)", ex: "荷物[にもつ]は明日[あした]届[とど]く{はずです}。", en: "The package should arrive tomorrow.", role: "verb" },
  ] },
  { n: 47, title: "Hearsay & appearance", points: [
    { g: "plain そうです (I heard)", m: "I hear that…", ex: "明日[あした]は雨[あめ]だ{そうです}。", en: "I hear it'll rain tomorrow.", role: "with" },
    { g: "plain ようです", m: "it seems…", ex: "誰[だれ]もいない{ようです}。", en: "It seems nobody's here.", role: "verb" },
    { g: "声・音・におい・味 が します", m: "I can hear / smell / taste…", ex: "いいにおい{がします}。", en: "Something smells good.", role: "subject" },
  ] },
  { n: 48, title: "The causative", points: [
    { g: "Causative form", m: "make / let someone do", ex: "子供[こども]に野菜[やさい]を食[た]べ{させます}。", en: "I make my kids eat vegetables.", role: "point" },
    { g: "Causative (permission)", m: "let someone do", ex: "子供[こども]を自由[じゆう]に遊[あそ]ば{せます}。", en: "I let the children play freely.", role: "object" },
    { g: "V させて いただけませんか", m: "would you let me…?", ex: "今日[きょう]は早[はや]く帰[かえ]ら{せていただけませんか}。", en: "Could you let me leave early today?", role: "point" },
  ] },
  { n: 49, title: "Respectful language (尊敬語)", points: [
    { g: "Passive-shaped respect", m: "(someone respected) does", ex: "社長[しゃちょう]はもう帰[かえ]{られました}。", en: "The president has already gone home.", role: "verb" },
    { g: "お V ます-stem に なります", m: "(someone respected) does", ex: "先生[せんせい]は{お}読[よ]み{になりました}。", en: "The teacher read it.", role: "verb" },
    { g: "Special verbs: いらっしゃる・召し上がる・おっしゃる", m: "be / eat / say (respectful)", ex: "何[なに]を{召[め]し上[あ]がりますか}。", en: "What would you like to eat?", role: "verb" },
  ] },
  { n: 50, title: "Humble language (謙譲語)", points: [
    { g: "お V ます-stem します", m: "I (humbly) do", ex: "荷物[にもつ]を{お}持[も]ち{します}。", en: "Let me carry your bag.", role: "verb" },
    { g: "Special verbs: 参る・いただく・申す", m: "go / eat / say (humble)", ex: "田中[たなか]と{申[もう]します}。", en: "My name is Tanaka.", role: "verb" },
    { g: "ございます / でございます", m: "very polite あります / です", ex: "お手洗[てあら]いはあちら{でございます}。", en: "The restroom is over there.", role: "verb" },
  ] },
];
