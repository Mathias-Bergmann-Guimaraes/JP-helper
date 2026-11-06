# Bunpō — Visual Japanese Grammar

A visual Japanese grammar site: colour-coded sentence blocks, particles, verb conjugation,
adjectives, verb patterns and a Practice tab — plus a 50-lesson course with practice
sentences, a 5-question check (worth up to three stars) for every grammar point and a test for
every lesson. Right answers earn XP towards levels and a daily streak. Learners can also write
three sentences of their own with each grammar point for extra XP; the site checks the basics
(Japanese, not copied, the pattern spotted where it can tell) and builds a prompt to get them
corrected by any chatbot. Pasting the chatbot's answer back redraws it with the site's colour
blocks, and every sentence it marks wrong goes to a "Your mistakes" list on the lesson page,
next to its correction, and comes back as a question until it's answered right twice. The
**Mistakes** tab shows those lists from every lesson together and can practise them across lessons. The daily
roulettes, on the Home and Practice tabs, test what you've already finished (a star on a point's
check, or its lesson's test passed): Review (one random point), Lesson (one random lesson's full
test), Mixed (questions from many points), Weak spot (your uncorrected mistakes, or your
lowest-starred point), Build (five block sentences), Forms (verb forms and patterns) and Retest (the
lessons you scored low on in a big test). Each pays a
bonus on its first clear of the day and can be run again for normal XP, and the date flags one of
them for extra XP. It's the same card on both tabs, so a run under way carries on from one to the other.

Spaced review brings each finished grammar point back after 1, 3, 7, 21 and then every 60 days, in
a "Due today" card on the Home tab, beside your current lesson and above the roulettes, with two mixed questions per point. All right moves a point
up a step, one wrong moves it down a step, and none right starts it over. A day's review stops at 10
points, most overdue first; **Study more** carries on 5 points at a time past that, and when nothing
is due you can review the next ones early, which doesn't push their dates back unless you slip.
Missed days lose nothing, and doing a due point's 5-question check counts as its review.

**Your progress** on the Home tab shows a member their own numbers: XP this week, days studied,
their longest streak, test average, mistakes fixed and sentences written, a chart of XP per day for
the last 30 days, their stars across every grammar point, and up to three points with one or two
stars, one click from their check. The daily XP history keeps a year and only starts counting
once this feature is running. It is saved with the account like other progress, and isn't shown on
the admin page.

Every lesson also has a sentence builder: read the English and tap or drag the shuffled colour
blocks into Japanese order. Sentences that can be reordered accept any natural order, and say which one is the
most usual. The sentences live in `public/js/builds.js`, where `~` marks the blocks that can swap. In its
**Free text · AI** mode you type the Japanese instead, one sentence under the other. The site's own
wordings, in kanji or kana, are right straight away. Anything else waits, and when you've finished
(or choose to check sooner) all of those go to your own chatbot in one copied prompt. Pasting its
answer back scores them and saves any corrections to "Your mistakes". The site itself sends nothing
to an AI service. Free text has hints, one at a time: the grammar to use, the words you'll need, and
the colour order of the blocks, which the block mode can show too. Block mode can also hide the
colours, for when they give too much away.

The **Practice** tab brings it together, with four parts to pick from:

- **Roulettes:** the daily board above.
- **Write:** sentences of your own, in rounds of 3, 5 or 8, guided by one of: a direct translation,
  a pattern to use, a general theme, a word bank, a situation, a question in Japanese to answer, a
  sentence to finish, two patterns at once, or a mix of them all. Each task has hints, and **Give me
  another** swaps a task you don't like. A lesson, all lessons up to it or one grammar point decides
  what comes up, and tasks stay within what you've reached. The site marks the translations it
  knows and warns about what it can notice (a required word it can't spot, a sentence copied from
  the lesson). Everything else goes to your own chatbot in one prompt, as in free text, with each
  sentence's task, and corrections are saved under the grammar point the task exercises. Your last
  30 sentences are kept in this browser. The tasks live in `public/js/write-prompts.js`.
- **Build:** the sentence builder, for one lesson, all lessons up to it or a single grammar point.
- **Quick quiz:** non-stop questions on particles, verb forms, adjectives and patterns, or all of
  them mixed, each with an optional focus (just に, just the て-form…). Right answers earn XP, and
  the number keys 1–4 answer.

The **Listen** tab lists real YouTube videos and podcast episodes by how much of their grammar you've studied. Pick the
lesson you've reached (it starts at the furthest one you've got a star in) and each one shows the
share of its sentences that use grammar up to there, the lesson it's comfortable from (90% of its
sentences), and which grammar points it uses, split into studied and not reached yet. Each point
opens its lesson, and its times jump the player to where it's used. Grammar is spotted by rules in
`tools/videos/grammar_rules.py`, reading the captions people wrote for the video, so a few points
may be missed or wrong. 7 of the 186 points can't be told apart from others this way, and vocabulary
isn't counted. To refresh the list (needs Python, and `public/js/videos-data.js` is the only output):

```
cd tools/videos
pip install -r requirements.txt
python analyse.py --test
python analyse.py --gather
python analyse.py --podcasts
python analyse.py --build
```

