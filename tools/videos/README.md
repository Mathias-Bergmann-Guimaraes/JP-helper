# Adding videos and podcasts to the Listen tab

Videos aren't added one by one. `analyse.py` gathers candidates from a list of channels and
searches, and keeps only the ones that pass its checks (see [Why a video might not
appear](#why-a-video-might-not-appear)). Songs work differently: see the end of this page.

## One-time setup

Run everything from `tools/videos`, inside a virtual environment. The script looks for `yt-dlp`
next to the Python it runs on, and on Windows that's only true inside one.

```
cd tools/videos
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

After that, run `.venv\Scripts\activate` each time you open a new terminal. On macOS or Linux,
it's `source .venv/bin/activate`. `.venv/` is ignored by git.

## 1. Tell it where to look

Open `analyse.py` and add a line to `SOURCES` near the top. The number is how many videos to check
from that source:

```python
("https://www.youtube.com/@SomeChannel/videos", 60),   # a whole channel
("ytsearch40:japanese listening practice N4", 40),      # a YouTube search
("https://www.youtube.com/watch?v=VIDEO_ID", 1),        # one specific video
```

For a podcast, add its RSS feed address to `PODCASTS` instead. It's only used if its feed links to
transcripts (a `<podcast:transcript>` tag in SRT format).

## 2. Gather and build

```
python analyse.py --gather
python analyse.py --podcasts
python analyse.py --build
python analyse.py --transcripts
```

- `--gather` downloads the captions of every candidate, about 1.5 seconds each. If YouTube blocks
  it partway, wait a while and run it again. It carries on where it stopped.
- `--podcasts` does the same for podcast episodes. **Don't skip it**: `--build` builds the list
  from everything saved in `.cache`, so a podcast that isn't there drops out of the tab.
- `--build` writes `public/js/videos-data.js` and prints how many items it kept and why the
  others were skipped. It also writes each podcast episode's transcript address.
- `--transcripts` saves every listed video's captions in `data/transcripts/` for its transcript
  panel. It reuses what `--gather` saved and downloads only missing captions. Always run it after
  `--build`, since it works from the list `--build` wrote.

`python analyse.py --test` checks the grammar rules against the lessons' own examples. It's worth
running after changing `grammar_rules.py`.

## 3. Check, commit, deploy

1. Start the site (`npm start` in the project folder) and look at the new items on the Listen tab.
2. Commit `public/js/videos-data.js` and push.
3. On the server, pull and restart, then copy `data/transcripts/` into the server's `data/`
   folder. `data/` isn't in git, so the transcripts only get there this way.

If you forget step 3's copy, nothing breaks. A video without its file says so on its page and offers
to show YouTube's own captions on the video instead. Podcast transcripts need no copying.

## Why a video might not appear

`--build` only keeps a video if:

- it has **Japanese captions written by people**. YouTube's automatic captions don't count.
- it's **2 to 25 minutes** long (`MIN_SECONDS`, `MAX_SECONDS`).
- it's **allowed to play on other sites**.
- it's **mostly Japanese**, with at least 15 sentences (`MIN_SENTENCES`).
- it's within the limit of **8 per channel in each lesson range** (`PER_CHANNEL`; 15 for a podcast
  show, `PER_SHOW`). The easiest videos fill each range first.

## Be aware

`.cache` holds every downloaded caption and transcript, and isn't in git. On a machine without it,
the first run downloads everything again and rebuilds the whole list, not just the new videos.
Searches return different results over time, so some current videos may be swapped for new ones.
After that the cache stays, and later runs are quicker and change less.

Old files in `data/transcripts/` for videos that left the list are harmless, as nothing loads them.

## Songs

Songs are listed by hand in `songs.json`. A new line needs only `artist` and `title`. Add `yt` or
`lrc` to pin the YouTube video or LRCLIB entry when the search picks the wrong one. Then run:

```
python analyse.py --songs
```

This writes `public/js/songs-data.js`. Commit it and deploy. Lyrics are fetched from LRCLIB when a
song is opened, so nothing needs copying to the server.
