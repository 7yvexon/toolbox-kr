# 배포 체크리스트

파일정비소는 Cloudflare Pages에 배포하는 정적 사이트이며, 선택한 파일은 브라우저 안에서 처리합니다. `/api/*` 경로는 저장소의 `functions/`(Pages Functions)가 처리하고 통계 원본은 Workers KV에 보관합니다.

## 1. 배포 환경 변수와 바인딩

Cloudflare 대시보드의 Pages 프로젝트 → **Settings → Variables and Secrets**(Production)에 다음 값을 등록합니다.

- `VITE_SITE_URL`: `https://`로 시작하는 실제 공개 주소. 마지막 `/`는 생략합니다.
- `VITE_CONTACT_EMAIL`: 공개 문의 이메일 주소.
- `ANALYTICS_HASH_SECRET`: 32자 이상의 서버 전용 무작위 문자열.
- `DISCORD_WEBHOOK_URL`: 방문·도구 사용 알림을 받을 비공개 Discord 채널의 웹후크 URL.
- `DISCORD_PUBLIC_KEY`, `DISCORD_GUILD_ID`, `DISCORD_ADMIN_USER_IDS`: Discord 운영 봇용 값.

KV namespace `ANALYTICS_KV`는 `wrangler.jsonc`의 `kv_namespaces`에 선언되어 있습니다. 대시보드 바인딩과 어긋나면 `npx wrangler pages download config file-repair-shop-kr`로 실제 설정을 받아 비교합니다. `ANALYTICS_HASH_SECRET`이 없거나 32자보다 짧으면 통계 API는 오류 없이 204를 반환하고 아무것도 저장하지 않으므로, 배포 후 아래 2번으로 반드시 확인합니다.

빌드 명령은 `npm run build:production`, 결과 디렉터리는 `dist`(`wrangler.jsonc`의 `pages_build_output_dir`), Node.js 버전은 22입니다. 예시 주소나 잘못된 이메일이 남아 있으면 프로덕션 빌드는 실패합니다.

## 2. 배포 직후 확인

- 응답 헤더 CSP에 `pagead2.googlesyndication.com`이 포함되는지 확인합니다(`curl -sI https://<주소>/`). 광고 출처가 없는 옛 CSP가 보이면 이전 배포가 그대로 살아 있는 것입니다.
- `/api/hourly-alert`가 `{"enabled":true}` 또는 `{"enabled":false}` JSON을 반환하는지 확인합니다. HTML이나 404가 오면 Functions가 배포되지 않은 것입니다.
- `/hwp-to-pdf`에서 1페이지짜리 HWP를 실제로 변환해 결과 PDF를 열어 봅니다.
- `/sitemap.xml`의 `lastmod`가 이번 배포 날짜인지 확인합니다.
- `npm run check:dist`가 로컬에서 통과하는지 확인합니다. Cloudflare Pages는 파일 하나가 25 MiB(26,214,400바이트)를 넘거나 배포 파일이 20,000개를 넘으면 배포 전체를 거부합니다.

## 3. 최초 배포 확인

- 홈과 모든 도구·정책 주소를 새로고침해도 404가 발생하지 않는지 확인합니다.
- HWP/HWPX, PDF, JPG/PNG/WEBP, HEIC 샘플을 각각 한 번 변환하고 다운로드 파일을 직접 엽니다.
- 모바일 브라우저에서 파일 선택, 변환 취소, 결과 다운로드를 확인합니다.
- 개발자 도구의 Network 탭에서 변환 중 원본 파일 전송 요청이 없는지 확인합니다.
- 응답 헤더에 CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`가 적용되는지 확인합니다.
- `/robots.txt`와 `/sitemap.xml`에 실제 공개 주소가 들어갔는지 확인합니다.
- API 남용 대응은 [Cloudflare WAF 설정](CLOUDFLARE_WAF_SETUP.md)의 rate limiting 규칙을 함께 적용합니다.

## 4. 검색 노출

공개 주소가 확정되면 Google Search Console과 네이버 서치어드바이저에 사이트를 등록하고 `/sitemap.xml`을 제출합니다. 도메인을 변경하면 `VITE_SITE_URL`을 갱신한 뒤 다시 배포합니다.

## 5. 광고를 추가하기 전

Google AdSense 승인을 받은 뒤에만 다음 작업을 진행합니다.

- 발급받은 게시자 ID로 루트의 `ads.txt`를 생성합니다. 예시 또는 빈 게시자 ID는 배포하지 않습니다.
- 개인정보처리방침에 광고 사업자, 쿠키·기기 식별자, 처리 목적과 거부 방법을 실제 구성에 맞게 반영합니다.
- 광고가 필요한 외부 도메인만 `public/_headers`의 CSP에 추가하고, 제3자 요청이 파일 데이터에 접근하지 못하도록 도구 화면과 광고 영역을 분리합니다.
- 적용 대상 방문자에게 필요한 동의 관리 화면을 구성하고 광고 로드 전후를 테스트합니다.

## 6. 배포 후 변경

기능과 디자인은 GitHub 브랜치에 커밋해 다시 배포할 수 있습니다. `main`에 병합하면 GitHub Actions CI가 `npm ci`, 테스트, 프로덕션 빌드, 배포 크기 검사, 취약점 감사를 실행하고, Cloudflare Pages가 `main`을 자동으로 배포합니다. 파일 제한, 지원 형식, 개인정보 처리 방식, 광고 또는 결제 기능이 달라지면 이용약관과 개인정보처리방침도 같은 배포에서 갱신합니다.
