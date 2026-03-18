/**
 * page.tsx
 * --------
 * Entry point ของแอปพลิเคชัน (Next.js App Router)
 *
 * เป็นแค่ thin wrapper ที่ import MetricDashboard มา render
 * ตามหลัก Single Responsibility: page ทำหน้าที่ routing เท่านั้น
 * logic และ UI อยู่ใน components แยกต่างหาก
 */

import { MetricDashboard } from "@/components/metric-widget/MetricDashboard";

export default function Page() {
  return <MetricDashboard />;
}
