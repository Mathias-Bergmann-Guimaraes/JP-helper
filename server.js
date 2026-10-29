// Access-gated server for the grammar site. No dependencies — run with `node server.js`.
//
// Public port (PORT, default 5173): the whole site in public/ is private. Signed-in members with
// approved access get it; everyone else only sees the login page (gate/login.html) and the fonts
// it uses. From there visitors can send an access request for you to approve, or redeem a
// single-use invite code, which lets them in straight away.
//
// Admin port (ADMIN_PORT, default 3004): bound to 127.0.0.1, so it is only reachable from this
// machine. Open http://127.0.0.1:3004 here to approve requests, create invites and manage access.

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 5173;
const HOST = process.env.HOST || "0.0.0.0";
const ADMIN_PORT = Number(process.env.ADMIN_PORT) || 3004;
const ADMIN_HOST = "127.0.0.1";

const PUBLIC_DIR = path.join(__dirname, "public");
const GATE_DIR = path.join(__dirname, "gate");

// The only part of public/ that visitors without access may download: what the login page needs.
const OPEN_DIR = path.join(PUBLIC_DIR, "fonts");
const isOpen = (file) => {
  if (file === null) return false;
  const rel = path.relative(OPEN_DIR, file);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
};
const DATA_FILE = process.env.DATA_FILE ? path.resolve(process.env.DATA_FILE) : path.join(__dirname, "data", "access.json");
const PROGRESS_FILE = path.join(path.dirname(DATA_FILE), "progress.json");

const COOKIE = "jpg_access";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
const MAX_BODY = 4 * 1024;
const MAX_PENDING = 200; // stop a flood of requests from filling the list
const REQUESTS_PER_IP_PER_HOUR = 5;
const INVITE_DAYS = 14;
const MAX_INVITES = 100;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

/* ---------------------------------------------------------------- Store */

// data/access.json holds four maps:
//   requests: { [id]: { name, message, status, requestedAt, decidedAt, lastSeen, account?, invited?, ip?, ua? } }
//   accounts: { [lower-case username]: { username, password, request } }  (password = scrypt hash)
//   sessions: { [sha256(cookie token)]: { request, createdAt } }          (one per signed-in browser)
//   invites:  { [sha256(code)]: { note, createdAt, expiresAt } }          (unused invite codes)
// A "request" is one person's access: the request form creates a pending one, an invite an
// approved one, and approving, revoking or restoring acts on it. IP addresses are only used in
// memory for rate limits — ip/ua exist only on requests sent before the site went private. An account
// ties a username and password to one request, so every browser that logs in shares its access.
// The file never holds a usable cookie, invite code or plain password.
const db = loadDb();
const { requests, accounts, sessions, invites } = db;
const MAX_SESSIONS_PER_REQUEST = 20;

function loadDb() {
  const raw = loadJson(DATA_FILE);
  if (raw.requests) {
    return { requests: raw.requests, accounts: raw.accounts || {}, sessions: raw.sessions || {}, invites: raw.invites || {} };
  }
  // First version: browser-only requests keyed by the hash of that browser's token.
  const sessions = {};
  for (const [id, r] of Object.entries(raw)) sessions[id] = { request: id, createdAt: r.requestedAt };
  return { requests: raw, accounts: {}, sessions, invites: {} };
}

const saveDb = () => saveJson(DATA_FILE, db);

// data/progress.json holds each member's lesson progress, so it follows them to every browser:
//   { [request id]: { [key]: value, updatedAt } }   (the keys are in PROGRESS_MERGE below)
// Kept apart from access.json, which then isn't rewritten every time someone opens a lesson.
const progress = loadJson(PROGRESS_FILE);

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function saveJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const shortCode = (id) => id.slice(0, 6).toUpperCase();

