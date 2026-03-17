# Divelog

ADA Learner의 아홉 달을 기록하는 **Journey-first reflective archive** 웹 애플리케이션.

최신 피드가 아니라 여정의 구조가 먼저 보이고, 댓글 대신 Dialogue Layer(공명 / 질문 / 연결 / 제안 / 자기답변)를 사용한다.

> **divelog.ada-kr-pos.com**

---

## 기술 스택

| Layer | Technology |
|-------|-----------|
| Framework | React Router 7 (Vite) |
| Hosting | Cloudflare Pages |
| Database | Cloudflare D1 (SQLite) |
| ORM | Drizzle ORM |
| Auth | `@adakrpos/auth` (외부 위임) |
| CSS | Tailwind CSS v4 |
| Validation | Zod |
| Storage | Cloudflare R2 |
| Queues | Cloudflare Queues |
| Package Manager | pnpm |

---

## 시작하기

```bash
# 의존성 설치
pnpm install

# 로컬 개발 서버
pnpm dev

# 타입 체크
pnpm typecheck

# 테스트
pnpm test

# 프로덕션 빌드
pnpm build

# 배포
pnpm deploy
```

### D1 로컬 설정

```bash
# 마이그레이션 적용
wrangler d1 migrations apply DB --local

# 시드 데이터
wrangler d1 execute DB --local --file=seeds/seed.sql
```

---

## 프로젝트 구조

```
app/
├── routes/          # React Router flat routes
│   ├── _public.tsx  # Public 레이아웃 (인증 1회)
│   ├── _admin.tsx   # Admin 레이아웃 (역할 검증)
│   ├── public/      # 공개 페이지
│   ├── admin/       # 관리자 페이지
│   └── api/         # API 엔드포인트
├── components/      # 공통 컴포넌트
├── db/
│   ├── schema.server.ts     # Drizzle 스키마
│   ├── relations.server.ts  # Drizzle relations
│   ├── client.server.ts     # DB 클라이언트 팩토리
│   └── queries/             # 도메인별 쿼리 모듈
├── lib/             # 인증, 미들웨어, 유틸리티
└── styles/          # CSS 토큰, 글로벌 스타일

drizzle/migrations/  # D1 마이그레이션
seeds/               # 시드 데이터
workers/             # Cloudflare Workers 진입점
```

---

## 설계 문서

상세 설계 문서는 `.docs/` 디렉토리 참조.

| 문서 | 내용 |
|------|------|
| [prd.md](.docs/prd.md) | 제품 요구사항, 철학, 비목표 |
| [frd.md](.docs/frd.md) | 기능 요구사항 (FR-001~FR-033) |
| [design.md](.docs/design.md) | Quiet Depth 디자인 가이드라인 |
| [frontend.md](.docs/frontend.md) | 프론트엔드 설계, 컴포넌트 사양 |
| [wireframe.md](.docs/wireframe.md) | 와이어프레임 명세 (39개 화면) |
| [auth.md](.docs/auth.md) | 인증 연동 가이드 |
| [admin.md](.docs/admin.md) | 어드민 설계 |
| [sitemap.md](.docs/sitemap.md) | 사이트맵 |
| [user-flow.md](.docs/user-flow.md) | 사용자 플로우 (25개) |
| [operational-principles.md](.docs/operational-principles.md) | 운영 원칙, 카피 톤 |
| [glossary.md](.docs/glossary.md) | 용어집 (47개 용어) |

---

## 환경 변수

`.dev.vars` 파일에 아래 값을 설정한다.

```
ADAKRPOS_API_KEY=   # 인증 API 키
ADMIN_USER_ID=      # 관리자 사용자 ID
```

---

## 라이선스

[MIT License](LICENSE) — Copyright (c) 2025 Sunghyun Kim
