# divelog.ada-kr-pos.com 풀빌드 플랜 — React Router 7 + Cloudflare + @adakrpos/auth

## TL;DR

> **Quick Summary**: divelog.ada-kr-pos.com — Journey-first reflective archive for ADA Learners. React Router 7 + Cloudflare Pages + D1 + Drizzle ORM + **@adakrpos/auth** (외부 인증) + R2 + Queues 풀스택으로 39개 라우트(Public 17 + Admin 22) + 2개 레이아웃 구현. Better Auth 자체 인증 → ada-kr-pos.com 외부 인증으로 전환.
>
> **Deliverables**:
> - Public 17개 페이지 (홈, 여정, Stage, 기록, 작성, Learner, Challenge, Groups, Memory, 검색, 인박스, 내 공간, 설정, 가이드)
> - Admin 14개 관리 화면 (Dashboard, Stage, Challenge, Learner, Records, Dialogue, Collaboration, Curation, Memory 편집, Templates, Analytics, Settings, Roles, Audit)
> - 인증 (@adakrpos/auth: 외부 로그인, 세션 쿠키, SDK 검증)
> - D1 데이터베이스 (Drizzle ORM 스키마, 마이그레이션, 한국어 seed data)
> - Cloudflare 인프라 (R2 스토리지, Queues 비동기 처리)
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES — 8 Waves
> **Critical Path**: T1 → T3 → T4 → T5 → T6 → T17 → T45 → F1

---

## Context

### Original Request
divelog 전체 빌드. 9개 문서(.docs/) 기반, 39개 페이지 라우트 + 2개 레이아웃 = 41개 라우트 파일, 모든 내용 빠짐 없이.
**기획 변경**: Better Auth → `@adakrpos/auth` SDK (ada-kr-pos.com 외부 인증). 도메인: `divelog.ada-kr-pos.com`.

### Interview Summary
**Key Decisions**:
- Framework: React Router 7 (Vite) — `@react-router/cloudflare`, type-safe routes
- Database: Cloudflare D1 + Drizzle ORM — 실제 SQL DB, STRICT tables, unixepoch()
- **Auth: @adakrpos/auth SDK — ada-kr-pos.com 외부 인증, adakrpos_session 쿠키**
- **도메인: divelog.ada-kr-pos.com (`.ada-kr-pos.com` 서브도메인 → 세션 쿠키 자동 전달)**
- **프로필: AdakrposUser에서 name, bio, profilePhotoUrl 직접 사용. learner_profiles는 divelog 전용 필드만**
- **코호트: AdakrposUser.cohort 활용, 다중 코호트 대비 스키마**
- **isVerified: Verified 사용자만 기록 작성/응답 가능. 미인증은 읽기만**
- **KV: 제거 (auth 세션이 외부로 이동)**
- **Admin: ADMIN_USER_ID 환경변수로 자동 역할 부여**
- Storage: Cloudflare R2 (오브젝트 스토리지, Phase 2 활용)
- Queues: Cloudflare Queues (알림, 모더레이션 비동기 처리)
- UI 언어: 한국어

### Metis Review
**Identified Gaps** (addressed):
- N+1 사용자 조회 문제 → learner_profiles에 display_name, profile_photo_url 캐시 미러링 (auth 레이아웃 로더에서 upsert)
- 레이아웃+페이지 로더 이중 검증 → `_public.tsx` 레이아웃 로더에서 1회만 verifyRequest 호출, context로 전달
- learner_profiles 자동 프로비저닝 → 첫 인증 요청 시 자동 생성 (slug = nickname 기반 + 충돌 시 접미사)
- Ada-kr-pos.com 로그인 후 returnUrl → `?returnUrl=` 파라미터 사용 가정
- Admin QA 시나리오 → Playwright 쿠키 주입 방식으로 변경
- AdakrposUser.cohort = null → Public 데이터만 읽기 허용, 쓰기 차단
- Settings 페이지 → divelog 전용 설정만 (name/bio 편집 불가, ada-kr-pos.com에서 관리)
- SDK 장애/429 → 503 + 재시도 메시지 (리다이렉트 아님)

---

## Work Objectives

### Core Objective
divelog.ada-kr-pos.com을 React Router 7 + Cloudflare 풀스택으로 39개 페이지 라우트 + 2개 레이아웃 전체 구현. @adakrpos/auth 외부 인증, D1 데이터베이스, R2/Queues 인프라 포함.

### Concrete Deliverables
- `app/routes/` — 41개 라우트 파일 (Public 17 + Admin 22 + 레이아웃 2, 자체 Auth 페이지 없음)
- `app/components/` — 공유 컴포넌트 라이브러리
- `app/db/schema.server.ts` — Drizzle ORM 전체 도메인 스키마 (cohort 지원)
- `app/db/` — data access layer (repository pattern)
- `drizzle/migrations/` — D1 마이그레이션 파일
- `seeds/` — 한국어 seed data SQL
- `wrangler.toml` — D1, R2, Queues 바인딩 (KV 제거)
- `app/lib/auth.server.ts` — @adakrpos/auth 설정 + requireAuth/requireVerified/requireRole 미들웨어

### Definition of Done
- [ ] `npx react-router build` 성공 (프로덕션 빌드)
- [ ] `tsc --noEmit` 타입 에러 0
- [ ] 모든 라우트 접근 가능 (Playwright 검증)
- [ ] D1 seed data로 실제 데이터 표시
- [ ] @adakrpos/auth 세션 검증 동작 (adakrpos_session 쿠키 기반)
- [ ] Verified 사용자만 쓰기 동작 확인

### Must Have
- 39개 페이지 라우트 전부 (Public 17 + Admin 22) + 2개 레이아웃 (자체 Auth 페이지 없음)
- @adakrpos/auth SDK 기반 인증 (세션 쿠키 자동 전달, API Key 검증)
- **미인증 사용자 → `https://ada-kr-pos.com/login?returnUrl=` 리다이렉트**
- **Verified 사용자만 쓰기 작업 가능 (requireVerified 미들웨어)**
- **learner_profiles 자동 프로비저닝 (첫 인증 시 생성)**
- **다중 코호트 대비 스키마 (cohort_id 컬럼)**
- **ADMIN_USER_ID 환경변수 기반 Admin 자동 부트스트랩**
- Dialogue Layer (공명/질문/연결/제안/자기답변) — editorial card 형태
- Journey-first 구조 (Stage가 최상위 탐색 단위)
- Quiet Depth 디자인 톤
- 3가지 상태 처리 (빈 상태/로딩/에러) — 모든 페이지
- 반응형: 모바일 375px / 태블릿 768px / 데스크톱 1440px
- 접근성: 16px↑ 본문, 44px↑ 터치 타겟, focus ring, reduced motion
- 한국어 UI 문구 전체 (에러 메시지, 빈 상태, CTA 포함)
- 협업 없는 상태도 자연스럽게 동작
- URL search params 기반 필터링
- 허가형 CTA 문구 ("완성된 글이 아니어도 괜찮습니다")

### Must NOT Have (Guardrails)
- ❌ 자체 로그인/회원가입 UI (ada-kr-pos.com 외부만)
- ❌ 로컬 user/session/account/verification 테이블 (Better Auth 잔재)
- ❌ KV 바인딩 (제거)
- ❌ Better Auth 패키지/코드/참조
- ❌ `@adakrpos/auth/hono` 또는 `@adakrpos/auth/express` 사용 (generic만 사용)
- ❌ ADAKRPOS_API_KEY 클라이언트 노출
- ❌ 요청당 verifyRequest() 2회 이상 호출
- ❌ Settings 페이지에서 name/bio 편집 (ada-kr-pos.com에서 관리)
- ❌ 코호트 관리 UI 또는 cohorts 테이블 구축
- ❌ 좋아요, 추천, 싫어요, 인기순 정렬, 베스트 댓글
- ❌ 말풍선/채팅 버블 형태 응답 (editorial card만)
- ❌ 해양 일러스트, 물고기 아이콘
- ❌ Daily를 고정 카테고리로
- ❌ Crew를 글로벌 네비에
- ❌ Rich text 에디터 (tiptap, ProseMirror) — textarea + markdown preview만
- ❌ 이미지 업로드 (Phase 1)
- ❌ 자동 저장
- ❌ leaderboard, 개인 비교 차트, 상위 작성자 랭킹
- ❌ 숫자 차트 기반 Check-in (서술형만)
- ❌ JSON 배열로 M:N 관계 저장 (junction table 사용)
- ❌ Node.js 전용 API 사용 (edge runtime 호환 필수)

---

## Auth Architecture (NEW)

### 인증 플로우
```
1. 사용자 → divelog.ada-kr-pos.com 방문
2. 브라우저: adakrpos_session 쿠키 자동 전달 (.ada-kr-pos.com 도메인)
3. 서버: verifyRequest(request, { apiKey }) → AuthContext
4. isAuthenticated=true → 정상 진행
5. isAuthenticated=false + 보호된 페이지 → ada-kr-pos.com/login?returnUrl= 리다이렉트
```

### 미들웨어 계층
```
getOptionalUser(request, context)  → AuthContext | null (모든 페이지)
requireAuth(request, context)      → AuthContext (인증 필수 페이지)
requireVerified(request, context)  → AuthContext (isVerified=true 필수, 쓰기 작업)
requireRole(request, context, role) → AuthContext (역할 필수, Admin)
```

### learner_profiles 자동 프로비저닝
```
인증된 사용자 첫 방문 시:
1. verifyRequest → AdakrposUser 획득
2. learner_profiles에서 user_id로 조회
3. 없으면 → INSERT (user_id, slug, display_name, profile_photo_url, cohort)
4. 있으면 → UPDATE display_name, profile_photo_url (캐시 갱신)
```

### AdakrposUser → learner_profiles 매핑
| AdakrposUser 필드 | learner_profiles 저장 | 용도 |
|---|---|---|
| id | user_id (PK/FK) | 사용자 식별 |
| name \|\| nickname | display_name (캐시) | 목록 카드에서 작성자명 표시 (N+1 방지) |
| profilePhotoUrl | profile_photo_url (캐시) | 아바타 표시 |
| cohort | cohort (캐시) | 코호트 필터링 |
| — | slug (자동생성) | URL /learners/:slug |
| — | current_stage_id | divelog 전용 |
| — | current_question | divelog 전용 |

---

## Tech Stack Reference

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | React Router 7 (Vite) | `@react-router/cloudflare`, type-safe routes |
| Hosting | Cloudflare Pages | Pages Functions for server-side |
| Database | Cloudflare D1 | SQLite dialect, STRICT tables |
| ORM | Drizzle ORM | `drizzle-orm/d1`, schema-first migrations |
| **Auth** | **@adakrpos/auth** | **ada-kr-pos.com 외부 인증, `@adakrpos/auth/generic`** |
| **Sessions** | **adakrpos_session 쿠키** | **`.ada-kr-pos.com` 도메인, 7일 TTL, 자동 갱신** |
| Storage | Cloudflare R2 | 오브젝트 스토리지 (Phase 2 활용) |
| Queues | Cloudflare Queues | 알림, 모더레이션 비동기 처리 |
| CSS | Tailwind CSS v4 | Quiet Depth 디자인 토큰 |
| Validation | Zod | 폼 검증, loader/action 입력 검증 |
| Package Manager | pnpm | |

