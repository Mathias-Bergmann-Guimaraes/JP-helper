"""Spots the course's grammar points in a Japanese sentence.

Keys are "lesson.point", the lesson number and the point's place in that lesson in
public/js/lessons.js. Each rule is a list of alternatives, and one alternative is a pattern string
or a tuple of pattern strings that must all match the sentence.

A pattern is consecutive tokens separated by spaces, or "re:" and a regex on the raw sentence. A
token is comma-separated conditions, each with alternatives separated by |:
  s: surface   l: dictionary lemma   p: part of speech   q: sub-class   f: conjugation form (prefix)
  t: conjugation type (prefix). A leading ! negates a condition, * is any token, and a final $
  means the sentence ends there, not counting punctuation or ね・よ.

UNDETECTED lists the points a machine can't tell apart from others. `python analyse.py --test`
checks each rule against its lesson's example sentence.
"""
import re

import fugashi

TAGGER = fugashi.Tagger()

# Set phrases are learned as words, so they shouldn't count as the grammar inside them.
SET_PHRASES = re.compile(
    "おはようございます|ありがとうございま[すし]た?|おめでとうございます|いただきます|ごちそうさま(でした)?"
    "|申し訳ございません|お願いします|お願いいたします|よろしくお願い|こんにちは|こんばんは|お疲れ様でした|すみません|ごめんなさい"
    "|おやすみなさい|はじめまして|行ってきます|いってきます|行ってらっしゃい|いってらっしゃい|いらっしゃいませ"
    "|お邪魔します|おじゃまします|失礼します|失礼しました|なるほど"
)

TE = "s:て|で,q:接続助詞"
V = "p:動詞"
NOUN = "p:名詞|代名詞|接尾辞"
PLAIN_V = "p:動詞,f:終止形|連体形"
QUESTION_WORDS = "何|なに|なん|どこ|だれ|誰|いつ|どう|どれ|どの|どちら|どんな|なぜ|どうして|いくつ|いくら"

