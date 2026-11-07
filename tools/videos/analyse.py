"""Finds videos and podcasts with limited grammar and writes public/js/videos-data.js for the Listen tab.

  pip install -r requirements.txt
  python analyse.py --test                 check the grammar rules on the lessons' own examples
  python analyse.py --gather               look up candidate videos and download their captions
  python analyse.py --podcasts             look up podcast episodes and download their transcripts
  python analyse.py --build                write public/js/videos-data.js from what was downloaded
  python analyse.py --sample 37.2          show caption lines where a rule fired, to judge it
  python analyse.py --songs                write public/js/songs-data.js from songs.json
  python analyse.py --transcripts          save the listed videos' captions for their transcript panels

Captions are kept only in .cache (not committed). The site's data file holds grammar points, counts
and timestamps, and no caption text. For videos, only captions written by people are used, since
YouTube's automatic ones have no reliable sentence breaks and get a lot of grammar words wrong.

Podcasts are the exception: the only transcripts most feeds offer are machine-made ones, listed with
a <podcast:transcript> tag, so the tab says so on those episodes. Episodes without a transcript are
skipped, and no audio is downloaded. The tab plays it from the podcast's own host.

Songs are separate: songs.json lists them, and --songs finds each one's video and LRCLIB entry
(saving both ids back to songs.json), then spots the grammar in the lyrics. Lyrics are only held in
memory for that and are never saved. The tab fetches them from LRCLIB when a member opens a song.

Transcripts work the same way where they can. A podcast episode's is the one its feed links to,
which the member's browser loads from the podcast's host, so videos-data.js holds only its address.
A video's is its human-written YouTube captions, which a browser can't read from another site, so
--transcripts saves them in data/transcripts (not committed, like the rest of data/) and the server
hands them to members only. It also fills in the podcasts' transcript addresses in videos-data.js.
"""
import argparse
import hashlib
import html
import io
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from grammar_rules import RULES, UNDETECTED, find_points

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
CACHE = HERE / ".cache"
OUT = ROOT / "public" / "js" / "videos-data.js"
SONGS_IN = HERE / "songs.json"
SONGS_OUT = ROOT / "public" / "js" / "songs-data.js"
TRANSCRIPTS = ROOT / "data" / "transcripts"
LRCLIB = "https://lrclib.net/api"

# Where candidates come from: channel video lists and searches. Titles decide nothing on their own;
# a video's place in the tab comes from its captions.
SOURCES = [
    ("https://www.youtube.com/channel/UCdZHET-9_Comx6UaVTSETiQ/videos", 120),  # Nihongo no Jikan
    ("https://www.youtube.com/channel/UC_lynzl0m1QQD3ggIDgYCEw/videos", 80),  # Akiko Japanese Conversations
    ("ytsearch40:complete beginner japanese comprehensible input", 40),
    ("ytsearch60:Complete Beginner Japanese Comprehensible Input picture talk", 60),
    ("ytsearch40:Japanese listening practice with a story beginner level", 40),
    ("ytsearch40:absolute beginner japanese listening slow easy", 40),
    ("ytsearch40:JLPT N5 japanese listening practice story", 40),
    ("ytsearch40:JLPT N4 japanese listening practice", 40),
    ("ytsearch40:JLPT N3 japanese listening practice comprehensible input", 40),
    ("ytsearch30:やさしい日本語 聞き取り 初級", 30),
    ("ytsearch30:やさしい日本語 ニュース 中級 聴解", 30),
]
# Podcasts for learners of Japanese whose feeds link to transcripts.
PODCASTS = [
    "https://anchor.fm/s/1fe5323c/podcast/rss",  # 日本語の聴解のためのPodcast
    "https://anchor.fm/s/412c0ec/podcast/rss",  # AmaoJapan やさしい日本語
    "https://anchor.fm/s/1089c66f8/podcast/rss",  # AoiのSlow Japanese Podcast
    "https://anchor.fm/s/dc21a3a4/podcast/rss",  # ゆっくり日本語ポッドキャスト
    "https://anchor.fm/s/11536c2a0/podcast/rss",  # Yumiko's Japanese Lesson from Lyon
    "https://api.substack.com/feed/podcast/8896432.rss",  # MIKI senseiの にほんごラジオ
    "https://feed.podbean.com/easyjapanese/feed.xml",  # EASY JAPANESE PODCAST
]
MIN_SECONDS, MAX_SECONDS = 120, 1500
PER_CHANNEL = 8  # no channel may fill the tab
PER_SHOW = 15  # higher, as far fewer podcasts have transcripts
MIN_SENTENCES = 15
JA_SPACE = re.compile(r"(?<=[ぁ-んァ-ヶー一-龥、。])[ \u3000]+(?=[ぁ-んァ-ヶー一-龥、。？！])")
MAX_SENTENCE = 45  # characters, for captions that have no punctuation
COVER = 0.9  # a video's level: the lesson that covers this share of its sentences


