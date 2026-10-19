import test from "node:test";
import assert from "node:assert/strict";
import { RobotConnection } from "../src/robot.js";
const enc = new TextEncoder();
test("raw REPL handles split response packets and stderr", async () => {
  const robot = new RobotConnection();
  robot.type = "usb";
  robot.connected = true;
  let code = "";
  robot.writer = {
    write: async (bytes) => {
      const s = new TextDecoder().decode(bytes);
      if (s.includes("\x01")) {
        queueMicrotask(() => {
          robot.receive(enc.encode("raw REPL; CTRL-"));
          robot.receive(enc.encode("B to exit\r\n>"));
        });
      } else if (s === "\x04") {
        queueMicrotask(() => {
          robot.receive(enc.encode("O"));
          robot.receive(enc.encode("Khello\r\n\x04\x04>"));
        });
      } else if (!s.includes("\x02")) code += s;
    },
  };
  assert.equal(await robot.execute('print("hello")'), "hello\r\n");
  assert.equal(robot.busy, false);
  assert.match(code, /hello/);
  robot.writer.write = async (bytes) => {
    const s = new TextDecoder().decode(bytes);
    if (s.includes("\x01"))
      queueMicrotask(() =>
        robot.receive(enc.encode("raw REPL; CTRL-B to exit\r\n>")),
      );
    if (s === "\x04")
      queueMicrotask(() =>
        robot.receive(enc.encode("OK\x04Traceback: test error\x04>")),
      );
  };
  await assert.rejects(() => robot.execute("bad code"), /test error/);
  assert.equal(robot.busy, false);
});
test("disconnect rejects pending protocol waits", async () => {
  const robot = new RobotConnection();
  robot.connected = true;
  const p = robot.waitFor("never", 0);
  await robot.disconnect();
  await assert.rejects(() => p, /connectionLost/);
});
test("BLE sends UTF-8 in sequential 20-byte chunks", async () => {
  const robot = new RobotConnection();
  robot.connected = true;
  robot.type = "ble";
  const chunks = [];
  robot.bleWriter = {
    properties: { write: true },
    writeValueWithResponse: async (bytes) => chunks.push(bytes),
  };
  await robot.write("árvíztűrő tükörfúrógép".repeat(3));
  assert.ok(chunks.length > 3);
  assert.ok(chunks.every((c) => c.length <= 20));
  assert.equal(
    new TextDecoder().decode(Uint8Array.from(chunks.flatMap((c) => [...c]))),
    "árvíztűrő tükörfúrógép".repeat(3),
  );
});
test("BLE serializes REPL and data operations across concurrent callers", async () => {
  const robot = new RobotConnection();
  robot.type = "ble";
  robot.connected = true;
  let inFlight = 0,
    peak = 0;
  const order = [];
  const write = async (bytes) => {
    inFlight++;
    peak = Math.max(peak, inFlight);
    order.push([...bytes]);
    await new Promise((r) => setTimeout(r, 2));
    inFlight--;
  };
  robot.bleWriter = {
    properties: { write: true },
    writeValueWithResponse: write,
  };
  robot.dataWriter = { writeValueWithResponse: write };
  await Promise.all([
    robot.write("a".repeat(45)),
    robot.sendDrive(0.5, 0.75),
    robot.write("b".repeat(25)),
  ]);
  assert.equal(peak, 1);
  assert.ok(order.every((bytes) => bytes.length <= 20));
  const frame = order.find((bytes) => bytes[0] === 0xaa);
  assert.equal(frame.length, 19);
});
