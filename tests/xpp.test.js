import test from "node:test";
import assert from "node:assert/strict";
import { XppStream, floatFrame, driveProgram } from "../src/xpp.js";
test("XPP reassembles fragmented noisy packets and rejects damaged frames", () => {
  const received = [];
  const parser = new XppStream((v) => received.push(v));
  const a = floatFrame([
      [20, 90],
      [34, 32.5],
    ]),
    b = floatFrame([[37, 4.75]]);
  assert.ok(a.length <= 20);
  parser.receive([0, 255, 170]);
  parser.receive(a.slice(0, 8));
  parser.receive(a.slice(8));
  assert.deepEqual(received, [{ 20: 90, 34: 32.5 }]);
  const damaged = Uint8Array.from(b);
  damaged[damaged.length - 1] = 0;
  parser.receive([...damaged, ...b]);
  assert.deepEqual(received.at(-1), { 37: 4.75 });
});
test("drive program stops on heartbeat loss and in cleanup using real Python", async () => {
  const { loadPyodide } = await import("pyodide");
  const py = await loadPyodide();
  const harness = `import sys, types
calls = []
clock = [0]
class Motors:
    def stop(self): calls.append(('stop', clock[0]))
    def set_effort(self, left, right): calls.append(('move', clock[0], left, right))
class Pad:
    X1=0; Y1=1; X2=2
    @classmethod
    def get_default_gamepad(cls): return cls()
    def get_value(self, axis): return 0.5 if axis==1 else 0
    def stop(self): calls.append(('pad_stop',clock[0]))
def sleep(_):
    clock[0] += 20
    if clock[0] >= 1000: raise KeyboardInterrupt()
defaults=types.ModuleType('XRPLib.defaults'); defaults.drivetrain=Motors()
gamepad=types.ModuleType('XRPLib.gamepad'); gamepad.Gamepad=Pad
time=types.ModuleType('time');time.ticks_ms=lambda:clock[0];time.ticks_diff=lambda a,b:a-b;time.sleep=sleep
sys.modules.update({'XRPLib':types.ModuleType('XRPLib'),'XRPLib.defaults':defaults,'XRPLib.gamepad':gamepad,'time':time})
`;
  py.runPython(harness);
  py.globals.set("program", driveProgram);
  py.runPython("try:\n    exec(program)\nexcept KeyboardInterrupt:\n    pass");
  const calls = JSON.parse(py.runPython('__import__("json").dumps(calls)'));
  assert.ok(calls.some((c) => c[0] === "move" && c[2] > 0));
  assert.ok(calls.some((c) => c[0] === "stop" && c[1] > 700 && c[1] < 800));
  assert.equal(calls.filter((c) => c[0] === "move" && c[1] > 700).length, 0);
  assert.deepEqual(
    calls.slice(-2).map((c) => c[0]),
    ["stop", "pad_stop"],
  );
});
