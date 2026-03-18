/**
 * MetricDashboard.tsx
 * -------------------
 * Dashboard หลักที่รวม MetricCard หลายตัวเข้าด้วยกัน
 *
 * ออกแบบเป็น "container component" (Smart Component):
 *   - จัดการ state: timeRange, loading, data ทั้งหมด
 *   - ส่ง data ลงไปให้ MetricCard (Dumb Component) render
 *
 * Pattern นี้เรียกว่า Container/Presentational Pattern
 * ข้อดี: MetricCard ทดสอบได้ง่ายกว่าเพราะรับแค่ props ไม่มี side effect
 *
 * แนวทางการพัฒนาต่อ:
 *   - ดึงข้อมูลจาก API จริงด้วย useSWR
 *   - เพิ่มระบบ alert เมื่อ metric เกิน threshold
 *   - รองรับ custom layout (drag & resize widget)
 *   - เพิ่ม export PDF/CSV ของ dashboard ทั้งหมด
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { Activity, RefreshCw, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "./MetricCard";
import { healthCheck } from "@/lib/metric-api";
import {
  getMetricWidgetData,
  METRIC_CONFIGS,
  type MetricType,
  type TimeRange,
  type MetricWidgetData,
} from "@/lib/metric-widget";

// ─── Types ────────────────────────────────────────────────────────────────────

/** layout mode: grid (2 คอลัมน์) หรือ list (1 คอลัมน์) */
type LayoutMode = "grid" | "list";

// ─── Constants ────────────────────────────────────────────────────────────────

