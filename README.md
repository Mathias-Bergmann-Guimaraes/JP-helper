# Bunpō — Visual Japanese Grammar

A visual grammar course that follows the lesson order of *Minna no Nihongo*: colour-coded
sentence blocks, particles, verb conjugation, patterns, and 50 practice sentences plus a test
for every lesson.

The site is private. Visitors only see a **Request access** screen until you approve them.

## Run it

Needs [Node.js](https://nodejs.org) 18 or newer — no packages to install.

```
npm start
```

- **Site:** http://localhost:5173 — share this address (or your server's) with learners.
- **Admin:** http://127.0.0.1:3004 — open this **on the server itself** to see requests and
  approve, decline or revoke them. It only listens on 127.0.0.1, so nobody else can reach it.

Each approval unlocks the site for that one browser (it's stored in a cookie). Requests are
saved in `data/access.json`, which is not committed.

Settings via environment variables: `PORT` (default 5173), `HOST` (default 0.0.0.0) and
`ADMIN_PORT` (default 3004).

## Notes

- The lock only works when the site is served by `server.js`. Static hosting such as GitHub
  Pages would show the files to everyone.
- If you put the site behind HTTPS (a reverse proxy), keep the admin port off the proxy.