### Route Convention (React Router 7 Flat Routes) — 39 page routes + 2 layouts = 41 files
```
app/routes/
├── _public.tsx                           → Public 레이아웃 (verifyRequest 1회, AuthContext 전달)
├── _public._index.tsx                    → /
├── _public.journey.tsx                   → /journey
├── _public.journey.$stageSlug.tsx        → /journey/:stageSlug
├── _public.logs._index.tsx               → /logs
├── _public.logs.$recordSlug.tsx          → /logs/:recordSlug
├── _public.write.tsx                     → /write (requireVerified)
├── _public.learners._index.tsx           → /learners
├── _public.learners.$learnerSlug.tsx     → /learners/:learnerSlug
├── _public.challenges._index.tsx         → /challenges
├── _public.challenges.$challengeSlug.tsx → /challenges/:challengeSlug
├── _public.groups.$groupSlug.tsx         → /groups/:groupSlug
├── _public.memories.$stageSlug.tsx       → /memories/:stageSlug
├── _public.search.tsx                    → /search
├── _public.inbox.tsx                     → /inbox (requireAuth)
├── _public.me.tsx                        → /me (requireAuth)
├── _public.settings.tsx                  → /settings (requireAuth)
├── _public.guide.tsx                     → /guide
├── _admin.tsx                            → Admin 레이아웃 (requireRole('admin'))
├── _admin.admin._index.tsx               → /admin
├── _admin.admin.stages._index.tsx        → /admin/stages
├── _admin.admin.stages.$stageId.tsx      → /admin/stages/:stageId
├── _admin.admin.challenges._index.tsx    → /admin/challenges
├── _admin.admin.challenges.$challengeId.tsx
├── _admin.admin.learners._index.tsx      → /admin/learners
├── _admin.admin.learners.$learnerId.tsx
├── _admin.admin.records._index.tsx       → /admin/records
├── _admin.admin.records.$recordId.tsx
├── _admin.admin.dialogue._index.tsx      → /admin/dialogue
├── _admin.admin.dialogue.$responseId.tsx
├── _admin.admin.collaboration._index.tsx → /admin/collaboration
├── _admin.admin.collaboration.$groupId.tsx
├── _admin.admin.curation.tsx             → /admin/curation
├── _admin.admin.memories._index.tsx      → /admin/memories
├── _admin.admin.memories.$stageId.tsx
├── _admin.admin.templates._index.tsx     → /admin/templates
├── _admin.admin.templates.$templateId.tsx
├── _admin.admin.analytics.tsx            → /admin/analytics
├── _admin.admin.settings.tsx             → /admin/settings
├── _admin.admin.roles.tsx                → /admin/roles
└── _admin.admin.audit.tsx                → /admin/audit
```

**제거된 라우트** (Better Auth 관련):
- ~~auth.login.tsx~~ → ada-kr-pos.com/login으로 리다이렉트
- ~~auth.register.tsx~~ → ada-kr-pos.com/login으로 리다이렉트
- ~~api.auth.$.tsx~~ → Better Auth API handler 불필요

### Data Loading Pattern (모든 페이지 공통)
```typescript
// app/lib/auth.server.ts — 공유 인증 유틸 (요청별 캐시)
import { verifyRequest, type AuthContext } from "@adakrpos/auth/generic";

const authCache = new WeakMap<Request, AuthContext>();

export async function getAuth(request: Request, apiKey: string): Promise<AuthContext> {
  const cached = authCache.get(request);
  if (cached) return cached;
  const auth = await verifyRequest(request, { apiKey });
  authCache.set(request, auth);
  return auth;
}

// app/routes/_public.tsx — 레이아웃 로더
export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getAuth(request, context.cloudflare.env.ADAKRPOS_API_KEY);
  if (auth.isAuthenticated) {
    await upsertLearnerProfile(context.cloudflare.env.DB, auth.user);
  }
  return { auth };
}

// app/routes/_public.write.tsx — 페이지 로더에서 getAuth 재호출 (WeakMap 캐시로 API 중복 호출 없음)
export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = await getAuth(request, context.cloudflare.env.ADAKRPOS_API_KEY);
  if (!auth.isAuthenticated) {
    throw redirect(`https://ada-kr-pos.com/login?returnUrl=${encodeURIComponent(request.url)}`);
  }
  if (!auth.user.isVerified) {
    throw redirect("/guide");
  }
  // ... Drizzle 쿼리 (auth.user.id로 사용자 식별)
}
```

> **핵심**: RR7에서 자식 로더는 부모 로더 데이터에 직접 접근 불가. 대신 `getAuth()` 공유 유틸이 `WeakMap`으로 요청별 캐시를 관리하여 `verifyRequest` API 호출을 1회로 제한.
> 클라이언트에서는 `useRouteLoaderData("_public")`로 레이아웃 로더의 auth 데이터 접근.

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.
> **External Prerequisites (실행 전 1회 준비)**:
> 1. **`ADAKRPOS_API_KEY`**: ada-kr-pos.com 대시보드에서 발급받은 SDK API 키 (`.dev.vars`에 설정)
> 2. **`ADMIN_USER_ID`**: ada-kr-pos.com에서 Admin으로 사용할 계정의 UUID (`.dev.vars`에 설정)
> 3. **`TEST_ADMIN_SESSION`**, **`TEST_VERIFIED_SESSION`**, **`TEST_UNVERIFIED_SESSION`**: 테스트 세션 쿠키 값 (`.dev.vars`에 설정)
> 모든 값은 실행 전에 준비되어야 하며, 계획 실행 중에는 인간 개입 없이 `.dev.vars`에서 자동 사용됨.

### QA Policy
- **페이지 태스크**: Playwright — `wrangler pages dev` 로컬 서버 → 방문/인터랙션/스크린샷
- **인프라 태스크**: Bash — 파일 존재 + `tsc --noEmit` + wrangler 명령
- **컴포넌트 태스크**: Bash — 파일 존재 + `tsc --noEmit` + grep testid
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

### Auth QA Convention (모든 인증 필요 QA에 적용)

**테스트 세션 조달 (External Prerequisite — 실행 전 1회 준비)**:
> 아래는 계획 실행 전에 완료해야 하는 외부 전제조건입니다. 계획 실행 중에는 인간 개입 없이 `.dev.vars`의 값을 자동으로 사용합니다.

1. ada-kr-pos.com에서 3개 테스트 계정 준비 (1회):
   - Admin 계정 (ADMIN_USER_ID와 동일한 사용자)
   - Verified 일반 사용자 (isVerified=true)
   - Unverified 사용자 (isVerified=false)
2. 각 계정으로 ada-kr-pos.com에 로그인 후 `adakrpos_session` 쿠키 값 복사 (1회)
3. `.dev.vars`에 추가 (1회):
   ```
   TEST_ADMIN_SESSION=<admin 쿠키값>
   TEST_VERIFIED_SESSION=<verified 쿠키값>
   TEST_UNVERIFIED_SESSION=<unverified 쿠키값>
   ```
4. 이후 모든 QA 시나리오는 `.dev.vars`에서 자동으로 값을 읽어 사용 (인간 개입 없음)

**Playwright 환경변수 로딩**: QA 실행 전 `.dev.vars` 파일을 환경변수로 로드. 방법: `dotenv -e .dev.vars -- npx playwright test` 또는 Playwright config에서 `require('dotenv').config({ path: '.dev.vars' })` 설정. 이후 `process.env.TEST_ADMIN_SESSION` 등을 사용 가능.

**로컬 QA 쿠키 주입 방법**:
`wrangler pages dev`는 `localhost:8788`에서 실행됨. `adakrpos_session` 쿠키는 이름 기반으로 Request에서 추출되므로, Playwright에서 `localhost` 도메인으로 주입하면 SDK의 `verifyRequest`가 정상 동작.
```
await context.addCookies([{
  name: 'adakrpos_session',
  value: process.env.TEST_ADMIN_SESSION,
  domain: 'localhost',
  path: '/',
}]);
```
> **핵심**: SDK는 `Request` 객체의 `Cookie` 헤더에서 `adakrpos_session` 값을 추출하여 ada-kr-pos.com API로 검증. 쿠키 도메인은 브라우저 전달용이므로 localhost에서도 동작.

### Build Commands
```bash
npx react-router build           # 프로덕션 빌드
tsc --noEmit                     # 타입 체크
wrangler pages dev ./build/client --d1 DB  # 로컬 개발 서버
wrangler d1 migrations apply DB --local    # 로컬 마이그레이션
wrangler d1 execute DB --local --file=seeds/seed.sql  # 시드 데이터
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 8 tasks, 최대 5 병렬):
├── T1: RR7 + Cloudflare 프로젝트 초기화 (@adakrpos/auth, KV 제거) [quick]
├── T2: Design tokens + Tailwind (T1 후) [visual-engineering]
├── T3: Drizzle ORM 전체 스키마 (cohort 지원, Better Auth 테이블 없음) (T1 후) [deep]
├── T4: D1 마이그레이션 + seed data (Better Auth 없이) (T3 후) [unspecified-high]
├── T5: Data access layer (사용자 조회 via learner_profiles 캐시) (T3, T4 후) [deep]
├── T6: @adakrpos/auth 설정 (verifyRequest, requireVerified, Admin 부트스트랩) (T1, T3, T4 후) [deep]
├── T7: Public shell 레이아웃 (ada-kr-pos.com 로그인 링크) (T1, T2, T5, T6 후) [visual-engineering]
└── T8: Admin shell 레이아웃 (requireRole via @adakrpos/auth) (T1, T2, T5, T6 후) [visual-engineering]

Wave 2 (Components — 8 tasks, 최대 8 병렬):
├── T9: SceneCard [visual-engineering]
├── T10: QuestionCard + ResponseCard [visual-engineering]
├── T11: LearnerCard + CollaborationUnitCard [visual-engineering]
├── T12: HighlightedSentenceCard [visual-engineering]
├── T13: HeroSection 5종 [visual-engineering]
├── T14: StageStrip 타임라인 [visual-engineering]
├── T15: CTABand + FilterBar + SortBar [visual-engineering]
└── T16: EmptyState + LoadingSkeleton + ErrorState [visual-engineering]

Wave 3 (Core Public — 8 tasks, 최대 8 병렬):
├── T17: 홈 (/) [visual-engineering]
├── T18: 여정 (/journey) [visual-engineering]
├── T19: Stage 상세 (/journey/:stageSlug) [visual-engineering]
├── T20: 기록 목록 (/logs) [visual-engineering]
├── T21: 기록 상세 (/logs/:recordSlug) — requireVerified action [deep]
├── T22: 기록 작성 (/write) — requireVerified [deep]
├── T23: Learner 목록+상세 [visual-engineering]
└── T24: 챌린지 목록+상세 [visual-engineering]

Wave 4 (Remaining Public — 7 tasks, 최대 7 병렬):
├── T25: Collaboration Unit 상세 [visual-engineering]
├── T26: Collective Memory [visual-engineering]
├── T27: 검색 (cohort 필터) [unspecified-high]
├── T28: 인박스 — requireAuth [visual-engineering]
├── T29: 내 공간 — requireAuth [visual-engineering]
├── T30: 설정 — divelog 전용만, name/bio 편집 불가 [quick]
└── T31: 가이드 [visual-engineering]

Wave 5 (Admin Part 1 — 7 tasks, 최대 7 병렬):
├── T32: Admin Dashboard [visual-engineering]
├── T33: Admin Stage 관리 [unspecified-high]
├── T34: Admin Challenge 관리 [unspecified-high]
├── T35: Admin Learner 관리 [unspecified-high]
├── T36: Admin Records 관리 [unspecified-high]
├── T37: Admin Dialogue 관리 [unspecified-high]
└── T38: Admin Collaboration 관리 [unspecified-high]

Wave 6 (Admin Part 2 — 6 tasks, 최대 6 병렬):
├── T39: Admin Curation [unspecified-high]
├── T40: Admin Collective Memory 편집 [unspecified-high]
├── T41: Admin Templates [unspecified-high]
├── T42: Admin Analytics [visual-engineering]
├── T43: Admin Settings [quick]
└── T44: Admin Roles & Audit [unspecified-high]

Wave 7 (Audit — 4 tasks, 최대 4 병렬):
├── T45: 반응형 레이아웃 감사 [visual-engineering + playwright]
├── T46: 접근성 감사 [unspecified-high + playwright]
├── T47: 빈 상태/로딩/에러 완전성 감사 [unspecified-high]
└── T48: SEO + 최종 빌드 검증 (39개 라우트, KV/Better Auth 0건) [quick]

