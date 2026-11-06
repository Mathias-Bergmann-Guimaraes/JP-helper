// "Which one do I use?": grammar that's easy to mix up, side by side, each with a short quiz.
// Drawn at the top of the Patterns tab. patterns: the pattern cards that link here.
// In quiz sentences, {_} is the gap. Each question has one answer that fits the context in `en`.

const COMPARISONS = [
  {
    id: "if", title: "たら・と・ば・なら", name: "Four ways to say “if”", patterns: ["tara", "to"],
    rule: "When in doubt, use たら. It's the only one with almost no restrictions.",
    cols: [
      { ja: "〜たら", when: "One particular if or once. Anything can follow, even a request or a plan.", ex: "駅[えき]に着[つ]い{たら}、電話[でんわ]してください。", en: "Call me once you get to the station." },
      { ja: "〜と", when: "It happens every time: nature, machines, directions. No requests or plans afterwards.", ex: "このボタンを押[お]す{と}、水[みず]が出[で]ます。", en: "If you press this button, water comes out." },
      { ja: "〜ば", when: "Stresses the condition itself: as long as this is true, the result holds.", ex: "安[やす]{ければ}、買[か]います。", en: "If it's cheap, I'll buy it." },
      { ja: "〜なら", when: "Picks up on what was just said, then gives advice or an opinion about it.", ex: "温泉[おんせん]{なら}、箱根[はこね]がいいですよ。", en: "If it's hot springs you want, Hakone is good." },
    ],
    quiz: [
      { s: "駅[えき]に着[つ]{_}、電話[でんわ]してください。", en: "Please call me when you get to the station.", a: "いたら", opts: ["いたら", "くと"], why: "The second half is a request, and 〜と can't be followed by a request. 〜たら can." },
      { s: "2に3を足[た]す{_}、5になります。", en: "If you add 3 to 2, you get 5.", a: "と", opts: ["と", "なら"], why: "Maths always works out the same way, which is exactly what 〜と is for." },
      { s: "友達[ともだち]が来[き]{_}、一緒[いっしょ]に出[で]かけようと思[おも]います。", en: "When my friend comes, I'm thinking of going out together.", a: "たら", opts: ["たら", "ると"], why: "The second half is your own plan, so 〜と doesn't work. Use 〜たら." },
      { s: "A: 京都[きょうと]へ行[い]きたいです。 B: 京都[きょうと]へ行[い]く{_}、新幹線[しんかんせん]が便利[べんり]ですよ。", en: "A: I want to go to Kyoto. B: If you're going to Kyoto, the shinkansen is convenient.", a: "なら", opts: ["なら", "と"], why: "B picks up on what A just said and gives advice. That's 〜なら." },
      { s: "安[やす]{_}、買[か]います。", en: "If it's cheap, I'll buy it.", a: "ければ", opts: ["ければ", "れば"], why: "い-adjectives make the ば-form by swapping い for ければ. れば is for ichidan verbs." },
    ],
  },
  {
    id: "seems", title: "そう・そう・よう", name: "Looks like, I hear, it seems", patterns: ["soulook", "souhear", "youdesu"],
    rule: "Ask how you know: from your eyes (ます-stem + そう), from someone else (plain + そう), or from clues (plain + よう).",
    cols: [
      { ja: "ます-stem + そうです", when: "You can see it coming. It's your own impression from looking.", ex: "雨[あめ]が降[ふ]り{そうです}。", en: "It looks like it's going to rain." },
      { ja: "plain + そうです", when: "You heard or read it, and you're passing it on.", ex: "雨[あめ]が降[ふ]る{そうです}。", en: "I hear it's going to rain." },
      { ja: "plain + ようです", when: "You're working it out from what you've noticed.", ex: "誰[だれ]もいない{ようです}。", en: "It seems nobody's here." },
    ],
    quiz: [
      { s: "空[そら]が暗[くら]いです。雨[あめ]が{_}。", en: "The sky is dark. It looks like it's going to rain.", a: "降[ふ]りそうです", opts: ["降[ふ]りそうです", "降[ふ]るそうです"], why: "You're looking at the sky, so it's your own impression: ます-stem + そうです." },
      { s: "ニュースによると、明日[あした]は雪[ゆき]が{_}。", en: "According to the news, it will snow tomorrow.", a: "降[ふ]るそうです", opts: ["降[ふ]るそうです", "降[ふ]りそうです"], why: "It came from the news, so it's hearsay: plain form + そうです." },
      { s: "電気[でんき]が消[き]えています。誰[だれ]もいない{_}。", en: "The lights are off. It seems nobody's here.", a: "ようです", opts: ["ようです", "そうです"], why: "You've worked it out from a clue, the lights, and nobody told you. That's ようです." },
      { s: "ボタンが取[と]れ{_}。", en: "That button looks like it's about to come off.", a: "そうです", opts: ["そうです", "ようです"], why: "取れ is the ます-stem, and only そうです attaches to it." },
    ],
  },
  {
    id: "purpose", title: "ように・ために", name: "So that vs in order to", patterns: ["youni", "tame"],
    rule: "Could you simply decide to do it? Then ために. If it's a result you can only hope for or work towards, ように.",
    cols: [
      { ja: "〜ために", when: "A goal you choose. It takes verbs you control, like 買う and 行く.", ex: "家[いえ]を買[か]う{ために}、貯金[ちょきん]しています。", en: "I'm saving up to buy a house." },
      { ja: "〜ように", when: "A result you can't simply decide. It takes potential forms, ない-forms, and verbs like わかる.", ex: "忘[わす]れない{ように}、メモします。", en: "I'll write it down so I don't forget." },
    ],
    quiz: [
      { s: "留学[りゅうがく]する{_}、お金[かね]を貯[た]めています。", en: "I'm saving money in order to study abroad.", a: "ために", opts: ["ために", "ように"], why: "Studying abroad is a goal you've chosen, and する is a verb you control." },
      { s: "日本語[にほんご]が話[はな]せる{_}、毎日[まいにち]練習[れんしゅう]します。", en: "I practise every day so that I can speak Japanese.", a: "ように", opts: ["ように", "ために"], why: "話せる is a potential form. Being able isn't something you just decide, so use ように." },
      { s: "忘[わす]れない{_}、メモします。", en: "I'll write it down so I don't forget.", a: "ように", opts: ["ように", "ために"], why: "Forgetting isn't something you control, so 忘れない takes ように." },
      { s: "試験[しけん]を受[う]ける{_}、東京[とうきょう]へ行[い]きます。", en: "I'm going to Tokyo in order to take an exam.", a: "ために", opts: ["ために", "ように"], why: "Taking the exam is your own chosen goal, so use ために." },
    ],
  },
  {
    id: "state", title: "てある・ている", name: "Done on purpose vs just is", patterns: ["tearu", "teiru"],
    rule: "てある points to someone who did it on purpose. ている (with a verb that doesn't take を) only describes how things are.",
    cols: [
      { ja: "を-verb + てあります", when: "Someone did this deliberately, and the result is still there.", ex: "窓[まど]が開[あ]けて{あります}。", en: "The window has been opened (on purpose)." },
      { ja: "が-verb + ています", when: "Just how things are right now. No one is implied.", ex: "窓[まど]が開[あ]いて{います}。", en: "The window is open." },
    ],
    quiz: [
      { s: "部屋[へや]の空気[くうき]を入[い]れ替[か]えるために、窓[まど]が{_}。", en: "The window has been opened to air the room.", a: "開[あ]けてあります", opts: ["開[あ]けてあります", "開[あ]いています"], why: "“To air the room” means someone did it on purpose, so use the を-verb 開ける + てある." },
      { s: "あれ？ 誰[だれ]もいないのに、電気[でんき]が{_}。", en: "Huh? Nobody's here, but the lights are on.", a: "ついています", opts: ["ついています", "つけてあります"], why: "You're just describing what you see, and you don't know why. That's ている." },
      { s: "壁[かべ]に地図[ちず]が{_}。", en: "A map has been put up on the wall.", a: "貼[は]ってあります", opts: ["貼[は]ってあります", "貼[は]っています"], why: "貼る takes を, and someone put it there deliberately. With が, 貼っています doesn't work." },
      { s: "道[みち]に財布[さいふ]が{_}。", en: "There's a wallet lying on the road.", a: "落[お]ちています", opts: ["落[お]ちています", "落[お]としてあります"], why: "Nobody left it there on purpose. It just fell, so use the が-verb 落ちる + ている." },
    ],
  },
  {
    id: "favours", title: "あげる・もらう・くれる", name: "Who does the favour for whom", patterns: ["teageru", "temorau", "tekureru"],
    rule: "Find the subject and the direction. Is the favour leaving you, or coming to you, and who's the subject?",
    cols: [
      { ja: "〜てあげる", when: "You (or your side) do it for someone else.", ex: "妹[いもうと]に本[ほん]を読[よ]んで{あげました}。", en: "I read a book to my little sister." },
      { ja: "〜てもらう", when: "You receive it. You're the subject, and the helper takes に.", ex: "友達[ともだち]に手伝[てつだ]って{もらいました}。", en: "I had a friend help me." },
      { ja: "〜てくれる", when: "It comes to you. The helper is the subject and takes が.", ex: "友達[ともだち]が手伝[てつだ]って{くれました}。", en: "A friend helped me." },
    ],
    quiz: [
      { s: "母[はは]が晩[ばん]ご飯[はん]を作[つく]って{_}。", en: "My mother made dinner for me.", a: "くれました", opts: ["くれました", "もらいました", "あげました"], why: "The helper is marked with が and the favour comes to you. That's くれる." },
      { s: "友達[ともだち]に写真[しゃしん]を撮[と]って{_}。", en: "I had a friend take a photo for me.", a: "もらいました", opts: ["もらいました", "くれました", "あげました"], why: "The helper is marked with に, so you're the receiver. That's もらう." },
      { s: "弟[おとうと]に宿題[しゅくだい]を教[おし]えて{_}。", en: "I taught my little brother his homework.", a: "あげました", opts: ["あげました", "もらいました", "くれました"], why: "The favour goes from you to someone else, so use あげる." },
      { s: "先生[せんせい]が作文[さくぶん]を直[なお]して{_}。", en: "The teacher corrected my essay for me.", a: "くれました", opts: ["くれました", "もらいました", "あげました"], why: "先生が marks the helper as the subject, and it comes to you, so use くれる." },
    ],
  },
  {
    id: "keigo", title: "尊敬語[そんけいご]・謙譲語[けんじょうご]", name: "Raising them vs lowering yourself", patterns: [],
    rule: "Who's doing the action? Someone you respect gets 尊敬語. You, or your side, get 謙譲語.",
    cols: [
      { ja: "尊敬語[そんけいご] (respectful)", when: "Lifts up the person doing the action. Never use it about yourself.", ex: "先生[せんせい]はコーヒーを{召[め]し上[あ]がります}。", en: "The teacher will have coffee." },
      { ja: "謙譲語[けんじょうご] (humble)", when: "Lowers yourself as the one doing it. Never use it about someone you respect.", ex: "私[わたし]はコーヒーを{いただきます}。", en: "I'll have coffee." },
    ],
    quiz: [
      { s: "先生[せんせい]は何[なに]を{_}か。", en: "What will the teacher have to eat?", a: "召[め]し上[あ]がります", opts: ["召[め]し上[あ]がります", "いただきます"], why: "The teacher is the one eating, so lift them up with 尊敬語." },
      { s: "私[わたし]は朝[あさ]ご飯[はん]を{_}。", en: "I had breakfast.", a: "いただきました", opts: ["いただきました", "召[め]し上[あ]がりました"], why: "You're the one eating, so lower yourself with 謙譲語." },
      { s: "田中[たなか]と{_}。", en: "My name is Tanaka.", a: "申[もう]します", opts: ["申[もう]します", "おっしゃいます"], why: "You're talking about yourself, so use 謙譲語: 申す." },
      { s: "お名前[なまえ]は何[なん]と{_}か。", en: "What is your name?", a: "おっしゃいます", opts: ["おっしゃいます", "申[もう]します"], why: "You're asking about the other person, so use 尊敬語: おっしゃる." },
      { s: "荷物[にもつ]を{_}。", en: "Let me carry your bag.", a: "お持[も]ちします", opts: ["お持[も]ちします", "お持[も]ちになります"], why: "You're the one carrying it, so use the humble form: お + ます-stem + します." },
    ],
  },
];

