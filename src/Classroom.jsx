import { useEffect, useRef, useState } from "react";
import {
  GraduationCap,
  Users,
  Plus,
  ArrowRight,
  Copy,
  FileCheck,
  Send,
  LogOut,
  CheckCircle2,
} from "lucide-react";
import { lessons } from "./lessons";
export const classroomAvailable = import.meta.env.VITE_STATIC_SITE !== "true";
export async function api(path, body) {
  if (!classroomAvailable) throw Error("classroomServerRequired");
  let res;
  try {
    res = await fetch("/api" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw Error("network");
  }
  const data = await res.json();
  if (!res.ok) throw Error(data.error || "server_error");
  return data;
}
function GoogleLogin({ t, onLogin, onError }) {
  const root = useRef(),
    [config, setConfig] = useState(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    api("/config")
      .then((c) => {
        if (alive) setConfig(c);
      })
      .catch(onError);
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!config?.googleConfigured) return;
    let alive = true;
    function render() {
      if (!alive || !root.current) return;
      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: async (r) => {
          try {
            const data = await api("/auth/google", {
              credential: r.credential,
            });
            onLogin(data.user);
          } catch (e) {
            onError(e);
          }
        },
      });
      window.google.accounts.id.renderButton(root.current, {
        theme: "outline",
        size: "large",
        width: 260,
      });
    }
    if (window.google?.accounts) render();
    else {
      let script = document.getElementById("google-gsi");
      if (!script) {
        script = document.createElement("script");
        script.id = "google-gsi";
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
      script.addEventListener("error", () => setFailed(true));
    }
    return () => {
      alive = false;
    };
  }, [config]);
  if (config && !config.googleConfigured)
    return (
      <div className="setup-note">
        <strong>{t("googleSetup")}</strong>
        <p>{t("googleSetupText")}</p>
      </div>
    );
  return (
    <div>
      <div ref={root} />
      {(!window.google?.accounts || failed) && (
        <p className="muted">
          {failed ? t("errors.network") : t("loginLoading")}
        </p>
      )}
    </div>
  );
}
export default function Classroom({
  t,
  lang,
  user,
  setUser,
  project,
  onOpenProject,
  onLesson,
  notify,
}) {
  const [classes, setClasses] = useState([]),
    [selected, setSelected] = useState(null),
    [detail, setDetail] = useState(null),
    [joinCode, setJoinCode] = useState(""),
    [nickname, setNickname] = useState(""),
    [className, setClassName] = useState(""),
    [newClass, setNewClass] = useState(false),
    [assignmentForm, setAssignmentForm] = useState(false),
    [title, setTitle] = useState(""),
    [instructions, setInstructions] = useState(""),
    [lesson, setLesson] = useState(""),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState({});
  const error = (e) =>
    notify(
      t("errors." + e.message) === "errors." + e.message
        ? e.message
        : t("errors." + e.message),
      "error",
    );
  const refresh = async () => {
    try {
      const data = await api("/classes");
      setClasses(data.classes);
    } catch (e) {
      error(e);
    }
  };
  const load = async (id) => {
    try {
      setDetail(await api("/classes/" + id));
      setSelected(id);
    } catch (e) {
      error(e);
    }
  };
  useEffect(() => {
    setSelected(null);
    setDetail(null);
    if (user) refresh();
  }, [user?.id]);
  async function act(fn) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  }
  if (!classroomAvailable)
    return (
      <div className="classroom-page">
        <div className="page-heading">
          <h1>{t("classroom")}</h1>
        </div>
        <section className="card static-classroom">
          <GraduationCap size={44} />
          <h2>
            {lang === "hu"
              ? "Az osztályteremhez saját szerver szükséges"
              : "Classrooms need a server"}
          </h2>
          <p>
            {lang === "hu"
              ? "A Google-belépés, az osztályok és a beadott feladatok a projekt szerveres változatában működnek. A GitHub Pages a szerkesztőt, a szimulátort és a robotkapcsolatot szolgálja ki."
              : "Google sign-in, classes and submissions work in the server edition. GitHub Pages hosts the editor, simulator and robot connection."}
          </p>
          <a
            className="btn primary"
            href="https://github.com/kobak/xrp-studio#google-belépés-beállítása"
            target="_blank"
            rel="noreferrer"
          >
            {lang === "hu" ? "Telepítési útmutató" : "Deployment guide"}
          </a>
        </section>
      </div>
    );
  return (
    <div className="page classroom-page">
      <div className="page-intro">
        <span className="eyebrow">XRP CLASSROOM</span>
        <h1>{t("classTitle")}</h1>
        <p>{t("classText")}</p>
      </div>
      {!user ? (
        <div className="login-grid">
          <section className="card login-card">
            <div className="round-icon purple">
              <GraduationCap />
            </div>
            <h2>{t("teacher")}</h2>
            <p>{t("teacherText")}</p>
            <GoogleLogin t={t} onLogin={setUser} onError={error} />
          </section>
          <section className="card login-card">
            <div className="round-icon teal">
              <Users />
            </div>
            <h2>{t("student")}</h2>
            <p>{t("studentText")}</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act(async () =>
                  setUser(
                    (await api("/auth/join", { code: joinCode, nickname }))
                      .user,
                  ),
                );
              }}
            >
              <label>
                {t("classCode")}
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={20}
                  required
                  autoComplete="off"
                  placeholder="A1B2C3D4E5"
                />
              </label>
              <label>
                {t("nickname")}
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={40}
                  required
                  placeholder={
                    lang === "hu" ? "pl. KódolóKata" : "e.g. RobotRiley"
                  }
                />
              </label>
              <button className="btn primary" disabled={busy}>
                {t("join")}
                <ArrowRight size={17} />
              </button>
            </form>
            <p className="fine-print">{t("studentSessionHelp")}</p>
          </section>
        </div>
      ) : (
        <>
          <div className="account-bar">
            <span>
              <span className="avatar">{user.name.slice(0, 1)}</span>
              <strong>{user.name}</strong>
              <span className="pill">{t(user.role)}</span>
            </span>
            <button
              className="btn subtle"
              onClick={() =>
                act(async () => {
                  await api("/auth/logout", {});
                  setUser(null);
                })
              }
            >
              <LogOut size={16} />
              {t("logout")}
            </button>
          </div>
          <div className="class-layout">
            <aside className="card class-list">
              <div className="panel-head">
                <h3>{t("myClasses")}</h3>
                {user.role === "teacher" && (
                  <button
                    className="icon-btn"
                    title={t("newClass")}
                    aria-label={t("newClass")}
                    onClick={() => setNewClass(!newClass)}
                  >
                    <Plus size={18} />
                  </button>
                )}
              </div>
              {newClass && (
                <form
                  className="inline-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(async () => {
                      const c = await api("/classes", { name: className });
                      setClassName("");
                      setNewClass(false);
                      await refresh();
                      await load(c.id);
                    });
                  }}
                >
                  <label>
                    {t("className")}
                    <input
                      required
                      value={className}
                      maxLength={100}
                      onChange={(e) => setClassName(e.target.value)}
                    />
                  </label>
                  <button className="btn primary small" disabled={busy}>
                    {t("create")}
                  </button>
                </form>
              )}
              {!classes.length && (
                <p className="empty-small">{t("noClasses")}</p>
              )}
              {classes.map((c) => (
                <button
                  className={`class-item ${selected === c.id ? "selected" : ""}`}
                  key={c.id}
                  onClick={() => load(c.id)}
                >
                  <Users size={18} />
                  {c.name}
                  <ArrowRight size={15} />
                </button>
              ))}
            </aside>
            <section className="class-content">
              {!detail ? (
                <div className="card empty-state">
                  <GraduationCap size={48} />
                  <h2>{t("myClasses")}</h2>
                  <p>{t("classText")}</p>
                </div>
              ) : (
                <>
                  <div className="class-header">
                    <h2>{detail.classroom.name}</h2>
                    {user.role === "teacher" && (
                      <button
                        className="btn secondary"
                        onClick={() => {
                          navigator.clipboard
                            .writeText(detail.classroom.code)
                            .then(() => notify(t("copied")))
                            .catch(() => notify(detail.classroom.code));
                        }}
                      >
                        <Copy size={16} />
                        {detail.classroom.code}
                      </button>
                    )}
                  </div>
                  {user.role === "teacher" && (
                    <p className="muted">{t("classCodeHelp")}</p>
                  )}
                  <div className="section-heading">
                    <h3>
                      {t("assignments")}{" "}
                      <span className="count">{detail.assignments.length}</span>
                    </h3>
                    {user.role === "teacher" && (
                      <button
                        className="btn primary small"
                        onClick={() => setAssignmentForm(!assignmentForm)}
                      >
                        <Plus size={16} />
                        {t("newAssignment")}
                      </button>
                    )}
                  </div>
                  {assignmentForm && (
                    <form
                      className="card assignment-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        act(async () => {
                          await api(`/classes/${selected}/assignments`, {
                            title,
                            instructions,
                            lesson,
                          });
                          setAssignmentForm(false);
                          setTitle("");
                          setInstructions("");
                          await load(selected);
                        });
                      }}
                    >
                      <label>
                        {t("assignmentTitle")}
                        <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          maxLength={150}
                          required
                        />
                      </label>
                      <label>
                        {t("instructions")}
                        <textarea
                          value={instructions}
                          onChange={(e) => setInstructions(e.target.value)}
                          maxLength={5000}
                          rows={3}
                          required
                        />
                      </label>
                      <label>
                        {t("starterLesson")}
                        <select
                          value={lesson}
                          onChange={(e) => setLesson(e.target.value)}
                        >
                          <option value="">{t("none")}</option>
                          {lessons.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l[lang].title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="btn primary" disabled={busy}>
                        {t("publish")}
                      </button>
                    </form>
                  )}
                  {!detail.assignments.length && (
                    <p className="card empty-small">{t("noAssignments")}</p>
                  )}
                  {detail.assignments.map((a) => {
                    const submitted = detail.submissions.find(
                      (s) =>
                        s.assignment_id === a.id && s.student_id === user.id,
                    );
                    return (
                      <article className="card assignment-card" key={a.id}>
                        <div className="assignment-icon">
                          <FileCheck />
                        </div>
                        <div>
                          <h3>{a.title}</h3>
                          <p className="preserve-lines">{a.instructions}</p>
                          <div className="assignment-actions">
                            {a.lesson && (
                              <button
                                className="btn secondary small"
                                onClick={() =>
                                  onLesson(
                                    lessons.find((l) => l.id === a.lesson),
                                  )
                                }
                              >
                                {t("starterLesson")}
                                <ArrowRight size={15} />
                              </button>
                            )}
                            {user.role === "student" && (
                              <button
                                className="btn primary small"
                                disabled={busy || !project}
                                onClick={() =>
                                  act(async () => {
                                    await api(`/assignments/${a.id}/submit`, {
                                      project,
                                    });
                                    notify(t("submissionSaved"));
                                    await load(selected);
                                  })
                                }
                              >
                                <Send size={15} />
                                {t("submit")}
                              </button>
                            )}
                            {submitted && (
                              <span className="success-text">
                                <CheckCircle2 size={15} />
                                {t("submitted")}
                              </span>
                            )}
                          </div>
                          {submitted?.feedback && (
                            <blockquote>
                              <strong>{t("feedback")}</strong>
                              <p>{submitted.feedback}</p>
                            </blockquote>
                          )}
                        </div>
                      </article>
                    );
                  })}
                  {user.role === "teacher" && (
                    <>
                      <div className="section-heading">
                        <h3>
                          {t("students")}{" "}
                          <span className="count">
                            {detail.students.length}
                          </span>
                        </h3>
                      </div>
                      <div className="student-chips">
                        {detail.students.map((s) => (
                          <span className="pill" key={s.student_id}>
                            {s.nickname}
                          </span>
                        ))}
                      </div>
                      <div className="section-heading">
                        <h3>
                          {t("submissions")}{" "}
                          <span className="count">
                            {detail.submissions.length}
                          </span>
                        </h3>
                      </div>
                      {!detail.submissions.length && (
                        <p className="card empty-small">{t("noSubmissions")}</p>
                      )}
                      {detail.submissions.map((s) => (
                        <article className="card submission-card" key={s.id}>
                          <div className="submission-head">
                            <div>
                              <strong>{s.nickname}</strong>
                              <p>
                                {
                                  detail.assignments.find(
                                    (a) => a.id === s.assignment_id,
                                  )?.title
                                }{" "}
                                ·{" "}
                                {new Date(s.created).toLocaleString(
                                  lang === "hu" ? "hu-HU" : "en-GB",
                                )}
                              </p>
                            </div>
                            <button
                              className="btn secondary small"
                              onClick={() => onOpenProject(s.project)}
                            >
                              {t("viewProject")}
                            </button>
                          </div>
                          <label>
                            {t("feedback")}
                            <textarea
                              rows={2}
                              maxLength={5000}
                              value={feedback[s.id] ?? s.feedback}
                              onChange={(e) =>
                                setFeedback({
                                  ...feedback,
                                  [s.id]: e.target.value,
                                })
                              }
                            />
                          </label>
                          <button
                            className="btn primary small"
                            disabled={busy}
                            onClick={() =>
                              act(async () => {
                                await api(`/submissions/${s.id}/feedback`, {
                                  feedback: feedback[s.id] ?? s.feedback,
                                });
                                notify(t("feedbackSaved"));
                                await load(selected);
                              })
                            }
                          >
                            {t("saveFeedback")}
                          </button>
                        </article>
                      ))}
                    </>
                  )}
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
