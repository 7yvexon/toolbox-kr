import { loadEnv } from 'vite'

const env = { ...loadEnv('production', process.cwd(), ''), ...process.env }
const errors = []
try {
  const siteUrl = new URL(env.VITE_SITE_URL || '')
  if (siteUrl.protocol !== 'https:') errors.push('VITE_SITE_URL은 https:// 공개 주소여야 합니다.')
} catch {
  errors.push('VITE_SITE_URL에 실제 공개 주소를 설정해 주세요.')
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.VITE_CONTACT_EMAIL || '')) {
  errors.push('VITE_CONTACT_EMAIL에 실제 공식 문의 이메일을 설정해 주세요.')
}
if (errors.length) {
  console.error(`프로덕션 배포 설정 오류:\n- ${errors.join('\n- ')}`)
  process.exit(1)
}
console.log('Production environment is configured.')
