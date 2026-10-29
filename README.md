# Bunpō — Visual Japanese Grammar

A visual Japanese grammar site: colour-coded sentence blocks, particles, verb conjugation,
adjectives, verb patterns and a practice page — plus a 50-lesson course with practice
sentences, a 5-question check (worth up to three stars) for every grammar point and a test for
every lesson. Right answers earn XP towards levels and a daily streak.

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

Lesson progress (test scores, stars, XP, best streak, the last lesson opened) is saved per
account in `data/progress.json`, so it follows a member to every browser they log in on.
Progress made in a browser before logins existed moves into the first account that logs in
there. **Remove** deletes it along with the login.

Settings via environment variables: `PORT` (default 5173), `HOST` (default 0.0.0.0),
`ADMIN_PORT` (default 3004) and `DATA_FILE` (default `data/access.json`).

## Notes

- The lock only works when the site is served by `server.js`. Static hosting such as GitHub
  Pages — or a public copy of this repository — shows the whole site to everyone.
- If you put the site behind HTTPS (a reverse proxy), keep the admin port off the proxy.
