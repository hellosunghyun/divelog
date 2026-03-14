# AGENTS.md — divelog.ada-kr-pos.com

## 언어

이 프로젝트의 모든 UI 텍스트, 에러 메시지, 빈 상태 안내, CTA, seed 데이터, 커밋 메시지 설명은 **한국어**를 사용한다. 코드(변수명, 함수명, 타입명)는 영어.

---

## 제품 개요

ADA Learner의 아홉 달을 **Journey-first reflective archive**로 구현하는 웹 애플리케이션. 최신 피드가 아니라 여정의 구조가 먼저 보이고, 댓글 대신 Dialogue Layer(공명/질문/연결/제안/자기답변)를 사용한다. 좋아요·추천·인기순·랭킹은 **절대 만들지 않는다**.

---

## 기술 스택

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | React Router 7 (Vite) | `@react-router/cloudflare`, flat routes, type-safe |
| Hosting | Cloudflare Pages | Pages Functions (edge runtime) |
| Database | Cloudflare D1 | SQLite, STRICT tables, `unixepoch()` |
| ORM | Drizzle ORM | `drizzle-orm/d1`, schema-first migrations |
| Auth | `@adakrpos/auth` | 외부 인증 (ada-kr-pos.com), `@adakrpos/auth/generic` 진입점만 사용 |
| Sessions | `adakrpos_session` 쿠키 | `.ada-kr-pos.com` 도메인, 7일 TTL, 자동 갱신 |
| CSS | Tailwind CSS v4 | Quiet Depth 디자인 토큰 |
| Validation | Zod | 폼 검증, loader/action 입력 검증 |
| Storage | Cloudflare R2 | Phase 2 (현재 미사용) |
| Queues | Cloudflare Queues | 알림, 모더레이션 비동기 처리 |
| Package Manager | pnpm | |

### 사용하지 않는 것
- ❌ KV 바인딩 (제거됨)
- ❌ Better Auth (완전 제거)
- ❌ `@adakrpos/auth/hono`, `@adakrpos/auth/express` (generic만)
- ❌ Rich text 에디터 (textarea + markdown preview만)
- ❌ Node.js 전용 API (edge runtime 호환 필수)

---

## 프로젝트 구조

```
app/
├── routes/
│   ├── _public.tsx                    → Public 레이아웃 (verifyRequest 1회)
│   ├── _public._index.tsx             → / (홈)
│   ├── _public.journey.tsx            → /journey
│   ├── _public.journey.$stageSlug.tsx → /journey/:stageSlug
│   ├── _public.logs._index.tsx        → /logs
│   ├── _public.logs.$recordSlug.tsx   → /logs/:recordSlug
│   ├── _public.write.tsx              → /write (requireVerified)
│   ├── _public.learners.*             → /learners
│   ├── _public.challenges.*           → /challenges
│   ├── _public.groups.$groupSlug.tsx  → /groups/:groupSlug
│   ├── _public.memories.$stageSlug.tsx→ /memories/:stageSlug
│   ├── _public.search.tsx             → /search
│   ├── _public.inbox.tsx              → /inbox (requireAuth)
│   ├── _public.me.tsx                 → /me (requireAuth)
│   ├── _public.settings.tsx           → /settings (requireAuth)
│   ├── _public.guide.tsx              → /guide
│   ├── _admin.tsx                     → Admin 레이아웃 (requireRole)
│   └── _admin.admin.*                 → /admin/* (22개 페이지)
├── components/
│   ├── GlobalNav.tsx
│   ├── Footer.tsx
│   ├── SceneCard.tsx
│   ├── QuestionCard.tsx
│   ├── ResponseCard.tsx
│   ├── LearnerCard.tsx
│   ├── CollaborationUnitCard.tsx
│   ├── HighlightedSentenceCard.tsx
│   ├── HeroSection.tsx
│   ├── StageStrip.tsx
│   ├── CTABand.tsx
│   ├── FilterBar.tsx
│   ├── SortBar.tsx
│   ├── EmptyState.tsx
│   ├── LoadingSkeleton.tsx
│   ├── ErrorState.tsx
│   └── admin/
│       ├── AdminSidebar.tsx
│       └── AdminContextBar.tsx
├── db/
│   ├── schema.server.ts        → Drizzle 스키마 (20+ 테이블, cohort 지원)
│   ├── relations.server.ts     → Drizzle relations
│   ├── client.server.ts        → Drizzle 클라이언트 팩토리
│   └── queries/                → 도메인별 쿼리 모듈 (12+)
│       ├── stages.server.ts
│       ├── records.server.ts
│       ├── questions.server.ts
│       ├── responses.server.ts
│       ├── sentences.server.ts
│       ├── learners.server.ts
│       ├── challenges.server.ts
│       ├── collaboration.server.ts
│       ├── memories.server.ts
│       ├── notifications.server.ts
│       ├── search.server.ts
│       └── admin/
├── lib/
│   ├── auth.server.ts          → getAuth (WeakMap 캐시, 요청당 1회)
│   ├── auth.middleware.ts      → requireAuth, requireVerified, requireRole, getOptionalUser
│   └── validation.ts           → Zod 스키마
└── styles/
    ├── tokens.css              → CSS custom properties
    └── global.css              → 리셋, 타이포, focus ring

drizzle/migrations/             → D1 마이그레이션 파일
seeds/seed.sql                  → 한국어 seed data
wrangler.toml                   → D1, R2, Queues 바인딩 (KV 없음)
.dev.vars                       → ADAKRPOS_API_KEY, ADMIN_USER_ID, TEST_*_SESSION
```