def ytdlp_list(url, limit):
    exe = Path(sys.executable).parent / "yt-dlp"
    out = subprocess.run(
        [str(exe), "--flat-playlist", "--playlist-end", str(limit), "--ignore-errors",
         "--print", "%(id)s	%(duration)s	%(channel,uploader,playlist_channel,playlist_uploader)s	%(title)s", url],
        capture_output=True, text=True, encoding="utf-8", errors="replace", env={**os.environ, "PYTHONUTF8": "1"},
    )
    rows = []
    for line in out.stdout.splitlines():
        p = line.split("\t")
        if len(p) == 4 and p[1].replace(".", "").isdigit():
            rows.append({"id": p[0], "seconds": int(float(p[1])), "channel": p[2].replace("_", " "), "title": p[3]})
    return rows


def gather():
    from youtube_transcript_api import YouTubeTranscriptApi

    api = YouTubeTranscriptApi()
    CACHE.mkdir(exist_ok=True)
    seen = {}
    for url, limit in SOURCES:
        rows = ytdlp_list(url, limit)
        print(f"{len(rows):4} from {url}")
        for r in rows:
            if MIN_SECONDS <= r["seconds"] <= MAX_SECONDS:
                seen.setdefault(r["id"], r)
    print(len(seen), "candidates of a usable length")
    for i, r in enumerate(seen.values()):
        path = CACHE / f"{r['id']}.json"
        if path.exists():  # the captions are kept, while the title and channel may have changed
            old = json.loads(path.read_text(encoding="utf-8"))
            path.write_text(json.dumps({**old, **r}, ensure_ascii=False), encoding="utf-8")
            continue
        download_captions(api, r, path, i)
        if i % 25 == 0:
            print(" ", i, "checked")


def download_captions(api, r, path, done):
    """Saves the video's human-written Japanese captions (None when it has none) into its cache file."""
    try:
        found = [t for t in api.list(r["id"]) if t.language_code.startswith("ja") and not t.is_generated]
        r["captions"] = [[round(s.start, 1), s.text] for s in found[0].fetch()] if found else None
    except Exception as e:
        # A block from YouTube must stop the run. Saving it would mark every video as captionless.
        if "IpBlocked" in type(e).__name__ or "RequestBlocked" in type(e).__name__:
            sys.exit(f"YouTube blocked the requests after {done} videos. Run again later; it carries on from here.")
        r["captions"] = None
    path.write_text(json.dumps(r, ensure_ascii=False), encoding="utf-8")
    time.sleep(1.5)


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "bunpo-listen-tab/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def seconds_of(text):
    parts = [float(p) for p in text.strip().split(":")]
    return int(sum(p * 60 ** i for i, p in enumerate(reversed(parts))))


def parse_srt(text):
    """SRT into [[start seconds, line]]. Machine transcripts put a space after each character."""
    rows = []
    for block in re.split(r"\n\s*\n", text.replace("\r", "")):
        m = re.search(r"(\d+):(\d+):(\d+)[,.]\d+ -->", block)
        if m:
            line = " ".join(block[m.end():].split("\n")[1:])
            rows.append([int(m[1]) * 3600 + int(m[2]) * 60 + int(m[3]), JA_SPACE.sub("", line).strip()])
    return rows


