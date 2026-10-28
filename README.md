# Bunpō — Visual Japanese Grammar

A visual Japanese grammar site: colour-coded sentence blocks, particles, verb conjugation,
adjectives, verb patterns and a practice page — plus a private 50-lesson course with practice
sentences and a test for every lesson.

Everything is open except the **Lessons** tab. Visitors send an access request from that tab,
and only browsers you approve can load the lessons.

## Run it

Needs [Node.js](https://nodejs.org) 18 or newer — no packages to install.

```
npm start
```

- **Site:** http://localhost:5173 — share this address (or your server's) with learners.
- **Admin:** http://127.0.0.1:3004 — open this **on the server itself** to see requests and
  approve, decline or revoke them. It only listens on 127.0.0.1, so nobody else can reach it.

Each approval unlocks the Lessons tab for that one browser (it's stored in a cookie). The locked
files are `public/js/lessons.js`, `drills.js` and `lesson-page.js` (see `LOCKED_FILES` in
`server.js`). Requests are saved in `data/access.json`, which is not committed.

Settings via environment variables: `PORT` (default 5173), `HOST` (default 0.0.0.0) and
`ADMIN_PORT` (default 3004).

## Notes

- The lock only works when the site is served by `server.js`. Static hosting such as GitHub
  Pages — or a public copy of this repository — shows the lesson files to everyone.
- If you put the site behind HTTPS (a reverse proxy), keep the admin port off the proxy.
