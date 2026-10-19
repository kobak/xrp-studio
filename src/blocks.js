import * as BlocklyModule from "blockly/core";
const Blockly = Reflect.get(BlocklyModule, "default") || BlocklyModule;
import "blockly/blocks";
import { pythonGenerator, Order } from "blockly/python";
import * as Hu from "blockly/msg/hu";
import * as En from "blockly/msg/en";
const words = {
  hu: {
    start: "amikor elindul a program",
    drive: "menj %1 cm-t · sebesség %2 %%",
    turn: "fordulj %1 fokot · sebesség %2 %%",
    wait: "várj %1 másodpercet",
    stop: "állítsd le a motorokat",
    effort: "motorerő · bal %1 %% jobb %2 %%",
    led: "LED %1",
    on: "be",
    off: "ki",
    servo: "szervó szöge %1 °",
    distance: "távolság (cm)",
    heading: "irányszög (°)",
    left: "bal vonalérzékelő",
    right: "jobb vonalérzékelő",
    button: "gomb lenyomva?",
    print: "írd ki a távolságot",
    motion: "Mozgás",
    control: "Vezérlés",
    sensors: "Érzékelők",
    lights: "Fény és szervó",
    logic: "Logika",
    math: "Számok",
    text: "Szöveg",
    variables: "Változók",
    functions: "Saját blokkok",
  },
  en: {
    start: "when program starts",
    drive: "drive %1 cm · speed %2 %%",
    turn: "turn %1 degrees · speed %2 %%",
    wait: "wait %1 seconds",
    stop: "stop motors",
    effort: "motor effort · left %1 %% right %2 %%",
    led: "LED %1",
    on: "on",
    off: "off",
    servo: "servo angle %1 °",
    distance: "distance (cm)",
    heading: "heading (°)",
    left: "left line sensor",
    right: "right line sensor",
    button: "button pressed?",
    print: "print distance",
    motion: "Movement",
    control: "Control",
    sensors: "Sensors",
    lights: "Light & servo",
    logic: "Logic",
    math: "Numbers",
    text: "Text",
    variables: "Variables",
    functions: "My blocks",
  },
};
const number = (name) => ({ type: "input_value", name, check: "Number" });
const defaults = {
  xrp_drive: { DIST: 30, SPEED: 50 },
  xrp_turn: { ANGLE: 90, SPEED: 50 },
  xrp_wait: { SECONDS: 1 },
  xrp_effort: { LEFT: 25, RIGHT: 25 },
  xrp_servo: { ANGLE: 90 },
};
export function migrateWorkspace(state) {
  const copy = structuredClone(state);
  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (defaults[value.type]) {
      value.inputs ||= {};
      for (const [name, fallback] of Object.entries(defaults[value.type])) {
        if (!value.inputs[name])
          value.inputs[name] = {
            shadow: {
              type: "math_number",
              fields: { NUM: value.fields?.[name] ?? fallback },
            },
          };
        if (value.fields) delete value.fields[name];
      }
    }
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === "object") visit(child);
    }
  }
  visit(copy);
  return copy;
}
export function setupBlocks(lang) {
  const locale = lang === "hu" ? Hu : En;
  Blockly.setLocale(locale.default || locale);
  const w = words[lang];
  const statement = (type, message, args, colour) => ({
    type,
    message0: message,
    args0: args,
    previousStatement: null,
    nextStatement: null,
    colour,
    inputsInline: true,
  });
  const defs = [
    {
      type: "xrp_start",
      message0: w.start,
      nextStatement: null,
      colour: "#e7ac26",
      hat: "cap",
    },
    statement(
      "xrp_drive",
      w.drive,
      [number("DIST", 30), number("SPEED", 50, 5, 100)],
      "#5577e4",
    ),
    statement(
      "xrp_turn",
      w.turn,
      [number("ANGLE", 90, -360, 360), number("SPEED", 50, 5, 100)],
      "#5577e4",
    ),
    statement("xrp_wait", w.wait, [number("SECONDS", 1, 0, 60)], "#e3a42a"),
    statement("xrp_stop", w.stop, [], "#5577e4"),
    statement(
      "xrp_effort",
      w.effort,
      [number("LEFT", 25, -100, 100), number("RIGHT", 25, -100, 100)],
      "#5577e4",
    ),
    statement(
      "xrp_led",
      w.led,
      [
        {
          type: "field_dropdown",
          name: "STATE",
          options: [
            [w.on, "1"],
            [w.off, "0"],
          ],
        },
      ],
      "#a369d7",
    ),
    statement("xrp_servo", w.servo, [number("ANGLE", 90, 0, 180)], "#a369d7"),
    statement("xrp_print_distance", w.print, [], "#4da390"),
  ];
  for (const [type, message, output] of [
    ["distance", w.distance, "Number"],
    ["heading", w.heading, "Number"],
    ["left", w.left, "Number"],
    ["right", w.right, "Number"],
    ["button", w.button, "Boolean"],
  ])
    defs.push({
      type: `xrp_${type}`,
      message0: message,
      output,
      colour: "#4da390",
    });
  for (const def of defs)
    Blockly.Blocks[def.type] = {
      init() {
        this.jsonInit(def);
        this.setTooltip(def.message0.replace(/%\d/g, "…"));
      },
    };
  const f = (block, name) =>
    pythonGenerator.valueToCode(block, name, Order.NONE) || "0";
  const speed = (block, name) => `max(-1, min(1, (${f(block, name)}) / 100))`;
  pythonGenerator.forBlock.xrp_start = () => "";
  pythonGenerator.forBlock.xrp_drive = (b) =>
    `drivetrain.straight(${f(b, "DIST")}, max(0.05, abs(${speed(b, "SPEED")})), timeout=15)\n`;
  pythonGenerator.forBlock.xrp_turn = (b) =>
    `drivetrain.turn(${f(b, "ANGLE")}, max(0.05, abs(${speed(b, "SPEED")})), timeout=10)\n`;
  pythonGenerator.forBlock.xrp_wait = (b) =>
    `time.sleep(max(0, ${f(b, "SECONDS")}))\n`;
  pythonGenerator.forBlock.xrp_stop = () => `drivetrain.stop()\n`;
  pythonGenerator.forBlock.xrp_effort = (b) =>
    `drivetrain.set_effort(${speed(b, "LEFT")}, ${speed(b, "RIGHT")})\n`;
  pythonGenerator.forBlock.xrp_led = (b) =>
    `board.led_${b.getFieldValue("STATE") === "1" ? "on" : "off"}()\n`;
  pythonGenerator.forBlock.xrp_servo = (b) =>
    `servo_one.set_angle(max(0, min(180, ${f(b, "ANGLE")})))\n`;
  pythonGenerator.forBlock.xrp_print_distance = () =>
    `print(rangefinder.distance())\n`;
  for (const [type, expr] of Object.entries({
    distance: "rangefinder.distance()",
    heading: "imu.get_yaw()",
    left: "reflectance.get_left()",
    right: "reflectance.get_right()",
    button: "board.is_button_pressed()",
  }))
    pythonGenerator.forBlock[`xrp_${type}`] = () => [expr, Order.FUNCTION_CALL];
}
export function toolbox(lang) {
  const w = words[lang],
    block = (type) => ({
      kind: "block",
      type,
      ...(defaults[type]
        ? {
            inputs: Object.fromEntries(
              Object.entries(defaults[type]).map(([name, value]) => [
                name,
                { shadow: { type: "math_number", fields: { NUM: value } } },
              ]),
            ),
          }
        : {}),
    }),
    cat = (name, colour, types) => ({
      kind: "category",
      name,
      colour,
      contents: types.map(block),
    });
  return {
    kind: "categoryToolbox",
    contents: [
      cat(w.motion, "#5577e4", [
        "xrp_drive",
        "xrp_turn",
        "xrp_stop",
        "xrp_effort",
      ]),
      {
        kind: "category",
        name: w.control,
        colour: "#e3a42a",
        contents: [
          block("xrp_start"),
          {
            kind: "block",
            type: "controls_repeat_ext",
            inputs: {
              TIMES: { shadow: { type: "math_number", fields: { NUM: 4 } } },
            },
          },
          block("controls_whileUntil"),
          block("controls_if"),
          block("xrp_wait"),
        ],
      },
      cat(w.sensors, "#4da390", [
        "xrp_distance",
        "xrp_heading",
        "xrp_left",
        "xrp_right",
        "xrp_button",
        "xrp_print_distance",
      ]),
      cat(w.lights, "#a369d7", ["xrp_led", "xrp_servo"]),
      cat(w.logic, "#56a7c6", [
        "logic_compare",
        "logic_operation",
        "logic_boolean",
        "logic_negate",
      ]),
      cat(w.math, "#6f9e51", [
        "math_number",
        "math_arithmetic",
        "math_random_int",
      ]),
      cat(w.text, "#b56e9b", ["text", "text_print", "text_join"]),
      {
        kind: "category",
        name: w.variables,
        colour: "#db8e41",
        custom: "VARIABLE",
      },
      {
        kind: "category",
        name: w.functions,
        colour: "#9a76ba",
        custom: "PROCEDURE",
      },
    ],
  };
}
export const pythonHeader =
  "from XRPLib.defaults import drivetrain, rangefinder, reflectance, imu, board, servo_one\nimport time\n\n";
