import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
export default function DrivePanel({
  lang,
  active,
  available,
  busy,
  onStart,
  onStop,
  onAxes,
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const positionRef = useRef(position),
    surface = useRef(),
    sendRef = useRef(onAxes);
  positionRef.current = position;
  sendRef.current = onAxes;
  const reset = () => {
    positionRef.current = { x: 0, y: 0 };
    setPosition(positionRef.current);
    if (active) sendRef.current(0, 0);
  };
  useEffect(() => {
    if (!active) {
      setPosition({ x: 0, y: 0 });
      return;
    }
    const timer = setInterval(
      () => sendRef.current(positionRef.current.x, positionRef.current.y),
      150,
    );
    const release = () => {
      positionRef.current = { x: 0, y: 0 };
      setPosition(positionRef.current);
      sendRef.current(0, 0);
    };
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", release);
    return () => {
      clearInterval(timer);
      release();
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", release);
    };
  }, [active]);
  function move(event) {
    if (!active || !event.currentTarget.hasPointerCapture(event.pointerId))
      return;
    const rect = surface.current.getBoundingClientRect();
    let x = (event.clientX - rect.left - rect.width / 2) / (rect.width * 0.35);
    let y =
      -(event.clientY - rect.top - rect.height / 2) / (rect.height * 0.35);
    const length = Math.max(1, Math.hypot(x, y));
    setPosition({ x: x / length, y: y / length });
  }
  return (
    <section className="drive-panel">
      <h3>{lang === "hu" ? "Te vagy a pilóta!" : "You are the pilot!"}</h3>
      <p>
        {lang === "hu"
          ? "Húzd a kart a kívánt irányba. Elengedéskor megáll."
          : "Drag the stick to steer. Release to stop."}
      </p>
      <div
        ref={surface}
        className={`joystick ${active ? "enabled" : ""}`}
        role="group"
        aria-label={
          lang === "hu" ? "Érintéses robotvezérlés" : "Touch robot controls"
        }
        onPointerDown={(e) => {
          if (active) {
            e.currentTarget.setPointerCapture(e.pointerId);
            move(e);
          }
        }}
        onPointerMove={move}
        onPointerUp={reset}
        onPointerCancel={reset}
        onLostPointerCapture={reset}
      >
        <span className="joy-axis horizontal" />
        <span className="joy-axis vertical" />
        <span
          className="joy-knob"
          style={{
            transform: `translate(${position.x * 65}px,${-position.y * 65}px)`,
          }}
        />
        <span className="joy-forward">↑</span>
      </div>
      <div className="drive-buttons">
        <button
          className={`btn ${active ? "danger" : "primary"}`}
          disabled={!active && (!available || busy)}
          onClick={active ? onStop : onStart}
        >
          {active ? <Square size={16} /> : <Play size={16} />}
          {lang === "hu"
            ? active
              ? "Vezetés leállítása"
              : "Vezetés indítása"
            : active
              ? "Stop driving"
              : "Start driving"}
        </button>
      </div>
      <p className="drive-note">
        {lang === "hu"
          ? "Bluetooth és új XRP firmware szükséges. Megszakadó kapcsolatnál a robot 0,7 másodperc után leáll. A tengelyenkénti erőhatár 45%, az együttes motorerő legfeljebb 60%."
          : "Requires Bluetooth and recent XRP firmware. The robot stops after 0.7 seconds without updates. Axis effort is limited to 45%, with 60% maximum combined motor effort."}
      </p>
    </section>
  );
}
