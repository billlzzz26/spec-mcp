/**
 * chart.tsx
 * ---------
 * shadcn/ui Chart component — wrapper สำหรับ Recharts
 *
 * ChartContainer: inject CSS variables จาก config เป็น --color-{key}
 * เพื่อให้ component ลูกเรียกใช้ผ่าน var(--color-key) ใน Recharts ได้
 *
 * สำคัญ: Recharts ไม่อ่าน CSS var โดยตรงใน stroke/fill ของ SVG
 * ให้ใช้ hex โดยตรงในกรณีนั้น — ChartContainer เหมาะสำหรับ Legend/Tooltip เท่านั้น
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChartConfig = {
  [key: string]: {
    label?: string;
    color?: string;
  };
};

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig;
}

// ─── ChartContainer ───────────────────────────────────────────────────────────

/**
 * ChartContainer
 * Inject CSS custom properties จาก config ลงใน style
 * เพื่อให้ใช้งาน var(--color-{key}) ใน CSS ได้
 * (ใช้กับ Tooltip/Legend ได้ แต่ไม่ใช้กับ SVG stroke โดยตรง)
 */
export function ChartContainer({
  config,
  className,
  children,
  style,
  ...props
}: ChartContainerProps) {
  // สร้าง CSS variables object จาก config
  const cssVars = Object.entries(config).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (value.color) {
        acc[`--color-${key}`] = value.color;
      }
      return acc;
    },
    {},
  );

  return (
    <div
      className={cn("w-full", className)}
      style={{ ...cssVars, ...style } as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── ChartTooltip ─────────────────────────────────────────────────────────────

/**
 * Re-export Tooltip จาก recharts เพื่อใช้ใน ChartTooltipContent
 * ต้อง import Tooltip จาก recharts ใน component ที่ใช้งานเอง
 */
export { Tooltip as ChartTooltip } from "recharts";

// ─── ChartTooltipContent ──────────────────────────────────────────────────────

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
  config?: ChartConfig;
}

/**
 * ChartTooltipContent
 * Default tooltip content ที่ใช้ config เพื่อแสดงชื่อ series
 */
export function ChartTooltipContent({
  active,
  payload,
  label,
  config,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
      {label && (
        <p className="text-muted-foreground text-xs mb-2 font-medium">{label}</p>
      )}
      {payload.map((item) => {
        const configEntry = config?.[item.dataKey];
        return (
          <div key={item.dataKey} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground text-xs">
              {configEntry?.label ?? item.name}:
            </span>
            <span className="text-foreground font-semibold text-xs">
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