Wave FINAL (Review — 4 tasks 병렬):
├── F1: 플랜 준수 감사 (auth 마이그레이션 완전성 포함) [oracle]
├── F2: 코드 품질 리뷰 [unspecified-high]
├── F3: 실제 QA (쿠키 주입 인증) [unspecified-high + playwright]
└── F4: 스코프 충실도 검사 [deep]
```

### Dependency Matrix
- **T1**: — → T2,T3,T6,T7,T8
- **T3**: T1 → T4,T5,T6
- **T4**: T3 → T5,T6
- **T5**: T3,T4 → T17–T44
- **T6**: T1,T3,T4 → T17–T44
- **T7**: T1,T2,T5,T6 → T17–T31
- **T8**: T1,T2,T5,T6 → T32–T44
- **T9–T16**: T2,T3 → T17–T44
- **T17–T24**: T5,T6,T7,T9–T16 → T45–T48
- **T32–T44**: T5,T6,T8 → T45–T48
- **T45–T48**: T17–T44 → F1–F4

---

## TODOs

> 모든 페이지 태스크 공통 패턴:
> - `_public.tsx` 레이아웃 로더에서 1회만 `verifyRequest` 호출, AuthContext를 하위 라우트에 전달
> - `loader`로 D1 데이터 조회 (Drizzle query via `context.cloudflare.env.DB`)
> - `action`으로 폼 제출 처리 (Zod 검증 → Drizzle insert/update)
> - 쓰기 action은 `requireVerified` 확인 필수
> - 빈 상태(EmptyState), 로딩(LoadingSkeleton), 에러(ErrorState) 3가지 상태 처리
> - URL search params 기반 필터링 (해당 시)

### Wave 1 — Foundation

- [x] 1. React Router 7 + Cloudflare 프로젝트 초기화

  **What to do**:
  - `git init` → 기본 Git 저장소 초기화 (커밋 전략 실행 전제)
  - `npx create-react-router@latest --template cloudflare` 로 프로젝트 생성
  - `wrangler.toml` 설정: D1, R2, Queues 바인딩 구성 (**KV 제거**)
  - `wrangler types` 실행 → `worker-configuration.d.ts` 자동 생성
  - `compatibility_flags = ["nodejs_compat"]` 설정
  - `pnpm install` + 기본 의존성: `drizzle-orm`, `drizzle-kit`, **`@adakrpos/auth`**, `zod`, `tailwindcss`
  - `.dev.vars` 파일: **`ADAKRPOS_API_KEY`**, **`ADMIN_USER_ID`**, `TEST_ADMIN_SESSION`, `TEST_VERIFIED_SESSION`, `TEST_UNVERIFIED_SESSION` 환경변수
  - `pnpm dev` → 로컬 서버 동작 확인
  - `.gitignore`에 `.wrangler/`, `.dev.vars` 추가

  **Must NOT do**:
  - `better-auth` 패키지 설치
  - KV 바인딩 추가
  - `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` 환경변수
  - Node.js 전용 패키지 설치

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Blocked By**: None
  - **Blocks**: T2, T3, T6, T7, T8

  **References**:
  - `.docs/auth.md:14-16` — @adakrpos/auth SDK 설치 (`npm install @adakrpos/auth`)
  - `.docs/auth.md:82-89` — Generic (CF Workers) 사용법 (`verifyRequest`)
  - `.docs/frontend.md:49-58` — 기술 기준
  - React Router 7 Cloudflare template: `npx create-react-router@latest --template cloudflare`

  **Acceptance Criteria**:
  - [ ] `pnpm dev` 로컬 서버 동작
  - [ ] `tsc --noEmit` 타입 에러 0
  - [ ] `wrangler.toml`에 D1, R2, Queues 바인딩 존재 (KV 없음)
  - [ ] `worker-configuration.d.ts`에 Env 타입 존재
  - [ ] `package.json`에 `@adakrpos/auth` 존재, `better-auth` 미존재
  - [ ] `.dev.vars`에 `ADAKRPOS_API_KEY`, `ADMIN_USER_ID` 존재

  **QA Scenarios**:
  ```
  Scenario: 프로젝트 초기 동작 확인
    Tool: Bash
    Steps:
      1. `ls wrangler.toml app/root.tsx` — 핵심 파일 존재
      2. `grep 'd1_databases\|r2_buckets\|queues' wrangler.toml` — 3종 바인딩 존재
      3. `! grep -q 'kv_namespaces' wrangler.toml` — KV 미존재 (exit 0 = 통과)
      4. `grep -q '@adakrpos/auth' package.json` — SDK 존재 (exit 0 = 통과)
      5. `! grep -q 'better-auth' package.json` — Better Auth 미존재 (exit 0 = 통과)
      6. `grep 'ADAKRPOS_API_KEY\|ADMIN_USER_ID' .dev.vars` — 환경변수 존재
      7. `tsc --noEmit` — 타입 에러 0
    Expected Result: 파일 존재, 바인딩 3종(KV 없음), @adakrpos/auth, 환경변수 확인
    Evidence: .sisyphus/evidence/task-1-init.txt
  ```

  **Commit**: YES — `chore: initialize React Router 7 + Cloudflare Pages with @adakrpos/auth`

- [x] 2. Quiet Depth 디자인 토큰 + Tailwind 설정

  **What to do**:
  - `app/styles/tokens.css` — CSS custom properties: 색상(해저 깊이감 컬러, 배경에만), Stage 타입별 accent(Prelude/Bridge/Challenge/Epilogue), 본문 16px↑, line-height 1.6↑, 읽기 폭 max-width 680px, 카드 radius 24px, soft shadow, 8px 간격
  - `tailwind.config.ts` 확장: 커스텀 색상, 폰트, 간격
  - `app/styles/global.css` — 리셋, 기본 타이포그래피, focus ring 스타일
  - Admin 톤: utilitarian, neutral surfaces, semantic accent (해저 감성 제거)

  **Must NOT do**: 해양 일러스트, 물고기 아이콘, 과한 장식 모션

  **Category**: `visual-engineering` | **Blocked By**: T1 | **Blocks**: T7, T8, T9–T16

  **References**:
  - `.docs/frontend.md:416-443` — 스타일 토큰 (색상, 반경, 그림자, 타이포)
  - `.docs/frontend.md:178-186` — StageStrip 톤 구분
  - `.docs/prd.md:757-769` — 디자인 요구사항
  - `.docs/admin.md:486-506` — Admin 디자인 원칙

  **Acceptance Criteria**:
  - [ ] CSS custom properties에 color, spacing, typography 토큰 정의
  - [ ] Stage 타입별 accent 색상 존재
  - [ ] Admin 별도 neutral 톤 정의
  - [ ] `tsc --noEmit` 성공

  **QA Scenarios**:
  ```
  Scenario: 디자인 토큰 정의 확인
    Tool: Bash
    Steps:
      1. `ls app/styles/tokens.css app/styles/global.css tailwind.config.ts` — 파일 존재
      2. `grep -c 'prelude\|bridge\|challenge\|epilogue' app/styles/tokens.css` — Stage 톤 4종 (≥ 4)
      3. `grep -c 'admin\|neutral\|utilitarian' app/styles/tokens.css` — Admin 톤 존재 (≥ 1)
      4. `! grep -q 'ocean\|fish\|일러스트' app/styles/tokens.css app/styles/global.css` — 해양 요소 0건 (exit 0 = 통과)
    Expected Result: 토큰 파일 존재, Stage 4종, Admin 톤, 해양 요소 없음
    Evidence: .sisyphus/evidence/task-2-tokens.txt
  ```

  **Commit**: YES — `feat(styles): define Quiet Depth design tokens`

- [x] 3. Drizzle ORM 전체 도메인 스키마

  **What to do**:
  - `app/db/schema.server.ts` — 전체 도메인 테이블 정의 (Drizzle SQLite):
    - `learner_profiles` — user_id(TEXT, AdakrposUser.id 참조), slug(UNIQUE), **display_name(캐시)**, **profile_photo_url(캐시)**, **cohort(캐시)**, current_stage_id, current_question, created_at, updated_at
    - `stages` — id, name, slug, type, status, description, accent_tone, order, start_date, end_date, is_current, hero_content, **cohort(TEXT)**, created_at
    - `challenges` — id, name, slug, problem_definition, current_question, status, **cohort(TEXT)**, created_at
    - `records` — id, author_id(FK→learner_profiles), stage_id, title, content, format, type, rhythm, visibility, challenge_id, collaboration_unit_id, response_preference, linked_record_id, **cohort(TEXT)**, created_at, updated_at
    - `questions` — id, record_id, content, direction, created_at
    - `self_answers` — id, question_id, content, created_at
    - `responses` — id, record_id, question_id, author_id, type, content, visibility, created_at
    - `sentences` — id, record_id, content, reason, saved_by_id, paragraph_index, created_at
    - `collaboration_units` — id, name, slug, challenge_id, stage_id, status, current_question, **cohort(TEXT)**, created_at
    - `collaboration_members` — unit_id, learner_id (junction)
    - `notifications` — id, recipient_id, type, title, content, record_id, question_id, is_read, created_at
    - `collective_memories` — id, stage_id, summary, status, **cohort(TEXT)**, created_at
    - `memory_questions`, `memory_sentences`, `memory_records` — junction tables
    - `templates` — id, name, description, prompt_body, context, form, rhythm, stage_kind, active, created_at
    - `curation_slots` — id, slot_type, target_id, position, pinned, hidden, created_at
    - `audit_logs` — id, actor_id, target_type, target_id, action, before_state, after_state, created_at
    - `settings` — id, key, value, updated_at
    - `challenge_stages` — junction
    - `user_roles` — id, user_id(TEXT, AdakrposUser.id), role
  - **Better Auth 테이블 없음** (user, session, account, verification → 불필요)
  - `app/db/relations.server.ts` — Drizzle relations 정의
  - `app/lib/validation.ts` — Zod 폼 검증 스키마
  - 모든 테이블 STRICT 모드, INTEGER timestamps (unixepoch)

  **Must NOT do**:
  - Better Auth 관련 테이블 정의 (user, session, account, verification)
  - JSON 배열로 M:N 관계 저장
  - learner_profiles에 password/auth 관련 필드
  - cohorts 테이블 생성 (cohort는 문자열 값으로만)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Blocked By**: T1
  - **Blocks**: T4, T5, T6

  **References**:
  - `.docs/auth.md:92-124` — AdakrposUser, AdakrposSession 타입 정의
  - `.docs/frd.md:80-110` — 사용자 역할 7개
  - `.docs/frd.md:130-170` — 전체 데이터 모델
  - `.docs/frd.md:315-433` — 기록, Dialogue Layer 필드
  - `.docs/admin.md:440-483` — 역할/권한 매트릭스
  - `.docs/glossary.md:1-246` — 47개 용어 정의
  - Drizzle D1 공식 문서: `drizzle-orm/sqlite-core` API

  **Acceptance Criteria**:
  - [ ] 20개↑ 테이블 정의
  - [ ] `learner_profiles`에 user_id, slug, display_name, profile_photo_url, cohort 존재
  - [ ] `learner_profiles`에 password/auth 필드 미존재
  - [ ] stages, records, challenges, collaboration_units, collective_memories에 cohort 컬럼 존재
  - [ ] junction table로 M:N 관계
  - [ ] Better Auth 테이블(user, session, account, verification) 미존재
  - [ ] `tsc --noEmit` 성공

  **QA Scenarios**:
  ```
  Scenario: 스키마 완전성 및 auth 분리 확인
    Tool: Bash
    Steps:
      1. `ls app/db/schema.server.ts app/db/relations.server.ts app/lib/validation.ts` — 파일 존재
      2. `grep -c 'sqliteTable' app/db/schema.server.ts` — 테이블 수 (≥ 20)
      3. `grep 'user_id' app/db/schema.server.ts | grep 'learner_profiles'` — user_id 존재
      4. `grep 'display_name\|profile_photo_url' app/db/schema.server.ts` — 캐시 필드 존재
      5. `grep 'cohort' app/db/schema.server.ts | head -5` — cohort 컬럼 존재
      6. `! grep -qi 'password\|auth_token\|session.*table\|account.*table\|verification.*table' app/db/schema.server.ts` — Better Auth 잔재 0건 (exit 0 = 통과)
      7. `tsc --noEmit` — 타입 에러 0
    Expected Result: 20+ 테이블, cohort 존재, Better Auth 잔재 없음
    Evidence: .sisyphus/evidence/task-3-schema.txt
  ```

  **Commit**: YES — `feat(db): define Drizzle ORM schema with cohort support`

- [x] 4. D1 마이그레이션 + 한국어 seed data

  **What to do**:
  - `drizzle-kit generate` → `drizzle/migrations/` 자동 생성
  - `wrangler d1 migrations apply DB --local` → 로컬 D1에 적용
  - `seeds/seed.sql` — 한국어 seed data:
    - **Better Auth user 데이터 불필요** (외부 인증이므로)
    - `learner_profiles`: user_id는 UUID placeholder (`usr-seed-001` ~ `usr-seed-008`), display_name, profile_photo_url, cohort="cohort-2026", slug
    - **고정 slug 규약** (모든 QA 시나리오에서 이 slug를 사용):
      - Stage: `prelude-1` (active, is_current=true), `bridge-1` (completed), `challenge-1` (active)
      - Record: `first-note` (Note, Public), `challenge-article` (Article, 챌린지 기록)
      - Learner: `learner-hana` (기록 3개↑, 질문 보유)
      - Challenge: `team-challenge` (협업 있음), `solo-challenge` (협업 없음)
      - Collaboration Unit: `collab-alpha` (active)
    - records.author_id → learner_profiles.user_id (placeholder UUID)
    - 모든 cohort 컬럼에 `cohort-2026` 값
    - Stages 5~7개, Learners 5~8명, Records 20~30개, Questions 10~15개, Responses 15~20개, Sentences 10~15개, Challenges 2~3개, Collaboration Units 1~2개, Templates 8개 (오늘의 한 줄, 이번 주 메모, 스프린트 로그, 구간 회고, 개인 회고, 함께하는 탐색 기록, 자유 형식, 챌린지 일지), Collective Memories 1~2개, Notifications 5~10개, Audit Logs 5~10개
  - 모든 텍스트 한국어

  **Must NOT do**:
  - Better Auth user/session/account 테이블 seed
  - admin-seed.sql 별도 파일
  - 영어 placeholder 텍스트

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Blocked By**: T3
  - **Blocks**: T5, T6

  **References**:
  - `.docs/frd.md:315-348` — 기록 필드 값
  - `.docs/frd.md:355-372` — 응답 유형 옵션
  - `.docs/operational-principles.md:242-264` — 운영 문장 스타일
  - `.docs/glossary.md` — 용어 정의

  **Acceptance Criteria**:
  - [ ] `drizzle/migrations/` 마이그레이션 파일 존재
  - [ ] `wrangler d1 migrations apply DB --local` 성공
  - [ ] `wrangler d1 execute DB --local --file=seeds/seed.sql` 성공
  - [ ] 모든 seed 텍스트 한국어
  - [ ] learner_profiles seed에 cohort="cohort-2026" 존재
  - [ ] Better Auth user 테이블 seed 미존재

  **QA Scenarios**:
  ```
  Scenario: D1 마이그레이션 + seed 적용 확인
    Tool: Bash
    Steps:
      1. `ls drizzle/migrations/*.sql` — 마이그레이션 파일 존재
      2. `wrangler d1 migrations apply DB --local` — 성공
      3. `wrangler d1 execute DB --local --file=seeds/seed.sql` — 성공
      4. `wrangler d1 execute DB --local --command="SELECT count(*) FROM stages"` — 5 이상
      5. `wrangler d1 execute DB --local --command="SELECT count(*) FROM records"` — 20 이상
      6. `wrangler d1 execute DB --local --command="SELECT cohort FROM learner_profiles LIMIT 1"` — cohort-2026
      7. `wrangler d1 execute DB --local --command="SELECT title FROM records LIMIT 1"` — 한국어
    Expected Result: 마이그레이션 성공, seed 성공, cohort 존재, 한국어
    Evidence: .sisyphus/evidence/task-4-migrations-seed.txt
  ```

  **Commit**: YES — `feat(db): create D1 migrations and Korean seed data`

- [x] 5. Data Access Layer (Drizzle Repository)

  **What to do**:
  - `app/db/client.server.ts` — Drizzle 클라이언트 팩토리
  - `app/db/queries/` — 도메인별 쿼리 모듈:
    - `stages.server.ts` — getStages(**cohort**), getStageBySlug, getCurrentStage(**cohort**)
    - `records.server.ts` — getRecords(filters, **cohort**), getRecordBySlug, createRecord, updateRecord
    - `questions.server.ts` — getQuestionsByRecord, createQuestion, getOpenQuestions(**cohort**)
    - `responses.server.ts` — getResponsesByRecord, createResponse
    - `sentences.server.ts` — getSentencesByRecord, saveSentence
    - `learners.server.ts` — getLearners(**cohort**), getLearnerBySlug, **getOrCreateLearnerProfile(userId, adakrposUser)**
    - `challenges.server.ts` — getChallenges(**cohort**), getChallengeBySlug
    - `collaboration.server.ts` — getCollaborationUnit, getMembers
    - `memories.server.ts` — getCollectiveMemory(**cohort**)
    - `notifications.server.ts` — getNotifications, markAsRead
    - `search.server.ts` — searchAll (LIKE 기반, **cohort** 필터)
    - `admin/` — Admin CRUD 쿼리
  - **모든 cohort-scoped 쿼리에 cohort 파라미터 추가**
  - **`getOrCreateLearnerProfile`**: AdakrposUser로부터 learner_profiles upsert
  - 다중 쿼리 페이지는 `db.batch()` 사용

  **Must NOT do**:
  - 글로벌 DB 인스턴스
  - N+1 쿼리
  - AdakrposUser API 직접 호출 (learner_profiles 캐시 사용)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Blocked By**: T3, T4
  - **Blocks**: T17–T44

  **References**:
  - `.docs/frd.md:175-594` — 모든 기능 요구사항
  - `.docs/admin.md:75-483` — Admin 기능 전체
  - `.docs/auth.md:92-107` — AdakrposUser 타입 (learner_profiles upsert 시 참조)
  - Drizzle D1 batch API: `db.batch([...])` 패턴

  **Acceptance Criteria**:
  - [ ] `app/db/client.server.ts` 존재
  - [ ] `app/db/queries/` 에 12개↑ 쿼리 모듈
  - [ ] `getOrCreateLearnerProfile` 함수 존재
  - [ ] cohort 파라미터를 받는 쿼리 함수 존재
  - [ ] batch 사용하는 쿼리 함수 존재
  - [ ] `tsc --noEmit` 성공

  **QA Scenarios**:
  ```
  Scenario: Data access layer 구조 확인
    Tool: Bash
    Steps:
      1. `ls app/db/client.server.ts` — 클라이언트 존재
      2. `ls app/db/queries/*.server.ts | wc -l` — 12개 이상
      3. `grep 'getOrCreateLearnerProfile' app/db/queries/learners.server.ts` — 함수 존재
      4. `grep -rl 'cohort' app/db/queries/` — cohort 사용하는 쿼리 존재
      5. `grep -rl 'db.batch\|\.batch(' app/db/queries/` — batch 사용 존재
      6. `tsc --noEmit` — 타입 에러 0
    Expected Result: 클라이언트 + 12+ 쿼리 모듈 + getOrCreateLearnerProfile + cohort + batch
    Evidence: .sisyphus/evidence/task-5-dal.txt
  ```

  **Commit**: YES — `feat(db): implement data access layer with Drizzle queries`

- [x] 6. @adakrpos/auth 설정

  **What to do**:
  - `app/lib/auth.server.ts` — 인증 유틸:
    ```typescript
    import { verifyRequest } from "@adakrpos/auth/generic";
    
    export async function getAuthContext(request: Request, apiKey: string) {
      return verifyRequest(request, { apiKey });
    }
    ```
  - `app/lib/auth.middleware.ts` — 미들웨어:
    - `getOptionalUser(request, context)` — 선택적 사용자 조회 (null 허용)
    - `requireAuth(request, context)` — 미인증 시 `https://ada-kr-pos.com/login?returnUrl=` 리다이렉트
    - `requireVerified(request, context)` — **isVerified=false 시 안내 메시지 리다이렉트**
    - `requireRole(request, context, role)` — user_roles 테이블에서 역할 확인
  - `app/routes/_public.tsx` 레이아웃 로더 — verifyRequest 1회 호출, AuthContext + learner_profiles 자동 프로비저닝
  - **Admin 자동 부트스트랩**:
    - `_admin.tsx` 로더에서 `ADMIN_USER_ID` 확인
    - 해당 user_id가 user_roles에 admin 역할 없으면 자동 INSERT
    - 이후 requireRole('admin') 정상 통과
  - **learner_profiles 자동 프로비저닝**:
    - 인증된 사용자 첫 방문 시 `getOrCreateLearnerProfile` 호출
    - slug 자동 생성: AdakrposUser.nickname → romanize → 충돌 시 `-2`, `-3` 접미사
    - display_name, profile_photo_url, cohort 캐시 갱신

  **Must NOT do**:
  - 로그인/회원가입 UI 페이지 (auth.login.tsx, auth.register.tsx)
  - Better Auth API 핸들러 (api.auth.$.tsx)
  - Better Auth 패키지 import
  - `@adakrpos/auth/hono` 또는 `@adakrpos/auth/express` 사용
  - ADAKRPOS_API_KEY 클라이언트 노출
  - JWT 직접 구현
  - 요청당 verifyRequest 2회 이상 호출

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Blocked By**: T1, T3, T4
  - **Blocks**: T17–T44

  **References**:
  - `.docs/auth.md:19-46` — 코어 클라이언트 API (createAdakrposAuth, verifySession, getCurrentUser, getUser)
  - `.docs/auth.md:82-89` — Generic (CF Workers) verifyRequest 패턴
  - `.docs/auth.md:92-124` — AdakrposUser, AdakrposSession, AuthContext, AdakrposAuthConfig 타입
  - `.docs/auth.md:126-167` — HTTP API (verify-session, users/:id, verify-key), 에러 코드
  - `.docs/frd.md:80-110` — 사용자 역할 7개 정의
  - `.docs/admin.md:14-27` — Admin 역할 6개

  **Acceptance Criteria**:
  - [ ] `app/lib/auth.server.ts` 존재 (verifyRequest 래퍼)
  - [ ] `app/lib/auth.middleware.ts` 존재 (requireAuth, requireVerified, requireRole, getOptionalUser)
  - [ ] `_public.tsx` 레이아웃 로더에서 verifyRequest 1회 호출
  - [ ] 미인증 시 `ada-kr-pos.com/login?returnUrl=` 리다이렉트
  - [ ] isVerified=false 시 쓰기 차단
  - [ ] ADMIN_USER_ID 기반 자동 부트스트랩
  - [ ] learner_profiles 자동 프로비저닝
  - [ ] auth.login.tsx, auth.register.tsx, api.auth.$.tsx 파일 미존재
  - [ ] `tsc --noEmit` 성공

  **QA Scenarios**:
  ```
  Scenario: @adakrpos/auth 미들웨어 구조 확인
    Tool: Bash
    Steps:
      1. `ls app/lib/auth.server.ts app/lib/auth.middleware.ts` — 파일 존재
      2. `grep 'verifyRequest' app/lib/auth.server.ts` — SDK 함수 사용
      3. `grep '@adakrpos/auth/generic' app/lib/auth.server.ts` — generic 진입점 사용
      4. `grep 'requireAuth\|requireVerified\|requireRole\|getOptionalUser' app/lib/auth.middleware.ts` — 4개 미들웨어 존재
      5. `grep 'isVerified' app/lib/auth.middleware.ts` — verified 체크 존재
      6. `grep 'ADMIN_USER_ID' app/routes/_admin.tsx` — admin 부트스트랩 존재
      7. `grep 'getOrCreateLearnerProfile' app/routes/_public.tsx` — 프로비저닝 존재
      8. `test ! -e app/routes/auth.login.tsx && test ! -e app/routes/auth.register.tsx` — 자체 auth 라우트 미존재 (exit 0 = 통과)
      9. `tsc --noEmit` — 타입 에러 0
    Expected Result: 미들웨어 구조 정상, Better Auth 라우트 없음
    Evidence: .sisyphus/evidence/task-6-auth.txt

  Scenario: 미인증 리다이렉트 확인
    Tool: Playwright
    Steps:
      1. 쿠키 없이 `/write` 방문
      2. URL이 `ada-kr-pos.com/login` 포함하는지 확인
      3. returnUrl 파라미터에 원래 URL 포함 확인
    Expected Result: ada-kr-pos.com/login으로 리다이렉트, returnUrl 존재
    Failure Indicators: /auth/login으로 리다이렉트 (Better Auth 잔재)
    Evidence: .sisyphus/evidence/task-6-auth-redirect.png

  Scenario: Admin 부트스트랩 확인
    Tool: Playwright + Bash
    Preconditions: Playwright context에 ADMIN_USER_ID에 해당하는 adakrpos_session 쿠키 주입 (domain: localhost)
    Steps:
      1. (Playwright) `/admin` 방문 → 접근 가능 확인 (AdminSidebar 존재)
      2. (Bash) `wrangler d1 execute DB --local --command="SELECT role FROM user_roles WHERE user_id='${ADMIN_USER_ID}'"` → 'admin' 반환
    Expected Result: admin 접근 정상 + D1에 admin 역할 레코드 존재
    Evidence: .sisyphus/evidence/task-6-admin-bootstrap.png + .sisyphus/evidence/task-6-admin-bootstrap-db.txt
  ```

  **Commit**: YES — `feat(auth): configure @adakrpos/auth with requireVerified middleware`

