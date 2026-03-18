/**
 * MetricCard.tsx
 * --------------
 * Widget หลักที่แสดงข้อมูล metric แบบครบถ้วนใน card เดียว
 *
 * ประกอบด้วย 3 ส่วนหลัก:
 *   1. Header — ชื่อ metric, ค่าปัจจุบัน, trend badge
 *   2. Chart  — แผนภูมิ Area Chart แบบ interactive (expandable)
 *   3. Comparison — ตารางเปรียบเทียบ 2 ช่วงเวลา
 *
 * State Management:
 *   - isExpanded: toggle แสดง/ซ่อน detail view
 *   - showComparison: toggle เส้นเปรียบเทียบบนกราฟ
 *   ทั้งสองเป็น local state เพราะไม่จำเป็นต้อง share ออกนอก component
 *
 * แนวทางการพัฒนาต่อ:
 *   - เพิ่ม drag-to-reorder ด้วย react-dnd
 *   - รองรับ custom threshold สำหรับ alert
 *   - เพิ่ม annotation บนกราฟ (deployments, incidents)
 */

"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricChart } from "./MetricChart";
import type { MetricWidgetData, MetricType, TimeRange } from "@/lib/metric-widget";
import { METRIC_CONFIGS, formatValue } from "@/lib/metric-widget";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricCardProps {
  /** ข้อมูล metric ที่ได้จาก service layer */
  data: MetricWidgetData;
  /** ประเภท metric (สำหรับดึง config สี) */
  metricType: MetricType;
  /** callback เมื่อผู้ใช้เปลี่ยน time range */
  onTimeRangeChange?: (range: TimeRange) => void;
  /** callback เมื่อกด refresh */
  onRefresh?: () => void;
  /** กำลัง loading อยู่หรือไม่ */
  isLoading?: boolean;
}

// ─── Trend Badge ──────────────────────────────────────────────────────────────

/**
 * TrendBadge - แสดงทิศทางและ % การเปลี่ยนแปลง
 *
 * ใช้ positiveDirection จาก config เพื่อตัดสินว่า "up" = ดี หรือ "down" = ดี
 * เช่น latency: "down" = ดี (ต่ำ = เร็ว), success_rate: "up" = ดี
 */