---

## 인증 아키텍처

자체 로그인/회원가입 UI 없음. 모든 인증은 `ada-kr-pos.com` 외부 위임.

```
사용자 → divelog.ada-kr-pos.com
  ↓ 브라우저: adakrpos_session 쿠키 자동 전달
서버: getAuth(request, apiKey) → WeakMap 캐시 → verifyRequest 1회
  ↓
인증됨 → 정상 진행 + learner_profiles upsert
미인증 + 보호 페이지 → ada-kr-pos.com/login?returnUrl= 리다이렉트
```

### 미들웨어 계층
| 함수 | 용도 | 사용처 |
|------|------|--------|
| `getOptionalUser` | 선택적 사용자 조회 | 모든 Public 페이지 |
| `requireAuth` | 인증 필수 | /inbox, /me, /settings |
| `requireVerified` | isVerified=true 필수 | /write, 응답 작성 action |
| `requireRole` | 역할 필수 | Admin 전체 |

### 핵심 규칙
- `verifyRequest`는 요청당 **1회만** 호출 (WeakMap 캐시)
- `ADAKRPOS_API_KEY`는 서버에서만 사용, 클라이언트 노출 금지
- `@adakrpos/auth/generic` 진입점만 사용 (hono/express 금지)
- `learner_profiles`는 첫 인증 시 자동 생성 (display_name, profile_photo_url, cohort 캐시)

---

## 데이터 로딩 패턴

```typescript
// 레이아웃 로더 (_public.tsx) — 1회만 인증 + learner_profiles upsert
export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getAuth(request, context.cloudflare.env.ADAKRPOS_API_KEY);
  if (auth.isAuthenticated) {
    await upsertLearnerProfile(context.cloudflare.env.DB, auth.user);
  }
  return { auth };
}

// 페이지 로더 — getAuth 재호출 (WeakMap 캐시, API 중복 호출 없음)
export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getAuth(request, context.cloudflare.env.ADAKRPOS_API_KEY);
  const database = db(context.cloudflare.env.DB);
  // Drizzle 쿼리...
  return { data };
}

// 클라이언트에서 레이아웃 auth 접근
const parentData = useRouteLoaderData("_public");
```

---

## 설계 문서 참조 가이드

`.docs/` 디렉토리에 10개의 설계 문서가 있다. 작업 유형별로 참조해야 할 문서:

### `.docs/prd.md` — 제품 요구사항
**참조 시점**: 제품 철학, 비목표, 성공 상태, 디자인 방향을 확인할 때
- 제품 정의와 원칙 (Journey-first, Quiet Depth, Dialogue over Comments)
- Must NOT have (좋아요, 인기순, 말풍선, 해양 일러스트 등)
- 디자인 요구사항 (Quiet Depth, 접근성 기준)
- 성공 지표 (건강도 중심, 경쟁 지표 배제)

### `.docs/frd.md` — 기능 요구사항
**참조 시점**: 페이지/기능 구현 시 세부 요구사항 확인
- FR-001~FR-033: 모든 기능의 상세 요구사항과 수용 기준
- 사용자 역할 7개 (Learner, Mentor, Operator, Curator, Moderator, Admin, Public Reader)
- 핵심 객체 정의 (Stage, Record, Left Question, Response, Collaboration Unit 등)
- 기록 필드 (format, type, rhythm, visibility)
- Dialogue Layer (응답 유형 5종: 공명/질문/연결/제안/자기답변)
- Admin 기능 요구사항 (FR-020~FR-033)

### `.docs/auth.md` — 인증 연동 가이드
**참조 시점**: 인증 관련 코드 작성 시 **반드시** 참조
- SDK 설치 및 진입점 (`@adakrpos/auth/generic`)
- `verifyRequest` 패턴 (CF Workers용)
- `AdakrposUser`, `AdakrposSession`, `AuthContext` 타입 정의
- HTTP API 엔드포인트 (verify-session, users/:id, verify-key)
- 에러 코드 (401, 403, 404, 429)
- 세션 쿠키 규약 (adakrpos_session, `.ada-kr-pos.com` 도메인)

