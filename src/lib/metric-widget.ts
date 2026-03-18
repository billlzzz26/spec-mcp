/**
 * metric-widget.ts
 * ----------------
 * Service layer สำหรับ Metric Widget
 *
 * แยก business logic ออกจาก UI Component ตามหลัก Separation of Concerns
 * ทำให้ง่ายต่อการ mock ในการทดสอบ และเปลี่ยน data source ในอนาคต
 *
 * แนวคิด: Data → Transform → Present
 *   1. ดึงข้อมูลผ่าน Service Layer (ไฟล์นี้)
 *   2. Component รับ props แล้ว render เท่านั้น
 *   3. ไม่มี fetch ใน useEffect ของ Component โดยตรง
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** ทิศทางแนวโน้มของ metric */
export type TrendDirection = "up" | "down" | "neutral";

/** ช่วงเวลาสำหรับ filter ข้อมูล */
export type TimeRange = "1h" | "24h" | "7d" | "30d" | "90d";

/** ประเภทของ metric */
export type MetricType = "invocations" | "success_rate" | "avg_latency" | "token_usage" | "error_rate";

/** จุดข้อมูลในกราฟ (time series) */
export interface DataPoint {
  /** timestamp เป็น ISO string หรือ label ย่อ เช่น "08:00" */
  timestamp: string;
  /** ค่าหลักของ metric */
  value: number;
  /** ค่าเปรียบเทียบจากช่วงเวลาก่อนหน้า (optional) */
  previousValue?: number;
}

/** ข้อมูลเปรียบเทียบระหว่างช่วงเวลา */
export interface ComparisonData {
  /** ชื่อช่วงเวลาปัจจุบัน เช่น "วันนี้" */
  currentLabel: string;
  /** ค่าปัจจุบัน */
  currentValue: number;
  /** ชื่อช่วงเวลาก่อนหน้า เช่น "เมื่อวาน" */
  previousLabel: string;
  /** ค่าก่อนหน้า */
  previousValue: number;
  /** % การเปลี่ยนแปลง (บวก = เพิ่ม, ลบ = ลด) */
  changePercent: number;
}

/** โครงสร้างหลักของ Metric Widget */
export interface MetricWidgetData {
  /** ชื่อ metric */
  title: string;
  /** คำอธิบายสั้น */
  description: string;
  /** ค่าปัจจุบันแบบ string พร้อม format เช่น "1,234" หรือ "98.5%" */
  currentValue: string;
  /** ค่าตัวเลขสำหรับคำนวณ */
  currentValueRaw: number;
  /** หน่วยของ metric เช่น "calls", "ms", "tokens" */
  unit: string;
  /** ทิศทางแนวโน้ม */
  trend: TrendDirection;
  /** % การเปลี่ยนแปลงจากช่วงก่อน */
  changePercent: number;
  /** ข้อมูลเปรียบเทียบหลายช่วงเวลา */
  comparisons: ComparisonData[];
  /** ข้อมูลสำหรับแผนภูมิ time series */
  chartData: DataPoint[];
  /** ช่วงเวลาที่กำลังดูอยู่ */
  timeRange: TimeRange;
  /** timestamp ล่าสุดที่อัปเดต */
  lastUpdatedAt: string;
}

