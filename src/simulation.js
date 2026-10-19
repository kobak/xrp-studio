// Run student-authored Python in an opaque-origin sandbox, never in the
// authenticated classroom origin. The iframe owns a terminable Web Worker.
export function createSimulationRunner() {
  const iframe = document.createElement("iframe");
  iframe.hidden = true;
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.setAttribute("aria-hidden", "true");
  iframe.src = import.meta.env.BASE_URL + "sandbox.html";
  let ready = false,
    queue = [],
    closed = false;
  const runner = {
    onmessage: null,
    onerror: null,
    postMessage(data) {
      if (ready) iframe.contentWindow.postMessage(data, "*");
      else queue.push(data);
    },
    terminate() {
      closed = true;
      clearTimeout(timer);
      window.removeEventListener("message", receive);
      iframe.remove();
      queue = [];
    },
  };
  function receive(event) {
    if (
      closed ||
      event.source !== iframe.contentWindow ||
      event.origin !== "null" ||
      event.data?.channel !== "xrp-sandbox"
    )
      return;
    const data = event.data.payload;
    if (data.type === "ready") {
      ready = true;
      clearTimeout(timer);
      for (const item of queue) iframe.contentWindow.postMessage(item, "*");
      queue = [];
    } else if (data.type === "worker-error")
      runner.onerror?.({ message: data.message });
    else runner.onmessage?.({ data });
  }
  const timer = setTimeout(
    () => runner.onerror?.({ message: "Python sandbox could not start." }),
    45000,
  );
  window.addEventListener("message", receive);
  document.body.appendChild(iframe);
  return runner;
}