/** metric types ที่จะแสดงในแดชบอร์ด — สามารถ configure ได้ */
const DASHBOARD_METRICS: MetricType[] = [
  "invocations",
  "success_rate",
  "avg_latency",
  "token_usage",
  "error_rate",
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useDashboardData - custom hook จัดการ state ของ dashboard
 *
 * แยก logic ออกจาก render ทำให้:
 *   1. ทดสอบ logic ได้โดยไม่ต้อง render component
 *   2. component ไฟล์สะอาด มีแต่ JSX
 *
 * ใช้ Record<MetricType, MetricWidgetData> เพื่อ O(1) access ตาม type
 */
function useDashboardData() {
  // เริ่มต้นด้วย global time range "24h"
  const [globalTimeRange, setGlobalTimeRange] = useState<TimeRange>("24h");

  // แต่ละ card สามารถมี time range ของตัวเองได้
  const [perCardTimeRange, setPerCardTimeRange] = useState<
    Partial<Record<MetricType, TimeRange>>
  >({});

  const [loadingCards, setLoadingCards] = useState<Set<MetricType>>(new Set());

  /**
   * getEffectiveTimeRange - ดึง time range ที่ใช้จริงของแต่ละ card
   * ถ้า card นั้นมี custom range ให้ใช้ card range ก่อน, ไม่ก็ใช้ global
   */
  const getEffectiveTimeRange = useCallback(
    (type: MetricType): TimeRange =>
      perCardTimeRange[type] ?? globalTimeRange,
    [perCardTimeRange, globalTimeRange],
  );

  /**
   * getData - ดึงข้อมูล metric จาก service layer
   * ในโปรดักชันจริง: แทนที่ด้วย fetch หรือ SWR
   */
  const getData = useCallback(
    (type: MetricType): MetricWidgetData =>
      getMetricWidgetData(type, getEffectiveTimeRange(type)),
    [getEffectiveTimeRange],
  );

  /**
   * handleCardTimeRange - เมื่อ card เปลี่ยน time range เฉพาะของตัวเอง
   */
  const handleCardTimeRange = useCallback(
    (type: MetricType, range: TimeRange) => {
      setPerCardTimeRange((prev) => ({ ...prev, [type]: range }));
    },
    [],
  );

  /**
   * handleCardRefresh - simulate refresh ด้วย loading state 800ms
   * ในโปรดักชัน: ให้ invalidate SWR cache แทน
   */
  const handleCardRefresh = useCallback((type: MetricType) => {
    setLoadingCards((prev) => new Set([...prev, type]));
    setTimeout(() => {
      setLoadingCards((prev) => {
        const next = new Set(prev);
        next.delete(type);
        return next;
      });
    }, 800);
  }, []);

  /**
   * handleRefreshAll - รีเฟรชทุก card พร้อมกัน
   */
  const handleRefreshAll = useCallback(() => {
    const all = new Set<MetricType>(DASHBOARD_METRICS);
    setLoadingCards(all);
    setTimeout(() => setLoadingCards(new Set()), 1000);
  }, []);

  return {
    globalTimeRange,
    setGlobalTimeRange,
    getData,
    handleCardTimeRange,
    handleCardRefresh,
    handleRefreshAll,
    loadingCards,
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MetricDashboard() {
  // ─── All hooks MUST be called here, BEFORE any return ───────────────────
  // หา hooks ทั้งหมดก่อน early return เพื่อป้องกัน hooks violation
  const [isMounted, setIsMounted] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("grid");
  const [backendHealthy, setBackendHealthy] = useState(false);

  // ✅ useDashboardData() ต้องอยู่ที่นี่ ก่อน if (!isMounted) return
  const {
    globalTimeRange,
    setGlobalTimeRange,
    getData,
    handleCardTimeRange,
    handleCardRefresh,
    handleRefreshAll,
    loadingCards,
  } = useDashboardData();

  // ตรวจสอบ backend connection เมื่อ mount
  useEffect(() => {
    setIsMounted(true);
    
    healthCheck().then((result) => {
      if (result.status === 'ok') {
        setBackendHealthy(true);
        console.log('[MetricDashboard] Backend connected');
      } else {
        console.warn('[MetricDashboard] Backend health check failed:', result.errors);
      }
    }).catch((error) => {
      console.warn('[MetricDashboard] Backend connection error:', error);
    });
  }, []);

  // ป้องกัน hydration mismatch — ไม่ render ก่อนที่ client hydrated
  if (!isMounted) {
    return null;
  }

  const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
    { value: "1h",  label: "1 ชม." },
    { value: "24h", label: "24 ชม." },
    { value: "7d",  label: "7 วัน" },
    { value: "30d", label: "30 วัน" },
    { value: "90d", label: "90 วัน" },
  ];

  return (
    <section className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6">

        {/* ─── Dashboard Header ──────────────────────────────────────────── */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground text-balance">
                Metric dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Real-time skill performance metrics
              </p>
            </div>
          </div>

          {/* Toolbar: time range global + layout + refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Global time range selector */}
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
              {TIME_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGlobalTimeRange(opt.value)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    globalTimeRange === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Layout toggle */}
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${layoutMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                onClick={() => setLayoutMode("grid")}
                aria-label="แสดงแบบ grid"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${layoutMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                onClick={() => setLayoutMode("list")}
                aria-label="แสดงแบบ list"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Refresh all */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs border-border"
              onClick={handleRefreshAll}
              disabled={loadingCards.size > 0}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingCards.size > 0 ? "animate-spin" : ""}`} />
              รีเฟรชทั้งหมด
            </Button>
          </div>
        </header>

        {/* ─── Summary Bar ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">
            แสดง {DASHBOARD_METRICS.length} metrics
            {backendHealthy && (
              <span className="ml-2 text-emerald-400">✓ Backend เชื่อมต่อ</span>
            )}
            {!backendHealthy && (
              <span className="ml-2 text-orange-400">⚠ Backend disconnected - ใช้ mock data</span>
            )}
          </span>
          {/* Legend dots สำหรับแต่ละ metric */}
          {DASHBOARD_METRICS.map((type) => {
            const config = METRIC_CONFIGS[type];
            return (
              <Badge
                key={type}
                variant="outline"
                className="gap-1.5 text-xs border-border text-muted-foreground"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                {config.title}
              </Badge>
            );
          })}
        </div>

        {/* ─── Metric Grid ───────────────────────────────────────────────── */}
        <main
          className={
            layoutMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
              : "flex flex-col gap-4"
          }
        >
          {DASHBOARD_METRICS.map((type) => (
            <MetricCard
              key={type}
              data={getData(type)}
              metricType={type}
              onTimeRangeChange={(range) => handleCardTimeRange(type, range)}
              onRefresh={() => handleCardRefresh(type)}
              isLoading={loadingCards.has(type)}
            />
          ))}
        </main>

        {/* ─── Footer ────────────────────────────────────────────────────── */}
        <footer className="text-center pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            ข้อมูล mock สำหรับ demo — เชื่อมต่อ API จริงผ่าน{" "}
            <code className="font-mono text-primary/80">getMetricWidgetData()</code>{" "}
            ใน service layer
          </p>
        </footer>
      </div>
    </section>
  );
}