const compareUI = { id: null, deck: [], score: 0, total: 0, backY: null };

const compareCardHTML = () => `
  <div class="card cmp-card" id="cmpCard">
    <h2>Which one do I use?</h2>
    <p class="muted small">The ones that are easy to mix up, side by side, with a short quiz.</p>
    <div class="chips">
      ${COMPARISONS.map((c) => `<button class="chip" data-cmp="${c.id}" lang="ja">${ruby(c.title)}</button>`).join("")}
    </div>
    <div id="cmpBody"></div>
    <button class="btn cmp-back" id="cmpBack" hidden></button>
  </div>`;

function showCompare(id) {
  const same = compareUI.id === id;
  compareUI.id = same ? null : id; // a second click on the same chip closes it
  $$("#cmpCard [data-cmp]").forEach((b) => b.classList.toggle("active", b.dataset.cmp === compareUI.id));
  const body = $("#cmpBody");
  if (same) { body.innerHTML = ""; return; }
  track("explore.patterns");
  const c = COMPARISONS.find((x) => x.id === id);
  Object.assign(compareUI, { deck: [], score: 0, total: 0 });
  body.innerHTML = `
    <h3 class="cmp-name">${c.name}</h3>
    <div class="cmp-cols">
      ${c.cols.map((k) => `
        <div class="cmp-col">
          <div class="cmp-ja" lang="ja">${ruby(k.ja)}</div>
          <p class="small">${k.when}</p>
          <div class="cmp-ex" lang="ja">${rich(k.ex)}</div>
          <div class="muted small">${k.en}</div>
        </div>`).join("")}
    </div>
    <div class="tip" style="--c:var(--accent)"><b>Rule of thumb</b> ${c.rule}</div>
    <div class="cmp-quiz">
      <div class="scorebar"><span>Score <b id="cmpScore">0 / 0</b></span></div>
      <div id="cmpQ"></div>
      <div class="q-actions"><button class="btn primary" id="cmpNext" hidden>Next question →</button></div>
    </div>`;
  $("#cmpNext").onclick = () => nextCompareQ(c);
  nextCompareQ(c);
}

