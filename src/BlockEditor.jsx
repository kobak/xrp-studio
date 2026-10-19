import { useEffect, useRef } from "react";
import {
  Blockly,
  setupBlocks,
  toolbox,
  studioTheme,
  generatePython,
  migrateWorkspace,
} from "./blocks";
export default function BlockEditor({ project, lang, onChange, onReady }) {
  const el = useRef(),
    onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    setupBlocks(lang);
    const workspace = Blockly.inject(el.current, {
      toolbox: toolbox(lang),
      theme: studioTheme(),
      renderer: "zelos",
      grid: { spacing: 24, length: 2, colour: "#d7dded", snap: true },
      trashcan: true,
      zoom: {
        controls: true,
        wheel: true,
        startScale: window.innerWidth <= 1100 ? 0.82 : 1,
        maxScale: 1.5,
        minScale: 0.5,
      },
      move: { scrollbars: true, drag: true, wheel: true },
      sounds: false,
    });
    try {
      Blockly.serialization.workspaces.load(
        migrateWorkspace(project.workspace),
        workspace,
      );
    } catch (e) {
      console.error(e);
      workspace.newBlock("xrp_start").initSvg();
      workspace.render();
    }
    const centerFrame = requestAnimationFrame(() => {
      Blockly.svgResize(workspace);
      if (window.innerWidth <= 1100)
        workspace.centerOnBlock(workspace.getTopBlocks(true)[0]?.id || null);
    });
    onReady?.(workspace);
    const update = (e) => {
      if (!e.isUiEvent && e.type !== Blockly.Events.FINISHED_LOADING) {
        try {
          onChangeRef.current(
            Blockly.serialization.workspaces.save(workspace),
            generatePython(workspace),
          );
        } catch (e) {
          console.error(e);
        }
      }
    };
    workspace.addChangeListener(update);
    const observer = new ResizeObserver(() => Blockly.svgResize(workspace));
    observer.observe(el.current);
    onChangeRef.current(
      Blockly.serialization.workspaces.save(workspace),
      generatePython(workspace),
    );
    return () => {
      cancelAnimationFrame(centerFrame);
      observer.disconnect();
      workspace.dispose();
    };
  }, [project.id, lang]);
  return <div ref={el} className="block-editor" data-testid="block-editor" />;
}
