#!/bin/bash
# สคริปต์สำหรับสร้าง package-lock.json ใหม่ให้ตรงกับ package.json
# เหตุผล: npm ci ต้องการให้ lock file และ package.json ตรงกันเป๊ะ (in sync)
cd /vercel/share/v0-project
rm -f package-lock.json
npm install --legacy-peer-deps
