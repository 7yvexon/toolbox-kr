# 파일정비소

[![CI](https://github.com/7yvexon/toolbox-kr/actions/workflows/ci.yml/badge.svg)](https://github.com/7yvexon/toolbox-kr/actions/workflows/ci.yml)

설치와 회원가입 없이 사용하는 한국형 이미지·PDF 도구 모음입니다. 선택한 파일은 서버로 업로드하지 않고 사용자의 브라우저 안에서만 처리합니다.

> 현재 단계: `0.1.0` MVP · 저장소는 비공개로 운영 중

## 주요 기능

| 도구 | 입력 | 출력 | 제한 |
| --- | --- | --- | --- |
| HWP/HWPX → 호환 PDF | HWP 5.0, HWPX | 내용 확인용 이미지형 PDF | 파일당 20MB, HWP 최대 50페이지 |
| 이미지 용량 줄이기 | JPG, PNG, WEBP | JPG, PNG, WEBP | 파일당 30MB, 4천만 픽셀 |
| 이미지 형식 변환 | JPG, PNG, WEBP | JPG, PNG, WEBP 또는 ZIP | 최대 30장, 전체 120MB |
| HEIC → JPG | HEIC, HEIF | JPG | 파일당 30MB |
| 사진 → PDF | JPG, PNG, WEBP | PDF | 최대 30장, 전체 120MB |
| PDF 합치기 | PDF 최대 10개 | PDF | 전체 150MB, 결과 300페이지 |
| PDF 나누기 | PDF | 선택한 구간 PDF | 최대 200페이지 |
| PDF 회전 | PDF | 회전된 PDF | 90°, 180°, 270° |
| PDF → JPG | PDF | JPG 또는 ZIP | 최대 50페이지 |
| PDF 페이지 번호 | PDF | 번호가 추가된 PDF | 최대 200페이지 |

파일 확장자만 신뢰하지 않고 실제 파일 헤더, MIME 형식, 크기와 이미지 해상도를 처리 전에 확인합니다.

## 개인정보 보호 설계

- 변환은 브라우저 메모리에서만 실행합니다.
- 원본 IP는 저장하지 않고 당일 중복 집계를 위한 HMAC 식별값으로 즉시 변환합니다.
- 통계에는 파일명·파일 내용·정확한 파일 크기를 포함하지 않으며 31일 후 파기합니다.
- Discord에는 페이지 방문과 도구 사용 시작·성공·실패마다 일부 마스킹된 IP가 포함된 알림과 순 방문자·지역·도구별 성공/오류 등 시간별·일일 합계를 전송합니다.
- 미리보기와 결과는 임시 Blob URL을 사용하며 사용이 끝나면 해제합니다.
- 생성된 결과는 브라우저 다운로드 기능으로 사용자 기기에 직접 저장합니다.
- 배포 환경에는 CSP, 클릭재킹 방지, MIME 스니핑 방지 등 보안 헤더를 적용합니다.

브라우저 개발자 도구의 Network 탭에서 변환 중 파일 전송 요청이 발생하지 않는지 직접 확인할 수 있습니다.

## 기술 구성

- React 19 + TypeScript
- Vite 8
- `heic2any` — HEIC/HEIF 디코딩
- `@rhwp/core` — HWP/HWPX WASM 파싱·렌더링
- `pdf-lib` — 브라우저 PDF 생성
- PDF.js — PDF 페이지 렌더링
- JSZip — 일괄 변환 결과 압축
- Netlify Functions + Blobs — 개인정보 최소화 이용 통계와 예약 보고

## 로컬 실행

요구 사항: Node.js 22 이상, npm 10 이상

```bash
git clone https://github.com/7yvexon/toolbox-kr.git
cd toolbox-kr
npm ci
npm run dev
```

기본 개발 주소는 `http://localhost:5173`입니다.

## 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run typecheck` | TypeScript 검사 |
| `npm run test` | 파일 검증 및 PDF 변환 자동 테스트 |
| `npm run build` | 로컬 확인용 번들 생성 |
| `npm run build:production` | 공개 주소·문의 이메일 확인 후 배포 번들 생성 |
| `npm run preview` | 프로덕션 번들 로컬 확인 |
| `npm run security:audit` | high 이상 npm 취약점 검사 |
| `npm run check` | 빌드와 보안 감사를 한 번에 실행 |

## 프로젝트 구조

```text
src/
├─ components/          공통 UI
├─ lib/                 파일 검증·변환·통계 보조 함수
└─ tools/               이미지 압축, HEIC, HWP, PDF 도구
netlify/
├─ functions/           통계 수집 API·신규 방문 알림·시간별·일일 Discord 보고
└─ lib/                 서버 전용 검증·저장 계층
.github/
├─ workflows/           CI 자동 검사
├─ CODEOWNERS            중요 파일 소유자
└─ dependabot.yml       의존성 업데이트 자동화
```

## 품질과 보안 자동화

모든 `main` 푸시와 Pull Request에서 다음 검사를 실행합니다.

1. lockfile 기반 `npm ci`
2. TypeScript 및 프로덕션 빌드
3. high 이상 공개 취약점 차단

GitHub Actions는 공식 액션도 변경 불가능한 커밋 SHA로 고정하며, 워크플로 토큰은 읽기 권한만 사용합니다. npm 및 GitHub Actions 업데이트는 Dependabot이 정기적으로 제안합니다.

취약점을 발견했다면 공개 Issue 대신 [SECURITY.md](SECURITY.md)의 비공개 제보 절차를 이용해 주세요.

## 배포

Vercel, Netlify 또는 Cloudflare Pages에서 저장소를 연결한 뒤 정적 사이트로 배포할 수 있습니다. 수익화할 배포 서비스의 무료 플랜이 상업적 사용을 허용하는지는 별도로 확인해야 합니다.

- Build command: `npm run build:production`
- Output directory: `dist`
- Node.js: 22.x

배포 환경 변수:

- `VITE_SITE_URL`: 실제 공개 주소. 설정하면 canonical URL, `sitemap.xml`, `robots.txt`가 배포 주소에 맞게 생성됩니다.
- `VITE_CONTACT_EMAIL`: 공식 문의 이메일. 프로덕션 배포에서는 반드시 설정해야 합니다.
- `ANALYTICS_HASH_SECRET`: 32자 이상의 서버 전용 무작위 문자열. 원본 IP를 당일용 식별값으로 변환하는 데 사용합니다.
- `DISCORD_WEBHOOK_URL`: 방문·도구 사용 알림과 일일 합계를 받을 비공개 Discord 채널의 웹후크 URL. 저장소나 클라이언트 코드에 넣지 않습니다.

방문 알림은 페이지 방문마다, 도구 알림은 변환 시작·성공·실패마다 전송하며, IP는 뒤쪽 구간을 마스킹하고 Discord 스포일러로 감춥니다. 시간별 보고 함수는 최근 1시간의 익명 집계를 매시 정각에 전송하고, 일일 보고 함수는 한국 시간 오전 12시 10분에 전날 통계를 전송합니다. 자체 통계는 브라우저에 쿠키를 저장하지 않으며 Global Privacy Control과 추적 거부 신호를 존중합니다.

### Discord 운영 봇

Discord Developer Portal에서 애플리케이션을 만든 뒤 공개 키(`DISCORD_PUBLIC_KEY`), 애플리케이션 ID(`DISCORD_APPLICATION_ID`), 서버 ID(`DISCORD_GUILD_ID`), 운영자 사용자 ID(`DISCORD_ADMIN_USER_IDS`)를 설정합니다. Discord의 Interactions Endpoint URL은 `https://file-repair-shop-kr.netlify.app/api/discord/interactions`로 지정합니다. 봇 초대 시 `bot`과 `applications.commands` 범위만 사용하세요.

명령어 등록은 봇 토큰을 로컬 환경변수로만 넣고 다음을 실행합니다. 토큰은 Netlify에 저장하거나 채팅·저장소에 붙여 넣지 않습니다.

```powershell
$env:DISCORD_APPLICATION_ID='...'
$env:DISCORD_GUILD_ID='...'
$env:DISCORD_BOT_TOKEN='...'
npm run discord:register
```

등록되는 운영자 전용 명령어는 `/stats`, `/status`, `/errors`입니다. 상호작용 엔드포인트는 Discord 서명과 재전송 시간을 검증하고, 서버 ID와 운영자 ID가 일치할 때만 통계를 응답합니다.

`vercel.json`은 SPA 라우팅과 프로덕션 보안 헤더를 함께 관리합니다.

최초 공개와 배포 후 확인 절차는 [배포 체크리스트](docs/DEPLOYMENT_CHECKLIST.md)를 따르세요.

## HWP 변환

`HWP 5.0/HWPX → 호환 PDF`는 원본과 동일한 정밀 변환이 아닙니다. HWP 5.0은 `@rhwp/core`의 WebAssembly 렌더러로 페이지를 이미지화하고, HWPX는 일반 본문과 단순 표를 안전한 호환 레이아웃으로 다시 그립니다. HWPX의 이미지, 도형, 수식, 차트, 병합 셀 등 유지할 수 없는 요소는 변환 전에 표시하며 사용자의 명시적 확인 없이는 변환하지 않습니다.

원본과 동일한 PDF가 필요하면 한컴오피스의 `PDF로 저장하기`를 사용해야 합니다. 한컴 공식 SDK/통합문서뷰어와 적법한 서버 라이선스가 준비되기 전에는 정밀 변환이라고 표시하지 않습니다. `PDF → HWP/HWPX`도 정확도를 보장할 수 없어 제공하지 않습니다.

자세한 기술·보안 기준은 [HWP 변환 아키텍처](docs/HWP_CONVERSION.md)를 참고하세요.

## 기여

변경 전 [CONTRIBUTING.md](CONTRIBUTING.md)를 확인해 주세요. 기능 추가 시에도 “사용자 파일을 외부로 전송하지 않는다”는 핵심 보안 원칙을 유지해야 합니다.

## 라이선스

현재 별도 오픈소스 라이선스를 부여하지 않았습니다. 저장소 소유자의 명시적 허가 없이 복제, 배포 또는 상업적으로 사용할 수 없습니다.

서드파티 의존성은 각 라이선스를 따릅니다. HWP 렌더러 `@rhwp/core`는 MIT 라이선스이며 한글과컴퓨터와 제휴·후원·승인 관계가 없는 독립 오픈소스 프로젝트입니다.
