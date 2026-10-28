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
const LOCKED_FILES = ["js/lessons.js", "js/drills.js", "js/lesson-page.js"];
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

// Requests are keyed by the SHA-256 of the visitor's cookie token, so the file never holds a
// usable cookie. { [id]: { name, message, ip, ua, status, requestedAt, decidedAt, lastSeen } }
let requests = loadRequests();

function loadRequests() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveRequests() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(requests, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const shortCode = (id) => id.slice(0, 6).toUpperCase();

function visitorId(req) {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})(?:;|$)`).exec(req.headers.cookie || "");
  if (!m) return null;
  const id = sha256(m[1]);
  return requests[id] ? id : null;
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

const recentByIp = new Map(); // ip -> timestamps of recent requests

function rateLimited(ip) {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const times = (recentByIp.get(ip) || []).filter((t) => t > hourAgo);
  recentByIp.set(ip, times);
  return times.length >= REQUESTS_PER_IP_PER_HOUR;
}

async function handleAccessRequest(req, res, id) {
  if (id) return sendJson(res, 200, { status: requests[id].status, code: shortCode(id) });

  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendJson(res, 400, { error: "Could not read the request." });
  }
  const name = cleanText(body.name, 40);
  const message = cleanText(body.message, 300);
  if (!name) return sendJson(res, 400, { error: "Please enter your name." });

  const ip = req.socket.remoteAddress || "";
  if (rateLimited(ip)) return sendJson(res, 429, { error: "Too many requests. Please try again later." });
  const pending = Object.values(requests).filter((r) => r.status === "pending").length;
  if (pending >= MAX_PENDING) return sendJson(res, 503, { error: "Too many open requests. Please try again later." });

  const token = crypto.randomBytes(32).toString("hex");
  const newId = sha256(token);
  requests[newId] = {
    name,
    message,
    ip,
    ua: cleanText(req.headers["user-agent"], 200),
    status: "pending",
    requestedAt: new Date().toISOString(),
  };
  saveRequests();
  recentByIp.get(ip).push(Date.now());

  console.log(`\x1b[33m● Access request\x1b[0m ${shortCode(newId)} from "${name}" (${ip}) — review at http://${ADMIN_HOST}:${ADMIN_PORT}`);

  const secure = req.socket.encrypted || req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  sendJson(res, 200, { status: "pending", code: shortCode(newId) }, {
    "Set-Cookie": `${COOKIE}=${token}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`,
  });
}

function touch(id) {
  const r = requests[id];
  const now = Date.now();
  if (!r.lastSeen || now - Date.parse(r.lastSeen) > 10 * 60 * 1000) {
    r.lastSeen = new Date(now).toISOString();
    saveRequests();
  }
}

const publicServer = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  const id = visitorId(req);
  const status = id ? requests[id].status : "none";

  if (pathname === "/access/status" && req.method === "GET") {
    return sendJson(res, 200, { status, code: id ? shortCode(id) : null });
  }
  if (pathname === "/access/request" && req.method === "POST") {
    return handleAccessRequest(req, res, id);
  }
  if (req.method !== "GET" && req.method !== "HEAD") return sendText(res, 405, "Method not allowed");

  // The Lessons files need an approved request; everything else in public/ is open.
  if (isLocked(resolveIn(PUBLIC_DIR, pathname))) {
    if (status !== "approved") return sendText(res, 403, "Access required");
    touch(id);
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
    const list = Object.entries(requests)
      .map(([id, r]) => ({ id, code: shortCode(id), ...r }))
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
    if (body.action === "delete") delete requests[body.id];
    else if (body.action === "approve" || body.action === "deny") {
      r.status = body.action === "approve" ? "approved" : "denied";
      r.decidedAt = new Date().toISOString();
    } else return sendJson(res, 400, { error: "Unknown action" });
    saveRequests();
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
