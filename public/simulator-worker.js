let runtime;
self.onmessage = async ({ data }) => {
  try {
    const base = self.__XRP_BASE__;
    if (!runtime) {
      self.postMessage({ type: "loading" });
      importScripts(base + "pyodide/pyodide.js");
      runtime = await self.loadPyodide({ indexURL: base + "pyodide/" });
    }
    const bootstrap = await (
      await fetch(base + "simulator.py", { credentials: "omit" })
    ).text();
    runtime.globals.set("_initial_json", JSON.stringify(data.state));
    runtime.globals.set("_program", data.code);
    const result = await runtime.runPythonAsync(bootstrap);
    self.postMessage({ type: "result", ...JSON.parse(result) });
  } catch (e) {
    self.postMessage({ type: "error", message: String(e.message || e) });
  }
};
self.postMessage({ type: "ready" });
