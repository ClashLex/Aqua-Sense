import { useState, useEffect, useRef } from "react";

interface WaterQualityGaugeProps {
  score: number;
  sensorName: string;
  offline?: boolean;
}

const CX = 90, CY = 86, R = 66, SW = 10;
const START_DEG = 135;
const TOTAL_SWEEP = 270;

function toRad(d: number) { return (d * Math.PI) / 180; }

function arcPath(startDeg: number, endDeg: number): string {
  const sx = CX + R * Math.cos(toRad(startDeg));
  const sy = CY + R * Math.sin(toRad(startDeg));
  const ex = CX + R * Math.cos(toRad(endDeg));
  const ey = CY + R * Math.sin(toRad(endDeg));
  const sweep = endDeg - startDeg;
  const large = sweep > 180 ? 1 : 0;
  return `M ${sx.toFixed(3)} ${sy.toFixed(3)} A ${R} ${R} 0 ${large} 1 ${ex.toFixed(3)} ${ey.toFixed(3)}`;
}

const BG_PATH = arcPath(START_DEG, START_DEG + TOTAL_SWEEP);

function useSmoothedScore(target: number, duration = 700) {
  const [display, setDisplay] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    const start = from.current;
    const diff = target - start;
    if (diff === 0) return;
    const t0 = performance.now();
    let raf: number;
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      setDisplay(Math.round(start + diff * eased));
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

function scoreColor(s: number): string {
  if (s >= 75) return "#16a34a";
  if (s >= 45) return "#d97706";
  if (s >= 20) return "#ea580c";
  return "#dc2626";
}

function scoreLabel(s: number): string {
  if (s >= 75) return "Excellent";
  if (s >= 45) return "Good";
  if (s >= 20) return "Poor";
  return "Critical";
}

export function WaterQualityGauge({ score, sensorName, offline = false }: WaterQualityGaugeProps) {
  const displayed = useSmoothedScore(offline ? 0 : score);
  const color = offline ? "#cbd5e1" : scoreColor(displayed);
  const label = offline ? "Offline" : scoreLabel(displayed);

  const fillEndDeg = START_DEG + Math.max(displayed, 0.5) / 100 * TOTAL_SWEEP;
  const fillPath = displayed > 0 ? arcPath(START_DEG, fillEndDeg) : null;

  return (
    <div
      className="rounded-xl border bg-white flex flex-col items-center p-3 shrink-0"
      style={{
        borderColor: "#e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        width: 168,
      }}
      data-testid="water-quality-gauge"
    >
      <span className="text-[#94a3b8] text-[10px] font-medium tracking-wide uppercase mb-1">
        Water Quality
      </span>

      <svg viewBox="0 0 180 148" width="148" height="122">
        {/* Track */}
        <path
          d={BG_PATH}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={SW}
          strokeLinecap="round"
        />

        {/* Fill arc */}
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke={color}
            strokeWidth={SW}
            strokeLinecap="round"
            style={{ transition: "stroke 0.6s ease" }}
          />
        )}

        {/* Score number */}
        <text
          x={CX}
          y={CY + 10}
          textAnchor="middle"
          fill={color}
          fontSize="32"
          fontFamily="DM Mono, monospace"
          fontWeight="500"
          style={{ transition: "fill 0.6s ease" }}
        >
          {displayed}
        </text>

        {/* /100 */}
        <text
          x={CX}
          y={CY + 26}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="9"
          fontFamily="DM Mono, monospace"
        >
          / 100
        </text>

        {/* Label */}
        <text
          x={CX}
          y={CY + 42}
          textAnchor="middle"
          fill={color}
          fontSize="9"
          fontFamily="Plus Jakarta Sans, sans-serif"
          fontWeight="700"
          letterSpacing="0.5"
          style={{ transition: "fill 0.6s ease" }}
        >
          {label}
        </text>

        {[0, 100].map((pct) => {
          const deg = START_DEG + (pct / 100) * TOTAL_SWEEP;
          const ix = CX + (R - SW / 2 - 2) * Math.cos(toRad(deg));
          const iy = CY + (R - SW / 2 - 2) * Math.sin(toRad(deg));
          return <circle key={pct} cx={ix.toFixed(3)} cy={iy.toFixed(3)} r="1.5" fill="#cbd5e1" />;
        })}
      </svg>

      <span className="text-[#94a3b8] text-[9px] font-medium tracking-wide text-center leading-tight mt-0.5 px-1 truncate w-full text-center">
        {sensorName}
      </span>
    </div>
  );
}
