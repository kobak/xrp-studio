import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  lazy,
  Suspense,
} from "react";
import { createRoot } from "react-dom/client";
import {
  Home,
  FolderOpen,
  BookOpen,
  GraduationCap,
  Plus,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Download,
  Upload,
  Globe,
  Check,
  CheckCircle2,
  Link2,
  Unplug,
  Usb,
  Bluetooth,
  Play,
  Square,
  FlaskConical,
  Code2,
  Blocks,
  Terminal,
  Trash2,
  X,
  Lightbulb,
  Clock,
  MoreHorizontal,
  Copy,
  Radio,
  Settings2,
  HelpCircle,
  ExternalLink,
  Sparkles,
  FileCode,
  Users,
} from "lucide-react";
import { tr } from "./i18n";
import { lessons } from "./lessons";
import {
  loadProjects,
  saveProjects,
  newProject,
  validProject,
  download,
} from "./projects";
import { lessonWorkspace, pythonFromState } from "./blocks";
import BlockEditor from "./BlockEditor";
import PythonEditor from "./PythonEditor";
import DrivePanel from "./DrivePanel";
import { driveProgram } from "./xpp.js";
import Playground, { initialState } from "./Playground";
import { RobotConnection } from "./robot";
import { createSimulationRunner } from "./simulation";
import Classroom, { api } from "./Classroom";
import "./style.css";

