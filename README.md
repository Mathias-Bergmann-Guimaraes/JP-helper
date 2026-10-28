# Bunpō — Visual Japanese Grammar

A visual Japanese grammar site: colour-coded sentence blocks, particles, verb conjugation,
adjectives, verb patterns and a practice page — plus a private 50-lesson course with practice
sentences and a test for every lesson.

Everything is open except the **Lessons** tab. Visitors pick a username and password and send
an access request from that tab. Once you approve it, they can log in with that username and
password on any browser.

## Run it

Needs [Node.js](https://nodejs.org) 18 or newer — no packages to install.

```
npm start
```

- **Site:** http://localhost:5173 — share this address (or your server's) with learners.
- **Admin:** http://127.0.0.1:3004 — open this **on the server itself** to see requests and
  approve, decline or revoke them. It only listens on 127.0.0.1, so nobody else can reach it.

Approving a request unlocks the Lessons tab for that login on every browser it signs in from;
**Revoke** locks them all again, and **Remove** deletes the login and frees the username.
Passwords are stored only as scrypt hashes; failed logins are limited to 10 per 15 minutes per
IP and per account. Browsers approved before logins existed are offered a "Create login" card in
the Lessons tab so their access can move to other devices.

The locked files are `public/js/lessons.js`, `drills.js` and `lesson-page.js` (see `LOCKED_FILES`
in `server.js`). Accounts, requests and sessions are saved in `data/access.json`, which is not
committed — older copies of that file are upgraded automatically.

Settings via environment variables: `PORT` (default 5173), `HOST` (default 0.0.0.0) and
`ADMIN_PORT` (default 3004).

## Notes

- The lock only works when the site is served by `server.js`. Static hosting such as GitHub
  Pages — or a public copy of this repository — shows the lesson files to everyone.
- If you put the site behind HTTPS (a reverse proxy), keep the admin port off the proxy.