RULES = {
    # Lessons 1-5
    "1.0": [("s:は,q:係助詞", f"{NOUN} s:です")],
    "1.1": ["re:(じゃ|では)(ありません|ないです)"],
    "1.2": ["re:(か|か[。？?！!])\\s*$"],
    "1.3": [f"{NOUN} s:も,q:係助詞"],
    "1.4": [f"{NOUN} s:の,q:格助詞 {NOUN}"],
    "2.0": ["s:これ|それ|あれ,p:代名詞"],
    "2.1": ["s:この|その|あの,p:連体詞"],
    "2.2": [f"{NOUN} s:の s:です|でした"],
    "2.3": ["re:^(はい|ええ|いいえ|うん)?[、 ]?そう(です|じゃありません|ではありません)"],
    "2.4": ["re:か[、 ].*か[。？?]?\\s*$"],
    "3.0": ["s:ここ|そこ|あそこ"],
    "3.2": ["s:どこ|どちら"],
    "3.3": ["re:いくら(です|でした|か)"],
    "4.0": ["re:[0-9０-９一二三四五六七八九十何]+時"],
    "4.1": [("s:ます|ませ|まし,p:助動詞", "!re:(じゃ|では)ありません[。？?]?$")],
    "4.2": ["re:([0-9０-９一二三四五六七八九十何]+[時分月年]|[月火水木金土日]曜日)に"],
    "4.3": [f"{NOUN} s:から,q:格助詞", f"{NOUN} s:まで"],
    "4.4": [f"{NOUN} s:と,q:並立助詞|格助詞 {NOUN}"],
    "5.0": ["s:へ|に l:行く|来る|帰る"],
    "5.1": ["s:車|電車|バス|飛行機|自転車|タクシー|新幹線|地下鉄|船 s:で,q:格助詞"],
    "5.2": ["s:友達|友だち|家族|娘|息子|母|父|妹|弟|姉|兄|夫|妻|彼|彼女|一緒|子供|子ども|みんな|皆さん s:と,q:格助詞"],
    "5.3": ["s:いつ"],
    "5.4": ["re:(どこ|どこに|どこへ|何|なに|誰|だれ)も.*(ません|ない)"],
    # Lessons 6-10
    "6.0": ["s:を,q:格助詞"],
    "6.1": [f"{NOUN} s:で,q:格助詞"],
    "6.2": ["re:ませんか"],
    "6.3": ["re:ましょう(?!か)"],
    "7.0": ["s:箸|はし|ペン|鉛筆|スプーン|フォーク|ナイフ|手|はさみ|パソコン|スマホ|携帯|電話 s:で,q:格助詞"],
    "7.1": ["re:[一-龥ァ-ヶ]+語で"],
    "7.2": ["s:を|に l:上げる,p:動詞"],
    "7.3": ["s:を|に l:貰う,p:動詞"],
    "7.4": ["re:もう.*ました"],
    "8.0": ["p:形容詞 s:です", "p:形状詞 s:です"],
    "8.1": ["p:形容詞,f:連体形|終止形 p:名詞", "p:形状詞 s:な p:名詞"],
    "8.2": ["s:とても|あまり|あんまり"],
    "8.3": ["re:どう(です|でした)か"],
    "8.4": ["s:が,q:接続助詞"],
    "9.0": ["s:が s:好き|嫌い|上手|下手|苦手|得意"],
    "9.1": ["s:が l:分かる|有る,p:動詞", "s:が * l:分かる,p:動詞"],
    "9.2": ["s:よく|少し|ちょっと|全然|たくさん|全部|大体|だいたい,!p:形容詞"],
    "9.3": ["s:から,q:接続助詞"],
    "9.4": ["re:どうして|なぜ"],
    "10.0": [("s:に,q:格助詞", "s:が,q:格助詞 * l:有る|居る,p:動詞"), "s:に,q:格助詞 * s:が,q:格助詞 l:有る|居る,p:動詞"],
    "10.1": ["s:に,q:格助詞 l:有る|居る,p:動詞"],
    "10.2": ["s:の s:上|下|中|前|後ろ|横|隣|左|右|そば|近く|外|間"],
    "10.3": [f"{NOUN} s:や,q:並立助詞|副助詞", "s:など"],
    # Lessons 11-15
    "11.0": ["re:[0-9０-９一二三四五六七八九十何]+(つ|人|台|枚|匹|本|冊|個|歳|杯|頭|羽)", "s:一つ|ひとつ|二つ|ふたつ|三つ|みっつ|四つ|よっつ|五つ|いつつ"],
    "11.1": ["re:[0-9０-９一二三四五六七八九十何]+回"],
    "11.2": ["s:だけ"],
    "11.3": ["re:(どのくらい|どれくらい|どのぐらい|どれぐらい)"],
    "12.0": ["re:(?<!ん)でした"],
    "12.1": ["p:形容詞,f:連用形 s:た"],
    "12.2": ["s:より,q:格助詞"],
    "12.3": ["re:(どちら|どっち)が"],
    "12.4": ["s:いちばん|一番"],
    "13.0": ["l:欲しい"],
    "13.1": ["l:たい,p:助動詞"],
    "13.2": ["p:動詞,f:連用形 s:に,q:格助詞 l:行く|来る", "p:名詞,q:普通名詞 s:に,q:格助詞 l:行く|来る,f:連用形 s:ます|まし"],
    "13.3": ["re:(何|なに|どこ|誰|だれ)か[^?？。]"],
    "14.1": [(f"{V},f:連用形 {TE}", "!re:^どうして"), "l:てる"],
    "14.2": [f"{TE} s:ください|下さい"],
    "14.3": [f"{TE} l:居る", "l:てる"],
    "14.4": ["re:ましょうか"],
    "15.0": [f"{TE} s:も s:いい|良い"],
    "15.1": ["re:(て|で)はいけ", "re:(ちゃ|じゃ)(いけ|だめ|ダメ)", "re:(て|で)はだめ"],
    "15.2": [f"l:住む|持つ|結婚|勤める {TE} l:居る", f"l:住む|持つ {TE} l:てる"],
    "15.3": [f"l:知る {TE} l:居る", "l:知る s:ませ", "l:知る l:てる"],
    # Lessons 16-20
    "16.0": [f"{V},f:連用形 {TE} s:、", f"{V},f:連用形 {TE} p:動詞,!l:居る|有る|下さる|置く|仕舞う|見る|来る|行く|貰う|上げる|呉れる"],
    "16.1": ["p:形容詞,f:連用形 s:て", "p:形状詞 s:で,p:助動詞 s:、"],
    "16.2": [f"{TE} s:から"],
    "16.3": ["re:[はも].{1,12}が.{1,8}(い|な)(です|。)"],
    "16.4": ["re:どうやって"],
    "17.0": ["p:動詞,f:未然形 l:ない,p:助動詞"],
    "17.1": ["re:ないで(ください|下さい)"],
    "17.2": ["re:なければ|なきゃ|ないと(いけ|だめ)"],
    "17.3": ["re:なくても"],
    "17.4": ["s:まで s:に,q:格助詞"],
    "18.0": [f"{PLAIN_V} !p:助動詞", f"{PLAIN_V} $"],
    "18.1": ["re:ことが?でき"],
    "18.2": ["re:趣味は.*こと(です|だ)"],
    "18.3": [f"{PLAIN_V} s:前|まえ s:に", f"{NOUN} s:の s:前|まえ s:に"],
    "19.0": ["p:動詞,f:連用形 s:た|だ,p:助動詞"],
    "19.1": ["s:た|だ s:こと s:が|は|も l:有る"],
    "19.2": ["s:たり|だり"],
    "19.3": ["p:形容詞,f:連用形 l:成る", "s:に,q:格助詞|副詞化 l:成る"],
    "20.0": ["p:動詞,f:終止形 $", "p:動詞 s:た|だ,p:助動詞 $", "p:動詞 l:ない,p:助動詞 $"],
    "20.1": ["re:(?<![かがのにはをもてで])だ[。！!よね]*\\s*$"],
    # Lessons 21-25
    "21.0": ["re:(と|って)(思|おも)[いうっわ]"],
    "21.1": ["re:(と|って)(言|い)[いうっわ]"],
    "21.2": ["re:(でしょう|だろう)[？?]"],
    "21.3": [f"{NOUN} s:でも,q:副助詞", f"{NOUN} s:で s:も"],
    "22.0": ["p:動詞,f:連体形 p:名詞,q:普通名詞,!s:こと|事|もの|物|とき|時|ところ|所|まえ|前|あと|後|ため|為|よう|様|ほう|方|つもり|はず|わけ|予定", "s:た|だ,f:連体形 p:名詞,q:普通名詞,!s:こと|事|もの|物|とき|時|ところ|所|まえ|前|あと|後|ため|為|よう|様|ほう|方|つもり|はず|わけ|予定"],
    "22.1": [f"{PLAIN_V} s:時間|約束|用事"],
    "22.2": ["s:が,q:格助詞 * s:た|だ,f:連体形 p:名詞", "s:が,q:格助詞 p:動詞,f:連体形 p:名詞", "s:が,q:格助詞 p:動詞 s:て|で,q:接続助詞 l:居る,f:連体形 p:名詞"],
    "23.0": ["s:とき|時,!q:数詞 !s:に,q:接続助詞", "s:の s:とき|時"],
    "23.1": [f"{PLAIN_V} s:と,q:接続助詞|格助詞 s:、"],
    "23.2": ["s:を,q:格助詞 l:渡る|通る|歩く|散歩|曲がる|飛ぶ|走る"],
    "24.0": ["s:を|が,q:格助詞 l:呉れる,p:動詞"],
    "24.1": [f"{TE} l:上げる"],
    "24.2": [f"{TE} l:貰う"],
    "24.3": [f"{TE} l:呉れる"],
    "25.0": ["s:たら|だら,p:助動詞"],
    "25.2": [(f"{TE} s:も !s:いい|良い", "!re:とっても|について(も)"), "p:形容詞,f:連用形 s:て s:も"],
    "25.3": ["re:いくら.*(ても|でも)"],
    # Lessons 26-30
    "26.0": [f"{PLAIN_V} s:ん|の,q:準体助詞 s:です|だ", "s:た|だ|ない,p:助動詞 s:ん|の,q:準体助詞 s:です|だ", "p:形容詞 s:ん|の,q:準体助詞 s:です|だ", "s:な s:ん|の,q:準体助詞 s:です|だ"],
    "26.1": ["re:(て|で)いただけ(ません|ます)"],
    "26.2": ["re:(たら|だら)(いい|良い)"],
    "27.0": [("l:出来る,p:動詞", "!re:ことが?でき"),
             "l:書ける|読める|話せる|飲める|行ける|買える|使える|作れる|帰れる|泳げる|言える|持てる|会える|歩ける|走れる|歌える|撮れる|乗れる|聞ける|取れる",
             "re:(食べ|見|起き|寝|覚え|教え|来)られ(ます|る|ない|ません)"],
    "27.1": ["l:見える|聞こえる"],
    "27.2": [("s:しか,q:副助詞", "re:(ません|ない)")],
    "28.0": ["s:ながら"],
    "28.1": [(f"{TE} l:居る", "s:毎日|毎朝|毎晩|毎週|いつも|よく")],
    "28.2": ["s:し,q:接続助詞"],
    "29.0": [f"l:開く|閉まる|消える|壊れる|付く|落ちる|割れる|止まる|汚れる|曲がる|切れる|掛かる {TE} l:居る"],
    "29.1": [f"{TE} l:仕舞う", "re:(ちゃ|じゃ)(う|った|います|いました)"],
    "30.0": [f"{TE} l:有る"],
    "30.1": [f"{TE} l:置く", "re:[てで]おき(ます|ました)", "re:とき(ます|ました)$"],
    "30.2": [("s:まだ", "s:て|で l:居る s:ませ")],
    # Lessons 31-35
    "31.0": ["p:動詞,f:意志推量形"],
    "31.1": ["p:動詞,f:意志推量形 s:と l:思う"],
    "31.2": ["s:つもり"],
    "31.3": [f"{PLAIN_V} s:予定", f"{NOUN} s:の s:予定"],
    "32.0": ["re:(ほう|方)が(いい|良い)"],
    "32.1": ["re:(でしょう|だろう)(?![？?])"],
    "32.2": ["re:かも(しれ|知れ)?"],
    "33.0": ["p:動詞,f:命令形,!s:ください|下さい|なさい|いらっしゃい $", "p:動詞,f:命令形,!s:ください|下さい|なさい|いらっしゃい s:、", "p:動詞,f:終止形 s:な,q:終助詞 s:！|!|。"],
    "33.1": ["re:という意味"],
    "33.2": ["re:(と|って)(言|い)って(い|ま)"],
    "34.0": ["re:(とおり|通り)(に|です|だ)"],
    "34.1": ["re:(?<!最)(あと|後)で"],
    "34.2": ["re:ないで(?!(ください|下さい|す|し))"],
    "35.0": [("s:ば,q:接続助詞", "!re:なければ")],
    "35.1": ["s:なら,p:助動詞", "s:なら,q:副助詞"],
    "35.2": ["re:ば.{0,8}ほど"],
    # Lessons 36-40
    "36.0": ["re:(?<![どこそあ]の)(?<!同じ)ように(?!(なり|なっ|なる|し|する))"],
    "36.1": ["re:ように(なり|なっ|なる)"],
    "36.2": ["re:ように(し|する)"],
    "37.0": [("s:に,q:格助詞", "l:れる|られる,p:助動詞", "!re:を")],
    "37.1": [("s:を,q:格助詞", "p:動詞,f:未然形 l:れる|られる,p:助動詞")],
    "37.2": ["p:動詞,t:五段,f:未然形 l:れる,p:助動詞", "p:動詞,t:サ行,f:未然形 l:れる,p:助動詞", ("l:られる,p:助動詞", "re:(年|年前|昔|時代|世紀)")],
    "38.0": [(f"{PLAIN_V} s:の,q:準体助詞 s:は", "!re:(という|って)のは")],
    "38.1": [f"{PLAIN_V} s:の,q:準体助詞 s:が"],
    "38.2": [f"{PLAIN_V} s:の,q:準体助詞 s:を"],
    "39.0": [f"{TE} s:びっくり|安心|困り|困っ|驚き|驚い|うれしい|嬉しい|悲しい|残念", f"{TE} s:、 s:びっくり|安心|困り|困っ|驚き|驚い|うれしい|嬉しい|悲しい|残念"],
    "39.1": ["s:地震|事故|台風|病気|雨|雪|風|火事|怪我|けが s:で,q:格助詞"],
    "39.2": ["s:ので,q:接続助詞", "s:の,q:準体助詞 s:で,p:助動詞 !s:す"],
    "40.0": [f"re:({QUESTION_WORDS}).*か[、 ]?.{{0,8}}(分か|わか|知|教え|聞|調べ|覚え|忘れ)"],
    "40.1": ["re:かどうか"],
    "40.2": [f"{TE} l:見る"],
    "40.3": ["p:形容詞,f:語幹 s:さ", "p:形容詞 s:さ,p:接尾辞"],
    # Lessons 41-45
    "41.0": ["s:を,q:格助詞 s:いただき|いただい|頂き|頂い", "s:を,q:格助詞 s:ください|下さい s:まし|ます"],
    "41.1": ["re:(て|で)(いただ|頂)(き|い)", "re:(て|で)(くださいま|下さいま)"],
    "41.2": ["re:(て|で)(くださいません|下さいません)か"],
    "42.0": ["re:(ため|為)に"],
    "42.1": ["re:のに(使|つか|いい|良い|便利|必要)"],
    "42.2": ["re:[0-9０-９一二三四五六七八九十百千万]+[人個本枚冊台回]も"],
    "43.0": ["p:動詞,f:連用形 s:そう,p:形状詞"],
    "43.1": ["p:形容詞,f:語幹 s:そう", "p:形状詞 s:そう"],
    "43.2": [f"{TE} l:来る"],
    "44.0": ["p:動詞,f:連用形 l:過ぎる", "p:形容詞,f:語幹 l:過ぎる", "p:形状詞 l:過ぎる"],
    "44.1": ["p:動詞,f:連用形 s:やすい|やすく|にくい|にくく|やすかっ|にくかっ"],
    "44.2": ["p:形容詞,f:連用形 l:為る", "p:形状詞,!s:よう|様|そう|みたい s:に l:為る"],
    "44.3": [f"{NOUN} s:に,q:格助詞 s:し s:ます|ました|まし"],
    "45.0": ["re:(場合|ばあい)は?"],
    "45.1": ["s:のに,q:接続助詞", "s:の,q:準体助詞 s:に s:、"],
    # Lessons 46-50
    "46.0": [f"{PLAIN_V} s:ところ|所 s:です|だ", "s:た|だ s:ところ|所 s:です|だ", f"{TE} l:居る s:ところ|所"],
    "46.1": ["s:た|だ s:ばかり"],
    "46.2": ["s:はず|筈"],
    "47.0": [f"{PLAIN_V} s:そう s:です|だ", "s:た|だ,f:終止形|連体形 s:そう s:です|だ", "p:形容詞,f:終止形|連体形 s:そう s:です|だ"],
    "47.1": ["re:(よう|様)(です|でした|だ)", "s:みたい"],
    "47.2": ["s:におい|匂い|臭い|音|声|味 s:が l:為る"],
    "48.0": ["p:動詞,f:未然形 l:せる|させる,p:助動詞"],
    "48.2": ["p:動詞,f:未然形 l:せる|させる,p:助動詞 s:て l:頂く|下さる|貰う"],
    "49.0": [("s:先生|社長|部長|お客様|課長", "l:れる|られる,p:助動詞", "!re:(先生|社長|部長|お客様|課長)に")],
    "49.1": ["s:お,p:接頭辞 p:動詞,f:連用形 s:に l:成る", "re:(?:^|(?<=[、。 をはがにでともへ]))お[一-龥][ぁ-ん]?に(なり|なる|なっ)"],
    "49.2": ["l:いらっしゃる|召し上がる|おっしゃる|仰る|なさる|為さる"],
    "50.0": ["re:(?:^|(?<=[、。 をはがにでともへ]))[おご](?:[一-龥][ぁ-ん]{0,2}|(?:(?![がをはにでと])[ぁ-ん]){1,3})(します|しました|いたします|いたしました)"],
    "50.1": ["l:参る|申す|伺う|拝見|存じる", f"{TE} s:おり"],
    "50.2": ["s:ござい"],
}

