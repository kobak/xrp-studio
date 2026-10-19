import { RotateCcw } from "lucide-react";
export const initialState = () => ({
  x: -50,
  y: -45,
  heading: 0,
  led: false,
  servo: 90,
  distance: 141,
  left: 0.9,
  right: 0.9,
  button: false,
});
export default function Playground({ state, onReset, onButton, t, running }) {
  const px = 200 + state.x * 1.35,
    py = 150 - state.y * 1.35;
  return (
    <section className="playground card">
      <div className="panel-head">
        <h3>{t("simulator")}</h3>
        <button
          className="icon-btn"
          onClick={onReset}
          disabled={running}
          title={t("reset")}
          aria-label={t("reset")}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <div className="arena-wrap">
        <svg viewBox="0 0 400 300" role="img" aria-label={t("simulator")}>
          <defs>
            <pattern
              id="grid"
              width="27"
              height="27"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 27 0 L 0 0 0 27"
                fill="none"
                stroke="#e1e8ee"
                strokeWidth="1"
              />
            </pattern>
            <filter id="shadow">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity=".15" />
            </filter>
          </defs>
          <rect x="8" y="8" width="384" height="284" rx="18" fill="#f4f8fa" />
          <rect
            x="60"
            y="10"
            width="280"
            height="280"
            rx="18"
            fill="url(#grid)"
            stroke="#dce4ed"
            strokeWidth="3"
          />
          <path
            d="M132.5 235 V82.5 H267"
            fill="none"
            stroke="#3b4357"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="260.75"
            cy="109.5"
            r="19"
            fill="#ffd67e"
            stroke="#e9b847"
            strokeWidth="2"
          />
          <circle cx="260.75" cy="109.5" r="10" fill="#ffe7ad" />
          <text x="80" y="275" fontSize="10" fontWeight="700" fill="#9ba6b7">
            {t("simulator").toUpperCase()}
          </text>
          <g
            transform={`translate(${px},${py}) rotate(${-state.heading})`}
            filter="url(#shadow)"
          >
            <ellipse cy="4" rx="19" ry="22" fill="#282e46" opacity=".08" />
            <rect x="-19" y="-16" width="9" height="31" rx="4" fill="#38425c" />
            <rect x="10" y="-16" width="9" height="31" rx="4" fill="#38425c" />
            <rect
              x="-13"
              y="-22"
              width="26"
              height="42"
              rx="10"
              fill="#7e84eb"
              stroke="#6068c5"
            />
            <rect
              x="-10"
              y="-18"
              width="20"
              height="17"
              rx="6"
              fill="#eafaff"
            />
            <circle cx="-4" cy="-11" r="2" fill="#33405a" />
            <circle cx="4" cy="-11" r="2" fill="#33405a" />
            <circle cy="10" r="4" fill={state.led ? "#fff1a6" : "#ffd375"} />
            <path
              d={`M0 4 L${Math.sin(((state.servo - 90) * Math.PI) / 180) * 12} ${4 - Math.cos(((state.servo - 90) * Math.PI) / 180) * 12}`}
              stroke="#e4d9ff"
              strokeWidth="2"
            />
          </g>
        </svg>
        <span className="sim-badge">
          <i />
          {t("simulation")}
        </span>
      </div>
      <div className="arena-caption">
        <span>{t("simulationNote")}</span>
        <button
          className={`user-button ${state.button ? "pressed" : ""}`}
          onClick={() => onButton(!state.button)}
          aria-pressed={state.button}
        >
          {t("button")} {state.button ? "●" : "○"}
        </button>
      </div>
    </section>
  );
}