### `.docs/frontend.md` — 프론트엔드 설계
**참조 시점**: UI 컴포넌트 구현, 레이아웃, 스타일 작업 시
- 기술 기준 (TypeScript strict, Tailwind, 접근성)
- 공통 컴포넌트 사양 (GlobalNav, SceneCard, QuestionCard, ResponseCard 등)
- 화면별 기본 구조 (홈, 여정, Stage, 기록 등)
- 스타일 토큰 (색상, 반경, 그림자, 타이포)
- 상태 처리 원칙 (빈 상태, 로딩, 에러)
- 접근성 요구사항 (16px↑, 44px↑ 타겟, focus ring, reduced motion)
- ⚠️ 기술 기준에 "Next.js App Router" 언급이 있으나, 실제로는 **React Router 7** 사용. 해당 부분은 무시.

### `.docs/wireframe.md` — 와이어프레임 명세
**참조 시점**: 화면 레이아웃 구현 시 구조 확인
- Public 17개 화면 + Admin 22개 화면의 구조, 섹션, 와이어프레임
- 공통 레이아웃 규칙 (Public Shell, Admin Shell)
- 상태별 표시 (빈 상태, 에러, 로딩)
- 반응형 원칙 (모바일 1열, 태블릿 1~2열, 데스크톱 2~3열)

### `.docs/sitemap.md` — 사이트맵
**참조 시점**: 라우트 구조, URL 설계 확인 시
- Public 영역 URL 구조와 각 페이지 하위 구성
- Admin 영역 URL 구조와 관리 화면 목록

### `.docs/user-flow.md` — 사용자 플로우
**참조 시점**: 인터랙션 흐름, 상태 전이 구현 시
- 25개 사용자 플로우 (첫 방문, 기록 작성, 질문, 응답, 자기답변, 검색 등)
- 시작 조건 → 흐름 → 기대 결과
- 협업 없는 상태 / 있는 상태 플로우
- 운영자 플로우 (Stage 변경, 큐레이션, moderation, Collective Memory 발행)

### `.docs/admin.md` — 어드민 설계
**참조 시점**: Admin 페이지 구현 시
- Admin 역할 6개 (Admin, Operator, Curator, Moderator, Mentor Viewer, Analytics Viewer)
- Admin 정보 구조 (사이드바 14개 메뉴)
- 각 관리 화면 상세 사양 (Dashboard, Stage, Challenge, Learner, Records, Dialogue, Collaboration, Curation, Memory, Templates, Analytics, Settings, Roles, Audit)
- Admin 디자인 원칙 (utilitarian, dense, neutral, 해저 감성 제거)

### `.docs/operational-principles.md` — 운영 원칙
**참조 시점**: UI 문구 작성, CTA 톤, 안내 메시지 작성 시
- 핵심 원칙 (평가 대신 질문, 비교 대신 연결, 조언보다 공명)
- 운영 문장 원칙 (허가형 문구: "완성된 글이 아니어도 괜찮습니다")
- 권장/지양 표현 목록
- 모더레이션 허용/불허 기준
- 알림 원칙 (맥락 중심, 과도한 실시간성 피함)

### `.docs/glossary.md` — 용어집
**참조 시점**: 도메인 용어, 필드명, 상태값 확인 시
- 47개 용어 정의 (Stage, Record, Note, Article, Rhythm, Left Question, Response 등)
- 응답 유형 (Resonance, Question Response, Connection, Suggestion, Self-answer)
- 협업 상태 (Forming, Active, Restructured, Archived)
- Visibility (Draft, Cohort, Public)

---

## 핵심 제약사항 (Guardrails)

### 절대 만들지 않는 것
- 좋아요, 추천, 싫어요, 인기순 정렬, 베스트 댓글
- 말풍선/채팅 버블 (editorial card만)
- 해양 일러스트, 물고기 아이콘 (해저 감성은 배경/깊이감/톤에만)
- Daily를 고정 카테고리로
- Crew를 글로벌 네비에
- leaderboard, 개인 비교 차트, 상위 작성자 랭킹
- 숫자 차트 기반 Check-in (서술형만)
- 자체 로그인/회원가입 UI
- Rich text 에디터 (textarea + markdown preview만)
- 이미지 업로드 (Phase 1)
- 자동 저장
- Settings에서 name/bio 편집 (ada-kr-pos.com에서 관리)
- cohorts 관리 UI / cohorts 테이블

### 코드 품질
- `as any`, `@ts-ignore`, `@ts-expect-error` 금지
- 빈 catch 블록 금지
- JSON 배열로 M:N 관계 저장 금지 (junction table 사용)
- 글로벌 DB 인스턴스 금지 (매 요청마다 바인딩에서 생성)
- N+1 쿼리 금지 (batch 또는 JOIN)

---

## 빌드 & 개발 명령어

```bash
pnpm dev                                    # 로컬 개발 서버
npx react-router build                      # 프로덕션 빌드
tsc --noEmit                                # 타입 체크
wrangler pages dev ./build/client --d1 DB   # Cloudflare 로컬 서버
wrangler d1 migrations apply DB --local     # 마이그레이션 적용
wrangler d1 execute DB --local --file=seeds/seed.sql  # 시드 데이터
```

---

## 작업 계획

전체 실행 계획은 `.sisyphus/plans/divelog-fullbuild.md`에 있다. 8개 Wave, 48개 태스크 + 4개 최종 검증.
