import { dirname } from 'path'
import { fileURLToPath } from 'url'

// ใช้ fileURLToPath เพื่อแปลง import.meta.url เป็น path ที่ใช้งานได้
// เนื่องจาก ES Modules ไม่มี __dirname เหมือน CommonJS
const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // กำหนด turbopack.root เป็น absolute path ของ project directory
  // แก้ปัญหา "couldn't find Next.js package" เมื่อใช้ src/ directory structure
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
