/** @type {import('next').NextConfig} */
const nextConfig = {
  // กำหนด experimental config สำหรับ Turbopack
  // จำเป็นต้องระบุ root directory เมื่อใช้ src/ structure
  turbopack: {
    root: process.cwd(),
  },
}

export default nextConfig