export function generatePython(workspace) {
  pythonGenerator.init(workspace);
  const sections = [];
  for (const block of workspace.getTopBlocks(true)) {
    if (block.type !== "xrp_start" && !block.type.startsWith("procedures_def"))
      continue;
    const code = pythonGenerator.blockToCode(block);
    if (typeof code === "string") sections.push(code);
  }
  return (
    pythonHeader +
    pythonGenerator
      .finish(sections.join("\n"))
      .trim()
      .replace(/\n{3,}/g, "\n\n") +
    "\n"
  );
}
export function pythonFromState(state, lang) {
  setupBlocks(lang);
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(migrateWorkspace(state), workspace);
    return generatePython(workspace);
  } finally {
    workspace.dispose();
  }
}
export function lessonWorkspace(lesson) {
  let next = null;
  for (const [type, fields] of [...lesson.blocks].reverse())
    next = { block: { type, fields, ...(next ? { next } : {}) } };
  if (lesson.repeat)
    next = {
      block: {
        type: "controls_repeat_ext",
        inputs: {
          TIMES: {
            shadow: { type: "math_number", fields: { NUM: lesson.repeat } },
          },
          DO: next,
        },
      },
    };
  return migrateWorkspace({
    blocks: {
      languageVersion: 0,
      blocks: [{ type: "xrp_start", x: 55, y: 50, next }],
    },
  });
}
export const studioTheme = () =>
  Blockly.Theme.defineTheme("studio", {
    base: Blockly.Themes.Classic,
    componentStyles: {
      workspaceBackgroundColour: "#f9faff",
      toolboxBackgroundColour: "#ffffff",
      toolboxForegroundColour: "#37425c",
      flyoutBackgroundColour: "#f0f3fa",
      flyoutForegroundColour: "#37425c",
      flyoutOpacity: 1,
      scrollbarColour: "#c7cee1",
      insertionMarkerColour: "#777bed",
    },
    fontStyle: { family: "system-ui, sans-serif", weight: "600", size: 12 },
    startHats: true,
  });
export { Blockly };
