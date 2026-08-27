# Cloudflare Pages API 보호 설정

Cloudflare Pages Functions는 Worker Rate Limiting binding을 직접 지원하지 않습니다. 애플리케이션은 IP별 KV 기반 제한으로 순차적 남용을 줄이지만, 전역·분산 공격 방어는 Cloudflare WAF 규칙을 함께 적용해야 합니다.

프로덕션 custom domain이 연결된 Cloudflare zone에서 다음 rate limiting rule을 만듭니다.

- 이름: `analytics-ingest-per-ip`
- 일치 조건: `http.request.uri.path eq "/api/analytics" and http.request.method eq "POST"`
- 카운팅 특성: IP
- 제한: 60 requests / 60 seconds
- 완화 시간: 60 seconds
- 동작: `Block`

Discord 상호작용 endpoint에도 별도 규칙을 적용합니다.

- 이름: `discord-interactions-per-ip`
- 일치 조건: `http.request.uri.path eq "/api/discord/interactions" and http.request.method eq "POST"`
- 카운팅 특성: IP
- 제한: 120 requests / 60 seconds
- 완화 시간: 60 seconds
- 동작: `Block`

규칙은 Cloudflare 대시보드의 **Security rules → Create rule → Rate limiting rules**에서 만들 수 있습니다. Pages의 기본 `pages.dev` 주소에는 zone 규칙을 직접 적용할 수 없으므로, 운영 환경에는 Cloudflare가 관리하는 custom domain을 사용합니다. 배포 후에는 동일 IP에서 상한을 넘는 요청이 429 또는 challenge가 되는지 확인합니다.