- [x] 7. Public Shell 레이아웃

  **What to do**:
  - `app/routes/_public.tsx` — Public 레이아웃 route:
    - **로더에서 `verifyRequest` 1회 호출** → AuthContext 하위 라우트에 전달
    - **인증 시 `getOrCreateLearnerProfile` 호출 (자동 프로비저닝 + 캐시 갱신)**
    - `<Outlet />` 으로 하위 라우트 렌더링
    - GlobalNav + Footer 포함
  - `app/components/GlobalNav.tsx`:
    - 로고, 여정, 기록, 검색, 인박스(인증 시), 내 공간(인증 시)
    - **Crew를 글로벌 네비에 넣지 않음**
    - **미인증 시: "로그인" 버튼 → `https://ada-kr-pos.com/login?returnUrl=` 링크**
    - **인증 시: AdakrposUser.name/profilePhotoUrl 기반 아바타/이름 표시**
    - **로그아웃: 세션 쿠키 삭제 또는 ada-kr-pos.com/logout 리다이렉트**
    - 모바일: 하단 탭 바 또는 햄버거
  - `app/components/Footer.tsx`: 간결한 링크, 가이드 링크
  - Quiet Depth 톤 적용

  **Must NOT do**:
  - Crew를 글로벌 네비에 추가
  - `/auth/login` 또는 `/auth/register` 링크 (ada-kr-pos.com으로만)
  - 로컬 로그인 폼
  - 과한 해저 비주얼

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Blocked By**: T1, T2, T5, T6 (auth 유틸 + DAL 필요)
  - **Blocks**: T17–T31

  **References**:
  - `.docs/frontend.md:144-160` — GlobalNav 구조/원칙
  - `.docs/wireframe.md:15-25` — 네비게이션 와이어프레임
  - `.docs/sitemap.md:1-50` — Public URL 구조
  - `.docs/auth.md:167` — 미인증 사용자 → ada-kr-pos.com/login 리다이렉트

  **Acceptance Criteria**:
  - [ ] `_public.tsx` 레이아웃에 GlobalNav + Footer + Outlet
  - [ ] `_public.tsx` 로더에서 verifyRequest 호출
  - [ ] GlobalNav 로그인 링크가 `ada-kr-pos.com` 도메인
  - [ ] Crew 글로벌 네비 미포함
  - [ ] 모바일 네비 대응
  - [ ] `/auth/login` 문자열 미사용

  **QA Scenarios**:
  ```
  Scenario: Public Shell 렌더링 및 외부 로그인 링크 확인
    Tool: Playwright
    Steps:
      1. `/` 방문 (미인증)
      2. GlobalNav 존재 확인 (여정, 기록, 검색 링크)
      3. "로그인" 또는 유사 CTA 존재 확인
      4. 로그인 링크 href에 `ada-kr-pos.com` 포함 확인
      5. `/auth/login` 포함 여부 확인 → 포함하면 안 됨
      6. "Crew" 텍스트가 GlobalNav에 없음 확인
      7. Footer 존재 확인
    Expected Result: Nav + Footer 정상, 외부 로그인 링크, Crew 미포함
    Evidence: .sisyphus/evidence/task-7-public-shell.png
  ```

  **Commit**: YES — `feat(layout): implement Public shell with GlobalNav and Footer`

