/**
 * MetricChart.tsx
 * ---------------
 * Component แผนภูมิแบบ Interactive สำหรับ Metric Widget
 *
 * ใช้ Recharts ซึ่งเป็น wrapper ของ D3.js สำหรับ React
 * ออกแบบตามหลัก Controlled Component: ข้อมูลทั้งหมดส่งผ่าน props
 *
 * สิ่งสำคัญ: Recharts ไม่รองรับ CSS variables (var(--color-...)) ใน stroke/fill
 * จึงต้องใช้ hex color โดยตรงเท่านั้น — ดูได้จาก METRIC_CONFIGS ใน service layer
 *
 * แนวทางการพัฒนาต่อ:
 *   - เพิ่ม zoom/pan ด้วย ReferenceArea
 *   - รองรับ multi-metric overlay
 *   - export PNG/CSV จากกราฟ
 */

"use client";

import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import type { DataPoint } from "@/lib/metric-widget";
import { formatValue } from "@/lib/metric-widget";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricChartProps {
  /** ข้อมูล time series */
  data: DataPoint[];
  /** สีหลักของเส้นกราฟ (hex) */
  color: string;
  /** สีเส้นเปรียบเทียบ (hex) */
  compareColor: string;
  /** หน่วยของ metric */
  unit: string;
  /** แสดงเส้นเปรียบเทียบหรือไม่ */
  showComparison?: boolean;
  /** ความสูงของ chart (px) */
  height?: number;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

/**
 * CustomTooltip - แสดง popup เมื่อ hover บนกราฟ
 *
 * Recharts ส่ง payload เป็น array ของ data series ที่ active
 * ต้องตรวจสอบ active และ payload?.length ก่อนใช้
 */
function CustomTooltip({
  active,
  payload,
  label,
  unit,
  color,
  compareColor,
  showComparison,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
  unit: string;
  color: string;
  compareColor: string;
  showComparison: boolean;
}) {
  // ไม่แสดง tooltip ถ้าไม่ได้ hover หรือไม่มีข้อมูล
  if (!active || !payload?.length) return null;

  const current = payload.find((p) => p.dataKey === "value");
  const previous = payload.find((p) => p.dataKey === "previousValue");

  return (
    // tooltip card — ใช้ bg-card และ border-border ตาม design token
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm min-w-[140px]">
      <p className="text-muted-foreground text-xs mb-2 font-medium">{label}</p>
      {current && (
        <div className="flex items-center gap-2 mb-1">
          {/* dot สีตรงกับ series */}
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-foreground font-semibold">
            {formatValue(current.value, unit)} {unit}
          </span>
        </div>
      )}
      {showComparison && previous && (
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: compareColor }}
          />
          <span className="text-muted-foreground">
            {formatValue(previous.value, unit)} {unit}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MetricChart({
  data,
  color,
  compareColor,
  unit,
  showComparison = true,
  height = 200,
}: MetricChartProps) {
  /**
   * ChartContainer ของ shadcn/ui ต้องการ config object
   * ที่ map key → { label, color } สำหรับ legend และ tooltip อัตโนมัติ
   * แต่เราใช้ CustomTooltip เองจึงส่ง config เพื่อให้ CSS variable ถูก inject เท่านั้น
   */
  const chartConfig = {
    value: {
      label: "ปัจจุบัน",
      // ต้องใช้ hex โดยตรง — CSS variable จะไม่ทำงานใน Recharts stroke
      color,
    },
    previousValue: {
      label: "ช่วงก่อนหน้า",
      color: compareColor,
    },
  };

  // คำนวณ domain แกน Y เพื่อให้ chart ไม่ clip ค่าสูงสุด/ต่ำสุด
  const allValues = data.flatMap((d) =>
    [d.value, showComparison ? d.previousValue : undefined].filter(
      (v): v is number => v !== undefined,
    ),
  );
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const padding = (maxVal - minVal) * 0.1 || maxVal * 0.1;
  const yDomain: [number, number] = [
    Math.max(0, Math.floor(minVal - padding)),
    Math.ceil(maxVal + padding),
  ];

  // แสดง tick แกน X แบบ sparse (ทุก N จุด) เพื่อไม่ให้แน่นเกิน
  const tickInterval = Math.max(1, Math.floor(data.length / 6));

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={50}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
        >
          {/* กำหนด gradient fill ให้กราฟดูมีมิติ */}
          <defs>
            <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorPrevious" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={compareColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={compareColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* grid เส้นประเบา ๆ เพื่อช่วยอ่านค่า */}
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(255,255,255,0.06)"
          />

          <XAxis
            dataKey="timestamp"
            tick={{ fontSize: 11, fill: "hsl(215 20.2% 45%)" }}
            tickLine={false}
            axisLine={false}
            interval={tickInterval - 1}
          />

          <YAxis
            domain={yDomain}
            tick={{ fontSize: 11, fill: "hsl(215 20.2% 45%)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => {
              // format ค่าบนแกน Y ให้กระชับ
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
              if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
              return String(Math.round(v));
            }}
          />

          {/* เส้นอ้างอิง "Now" ที่ข้อมูลสุดท้าย */}
          <ReferenceLine
            x={data[data.length - 1]?.timestamp}
            stroke={color}
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />

          {/* Custom tooltip แบบ controlled — ดีกว่า default ของ Recharts */}
          <Tooltip
            content={
              <CustomTooltip
                unit={unit}
                color={color}
                compareColor={compareColor}
                showComparison={showComparison}
              />
            }
            cursor={{ stroke: color, strokeWidth: 1, strokeOpacity: 0.3 }}
          />

          {/* เส้นเปรียบเทียบช่วงก่อนหน้า (render ก่อนเพื่อให้อยู่ด้านหลัง) */}
          {showComparison && (
            <Area
              type="monotone"
              dataKey="previousValue"
              stroke={compareColor}
              strokeWidth={1.5}
              fill="url(#colorPrevious)"
              strokeDasharray="4 2"
              dot={false}
              activeDot={{ r: 4, fill: compareColor }}
            />
          )}

          {/* เส้นหลัก (render ทีหลังเพื่ออยู่ด้านหน้า) */}
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#colorCurrent)"
            dot={false}
            activeDot={{ r: 5, fill: color, stroke: "hsl(222.2 84% 4.9%)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
