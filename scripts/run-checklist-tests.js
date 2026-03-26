/**
 * run-checklist-tests.js
 * ----------------------
 * สคริปต์สำหรับรัน catalog config tests และแสดงผลลัพธ์
 * ใช้สำหรับยืนยัน checklist items 0.1.1-0.1.4
 */

import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

console.log('========================================')
console.log('Running Checklist Verification Tests')
console.log('Items: 0.1.1, 0.1.2, 0.1.3, 0.1.4')
console.log('========================================\n')

// รัน vitest กับไฟล์ทดสอบเฉพาะ
const vitest = spawn('npx', [
  'vitest',
  'run',
  'src/__tests__/catalog-config.test.ts',
  '--reporter=verbose'
], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true
})

vitest.on('close', (code) => {
  console.log('\n========================================')
  if (code === 0) {
    console.log('All tests PASSED!')
    console.log('Checklist items 0.1.1-0.1.4 verified.')
  } else {
    console.log(`Tests exited with code ${code}`)
    console.log('Some tests may have failed.')
  }
  console.log('========================================')
  process.exit(code)
})

vitest.on('error', (err) => {
  console.error('Failed to start test process:', err)
  process.exit(1)
})
