import test from "node:test";
import assert from "node:assert/strict";
import { loadPyodide } from "pyodide";
import { readFileSync } from "node:fs";
import { lessons } from "../src/lessons.js";
import { pythonFromState, lessonWorkspace } from "../src/blocks.js";
test("all lesson block programs compile and execute in real Python", async () => {
  const py = await loadPyodide();
  const bootstrap = readFileSync(
    new URL("../public/simulator.py", import.meta.url),
    "utf8",
  );
  function run(code) {
    py.globals.set(
      "_initial_json",
      JSON.stringify({
        x: -50,
        y: -45,
        heading: 0,
        button: false,
        led: false,
        servo: 90,
      }),
    );
    py.globals.set("_program", code);
    return JSON.parse(py.runPython(bootstrap));
  }
  for (const lang of ["hu", "en"])
    for (const l of lessons) {
      const code = pythonFromState(lessonWorkspace(l), lang);
      assert.match(code, /from XRPLib.defaults/);
      const result = run(code);
      assert.equal(result.error, null, `${lang}/${l.id}: ${result.error}`);
      assert.ok(result.events.length > 0);
    }
  const square = run(pythonFromState(lessonWorkspace(lessons[1]), "en"));
  assert.ok(Math.abs(square.events.at(-1).state.x + 50) < 0.01);
  assert.ok(Math.abs(square.events.at(-1).state.y + 45) < 0.01);
  assert.equal(square.events.at(-1).state.heading, 360);
  const custom = run(
    'from XRPLib.defaults import drivetrain, rangefinder\nfor i in range(2):\n    drivetrain.straight(10)\nprint("szia", rangefinder.distance())',
  );
  assert.equal(custom.error, null);
  assert.ok(
    custom.events.some((e) => e.type === "print" && e.text.startsWith("szia")),
  );
  const error = run("print(1/0)");
  assert.match(error.error, /ZeroDivisionError/);
  const endless = run("while True:\n    pass");
  assert.match(endless.error, /Simulation execution limit/);
});
