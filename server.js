// Access-gated server for the grammar site. No dependencies — run with `node server.js`.
//
// Public port (PORT, default 5173): the site in public/ is open to everyone except the Lessons
// tab (LOCKED_FILES below). Visitors request access from that tab, and only a browser whose
// request has been approved can download the lesson files.
//
// Admin port (ADMIN_PORT, default 3004): bound to 127.0.0.1, so it is only reachable from this
// machine. Open http://127.0.0.1:3004 here to approve, decline or revoke requests.

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

// Files only approved browsers may download: the Lessons tab and its data.
const LOCKED_FILES = ["js/lessons.js", "js/drills.js", "js/lesson-prompts.js", "js/lesson-page.js"];
// Compare resolved paths (case-folded where the file system ignores case) so tricks like
// /js//lessons.js or /JS/Lessons.js can't slip past.
const foldCase = (p) => (process.platform === "win32" || process.platform === "darwin" ? p.toLowerCase() : p);
const LOCKED = new Set(LOCKED_FILES.map((f) => foldCase(path.join(PUBLIC_DIR, f))));
const isLocked = (file) => file !== null && LOCKED.has(foldCase(file));
const DATA_FILE = path.join(__dirname, "data", "access.json");

const COOKIE = "jpg_access";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
const MAX_BODY = 4 * 1024;
const MAX_PENDING = 200; // stop a flood of requests from filling the list
const REQUESTS_PER_IP_PER_HOUR = 5;

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

// data/access.json holds three maps:
//   requests: { [id]: { name, message, ip, ua, status, requestedAt, decidedAt, lastSeen, account? } }
//   accounts: { [lower-case username]: { username, password, request } }  (password = scrypt hash)
//   sessions: { [sha256(cookie token)]: { request, createdAt } }          (one per signed-in browser)
// Approving, declining or revoking acts on a request. An account ties a username and password to
// one request, so every browser that logs in shares its access. The file never holds a usable
// cookie or a plain password.
const db = loadDb();
const { requests, accounts, sessions } = db;
const MAX_SESSIONS_PER_REQUEST = 20;

function loadDb() {
  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch { /* no file yet */ }
  if (raw.requests) return { requests: raw.requests, accounts: raw.accounts || {}, sessions: raw.sessions || {} };
  // First version: browser-only requests keyed by the hash of that browser's token.
  const sessions = {};
  for (const [id, r] of Object.entries(raw)) sessions[id] = { request: id, createdAt: r.requestedAt };
  return { requests: raw, accounts: {}, sessions };
}

function saveDb() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
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

/* ---------------------------------------------------------------- Responses */

function baseHeaders(extra = {}) {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
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

function readJson(req) {
  return new Promise((resolve, reject) => {
    if (!/^application\/json\b/i.test(req.headers["content-type"] || "")) return reject(new Error("json only"));
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
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

// Sliding-window counters: key -> timestamps. Used for new requests and for failed logins.
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

async function body(req, res) {
  try {
    return await readJson(req);
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

  const id = crypto.randomBytes(32).toString("hex");
  requests[id] = {
    name: cred.username,
    message: cleanText(b.message, 300),
    ip,
    ua: cleanText(req.headers["user-agent"], 200),
    status: "pending",
    requestedAt: new Date().toISOString(),
    account: cred.key,
  };
  accounts[cred.key] = { username: cred.username, password: await hashPassword(cred.password), request: id };
  const setCookie = startSession(req, id);
  saveDb();
  note(`req:${ip}`);

  console.log(`\x1b[33m● Access request\x1b[0m ${shortCode(id)} from "${cred.username}" (${ip}) — review at http://${ADMIN_HOST}:${ADMIN_PORT}`);
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

const ACCESS_ROUTES = {
  "/access/request": handleRequest,
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
  if (req.method !== "GET" && req.method !== "HEAD") return sendText(res, 405, "Method not allowed");

  // The Lessons files need an approved request; everything else in public/ is open.
  if (isLocked(resolveIn(PUBLIC_DIR, pathname))) {
    if (!me || requests[me.id].status !== "approved") return sendText(res, 403, "Access required");
    touch(me.id);
  }
  return sendFile(res, PUBLIC_DIR, pathname);
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
  if (req.method === "POST" && pathname === "/api/decide") {
    // A decision must come from the admin page itself: same origin as the host it was sent to,
    // so another app on a different localhost port can't approve anyone.
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
    const r = requests[body.id];
    if (!r) return sendJson(res, 404, { error: "No such request" });
    if (body.action === "delete") {
      // Removes the login and signs out every browser, so the username is free again.
      delete requests[body.id];
      if (r.account) delete accounts[r.account];
      for (const [sid, s] of Object.entries(sessions)) if (s.request === body.id) delete sessions[sid];
    } else if (body.action === "approve" || body.action === "deny") {
      r.status = body.action === "approve" ? "approved" : "denied";
      r.decidedAt = new Date().toISOString();
    } else return sendJson(res, 400, { error: "Unknown action" });
    saveDb();
    console.log(`  ${body.action} ${shortCode(body.id)}${r.name ? ` (${r.name})` : ""}`);
    return sendJson(res, 200, { ok: true });
  }
  sendText(res, 404, "Not found");
});

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
  console.log(`Admin (local):  http://${ADMIN_HOST}:${ADMIN_PORT}  — approve access requests here`);
});