function nextCompareQ(c) {
  if (!compareUI.deck.length) compareUI.deck = shuffle(c.quiz.slice());
  const q = compareUI.deck.pop();
  const [before, after] = q.s.split("{_}");
  $("#cmpNext").hidden = true;
  askIn($("#cmpQ"), {
    kind: "Pick the one that fits",
    prompt: `<div class="q-sentence" lang="ja">${ruby(before)}<span class="blank">？</span>${ruby(after)}</div><div class="q-en">${q.en}</div>`,
    options: shuffle(q.opts.slice()).map((o) => ({ html: ruby(o), correct: o === q.a })),
    reveal: (box) => {
      const b = $(".blank", box);
      b.innerHTML = ruby(q.a);
      b.classList.add("filled");
      b.style.setProperty("--c", "var(--accent)");
    },
    feedback: () => `<p lang="en">${q.why}</p>`,
  }, (ok, b) => {
    track("quiz.patterns");
    compareUI.total++;
    if (ok) { compareUI.score++; addXP(XP.practice, b); }
    $("#cmpScore").textContent = `${compareUI.score} / ${compareUI.total}`;
    $("#cmpNext").hidden = false;
    $("#cmpNext").focus({ preventScroll: true });
  });
}

// Jump to the comparisons, leaving a button that goes back to where you were.
// label: what the button calls that place, as HTML. id: the comparison to open, if any.
function jumpToCompare(label, id) {
  compareUI.backY = scrollY;
  if (id && compareUI.id !== id) showCompare(id);
  const back = $("#cmpBack");
  back.innerHTML = `← Back to ${label}`;
  back.hidden = false;
  scrollBelowBar($("#cmpCard"));
}

function hideCompareBack() {
  compareUI.backY = null;
  $("#cmpBack").hidden = true;
}

function wireCompareBack() {
  $("#cmpBack").onclick = () => {
    const y = compareUI.backY;
    hideCompareBack();
    window.scrollTo({ top: y });
  };
  // Scrolled away from the comparisons by hand, or left the tab: the button has done its job.
  new IntersectionObserver(([e]) => { if (!e.isIntersecting) hideCompareBack(); }).observe($("#cmpCard"));
}
