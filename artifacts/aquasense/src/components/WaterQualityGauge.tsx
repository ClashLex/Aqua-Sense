import { useState, useEffect, useRef } from "react";

interface WaterQualityGaugeProps {
  score: number;
  sensorName: string;
  offline?: boolean;
}

// Arc from 135° to 405° (270° sweep, clockwise in SVG coords)
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
      const eased = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p; // ease-in-out quad
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
  if (s >= 75) return "#39ff14";
  if (s >= 45) return "#ffaa00";
  if (s >= 20) return "#ff6b35";
  return "#ff2d55";
}

function scoreLabel(s: number): string {
  if (s >= 75) return "EXCELLENT";
  if (s >= 45) return "GOOD";
  if (s >= 20) return "POOR";
  return "CRITICAL";
}

export function WaterQualityGauge({ score, sensorName, offline = false }: WaterQualityGaugeProps) {
  const displayed = useSmoothedScore(offline ? 0 : score);
  const color = offline ? "#475569" : scoreColor(displayed);
  const label = offline ? "OFFLINE" : scoreLabel(displayed);

  // Only draw filled arc when score > 0 (avoid zero-length path issues)
  const fillEndDeg = START_DEG + Math.max(displayed, 0.5) / 100 * TOTAL_SWEEP;
  const fillPath = displayed > 0 ? arcPath(START_DEG, fillEndDeg) : null;

  return (
    <div
      className="rounded-xl border flex flex-col items-center p-3 shrink-0"
      style={{
        background: "linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%)",
        borderColor: offline ? "rgba(71,85,105,0.25)" : `${color}25`,
        boxShadow: offline ? "none" : `0 0 20px ${color}10`,
        width: 168,
      }}
      data-testid="water-quality-gauge"
    >
      <span className="text-[#64748b] text-[9px] font-mono tracking-widest uppercase mb-1">
        Water Quality
      </span>

      <svg viewBox="0 0 180 148" width="148" height="122">
        <defs>
          <filter id="glow-gauge">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <path
          d={BG_PATH}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={SW}
          strokeLinecap="round"
        />

        {/* Colored fill arc */}
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke={color}
            strokeWidth={SW}
            strokeLinecap="round"
            filter="url(#glow-gauge)"
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
          fontFamily="Orbitron, sans-serif"
          fontWeight="700"
          style={{ transition: "fill 0.6s ease" }}
        >
          {displayed}
        </text>

        {/* /100 */}
        <text
          x={CX}
          y={CY + 26}
          textAnchor="middle"
          fill="#475569"
          fontSize="9"
          fontFamily="JetBrains Mono, monospace"
        >
          / 100
        </text>

        {/* Label */}
        <text
          x={CX}
          y={CY + 42}
          textAnchor="middle"
          fill={color}
          fontSize="8.5"
          fontFamily="JetBrains Mono, monospace"
          letterSpacing="2"
          fontWeight="700"
          style={{ transition: "fill 0.6s ease" }}
        >
          {label}
        </text>

        {/* End cap tick marks at 0% and 100% */}
        {[0, 100].map((pct) => {
          const deg = START_DEG + (pct / 100) * TOTAL_SWEEP;
          const ix = CX + (R - SW / 2 - 2) * Math.cos(toRad(deg));
          const iy = CY + (R - SW / 2 - 2) * Math.sin(toRad(deg));
          return (
            <circle
              key={pct}
              cx={ix.toFixed(3)}
              cy={iy.toFixed(3)}
              r="1.5"
              fill="rgba(255,255,255,0.2)"
            />
          );
        })}
      </svg>

      {/* Sensor name */}
      <span className="text-[#475569] text-[9px] font-mono tracking-wider text-center leading-tight mt-0.5 px-1 truncate w-full text-center">
        {sensorName}
      </span>
    </div>
  );
}