def feed_episodes(feed, lo, hi, need_transcript=True):
    """A feed's playable episodes of a usable length, newest first as feeds list them."""
    tag = lambda name, item: (re.search(rf"<{name}[^>]*>(.*?)</{name}>", item, re.S) or [None, ""])[1]
    text = lambda raw: html.unescape(re.sub(r"<!\[CDATA\[|\]\]>", "", raw)).strip()
    head, *items = fetch(feed).split("<item")
    show = text(tag("title", head))
    art = re.search(r'<itunes:image[^>]*href="(https://[^"]+)"', head)
    for item in items:
        transcript = re.search(r'<podcast:transcript[^>]*url="([^"]+)"[^>]*(?:srt|subrip)', item)
        audio = re.search(r'<enclosure[^>]*url="(https://[^"]+)"', item)
        length = text(tag("itunes:duration", item))
        if not (audio and re.fullmatch(r"[\d:]+", length)) or (need_transcript and not transcript):
            continue
        seconds = seconds_of(length)
        if not lo <= seconds <= hi:
            continue
        guid = text(tag("guid", item)) or audio[1]
        link = text(tag("link", item))
        yield {
            "id": "p" + hashlib.md5(guid.encode()).hexdigest()[:11], "kind": "audio", "seconds": seconds,
            "channel": show, "title": text(tag("title", item)), "audio": html.unescape(audio[1]),
            "art": html.unescape(art[1]) if art else "", "link": link if link.startswith("https://") else "",
            "transcript": html.unescape(transcript[1]) if transcript else "",
        }


def gather_podcasts():
    CACHE.mkdir(exist_ok=True)
    for feed in PODCASTS:
        got = 0
        for ep in feed_episodes(feed, MIN_SECONDS, MAX_SECONDS):
            path = CACHE / f"{ep['id']}.json"
            if path.exists():
                continue
            try:
                ep["captions"] = parse_srt(fetch(ep["transcript"]))
            except OSError:
                continue
            path.write_text(json.dumps(ep, ensure_ascii=False), encoding="utf-8")
            got += 1
            time.sleep(0.5)
        print(f"{got:4} new episodes from {feed}")


def sentences(captions):
    """Join caption lines, then cut at sentence ends. Each sentence keeps the time it starts.

    Plenty of captions have no punctuation, and one run-on "sentence" would seem to need every
    lesson at once. So a line break also ends one once it's long, and very long ones split at spaces.
    """
    out, buf, start = [], "", None

    def flush(text, t):
        text = text.strip()
        pieces = re.split(r"[ 　]+", text) if len(text) > MAX_SENTENCE else [text]
        out.extend((t, p) for p in pieces if p)

    for t, text in captions:
        text = re.sub(r"\[[^\]]*\]|♪", "", text).replace("\n", " ").strip()
        if not text:
            continue
        if start is None:
            start = t
        buf += text
        parts = re.split(r"(?<=[。？！?!])", buf)
        for p in parts[:-1]:
            flush(p, start)
            start = t
        buf = parts[-1]
        if not buf or len(buf) >= MAX_SENTENCE:
            flush(buf, start)
            buf, start = "", None
    flush(buf, start)
    return out


def japanese(s):
    return len(re.findall(r"[ぁ-んァ-ヶ一-龥]", s)) >= len(s) * 0.4 and len(re.findall(r"[ぁ-ん]", s)) > 0


def analyse(video):
    sents = [(t, s) for t, s in sentences(video["captions"]) if japanese(s)]
    points, levels, chars = {}, {}, 0
    for t, s in sents:
        chars += len(s)
        hits = find_points(s)
        top = 0
        for k in hits:
            top = max(top, int(k.split(".")[0]))
            p = points.setdefault(k, {"n": 0, "t": []})
            p["n"] += 1
            if len(p["t"]) < 3 and (not p["t"] or t - p["t"][-1] > 20):
                p["t"].append(int(t))
        levels[top] = levels.get(top, 0) + 1
    return sents, points, levels, chars


def embeddable(path, v):
    """YouTube's oEmbed answers with an error for a video that can't play on other sites."""
    if "embed" not in v:
        url = "https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=" + v["id"]
        try:
            with urllib.request.urlopen(url, timeout=15) as r:
                v["embed"] = r.status == 200
        except urllib.error.HTTPError:
            v["embed"] = False
        path.write_text(json.dumps(v, ensure_ascii=False), encoding="utf-8")
    return v["embed"]


def level_for(levels, total, share):
    got = 0
    for n in sorted(levels):
        got += levels[n]
        if got / total >= share:
            return n
    return 50


