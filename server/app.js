import express from "express";
import helmet from "helmet";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
const hash = (t) => createHash("sha256").update(t).digest("hex");
const iso = () => new Date().toISOString();
const fail = (status, message) => Object.assign(new Error(message), { status });
const text = (v, max = 200) =>
  typeof v === "string" && v.trim().length && v.trim().length <= max
    ? v.trim()
    : null;
export function createApp({
  db,
  clientId = "",
  origin = "http://localhost:4173",
  production = false,
  verifyGoogle,
} = {}) {
  const app = express(),
    google = new OAuth2Client(clientId),
    limits = new Map();
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    }),
  );
  app.use(express.json({ limit: "800kb" }));
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD"].includes(req.method) && req.headers.origin !== origin)
      return res.status(403).json({ error: "origin" });
    const raw = (req.headers.cookie || "")
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("xrp_session="))
      ?.slice(12);
    if (raw)
      req.user = db
        .prepare(
          "SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?",
        )
        .get(hash(raw), Date.now());
    next();
  });
  function limit(req, res, next) {
    const key = req.ip;
    const now = Date.now();
    const entry = limits.get(key);
    if (!entry || entry.until < now)
      limits.set(key, { count: 1, until: now + 60000 });
    else if (++entry.count > 20)
      return res.status(429).json({ error: "rate_limit" });
    if (limits.size > 10000)
      for (const [k, v] of limits) if (v.until < now) limits.delete(k);
    next();
  }
  const auth = (req, res, next) =>
    req.user ? next() : res.status(401).json({ error: "sign_in" });
  const teacher = (req, res, next) =>
    req.user?.role === "teacher"
      ? next()
      : res.status(403).json({ error: "teacher_only" });
  const owns = (id, user) =>
    db
      .prepare("SELECT * FROM classrooms WHERE id=? AND teacher_id=?")
      .get(id, user.id);
  const member = (id, user) =>
    db
      .prepare("SELECT * FROM memberships WHERE class_id=? AND student_id=?")
      .get(id, user.id);
  function session(req, res, user) {
    const old = (req.headers.cookie || "")
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("xrp_session="))
      ?.slice(12);
    if (old) db.prepare("DELETE FROM sessions WHERE token=?").run(hash(old));
    db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
      hash(token),
      user.id,
      Date.now() + 7 * 86400000,
    );
    res.cookie("xrp_session", token, {
      httpOnly: true,
      secure: production,
      sameSite: "lax",
      maxAge: 7 * 86400000,
      path: "/",
    });
  }
  app.get("/api/config", (req, res) =>
    res.json({ googleClientId: clientId, googleConfigured: !!clientId }),
  );
  app.get("/api/me", (req, res) =>
    res.json({
      user: req.user
        ? { id: req.user.id, name: req.user.name, role: req.user.role }
        : null,
    }),
  );
  app.post("/api/auth/google", limit, async (req, res) => {
    if (!clientId) throw fail(503, "google_not_configured");
    if (
      typeof req.body.credential !== "string" ||
      req.body.credential.length > 10000
    )
      throw fail(400, "invalid_token");
    let payload;
    try {
      payload = verifyGoogle
        ? await verifyGoogle(req.body.credential)
        : (
            await google.verifyIdToken({
              idToken: req.body.credential,
              audience: clientId,
            })
          ).getPayload();
    } catch {
      throw fail(401, "invalid_token");
    }
    if (!payload?.sub || !payload.email_verified)
      throw fail(401, "unverified_google_account");
    let user = db
      .prepare("SELECT * FROM users WHERE google_id=?")
      .get(payload.sub);
    if (!user) {
      user = {
        id: randomUUID(),
        google_id: payload.sub,
        name: String(payload.name || payload.email).slice(0, 100),
        role: "teacher",
      };
      db.prepare("INSERT INTO users VALUES(?,?,?,?)").run(
        user.id,
        user.google_id,
        user.name,
        user.role,
      );
    }
    session(req, res, user);
    res.json({ user: { id: user.id, name: user.name, role: user.role } });
  });
  app.post("/api/auth/join", limit, (req, res) => {
    const code = text(req.body.code, 20)?.toUpperCase(),
      name = text(req.body.nickname, 40);
    if (!code || !name) throw fail(400, "invalid_join");
    const classroom = db
      .prepare("SELECT * FROM classrooms WHERE code=?")
      .get(code);
    if (!classroom) throw fail(404, "class_not_found");
    if (req.user?.role === "teacher") throw fail(409, "teacher_sign_out");
    if (req.user?.role === "student" && member(classroom.id, req.user))
      return res.json({
        user: { id: req.user.id, name: req.user.name, role: "student" },
      });
    if (
      db
        .prepare(
          "SELECT 1 FROM memberships WHERE class_id=? AND nickname=? COLLATE NOCASE",
        )
        .get(classroom.id, name)
    )
      throw fail(409, "nickname_taken");
    const user = req.user || { id: randomUUID(), name, role: "student" };
    db.exec("BEGIN");
    try {
      if (!req.user)
        db.prepare("INSERT INTO users VALUES(?,NULL,?,?)").run(
          user.id,
          user.name,
          user.role,
        );
      db.prepare("INSERT INTO memberships VALUES(?,?,?)").run(
        classroom.id,
        user.id,
        name,
      );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    session(req, res, user);
    res.json({ user: { id: user.id, name: user.name, role: user.role } });
  });
  app.post("/api/auth/logout", (req, res) => {
    const raw = (req.headers.cookie || "")
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("xrp_session="))
      ?.slice(12);
    if (raw) db.prepare("DELETE FROM sessions WHERE token=?").run(hash(raw));
    res.clearCookie("xrp_session", { path: "/" });
    res.json({ ok: true });
  });
  app.get("/api/classes", auth, (req, res) => {
    const classes =
      req.user.role === "teacher"
        ? db
            .prepare(
              "SELECT * FROM classrooms WHERE teacher_id=? ORDER BY created DESC",
            )
            .all(req.user.id)
        : db
            .prepare(
              "SELECT c.id,c.name,c.created FROM classrooms c JOIN memberships m ON m.class_id=c.id WHERE m.student_id=? ORDER BY c.created DESC",
            )
            .all(req.user.id);
    res.json({ classes });
  });
  app.post("/api/classes", teacher, (req, res) => {
    const name = text(req.body.name, 100);
    if (!name) throw fail(400, "invalid_name");
    const id = randomUUID(),
      code = randomBytes(5).toString("hex").toUpperCase();
    db.prepare("INSERT INTO classrooms VALUES(?,?,?,?,?)").run(
      id,
      req.user.id,
      name,
      code,
      iso(),
    );
    res.status(201).json({ id, name, code });
  });
  app.get("/api/classes/:id", auth, (req, res) => {
    const c =
      owns(req.params.id, req.user) ||
      (member(req.params.id, req.user)
        ? db
            .prepare("SELECT id,name,created FROM classrooms WHERE id=?")
            .get(req.params.id)
        : null);
    if (!c) throw fail(404, "class_not_found");
    const assignments = db
      .prepare(
        "SELECT * FROM assignments WHERE class_id=? ORDER BY created DESC",
      )
      .all(c.id);
    const students =
      req.user.role === "teacher"
        ? db
            .prepare(
              "SELECT student_id,nickname FROM memberships WHERE class_id=? ORDER BY nickname",
            )
            .all(c.id)
        : [];
    const submissions =
      req.user.role === "teacher"
        ? db
            .prepare(
              "SELECT s.*,m.nickname FROM submissions s JOIN assignments a ON a.id=s.assignment_id JOIN memberships m ON m.class_id=a.class_id AND m.student_id=s.student_id WHERE a.class_id=? ORDER BY s.created DESC",
            )
            .all(c.id)
        : db
            .prepare(
              "SELECT s.* FROM submissions s JOIN assignments a ON a.id=s.assignment_id WHERE a.class_id=? AND s.student_id=?",
            )
            .all(c.id, req.user.id);
    res.json({
      classroom: c,
      assignments,
      students,
      submissions: submissions.map((s) => ({
        ...s,
        project: JSON.parse(s.project),
      })),
    });
  });
  app.post("/api/classes/:id/assignments", teacher, (req, res) => {
    if (!owns(req.params.id, req.user)) throw fail(404, "class_not_found");
    const title = text(req.body.title, 150),
      instructions = text(req.body.instructions, 5000);
    if (!title || !instructions) throw fail(400, "invalid_assignment");
    const id = randomUUID();
    db.prepare("INSERT INTO assignments VALUES(?,?,?,?,?,?)").run(
      id,
      req.params.id,
      title,
      instructions,
      text(req.body.lesson, 100),
      iso(),
    );
    res.status(201).json({ id });
  });
  app.post("/api/assignments/:id/submit", auth, (req, res) => {
    const a = db
      .prepare("SELECT * FROM assignments WHERE id=?")
      .get(req.params.id);
    if (req.user.role !== "student" || !a || !member(a.class_id, req.user))
      throw fail(403, "not_enrolled");
    const p = req.body.project;
    if (
      !p ||
      p.version !== 1 ||
      !text(p.name, 150) ||
      typeof p.python !== "string" ||
      p.python.length > 150000 ||
      !p.workspace ||
      typeof p.workspace !== "object"
    )
      throw fail(400, "invalid_project");
    db.prepare(
      "INSERT INTO submissions VALUES(?,?,?,?,?,?) ON CONFLICT(assignment_id,student_id) DO UPDATE SET project=excluded.project,created=excluded.created",
    ).run(randomUUID(), a.id, req.user.id, JSON.stringify(p), "", iso());
    res.json({ ok: true });
  });
  app.post("/api/submissions/:id/feedback", teacher, (req, res) => {
    const s = db
      .prepare(
        "SELECT s.id FROM submissions s JOIN assignments a ON a.id=s.assignment_id JOIN classrooms c ON c.id=a.class_id WHERE s.id=? AND c.teacher_id=?",
      )
      .get(req.params.id, req.user.id);
    if (!s) throw fail(404, "submission_not_found");
    const feedback =
      typeof req.body.feedback === "string" ? req.body.feedback.trim() : null;
    if (feedback === null || feedback.length > 5000)
      throw fail(400, "invalid_feedback");
    db.prepare("UPDATE submissions SET feedback=? WHERE id=?").run(
      feedback,
      s.id,
    );
    res.json({ ok: true });
  });
  app.use("/api", (req, res) => res.status(404).json({ error: "not_found" }));
  app.use((err, req, res, next) => {
    if ((err.status >= 400 && err.status < 500) || err.status === 503)
      return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "server_error" });
  });
  return app;
}
