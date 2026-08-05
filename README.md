# 파일뚝딱

[![CI](https://github.com/7yvexon/toolbox-kr/actions/workflows/ci.yml/badge.svg)](https://github.com/7yvexon/toolbox-kr/actions/workflows/ci.yml)

설치와 회원가입 없이 사용하는 한국형 이미지·PDF 도구 모음입니다. 선택한 파일은 서버로 업로드하지 않고 사용자의 브라우저 안에서만 처리합니다.

> 현재 단계: `0.1.0` MVP · 저장소는 비공개로 운영 중

## 주요 기능

| 도구 | 입력 | 출력 | 제한 |
| --- | --- | --- | --- |
| 이미지 용량 줄이기 | JPG, PNG, WEBP | JPG, PNG, WEBP | 파일당 30MB, 4천만 픽셀 |
| HEIC → JPG | HEIC, HEIF | JPG | 파일당 30MB |
| 사진 → PDF | JPG, PNG, WEBP | PDF | 최대 30장, 전체 120MB |

파일 확장자만 신뢰하지 않고 실제 파일 헤더, MIME 형식, 크기와 이미지 해상도를 처리 전에 확인합니다.

## 개인정보 보호 설계

- 변환은 브라우저 메모리에서만 실행합니다.
- 런타임 코드에는 파일 업로드 API, 분석 SDK, 광고 SDK가 없습니다.
- 미리보기와 결과는 임시 Blob URL을 사용하며 사용이 끝나면 해제합니다.
- 생성된 결과는 브라우저 다운로드 기능으로 사용자 기기에 직접 저장합니다.
- 배포 환경에는 CSP, 클릭재킹 방지, MIME 스니핑 방지 등 보안 헤더를 적용합니다.

브라우저 개발자 도구의 Network 탭에서 변환 중 파일 전송 요청이 발생하지 않는지 직접 확인할 수 있습니다.

## 기술 구성

- React 19 + TypeScript
- Vite 7
- `heic2any` — HEIC/HEIF 디코딩
- `pdf-lib` — 브라우저 PDF 생성
- Vercel 정적 배포 설정

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
| `npm run build` | 프로덕션 번들 생성 |
| `npm run preview` | 프로덕션 번들 로컬 확인 |
| `npm run security:audit` | high 이상 npm 취약점 검사 |
| `npm run check` | 빌드와 보안 감사를 한 번에 실행 |

## 프로젝트 구조

```text
src/
├─ components/          공통 UI
├─ lib/                 파일 검증·변환 보조 함수
└─ tools/               이미지 압축, HEIC, PDF 도구
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

Vercel에서 저장소를 연결한 뒤 기본 Vite 설정으로 배포할 수 있습니다.

- Build command: `npm run build`
- Output directory: `dist`
- Node.js: 22.x

`vercel.json`은 SPA 라우팅과 프로덕션 보안 헤더를 함께 관리합니다.

## 기여

변경 전 [CONTRIBUTING.md](CONTRIBUTING.md)를 확인해 주세요. 기능 추가 시에도 “사용자 파일을 외부로 전송하지 않는다”는 핵심 보안 원칙을 유지해야 합니다.

## 라이선스

현재 별도 오픈소스 라이선스를 부여하지 않았습니다. 저장소 소유자의 명시적 허가 없이 복제, 배포 또는 상업적으로 사용할 수 없습니다.