def build():
    videos, skipped = [], {"no captions": 0, "too few sentences": 0}
    for path in sorted(CACHE.glob("*.json")):
        v = json.loads(path.read_text(encoding="utf-8"))
        if not v.get("captions"):
            skipped["no captions"] += 1
            continue
        all_lines = sentences(v["captions"])
        sents, points, levels, chars = analyse(v)
        if len(sents) < len(all_lines) * 0.7:
            skipped["not mostly Japanese"] = skipped.get("not mostly Japanese", 0) + 1
            continue
        minutes = v["seconds"] / 60
        if len(sents) < MIN_SENTENCES or chars / minutes < 15:  # too little speech was captioned
            skipped["too few sentences"] += 1
            continue
        if v.get("kind") != "audio" and not embeddable(path, v):
            skipped["can't be embedded"] = skipped.get("can't be embedded", 0) + 1
            continue
        videos.append({
            "id": v["id"], "title": v["title"], "channel": v["channel"], "seconds": v["seconds"],
            "sentences": len(sents), "cpm": round(chars / minutes), "level": level_for(levels, len(sents), COVER),
            **({"kind": "audio", "audio": v["audio"], "art": v["art"], "link": v["link"], "transcript": v["transcript"]}
               if v.get("kind") == "audio" else {}),
            "levels": {str(k): levels[k] for k in sorted(levels)},
            "points": {k: [p["n"], p["t"]] for k, p in sorted(points.items(), key=lambda x: [int(n) for n in x[0].split(".")])},
        })
    # The easiest videos first within each level, then at most PER_CHANNEL from a channel per band,
    # so the list has breadth across the course.
    videos.sort(key=lambda v: (v["level"], len(v["points"]), v["cpm"]))
    bands = [(1, 14), (15, 25), (26, 37), (38, 50)]
    kept = []
    for lo, hi in bands:
        counts = {}
        for v in videos:
            cap = PER_SHOW if v.get("kind") == "audio" else PER_CHANNEL
            if lo <= v["level"] <= hi and counts.get(v["channel"], 0) < cap:
                counts[v["channel"]] = counts.get(v["channel"], 0) + 1
                kept.append(v)
    print(f"{len(videos)} usable, {len(kept)} kept; skipped {skipped}")
    for lo, hi in bands:
        band = [v for v in kept if lo <= v["level"] <= hi]
        print(f"  lessons {lo}-{hi}: {len(band)}, {sum(v.get('kind') == 'audio' for v in band)} of them podcasts")
    write_videos(kept)