- [x] 8. Admin Shell 레이아웃

  **What to do**:
  - `app/routes/_admin.tsx` — Admin 레이아웃 route:
    - 로더에서 `requireRole(request, context, 'admin')` — @adakrpos/auth 기반
    - **ADMIN_USER_ID 자동 부트스트랩** (T6에서 구현한 로직 사용)
    - 좌측 Sidebar + 상단 ContextBar + 중앙 콘텐츠 + 선택적 우측 Inspector
  - `app/components/admin/AdminSidebar.tsx`: 메뉴 14개, 현재 위치 강조
  - `app/components/admin/AdminContextBar.tsx`: 현재 페이지 제목, breadcrumb
  - utilitarian 톤, neutral surfaces

  **Must NOT do**:
  - Public 감성적 Hero 사용
  - 해저 테마/일러스트
  - `/auth/login` 리다이렉트 (ada-kr-pos.com/login 사용)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Blocked By**: T1, T2, T5, T6 (auth 유틸 + DAL + admin 부트스트랩 필요)
  - **Blocks**: T32–T44

  **References**:
  - `.docs/admin.md:30-72` — Admin 정보 구조 + 레이아웃 원칙
  - `.docs/admin.md:486-506` — Admin 디자인 원칙
  - `.docs/wireframe.md:28-38` — Admin Shell 와이어프레임

  **Acceptance Criteria**:
  - [ ] AdminSidebar에 14개 메뉴 항목 존재
  - [ ] Admin 역할 없으면 접근 차단 (@adakrpos/auth 기반)
  - [ ] neutral 색상 기반 utilitarian 디자인
  - [ ] ADMIN_USER_ID 부트스트랩 동작

  **QA Scenarios**:
  ```
  Scenario: Admin Shell 파일 구조 및 메뉴 확인
    Tool: Bash
    Steps:
      1. `ls app/routes/_admin.tsx app/components/admin/AdminSidebar.tsx app/components/admin/AdminContextBar.tsx` — 파일 존재
      2. `tsc --noEmit` — 타입 에러 없음
      3. `grep -c 'href=' app/components/admin/AdminSidebar.tsx` — 14개 메뉴 (≥ 14)
      4. `grep 'requireRole\|ADMIN_USER_ID' app/routes/_admin.tsx` — admin 역할 체크 존재
      5. `grep -i 'ocean\|fish\|해저' app/components/admin/AdminSidebar.tsx app/routes/_admin.tsx` — 결과 없어야 함
    Expected Result: 파일 존재, 14개 메뉴, admin 체크, 해저 요소 0건
    Evidence: .sisyphus/evidence/task-8-admin-shell.txt
  ```

  **Commit**: YES — `feat(layout): implement Admin shell with Sidebar and ContextBar`

---

### Wave 2 — 공유 컴포넌트 (T9–T16)

- [x] 9. SceneCard — `app/components/SceneCard.tsx`. 제목/첫 문장, 작성자(learner_profiles.display_name), Stage, 성격, 형식, 질문/자기답변/이어진 기록 여부 아이콘. radius 24px, `data-testid="scene-card"`. **Must NOT do**: 좋아요/추천 수.
  **Category**: `visual-engineering` | **References**: `.docs/frontend.md:189-201`, `.docs/wireframe.md:144-161`
  **QA Scenarios**:
  ```
  Scenario: SceneCard 파일 및 금지 요소 확인
    Tool: Bash
    Steps:
      1. `ls app/components/SceneCard.tsx` — 파일 존재
      2. `tsc --noEmit` — 타입 에러 없음
      3. `grep 'data-testid="scene-card"' app/components/SceneCard.tsx` — testid 존재
      4. `! grep -qi 'like\|recommend\|좋아요\|추천\|인기' app/components/SceneCard.tsx` — 금지 요소 0건 (exit 0 = 통과)
    Expected Result: 파일 존재, testid 포함, 금지 요소 없음
    Evidence: .sisyphus/evidence/task-9-scenecard.txt
  ```
  **Commit**: YES (T9–T16 그룹)

- [x] 10. QuestionCard + ResponseCard — `app/components/QuestionCard.tsx` (질문 문장 가장 크게, 여백 1.5~2배, `data-testid="question-card"`), `app/components/ResponseCard.tsx` (유형 라벨, flat editorial card, 자기답변 시각 구분, `data-testid="response-card"`). **Must NOT do**: 말풍선, 좋아요/싫어요/추천.
  **Category**: `visual-engineering` | **References**: `.docs/frontend.md:204-235`, `.docs/prd.md:417-420`
  **QA Scenarios**:
  ```
  Scenario: ResponseCard 비말풍선 확인
    Tool: Bash
    Steps:
      1. `ls app/components/QuestionCard.tsx app/components/ResponseCard.tsx` — 파일 존재
      2. `! grep -qi 'bubble\|chat\|말풍선' app/components/ResponseCard.tsx` — 0건 (exit 0 = 통과)
      3. `! grep -qi 'like\|recommend\|좋아요\|추천' app/components/ResponseCard.tsx` — 0건 (exit 0 = 통과)
      4. `grep 'data-testid="response-card"' app/components/ResponseCard.tsx` — testid 존재
      5. `grep 'data-testid="question-card"' app/components/QuestionCard.tsx` — testid 존재
    Expected Result: 말풍선 0건, 좋아요 0건, testid 포함
    Evidence: .sisyphus/evidence/task-10-responsecard.txt
  ```
  **Commit**: YES (T9–T16 그룹)

- [x] 11. LearnerCard + CollaborationUnitCard — `app/components/LearnerCard.tsx` (이름, 질문, 최근 기록, Stage. 질문이 프로필보다 먼저, `data-testid="learner-card"`), `app/components/CollaborationUnitCard.tsx` (질문이 팀 소개보다 먼저, `data-testid="collaboration-card"`).
  **Category**: `visual-engineering` | **References**: `.docs/frontend.md:253-280`
  **QA Scenarios**:
  ```
  Scenario: 질문 우선 배치 확인
    Tool: Bash
    Steps:
      1. `ls app/components/LearnerCard.tsx app/components/CollaborationUnitCard.tsx` — 파일 존재
      2. `grep 'data-testid="learner-card"' app/components/LearnerCard.tsx` — testid 존재
      3. `grep 'data-testid="collaboration-card"' app/components/CollaborationUnitCard.tsx` — testid 존재
      4. `tsc --noEmit` — 타입 에러 0
    Expected Result: 파일 존재, testid 포함
    Evidence: .sisyphus/evidence/task-11-learner-collab.txt
  ```
  **Commit**: YES (T9–T16 그룹)

- [x] 12. HighlightedSentenceCard — `app/components/HighlightedSentenceCard.tsx`. 문장, 이유, 남긴 사람, 원문 링크. `data-testid="sentence-card"`. **Must NOT do**: "N명이 저장" 카운트.
  **Category**: `visual-engineering` | **References**: `.docs/frontend.md:238-250`
  **QA Scenarios**:
  ```
  Scenario: 문장 카드 금지 요소 확인
    Tool: Bash
    Steps:
      1. `ls app/components/HighlightedSentenceCard.tsx` — 파일 존재
      2. `! grep -qi '저장.*명\|saved.*count\|인기' app/components/HighlightedSentenceCard.tsx` — 0건 (exit 0 = 통과)
      3. `grep 'data-testid="sentence-card"' app/components/HighlightedSentenceCard.tsx` — testid 존재
    Expected Result: 카운트 0건, testid 포함
    Evidence: .sisyphus/evidence/task-12-sentence.txt
  ```
  **Commit**: YES (T9–T16 그룹)

- [x] 13. HeroSection 변형 5종 — `app/components/HeroSection.tsx`. variant: home, stage, challenge, learner, memory. **Must NOT do**: 해양 일러스트, 과한 애니메이션.
  **Category**: `visual-engineering` | **References**: `.docs/frontend.md:165-175`
  **QA Scenarios**:
  ```
  Scenario: HeroSection 5종 variant 확인
    Tool: Bash
    Steps:
      1. `ls app/components/HeroSection.tsx` — 파일 존재
      2. `grep -c 'home\|stage\|challenge\|learner\|memory' app/components/HeroSection.tsx` — ≥ 5
      3. `! grep -qi 'ocean\|fish\|해저\|일러스트' app/components/HeroSection.tsx` — 0건 (exit 0 = 통과)
    Expected Result: 5종 variant, 해양 요소 0건
    Evidence: .sisyphus/evidence/task-13-hero.txt
  ```
  **Commit**: YES (T9–T16 그룹)

