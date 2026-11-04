// Sentences for the sentence builder, split into colour blocks. Each comes from drills.js.
// Each one: [point index in that lesson, English, blocks]. Blocks are in the most usual order,
// separated by spaces, written as word+particle:role (the particle is optional).
// ~ marks a block that can swap places with the other ~ blocks and still be natural Japanese, as
// the particles carry each block's job. Anything without it has to stay where it is.
// The role "clause" (a whole linked clause) only exists here: see BUILD_ROLES in lesson-build.js.

const BUILDS = {
  1: [
    [1, "Mr. Santos is not a student.", "サントスさん+は:topic 学生[がくせい]:verb じゃありません:verb"],
    [2, "Is that person a teacher?", "あの方[かた]+は:topic 先生[せんせい]:verb ですか:verb"],
    [3, "Ms. Kim is a doctor too.", "キムさん+も:also 医者[いしゃ]:verb です:verb"],
    [4, "I'm a Japanese teacher.", "私[わたし]+は:topic 日本語[にほんご]+の:owner 先生[せんせい]です:verb"],
  ],
  2: [
    [0, "This is a book.", "これ+は:topic 本[ほん]:verb です:verb"],
    [1, "That bag is mine.", "そのかばん+は:topic 私[わたし]+の:owner です:verb"],
    [2, "That notebook is Mr. Miller's.", "その手帳[てちょう]+は:topic ミラーさん+の:owner です:verb"],
    [4, "Is this a 9 or a 7?", "これ+は:topic 「9」ですか、:verb 「7」ですか:verb"],
  ],
  3: [
    [0, "The reception is here.", "受付[うけつけ]+は:topic ここ:point です:verb"],
    [1, "The meeting room is on the 3rd floor.", "会議室[かいぎしつ]+は:topic 3階[さんがい]:point です:verb"],
    [2, "Where is the toilet?", "トイレ+は:topic どこ:point ですか:verb"],
    [3, "How much is this wine?", "このワイン+は:topic いくら:verb ですか:verb"],
  ],
  4: [
    [0, "It's 4 a.m. in New York now.", "~ニューヨーク+は:topic ~今[いま]:time 午前[ごぜん]4時[よじ]です:verb"],
    [1, "I didn't take a day off the day before yesterday.", "おととい、:time 休[やす]み:verb ませんでした:verb"],
    [2, "What time did you go to bed yesterday?", "~昨日[きのう]+は:topic ~何時[なんじ]+に:point 寝[ね]ましたか:verb"],
    [3, "The bank is open from 9 to 3.", "銀行[ぎんこう]+は:topic 9時[くじ]+から:range 3時[さんじ]+まで:range です:verb"],
    [4, "My days off are Saturday and Sunday.", "休[やす]み+は:topic 土曜日[どようび]+と:with 日曜日[にちようび]:verb です:verb"],
  ],
  5: [
    [0, "I came to Japan with my family.", "~家族[かぞく]+と:with ~日本[にほん]+へ:dir 来[き]ました:verb"],
    [1, "I come to school by bus.", "~バス+で:place ~学校[がっこう]+へ:dir 来[き]ます:verb"],
    [2, "I went to the department store with a friend.", "~友達[ともだち]+と:with ~デパート+へ:dir 行[い]きました:verb"],
    [3, "When is your birthday?", "誕生日[たんじょうび]+は:topic いつ:time ですか:verb"],
    [4, "I didn't go anywhere yesterday.", "~昨日[きのう]+は:topic ~どこ+も:also 行[い]きませんでした:verb"],
  ],
  6: [
    [0, "I didn't eat breakfast.", "朝[あさ]ご飯[はん]+を:object 食[た]べ:verb ませんでした:verb"],
    [1, "I always buy bread at the convenience store.", "~いつも:time ~コンビニ+で:place ~パン+を:object 買[か]います:verb"],
    [2, "Won't you have lunch with me?", "~一緒[いっしょ]に:with ~昼[ひる]ご飯[はん]+を:object 食[た]べませんか:verb"],
    [3, "Let's take a short break.", "ちょっと:owner 休[やす]み:verb ましょう:verb"],
  ],
  7: [
    [0, "I cut paper with scissors.", "~はさみ+で:place ~紙[かみ]+を:object 切[き]ります:verb"],
    [1, "How do you say “sayonara” in English?", "~「さようなら」+は:topic ~英語[えいご]+で:place 何[なん]ですか:verb"],
    [2, "At Christmas I give presents to my children.", "~クリスマス+に:time ~子供[こども]+に:point ~プレゼント+を:object あげます:verb"],
    [3, "On my birthday I got a camera from my father.", "誕生日[たんじょうび]+に、:time ~父[ちち]+に:point ~カメラ+を:object もらいました:verb"],
    [4, "Have you already eaten dinner?", "~もう:time ~晩[ばん]ご飯[はん]+を:object 食[た]べましたか:verb"],
  ],
  8: [
    [0, "Tokyo is lively.", "東京[とうきょう]+は:topic にぎやか:verb です:verb"],
    [1, "Mt. Fuji is a famous mountain.", "富士山[ふじさん]+は:topic 有名[ゆうめい]な:owner 山[やま]です:verb"],
    [2, "Osaka is very lively.", "大阪[おおさか]+は:topic とても:owner にぎやかです:verb"],
    [3, "How is Japanese food?", "日本[にほん]+の:owner 食[た]べ物[もの]+は:topic どうですか:verb"],
    [4, "This dish is expensive, but tasty.", "この料理[りょうり]+は:topic 高[たか]いですが、:clause おいしいです:verb"],
  ],
  9: [
    [0, "I like soccer.", "私[わたし]+は:topic サッカー+が:subject 好[す]きです:verb"],
    [1, "I don't have time today.", "~今日[きょう]+は:topic ~時間[じかん]+が:subject ありません:verb"],
    [2, "I really like soccer.", "~サッカー+が:subject ~とても:owner 好[す]きです:verb"],
    [3, "My stomach hurts, so I'm going to the hospital.", "おなかが痛[いた]いですから、:clause 病院[びょういん]+へ:dir 行[い]きます:verb"],
    [4, "Why didn't you go to the party?", "~どうして:owner ~パーティー+に:point 行[い]きませんでしたか:verb"],
  ],
  10: [
    [0, "There's a photo on the desk.", "~机[つくえ]の上[うえ]+に:point ~写真[しゃしん]+が:subject あります:verb"],
    [1, "Mr. Miller is in the meeting room.", "~ミラーさん+は:topic ~会議室[かいぎしつ]+に:point います:verb"],
    [2, "There's a flower shop between the bank and the bookshop.", "~銀行[ぎんこう]と本屋[ほんや]の間[あいだ]+に:point ~花屋[はなや]+が:subject あります:verb"],
    [3, "In the box there are letters, photos and so on.", "~箱[はこ]の中[なか]+に:point ~手紙[てがみ]や写真[しゃしん]など+が:subject あります:verb"],
  ],
  11: [
    [0, "At the post office I bought five stamps and two postcards.", "郵便局[ゆうびんきょく]+で:place 切手[きって]を5枚[ごまい]と、:object はがきを2枚[にまい]:object 買[か]いました:verb"],
    [1, "I watch a movie once a month.", "~1か月[げつ]に1回[いっかい]:time ~映画[えいが]+を:object 見[み]ます:verb"],
    [2, "I only have one week off.", "休[やす]み+は:topic 1週間[いっしゅうかん]:time だけです:verb"],
    [3, "It takes an hour from Osaka to Tokyo by plane.", "~大阪[おおさか]から東京[とうきょう]まで:range ~飛行機[ひこうき]+で:place 1時間[いちじかん]:time かかります:verb"],
  ],
  12: [
    [0, "The party was lively.", "パーティー+は:topic にぎやか:verb でした:verb"],
    [1, "The party was fun.", "パーティー+は:topic 楽[たの]しかった:verb です:verb"],
    [2, "Tokyo has more people than Osaka.", "~東京[とうきょう]+は:topic ~大阪[おおさか]+より:range 人[ひと]+が:subject 多[おお]いです:verb"],
    [3, "Which do you like more, soccer or baseball?", "サッカーと野球[やきゅう]と:with どちら+が:subject 好[す]きですか:verb"],
    [4, "Who's the tallest in your family?", "家族[かぞく]+で:place だれ+が:subject いちばん:owner 背[せ]が高[たか]いですか:verb"],
  ],
  13: [
    [0, "I want this bag, but it's expensive.", "このかばん+が:subject 欲[ほ]しいですが、:clause 高[たか]いです:verb"],
    [1, "I don't want to do anything this weekend.", "~週末[しゅうまつ]+は:topic ~何[なに]+も:also したくないです:verb"],
    [2, "I went to Kyoto to take photos.", "~京都[きょうと]+へ:dir ~写真[しゃしん]を撮[と]りに:point 行[い]きました:verb"],
    [3, "I want to drink something.", "何[なに]か:object 飲[の]み:verb たいです:verb"],
  ],
  14: [
    [1, "Please write your name here.", "~ここ+に:point ~名前[なまえ]+を:object 書[か]いてください:verb"],
    [2, "Please turn right at the traffic lights.", "信号[しんごう]+を:object 右[みぎ]+へ:dir 曲[ま]がってください:verb"],
    [3, "The children are playing in the park.", "~子供[こども]たち+は:topic ~公園[こうえん]+で:place 遊[あそ]んでいます:verb"],
    [4, "Shall I open the window?", "窓[まど]+を:object 開[あ]け:verb ましょうか:verb"],
  ],
  15: [
    [0, "May I smoke here?", "~ここ+で:place ~たばこ+を:object 吸[す]ってもいいですか:verb"],
    [1, "You mustn't play ball here.", "ここ+で:place ボール+で:place 遊[あそ]んではいけません:verb"],
    [2, "I live in Tokyo.", "~私[わたし]+は:topic ~東京[とうきょう]+に:point 住[す]んでいます:verb"],
    [3, "I know that shop.", "~私[わたし]+は:topic ~その店[みせ]+を:object 知[し]っています:verb"],
  ],
  16: [
    [0, "Yesterday I went to the library and borrowed a book.", "昨日[きのう]+は:topic 図書館[としょかん]へ行[い]って、:clause 本[ほん]+を:object 借[か]りました:verb"],
    [1, "Osaka is lively and the food is tasty.", "大阪[おおさか]+は:topic にぎやかで、:clause 食[た]べ物[もの]+が:subject おいしいです:verb"],
    [2, "After work finishes, I'll go for a drink.", "仕事[しごと]が終[お]わってから、:clause 飲[の]みに:point 行[い]きます:verb"],
    [3, "The food in Osaka is tasty.", "大阪[おおさか]+は:topic 食[た]べ物[もの]+が:subject おいしいです:verb"],
    [4, "How do you get to the university?", "~大学[だいがく]+まで:range ~どうやって:owner 行[い]きますか:verb"],
  ],
  17: [
    [1, "Please don't take photos here.", "~ここ+で:place ~写真[しゃしん]+を:object 撮[と]らないでください:verb"],
    [2, "I have to hand in the report by tomorrow.", "~明日[あした]+までに:time ~レポート+を:object 出[だ]さなければなりません:verb"],
    [3, "You don't have to come to the office on Saturday.", "~土曜日[どようび]+は:topic ~会社[かいしゃ]+へ:dir こなくてもいいです:verb"],
    [4, "Please return the book by Friday.", "~金曜日[きんようび]+までに:time ~本[ほん]+を:object 返[かえ]してください:verb"],
  ],
  18: [
    [0, "My hobby is reading books.", "私[わたし]の趣味[しゅみ]+は:topic 本[ほん]を読[よ]むこと:object です:verb"],
    [1, "Mr. Miller can read kanji.", "ミラーさん+は:topic 漢字[かんじ]を読[よ]むこと+が:subject できます:verb"],
    [2, "My hobby is watching movies.", "私[わたし]の趣味[しゅみ]+は:topic 映画[えいが]を見[み]ること:object です:verb"],
    [3, "Before coming to Japan, I studied Japanese.", "日本[にほん]へ来[く]るまえに、:clause 日本語[にほんご]+を:object 勉強[べんきょう]しました:verb"],
  ],
  19: [
    [0, "I've worn a kimono in Japan.", "~日本[にほん]+で:place ~着物[きもの]+を:object 着[き]たことがあります:verb"],
    [1, "I've never been on a plane.", "~私[わたし]+は:topic ~一度[いちど]も:time ~飛行機[ひこうき]+に:point 乗[の]ったことがありません:verb"],
    [2, "At weekends I do things like shopping and eating out with friends.", "週末[しゅうまつ]+は:topic 買[か]い物[もの]をしたり、:clause 友達[ともだち]と食事[しょくじ]をしたりします:verb"],
    [3, "Mr. Wang has become good at Japanese.", "ワンさん+は:topic 日本語[にほんご]+が:subject 上手[じょうず]になりました:verb"],
  ],
  20: [
    [0, "I can play the piano. (plain)", "ピアノ+を:object 弾[ひ]くこと+が:subject できる:verb"],
    [1, "It's hot today, huh. (casual)", "今日[きょう]+は:topic 暑[あつ]い:verb ね:verb"],
    [2, "Did you eat dinner already? (casual)", "~もう:time ~晩[ばん]ご飯[はん]:object 食[た]べた？:verb"],
  ],
  21: [
    [0, "I think Mr. Miller has already gone home.", "ミラーさん+は:topic もう帰[かえ]ったと:clause 思[おも]います:verb"],
    [1, "The teacher said, “There will be a test tomorrow.”", "先生[せんせい]+は:topic 「明日[あした]テストをします」+と:with 言[い]いました:verb"],
    [2, "You're going to the party tomorrow, right?", "明日[あした]+の:owner パーティー+に:point 行[い]くでしょう？:verb"],
    [3, "How about some cake or something?", "ちょっと:owner ケーキでも:object 食[た]べませんか:verb"],
  ],
  22: [
    [0, "The town where Mr. Wang lives is quiet.", "ワンさんが住[す]んでいる:owner 町[まち]+は:topic 静[しず]かです:verb"],
    [1, "I want more time to sleep.", "寝[ね]る:owner 時間[じかん]+が:subject もっと欲[ほ]しいです:verb"],
    [2, "The apartment Mr. Miller lives in is near the station.", "ミラーさんが住[す]んでいる:owner アパート+は:topic 駅[えき]の近[ちか]くです:verb"],
  ],
  23: [
    [0, "When you borrow books at the library, you need a card.", "図書館[としょかん]で本[ほん]を借[か]りるとき、:clause カード+が:subject 要[い]ります:verb"],
    [1, "Turn left at the second set of lights and it's on the right.", "2つ目[め]の信号[しんごう]を左[ひだり]へ曲[ま]がると、:clause 右[みぎ]+に:point あります:verb"],
    [2, "When you cross the road, watch out for cars.", "道[みち]を渡[わた]るとき、:clause 車[くるま]+に:point 気[き]をつけてください:verb"],
  ],
  24: [
    [0, "Ms. Sato gave me some chocolate.", "~佐藤[さとう]さん+が:subject ~私[わたし]+に:point ~チョコレート+を:object くれました:verb"],
    [1, "I read books to my children.", "~私[わたし]+は:topic ~子供[こども]+に:point ~本[ほん]+を:object 読[よ]んであげます:verb"],
    [2, "I had Mr. Santos drive me home.", "~私[わたし]+は:topic ~サントスさん+に:point ~車[くるま]+で:place ~家[うち]+まで:range 送[おく]ってもらいました:verb"],
    [3, "Who came to pick you up at the station?", "~だれ+が:subject ~駅[えき]+まで:range 迎[むか]えに来[き]てくれましたか:verb"],
  ],
  25: [
    [0, "If there's anything you don't understand, ask any time.", "わからないことがあったら、:clause いつでも:time 聞[き]いてください:verb"],
    [1, "Once I turn 60, I want to live in the countryside.", "60歳[ろくじゅっさい]になったら、:clause 田舎[いなか]+に:point 住[す]みたいです:verb"],
    [2, "Even if it's convenient, I don't like this house.", "便利[べんり]でも、:clause この家[いえ]+は:topic 嫌[いや]です:verb"],
    [3, "No matter how many times I call, there's no answer.", "いくら呼[よ]んでも、:clause 返事[へんじ]+が:subject ありません:verb"],
  ],
  26: [
    [0, "Where did you buy it?", "どこ+で:place 買[か]った:verb んですか:verb"],
    [1, "I wrote a letter in Japanese — could you look it over?", "日本語[にほんご]で手紙[てがみ]を書[か]いたんですが、:clause 見[み]て:verb いただけませんか:verb"],
    [2, "I want to get good at Japanese — what should I do?", "日本語[にほんご]が上手[じょうず]になりたいんですが、:clause どうしたら:owner いいですか:verb"],
  ],
  27: [
    [0, "I can make phone calls in Japanese.", "~日本語[にほんご]+で:place ~電話[でんわ]+が:subject できます:verb"],
    [1, "Without glasses, I can't see the letters.", "眼鏡[めがね]をかけないと、:clause 字[じ]+が:subject 見[み]えません:verb"],
    [2, "There's only one egg in the fridge.", "~冷蔵庫[れいぞうこ]+に:point ~卵[たまご]+が:subject 1つしかありません:verb"],
    [3, "I went to Tokyo, but not to Kyoto.", "東京[とうきょう]+には:point 行[い]きましたが、:clause 京都[きょうと]+には:point 行[い]きませんでした:verb"],
  ],
  28: [
    [0, "Please don't watch TV while eating.", "ご飯[はん]を食[た]べながら:clause テレビ+を:object 見[み]ないでください:verb"],
    [1, "My brother swims at the pool every morning.", "~兄[あに]+は:topic ~毎朝[まいあさ]:time ~プール+で:place 泳[およ]いでいます:verb"],
    [2, "I've got no money and no time, so travelling is out of the question.", "お金[かね]もないし、:clause 時間[じかん]もないし、:clause 旅行[りょこう]+は:topic 無理[むり]です:verb"],
  ],
  29: [
    [0, "The road is congested.", "道[みち]+が:subject 込[こ]んで:verb います:verb"],
    [1, "I've already finished reading that book.", "~その本[ほん]+は:topic ~もう:time 読[よ]んでしまいました:verb"],
    [2, "The child broke the toy.", "~子供[こども]+が:subject ~おもちゃ+を:object 壊[こわ]しました:verb"],
  ],
  30: [
    [0, "A poster has been put up on the wall.", "~壁[かべ]+に:point ~ポスター+が:subject はってあります:verb"],
    [1, "Please read the documents before the meeting.", "~会議[かいぎ]+までに:time ~資料[しりょう]+を:object 読[よ]んでおいてください:verb"],
    [2, "I haven't told the manager yet.", "~部長[ぶちょう]+には:point ~まだ:time 話[はな]していません:verb"],
  ],
  31: [
    [1, "I'm planning to have a good rest at home this weekend.", "~週末[しゅうまつ]+は:topic ~家[うち]+で:place ゆっくり休[やす]もうと思[おも]っています:verb"],
    [2, "I don't intend to go anywhere this coming holiday.", "~今度[こんど]の休[やす]み+は:topic ~どこへも:dir 行[い]かないつもりです:verb"],
    [3, "The meeting is scheduled to start at 10.", "~会議[かいぎ]+は:topic ~10時[じゅうじ]+に:point 始[はじ]まる予定[よてい]です:verb"],
  ],
  32: [
    [0, "You have a cold, so you'd better not take a bath today.", "風邪[かぜ]ですから、:clause ~今日[きょう]+は:topic ~お風呂[ふろ]+に:point 入[はい]らないほうがいいです:verb"],
    [1, "This problem is probably hard for children.", "~この問題[もんだい]+は:topic ~子供[こども]+には:point 難[むずか]しいでしょう:verb"],
    [2, "The roads might be crowded this weekend.", "~週末[しゅうまつ]+は:topic ~道[みち]+が:subject 込[こ]むかもしれません:verb"],
  ],
  33: [
    [0, "Study harder.", "もっと:owner 勉強[べんきょう]:verb しろ:verb"],
    [1, "“Kin'en” means you mustn't smoke.", "「禁煙[きんえん]」+は:topic たばこを吸[す]ってはいけないという:owner 意味[いみ]です:verb"],
    [2, "Mr. Miller said he can't attend tomorrow's meeting.", "ミラーさん+は:topic 明日[あした]会議[かいぎ]に出[で]られないと:clause 言[い]っていました:verb"],
  ],
  34: [
    [0, "Please write it the way the teacher said.", "先生[せんせい]が言[い]ったとおりに、:clause 書[か]いて:verb ください:verb"],
    [1, "Please don't eat anything after brushing your teeth.", "歯[は]を磨[みが]いたあとで、:clause 何[なに]+も:also 食[た]べないでください:verb"],
    [2, "On Sunday I didn't go anywhere and rested at home instead.", "日曜日[にちようび]+は:topic どこへも行[い]かないで、:clause 家[いえ]+で:place 休[やす]みました:verb"],
  ],
  35: [
    [0, "If it rains, the match is off.", "雨[あめ]が降[ふ]れば、:clause 試合[しあい]+は:topic 中止[ちゅうし]です:verb"],
    [1, "If it's Japanese food you want, that place is good.", "日本[にほん]料理[りょうり]なら、:clause あの店[みせ]+が:subject いいですよ:verb"],
    [2, "The closer to the station, the higher the rent.", "駅[えき]に近[ちか]ければ:clause 近[ちか]いほど、:clause 家賃[やちん]+が:subject 高[たか]いです:verb"],
  ],
  36: [
    [0, "I write in hiragana so anyone can read it.", "だれでも読[よ]めるように、:clause ひらがな+で:place 書[か]きます:verb"],
    [1, "I can finally make phone calls in Japanese.", "やっと:time 日本語[にほんご]で電話[でんわ]+が:subject できるようになりました:verb"],
    [2, "I try not to eat sweet things.", "甘[あま]いもの+を:object 食[た]べないように:clause しています:verb"],
  ],
  37: [
    [0, "I was invited to a party by a friend.", "~私[わたし]+は:topic ~友達[ともだち]+に:point ~パーティー+に:point 招待[しょうたい]されました:verb"],
    [1, "My manager asked me to go on a business trip.", "~私[わたし]+は:topic ~部長[ぶちょう]+に:point ~出張[しゅっちょう]+を:object 頼[たの]まれました:verb"],
    [2, "English is taught in Japan.", "~日本[にほん]+では:place ~英語[えいご]+が:subject 教[おし]えられています:verb"],
  ],
  38: [
    [0, "Playing with children is fun.", "子供[こども]と遊[あそ]ぶの+は:topic 楽[たの]しい:verb です:verb"],
    [1, "I like drawing pictures.", "私[わたし]+は:topic 絵[え]を描[か]くの+が:subject 好[す]きです:verb"],
    [2, "I didn't know the meeting had been cancelled.", "会議[かいぎ]が中止[ちゅうし]になったの+を:object 知[し]りません:verb でした:verb"],
  ],
  39: [
    [0, "The story was complicated, so I didn't really get it.", "話[はなし]が複雑[ふくざつ]で、:clause よく:owner わかりませんでした:verb"],
    [1, "I couldn't play in the soccer match because of an injury.", "~けが+で:place ~サッカーの試合[しあい]+に:point 出[で]られませんでした:verb"],
    [2, "I'm not feeling well, so may I go home early?", "気分[きぶん]が悪[わる]いので、:clause 早[はや]く:owner 帰[かえ]ってもいいですか:verb"],
  ],
  40: [
    [0, "I don't know what time the meeting ends.", "会議[かいぎ]+が:subject 何時[なんじ]に終[お]わるか、:clause わかりません:verb"],
    [1, "I'm worried whether these clothes suit me.", "この服[ふく]+が:subject 似合[にあ]うかどうか、:clause 心配[しんぱい]です:verb"],
    [2, "May I try these shoes on?", "この靴[くつ]+を:object 履[は]いて:verb みてもいいですか:verb"],
    [3, "How long is this bridge? (lit. what is its length)", "この橋[はし]の長[なが]さ+は:topic 何[なん]メートル:owner ですか:verb"],
  ],
  41: [
    [0, "I received a dictionary from my teacher.", "~私[わたし]+は:topic ~先生[せんせい]+に:point ~辞書[じしょ]+を:object いただきました:verb"],
    [1, "I had my teacher correct my essay.", "~私[わたし]+は:topic ~先生[せんせい]+に:point ~作文[さくぶん]+を:object 直[なお]していただきました:verb"],
    [2, "Could you please tell me the way to the station?", "駅[えき]まで+の:owner 道[みち]+を:object 教[おし]えていただけませんか:verb"],
  ],
  42: [
    [0, "I'm saving money to buy a car.", "車[くるま]を買[か]うために、:clause お金[かね]+を:object 貯[た]めています:verb"],
    [1, "These scissors are used for cutting paper.", "このはさみ+は:topic 紙[かみ]を切[き]るのに:clause 使[つか]います:verb"],
    [2, "This year the snow piled up a whole metre.", "~今年[ことし]+は:topic ~雪[ゆき]+が:subject 1メートルも積[つ]もりました:verb"],
  ],
  43: [
    [0, "It looks like it's going to rain any minute.", "~今[いま]にも:time ~雨[あめ]+が:subject 降[ふ]りそうです:verb"],
    [1, "The children are playing happily.", "子供[こども]たち+は:topic 楽[たの]しそうに:owner 遊[あそ]んでいます:verb"],
    [2, "I'll just go buy some stamps at the post office.", "ちょっと:owner ~郵便局[ゆうびんきょく]+で:place ~切手[きって]+を:object 買[か]って来[き]ます:verb"],
  ],
  44: [
    [0, "Watching too much TV is bad for your eyes.", "テレビを見[み]すぎると、:clause 目[め]+が:subject 悪[わる]くなります:verb"],
    [1, "Laundry doesn't dry easily on rainy days.", "雨[あめ]の日[ひ]+は:topic 洗濯物[せんたくもの]+が:subject 乾[かわ]きにくいです:verb"],
    [2, "Let's tidy up the room.", "部屋[へや]+を:object きれいに:owner しましょう:verb"],
    [3, "Let's make the meeting next Monday.", "~会議[かいぎ]+は:topic ~来週[らいしゅう]の月曜日[げつようび]+に:time します:verb"],
  ],
  45: [
    [0, "If your fever is high, take this medicine.", "熱[ねつ]が高[たか]い場合[ばあい]は、:clause この薬[くすり]+を:object 飲[の]んでください:verb"],
    [1, "Even though we'd made plans, he didn't come.", "約束[やくそく]をしたのに、:clause 彼[かれ]+は:topic 来[き]ませんでした:verb"],
  ],
  46: [
    [0, "I'm in the shower right now, so I'll call you later.", "今[いま]シャワーを浴[あ]びているところですから、:clause 後[あと]で:time 電話[でんわ]します:verb"],
    [1, "I only just cleaned, but the room's already messy.", "掃除[そうじ]したばかりなのに、:clause もう:time 部屋[へや]+が:subject 汚[きたな]いです:verb"],
    [2, "Mr. Tanaka is from Osaka, so he should be able to speak Kansai dialect.", "田中[たなか]さん+は:topic 大阪[おおさか]出身[しゅっしん]ですから、:clause 関西弁[かんさいべん]+が:subject 話[はな]せるはずです:verb"],
  ],
  47: [
    [0, "According to the forecast, it'll get cold tomorrow.", "天気予報[てんきよほう]によると、:clause 明日[あした]+は:topic 寒[さむ]くなるそうです:verb"],
    [1, "Nobody seems to live in this room.", "~この部屋[へや]+には:point ~だれ+も:also 住[す]んでいないようです:verb"],
    [2, "I can smell gas.", "ガス+の:owner におい+が:subject します:verb"],
  ],
  48: [
    [0, "The manager sent his subordinate on a business trip.", "~部長[ぶちょう]+は:topic ~部下[ぶか]+を:object ~出張[しゅっちょう]+に:point 行[い]かせました:verb"],
    [1, "I let my children do what they like.", "~子供[こども]+に:point ~好[す]きなこと+を:object させます:verb"],
    [2, "I don't feel well — could you let me go home early?", "気分[きぶん]が悪[わる]いので、:clause 早[はや]く:owner 帰[かえ]らせていただけませんか:verb"],
  ],
  49: [
    [0, "The manager has already gone home.", "~部長[ぶちょう]+は:topic ~もう:time 帰[かえ]られました:verb"],
    [1, "The teacher has already gone home.", "~先生[せんせい]+は:topic ~もう:time お帰[かえ]りになりました:verb"],
    [2, "I did exactly as the teacher said.", "先生[せんせい]+が:subject おっしゃったとおりに:clause しました:verb"],
  ],
  50: [
    [0, "I'd like to see the teacher.", "先生[せんせい]+に:point お会[あ]い:verb したいんですが:verb"],
    [1, "I'd like to meet the president.", "社長[しゃちょう]+に:point お目[め]にかかり:verb たいんですが:verb"],
    [2, "The restroom is on the 2nd floor.", "お手洗[てあら]い+は:topic 2階[にかい]:point でございます:verb"],
  ],
};