def write_videos(kept):
    head = ("// Written by tools/videos/analyse.py, so don't edit it by hand. Grammar found in each video's\n"
            "// human-written captions: points are \"lesson.point\" keys from lessons.js with [count, [seconds…]],\n"
            "// and levels counts sentences by the highest lesson each one needs. No caption text is stored: a\n"
            "// podcast's transcript is only its address, and videos' are in data/transcripts on the server.\n")
    body = json.dumps(kept, ensure_ascii=False, separators=(",", ":")).replace('},{"id"', '},\n{"id"')
    OUT.write_text(f"{head}const VIDEOS = {body};\nconst VIDEOS_UNDETECTED = {json.dumps(sorted(UNDETECTED))};\n", encoding="utf-8")
    print("wrote", OUT, OUT.stat().st_size // 1024, "KB")


def read_videos():
    text = OUT.read_text(encoding="utf-8")
    return json.loads(text[text.index("const VIDEOS = ") + 15:text.index(";\nconst VIDEOS_UNDETECTED")])


def transcripts(links_only=False):
    """Podcast transcript addresses into videos-data.js, then each listed video's captions into data/transcripts.

    Uses the captions --gather saved in .cache and downloads only missing ones, so it works on a fresh
    checkout too. Each file is [[seconds, sentence], …], cut into sentences as the grammar count cuts them.
    """
    videos = read_videos()
    links = {}
    for feed in PODCASTS:
        try:
            links.update((ep["id"], ep["transcript"]) for ep in feed_episodes(feed, MIN_SECONDS, MAX_SECONDS))
        except OSError as e:
            print("FAILED   ", feed, type(e).__name__)
    pods = [v for v in videos if v.get("kind") == "audio"]
    for v in pods:
        if links.get(v["id"]):
            v["transcript"] = links[v["id"]]
    write_videos(videos)
    print(f"{sum(bool(v.get('transcript')) for v in pods)} of {len(pods)} podcast episodes have a transcript address")
    if links_only:
        return

    CACHE.mkdir(exist_ok=True)
    TRANSCRIPTS.mkdir(parents=True, exist_ok=True)
    api = None
    yt = [v for v in videos if not v.get("kind")]
    saved = 0
    for i, v in enumerate(yt):
        path = CACHE / f"{v['id']}.json"
        cached = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
        if "captions" not in cached:
            if api is None:
                from youtube_transcript_api import YouTubeTranscriptApi
                api = YouTubeTranscriptApi()
            cached = {**cached, "id": v["id"], "title": v["title"], "channel": v["channel"], "seconds": v["seconds"]}
            download_captions(api, cached, path, i)
        if not cached.get("captions"):
            print("NO CAPTIONS", v["id"], v["title"])
            continue
        lines = [[round(t, 1), s] for t, s in sentences(cached["captions"])]
        (TRANSCRIPTS / f"{v['id']}.json").write_text(json.dumps(lines, ensure_ascii=False), encoding="utf-8")
        saved += 1
    print(f"saved {saved} of {len(yt)} video transcripts in {TRANSCRIPTS}")


def lrc_lines(text):
    """[[seconds, line], …] from LRC text. Each line ends a sentence, as lyrics rarely have punctuation."""
    out = []
    for m in re.finditer(r"^\[(\d+):(\d+(?:\.\d+)?)\](.*)$", text or "", re.M):
        if m[3].strip():
            out.append([int(m[1]) * 60 + float(m[2]), m[3].strip() + "。"])
    return out


def lrclib_entry(song, seconds):
    """The song's pinned entry, or else the synced Japanese one nearest the video's length."""
    if song.get("lrc"):
        return json.loads(fetch(f"{LRCLIB}/get/{song['lrc']}"))
    artist = song.get("lookup", song["artist"])
    title = song.get("lookup_title", song["title"])
    found = json.loads(fetch(f"{LRCLIB}/search?" + urllib.parse.urlencode({"track_name": title, "artist_name": artist})))
    if not any(e.get("syncedLyrics") for e in found):
        found = json.loads(fetch(f"{LRCLIB}/search?" + urllib.parse.urlencode({"q": f"{artist} {title}"})))

    def is_japanese(e):
        lines = lrc_lines(e.get("syncedLyrics"))
        return lines and sum(japanese(l) for _, l in lines) >= len(lines) * 0.5

    found = [e for e in found if not re.search(r"live|ライブ", e.get("trackName") or "", re.I)] or found
    return min(filter(is_japanese, found), key=lambda e: abs((e.get("duration") or 0) - seconds), default=None)


def can_embed(video_id):
    url = "https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=" + video_id
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            return r.status == 200
    except urllib.error.HTTPError:
        return False


def find_video(song):
    """The artist's own upload that can play on other sites, preferring the full music video."""
    names = [song["artist"], song.get("lookup", song["artist"]), *song.get("aliases", [])]
    fold = lambda s: re.sub(r"[\s『』.]", "", s).lower()
    rows = ytdlp_list(f"ytsearch12:{song.get('lookup', song['artist'])} {song['title']} MV", 12)
    rows = [r for r in rows if 90 <= r["seconds"] <= 480 and any(fold(n) in fold(r["channel"]) for n in names)]

    def score(r):
        title = r["title"].lower()
        odd = re.search(r"live|acoustic|ver\.|short|teaser|trailer|弾き語り|歌ってみた|cover|カバー|lyric|リリック|tv size|ライブ", title)
        mv = re.search(r"mv|music video|ミュージックビデオ|official", title)
        return (fold(song["title"]) in fold(r["title"]), not odd, bool(mv))

    for r in sorted(rows, key=score, reverse=True):
        if can_embed(r["id"]):
            return r
    return None


def video_seconds(video_id):
    out = subprocess.run(
        [str(Path(sys.executable).parent / "yt-dlp"), "--skip-download", "--print", "%(duration)s", f"https://www.youtube.com/watch?v={video_id}"],
        capture_output=True, text=True, encoding="utf-8", errors="replace", env={**os.environ, "PYTHONUTF8": "1"},
    )
    return int(float(out.stdout.split()[0]))


def songs():
    wanted = json.loads(SONGS_IN.read_text(encoding="utf-8"))
    kept = []
    for song in wanted:
        name = f"{song['artist']} - {song['title']}"
        try:
            if not song.get("yt"):
                found = find_video(song)
                if not found:
                    print("NO VIDEO ", name)
                    continue
                song["yt"], song["seconds"] = found["id"], found["seconds"]
            elif not song.get("seconds"):
                song["seconds"] = video_seconds(song["yt"])
            seconds = song["seconds"]
            entry = lrclib_entry(song, seconds)
        except Exception as e:
            print("FAILED   ", name, type(e).__name__)
            continue
        if not entry:
            print("NO LYRICS", name)
            continue
        song["lrc"] = entry["id"]
        sents, points, levels, chars = analyse({"captions": lrc_lines(entry.get("syncedLyrics"))})
        kept.append({
            "id": song["yt"], "title": song["title"], "channel": song["artist"], "seconds": seconds, "kind": "music",
            "lrc": entry["id"], "sentences": len(sents), "cpm": round(chars / (seconds / 60)),
            "level": level_for(levels, len(sents), COVER),
            "levels": {str(k): levels[k] for k in sorted(levels)},
            "points": {k: [p["n"], p["t"]] for k, p in sorted(points.items(), key=lambda x: [int(n) for n in x[0].split(".")])},
        })
        print(f"ok {song['yt']} {seconds:4}s lrc {entry['id']} {round(entry.get('duration') or 0):4}s L{kept[-1]['level']:<2} {name}")
        time.sleep(2.5)  # LRCLIB answers 429 to anything much faster
    SONGS_IN.write_text("[\n" + ",\n".join("  " + json.dumps(s, ensure_ascii=False) for s in wanted) + "\n]\n", encoding="utf-8")
    head = ("// Written by tools/videos/analyse.py --songs, so don't edit it by hand. Grammar found in each song's\n"
            "// lyrics, in the same shape as videos-data.js. lrc is the song's LRCLIB entry, which the Listen tab\n"
            "// fetches when a member opens the song. No lyrics are stored here.\n")
    body = json.dumps(kept, ensure_ascii=False, separators=(",", ":")).replace('},{"id"', '},\n{"id"')
    SONGS_OUT.write_text(f"{head}const SONGS = {body};\n", encoding="utf-8")
    print(f"{len(kept)} of {len(wanted)} songs; wrote {SONGS_OUT}")


def test():
    """Each rule should fire on its own example, and shouldn't fire on much earlier lessons' examples."""
    node = ("const s=require('fs').readFileSync('public/js/lessons.js','utf8');"
            "console.log(JSON.stringify(new Function(s+';return LESSONS')()))")
    lessons = json.loads(subprocess.run(["node", "-e", node], cwd=ROOT, capture_output=True, text=True, encoding="utf-8").stdout)
    plain = lambda ex: re.sub(r"\[[^\]]*\]", "", ex).replace("{", "").replace("}", "")
    keys, missed, early = set(), [], {}
    for l in lessons:
        for i, p in enumerate(l["points"]):
            k = f"{l['n']}.{i}"
            keys.add(k)
            if k in UNDETECTED:
                continue
            if k not in RULES:
                missed.append((k, p["g"], "NO RULE"))
                continue
            s = plain(p["ex"])
            hits = find_points(s)
            if k not in hits:
                missed.append((k, p["g"], s))
            for h in hits:
                if int(h.split(".")[0]) > l["n"]:
                    early.setdefault(h, []).append(f"L{l['n']} {s}")
    print(f"{len(keys)} points, {len(RULES)} rules, {len(UNDETECTED)} undetected on purpose")
    print("unknown keys:", sorted(set(RULES) - keys))
    print(f"\nMISSED their own example ({len(missed)}):")
    for m in missed:
        print("  ", *m)
    print(f"\nFIRED on an earlier lesson's example ({len(early)} rules):")
    for k, v in sorted(early.items(), key=lambda x: float(x[0])):
        print("  ", k, len(v), "|", v[0])


def sample(key, limit=25):
    shown = 0
    for path in sorted(CACHE.glob("*.json")):
        v = json.loads(path.read_text(encoding="utf-8"))
        for t, s in sentences(v.get("captions") or []):
            if key in find_points(s):
                print(f"{v['id']} {int(t):>5}s  {s}")
                shown += 1
                if shown >= limit:
                    return


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--test", action="store_true")
    ap.add_argument("--gather", action="store_true")
    ap.add_argument("--podcasts", action="store_true")
    ap.add_argument("--build", action="store_true")
    ap.add_argument("--sample")
    ap.add_argument("--songs", action="store_true")
    ap.add_argument("--transcripts", action="store_true")
    ap.add_argument("--links-only", action="store_true", help="with --transcripts: only the podcast addresses")
    a = ap.parse_args()
    if a.test:
        test()
    if a.gather:
        gather()
    if a.podcasts:
        gather_podcasts()
    if a.build:
        build()
    if a.sample:
        sample(a.sample)
    if a.songs:
        songs()
    if a.transcripts:
        transcripts(a.links_only)