- [x] 14. StageStrip — `app/components/StageStrip.tsx`. 전체 Stage 가로 배치, 현재 강조, 과거 채도↓, 예정 outline, 타입별 톤, 가로 스크롤, 클릭 이동. `data-testid="stage-strip"`.
  **Category**: `visual-engineering` | **References**: `.docs/frontend.md:178-186`
  **QA Scenarios**:
  ```
  Scenario: StageStrip 구조 확인
    Tool: Bash
    Steps:
      1. `ls app/components/StageStrip.tsx` — 파일 존재
      2. `grep 'data-testid="stage-strip"' app/components/StageStrip.tsx` — testid 존재
      3. `grep -c 'current\|past\|upcoming\|현재\|과거\|예정' app/components/StageStrip.tsx` — ≥ 2
      4. `grep 'overflow.*scroll\|overflow-x' app/components/StageStrip.tsx` — 스크롤 지원
    Expected Result: testid, 상태 구분, 스크롤 지원
    Evidence: .sisyphus/evidence/task-14-stagestrip.txt
  ```
  **Commit**: YES (T9–T16 그룹)

- [x] 15. CTABand + FilterBar + SortBar — `app/components/CTABand.tsx` (CTA ≤ 2, 허가형), `app/components/FilterBar.tsx` (URL search params 기반, 7개 필터), `app/components/SortBar.tsx`. **Must NOT do**: 인기순/추천순, 클라이언트만 필터링.
  **Category**: `visual-engineering` | **References**: `.docs/frd.md:263-283`
  **QA Scenarios**:
  ```
  Scenario: FilterBar/SortBar 금지 요소 확인
    Tool: Bash
    Steps:
      1. `ls app/components/CTABand.tsx app/components/FilterBar.tsx app/components/SortBar.tsx` — 3개 존재
      2. `grep -i 'useSearchParams\|searchParams' app/components/FilterBar.tsx` — URL params 사용
      3. `! grep -qi 'popular\|인기순\|추천순\|trending' app/components/SortBar.tsx` — 0건 (exit 0 = 통과)
    Expected Result: URL params 사용, 인기순 0건
    Evidence: .sisyphus/evidence/task-15-filter-sort.txt
  ```
  **Commit**: YES (T9–T16 그룹)

- [x] 16. EmptyState + LoadingSkeleton + ErrorState — `app/components/EmptyState.tsx` (variant별 한국어 안내 + CTA), `app/components/LoadingSkeleton.tsx` (card/detail skeleton), `app/components/ErrorState.tsx` (한국어, 재시도, 권한/시스템 구분). **Must NOT do**: 빈 상태 방치, 영어 에러.
  **Category**: `visual-engineering` | **References**: `.docs/frontend.md:373-392`
  **QA Scenarios**:
  ```
  Scenario: 상태 컴포넌트 한국어 문구 확인
    Tool: Bash
    Steps:
      1. `ls app/components/EmptyState.tsx app/components/LoadingSkeleton.tsx app/components/ErrorState.tsx` — 3개 존재
      2. `grep -c '없습니다\|남겨보세요\|시작해\|생성' app/components/EmptyState.tsx` — 한국어 안내 ≥ 2
      3. `grep -i 'retry\|재시도\|다시' app/components/ErrorState.tsx` — 재시도 존재
    Expected Result: 파일 존재, 한국어 문구, 재시도 버튼
    Evidence: .sisyphus/evidence/task-16-states.txt
  ```
  **Commit**: YES (T9–T16 그룹) — `feat(components): implement shared component library`

---

### Wave 3 — 핵심 Public 페이지

> 공통: `_public.tsx` 레이아웃에서 전달된 AuthContext 사용. 쓰기 action은 requireVerified. 사용자 표시는 learner_profiles.display_name.

- [x] 17. 홈 (/) — `_public._index.tsx`. loader: getCurrentStage(cohort), 최근 기록, 열린 질문, 문장, Learner spotlight (`db.batch()`). 섹션: Hero→StageStrip→Current Dive(문장형)→열린 질문→Scenes→문장→Learner→CTA. **Must NOT do**: 최신글 피드, 인기글, 좋아요.
  **Category**: `visual-engineering` | **References**: `.docs/frd.md:175-206`, `.docs/wireframe.md:46-76`
  **QA (Playwright)**: `/` 방문 → Hero CTA 2개 + StageStrip + Current Dive 문장(차트 없음) + QuestionCard + SceneCard | Evidence: `.sisyphus/evidence/task-17-home.png`
  **Commit**: YES — `feat(page): implement Home page`

- [x] 18. 여정 (/journey) — `_public.journey.tsx`. loader: getStages(cohort). 모든 Stage 시간순, 현재 강조, 과거/예정 구분. **Must NOT do**: 고정 Stage 수 하드코딩.
  **Category**: `visual-engineering` | **References**: `.docs/frd.md:209-228`, `.docs/wireframe.md:79-101`
  **QA (Playwright)**: `/journey` → StageStrip + 현재 강조 + 클릭 이동 | Evidence: `.sisyphus/evidence/task-18-journey.png`
  **Commit**: YES — `feat(page): implement Journey page`

- [x] 19. Stage 상세 (/journey/:stageSlug) — `_public.journey.$stageSlug.tsx`. loader: Stage+Check-in+질문+기록+Collaboration (`db.batch()`). Quiet Check-in 서술형, 협업 없을 때 안내. **Must NOT do**: 숫자 차트 Check-in.
  **Category**: `visual-engineering` | **References**: `.docs/frd.md:231-261`, `.docs/wireframe.md:104-130`
  **QA (Playwright)**: `/journey/prelude-1` → Hero + Check-in(차트 DOM 없음) + 협업 안내 | Evidence: `.sisyphus/evidence/task-19-stage-detail.png`
  **Commit**: YES — `feat(page): implement Stage Detail page`

- [x] 20. 기록 목록 (/logs) — `_public.logs._index.tsx`. loader: URL searchParams→Drizzle where (cohort 필터). FilterBar 7개, SceneCard 그리드. **Must NOT do**: Daily 카테고리, 인기순.
  **Category**: `visual-engineering` | **References**: `.docs/frd.md:263-283`, `.docs/wireframe.md:133-161`
  **QA (Playwright)**: `/logs` → FilterBar + 필터 클릭→URL params 반영 + SceneCard + "Daily" 미존재 | Evidence: `.sisyphus/evidence/task-20-logs.png`
  **Commit**: YES — `feat(page): implement Record List page`

- [x] 21. 기록 상세 (/logs/:recordSlug) — `_public.logs.$recordSlug.tsx`. loader: Record+Author+Question+Responses+Sentences+LinkedRecords (`db.batch()`). action: **requireVerified** → 응답 작성, 문장 저장. 본문(좁은 읽기 폭)→질문→응답 작성기→응답 목록(editorial card)→이어진 기록→문장. **Must NOT do**: 좋아요/추천, 말풍선, 댓글 중첩.
  **Category**: `deep` | **References**: `.docs/frd.md:286-433`, `.docs/wireframe.md:164-196`
  **QA (Playwright)**: `/logs/first-note` → 본문 + QuestionCard + 응답 유형 선택(4종) + ResponseCard + 좋아요 버튼 0건 + 말풍선 클래스 0건 | Evidence: `.sisyphus/evidence/task-21-record-detail.png`
  **Commit**: YES — `feat(page): implement Record Detail with Dialogue Layer`

- [x] 22. 기록 작성 (/write) — `_public.write.tsx`. loader: **requireVerified** + 템플릿, 현재 Stage, Collaboration Units. action: Zod→Drizzle insert. 플로우: 개인/챌린지→짧게/길게→Rhythm→템플릿→에디터(textarea+markdown preview)→질문→선호도→공개 범위→저장. **Must NOT do**: Rich text, 이미지, 자동 저장, Daily 강제.
  **Category**: `deep` | **References**: `.docs/frd.md:315-348`, `.docs/wireframe.md:199-230`
  **QA (Playwright)**: verified 세션 쿠키 주입 → `/write` → 개인/챌린지 선택 + 형식 선택 + 템플릿 ≥ 8 + textarea + 공개 범위 3단계 | unverified 세션 → 차단 확인 | Evidence: `.sisyphus/evidence/task-22-write.png`
  **Commit**: YES — `feat(page): implement Record Write page`

- [x] 23. Learner 목록+상세 — `_public.learners._index.tsx` (LearnerCard 그리드, 필터), `_public.learners.$learnerSlug.tsx` (소개, 질문, 기록, 자기답변, 문장, 협업). 질문 흐름이 기록 목록보다 먼저. **Must NOT do**: 프로필>질문, 기록 수 정렬.
  **Category**: `visual-engineering` | **References**: `.docs/frd.md:436-455`, `.docs/wireframe.md:232-278`
  **QA (Playwright)**: `/learners` → LearnerCard → 클릭→상세 → 질문 섹션이 기록보다 상단 (DOM 순서) | Evidence: `.sisyphus/evidence/task-23-learner.png`
  **Commit**: YES — `feat(page): implement Learner pages`

- [x] 24. 챌린지 목록+상세 — `_public.challenges._index.tsx`, `_public.challenges.$challengeSlug.tsx`. 문제 정의, 질문, 기록, Collaboration, 전환점, 회고. 협업 없을 때 "개인 탐색 중심" 안내. **Must NOT do**: 챌린지=팀 가정, 결과물>전환점.
  **Category**: `visual-engineering` | **References**: `.docs/frd.md:458-477`, `.docs/wireframe.md:282-326`
  **QA (Playwright)**: `/challenges` → Challenge 카드 → 협업 없는 Challenge 클릭 → 안내 메시지 + 전환점이 결과물보다 상단 | Evidence: `.sisyphus/evidence/task-24-challenge.png`
  **Commit**: YES — `feat(page): implement Challenge pages`

---

### Wave 4 — 나머지 Public 페이지

- [x] 25. Collaboration Unit 상세 — `_public.groups.$groupSlug.tsx`. 존재 시만 접근 (없으면 404). Hero+멤버+질문+장면+전환점+회고. archived 배지.
  **Category**: `visual-engineering` | **References**: `.docs/frd.md:480-498`, `.docs/wireframe.md:329-352`
  **QA (Playwright)**: `/groups/collab-alpha` → 정상 렌더링 | `/groups/nonexistent-slug` → 404 | Evidence: `.sisyphus/evidence/task-25-group.png`
  **Commit**: YES — `feat(page): implement Collaboration Unit Detail`

- [x] 26. Collective Memory — `_public.memories.$stageSlug.tsx`. Summary Hero+열린 질문+오래 남은 문장+대표 장면+carry-forward 질문. **통계 리포트 아님, 공동 서사.**
  **Category**: `visual-engineering` | **References**: `.docs/frd.md:578-594`, `.docs/wireframe.md:451-470`
  **QA (Playwright)**: `/memories/bridge-1` → Summary Hero + 통계 차트 DOM(`canvas`, `chart`) 미존재 | Evidence: `.sisyphus/evidence/task-26-memory.png`
  **Commit**: YES — `feat(page): implement Collective Memory page`

- [x] 27. 검색 — `_public.search.tsx`. loader: LIKE 기반 검색 (cohort 필터). 유형별 탭 (기록/질문/Learner/문장). 검색 전: 최근 제안.
  **Category**: `unspecified-high` | **References**: `.docs/frd.md:501-517`, `.docs/wireframe.md:355-373`
  **QA (Playwright)**: `/search` → 검색 전 제안 + 검색어 입력 → 유형별 탭 | Evidence: `.sisyphus/evidence/task-27-search.png`
  **Commit**: YES — `feat(page): implement Search page`

- [x] 28. 인박스 — `_public.inbox.tsx`. loader: requireAuth (레이아웃 AuthContext 사용) + notifications. 읽지 않음/전체 탭. 클릭→이동. action: markAsRead.
  **Category**: `visual-engineering` | **References**: `.docs/frd.md:520-537`, `.docs/wireframe.md:376-392`
  **QA (Playwright)**: verified 세션 쿠키 주입 → `/inbox` → 탭 + 알림 클릭→이동 | Evidence: `.sisyphus/evidence/task-28-inbox.png`
  **Commit**: YES — `feat(page): implement Inbox page`