// The signed-in browser behind this request: { sid, id } or null.
function sessionOf(req) {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})(?:;|$)`).exec(req.headers.cookie || "");
  if (!m) return null;
  const sid = sha256(m[1]);
  const s = sessions[sid];
  return s && requests[s.request] ? { sid, id: s.request } : null;
}

function accessState(id) {
  if (!id) return { status: "none", code: null, username: null };
  const r = requests[id];
  return { status: r.status, code: shortCode(id), username: r.account ? accounts[r.account].username : null };
}

// Start a session for this browser on request `id`; returns the Set-Cookie header.
function startSession(req, id) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions[sha256(token)] = { request: id, createdAt: new Date().toISOString() };
  const mine = Object.entries(sessions).filter(([, s]) => s.request === id);
  mine.sort((a, b) => a[1].createdAt.localeCompare(b[1].createdAt));
  for (const [sid] of mine.slice(0, Math.max(0, mine.length - MAX_SESSIONS_PER_REQUEST))) delete sessions[sid];
  return cookie(req, token, COOKIE_MAX_AGE);
}

function cookie(req, value, maxAge) {
  const secure = req.socket.encrypted || req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  return `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

/* ---------------------------------------------------------------- Passwords */

const scrypt = require("util").promisify(crypto.scrypt);
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,24}$/;
const DUMMY_HASH = "scrypt$00000000000000000000000000000000$" + "0".repeat(64);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

async function passwordMatches(password, stored) {
  const [, salt, hash] = stored.split("$");
  const key = await scrypt(password, Buffer.from(salt, "hex"), 32);
  return crypto.timingSafeEqual(key, Buffer.from(hash, "hex"));
}

// Validate a username/password pair from a request body: { username, key, password } or { error }.
function readCredentials(body, isNew) {
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  if (!USERNAME_RE.test(username)) {
    return { error: isNew ? "Usernames are 3–24 letters, numbers, dots, dashes or underscores." : "Wrong username or password." };
  }
  if (isNew && password.length < 8) return { error: "Passwords need at least 8 characters." };
  if (password.length > 200) return { error: "That password is too long." };
  return { username, key: username.toLowerCase(), password };
}

/* ---------------------------------------------------------------- Invites */

// Codes look like K7P4Q-M2XRT: no 0/O, 1/I/L, so they survive being read out or copied by hand.
const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const inviteKey = (code) => sha256(String(code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, ""));

