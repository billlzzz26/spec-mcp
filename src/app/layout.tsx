import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "../index.css";

export const metadata: Metadata = {
  title: "Skill Service - AI-Powered Skill Discovery",
  description: "Semantic search for AI agent skills powered by Voyage AI embeddings and Zilliz Cloud",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
