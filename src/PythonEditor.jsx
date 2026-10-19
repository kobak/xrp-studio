import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { python } from "@codemirror/lang-python";
export default function PythonEditor({ value, onChange, readOnly = false }) {
  const root = useRef(),
    editor = useRef(),
    changeRef = useRef(onChange);
  changeRef.current = onChange;
  useEffect(() => {
    editor.current = new EditorView({
      doc: value,
      extensions: [
        basicSetup,
        python(),
        EditorView.editable.of(!readOnly),
        EditorView.theme({
          "&": { height: "100%", fontSize: "14px" },
          ".cm-scroller": {
            overflow: "auto",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
          },
          ".cm-content": { padding: "18px 0" },
          ".cm-gutters": {
            background: "#f2f4fa",
            color: "#8c95aa",
            border: "none",
          },
        }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) changeRef.current?.(u.state.doc.toString());
        }),
      ],
      parent: root.current,
    });
    return () => editor.current?.destroy();
  }, [readOnly]);
  useEffect(() => {
    const e = editor.current;
    if (e && e.state.doc.toString() !== value)
      e.dispatch({
        changes: { from: 0, to: e.state.doc.length, insert: value },
      });
  }, [value]);
  return <div ref={root} className="python-editor" />;
}
