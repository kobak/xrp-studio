const KEY = "xrp-studio-projects-v1";
export const loadProjects = () => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list.filter(validProject) : [];
  } catch {
    return [];
  }
};
export const validProject = (p) =>
  !!p &&
  p.version === 1 &&
  typeof p.id === "string" &&
  typeof p.name === "string" &&
  p.name.length > 0 &&
  p.name.length <= 150 &&
  typeof p.python === "string" &&
  p.python.length <= 150000 &&
  p.workspace &&
  typeof p.workspace === "object" &&
  ["blocks", "python"].includes(p.mode);
export function saveProjects(projects) {
  localStorage.setItem(
    KEY,
    JSON.stringify(
      projects.map((p) => ({ ...p, name: p.name.trim() || "XRP project" })),
    ),
  );
}
export function newProject(
  name,
  workspace = {
    blocks: {
      languageVersion: 0,
      blocks: [{ type: "xrp_start", x: 60, y: 50 }],
    },
  },
) {
  return {
    version: 1,
    id: crypto.randomUUID(),
    name,
    mode: "blocks",
    workspace,
    python: "",
    updated: new Date().toISOString(),
  };
}
export function download(name, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
