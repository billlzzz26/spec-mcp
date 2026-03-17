import type { Metadata } from "next"
import "../index.css"

/**
 * Root Layout สำหรับ Next.js App Router
 * 
 * Layout นี้ทำหน้าที่เป็น template หลักที่ครอบทุกหน้าในแอป
 * - กำหนด html และ body tags
 * - Import global CSS styles
 * - ตั้งค่า metadata สำหรับ SEO
 */

export const metadata: Metadata = {
  title: "Skill Service - AI-Powered Skill Discovery",
  description: "Semantic search for AI agent skills powered by Voyage AI embeddings and Zilliz Cloud vector database",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