function TrendBadge({
  trend,
  changePercent,
  positiveDirection,
}: {
  trend: MetricWidgetData["trend"];
  changePercent: number;
  positiveDirection: "up" | "down";
}) {
  // ตัดสิน "ดี/ไม่ดี" จาก trend + positiveDirection
  const isPositive =
    (trend === "up" && positiveDirection === "up") ||
    (trend === "down" && positiveDirection === "down");
  const isNeutral = trend === "neutral";

  // กำหนดสีและ icon ตามผล
  const colorClass = isNeutral
    ? "bg-secondary text-secondary-foreground border-border"
    : isPositive
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    : "bg-red-500/10 text-red-400 border-red-500/20";

  const Icon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <Badge className={`gap-1 text-xs font-medium border ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {isNeutral ? "คงที่" : `${changePercent > 0 ? "+" : ""}${changePercent}%`}
    </Badge>
  );
}

// ─── Comparison Row ───────────────────────────────────────────────────────────

/**
 * ComparisonRow - แสดงการเปรียบเทียบ 1 คู่ (ปัจจุบัน vs ก่อนหน้า)
 * ออกแบบให้เป็น grid 3 คอลัมน์: ค่าปัจจุบัน | % เปลี่ยน | ค่าก่อนหน้า
 */
function ComparisonRow({
  currentLabel,
  currentValue,
  previousLabel,
  previousValue,
  changePercent,
  unit,
}: {
  currentLabel: string;
  currentValue: number;
  previousLabel: string;
  previousValue: number;
  changePercent: number;
  unit: string;
}) {
  const isUp = changePercent > 0;
  const isNeutral = Math.abs(changePercent) < 0.5;

  return (
    <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-border last:border-0">
      {/* ค่าปัจจุบัน */}
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">{currentLabel}</p>
        <p className="text-sm font-semibold text-foreground tabular-nums">
          {formatValue(currentValue, unit)}
          <span className="text-xs text-muted-foreground font-normal ml-1">{unit}</span>
        </p>
      </div>

      {/* ตัวชี้วัด % เปลี่ยนแปลง */}
      <div className="flex flex-col items-center justify-center">
        <span
          className={`text-xs font-bold tabular-nums ${
            isNeutral
              ? "text-muted-foreground"
              : isUp
              ? "text-emerald-400"
              : "text-red-400"
          }`}
        >
          {isNeutral ? "—" : `${isUp ? "+" : ""}${changePercent}%`}
        </span>
        {/* ลูกศรชี้ทิศทาง */}
        {!isNeutral && (
          <span className={`text-xs ${isUp ? "text-emerald-400" : "text-red-400"}`}>
            {isUp ? "▲" : "▼"}
          </span>
        )}
      </div>

      {/* ค่าก่อนหน้า */}
      <div className="text-right">
        <p className="text-xs text-muted-foreground mb-0.5">{previousLabel}</p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {formatValue(previousValue, unit)}
          <span className="text-xs font-normal ml-1">{unit}</span>
        </p>
      </div>
    </div>
  );
}

// ─── Time Range Selector ──────────────────────────────────────────────────────

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "1h",  label: "1ชม." },
  { value: "24h", label: "24ชม." },
  { value: "7d",  label: "7วัน" },
  { value: "30d", label: "30วัน" },
  { value: "90d", label: "90วัน" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function MetricCard({
  data,
  metricType,
  onTimeRangeChange,
  onRefresh,
  isLoading = false,
}: MetricCardProps) {
  /**
   * isExpanded: เปิด/ปิด detail section (comparison + chart ขนาดใหญ่)
   * showComparison: toggle เส้นเปรียบเทียบบนกราฟ
   */
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComparison, setShowComparison] = useState(true);

  const config = METRIC_CONFIGS[metricType];

  return (
    <Card className="bg-card border-border overflow-hidden transition-all duration-200 hover:border-primary/30">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          {/* ชื่อ metric + description */}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              {data.description}
            </p>
            <h3 className="text-sm font-semibold text-foreground text-balance">
              {data.title}
            </h3>
          </div>

          {/* Trend badge */}
          <TrendBadge
            trend={data.trend}
            changePercent={data.changePercent}
            positiveDirection={config.positiveDirection}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* ─── Current Value ───────────────────────────────────────────── */}
        <div className="flex items-end justify-between gap-2">
          <div>
            {/* ค่าตัวเลขหลัก — ใช้ tabular-nums เพื่อป้องกัน layout shift */}
            <span
              className="text-4xl font-bold tabular-nums leading-none"
              style={{ color: config.color }}
            >
              {data.currentValue}
            </span>
            <span className="text-lg text-muted-foreground ml-1.5 font-normal">
              {data.unit}
            </span>
          </div>

          {/* ปุ่มควบคุม refresh + expand */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={onRefresh}
                disabled={isLoading}
                aria-label="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setIsExpanded((v) => !v)}
              aria-label={isExpanded ? "ย่อวิดเจ็ต" : "ขยายวิดเจ็ต"}
            >
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* ─── Mini Chart (always visible) ────────────────────────────── */}
        <div className="relative">
          {isLoading && (
            // overlay loading state บนกราฟ
            <div className="absolute inset-0 bg-card/60 flex items-center justify-center z-10 rounded-md backdrop-blur-sm">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          <MetricChart
            data={data.chartData}
            color={config.color}
            compareColor={config.compareColor}
            unit={data.unit}
            showComparison={showComparison}
            height={isExpanded ? 260 : 120}
          />
        </div>

        {/* ─── Expanded Detail Section ─────────────────────────────────── */}
        {isExpanded && (
          <div className="space-y-4 pt-2">
            {/* Time range selector */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-1">
                {TIME_RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onTimeRangeChange?.(opt.value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      data.timeRange === opt.value
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                    style={
                      data.timeRange === opt.value
                        ? { backgroundColor: `${config.color}25`, color: config.color }
                        : undefined
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* toggle เส้นเปรียบเทียบ */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                onClick={() => setShowComparison((v) => !v)}
              >
                {showComparison ? (
                  <Eye className="h-3 w-3" />
                ) : (
                  <EyeOff className="h-3 w-3" />
                )}
                เปรียบเทียบ
              </Button>
            </div>

            {/* Comparison table */}
            <div className="rounded-lg bg-secondary/30 border border-border/50 px-3 py-1">
              <p className="text-xs font-medium text-muted-foreground pt-2 pb-1 uppercase tracking-wide">
                การเปรียบเทียบ
              </p>
              {data.comparisons.map((comp, i) => (
                <ComparisonRow key={i} {...comp} unit={data.unit} />
              ))}
            </div>

            {/* Last updated timestamp */}
            <p className="text-xs text-muted-foreground text-right">
              อัปเดตล่าสุด: {data.lastUpdatedAt}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
