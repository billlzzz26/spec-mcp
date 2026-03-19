import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Metric dashboard - Real-time skill analytics",
  description:
    "Dashboard แสดง metric แบบ real-time สำหรับ skill invocations, success rate, latency และ token usage",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
