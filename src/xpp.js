// XRP Puppet Protocol. Wire format documented by Open-STEM/XRP_MicroPython.
export function floatFrame(entries) {
  const frame = new Uint8Array(7 + entries.length * 6);
  frame.set([0xaa, 0x55, 2, 1 + entries.length * 6, entries.length]);
  const view = new DataView(frame.buffer);
  entries.forEach(([id, value], i) => {
    const offset = 5 + i * 6;
    frame[offset] = id;
    frame[offset + 1] = 2;
    view.setFloat32(offset + 2, value, true);
  });
  frame.set([0x55, 0xaa], frame.length - 2);
  return frame;
}
export class XppStream {
  constructor(onValues) {
    this.bytes = [];
    this.onValues = onValues;
  }
  receive(chunk) {
    this.bytes.push(...chunk);
    while (this.bytes.length >= 6) {
      if (this.bytes[0] !== 0xaa || this.bytes[1] !== 0x55) {
        this.bytes.shift();
        continue;
      }
      const length = this.bytes[3];
      if (length > 251) {
        this.bytes.shift();
        continue;
      }
      if (this.bytes.length < length + 6) return;
      if (this.bytes[length + 4] !== 0x55 || this.bytes[length + 5] !== 0xaa) {
        this.bytes.shift();
        continue;
      }
      const message = Uint8Array.from(this.bytes.splice(0, length + 6));
      if (message[2] !== 2 || length < 1) continue;
      const values = {},
        view = new DataView(message.buffer);
      let offset = 5,
        valid = true;
      for (let i = 0; i < message[4]; i++) {
        if (offset + 2 > length + 4) {
          valid = false;
          break;
        }
        const id = message[offset++],
          type = message[offset++],
          size = type === 3 ? 1 : 4;
        if (![1, 2, 3].includes(type) || offset + size > length + 4) {
          valid = false;
          break;
        }
        const value =
          type === 3
            ? !!message[offset]
            : type === 1
              ? view.getInt32(offset, true)
              : view.getFloat32(offset, true);
        offset += size;
        if (typeof value !== "number" || Number.isFinite(value))
          values[id] = value;
      }
      if (valid && offset === length + 4) this.onValues(values);
    }
  }
}
// A changing heartbeat is required even when the stick stays in one position.
// Loss of the browser or BLE writes stops both motors on the robot in 700 ms.
export const driveProgram = `from XRPLib.defaults import drivetrain
from XRPLib.gamepad import Gamepad
import time
pad = Gamepad.get_default_gamepad()
last_beat = None
last_seen = time.ticks_ms()
def axis(value):
    if abs(value) < 0.08:
        return 0
    return value * 0.45
try:
    while True:
        beat = pad.get_value(Gamepad.X2)
        if beat != last_beat:
            last_beat = beat
            last_seen = time.ticks_ms()
        if time.ticks_diff(time.ticks_ms(), last_seen) > 700:
            drivetrain.stop()
        else:
            forward = axis(pad.get_value(Gamepad.Y1))
            turn = axis(-pad.get_value(Gamepad.X1))
            drivetrain.set_effort(max(-0.6, min(0.6, forward + turn)), max(-0.6, min(0.6, forward - turn)))
        time.sleep(0.02)
finally:
    drivetrain.stop()
    pad.stop()
`;