# Points with no rule, because nothing on the surface tells them apart from a point that has one.
UNDETECTED = {
    "3.1": "looks the same as N は N です",
    "14.0": "knowing the verb groups isn't something a sentence shows",
    "20.2": "a dropped particle leaves nothing to spot",
    "25.1": "looks the same as 〜たら (if)",
    "27.3": "は for contrast looks the same as the topic は",
    "29.2": "a word-knowledge point, not a pattern",
    "48.1": "looks the same as the causative",
}


class Token:
    __slots__ = ("s", "l", "p", "q", "f", "t", "o")

    def __init__(self, w):
        f = w.feature
        self.s, self.l, self.o = w.surface, f.lemma or w.surface, f.orthBase or w.surface
        self.p, self.q = f.pos1 or "", f.pos2 or ""
        self.f, self.t = f.cForm or "", f.cType or ""


def _cond(c):
    neg = c.startswith("!")
    if neg:
        c = c[1:]
    key, vals = c.split(":", 1)
    vals = vals.split("|")

    def test(tok):
        if key == "s":
            hit = tok.s in vals
        elif key == "l":
            # A lemma may be written in kanji or kana, so the base spelling counts too.
            hit = tok.l in vals or tok.o in vals or tok.l.split("-")[0] in vals
        elif key == "f":
            hit = any(tok.f.startswith(v) for v in vals)
        elif key == "t":
            hit = any(tok.t.startswith(v) for v in vals)
        else:
            hit = getattr(tok, key) in vals
        return hit != neg

    return test


