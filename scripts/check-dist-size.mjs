#!/usr/bin/env node
/**
 * Cloudflare Pages rejects a whole deployment when a single file is larger
 * than 25 MiB (26,214,400 bytes) or when the build contains more than
 * 20,000 files. Vite only warns about big chunks, so a dependency bump could
 * keep CI green while the live deploy failed. This script checks `dist/`
 * after the build and exits non-zero before Cloudflare ever sees the output.
 *
 * Limits: https://developers.cloudflare.com/pages/platform/limits/
 *
 * Usage: node scripts/check-dist-size.mjs [dist directory]
 */
import { readdir, stat } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

const MAX_FILE_BYTES = 26_214_400 // 25 MiB, Cloudflare Pages per-file limit
const MAX_FILE_COUNT = 20_000 // Cloudflare Pages per-deployment file limit
const LARGEST_FILES_TO_REPORT = 10

const distDirectory = process.argv[2] ? resolve(process.argv[2]) : resolve(import.meta.dirname, '..', 'dist')
const displayPath = (absolutePath) => relative(process.cwd(), absolutePath).split('\\').join('/') || '.'

const formatMiB = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MiB`
const formatBytes = (bytes) => `${bytes.toLocaleString('en-US')} B`

const files = []
const collect = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      await collect(fullPath)
    } else if (entry.isFile()) {
      const { size } = await stat(fullPath)
      files.push({ path: displayPath(fullPath), size })
    }
  }
}

try {
  await collect(distDirectory)
} catch (error) {
  console.error(`[dist-size] '${displayPath(distDirectory)}'를 읽지 못했습니다: ${error.message}`)
  console.error('[dist-size] 빌드를 먼저 실행하세요 (npm run build).')
  process.exit(1)
}

if (files.length === 0) {
  console.error(`[dist-size] '${displayPath(distDirectory)}'가 비어 있습니다. 빌드 결과가 생성되었는지 확인하세요.`)
  process.exit(1)
}

files.sort((a, b) => b.size - a.size)
const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
const oversizedFiles = files.filter((file) => file.size > MAX_FILE_BYTES)

console.log(`[dist-size] ${files.length.toLocaleString('en-US')}개 파일 · ${formatMiB(totalBytes)} · 최대 ${formatMiB(files[0].size)} (${files[0].path})`)
console.log(`[dist-size] 가장 큰 파일 ${Math.min(LARGEST_FILES_TO_REPORT, files.length)}개`)
for (const file of files.slice(0, LARGEST_FILES_TO_REPORT)) {
  console.log(`  ${formatMiB(file.size).padStart(9)}  ${file.path}`)
}

const failures = []
if (oversizedFiles.length > 0) {
  failures.push(`파일 ${oversizedFiles.length}개가 Cloudflare Pages 파일당 상한 ${formatBytes(MAX_FILE_BYTES)}(25 MiB)을 넘었습니다.`)
  for (const file of oversizedFiles) {
    console.log(`  ✗ ${file.path} — ${formatBytes(file.size)} (${formatMiB(file.size)})`)
  }
}
if (files.length > MAX_FILE_COUNT) {
  failures.push(`파일 수 ${files.length.toLocaleString('en-US')}개가 Cloudflare Pages 상한 ${MAX_FILE_COUNT.toLocaleString('en-US')}개를 넘었습니다.`)
}

if (failures.length > 0) {
  console.error('[dist-size] 배포가 실패합니다.')
  for (const failure of failures) console.error(`  - ${failure}`)
  console.error('  상한을 넘긴 자산을 줄이거나, 그 자산을 만드는 의존성 버전을 이전 릴리스로 고정하세요.')
  console.error('  예: @rhwp/core 0.9.x의 rhwp_bg.wasm은 26.59 MiB라 0.8.2로 고정되어 있습니다 (README 참고).')
  process.exit(1)
}

console.log(`[dist-size] ✓ Cloudflare Pages 상한 안에 있습니다 (파일당 ≤ ${formatBytes(MAX_FILE_BYTES)}, 파일 수 ≤ ${MAX_FILE_COUNT.toLocaleString('en-US')}).`)