function newInvite(note) {
  let code = "";
  for (let i = 0; i < 10; i++) code += INVITE_ALPHABET[crypto.randomInt(INVITE_ALPHABET.length)];
  const now = Date.now();
  invites[inviteKey(code)] = {
    note,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + INVITE_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

function dropExpiredInvites() {
  let dropped = false;
  for (const [key, inv] of Object.entries(invites)) {
    if (Date.parse(inv.expiresAt) <= Date.now()) {
      delete invites[key];
      dropped = true;
    }
  }
  if (dropped) saveDb();
}

/* ---------------------------------------------------------------- Responses */

function baseHeaders(extra = {}) {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex", // a private site: keep even the login page out of search engines
    ...extra,
  };
}

function sendText(res, status, text) {
  res.writeHead(status, baseHeaders({ "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }));
  res.end(text);
}

function sendJson(res, status, data, extra = {}) {
  res.writeHead(status, baseHeaders({ "Content-Type": TYPES[".json"], "Cache-Control": "no-store", ...extra }));
  res.end(JSON.stringify(data));
}

// Map a URL path to a file inside `dir`, or null — never anything outside it, never dotfiles.
function resolveIn(dir, urlPath) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.resolve(dir, "." + path.posix.normalize("/" + rel));
  const inside = path.relative(dir, file);
  if (!inside || inside.startsWith("..") || path.isAbsolute(inside) || inside.split(path.sep).some((p) => p.startsWith("."))) {
    return null;
  }
  return file;
}

function sendFile(res, dir, urlPath, status = 200) {
  const file = resolveIn(dir, urlPath);
  if (!file) return sendText(res, 404, "Not found");
  fs.readFile(file, (err, buf) => {
    if (err) return sendText(res, 404, "Not found");
    res.writeHead(status, baseHeaders({
      "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      // Gated content must never be kept by a shared cache and handed to someone else.
      "Cache-Control": "private, no-cache",
    }));
    res.end(buf);
  });
}

function readJson(req, max = MAX_BODY) {
  return new Promise((resolve, reject) => {
    if (!/^application\/json\b/i.test(req.headers["content-type"] || "")) return reject(new Error("json only"));
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > max) {
        reject(new Error("too large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

// Trim, drop control characters and cap the length of visitor-supplied text.
const cleanText = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);

/* ---------------------------------------------------------------- Public server */

// Sliding-window counters: key -> timestamps. Used for new requests, failed logins and wrong invite codes.
const hits = new Map();
function tooMany(key, limit, windowMs) {
  const since = Date.now() - windowMs;
  const times = (hits.get(key) || []).filter((t) => t > since);
  hits.set(key, times);
  return times.length >= limit;
}
const note = (key) => hits.get(key).push(Date.now());

const LOGIN_FAILS = 10; // per IP and per account, every 15 minutes
const LOGIN_WINDOW = 15 * 60 * 1000;

async function body(req, res, max) {
  try {
    return await readJson(req, max);
  } catch {
    sendJson(res, 400, { error: "Could not read the request." });
    return null;
  }
}

// New visitor: create an account and a pending request, and sign this browser in.
async function handleRequest(req, res, me) {
  if (me) return sendJson(res, 200, accessState(me.id));
  const b = await body(req, res);
  if (!b) return;
  const cred = readCredentials(b, true);
  if (cred.error) return sendJson(res, 400, { error: cred.error });
  if (accounts[cred.key]) return sendJson(res, 409, { error: "That username is taken — log in instead, or pick another." });

  const ip = req.socket.remoteAddress || "";
  if (tooMany(`req:${ip}`, REQUESTS_PER_IP_PER_HOUR, 60 * 60 * 1000)) {
    return sendJson(res, 429, { error: "Too many requests. Please try again later." });
  }
  const pending = Object.values(requests).filter((r) => r.status === "pending").length;
  if (pending >= MAX_PENDING) return sendJson(res, 503, { error: "Too many open requests. Please try again later." });

  const password = await hashPassword(cred.password);
  // Hashing waits, so check again: another request may have taken the name meanwhile.
  if (accounts[cred.key]) return sendJson(res, 409, { error: "That username is taken — log in instead, or pick another." });
  const id = crypto.randomBytes(32).toString("hex");
  requests[id] = {
    name: cred.username,
    message: cleanText(b.message, 300),
    status: "pending",
    requestedAt: new Date().toISOString(),
    account: cred.key,
  };
  accounts[cred.key] = { username: cred.username, password, request: id };
  const setCookie = startSession(req, id);
  saveDb();
  note(`req:${ip}`);

  console.log(`\x1b[33m● Access request\x1b[0m ${shortCode(id)} from "${cred.username}" — review at http://${ADMIN_HOST}:${ADMIN_PORT}`);
  sendJson(res, 200, accessState(id), { "Set-Cookie": setCookie });
}

// New member: trade an invite code for a username and password with access, and sign this browser in.
async function handleSignup(req, res, me) {
  const b = await body(req, res);
  if (!b) return;
  const ip = req.socket.remoteAddress || "";
  if (tooMany(`invite:${ip}`, LOGIN_FAILS, LOGIN_WINDOW)) {
    return sendJson(res, 429, { error: "Too many failed attempts. Please wait 15 minutes." });
  }
  const key = inviteKey(b.code);
  const usable = () => invites[key] && Date.parse(invites[key].expiresAt) > Date.now();
  if (!usable()) {
    note(`invite:${ip}`);
    return sendJson(res, 400, { error: "That invite code doesn't work. Check it, or ask for a new one." });
  }
  const cred = readCredentials(b, true);
  if (cred.error) return sendJson(res, 400, { error: cred.error });
  const taken = () => accounts[cred.key];
  if (taken()) return sendJson(res, 409, { error: "That username is taken — pick another." });
  const password = await hashPassword(cred.password);
  // Hashing waits, so check again: another sign-up may have used the code or the name meanwhile.
  if (!usable()) return sendJson(res, 400, { error: "That invite code has just been used." });
  if (taken()) return sendJson(res, 409, { error: "That username is taken — pick another." });

  const { note: who } = invites[key];
  delete invites[key];
  const id = crypto.randomBytes(32).toString("hex");
  const now = new Date().toISOString();
  requests[id] = { name: cred.username, message: who, status: "approved", requestedAt: now, decidedAt: now, account: cred.key, invited: true };
  accounts[cred.key] = { username: cred.username, password, request: id };
  if (me) delete sessions[me.sid];
  const setCookie = startSession(req, id);
  saveDb();

  console.log(`\x1b[32m● New member\x1b[0m ${cred.username}${who ? ` (invite: ${who})` : ""}`);
  sendJson(res, 200, accessState(id), { "Set-Cookie": setCookie });
}

// Sign this browser in to an existing account (any status — pending and declined show as such).
async function handleLogin(req, res, me) {
  const b = await body(req, res);
  if (!b) return;
  const ip = req.socket.remoteAddress || "";
  const cred = readCredentials(b, false);
  const acct = cred.error ? null : accounts[cred.key];
  if (tooMany(`login:${ip}`, LOGIN_FAILS, LOGIN_WINDOW) || (acct && tooMany(`login:@${cred.key}`, LOGIN_FAILS, LOGIN_WINDOW))) {
    return sendJson(res, 429, { error: "Too many failed attempts. Please wait 15 minutes." });
  }
  // Always run one hash check so unknown usernames take as long as wrong passwords.
  const ok = await passwordMatches(cred.password || "", acct ? acct.password : DUMMY_HASH);
  if (!acct || !ok || !requests[acct.request]) {
    note(`login:${ip}`);
    if (acct) note(`login:@${cred.key}`);
    return sendJson(res, 401, { error: "Wrong username or password." });
  }
  if (me) delete sessions[me.sid];
  const setCookie = startSession(req, acct.request);
  saveDb();
  sendJson(res, 200, accessState(acct.request), { "Set-Cookie": setCookie });
}

function handleLogout(req, res, me) {
  if (me) {
    delete sessions[me.sid];
    saveDb();
  }
  sendJson(res, 200, accessState(null), { "Set-Cookie": cookie(req, "", 0) });
}

// A browser that was approved before accounts existed: give its access a username and password.
async function handleLink(req, res, me) {
  if (!me) return sendJson(res, 401, { error: "This browser has no access to link." });
  const r = requests[me.id];
  if (r.account) return sendJson(res, 409, { error: "This access already has a login." });
  const b = await body(req, res);
  if (!b) return;
  const cred = readCredentials(b, true);
  if (cred.error) return sendJson(res, 400, { error: cred.error });
  if (accounts[cred.key]) return sendJson(res, 409, { error: "That username is taken — pick another." });
  accounts[cred.key] = { username: cred.username, password: await hashPassword(cred.password), request: me.id };
  r.account = cred.key;
  saveDb();
  console.log(`  login created for ${shortCode(me.id)}: ${cred.username}`);
  sendJson(res, 200, accessState(me.id));
}

function touch(id) {
  const r = requests[id];
  const now = Date.now();
  if (!r.lastSeen || now - Date.parse(r.lastSeen) > 10 * 60 * 1000) {
    r.lastSeen = new Date(now).toISOString();
    saveDb();
  }
}

/* ---------------------------------------------------------------- Lesson progress */

// The keys of the site's localStorage that are saved per account, and how a browser's value
// merges with the saved one:
//   scores — { [name]: number }: each score only ever goes up, so a phone that was offline can't
//            undo a lesson finished on the laptop.
//   max    — a number that only goes up.
//   latest — anything (the last lesson opened, XP): the latest change wins.
// The page gets this list too (in progress.js), so adding a key here is all it takes.
const PROGRESS_MERGE = { lesson: "latest", lessonTests: "scores", pointStars: "scores", best: "max", game: "latest" };
const MAX_PROGRESS_BODY = 32 * 1024;
const MAX_LATEST = 2 * 1024;
const MAX_SCORES = 1000;
const SCORE_NAME_RE = /^[\w.-]{1,20}$/;
const isScore = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1e9;

// `owner` lets a browser tell whose progress it has saved locally, so a second account on the
// same browser never inherits (or uploads) someone else's.
const progressOf = (id) => ({ owner: shortCode(id), progress: progress[id] || {}, merge: PROGRESS_MERGE });

// Sent as a script before the site's own, so the progress is there before any of them reads it.
// Cookies are SameSite=Lax, so another site can't load this with the member's session.
function sendProgressScript(res, id) {
  const json = JSON.stringify(progressOf(id)).replace(/</g, "\\x3c"); // no "</script>" trickery
  res.writeHead(200, baseHeaders({ "Content-Type": TYPES[".js"], "Cache-Control": "no-store" }));
  res.end(`window.SERVER_PROGRESS = ${json};\n`);
}

// Returns the merged value, or undefined if `v` isn't valid for this kind of key.
function mergeProgress(how, saved, v) {
  if (how === "max") return isScore(v) ? Math.max(saved ?? 0, v) : undefined;
  if (how === "latest") return v !== null && JSON.stringify(v).length <= MAX_LATEST ? v : undefined;
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const out = { ...saved };
  for (const [name, score] of Object.entries(v)) {
    if (!SCORE_NAME_RE.test(name) || !isScore(score)) return undefined;
    out[name] = Math.max(out[name] ?? -1, score);
  }
  return Object.keys(out).length <= MAX_SCORES ? out : undefined;
}

async function handleProgress(req, res, me) {
  const b = await body(req, res, MAX_PROGRESS_BODY);
  if (!b) return;
  const p = { ...progress[me.id] };
  for (const [k, v] of Object.entries(b)) {
    const how = PROGRESS_MERGE[k];
    const merged = how && mergeProgress(how, p[k], v);
    if (merged === undefined) return sendJson(res, 400, { error: `Bad progress: ${cleanText(k, 30)}` });
    p[k] = merged;
  }
  p.updatedAt = new Date().toISOString();
  progress[me.id] = p;
  saveJson(PROGRESS_FILE, progress);
  sendJson(res, 200, progressOf(me.id));
}

const ACCESS_ROUTES = {
  "/access/request": handleRequest,
  "/access/signup": handleSignup,
  "/access/login": handleLogin,
  "/access/logout": handleLogout,
  "/access/link": handleLink,
};

const publicServer = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  const me = sessionOf(req);

  if (pathname === "/access/status" && req.method === "GET") return sendJson(res, 200, accessState(me && me.id));
  if (ACCESS_ROUTES[pathname]) {
    if (req.method !== "POST") return sendText(res, 405, "Method not allowed");
    return ACCESS_ROUTES[pathname](req, res, me);
  }
  const member = me && requests[me.id].status === "approved";
  if (pathname === "/progress.js" && member) return sendProgressScript(res, me.id);
  if (pathname === "/progress") {
    if (!member) return sendJson(res, 403, { error: "Access required" });
    if (req.method !== "POST") return sendText(res, 405, "Method not allowed");
    return handleProgress(req, res, me);
  }
  if (req.method !== "GET" && req.method !== "HEAD") return sendText(res, 405, "Method not allowed");

  // Members get the site. Everyone else gets the login page at the site's address, the fonts it
  // uses, and nothing more.
  if (member) {
    if (pathname === "/") touch(me.id);
    return sendFile(res, PUBLIC_DIR, pathname);
  }
  if (isOpen(resolveIn(PUBLIC_DIR, pathname))) return sendFile(res, PUBLIC_DIR, pathname);
  if (pathname === "/" || pathname === "/index.html") return sendFile(res, GATE_DIR, "/login.html");
  return sendText(res, 403, "Access required");
});

/* ---------------------------------------------------------------- Admin server (this machine only) */

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const LOCAL_NAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

// True for localhost / 127.0.0.1 / [::1] on any port, so an SSH tunnel such as
// `ssh -L 8080:127.0.0.1:3004 …` works from whatever local port you pick.
function isLocalHost(host) {
  try {
    return LOCAL_NAMES.has(new URL(`http://${host}`).hostname);
  } catch {
    return false;
  }
}

const adminServer = http.createServer(async (req, res) => {
  // Bound to 127.0.0.1 already; these checks also stop DNS-rebinding and cross-site requests
  // from a web page that happens to be open in a browser on this machine.
  const host = req.headers.host || "";
  if (!LOOPBACK.has(req.socket.remoteAddress)) return sendText(res, 403, "Local access only");
  if (!isLocalHost(host)) return sendText(res, 403, "Unexpected host");

  const { pathname } = new URL(req.url, "http://localhost");

  if (req.method === "GET" && pathname === "/") return sendFile(res, GATE_DIR, "/admin.html");
  if (req.method === "GET" && pathname === "/api/requests") {
    const browsers = {};
    for (const s of Object.values(sessions)) browsers[s.request] = (browsers[s.request] || 0) + 1;
    const list = Object.entries(requests)
      .map(([id, r]) => ({
        id,
        code: shortCode(id),
        ...r,
        username: r.account ? accounts[r.account].username : null,
        browsers: browsers[id] || 0,
      }))
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    return sendJson(res, 200, list);
  }
  if (req.method === "GET" && pathname === "/api/invites") {
    dropExpiredInvites();
    const list = Object.entries(invites)
      .map(([id, inv]) => ({ id, ...inv }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sendJson(res, 200, list);
  }
  if (req.method !== "POST" || !ADMIN_ACTIONS[pathname]) return sendText(res, 404, "Not found");

  // A change must come from the admin page itself: same origin as the host it was sent to,
  // so another app on a different localhost port can't let anyone in.
  const origin = req.headers.origin;
  if ((origin && origin !== `http://${host}`) || req.headers["x-admin"] !== "1") {
    return sendText(res, 403, "Forbidden");
  }
  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendJson(res, 400, { error: "Bad request" });
  }
  return ADMIN_ACTIONS[pathname](res, body);
});

const ADMIN_ACTIONS = {
  // Returns the new code. Only its hash is stored, so this is the one time it can be shown.
  "/api/invite": (res, body) => {
    dropExpiredInvites();
    if (Object.keys(invites).length >= MAX_INVITES) {
      return sendJson(res, 400, { error: `There are already ${MAX_INVITES} unused invites. Cancel some first.` });
    }
    const code = newInvite(cleanText(body.note, 100));
    saveDb();
    return sendJson(res, 200, { code, days: INVITE_DAYS });
  },

  "/api/invite/cancel": (res, body) => {
    if (!invites[body.id]) return sendJson(res, 404, { error: "No such invite" });
    delete invites[body.id];
    saveDb();
    return sendJson(res, 200, { ok: true });
  },

  "/api/decide": (res, body) => {
    const r = requests[body.id];
    if (!r) return sendJson(res, 404, { error: "No such request" });
    if (body.action === "delete") {
      // Removes the login and signs out every browser, so the username is free again.
      delete requests[body.id];
      if (r.account) delete accounts[r.account];
      for (const [sid, s] of Object.entries(sessions)) if (s.request === body.id) delete sessions[sid];
      if (progress[body.id]) {
        delete progress[body.id];
        saveJson(PROGRESS_FILE, progress);
      }
    } else if (body.action === "approve" || body.action === "deny") {
      r.status = body.action === "approve" ? "approved" : "denied";
      r.decidedAt = new Date().toISOString();
    } else return sendJson(res, 400, { error: "Unknown action" });
    saveDb();
    console.log(`  ${body.action} ${shortCode(body.id)}${r.name ? ` (${r.name})` : ""}`);
    return sendJson(res, 200, { ok: true });
  },
};

for (const [server, port, name] of [[publicServer, PORT, "PORT"], [adminServer, ADMIN_PORT, "ADMIN_PORT"]]) {
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use — is the server already running? Set ${name}=… to use another port.`);
    } else console.error(err);
    process.exit(1);
  });
}

publicServer.listen(PORT, HOST, () => {
  console.log(`Site:           http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
});
adminServer.listen(ADMIN_PORT, ADMIN_HOST, () => {
  console.log(`Admin (local):  http://${ADMIN_HOST}:${ADMIN_PORT}  — approve requests and manage members here`);
});