- [x] 29. 내 공간 — `_public.me.tsx`. loader: requireAuth + 내 Draft, 저장 문장, 내 질문, 미답변 질문.
  **Category**: `visual-engineering` | **References**: `.docs/frd.md:540-556`, `.docs/wireframe.md:395-410`
  **QA (Playwright)**: verified 세션 쿠키 → `/me` → Draft, 문장, 질문, 미답변 4개 섹션 | Evidence: `.sisyphus/evidence/task-29-me.png`
  **Commit**: YES — `feat(page): implement My Space page`

- [x] 30. 설정 — `_public.settings.tsx`. requireAuth. **divelog 전용 설정만**: 기본 공개 범위, 응답 선호도, 알림 설정. action: Zod→D1 update. **Must NOT do**: name/bio 편집 (ada-kr-pos.com에서 관리), slug 수정.
  **Category**: `quick` | **References**: `.docs/frd.md:559-575`, `.docs/wireframe.md:413-428`
  **QA (Playwright)**: verified 세션 → `/settings` → 공개 범위, 선호도, 알림 UI 존재 + name/bio 편집 필드 미존재 | Evidence: `.sisyphus/evidence/task-30-settings.png`
  **Commit**: YES — `feat(page): implement Settings page`

- [x] 31. 가이드 — `_public.guide.tsx`. Hero+기록하기+질문+응답+Visibility+운영 원칙+FAQ. 허가형 문구.
  **Category**: `visual-engineering` | **References**: `.docs/wireframe.md:430-448`, `.docs/operational-principles.md:242-264`
  **QA (Playwright)**: `/guide` → 7개 섹션 + "괜찮습니다" 또는 "좋습니다" 허가형 문구 | Evidence: `.sisyphus/evidence/task-31-guide.png`
  **Commit**: YES — `feat(page): implement Guide page`

---

### Wave 5 — Admin Part 1

> Admin 공통: `_admin.tsx` 레이아웃에서 requireRole('admin'). QA는 Playwright adakrpos_session 쿠키 주입.

- [x] 32. Admin Dashboard — `_admin.admin._index.tsx`. 패널: 현재 Stage, 최근 기록, moderation 대기, 큐레이션, Collaboration. 위험 항목 상단.
  **Category**: `visual-engineering` | **References**: `.docs/admin.md:75-93`, `.docs/wireframe.md:477-496`
  **QA (Playwright)**: Admin 쿠키 주입 → `/admin` → 5개 패널 + 위험 항목 상단 | Evidence: `.sisyphus/evidence/task-32-admin-dashboard.png`
  **Commit**: YES — `feat(admin): implement Dashboard`

- [x] 33. Admin Stage 관리 — 목록(`_admin.admin.stages._index.tsx`) + 상세(`_admin.admin.stages.$stageId.tsx`). CRUD, 상태 전환, 현재 Stage 1개.
  **Category**: `unspecified-high` | **References**: `.docs/admin.md:95-133`, `.docs/wireframe.md:499-539`
  **QA (Playwright)**: Admin 쿠키 → `/admin/stages` → 테이블 + Stage 클릭→편집 폼 | Evidence: `.sisyphus/evidence/task-33-admin-stage.png`
  **Commit**: YES — `feat(admin): implement Stage management`

- [x] 34. Admin Challenge 관리 — 목록+상세. 문제 정의, 질문, Stage, Collaboration Unit, 전환점.
  **Category**: `unspecified-high` | **References**: `.docs/admin.md:136-161`, `.docs/wireframe.md:542-574`
  **QA (Playwright)**: Admin 쿠키 → `/admin/challenges` → 테이블 + 클릭→편집 (문제 정의, 질문 필드) | Evidence: `.sisyphus/evidence/task-34-admin-challenge.png`
  **Commit**: YES — `feat(admin): implement Challenge management`

- [x] 35. Admin Learner 관리 — 목록(이름, Stage, 활동, 질문, flag) + 상세(프로필, 기록, 질문, 자기답변, 협업, 계정).
  **Category**: `unspecified-high` | **References**: `.docs/admin.md:163-190`, `.docs/wireframe.md:576-610`
  **QA (Playwright)**: Admin 쿠키 → `/admin/learners` → 테이블 + 클릭→상세 | Evidence: `.sisyphus/evidence/task-35-admin-learner.png`
  **Commit**: YES — `feat(admin): implement Learner management`

- [x] 36. Admin Records 관리 — dense table + bulk actions + preview drawer + 필터. 상세: visibility, featured, moderation note, audit.
  **Category**: `unspecified-high` | **References**: `.docs/admin.md:192-231`, `.docs/wireframe.md:612-650`
  **QA (Playwright)**: Admin 쿠키 → `/admin/records` → dense table + 필터 + 클릭→preview drawer | Evidence: `.sisyphus/evidence/task-36-admin-records.png`
  **Commit**: YES — `feat(admin): implement Records management`

- [x] 37. Admin Dialogue 관리 — 응답 목록 + 상세(원문 질문/기록 + 응답 + moderation action).
  **Category**: `unspecified-high` | **References**: `.docs/admin.md:234-267`, `.docs/wireframe.md:652-687`
  **QA (Playwright)**: Admin 쿠키 → `/admin/dialogue` → 응답 테이블 + 클릭→원문+moderation 버튼 | Evidence: `.sisyphus/evidence/task-37-admin-dialogue.png`
  **Commit**: YES — `feat(admin): implement Dialogue moderation`

- [x] 38. Admin Collaboration 관리 — 목록+상세. 상태 전환(forming→active→restructured→archived), 멤버, 기록, archive.
  **Category**: `unspecified-high` | **References**: `.docs/admin.md:269-295`, `.docs/wireframe.md:689-721`
  **QA (Playwright)**: Admin 쿠키 → `/admin/collaboration` → 테이블 + 클릭→상태 전환 UI | Evidence: `.sisyphus/evidence/task-38-admin-collab.png`
  **Commit**: YES — `feat(admin): implement Collaboration management`

---

### Wave 6 — Admin Part 2

- [x] 39. Admin Curation — `_admin.admin.curation.tsx`. 슬롯별 편집 (홈 Scenes/질문/문장/Learner/Stage featured). pin/hide, position.
  **Category**: `unspecified-high` | **References**: `.docs/admin.md:297-323`, `.docs/wireframe.md:724-740`
  **QA (Playwright)**: Admin 쿠키 → `/admin/curation` → 슬롯 목록 + pin/hide UI | Evidence: `.sisyphus/evidence/task-39-curation.png`
  **Commit**: YES — `feat(admin): implement Curation`

- [x] 40. Admin Collective Memory 편집 — 목록(Stage별 상태) + 상세(요약, 질문/문장/기록 후보, carry-forward, preview, publish).
  **Category**: `unspecified-high` | **References**: `.docs/admin.md:326-358`, `.docs/wireframe.md:743-770`
  **QA (Playwright)**: Admin 쿠키 → `/admin/memories` → 상태 목록 + 클릭→요약 편집+publish 버튼 | Evidence: `.sisyphus/evidence/task-40-admin-memory.png`
  **Commit**: YES — `feat(admin): implement Collective Memory editor`

- [x] 41. Admin Templates — 목록+상세(제목, prompt body, context, form, rhythm, stage kind, activation).
  **Category**: `unspecified-high` | **References**: `.docs/admin.md:362-387`, `.docs/wireframe.md:773-805`
  **QA (Playwright)**: Admin 쿠키 → `/admin/templates` → 목록 + 클릭→편집 폼 | Evidence: `.sisyphus/evidence/task-41-templates.png`
  **Commit**: YES — `feat(admin): implement Templates`

- [x] 42. Admin Analytics — summary cards + trend charts + stage health + dialogue health. **Must NOT do**: leaderboards, 개인 비교, 상위 작성자 랭킹.
  **Category**: `visual-engineering` | **References**: `.docs/admin.md:390-418`, `.docs/wireframe.md:808-824`
  **QA (Playwright)**: Admin 쿠키 → `/admin/analytics` → summary cards + leaderboard DOM 미존재 | Evidence: `.sisyphus/evidence/task-42-analytics.png`
  **Commit**: YES — `feat(admin): implement Analytics`

- [x] 43. Admin Settings — `_admin.admin.settings.tsx`. 홈 섹션 on/off, 기본 Visibility, Response 타입 on/off, 검색, 템플릿 정책.
  **Category**: `quick` | **References**: `.docs/admin.md:420-437`, `.docs/wireframe.md:827-838`
  **QA (Playwright)**: Admin 쿠키 → `/admin/settings` → on/off 토글 + Visibility 설정 | Evidence: `.sisyphus/evidence/task-43-admin-settings.png`
  **Commit**: YES — `feat(admin): implement Settings`

- [x] 44. Admin Roles & Permissions + Audit Log — `_admin.admin.roles.tsx` (역할 목록, 권한 매트릭스, 역할 부여/회수), `_admin.admin.audit.tsx` (감사 로그 테이블, 필터, 상세 drawer). 기록 대상 7종.
  **Category**: `unspecified-high` | **References**: `.docs/admin.md:440-483`, `.docs/wireframe.md:841-870`
  **QA (Playwright)**: Admin 쿠키 → `/admin/roles` → 역할 매트릭스 | `/admin/audit` → 로그 테이블+필터+drawer | Evidence: `.sisyphus/evidence/task-44-roles-audit.png`
  **Commit**: YES — `feat(admin): implement Roles & Audit`

---

### Wave 7 — 검수 + 보완

- [x] 45. 반응형 레이아웃 감사 — 모든 Public 375px/768px/1440px 검증. Admin 데스크톱 우선+태블릿 sidebar collapse. 발견 문제 수정.
  **Category**: `visual-engineering` | **Skills**: [`playwright`] | **Blocked By**: T17–T44
  **QA (Playwright)**: viewport 375x812 → `/`, `/logs`, `/write` 스크린샷 | viewport 1440x900 → 우측 레일 | viewport 768x1024 → sidebar collapse | Evidence: `.sisyphus/evidence/task-45-responsive-*.png`
  **Commit**: YES — `fix: responsive layout audit`

- [x] 46. 접근성 감사 — 모든 Public axe-core 실행. 본문 16px↑, contrast, 44px↑ target, focus ring, reduced motion, accessible name. 수정.
  **Category**: `unspecified-high` | **Skills**: [`playwright`] | **Blocked By**: T17–T44
  **QA (Playwright)**: `/`, `/logs`, `/admin` → axe-core → critical/serious 0건 + Tab focus ring 확인 | Evidence: `.sisyphus/evidence/task-46-a11y.txt`
  **Commit**: YES — `fix: accessibility audit`

- [x] 47. 빈 상태/로딩/에러 완전성 감사 — 모든 페이지 3가지 상태 확인. 빈 상태 행동 제안. 에러 한국어. 누락 추가.
  **Category**: `unspecified-high` | **Blocked By**: T17–T44
  **QA (Bash)**: `grep -rl 'EmptyState' app/routes/ | wc -l ≥ 20` + `grep -rl 'ErrorState' app/routes/ | wc -l ≥ 20` + `grep -rl 'LoadingSkeleton' app/routes/ | wc -l ≥ 10` | Evidence: `.sisyphus/evidence/task-47-states.txt`
  **Commit**: YES — `fix: state completeness audit`

- [x] 48. SEO 메타데이터 + 최종 빌드 검증 — 모든 페이지 `<title>`, `<meta>`, OG 태그. `npx react-router build` + `tsc --noEmit`. 라우트 파일 41개 (페이지 39 + 레이아웃 2). KV/Better Auth 0건.
  **Category**: `quick` | **Blocked By**: T17–T44
  **QA Scenarios**:
  ```
  Scenario: SEO + 빌드 + auth 잔재 검증
    Tool: Bash
    Steps:
      1. `grep -rl 'meta\[' app/routes/ | wc -l` — 메타 설정 라우트 수 ≥ 30
      2. `tsc --noEmit` — 타입 에러 0
      3. `npx react-router build` — 빌드 성공
      4. `! grep -q 'kv_namespaces' wrangler.toml` — KV 0건 (exit 0 = 통과)
      5. `! grep -rq 'better.auth' app/ --include='*.ts' --include='*.tsx'` — Better Auth 0건 (exit 0 = 통과)
    Expected Result: 메타데이터 + 빌드 성공 + auth 잔재 없음
    Evidence: .sisyphus/evidence/task-48-seo-build.txt
  ```
  **Commit**: YES — `feat: add SEO metadata and verify build`