/** Config สำหรับแต่ละ metric type */
export interface MetricConfig {
  type: MetricType;
  title: string;
  description: string;
  unit: string;
  /** สี hex สำหรับกราฟ - ต้องเป็น hex ไม่ใช่ CSS variable เพราะ Recharts ไม่รองรับ */
  color: string;
  /** สีเปรียบเทียบ (เส้นก่อนหน้า) */
  compareColor: string;
  /** ทิศทางที่ "ดี" ถ้าค่าเพิ่ม up = ดี (เช่น success_rate), down = ดี (เช่น latency) */
  positiveDirection: "up" | "down";
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** รายการ metric ทั้งหมดพร้อม config */
export const METRIC_CONFIGS: Record<MetricType, MetricConfig> = {
  invocations: {
    type: "invocations",
    title: "Total invocations",
    description: "Skill calls per time period",
    unit: "calls",
    color: "#3b82f6",
    compareColor: "#1e3a5f",
    positiveDirection: "up",
  },
  success_rate: {
    type: "success_rate",
    title: "Success rate",
    description: "Percentage of successful skill executions",
    unit: "%",
    color: "#10b981",
    compareColor: "#064e3b",
    positiveDirection: "up",
  },
  avg_latency: {
    type: "avg_latency",
    title: "Avg. latency",
    description: "Mean execution time per invocation",
    unit: "ms",
    color: "#f59e0b",
    compareColor: "#451a03",
    positiveDirection: "down",
  },
  token_usage: {
    type: "token_usage",
    title: "Token usage",
    description: "Total tokens consumed",
    unit: "tokens",
    color: "#8b5cf6",
    compareColor: "#2e1065",
    positiveDirection: "up",
  },
  error_rate: {
    type: "error_rate",
    title: "Error rate",
    description: "Percentage of failed invocations",
    unit: "%",
    color: "#ef4444",
    compareColor: "#450a0a",
    positiveDirection: "down",
  },
};

// ─── Data Generation ──────────────────────────────────────────────────────────

/**
 * Seeded random number generator — ต้องใช้ seed เดียวกันแล้วจึงได้ค่าเดียวกัน
 * เพื่อแก้ hydration mismatch เมื่อ SSR render ข้อมูลต่างจาก client
 *
 * Xorshift32 — lightweight PRNG ที่ stable และเร็ว
 * @param seed  ตัวเลขเริ่มต้น (เช่น hash ของ metricType + timeRange)
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return function random() {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    // แปลง int32 เป็น float [0, 1)
    return Math.abs(s % 1000000) / 1000000;
  };
}

/**
 * computeSeed — คำนวณ seed จาก metricType + timeRange
 * ทำให้ data ของ metric "Success rate" กับ "24h" เป็นค่าเดียวกันเสมอ
 */
function computeSeed(metricType: string, timeRange: string): number {
  let hash = 0;
  const str = `${metricType}-${timeRange}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // convert to 32-bit integer
  }
  return Math.abs(hash) || 42; // ถ้า hash = 0 ให้ใช้ 42 เป็น fallback
}

/**
 * สร้าง mock time series data จำนวน n จุด
 * ใช้ seeded randomness เพื่อให้ข้อมูล stable ไม่เปลี่ยนทุก render
 *
 * @param base  ค่าเริ่มต้น
 * @param variance  ± ช่วงที่ค่าจะแกว่ง (เป็น fraction เช่น 0.2 = ±20%)
 * @param n  จำนวนจุดข้อมูล
 * @param metricType  ประเภท metric (สำหรับ seeding)
 * @param timeRange  ช่วงเวลา (สำหรับ seeding)
 */
function generateTimeSeries(
  base: number,
  variance: number,
  n: number,
  metricType: string,
  timeRange: string,
): number[] {
  const seed = computeSeed(metricType, timeRange);
  const random = seededRandom(seed);

  const values: number[] = [];
  let current = base;
  for (let i = 0; i < n; i++) {
    // Random walk แบบง่าย: เดินไปเรื่อย ๆ แต่ดึงกลับหา base
    const drift = (base - current) * 0.1;
    const noise = (random() - 0.5) * 2 * variance * base;
    current = Math.max(0, current + drift + noise);
    values.push(Math.round(current * 100) / 100);
  }
  return values;
}

/**
 * สร้าง timestamp labels ตาม timeRange
 * เช่น "1h" → ["58m", "56m", ..., "Now"]
 */
function generateLabels(timeRange: TimeRange, n: number): string[] {
  const labels: string[] = [];
  const now = new Date();

  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(now);
    switch (timeRange) {
      case "1h":
        date.setMinutes(date.getMinutes() - i * Math.floor(60 / n));
        labels.push(i === 0 ? "Now" : `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`);
        break;
      case "24h":
        date.setHours(date.getHours() - i * Math.floor(24 / n));
        labels.push(`${date.getHours().toString().padStart(2, "0")}:00`);
        break;
      case "7d":
        date.setDate(date.getDate() - i);
        labels.push(`${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`);
        break;
      case "30d":
      case "90d":
        date.setDate(date.getDate() - i * Math.floor((timeRange === "30d" ? 30 : 90) / n));
        labels.push(`${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`);
        break;
    }
  }
  return labels;
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * formatValue - แปลงตัวเลข raw เป็น string พร้อม format
 * ใช้ Intl.NumberFormat สำหรับตัวคั่นหลักพัน
 * และรูปแบบยุโรป (จุลภาค = ทศนิยม) ตาม locale th-TH
 */
export function formatValue(value: number, unit: string): string {
  if (unit === "%") {
    return `${value.toLocaleString("th-TH", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  }
  if (unit === "ms") {
    return value >= 1000
      ? `${(value / 1000).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `${value.toLocaleString("th-TH")}`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("th-TH", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString("th-TH", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K`;
  }
  return value.toLocaleString("th-TH");
}

/**
 * calculateTrend - คำนวณทิศทาง trend จาก % การเปลี่ยนแปลง
 *
 * @param changePercent  % เปลี่ยนแปลง
 * @param threshold  ขอบเขต ± ที่ถือว่า neutral (default 0.5%)
 */
export function calculateTrend(changePercent: number, threshold = 0.5): TrendDirection {
  if (Math.abs(changePercent) < threshold) return "neutral";
  return changePercent > 0 ? "up" : "down";
}

/**
 * getMetricWidgetData - ดึง metric data พร้อม chart สำหรับ widget
 *
 * ในโปรดักชันจริง: ควรแทนที่ mock data ด้วย fetch ไปยัง API endpoint
 * เช่น: fetch(`/api/metrics?type=${metricType}&range=${timeRange}`)
 *
 * @param metricType  ประเภท metric ที่ต้องการ
 * @param timeRange  ช่วงเวลาที่ต้องการดู
 */
export function getMetricWidgetData(
  metricType: MetricType,
  timeRange: TimeRange,
): MetricWidgetData {
  const config = METRIC_CONFIGS[metricType];

  // ─── Mock base values ──────────────────────────────────────────────────────
  // ค่าตั้งต้นตาม metric type เพื่อให้ข้อมูล realistic
  const baseValues: Record<MetricType, number> = {
    invocations: 4_280,
    success_rate: 97.3,
    avg_latency: 342,
    token_usage: 128_500,
    error_rate: 2.7,
  };

  const base = baseValues[metricType];
  const nPoints = timeRange === "1h" ? 20 : timeRange === "24h" ? 24 : timeRange === "7d" ? 7 : 30;

  // สร้างข้อมูล time series สำหรับช่วงปัจจุบัน — ส่ง metricType + timeRange สำหรับ seeding
  const currentSeries = generateTimeSeries(base, 0.15, nPoints, metricType, timeRange);
  // สร้างข้อมูล time series สำหรับช่วงก่อนหน้า — ใช้ seed อื่น "prev-" + type เพื่อให้ต่างจากปัจจุบัน
  const previousSeries = generateTimeSeries(
    base * 0.9,
    0.15,
    nPoints,
    `prev-${metricType}`,
    timeRange,
  );
  const labels = generateLabels(timeRange, nPoints);

  // รวม series เข้าเป็น DataPoint array
  const chartData: DataPoint[] = labels.map((timestamp, i) => ({
    timestamp,
    value: currentSeries[i],
    previousValue: previousSeries[i],
  }));

  // ค่าปัจจุบัน = จุดสุดท้ายของ series
  const currentValueRaw = currentSeries[nPoints - 1];
  const previousValueRaw = previousSeries[nPoints - 1];

  // % เปลี่ยนแปลงเทียบกับช่วงก่อนหน้า
  const changePercent = previousValueRaw > 0
    ? ((currentValueRaw - previousValueRaw) / previousValueRaw) * 100
    : 0;

  // ─── Comparisons ──────────────────────────────────────────────────────────
  const comparisonLabels: Record<TimeRange, [string, string]> = {
    "1h":  ["ชั่วโมงนี้", "ชั่วโมงที่แล้ว"],
    "24h": ["วันนี้", "เมื่อวาน"],
    "7d":  ["สัปดาห์นี้", "สัปดาห์ที่แล้ว"],
    "30d": ["เดือนนี้", "เดือนที่แล้ว"],
    "90d": ["ไตรมาสนี้", "ไตรมาสที่แล้ว"],
  };
  const [currentLabel, previousLabel] = comparisonLabels[timeRange];

  const comparisons: ComparisonData[] = [
    {
      currentLabel,
      currentValue: currentValueRaw,
      previousLabel,
      previousValue: previousValueRaw,
      changePercent: Math.round(changePercent * 10) / 10,
    },
    // เปรียบเทียบ avg ทั้งช่วง vs ค่า baseline
    {
      currentLabel: "เฉลี่ยช่วงนี้",
      currentValue: currentSeries.reduce((a, b) => a + b, 0) / nPoints,
      previousLabel: "ค่าเป้าหมาย",
      previousValue: base,
      changePercent: Math.round(
        (((currentSeries.reduce((a, b) => a + b, 0) / nPoints) - base) / base) * 1000,
      ) / 10,
    },
  ];

  return {
    title: config.title,
    description: config.description,
    currentValue: formatValue(currentValueRaw, config.unit),
    currentValueRaw,
    unit: config.unit,
    trend: calculateTrend(changePercent),
    changePercent: Math.round(changePercent * 10) / 10,
    comparisons,
    chartData,
    timeRange,
    lastUpdatedAt: new Date().toLocaleString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}
