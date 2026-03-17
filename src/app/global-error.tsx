'use client'

/**
 * Global Error Boundary สำหรับ Next.js App Router
 * จัดการ errors ที่เกิดขึ้นใน root layout
 * ต้องเป็น Client Component เพราะต้องใช้ JavaScript ในการ render
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <h2 className="mb-4 text-xl font-semibold">Something went wrong!</h2>
          <button
            onClick={() => reset()}
            className="rounded bg-foreground px-4 py-2 text-background hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