def _token_spec(spec):
    if spec == "*":
        return lambda tok: True
    tests = [_cond(c) for c in spec.split(",")]
    return lambda tok: all(t(tok) for t in tests)


def _pattern(pat):
    negate = pat.startswith("!re:")
    if pat.startswith("re:") or negate:
        rx = re.compile(pat.split(":", 1)[1])
        return lambda text, toks: bool(rx.search(text)) != negate
    parts = pat.split(" ")
    at_end = parts[-1] == "$"
    specs = [_token_spec(s) for s in (parts[:-1] if at_end else parts)]

    def run(text, toks):
        if at_end:
            n = len(toks)
            while n and (toks[n - 1].p == "補助記号" or toks[n - 1].q == "終助詞"):
                n -= 1
            start = n - len(specs)
            return start >= 0 and all(specs[j](toks[start + j]) for j in range(len(specs)))
        for i in range(len(toks) - len(specs) + 1):
            if all(specs[j](toks[i + j]) for j in range(len(specs))):
                return True
        return False

    return run


def _compile(rule):
    alts = []
    for alt in rule:
        parts = alt if isinstance(alt, tuple) else (alt,)
        alts.append([_pattern(p) for p in parts])
    return alts


COMPILED = {k: _compile(v) for k, v in RULES.items()}


def clean(text):
    """Strip readings in brackets like 母(はは), which captions add for learners, and set phrases."""
    text = re.sub(r"[(（][ぁ-ゖー\s]+[)）]", "", text)
    # Captions often break a line in the middle of a word: ありがとうござい ます.
    text = re.sub(r"(?<=[ぁ-ん一-龥ァ-ヶ])[ 　](?=[ぁ-ん一-龥ァ-ヶ])", "", text)
    return SET_PHRASES.sub("", text).strip()


def find_points(sentence):
    text = clean(sentence)
    if not text:
        return []
    toks = [Token(w) for w in TAGGER(text)]
    return [k for k, alts in COMPILED.items() if any(all(p(text, toks) for p in alt) for alt in alts)]
