import test from "node:test";
import assert from "node:assert/strict";
import {
  Blockly,
  setupBlocks,
  migrateWorkspace,
  pythonFromState,
} from "../src/blocks.js";
test("legacy numeric fields migrate without changing values or source state", () => {
  const legacy = {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: "xrp_start",
          next: {
            block: { type: "xrp_drive", fields: { DIST: 42, SPEED: 60 } },
          },
        },
      ],
    },
  };
  const migrated = migrateWorkspace(legacy);
  assert.equal(legacy.blocks.blocks[0].next.block.fields.DIST, 42);
  assert.equal(
    migrated.blocks.blocks[0].next.block.inputs.DIST.shadow.fields.NUM,
    42,
  );
  assert.match(pythonFromState(legacy, "en"), /straight\(42,/);
  assert.deepEqual(migrateWorkspace(migrated), migrated);
});
test("robot inputs accept arithmetic and sensor values in generated Python", () => {
  setupBlocks("en");
  const state = {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: "xrp_start",
          next: {
            block: {
              type: "xrp_drive",
              inputs: {
                DIST: {
                  block: {
                    type: "math_arithmetic",
                    fields: { OP: "ADD" },
                    inputs: {
                      A: { block: { type: "xrp_distance" } },
                      B: {
                        shadow: { type: "math_number", fields: { NUM: 5 } },
                      },
                    },
                  },
                },
                SPEED: { shadow: { type: "math_number", fields: { NUM: 40 } } },
              },
            },
          },
        },
      ],
    },
  };
  const code = pythonFromState(state, "en");
  assert.match(code, /straight\(rangefinder.distance\(\) \+ 5,/);
  assert.match(code, /40/);
});
test("unattached movement stacks are not executed, attached stacks are", () => {
  const state = {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: "xrp_start",
          next: { block: { type: "xrp_wait", fields: { SECONDS: 2 } } },
        },
        { type: "xrp_drive", fields: { DIST: 99, SPEED: 50 } },
      ],
    },
  };
  const code = pythonFromState(state, "en");
  assert.match(code, /time.sleep\(max\(0, 2\)\)/);
  assert.doesNotMatch(code, /straight/);
});
