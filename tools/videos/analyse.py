"""Finds videos and podcasts with limited grammar and writes public/js/videos-data.js for the Listen tab.

  pip install -r requirements.txt
  python analyse.py --test                 check the grammar rules on the lessons' own examples
  python analyse.py --gather               look up candidate videos and download their captions
  python analyse.py --podcasts             look up podcast episodes and download their transcripts
  python analyse.py --build                write public/js/videos-data.js from what was downloaded
  python analyse.py --sample 37.2          show caption lines where a rule fired, to judge it

Captions are kept only in .cache (not committed). The site's data file holds grammar points, counts
and timestamps, and no caption text. For videos, only captions written by people are used, since
YouTube's automatic ones have no reliable sentence breaks and get a lot of grammar words wrong.

Podcasts are the exception: the only transcripts most feeds offer are machine-made ones, listed with
a <podcast:transcript> tag, so the tab says so on those episodes. Episodes without a transcript are
skipped, and no audio is downloaded. The tab plays it from the podcast's own host.
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
import urllib.request
from pathlib import Path

from grammar_rules import RULES, UNDETECTED, find_points

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
CACHE = HERE / ".cache"
OUT = ROOT / "public" / "js" / "videos-data.js"

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
        try:
            found = [t for t in api.list(r["id"]) if t.language_code.startswith("ja") and not t.is_generated]
            r["captions"] = [[round(s.start, 1), s.text] for s in found[0].fetch()] if found else None
        except Exception as e:
            # A block from YouTube must stop the run. Saving it would mark every video as captionless.
            if "IpBlocked" in type(e).__name__ or "RequestBlocked" in type(e).__name__:
                sys.exit(f"YouTube blocked the requests after {i} videos. Run again later; it carries on from here.")
            r["captions"] = None
        path.write_text(json.dumps(r, ensure_ascii=False), encoding="utf-8")
        time.sleep(1.5)
        if i % 25 == 0:
            print(" ", i, "checked")


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
            **({"kind": "audio", "audio": v["audio"], "art": v["art"], "link": v["link"]} if v.get("kind") == "audio" else {}),
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
    head = ("// Written by tools/videos/analyse.py, so don't edit it by hand. Grammar found in each video's\n"
            "// human-written captions: points are \"lesson.point\" keys from lessons.js with [count, [seconds…]],\n"
            "// and levels counts sentences by the highest lesson each one needs. No caption text is stored.\n")
    body = json.dumps(kept, ensure_ascii=False, separators=(",", ":")).replace('},{"id"', '},\n{"id"')
    OUT.write_text(f"{head}const VIDEOS = {body};\nconst VIDEOS_UNDETECTED = {json.dumps(sorted(UNDETECTED))};\n", encoding="utf-8")
    print("wrote", OUT, OUT.stat().st_size // 1024, "KB")


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