---

## Final Verification Wave

> 4개 리뷰 에이전트가 병렬 실행. 모두 APPROVE 필요. 거부 시 수정 후 재실행.

- [x] F1. **플랜 준수 감사** — `oracle`

  **What to do**:
  플랜을 처음부터 끝까지 읽는다. "Must Have" 각 항목: 구현 존재 확인. "Must NOT Have" 각 항목: 코드베이스에서 금지 패턴 검색.

  **QA Scenarios**:
  ```
  Scenario: Must Have 항목 전수 검증
    Tool: Bash
    Steps:
      1. `ls app/routes/_public.*.tsx app/routes/_admin.*.tsx | wc -l` — 페이지 라우트 파일 ≥ 39
      2. `grep 'verifyRequest\|@adakrpos/auth' app/lib/auth.server.ts` — @adakrpos/auth 사용
      3. `grep 'requireVerified' app/lib/auth.middleware.ts` — verified 미들웨어 존재
      4. `grep 'ADMIN_USER_ID' app/routes/_admin.tsx` — admin 부트스트랩 존재
      5. `grep 'cohort' app/db/schema.server.ts | wc -l` — cohort 컬럼 ≥ 5
      6. `grep -rl 'EmptyState' app/routes/ | wc -l` — 빈 상태 ≥ 20
      7. `grep -c 'sqliteTable' app/db/schema.server.ts` — 테이블 20개↑
      8. `ls .sisyphus/evidence/task-*.* | wc -l` — 증거 파일 ≥ 48
    Expected Result: 모든 Must Have 항목 충족
    Evidence: .sisyphus/evidence/final-f1-musthave.txt

  Scenario: Must NOT Have 금지 패턴 전수 검색
    Tool: Bash
    Steps:
      1. `! grep -rq 'better.auth\|betterAuth\|better_auth' app/ --include='*.tsx' --include='*.ts'` — Better Auth 참조 0건 (exit 0 = 통과)
      2. `! grep -q 'kv_namespaces' wrangler.toml` — KV 바인딩 0건 (exit 0 = 통과)
      3. `! grep -rq 'auth/login\|auth/register' app/routes/ --include='*.tsx'` — 자체 auth 라우트 참조 0건 (exit 0 = 통과)
      4. `test ! -e app/routes/auth.login.tsx && test ! -e app/routes/auth.register.tsx` — auth 파일 미존재 (exit 0 = 통과)
      5. `! grep -rq 'like.*count\|좋아요\|추천순\|인기순' app/ --include='*.tsx' --include='*.ts'` — 0건 (exit 0 = 통과)
      6. `! grep -rq 'bubble\|말풍선' app/components/ResponseCard.tsx` — 0건 (exit 0 = 통과)
      7. `! grep -rq 'tiptap\|prosemirror\|contentEditable' app/ --include='*.tsx'` — 0건 (exit 0 = 통과)
      8. `! grep -rq 'leaderboard\|랭킹\|상위.*작성자' app/ --include='*.tsx'` — 0건 (exit 0 = 통과)
      9. `! grep -rq '@adakrpos/auth/hono\|@adakrpos/auth/express' app/ --include='*.ts' --include='*.tsx'` — 0건 (exit 0 = 통과)
    Expected Result: 모든 금지 패턴 0건
    Evidence: .sisyphus/evidence/final-f1-mustnot.txt
  ```
  Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **코드 품질 리뷰** — `unspecified-high`

  **What to do**: `tsc --noEmit` + `npx react-router build`. 모든 파일: `as any`, 빈 catch, console.log, 주석 코드, 미사용 import, AI 슬롭 점검.

  **QA Scenarios**:
  ```
  Scenario: 빌드 + 타입 체크
    Tool: Bash
    Steps:
      1. `tsc --noEmit` — 타입 에러 0
      2. `npx react-router build` — 빌드 성공 (exit code 0)
    Expected Result: 타입 에러 0, 빌드 성공
    Evidence: .sisyphus/evidence/final-f2-build.txt

  Scenario: 코드 품질 패턴 검사
    Tool: Bash
    Steps:
      1. `grep -rn 'as any' app/ --include='*.ts' --include='*.tsx' | wc -l` — 0건 또는 최소
      2. `grep -rn '@ts-ignore\|@ts-expect-error' app/ --include='*.ts' --include='*.tsx' | wc -l` — 0건
      3. `grep -rn 'catch.*{}' app/ --include='*.ts' --include='*.tsx' | wc -l` — 빈 catch 0건
      4. `grep -rn 'console\.log' app/ --include='*.ts' --include='*.tsx' | grep -v 'test\|spec\|mock' | wc -l` — 0건
    Expected Result: as any 0건, ts-ignore 0건, 빈 catch 0건, console.log 0건
    Evidence: .sisyphus/evidence/final-f2-quality.txt
  ```
  Output: `Build [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [x] F3. **실제 QA** — `unspecified-high` (+ `playwright`)

  **What to do**:
  클린 상태에서 시작. `wrangler pages dev` → 모든 태스크 QA 시나리오 실행. **쿠키 주입 방식 인증.**

  **QA Scenarios**:
  ```
  Scenario: Public 핵심 플로우 통합 테스트
    Tool: Playwright
    Preconditions: `wrangler pages dev` 실행, seed data 적용
    Steps:
      1. `/` 방문 → Hero + StageStrip + SceneCard 존재 확인
      2. StageStrip에서 `prelude-1` 클릭 → `/journey/prelude-1` 이동
      3. SceneCard 클릭 → `/logs/first-note` → 본문 + QuestionCard + ResponseCard 확인
      4. `/write` 방문 → 미인증 시 `ada-kr-pos.com/login` 포함 URL로 리다이렉트 확인
      5. Playwright context에 verified 사용자 세션 쿠키 주입
      6. `/write` 재방문 → 작성 플로우 진입 확인
      7. `/search` → 검색어 "기록" 입력 → 결과 확인
      8. `/learners` → LearnerCard 존재 → 클릭 → 상세 확인
    Expected Result: 8개 플로우 전체 정상 동작
    Evidence: .sisyphus/evidence/final-qa/public-flow.png

  Scenario: Verified-only 쓰기 제한 확인
    Tool: Playwright
    Steps:
      1. Unverified 사용자 세션 쿠키 주입 (isVerified=false)
      2. `/write` 방문 → 차단 또는 안내 페이지 확인
      3. Verified 사용자 세션 쿠키 주입 (isVerified=true)
      4. `/write` 방문 → 작성 플로우 정상 진입
    Expected Result: unverified 차단, verified 허용
    Evidence: .sisyphus/evidence/final-qa/verified-only.png

  Scenario: Admin 핵심 플로우 통합 테스트
    Tool: Playwright
    Preconditions: Admin 세션 쿠키 주입
    Steps:
      1. `/admin` 방문 → Dashboard 패널 확인
      2. `/admin/stages` → 테이블 → 클릭 → 편집 폼
      3. `/admin/records` → dense table → 클릭 → preview drawer
      4. `/admin/dialogue` → 응답 목록 → moderation UI
      5. `/admin/analytics` → summary cards + leaderboard 미존재
      6. `/admin/roles` → 역할 매트릭스
      7. `/admin/audit` → 로그 테이블 + 필터
    Expected Result: 7개 Admin 플로우 전체 정상 동작
    Evidence: .sisyphus/evidence/final-qa/admin-flow.png
  ```
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [x] F4. **스코프 충실도 검사** — `deep`

  **What to do**: 각 태스크별 "What to do" → 실제 diff 1:1 검증. "Must NOT do" 준수. 태스크 간 오염 감지.

  **QA Scenarios**:
  ```
  Scenario: 커밋별 파일 스코프 검증
    Tool: Bash
    Steps:
      1. `git log --oneline` — 커밋 목록 확인
      2. 각 커밋별 `git diff --name-only {commit}^..{commit}` — 변경 파일 목록
      3. 커밋 메시지와 변경 파일 범위 대조
    Expected Result: 각 커밋이 범위 내 파일만 수정
    Evidence: .sisyphus/evidence/final-f4-scope.txt

  Scenario: Must NOT do 전체 준수 + auth 마이그레이션 완전성
    Tool: Bash
    Steps:
      1. `! grep -rq 'better.auth\|betterAuth\|better_auth\|BETTER_AUTH' app/ wrangler.toml --include='*.ts' --include='*.tsx' --include='*.toml' 2>/dev/null` — Better Auth 잔재 0건 (exit 0 = 통과)
      2. `! grep -q 'kv_namespaces' wrangler.toml` — KV 0건 (exit 0 = 통과)
      3. `grep -rn 'cohort' app/db/schema.server.ts | wc -l` — cohort 컬럼 ≥ 5
      4. `! grep -rq 'require("fs")\|from "fs"' app/ --include='*.ts' --include='*.tsx'` — Node.js 전용 0건 (exit 0 = 통과)
      5. `test ! -e app/routes/auth.login.tsx && test ! -e app/routes/auth.register.tsx` — auth 파일 미존재 (exit 0 = 통과)
    Expected Result: 모든 Must NOT do 준수, auth 마이그레이션 완전
    Evidence: .sisyphus/evidence/final-f4-mustnot.txt
  ```
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

| Wave | Commit |
|------|--------|
| 1-T1 | `chore: initialize React Router 7 + Cloudflare Pages with @adakrpos/auth` |
| 1-T2 | `feat(styles): define Quiet Depth design tokens` |
| 1-T3 | `feat(db): define Drizzle ORM schema with cohort support` |
| 1-T4 | `feat(db): create D1 migrations and Korean seed data` |
| 1-T5 | `feat(db): implement data access layer with Drizzle queries` |
| 1-T6 | `feat(auth): configure @adakrpos/auth with requireVerified middleware` |
| 1-T7 | `feat(layout): implement Public shell with GlobalNav and Footer` |
| 1-T8 | `feat(layout): implement Admin shell with Sidebar and ContextBar` |
| 2 | `feat(components): implement shared component library` (T9–T16 그룹) |
| 3-각 | `feat(page): implement {페이지명}` (T17–T24 개별) |
| 4-각 | `feat(page): implement {페이지명}` (T25–T31 개별) |
| 5-각 | `feat(admin): implement Admin {섹션명}` (T32–T38 개별) |
| 6-각 | `feat(admin): implement Admin {섹션명}` (T39–T44 개별) |
| 7-각 | `fix: {감사 영역} audit and remediation` (T45–T48 개별) |

---

## Success Criteria

### Verification Commands
```bash
npx react-router build     # Expected: 오류 없이 빌드 성공
tsc --noEmit                # Expected: 타입 에러 0개
wrangler d1 migrations apply DB --local  # Expected: 마이그레이션 성공
wrangler d1 execute DB --local --file=seeds/seed.sql  # Expected: seed 성공
```

### Final Checklist
- [ ] 모든 "Must Have" 존재
- [ ] 모든 "Must NOT Have" 부재
- [ ] FR-001~FR-033 전체 반영
- [ ] 25개 사용자 플로우 UI로 실현 가능
- [ ] 39개 페이지 라우트 (Public 17 + Admin 22) + 2개 레이아웃
- [ ] Public 17개 페이지 모두 접근 가능
- [ ] Admin 22개 페이지 라우트 (14개 태스크 그룹) 모두 접근 가능
- [ ] D1 데이터베이스에 seed data 정상 표시
- [ ] @adakrpos/auth 세션 검증 동작
- [ ] Verified 사용자만 쓰기 동작 확인
- [ ] 미인증 → ada-kr-pos.com/login 리다이렉트 동작
- [ ] 협업 없는 상태 + 있는 상태 모두 자연스러움
- [ ] 모바일/태블릿/데스크톱 반응형
- [ ] 접근성: 키보드, focus ring, contrast, 44px target, reduced motion
- [ ] `npx react-router build` 성공
- [ ] Better Auth 코드/참조 0건
- [ ] KV 바인딩 0건
