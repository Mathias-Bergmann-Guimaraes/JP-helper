# Bunpō — Visual Japanese Grammar

A visual Japanese grammar site: colour-coded sentence blocks, particles, verb conjugation,
adjectives, verb patterns and a practice page — plus a 50-lesson course with practice
sentences, a 5-question check (worth up to three stars) for every grammar point and a test for
every lesson. Right answers earn XP towards levels and a daily streak. Learners can also write
three sentences of their own with each grammar point for extra XP; the site checks the basics
(Japanese, not copied, the pattern spotted where it can tell) and builds a prompt to get them
corrected by any chatbot. Pasting the chatbot's answer back redraws it with the site's colour
blocks, and every sentence it marks wrong goes to a "Your mistakes" list on the lesson page,
next to its correction, and comes back as a question until it's answered right twice. The
**Mistakes** tab shows those lists from every lesson together and can practise them across lessons. The daily
roulettes test what you've already finished (a star on a point's check, or its lesson's test
passed): Review (one random point), Lesson (one random lesson's full test), Mixed (questions from
many points) and Weak spot (your uncorrected mistakes, or your lowest-starred point). Each pays a
bonus on its first clear of the day and can be run again for normal XP, and the date flags one of
them for extra XP.

Spaced review brings each finished grammar point back after 1, 3, 7, 21 and then every 60 days, in
a "Due today" card on the Home tab, beside your current lesson and above the roulettes, with two mixed questions per point. All right moves a point
up a step, one wrong moves it down a step, and none right starts it over. A day's review stops at 10
points, most overdue first; **Study more** carries on 5 points at a time past that, and when nothing
is due you can review the next ones early, which doesn't push their dates back unless you slip.
Missed days lose nothing, and doing a due point's 5-question check counts as its review.

Every lesson also has a sentence builder: read the English and tap or drag the shuffled colour
blocks into Japanese order. Sentences that can be reordered accept any natural order, and say which one is the
most usual. The sentences live in `public/js/builds.js`, where `~` marks the blocks that can swap. In its
**Free text · AI** mode you type the Japanese instead, one sentence under the other. The site's own
wordings, in kanji or kana, are right straight away. Anything else waits, and when you've finished
(or choose to check sooner) all of those go to your own chatbot in one copied prompt. Pasting its
answer back scores them and saves any corrections to "Your mistakes". The site itself sends nothing
to an AI service.

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

Lesson progress (test scores, stars, XP, best streak, the last lesson opened, the sentences a
member wrote, their corrected mistakes, the daily roulettes and the review schedule) is saved per
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
