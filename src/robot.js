import { XppStream, floatFrame } from "./xpp.js";
// MicroPython raw REPL over USB serial or the XRP Nordic UART BLE service.
// Protocol references and upstream licensing are recorded in docs/RESEARCH.md.
export const UART = {
  service: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  tx: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
  rx: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
  dataWrite: "92ae6088-f24d-4360-b1b1-a432a8ed36ff",
  dataRead: "92ae6088-f24d-4360-b1b1-a432a8ed36fe",
};
export class RobotConnection {
  constructor({
    onOutput = () => {},
    onState = () => {},
    onSensors = () => {},
  } = {}) {
    this.onOutput = onOutput;
    this.ioQueue = Promise.resolve();
    this.driveBeat = 0;
    this.xpp = new XppStream((values) => {
      const map = {
        20: "heading",
        34: "distance",
        35: "left",
        36: "right",
        37: "voltage",
      };
      const sensors = Object.fromEntries(
        Object.entries(values)
          .filter(([id]) => map[id])
          .map(([id, v]) => [map[id], v]),
      );
      if (Object.keys(sensors).length) onSensors(sensors);
    });
    this.onState = onState;
    this.buffer = "";
    this.pending = new Set();
    this.connected = false;
    this.busy = false;
    this.decoder = new TextDecoder();
    this.encoder = new TextEncoder();
    this.generation = 0;
  }
  receive(bytes) {
    const s = this.decoder.decode(bytes, { stream: true });
    this.buffer = (this.buffer + s).slice(-300000);
    this.onOutput(s);
    for (const check of [...this.pending]) check();
  }
  waitFor(marker, timeout = 8000) {
    return new Promise((resolve, reject) => {
      let timer;
      const check = () => {
        const index = this.buffer.indexOf(marker);
        if (index !== -1) {
          const value = this.buffer.slice(0, index);
          this.buffer = this.buffer.slice(index + marker.length);
          clearTimeout(timer);
          this.pending.delete(check);
          resolve(value);
        }
      };
      check.reject = (e) => {
        clearTimeout(timer);
        this.pending.delete(check);
        reject(e);
      };
      this.pending.add(check);
      if (timeout)
        timer = setTimeout(
          () => check.reject(Error(`XRP timeout: ${JSON.stringify(marker)}`)),
          timeout,
        );
      check();
    });
  }
  resetPending(message) {
    for (const check of [...this.pending]) check.reject(Error(message));
  }
  state(connected) {
    this.connected = connected;
    this.onState({
      connected,
      type: this.type,
      name: this.name,
      driveAvailable: !!this.dataWriter,
    });
  }
  async connectUSB() {
    if (!navigator.serial) throw Error("noUsb");
    if (this.connected) await this.disconnect();
    this.type = "usb";
    this.port = await navigator.serial.requestPort({
      filters: [{ usbVendorId: 0x2e8a }],
    });
    await this.port.open({ baudRate: 115200 });
    this.name = "XRP · USB";
    this.writer = this.port.writable.getWriter();
    this.reader = this.port.readable.getReader();
    this.state(true);
    this.readLoop();
    try {
      await this.probe();
    } catch (e) {
      await this.disconnect();
      throw e;
    }
  }
  async readLoop() {
    try {
      while (this.connected) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) this.receive(value);
      }
    } catch (e) {
      if (this.connected) this.onOutput(`\n${e.message}\n`);
    } finally {
      if (this.connected) {
        this.resetPending("connectionLost");
        this.state(false);
      }
    }
  }
  async connectBLE() {
    if (!navigator.bluetooth) throw Error("noBle");
    if (this.connected) await this.disconnect();
    this.type = "ble";
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [UART.service] }, { namePrefix: "XRP" }],
      optionalServices: [UART.service],
    });
    try {
      const gatt = await this.device.gatt.connect(),
        service = await gatt.getPrimaryService(UART.service);
      this.bleWriter = await service.getCharacteristic(UART.tx);
      this.bleReader = await service.getCharacteristic(UART.rx);
      this.bleNotify = (e) => {
        const v = e.target.value;
        this.receive(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
      };
      this.bleReader.addEventListener(
        "characteristicvaluechanged",
        this.bleNotify,
      );
      await this.bleReader.startNotifications();
      this.bleDisconnected = () => {
        this.resetPending("connectionLost");
        this.state(false);
      };
      this.device.addEventListener(
        "gattserverdisconnected",
        this.bleDisconnected,
      );
      try {
        this.dataWriter = await service.getCharacteristic(UART.dataWrite);
        this.dataReader = await service.getCharacteristic(UART.dataRead);
        this.dataNotify = (e) => {
          const v = e.target.value;
          this.xpp.receive(
            new Uint8Array(v.buffer, v.byteOffset, v.byteLength),
          );
        };
        this.dataReader.addEventListener(
          "characteristicvaluechanged",
          this.dataNotify,
        );
        await this.dataReader.startNotifications();
      } catch {
        this.dataWriter = null;
      }
      this.name = this.device.name || "XRP · Bluetooth";
      this.state(true);
      await this.probe();
    } catch (e) {
      await this.disconnect();
      throw e;
    }
  }
  enqueue(operation) {
    const next = this.ioQueue.then(operation);
    this.ioQueue = next.catch(() => {});
    return next;
  }
  async write(text) {
    const bytes = typeof text === "string" ? this.encoder.encode(text) : text;
    const generation = this.generation;
    return this.enqueue(async () => {
      if (!this.connected || generation !== this.generation)
        throw Error("connectionLost");
      const size = this.type === "ble" ? 20 : 128;
      for (let offset = 0; offset < bytes.length; offset += size) {
        if (!this.connected || generation !== this.generation)
          throw Error("connectionLost");
        const chunk = bytes.slice(offset, offset + size);
        if (this.type === "ble") {
          if (this.bleWriter.properties.write)
            await this.bleWriter.writeValueWithResponse(chunk);
          else await this.bleWriter.writeValueWithoutResponse(chunk);
        } else await this.writer.write(chunk);
      }
    });
  }
  async sendDrive(x, y) {
    if (!this.connected || !this.dataWriter || this.driveSending) return;
    this.driveSending = true;
    const generation = this.generation;
    try {
      await this.enqueue(async () => {
        if (!this.connected || generation !== this.generation) return;
        const clamp = (v) => Math.max(-1, Math.min(1, Number(v) || 0));
        await this.dataWriter.writeValueWithResponse(
          floatFrame([
            [1, -clamp(x)],
            [2, -clamp(y)],
          ]),
        );
        await this.dataWriter.writeValueWithResponse(
          floatFrame([[3, (++this.driveBeat % 100) / 100]]),
        );
      });
    } finally {
      this.driveSending = false;
    }
  }
  async raw() {
    this.buffer = "";
    await this.write("\r\x03\x03\r\x01");
    await this.waitFor("raw REPL; CTRL-B to exit");
    await this.waitFor(">");
  }
  async execute(code, { running = false } = {}) {
    if (this.busy) throw Error("busy");
    this.busy = true;
    const generation = this.generation;
    try {
      await this.raw();
      this.buffer = "";
      await this.write(code);
      await this.write("\x04");
      await this.waitFor("OK");
      const output = await this.waitFor("\x04", running ? 0 : 10000);
      const stderr = await this.waitFor("\x04", 10000);
      await this.waitFor(">");
      await this.write("\x02");
      if (stderr.trim()) throw Error(stderr);
      return output;
    } finally {
      if (generation === this.generation) this.busy = false;
    }
  }
  async probe() {
    const result = await this.execute(
      "import sys\nprint('__XRP_STUDIO__', sys.implementation.name)\nfrom XRPLib.board import Board\nprint('__BOARD__', Board.get_type())\n",
    );
    if (!result.includes("__XRP_STUDIO__"))
      throw Error("XRP MicroPython / XRPLib required");
    return result;
  }
  async run(code) {
    // ASCII literal preserves Hungarian strings without assuming BLE character encoding.
    const literal =
      'b"' +
      [...this.encoder.encode(code)]
        .map((byte) =>
          byte >= 32 && byte <= 126 && byte !== 34 && byte !== 92
            ? String.fromCharCode(byte)
            : "\\x" + byte.toString(16).padStart(2, "0"),
        )
        .join("") +
      '".decode("utf-8")';
    const telemetry =
      this.type === "ble" && this.dataWriter
        ? "try:\n    from XRPLib.dashboard import Dashboard\n    Dashboard.get_default_dashboard().start(5)\nexcept Exception:\n    pass\n"
        : "";
    return this.execute(
      telemetry +
        `with open('xrp_studio.py', 'w') as _file:\n    _file.write(${literal})\ntry:\n    exec(compile(${literal}, 'xrp_studio.py', 'exec'), {'__name__': '__main__'})\nfinally:\n    from XRPLib.resetbot import reset_hard\n    reset_hard()\n`,
      { running: true },
    );
  }
  async sensors() {
    const out = await this.execute(
      "from XRPLib.defaults import rangefinder, reflectance, imu, board\nimport json\nprint('__SENSORS__'+json.dumps({'distance':rangefinder.distance(),'heading':imu.get_yaw(),'left':reflectance.get_left(),'right':reflectance.get_right(),'button':board.is_button_pressed()}))\n",
    );
    const line = out.split("\n").find((l) => l.startsWith("__SENSORS__"));
    if (!line) throw Error("Sensor response missing");
    return JSON.parse(line.slice(11));
  }
  async stop() {
    this.generation++;
    this.resetPending("stopped");
    this.busy = false;
    if (!this.connected) return;
    if (this.type === "ble") {
      await this.write("##XRPSTOP##");
      this.onOutput("\nBluetooth: XRP restarting; reconnect when ready.\n");
      await this.disconnect();
    } else {
      await this.write("\r\x03\x03\r\x02");
      await this.execute(
        "from XRPLib.resetbot import reset_hard\nreset_hard()\n",
      );
    }
  }
  async disconnect() {
    this.generation++;
    this.resetPending("connectionLost");
    this.busy = false;
    this.state(false);
    if (this.dataReader) {
      this.dataReader.removeEventListener(
        "characteristicvaluechanged",
        this.dataNotify,
      );
      this.dataReader = null;
    }
    this.dataWriter = null;
    this.xpp.bytes = [];
    if (this.device) {
      this.device.removeEventListener(
        "gattserverdisconnected",
        this.bleDisconnected,
      );
      this.bleReader?.removeEventListener(
        "characteristicvaluechanged",
        this.bleNotify,
      );
      this.device.gatt?.disconnect();
      this.device = null;
    }
    if (this.reader) {
      try {
        await this.reader.cancel();
        this.reader.releaseLock();
      } catch {}
      this.reader = null;
    }
    if (this.writer) {
      try {
        this.writer.releaseLock();
      } catch {}
      this.writer = null;
    }
    if (this.port) {
      try {
        await this.port.close();
      } catch {}
      this.port = null;
    }
  }
}