Its **Music** filter lists songs, measured the same way from their lyrics. A song's page shows the lyrics
beside the video: the current line lights up as it plays, pressing a line jumps to it, and **Sooner** and
**Later** correct the timing on this device if the video runs differently from the record. Lyrics
aren't stored on the site or in this repository. The member's browser fetches them from
[LRCLIB](https://lrclib.net), a free database its users write, when a song is opened, so opening one
contacts LRCLIB as well as YouTube. They have no furigana or translation. To change the songs, edit
`tools/videos/songs.json` (a new line needs only `artist` and `title`, and `yt` or `lrc` pin a video or
LRCLIB entry when the search picks the wrong one), then run `python analyse.py --songs`, which writes
`public/js/songs-data.js`.

Any member can like or dislike a video or episode. Everyone sees the totals, and nobody sees who voted:
the site only sends a member the totals and their own vote, and `data/votes.json` holds salted hashes
in place of names. Stopping double votes means the server's owner could still work out a vote by
testing each member's id against the file. Removing a member removes their votes. Bookmarks and
favourite channels are private to each account and saved with its progress. The tab can list just
those, and **Remove** deletes them along with the rest of the account's progress.

Captions and transcripts stay in `tools/videos/.cache`, which isn't committed, and the site stores
only grammar points, counts and times. The video player is YouTube's own embed, from
`youtube-nocookie.com`, so opening a video contacts YouTube, and the list's thumbnails load from
`i.ytimg.com`. Podcast episodes play from the podcast's own host. Only shows whose feeds link to a
transcript can be included, and those transcripts are machine-made, so an episode's grammar list is
less reliable than a video's, and the page says so.

Every few lessons there's a **big test** on everything since the last one, spread evenly across
those lessons, 5 questions per lesson: 1–5, 6–10, 11–16, 17–20 and 21–25 in Book I, then every five
lessons in Book II. Each book ends with a 50-question final. They're all open from the start and take
80% to pass. Passing one finishes every lesson it covers, so anyone who already knows the grammar can
skip ahead, and the result shows the score lesson by lesson. The blocks are listed in
`public/js/lesson-big.js`.

The last questions of each test are written: 3 to 5 on a big test and 10 on a final. They're answered
with the colour blocks or by typing. A typed wording the site doesn't know goes to your own chatbot in
one prompt at the end, before the score is counted. **Exam mode** hides right and wrong until the
end. It starts on for the finals and off for the big tests. A test in progress is saved in the browser,
so a reload carries on where it was. Grammar points missed in a big test come back in the next day's
review, a step lower, and lessons scored under 80% unlock the **Retest** roulette until they score
better. Passing a final gives a 修了証 certificate to save or share as an image.

The whole site is **private**. Visitors without a login only see a login page. From there they
can pick a username and password and send an access request, which you approve by hand — or
use a single-use invite code you gave them, which lets them in straight away. After that they
can log in on any browser.

## Run it

Needs [Node.js](https://nodejs.org) 18 or newer — no packages to install.

```
npm start
```

- **Site:** http://localhost:5173 — share this address (or your server's) with learners.
- **Admin:** http://127.0.0.1:3004 — open this **on the server itself** to
  approve requests, create invite codes and manage members. It only listens on 127.0.0.1, so
  nobody else can reach it.

Invite codes work once and expire after 14 days. Only a hash of each code is stored, so the
admin page shows a new code just once — copy it before closing the page. **Revoke** locks a
member out on every browser, **Restore** lets them back in, and **Remove** deletes the login and
frees the username. Passwords are stored only as scrypt hashes. New requests are limited to 5
per hour per IP; failed logins and wrong invite codes to 10 per 15 minutes per IP (logins also
per account). IP addresses are only kept in memory for those limits, never saved; requests sent
before the site went private still show theirs.

Without access, the server only sends `gate/login.html` (at `/`) and the files in
`public/fonts/`; everything else in `public/` answers 403. Fonts are self-hosted, so no visitor
data goes to Google. Accounts, invites and sessions are saved in `data/access.json`, which is not
committed — older copies of that file are upgraded automatically.

Lesson progress (test scores, stars, XP and XP per day, best streak, the last lesson opened, the sentences a
member wrote, their corrected mistakes, big test scores and certificates, the daily roulettes, the review
schedule, and their bookmarks and favourite channels in the Listen tab) is saved per
account in `data/progress.json`, so it follows a member to every browser they log in on.
Progress made in a browser before logins existed moves into the first account that logs in
there. **Remove** deletes it along with the login.

The admin page's **Usage** view shows which features get used: people active per day, and how
often each page and feature was used over the last 7, 30 or 90 days, including the ones nobody
touched. It holds anonymous daily totals only, in `data/usage.json`, kept for 90 days. Nothing
links a member to a feature: the list of who has already been counted today stays in memory, so
restarting the server can count someone twice that day. For the same reason, "people" can't be
added up across days, so the page shows the most people in a single day instead. The site reports
only a feature's name, never what was typed, and sends nothing to a third party. To count a new
feature, add it to `USAGE_GROUPS` in `server.js` and call `track("its.name")` in the page.

Settings via environment variables: `PORT` (default 5173), `HOST` (default 0.0.0.0),
`ADMIN_PORT` (default 3004) and `DATA_FILE` (default `data/access.json`).

## Notes

- The lock only works when the site is served by `server.js`. Static hosting such as GitHub
  Pages — or a public copy of this repository — shows the whole site to everyone.
- If you put the site behind HTTPS (a reverse proxy), keep the admin port off the proxy.
