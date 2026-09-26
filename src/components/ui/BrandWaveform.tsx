import React, { useId } from "react";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

export type BrandWaveformProps = {
  width?: number;
  height?: number;
  variant?: "hero" | "pronunciation";
  opacity?: number;
  glow?: boolean;
};

/**
 * Speech Acoustic Rhythmic Envelope:
 * rise -> dip -> rise -> major peak -> subtle dip -> secondary peak -> natural decay
 * Symmetrically centered vertically to model natural voice oscillations.
 */
const BARS = [
  10, 16, 22, 34, 26,
  42, 54, 38, 48, 66,
  82, 58, 44, 62, 76,
  52, 40, 56, 36, 28,
  20, 14,
];

export function BrandWaveform({
  width = 210,
  height = 70,
  variant = "hero",
  opacity = 1,
  glow = false,
}: BrandWaveformProps) {
  const rawId = useId();
  const gradientId = `brandWave_${variant}_${glow ? "glow" : "main"}_${rawId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  const barWidth = glow ? 4.5 : 3.5;
  const gap = glow ? 4.5 : 5;

  const totalWidth = BARS.length * barWidth + (BARS.length - 1) * gap;
  const scale = width / totalWidth;

  const stops = variant === "hero" ? [
    { offset: "0%", color: "#8DD6BA", opacity: glow ? 0.2 : 0.35 },
    { offset: "35%", color: "#8DD6BA", opacity: glow ? 0.55 : 0.95 },
    { offset: "68%", color: "#FFFFFF", opacity: glow ? 0.6 : 0.95 },
    { offset: "100%", color: "#FFFFFF", opacity: glow ? 0.2 : 0.35 },
  ] : [
    { offset: "0%", color: "#2dd4bf", opacity: glow ? 0.35 : 0.8 },
    { offset: "50%", color: "#34d399", opacity: glow ? 0.6 : 0.98 },
    { offset: "100%", color: "#2dd4bf", opacity: glow ? 0.35 : 0.85 },
  ];

  return (
    <Svg width={width} height={height} opacity={opacity}>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          {stops.map((s, idx) => (
            <Stop
              key={idx}
              offset={s.offset}
              stopColor={s.color}
              stopOpacity={s.opacity}
            />
          ))}
        </LinearGradient>
      </Defs>

      {BARS.map((barHeight, index) => {
        const h = Math.max(3, (barHeight / 82) * height);
        const x = index * (barWidth + gap) * scale;
        const w = barWidth * scale;
        const y = (height - h) / 2;

        return (
          <Rect
            key={index}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={w / 2}
            fill={`url(#${gradientId})`}
          />
        );
      })}
    </Svg>
  );
}