function RobotArt({ lang }) {
  return (
    <div className="robot-art" aria-hidden="true">
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <span className="deco deco-a">✦</span>
      <span className="deco deco-b">+</span>
      <span className="deco deco-c">✦</span>
      <span className="code-float code-float-one">
        <Blocks size={18} /> move(30)
      </span>
      <span className="code-float code-float-two">
        <CheckCircle2 size={17} /> {lang === "hu" ? "indulás!" : "let’s go!"}
      </span>
      <img src={import.meta.env.BASE_URL + "robot.svg"} alt="" />
      <span className="robot-shadow" />
    </div>
  );
}
function Modal({ title, children, onClose }) {
  const root = useRef(),
    close = useRef();
  useEffect(() => {
    const before = document.activeElement;
    close.current?.focus();
    function keys(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        const items = [
          ...root.current.querySelectorAll(
            "button:not(:disabled),input,select,textarea,a[href]",
          ),
        ];
        if (e.shiftKey && document.activeElement === items[0]) {
          e.preventDefault();
          items.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
          e.preventDefault();
          items[0]?.focus();
        }
      }
    }
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("keydown", keys);
      before?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={root}
        className="modal card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            ref={close}
            className="icon-btn"
            onClick={onClose}
            aria-label={
              document.documentElement.lang === "hu" ? "Bezárás" : "Close"
            }
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function App() {
  const [lang, setLang] = useState(
    () =>
      localStorage.getItem("xrp-studio-lang") ||
      ((navigator.language || "").startsWith("hu") ? "hu" : "en"),
  );
  const t = useCallback((k) => tr(lang, k), [lang]);
  const [initialProjects] = useState(() => {
    const stored = loadProjects();
    return stored.length
      ? stored
      : [
          newProject(
            lang === "hu" ? "Az első kalandom" : "My first adventure",
            lessonWorkspace(lessons[0]),
          ),
        ];
  });
  const [view, setView] = useState("editor"),
    [projects, setProjects] = useState(initialProjects),
    [activeId, setActiveId] = useState(initialProjects[0].id),
    [sideTab, setSideTab] = useState("dashboard"),
    [modal, setModal] = useState(null),
    [name, setName] = useState(""),
    [toast, setToast] = useState(null),
    [runState, setRunState] = useState(null),
    [simState, setSimState] = useState(initialState),
    [sensorValues, setSensorValues] = useState(null),
    [connection, setConnection] = useState({ connected: false }),
    [logs, setLogs] = useState([]),
    [pythonSource, setPythonSource] = useState(
      initialProjects[0].pythonSource ||
        (initialProjects[0].mode === "python" ? "custom" : "generated"),
    ),
    [generated, setGenerated] = useState(() =>
      pythonFromState(initialProjects[0].workspace, lang),
    ),
    [activeLesson, setActiveLesson] = useState(null),
    [lessonVisible, setLessonVisible] = useState(true),
    [user, setUser] = useState(null),
    [connectBusy, setConnectBusy] = useState(false),
    [sensorBusy, setSensorBusy] = useState(false),
    [saved, setSaved] = useState(true),
    [menu, setMenu] = useState(false),
    [progress, setProgress] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem("xrp-studio-progress") || "[]");
      } catch {
        return [];
      }
    });
  const project = projects.find((p) => p.id === activeId),
    projectRef = useRef(project);
  projectRef.current = project;
  const importRef = useRef(),
    worker = useRef(),
    runGeneration = useRef(0),
    frame = useRef(),
    consoleRef = useRef(),
    toastTimer = useRef();
  const append = useCallback(
    (text, kind = "normal") =>
      setLogs((prev) =>
        [...prev, { id: crypto.randomUUID(), text, kind }].slice(-300),
      ),
    [],
  );
  const robot = useRef();
  if (!robot.current)
    robot.current = new RobotConnection({
      onOutput: (s) => {
        const clean = s.replace(/[\x00-\x08\x0b-\x1f]/g, "");
        if (clean.trim()) append(clean);
      },
      onState: (state) => {
        setConnection(state);
        if (!state.connected) setSensorValues(null);
      },
      onSensors: (values) =>
        setSensorValues((previous) => ({ ...previous, ...values })),
    });
  const notify = useCallback((text, kind = "success") => {
    setToast({ text, kind });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5500);
  }, []);
  const error = (e) => {
    const key = e.message;
    notify(
      t(key) !== key
        ? t(key)
        : t("errors." + key) !== "errors." + key
          ? t("errors." + key)
          : key,
      "error",
    );
  };
  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem("xrp-studio-lang", lang);
  }, [lang]);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        saveProjects(projects);
        setSaved(true);
      } catch {
        setSaved("error");
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [projects]);
  useEffect(() => {
    const flush = () => {
      try {
        saveProjects(projects);
      } catch {}
    };
    const visibility = () => {
      if (document.hidden) flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [projects]);
  useEffect(() => {
    api("/me")
      .then((d) => setUser(d.user))
      .catch(() => {});
    return () => {
      worker.current?.terminate();
      cancelAnimationFrame(frame.current);
      robot.current.disconnect();
    };
  }, []);
  useEffect(() => {
    consoleRef.current?.scrollTo({ top: consoleRef.current.scrollHeight });
  }, [logs]);
  const updateProject = useCallback(
    (patch) => {
      setSaved(false);
      setProjects((prev) =>
        prev.map((p) =>
          p.id === activeId
            ? { ...p, ...patch, updated: new Date().toISOString() }
            : p,
        ),
      );
    },
    [activeId],
  );
  function addProject(p) {
    const source = pythonFromState(p.workspace, lang);
    setProjects((prev) => [p, ...prev]);
    setActiveId(p.id);
    setView("editor");
    setPythonSource(
      p.pythonSource || (p.mode === "python" ? "custom" : "generated"),
    );
    setGenerated(source);
    setMenu(false);
  }
  function create() {
    if (!name.trim()) {
      notify(t("nameRequired"), "error");
      return;
    }
    addProject(newProject(name.trim()));
    setModal(null);
    setActiveLesson(null);
  }
  function startLesson(l) {
    if (!l) return;
    addProject(newProject(l[lang].title, lessonWorkspace(l)));
    setActiveLesson(l.id);
    setLessonVisible(true);
    setModal(null);
  }
  function openProject(p) {
    setActiveId(p.id);
    setPythonSource(
      p.pythonSource || (p.mode === "python" ? "custom" : "generated"),
    );
    setActiveLesson(null);
    setView("editor");
    setGenerated(pythonFromState(p.workspace, lang));
  }
  function importProject(p) {
    if (!validProject(p)) {
      notify(t("invalidProject"), "error");
      return;
    }
    const imported = {
      ...p,
      id: crypto.randomUUID(),
      name: p.name.slice(0, 150),
      updated: new Date().toISOString(),
    };
    addProject(imported);
    setActiveLesson(null);
    notify(t("projectImported"));
  }
  async function readImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 800000) throw Error();
      importProject(JSON.parse(await file.text()));
    } catch {
      notify(t("invalidProject"), "error");
    }
    e.target.value = "";
  }
  function exportProject() {
    if (project)
      download(project.name + ".xrp.json", JSON.stringify(project, null, 2));
    setMenu(false);
  }
  const code =
    project?.mode === "python"
      ? pythonSource === "generated"
        ? generated
        : project.python
      : generated;
  function exportPython() {
    download((project?.name || "xrp") + ".py", code || "", "text/x-python");
    setMenu(false);
  }
  async function stop() {
    if (runState === "stopping") return;
    runGeneration.current++;
    cancelAnimationFrame(frame.current);
    worker.current?.terminate();
    worker.current = null;
    const was = runState;
    setRunState(
      was === "robot" || was === "drive" || robot.current.busy
        ? "stopping"
        : null,
    );
    if (was === "robot" || was === "drive" || robot.current.busy) {
      try {
        await robot.current.stop();
      } catch (e) {
        error(e);
        setRunState(null);
        return;
      }
    }
    setRunState(null);
    append(t("stopped"), "info");
  }
  useEffect(() => {
    function key(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        try {
          saveProjects(projects);
          setSaved(true);
        } catch {
          setSaved("error");
        }
      }
      if (e.key === "Escape" && runState && !modal) stop();
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [projects, runState, modal]);
  async function animate(events, generation) {
    let current = { ...simState };
    for (const event of events) {
      if (generation !== runGeneration.current) return;
      if (event.type === "print") {
        append(event.text);
        continue;
      }
      const end = event.state;
      if (!end) continue;
      const start = { ...current };
      const duration = Math.max(
        40,
        Math.min(1300, (event.duration || 0.04) * 650),
      );
      await new Promise((resolve) => {
        let began;
        function tick(now) {
          if (generation !== runGeneration.current) {
            resolve();
            return;
          }
          began ??= now;
          const f = Math.min(1, (now - began) / duration);
          setSimState({
            ...end,
            x: start.x + (end.x - start.x) * f,
            y: start.y + (end.y - start.y) * f,
            heading: start.heading + (end.heading - start.heading) * f,
          });
          if (f < 1) frame.current = requestAnimationFrame(tick);
          else resolve();
        }
        frame.current = requestAnimationFrame(tick);
      });
      current = end;
    }
  }
  async function simulate() {
    if (runState || !code) return;
    const generation = ++runGeneration.current;
    setRunState("sim");
    setSensorValues(null);
    append(t("running"), "info");
    if (!worker.current) worker.current = createSimulationRunner();
    worker.current.onmessage = async ({ data }) => {
      if (generation !== runGeneration.current) return;
      if (data.type === "loading") append(t("loadingPython"), "info");
      if (data.type === "error") {
        append(data.message, "error");
        setRunState(null);
      }
      if (data.type === "result") {
        await animate(data.events || [], generation);
        if (generation !== runGeneration.current) return;
        if (data.error) append(data.error, "error");
        else append(t("finished"), "success");
        setRunState(null);
      }
    };
    worker.current.onerror = (e) => {
      append(e.message, "error");
      setRunState(null);
      worker.current?.terminate();
      worker.current = null;
    };
    worker.current.postMessage({ code, state: simState });
  }
  async function runRobot() {
    if (!connection.connected) {
      setModal("connect");
      return;
    }
    if (runState) return;
    const generation = ++runGeneration.current;
    setRunState("robot");
    setSensorValues(null);
    append(t("running"), "info");
    try {
      await robot.current.run(code);
      append(t("finished"), "success");
    } catch (e) {
      if (!["stopped", "connectionLost"].includes(e.message)) error(e);
    } finally {
      if (generation === runGeneration.current) setRunState(null);
    }
  }
  async function startDrive() {
    if (runState || !connection.driveAvailable) return;
    const generation = ++runGeneration.current;
    setRunState("drive");
    try {
      await robot.current.run(driveProgram);
    } catch (e) {
      if (!["stopped", "connectionLost"].includes(e.message)) error(e);
    } finally {
      if (generation === runGeneration.current) setRunState(null);
    }
  }
  function driveAxes(x, y) {
    robot.current.sendDrive(x, y).catch(error);
  }
  async function connect(type) {
    if (connectBusy) return;
    setConnectBusy(true);
    try {
      if (type === "usb") await robot.current.connectUSB();
      else await robot.current.connectBLE();
      setModal(null);
      notify(t("connected"));
    } catch (e) {
      if (e.name !== "NotFoundError") error(e);
    } finally {
      setConnectBusy(false);
    }
  }
  async function readSensors() {
    setSensorBusy(true);
    try {
      setSensorValues(await robot.current.sensors());
    } catch (e) {
      error(e);
    } finally {
      setSensorBusy(false);
    }
  }
  const currentLesson = lessons.find((l) => l.id === activeLesson),
    sensors = sensorValues || simState;
  const nav = [
    ["home", Home],
    ["projects", FolderOpen],
    ["learn", BookOpen],
    ["classroom", GraduationCap],
  ];
  function projectCards(list) {
    return list.length ? (
      <div className="project-grid">
        {list.map((p, i) => (
          <article className="project-card card" key={p.id}>
            <button
              className={`project-cover cover-${i % 4}`}
              onClick={() => openProject(p)}
              aria-label={t("open") + " " + p.name}
            >
              <span className="project-type">
                {p.mode === "python" ? (
                  <Code2 size={16} />
                ) : (
                  <Blocks size={16} />
                )}
              </span>
              <img src={import.meta.env.BASE_URL + "robot.svg"} alt="" />
              <div className="mini-blocks">
                <span />
                <span />
                <span />
              </div>
              <span className="cover-arrow">
                <ArrowRight size={20} />
              </span>
            </button>
            <div className="project-meta">
              <button onClick={() => openProject(p)}>
                <h3>{p.name}</h3>
              </button>
              <p>
                {new Date(p.updated).toLocaleDateString(
                  lang === "hu" ? "hu-HU" : "en-GB",
                  { month: "short", day: "numeric" },
                )}{" "}
                · {t(p.mode)}
              </p>
              <button
                className="icon-btn project-delete"
                title={t("delete")}
                aria-label={t("delete") + " " + p.name}
                onClick={() => setModal({ delete: p.id })}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
        <button
          className="new-project-tile"
          onClick={() => {
            setName(t("untitled"));
            setModal("new");
          }}
        >
          <span>
            <Plus size={26} />
          </span>
          <strong>{t("newProject")}</strong>
        </button>
      </div>
    ) : (
      <div className="empty-projects card">
        <span className="empty-robot">🤖</span>
        <p>{t("emptyProjects")}</p>
        <button
          className="btn primary"
          onClick={() => {
            setName(t("untitled"));
            setModal("new");
          }}
        >
          <Plus size={17} />
          {t("newProject")}
        </button>
      </div>
    );
  }
  function lessonCards(list) {
    return (
      <div className="lesson-grid">
        {list.map((l, i) => (
          <button
            className="lesson-card card"
            key={l.id}
            onClick={() => setModal({ lesson: l.id })}
          >
            <div className="lesson-visual" style={{ background: l.color }}>
              <span className="lesson-number">0{i + 1}</span>
              <span className="lesson-emoji">{l.icon}</span>
              {progress.includes(l.id) && (
                <span className="lesson-complete">
                  <Check size={15} />
                </span>
              )}
              <span className="lesson-visual-dot" />
            </div>
            <div className="lesson-info">
              <div className="lesson-label">
                {t("lesson")} {i + 1}
                <ChevronRight size={16} />
              </div>
              <h3>{l[lang].title}</h3>
              <p>{l[lang].desc}</p>
              <div className="lesson-foot">
                <span>
                  <Clock size={13} />
                  {l.minutes} {t("minutes")}
                </span>
                <span>{t(l.level)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className={`app-shell ${view === "editor" ? "is-editor" : ""}`}>
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => setView("home")}
          aria-label="XRP Studio"
        >
          <span className="brand-mark">
            <img src={import.meta.env.BASE_URL + "robot.svg"} alt="" />
          </span>
          <span>
            XRP
            <span className="brand-studio">
              studio<span className="brand-dot">.</span>
            </span>
          </span>
        </button>
        <div className="sidebar-subtitle">{t("tagline")}</div>
        <nav>
          {nav.map(([id, Icon]) => (
            <button
              key={id}
              aria-label={t(id)}
              title={t(id)}
              className={view === id ? "active" : ""}
              onClick={() => setView(id)}
            >
              <Icon size={20} />
              <span>{t(id)}</span>
              {id === "classroom" && user && <i className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span>✦</span>
            <p>
              {lang === "hu"
                ? "Minden nagy ötlet egy kis próbával kezdődik."
                : "Every big idea begins with a little experiment."}
            </p>
          </div>
          <button className="help-link" onClick={() => setModal("help")}>
            <HelpCircle size={18} />
            {t("support")}
            <ExternalLink size={13} />
          </button>
          <div className="sidebar-footer">{t("madeFor")}</div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>{t(nav.find(([id]) => id === view)?.[0] || "projects")}</span>
            {view === "editor" && (
              <>
                <ChevronRight size={15} />
                <strong>{project?.name}</strong>
              </>
            )}
          </div>
          <div className="topbar-actions">
            {runState && (
              <button className="btn danger small" onClick={stop}>
                <Square size={14} fill="currentColor" />
                {t("stop")}
              </button>
            )}
            <label className="language-switch">
              <Globe size={16} />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                aria-label={t("language")}
              >
                <option value="hu">Magyar</option>
                <option value="en">English</option>
              </select>
            </label>
            <button
              className={`connection-button ${connection.connected ? "is-connected" : ""}`}
              onClick={() => setModal("connect")}
            >
              <span className="status-dot" />
              <span>
                {connection.connected ? t("connected") : t("connect")}
              </span>
              <Link2 size={15} />
            </button>
            {user && (
              <button
                className="avatar"
                title={user.name}
                onClick={() => setView("classroom")}
              >
                {user.name[0]}
              </button>
            )}
          </div>
        </header>
        {view === "home" && (
          <div className="page home-page">
            <section className="hero">
              <div className="hero-copy">
                <span className="hero-kicker">
                  <span /> {t("heroTag")}
                </span>
                <h1>{t("hero")}</h1>
                <p>{t("heroText")}</p>
                <div className="hero-actions">
                  <button
                    className="btn white"
                    onClick={() => {
                      setName(t("untitled"));
                      setModal("new");
                    }}
                  >
                    <Plus size={19} />
                    {t("newProject")}
                  </button>
                  <button
                    className="btn hero-link"
                    onClick={() => setView("learn")}
                  >
                    {t("startLearning")}
                    <ArrowRight size={17} />
                  </button>
                </div>
              </div>
              <RobotArt lang={lang} />
            </section>
            <div className="feature-ribbon">
              <span>
                <Blocks size={19} />
                {lang === "hu"
                  ? "Színes blokkoktól a Pythonig"
                  : "From colourful blocks to Python"}
              </span>
              <span>
                <FlaskConical size={19} />
                {lang === "hu"
                  ? "Robot nélkül is kipróbálhatod"
                  : "Experiment without a robot"}
              </span>
              <span>
                <Users size={19} />
                {lang === "hu"
                  ? "Felfedezés az egész osztállyal"
                  : "Explore with your whole class"}
              </span>
            </div>
            <div className="section-heading">
              <h2>{t("recent")}</h2>
              <button className="text-btn" onClick={() => setView("projects")}>
                {t("allProjects")}
                <ArrowRight size={16} />
              </button>
            </div>
            {projectCards(projects.slice(0, 3))}
            <div className="section-heading lesson-section-title">
              <div>
                <span className="eyebrow">{t("learnByDoing")}</span>
                <h2>
                  {lang === "hu"
                    ? "Merre induljunk ma?"
                    : "Where shall we explore today?"}
                </h2>
              </div>
              <button className="text-btn" onClick={() => setView("learn")}>
                {t("learn")}
                <ArrowRight size={16} />
              </button>
            </div>
            {lessonCards(lessons.slice(0, 3))}
            <footer className="page-footer">
              <span>XRP studio · {t("bothModels")}</span>
              <span>{t("about")}</span>
            </footer>
          </div>
        )}
        {view === "projects" && (
          <div className="page">
            <div className="page-intro row">
              <div>
                <span className="eyebrow">{t("yourIdeas")}</span>
                <h1>{t("projects")}</h1>
                <p>{t("storageNotice")}</p>
              </div>
              <div className="row-actions">
                <button
                  className="btn secondary"
                  onClick={() => importRef.current.click()}
                >
                  <Upload size={17} />
                  {t("import")}
                </button>
                <button
                  className="btn primary"
                  onClick={() => {
                    setName(t("untitled"));
                    setModal("new");
                  }}
                >
                  <Plus size={17} />
                  {t("newProject")}
                </button>
              </div>
            </div>
            {projectCards(projects)}
          </div>
        )}
        {view === "learn" && (
          <div className="page">
            <div className="page-intro">
              <span className="eyebrow">{t("learnByDoing")}</span>
              <h1>{t("lessonTitle")}</h1>
              <p>{t("lessonSubtitle")}</p>
              <div className="learning-progress">
                <div>
                  <span
                    style={{
                      width: `${(progress.length / lessons.length) * 100}%`,
                    }}
                  />
                </div>
                <span>
                  {progress.length} / {lessons.length}{" "}
                  {t("completedBadge").toLowerCase()}
                </span>
              </div>
            </div>
            {lessonCards(lessons)}
          </div>
        )}
        {view === "classroom" && (
          <Classroom
            t={t}
            lang={lang}
            user={user}
            setUser={setUser}
            project={project}
            onOpenProject={importProject}
            onLesson={startLesson}
            notify={notify}
          />
        )}
        {view === "editor" && project && (
          <div className="editor-page">
            <div className="editor-top">
              <button
                className="icon-btn"
                aria-label={t("back")}
                onClick={() => setView("projects")}
              >
                <ArrowLeft size={20} />
              </button>
              <div className="project-title">
                <input
                  aria-label={t("projectName")}
                  value={project.name}
                  maxLength={150}
                  onChange={(e) => updateProject({ name: e.target.value })}
                  onBlur={() => {
                    if (!project.name.trim())
                      updateProject({ name: t("untitled") });
                  }}
                />
                <span className={saved === "error" ? "save-error" : "saved"}>
                  <CheckCircle2 size={12} />
                  {t(
                    saved === false
                      ? "saving"
                      : saved === "error"
                        ? "saveError"
                        : "saved",
                  )}
                </span>
              </div>
              <div className="editor-top-actions">
                {currentLesson && (
                  <button
                    className="btn subtle small"
                    onClick={() => setLessonVisible(!lessonVisible)}
                  >
                    <BookOpen size={16} />
                    {t("lessonPanel")}
                  </button>
                )}
                <div className="project-menu">
                  <button
                    className="icon-btn"
                    aria-label={t("export")}
                    aria-expanded={menu}
                    onClick={() => setMenu(!menu)}
                  >
                    <MoreHorizontal />
                  </button>
                  {menu && (
                    <div className="dropdown card">
                      <button onClick={exportProject}>
                        <Download size={16} />
                        {t("export")}
                      </button>
                      <button onClick={exportPython}>
                        <FileCode size={16} />
                        {t("pythonDownload")}
                      </button>
                      <button
                        onClick={() => {
                          setMenu(false);
                          importRef.current.click();
                        }}
                      >
                        <Upload size={16} />
                        {t("import")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {currentLesson && lessonVisible && (
              <div className="lesson-strip">
                <span>{currentLesson.icon}</span>
                <div>
                  <strong>{currentLesson[lang].title}</strong>
                  <p>{currentLesson[lang].challenge}</p>
                  <details>
                    <summary>{t("hint")}</summary>
                    <p>{currentLesson[lang].hint}</p>
                    <ol>
                      {currentLesson[lang].steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  </details>
                </div>
                <button
                  className="btn secondary small"
                  onClick={() => {
                    const p = [...new Set([...progress, currentLesson.id])];
                    setProgress(p);
                    localStorage.setItem(
                      "xrp-studio-progress",
                      JSON.stringify(p),
                    );
                    notify(t("completed"));
                  }}
                >
                  <Check size={15} />
                  {t("completed")}
                </button>
              </div>
            )}
            <div className="editor-layout">
              <section className="workspace-card card">
                <div className="workspace-toolbar">
                  <div className="mode-tabs">
                    <button
                      className={project.mode === "blocks" ? "active" : ""}
                      onClick={() => updateProject({ mode: "blocks" })}
                    >
                      <Blocks size={17} />
                      {t("blocks")}
                    </button>
                    <button
                      className={project.mode === "python" ? "active" : ""}
                      onClick={() => {
                        updateProject({
                          mode: "python",
                          python: project.python || generated,
                          pythonSource: project.python ? "custom" : "generated",
                        });
                        setPythonSource(
                          project.python ? "custom" : "generated",
                        );
                      }}
                    >
                      <Code2 size={17} />
                      {t("python")}
                    </button>
                  </div>
                  <span className="hardware-label">
                    XRP <span>β / v1</span>
                  </span>
                </div>
                <div className="code-area">
                  {project.mode === "blocks" ? (
                    <BlockEditor
                      project={project}
                      lang={lang}
                      onChange={(workspace, python) => {
                        setGenerated(python);
                        updateProject({ workspace });
                      }}
                    />
                  ) : (
                    <div className="python-container">
                      <div className="python-toolbar">
                        <select
                          aria-label={t("code")}
                          value={pythonSource}
                          onChange={(e) => {
                            setPythonSource(e.target.value);
                            updateProject({ pythonSource: e.target.value });
                          }}
                        >
                          <option value="generated">{t("generated")}</option>
                          <option value="custom">{t("editablePython")}</option>
                        </select>
                        {pythonSource === "generated" && (
                          <button
                            className="text-btn"
                            onClick={() => {
                              updateProject({
                                python: generated,
                                mode: "python",
                                pythonSource: "custom",
                              });
                              setPythonSource("custom");
                            }}
                          >
                            <Copy size={14} />
                            {t("usePython")}
                          </button>
                        )}
                      </div>
                      <PythonEditor
                        readOnly={pythonSource === "generated"}
                        value={
                          pythonSource === "generated"
                            ? generated
                            : project.python
                        }
                        onChange={(value) => {
                          if (pythonSource === "custom")
                            updateProject({ python: value });
                        }}
                      />
                      <p className="python-note">{t("pythonWarning")}</p>
                    </div>
                  )}
                </div>
                <div className="run-toolbar">
                  <span className="keyboard-hint">
                    {lang === "hu"
                      ? "Építs az indulásblokk alá!"
                      : "Build below the start block!"}
                  </span>
                  <button
                    className="btn simulate"
                    disabled={!!runState || connectBusy || sensorBusy}
                    onClick={simulate}
                  >
                    <FlaskConical size={17} />
                    {t("simulate")}
                  </button>
                  {runState ? (
                    <button className="btn danger" onClick={stop}>
                      <Square size={15} fill="currentColor" />
                      {t("stop")}
                    </button>
                  ) : (
                    <button
                      className="btn primary"
                      disabled={connectBusy || sensorBusy}
                      onClick={runRobot}
                    >
                      <Play size={16} fill="currentColor" />
                      {t("run")}
                    </button>
                  )}
                </div>
              </section>
              <aside className="right-panels">
                <div
                  className="side-tabs"
                  role="tablist"
                  aria-label={lang === "hu" ? "Eszközök" : "Tools"}
                >
                  {[
                    ["dashboard", lang === "hu" ? "Műszerfal" : "Dashboard"],
                    ["python", "Python"],
                    ["drive", lang === "hu" ? "Vezetés" : "Drive"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      role="tab"
                      aria-selected={sideTab === id}
                      className={sideTab === id ? "active" : ""}
                      onClick={() => setSideTab(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {sideTab === "python" && (
                  <section className="side-python card">
                    <div className="panel-head">
                      <h3>
                        <Code2 size={16} />
                        {lang === "hu"
                          ? "A blokkjaid Pythonban"
                          : "Your blocks in Python"}
                      </h3>
                    </div>
                    <PythonEditor readOnly value={generated} />
                  </section>
                )}
                {sideTab === "drive" && (
                  <DrivePanel
                    lang={lang}
                    active={runState === "drive"}
                    busy={!!runState || connectBusy || sensorBusy}
                    available={
                      connection.connected && connection.driveAvailable
                    }
                    onStart={startDrive}
                    onStop={stop}
                    onAxes={driveAxes}
                  />
                )}
                <div
                  className="dashboard-panels"
                  hidden={sideTab !== "dashboard"}
                >
                  <Playground
                    state={simState}
                    onReset={() => setSimState(initialState())}
                    onButton={(value) =>
                      setSimState((p) => ({ ...p, button: value }))
                    }
                    t={t}
                    running={!!runState}
                  />
                  <section className="sensors-card card">
                    <div className="panel-head">
                      <h3>
                        <Radio size={16} />
                        {t("sensors")}
                      </h3>
                      <span
                        className={`source-tag ${sensorValues ? "real" : ""}`}
                      >
                        {t(sensorValues ? "realRobot" : "virtualRobot")}
                      </span>
                    </div>
                    <div className="sensor-grid">
                      {[
                        ["distance", sensors.distance, "cm"],
                        ["heading", ((sensors.heading % 360) + 360) % 360, "°"],
                        ["lineLeft", sensors.left, ""],
                        ["lineRight", sensors.right, ""],
                      ].map(([label, value, unit]) => (
                        <div className="sensor-value" key={label}>
                          <span>{t(label)}</span>
                          <strong>
                            {Number.isFinite(value)
                              ? Number(value).toFixed(
                                  label.startsWith("line") ? 2 : 0,
                                )
                              : "—"}
                            <small>{unit}</small>
                          </strong>
                        </div>
                      ))}
                    </div>
                    <div className="sensor-bottom">
                      <span>
                        {sensorValues?.voltage != null && (
                          <b>{sensorValues.voltage.toFixed(1)} V · </b>
                        )}
                        {t("button")}:{" "}
                        {t(sensors.button ? "pressed" : "released")}
                      </span>
                      <button
                        className="text-btn"
                        disabled={
                          !connection.connected ||
                          !!runState ||
                          sensorBusy ||
                          connectBusy
                        }
                        onClick={readSensors}
                      >
                        {sensorBusy ? "…" : t("sensorRead")}
                      </button>
                    </div>
                  </section>
                </div>
              </aside>
            </div>
            <section className="console card">
              <div className="panel-head">
                <h3>
                  <Terminal size={16} />
                  {t("console")}
                  {runState && <span className="running-dot" />}
                </h3>
                <button
                  className="icon-btn"
                  title={t("clear")}
                  aria-label={t("clear")}
                  onClick={() => setLogs([])}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div
                ref={consoleRef}
                className="console-output"
                role="log"
                aria-live="polite"
              >
                {!logs.length ? (
                  <span className="console-placeholder">{t("ready")}</span>
                ) : (
                  logs.map((l) => (
                    <div className={"log-" + l.kind} key={l.id}>
                      {l.text}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </main>
      <input
        hidden
        ref={importRef}
        type="file"
        accept=".json,.xrp.json"
        onChange={readImport}
      />
      {modal === "new" && (
        <Modal title={t("newProject")} onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <label>
              {t("projectName")}
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={150}
                required
              />
            </label>
            <p className="muted">{t("storageNotice")}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setModal(null)}
              >
                {t("cancel")}
              </button>
              <button className="btn primary">
                <Plus size={17} />
                {t("create")}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal?.delete && (
        <Modal title={t("delete")} onClose={() => setModal(null)}>
          <p>{t("deleteConfirm")}</p>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setModal(null)}>
              {t("cancel")}
            </button>
            <button
              className="btn danger"
              onClick={() => {
                setProjects((p) => p.filter((x) => x.id !== modal.delete));
                setModal(null);
              }}
            >
              {t("delete")}
            </button>
          </div>
        </Modal>
      )}
      {modal?.lesson &&
        (() => {
          const l = lessons.find((x) => x.id === modal.lesson);
          return (
            <Modal title={l[lang].title} onClose={() => setModal(null)}>
              <div className="lesson-modal-art" style={{ background: l.color }}>
                {l.icon}
              </div>
              <p>{l[lang].desc}</p>
              <h3>{t("steps")}</h3>
              <ol className="lesson-steps">
                {l[lang].steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <div className="challenge-box">
                <Lightbulb size={19} />
                <div>
                  <strong>{t("challenge")}</strong>
                  <p>{l[lang].challenge}</p>
                </div>
              </div>
              <p className="fine-print">{t("lessonConfirm")}</p>
              <div className="modal-actions">
                <button className="btn primary" onClick={() => startLesson(l)}>
                  {t("tryLesson")}
                  <ArrowRight size={17} />
                </button>
              </div>
            </Modal>
          );
        })()}
      {modal === "connect" && (
        <Modal title={t("connectTitle")} onClose={() => setModal(null)}>
          <p>{t("connectText")}</p>
          {connection.connected ? (
            <div className="connected-panel">
              <CheckCircle2 size={32} />
              <strong>{connection.name}</strong>
              <button
                className="btn secondary"
                disabled={connectBusy || !!runState}
                onClick={async () => {
                  await robot.current.disconnect();
                  setModal(null);
                }}
              >
                <Unplug size={16} />
                {t("disconnect")}
              </button>
            </div>
          ) : (
            <>
              <button
                className="connection-option"
                disabled={!navigator.serial || connectBusy}
                onClick={() => connect("usb")}
              >
                <span className="round-icon purple">
                  <Usb />
                </span>
                <span>
                  <strong>{t("usb")}</strong>
                  <small>{t("usbHelp")}</small>
                </span>
                <ArrowRight size={18} />
              </button>
              <button
                className="connection-option"
                disabled={!navigator.bluetooth || connectBusy}
                onClick={() => connect("ble")}
              >
                <span className="round-icon teal">
                  <Bluetooth />
                </span>
                <span>
                  <strong>{t("bluetooth")}</strong>
                  <small>{t("bleHelp")}</small>
                </span>
                <ArrowRight size={18} />
              </button>
              {!navigator.serial && <p className="fine-print">{t("noUsb")}</p>}
              {!navigator.bluetooth && (
                <p className="fine-print">{t("noBle")}</p>
              )}
              {connectBusy && <p className="connecting-indicator">•••</p>}
            </>
          )}
          <div className="setup-note">
            <strong>{t("setupRobot")}</strong>
            <p>{t("setupHelp")}</p>
            <a href="https://xrpcode.wpi.edu" target="_blank" rel="noreferrer">
              {t("officialEditor")} <ExternalLink size={13} />
            </a>
          </div>
          <p className="fine-print">{t("safety")}</p>
        </Modal>
      )}
      {modal === "help" && (
        <Modal title={t("support")} onClose={() => setModal(null)}>
          <h3>{t("bothModels")}</h3>
          <p>{t("setupHelp")}</p>
          <p>{t("usbHelp")}</p>
          <p>{t("bleHelp")}</p>
          <p>{t("sensorHelp")}</p>
          <p>{t("storageNotice")}</p>
          <p>{t("safety")}</p>
          <a
            className="btn secondary"
            target="_blank"
            rel="noreferrer"
            href="https://xrpusersguide.readthedocs.io/en/latest/"
          >
            XRP User Guide
            <ExternalLink size={15} />
          </a>
        </Modal>
      )}
      {toast && (
        <div
          className={`toast ${toast.kind}`}
          role={toast.kind === "error" ? "alert" : "status"}
        >
          {toast.kind === "error" ? (
            <HelpCircle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} aria-label={t("close")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
